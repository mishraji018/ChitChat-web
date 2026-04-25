# ChitChat Backend 🐻

Complete Node.js + Express + MongoDB backend for the ChitChat WhatsApp clone.

## Features
- **JWT Auth**: Secure login/signup with 30d expiry and refresh tokens.
- **OTP Verification**: Email-based OTP for signup and passkey recovery.
- **Real-time Messaging**: Socket.IO for instant delivery, typing indicators, and online status.
- **Media Upload**: Cloudinary integration for images, videos, audio, and documents.
- **Push Notifications**: Firebase Admin SDK for background notifications.
- **Security**: Helmet, CORS, and Rate Limiting implemented.
- **End-to-End Encryption**: Message content encryption at rest.

## Tech Stack
- Node.js & Express.js
- MongoDB & Mongoose
- Socket.IO
- Cloudinary
- Firebase Admin
- Nodemailer

## Setup Instructions

1. **Install Dependencies**
   ```bash
   cd backend
   npm install
   ```

2. **Environment Variables**
   Create a `.env` file in the root directory based on `.env.example` and fill in your credentials:
   - `MONGODB_URI`: Your MongoDB connection string.
   - `JWT_SECRET` & `JWT_REFRESH_SECRET`: Secure random strings.
   - `EMAIL_USER` & `EMAIL_PASS`: Gmail address and App Password.
   - `CLOUDINARY_*`: Cloudinary API credentials.
   - `FIREBASE_*`: Firebase service account details.

3. **Run the Server**
   ```bash
   # Development mode (with nodemon)
   npm run dev

   # Production mode
   npm start
   ```

4. **API Endpoints**
   - Auth: `/api/auth`
   - User: `/api/user`
   - Chat: `/api/chat`
   - Media: `/api/media`

## Folder Structure
- `config/`: Configuration files (DB, Cloudinary, Firebase).
- `controllers/`: Business logic.
- `models/`: Mongoose schemas.
- `routes/`: Express route definitions.
- `middleware/`: Authentication and upload helpers.
- `utils/`: Common utilities (OTP, Email, Encryption).
- `socket/`: Socket.IO event handlers.
