import nodemailer from 'nodemailer';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Creates an email transporter using SMTP credentials from environment variables
 */
const createTransporter = () => {
  const config = {
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT || '587', 10),
    secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    }
  };

  if (!config.auth.user || !config.auth.pass) {
    console.warn('⚠️ Email credentials not configured. Email forwarding will fail.');
    console.warn('   Set EMAIL_USER and EMAIL_PASSWORD in .env file');
  }

  return nodemailer.createTransporter(config);
};

/**
 * Generates HTML email template for complaint forwarding
 */
const generateEmailHTML = (complaint, department, adminPhone) => {
  const formatDate = (isoString) => {
    if (!isoString) return 'N/A';
    return new Date(isoString).toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      dateStyle: 'medium',
      timeStyle: 'short'
    });
  };

  const mainCategory = complaint.mainCategory
    ? complaint.mainCategory.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
    : 'N/A';
  
  const subCategory = complaint.subCategory
    ? complaint.subCategory.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
    : 'N/A';

  const mapLink = complaint.location?.latitude && complaint.location?.longitude
    ? `https://www.google.com/maps?q=${complaint.location.latitude},${complaint.location.longitude}`
    : null;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .email-container {
      background-color: white;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 600;
    }
    .content {
      padding: 30px;
    }
    .alert-box {
      background-color: #fff3cd;
      border-left: 4px solid #ffc107;
      padding: 15px;
      margin-bottom: 20px;
      border-radius: 4px;
    }
    .info-grid {
      display: grid;
      grid-template-columns: 150px 1fr;
      gap: 12px;
      margin: 20px 0;
    }
    .info-label {
      font-weight: 600;
      color: #555;
    }
    .info-value {
      color: #333;
    }
    .status-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
      background-color: #e3f2fd;
      color: #1976d2;
    }
    .description-box {
      background-color: #f8f9fa;
      border: 1px solid #dee2e6;
      border-radius: 6px;
      padding: 15px;
      margin: 15px 0;
    }
    .map-button {
      display: inline-block;
      background-color: #4CAF50;
      color: white;
      padding: 10px 20px;
      text-decoration: none;
      border-radius: 5px;
      margin: 10px 0;
    }
    .footer {
      background-color: #f8f9fa;
      padding: 20px 30px;
      border-top: 1px solid #dee2e6;
      font-size: 12px;
      color: #6c757d;
      text-align: center;
    }
    .section-title {
      font-size: 18px;
      font-weight: 600;
      margin: 20px 0 10px 0;
      color: #667eea;
    }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="header">
      <h1>🚨 Civic Complaint Forwarded</h1>
      <p style="margin: 5px 0 0 0; opacity: 0.9;">Pune Municipal Corporation</p>
    </div>
    
    <div class="content">
      <div class="alert-box">
        <strong>⚠️ Action Required:</strong> A civic complaint has been forwarded to your department for immediate attention and resolution.
      </div>

      <div class="section-title">Complaint Details</div>
      <div class="info-grid">
        <div class="info-label">Complaint ID:</div>
        <div class="info-value"><strong>${complaint.id}</strong></div>
        
        <div class="info-label">Filed On:</div>
        <div class="info-value">${formatDate(complaint.createdAt)}</div>
        
        <div class="info-label">Status:</div>
        <div class="info-value"><span class="status-badge">${complaint.status || 'Submitted'}</span></div>
        
        <div class="info-label">Main Category:</div>
        <div class="info-value">${mainCategory}</div>
        
        <div class="info-label">Sub-Category:</div>
        <div class="info-value">${subCategory}</div>
        
        <div class="info-label">Department:</div>
        <div class="info-value"><strong>${department.name}</strong></div>
      </div>

      <div class="section-title">Complainant Information</div>
      <div class="info-grid">
        <div class="info-label">Phone:</div>
        <div class="info-value">${complaint.userPhone || 'N/A'}</div>
        
        <div class="info-label">Name:</div>
        <div class="info-value">${complaint.userName || 'Not provided'}</div>
        
        <div class="info-label">User ID:</div>
        <div class="info-value">${complaint.userId || 'N/A'}</div>
      </div>

      <div class="section-title">Description</div>
      <div class="description-box">
        ${complaint.description || 'No description provided'}
      </div>

      ${complaint.location ? `
      <div class="section-title">Location Details</div>
      <div class="info-grid">
        ${complaint.location.address ? `
        <div class="info-label">Address:</div>
        <div class="info-value">${complaint.location.address}</div>
        ` : ''}
        
        <div class="info-label">Coordinates:</div>
        <div class="info-value">
          ${complaint.location.latitude?.toFixed(6)}, ${complaint.location.longitude?.toFixed(6)}
          ${complaint.location.accuracy ? `(±${Math.round(complaint.location.accuracy)}m)` : ''}
        </div>
      </div>
      ${mapLink ? `<a href="${mapLink}" class="map-button" target="_blank">📍 View on Google Maps</a>` : ''}
      ` : ''}

      ${complaint.image ? `
      <div class="section-title">Photographic Evidence</div>
      <p style="color: #6c757d; font-size: 14px;">
        📎 An image has been attached to this email showing the complaint details.
        <br>Original filename: <strong>${complaint.image.originalName || 'complaint-image'}</strong>
      </p>
      ` : ''}

      <div class="section-title">Forwarding Information</div>
      <div class="info-grid">
        <div class="info-label">Forwarded By:</div>
        <div class="info-value">Admin (${adminPhone})</div>
        
        <div class="info-label">Forwarded At:</div>
        <div class="info-value">${formatDate(new Date().toISOString())}</div>
        
        <div class="info-label">Contact Person:</div>
        <div class="info-value">${department.contactPerson} (${department.phone})</div>
      </div>
    </div>
    
    <div class="footer">
      <p><strong>Pune Municipal Corporation</strong></p>
      <p>This is an automated email from the Civic AI Complaint Management System.</p>
      <p>Please do not reply to this email. For inquiries, contact the admin at ${adminPhone}</p>
    </div>
  </div>
