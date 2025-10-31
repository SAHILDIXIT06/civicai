import { GoogleGenerativeAI } from '@google/generative-ai';
import { promises as fs } from 'node:fs';
import { PMC_CATEGORIES } from './categories.js';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

/**
 * Build AI prompt with actual PMC categories
 */
const buildPMCCategoriesPrompt = () => {
  let prompt = `You are an AI assistant helping citizens report civic issues to the Pune Municipal Corporation (PMC).

Analyze the uploaded image and identify the civic issue. Classify it into ONE main category and ONE sub-category from the following PMC categories:

`;

  // Add all PMC categories that are AI-detectable
  Object.entries(PMC_CATEGORIES).forEach(([mainId, categoryData]) => {
    if (categoryData.aiDetectable) {
      prompt += `\n**${categoryData.mainLabel}** (mainCategory: "${mainId}")\n`;
      prompt += `Sub-categories:\n`;
      categoryData.subCategories.forEach(sub => {
        prompt += `  - ${sub.label} (subCategory: "${sub.id}")\n`;
      });
    }
  });

  prompt += `\n**IMPORTANT INSTRUCTIONS:**
1. Respond ONLY in JSON format (no markdown, no extra text)
2. Select the MOST APPROPRIATE main category and sub-category based on the image
3. If image shows a civic issue not in the list, use mainCategory: "other" and subCategory: "other-issue"
4. Provide a clear, professional description (2-3 sentences) that a PMC official would understand
5. Include severity level and any visible details

**Response Format:**
{
  "mainCategory": "category-id-from-list",
  "subCategory": "subcategory-id-from-list",
  "description": "Professional description of the issue",
  "confidence": 0.0-1.0
}

**Examples:**

If you see potholes on a road:
{
  "mainCategory": "road",
  "subCategory": "pothole",
  "description": "Multiple large potholes visible on the road surface, filled with water. This poses a hazard to vehicles and requires immediate repair.",
  "confidence": 0.95
}

If you see a dead animal:
{
  "mainCategory": "garbage-sweeping",
  "subCategory": "dead-animal-removal",
  "description": "A dead dog is lying on the roadside. Immediate removal is required to prevent health hazards and maintain public hygiene.",
  "confidence": 0.9
}

If you see garbage dumped illegally:
{
  "mainCategory": "garbage-sweeping",
  "subCategory": "garbage-dump",
  "description": "Large amount of garbage including plastic waste dumped in an open area. Cleanup required to prevent environmental and health issues.",
  "confidence": 0.85
}

If you see a fallen tree:
{
  "mainCategory": "tree-authority",
  "subCategory": "fallen-tree",
  "description": "A large tree has fallen across the road, blocking traffic. Immediate removal required to restore normal traffic flow.",
  "confidence": 0.9
}

Now analyze the image and respond in JSON format:`;

  return prompt;
};

/**
 * Analyze civic issue image using Gemini Vision API
 * @param {string} imagePath - Path to the uploaded image
 * @returns {Promise<{category: string, mainCategory: string, subCategory: string, description: string, confidence: number}>}
 */
export async function analyseImageWithGemini(imagePath) {
  try {
    // 🔥 UPDATED: Use gemini-2.5-flash-lite as fallback
    const modelName = process.env.GEMINI_MODEL_NAME || 'gemini-2.5-flash-lite';
    const model = genAI.getGenerativeModel({ model: modelName });

    console.log(`🤖 Using Gemini model: ${modelName}`);

    // Read image file
    const imageBuffer = await fs.readFile(imagePath);
    const base64Image = imageBuffer.toString('base64');

    // Determine MIME type
    const mimeType = imagePath.endsWith('.png')
      ? 'image/png'
      : imagePath.endsWith('.jpg') || imagePath.endsWith('.jpeg')
      ? 'image/jpeg'
      : imagePath.endsWith('.webp')
      ? 'image/webp'
      : imagePath.endsWith('.avif')
      ? 'image/avif'
      : 'image/jpeg';

    const prompt = buildPMCCategoriesPrompt();

    console.log('🔍 Sending image to Gemini AI for analysis...');

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType,
          data: base64Image,
        },
      },
    ]);

    const responseText = result.response.text();
    console.log('📄 Raw Gemini Response:', responseText);

    // Extract JSON from response
    let jsonText = responseText.trim();
    
    // Remove markdown code blocks if present
    const jsonMatch = responseText.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
    if (jsonMatch) {
      jsonText = jsonMatch[1];
    }

    // Parse the JSON response
    const analysis = JSON.parse(jsonText);

    // Validate that we got main and sub categories
    if (!analysis.mainCategory || !analysis.subCategory) {
      console.warn('⚠️ AI response missing categories:', analysis);
      throw new Error('AI did not return valid categories');
    }

    // Verify categories exist in PMC_CATEGORIES
    const mainCategoryData = PMC_CATEGORIES[analysis.mainCategory];
    if (!mainCategoryData) {
      console.warn(`⚠️ AI returned unknown main category: ${analysis.mainCategory}`);
      // Fallback to general category
      return {
        category: 'other',
        mainCategory: null,
        subCategory: null,
        description: analysis.description || 'Civic issue detected',
        confidence: 0.5,
      };
    }

    const subCategoryExists = mainCategoryData.subCategories.some(
      sub => sub.id === analysis.subCategory
    );

    if (!subCategoryExists) {
      console.warn(`⚠️ AI returned unknown sub-category: ${analysis.subCategory} for main: ${analysis.mainCategory}`);
      // Use first sub-category as fallback
      analysis.subCategory = mainCategoryData.subCategories[0]?.id || 'other';
    }

    console.log(`✅ AI Classification: ${analysis.mainCategory} → ${analysis.subCategory}`);
    console.log(`📝 Description: ${analysis.description}`);
    console.log(`🎯 Confidence: ${analysis.confidence}`);

    return {
      category: analysis.mainCategory, // Legacy field for backward compatibility
      mainCategory: analysis.mainCategory,
      subCategory: analysis.subCategory,
      description: analysis.description || 'Civic issue detected',
      confidence: analysis.confidence || 0.8,
    };

  } catch (error) {
    console.error('❌ Gemini AI Analysis Error:', error);
    
    // Check if it's a JSON parsing error
    if (error instanceof SyntaxError) {
      console.error('JSON Parse Error - AI response was not valid JSON');
    }
    
    throw new Error(`AI analysis failed: ${error.message}`);
  }
}
