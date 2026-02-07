# Civic AI - Project Report

## 1. Problem Statement

Citizens often face civic issues like potholes, uncollected garbage, broken streetlights, or fallen trees. Reporting these issues to municipal authorities (like the Pune Municipal Corporation - PMC) can be cumbersome, involving complex forms, unclear categorization, and lack of tracking.

**Civic AI** solves this by simplifying the reporting process using Artificial Intelligence. Users simply take a photo, and the AI automatically identifies the issue, categorizes it, writes a professional description, and tags the location. This reduces the friction for citizens and provides structured, actionable data for authorities.

## 2. App Structure

The application is a modern web application built with a **monolithic but modular architecture**, designed to be deployed easily on cloud platforms like Vercel.

### Key Components

- **Frontend (Client-side):** A responsive web interface built with standard web technologies (HTML, CSS, Vanilla JavaScript). It handles image capture, geolocation, and user interaction.
- **Backend (Server-side):** A Node.js/Express REST API that handles business logic, file uploads, AI processing, and data persistence.
- **AI Engine:** Integrated Google Gemini Vision API for intelligent image analysis.
- **Data Storage:** A lightweight JSON-based persistence layer (currently file-based for portability, scalable to databases).

## 3. Data Flow

The typical lifecycle of a complaint in the system is as follows:

1. **Capture:** The user captures or uploads a photo of a civic issue via the frontend.
2. **AI Analysis (The "Magic" Step):**
    - The frontend sends the image to the backend endpoint `/api/analyse`.
    - The backend forwards the image to **Google Gemini AI**.
    - Gemini analyzes the visual content and returns a structured JSON response containing:
        - `mainCategory` (e.g., "Road", "Garbage")
        - `subCategory` (e.g., "Pothole", "Dead Animal")
        - `description` (A professional summary of the issue)
        - `confidence` (Score 0-1)
3. **Form Pre-filling:** The frontend receives this data and automatically fills the complaint form. The user only needs to verify the details.
4. **Geolocation:** The app captures the user's GPS coordinates and allows fine-tuning via an interactive map (Leaflet.js).
5. **Submission:** The user submits the final complaint. The data is sent to `/api/complaints`.
6. **Persistence:** The backend saves the complaint metadata to `complaints.json` and the image to the storage layer.
7. **Admin/Forwarding:** Admins can view these complaints, filter them by status/category, and forward them to specific departments via email.

## 4. AI Implementation Details

The core intelligence is powered by **Google's Gemini Vision Model** (specifically `gemini-2.5-flash-lite` for speed and efficiency).

- **Prompt Engineering:** The system uses a sophisticated system prompt (located in `backend/src/gemini.js`) that instructs the model to act as a "Civic Issue Expert."
- **Context Injection:** The prompt includes the full list of valid PMC (Pune Municipal Corporation) categories and sub-categories. This ensures the AI classifies issues into existing administrative buckets, not random generic terms.
- **Structured Output:** The model is strictly instructed to return **JSON only**, ensuring the backend can parse the result programmatically without regex or fuzzy matching.
- **Fallback Mechanism:** If the AI cannot identify the issue with high confidence, the system flags it, allowing the user to manually select categories.

## 5. Frontend Architecture

The frontend is built without heavy frameworks (like React or Angular) to ensure maximum performance, low latency, and easy hackability.

- **Technologies:** HTML5, CSS3 (Custom properties/variables), JavaScript (ES6 Modules).
- **Map Integration:** Uses **Leaflet.js** with OpenStreetMap tiles for a lightweight, free mapping solution.
- **State Management:** Uses `localStorage` for simple session persistence (user details, API base URL).
- **Responsive Design:** Mobile-first approach, ensuring the camera and upload flows work seamlessly on smartphones.

## 6. Backend Architecture

The backend is a robust **Node.js** application using the **Express** framework.

- **API Design:** RESTful endpoints (GET, POST, PATCH, DELETE).
- **File Handling:** Uses `multer` middleware for handling `multipart/form-data` (image uploads).
- **Serverless Readiness:** The app is refactored (`backend/src/app.js`) to export the Express app instance, making it compatible with serverless environments like Vercel Functions, while still supporting a standalone server (`backend/src/server.js`) for local development.
- **Email Service:** Integrated `nodemailer` to send automated email notifications to departments when complaints are forwarded.

## 7. Tech Stack Summary