</body>
</html>
  `;
};

/**
 * Generates plain text email template for complaint forwarding
 */
const generateEmailText = (complaint, department, adminPhone) => {
  const formatDate = (isoString) => {
    if (!isoString) return 'N/A';
    return new Date(isoString).toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      dateStyle: 'medium',
      timeStyle: 'short'
    });
  };

  const mainCategory = complaint.mainCategory
    ? complaint.mainCategory.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
    : 'N/A';
  
  const subCategory = complaint.subCategory
    ? complaint.subCategory.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
    : 'N/A';

  const mapLink = complaint.location?.latitude && complaint.location?.longitude
    ? `https://www.google.com/maps?q=${complaint.location.latitude},${complaint.location.longitude}`
    : 'N/A';

  return `
CIVIC COMPLAINT FORWARDED
Pune Municipal Corporation
==============================================

ACTION REQUIRED: A civic complaint has been forwarded to your department.

COMPLAINT DETAILS
-----------------
Complaint ID: ${complaint.id}
Filed On: ${formatDate(complaint.createdAt)}
Status: ${complaint.status || 'Submitted'}
Main Category: ${mainCategory}
Sub-Category: ${subCategory}
Department: ${department.name}

COMPLAINANT INFORMATION
-----------------------
Phone: ${complaint.userPhone || 'N/A'}
Name: ${complaint.userName || 'Not provided'}
User ID: ${complaint.userId || 'N/A'}

DESCRIPTION
-----------
${complaint.description || 'No description provided'}

LOCATION DETAILS
----------------
${complaint.location?.address ? `Address: ${complaint.location.address}` : ''}
Coordinates: ${complaint.location?.latitude?.toFixed(6)}, ${complaint.location?.longitude?.toFixed(6)}
${complaint.location?.accuracy ? `Accuracy: ±${Math.round(complaint.location.accuracy)}m` : ''}
Google Maps: ${mapLink}

${complaint.image ? `
PHOTOGRAPHIC EVIDENCE
--------------------
An image has been attached to this email.
Original filename: ${complaint.image.originalName || 'complaint-image'}
` : ''}

FORWARDING INFORMATION
---------------------
Forwarded By: Admin (${adminPhone})
Forwarded At: ${formatDate(new Date().toISOString())}
Contact Person: ${department.contactPerson} (${department.phone})

==============================================
Pune Municipal Corporation
Civic AI Complaint Management System

This is an automated email. Please do not reply.
For inquiries, contact the admin at ${adminPhone}
  `;
};

/**
 * Sends complaint email to department
 * @param {Object} complaint - Complaint object with all details
 * @param {Object} department - Department object with email info
 * @param {string} adminPhone - Phone number of admin forwarding the complaint
 * @returns {Promise<Object>} Result object with success status and message
 */
export const sendComplaintEmail = async (complaint, department, adminPhone) => {
  try {
    const transporter = createTransporter();

    // Prepare recipient list
    const recipients = [department.primaryEmail];
    if (department.ccEmails && department.ccEmails.length > 0) {
      recipients.push(...department.ccEmails);
    }

    // Prepare email options
    const mailOptions = {
      from: {
        name: 'PMC Civic AI System',
        address: process.env.EMAIL_FROM || process.env.EMAIL_USER
      },
      to: department.primaryEmail,
      cc: department.ccEmails && department.ccEmails.length > 0 ? department.ccEmails.join(', ') : undefined,
      subject: `[Complaint #${complaint.id.substring(0, 8)}] ${complaint.mainCategory?.replace(/-/g, ' ').toUpperCase()} - Action Required`,
      text: generateEmailText(complaint, department, adminPhone),
      html: generateEmailHTML(complaint, department, adminPhone),
      attachments: []
    };

    // Attach complaint image if available
    if (complaint.image?.fileName) {
      const imagePath = path.join(__dirname, '..', 'uploads', complaint.image.fileName);
      mailOptions.attachments.push({
        filename: complaint.image.originalName || complaint.image.fileName,
        path: imagePath,
        contentType: complaint.image.mimeType || 'image/jpeg'
      });
    }

    // Send email
    const info = await transporter.sendMail(mailOptions);

    console.log('✅ Email sent successfully:', info.messageId);
    console.log(`   To: ${department.primaryEmail}`);
    if (department.ccEmails && department.ccEmails.length > 0) {
      console.log(`   CC: ${department.ccEmails.join(', ')}`);
    }

    return {
      success: true,
      messageId: info.messageId,
      recipients: recipients,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    console.error('❌ Email sending failed:', error.message);
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
};

/**
 * Validates email configuration
 * @returns {boolean} True if email is properly configured
 */
export const isEmailConfigured = () => {
  return !!(process.env.EMAIL_USER && process.env.EMAIL_PASSWORD);
};
