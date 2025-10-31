import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function listAvailableModels() {
  try {
    console.log('🔍 Checking available models...');
    
    // Try to list models (if this endpoint exists)
    const models = await genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    console.log('✅ gemini-2.5-flash exists and is accessible');
    
  } catch (error) {
    console.log('❌ Error with gemini-2.5-flash:', error.message);
    
    // Try other known models
    const modelsToTest = [
      'gemini-1.5-flash',
      'gemini-1.5-flash-latest', 
      'gemini-1.5-pro',
      'gemini-1.5-pro-latest',
      'gemini-2.0-flash-exp',
      'gemini-pro',
      'gemini-pro-vision'
    ];
    
    for (const modelName of modelsToTest) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        // Try a simple generation to test
        const result = await model.generateContent('Hello');
        console.log(`✅ ${modelName} - WORKS`);
      } catch (err) {
        console.log(`❌ ${modelName} - Error: ${err.message.substring(0, 100)}`);
      }
    }
  }
}

listAvailableModels();