- **Runtime:** Node.js
- **Framework:** Express.js
- **Language:** JavaScript (ES6+)
- **AI Model:** Google Gemini Pro Vision / Flash
- **Database:** JSON (File-based) / MongoDB (Ready for migration)
- **Maps:** Leaflet.js + OpenStreetMap
- **Styling:** CSS3 + FontAwesome
- **Deployment:** Vercel (Configuration included in `vercel.json`)

## 8. Database & Persistence

Currently, the application uses a **File-based JSON Database** for simplicity and portability during the prototype phase.

- **Structure:**
- `data/complaints.json`: Stores an array of complaint objects.
- `data/admin_phones.json`: Stores authorized admin phone numbers and profiles.
- `data/departments.json`: Stores municipal department details.
- **Scalability:** The data access layer is isolated in helper functions (`readComplaints`, `writeComplaints`). This design pattern allows for an easy "lift-and-shift" migration to a real database like **MongoDB** or **PostgreSQL** without rewriting the entire application logic.
- **Image Storage:** Images are stored in a local `uploads/` directory. For cloud deployment, this is configured to be swapped with object storage services (like AWS S3, Vercel Blob, or Cloudinary).

## 9. Conclusion

Civic AI demonstrates how Generative AI can be applied to real-world public service problems. By automating the "boring" parts of complaint filing (typing descriptions, selecting categories), it encourages more citizens to participate in maintaining their city's infrastructure.

## 10. Detailed Complaint Flow & User Interfaces

### 10.1 The Citizen Window

The citizen interface is designed for speed and simplicity, focusing on "capture and submit."

- **Landing Page (`index.html`):**
- **Hero Section:** Features a prominent "File Complaint" call-to-action and showcases common issue types (potholes, garbage, etc.) as clickable cards.
- **AI Camera Interface:** When a user starts a complaint, they are presented with a camera/upload input.
- **Auto-Filling Form:** Once an image is uploaded, the AI analyzes it. The user sees the form fields (Category, Description) populate automatically in real-time.
- **Interactive Map:** A Leaflet.js map widget automatically centers on the user's location. Users can drag the marker to pinpoint the exact issue location.
- **Submission:** A final review step before sending the data to the server.

- **User Dashboard (`dashboard.html`):**
- **Personalized View:** After logging in, citizens can see a history of their submitted complaints.
- **Status Tracking:** Each complaint card shows the current status (Submitted, In Progress, Resolved) with color-coded badges.
- **Stats Overview:** A summary grid at the top displays counts of total, active, and resolved complaints.

### 10.2 The Admin Window

The admin interface is a command center for municipal staff to manage and resolve issues.

- **Admin Portal (`admin-portal.html`):**
- **Role-Based Access:** Acts as the central hub. Depending on permissions, admins can navigate to "Complaint Management" (Global View), "My Assigned Work" (Personal View), or "Manage Admins" (User Management).
- **Quick Stats:** Provides a high-level overview of system health.

- **Global Complaint Management (`admin.html`):**
- **Master Table:** Displays all complaints from all users in a sortable, filterable table.
- **Advanced Filtering:** Admins can filter by Status (e.g., "Show only Submitted"), Main Category (e.g., "Road"), or Sub-Category.
- **Bulk Actions:** Admins can select multiple complaints and forward them to a specific department (e.g., "Road Department") in one go.
- **Detailed View:** Clicking a row opens a modal with the full complaint details, including the AI analysis, user description, and full-resolution image.

- **My Work (`my-work.html`):**
- **Focused View:** Shows only complaints assigned specifically to the logged-in admin.
- **Resolution Workflow:** This is where the work happens. Admins can update the status from "In Progress" to "Appeal to Resolve" (uploading proof of work) or "Resolved".

### 10.3 The Lifecycle of a Complaint

1. **Submission (Citizen):** User uploads a photo of a pothole. AI tags it as "Road > Pothole". Status: **Submitted**.
2. **Triage (Admin):** Admin sees the new complaint in the Global Dashboard. They verify the category and location.
3. **Assignment (Admin):** Admin forwards the complaint to the "Road Maintenance Department" and assigns it to a field officer. Status updates to **In Progress**.
4. **Action (Field Officer):** The assigned officer repairs the pothole.
5. **Proof of Work (Field Officer):** The officer logs into "My Work," selects the complaint, and uploads a photo of the repaired road. They set the status to **Appeal to Resolve**.
6. **Verification (Admin/Supervisor):** A supervisor reviews the "Appeal" status and the proof image.
7. **Resolution:** If satisfied, the supervisor marks the complaint as **Resolved**. The citizen sees this update on their dashboard.
