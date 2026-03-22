# ⚡ BlinkChat

> 🚧 **This project is currently in active development.**

A full-stack real-time personal chat application built with React, Node.js, and Socket.IO — inspired by WhatsApp.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React + TypeScript + Tailwind CSS |
| Backend | Node.js + Express.js |
| Real-time | Socket.IO |
| Database | MongoDB + Mongoose |
| Auth | JWT + bcrypt |
| Media Storage | Cloudinary |
| Notifications | Firebase FCM |
| Desktop App | Electron.js |

---

## ✅ Features

- 🔐 Signup with Email OTP verification
- 📱 One account per mobile number
- 💬 Real-time private messaging
- 📷 Share photos, videos, PDFs, voice notes
- 🔵 Message status — Sent ✓ Delivered ✓✓ Read 🔵✓✓
- 🗑️ Delete for me / Delete for everyone
- ✏️ Edit messages (within 15 min)
- 😀 Emoji reactions
- 📌 Pin, Mute, Archive chats
- 🔍 In-chat search with highlight
- 🎨 4 Themes — Dark, Deep Blue, Light, Rose
- 🌐 4 Languages — English, Hindi, Spanish, French
- 🔒 App Lock with PIN
- 📥 Download chat as PDF/TXT
- 🔔 Push notifications (Firebase FCM)
- 📦 Offline message queue
- 🔐 AES message encryption
- 🖥️ Desktop app via Electron.js

---

## 🚀 Getting Started

### Prerequisites
- Node.js v18+
- MongoDB Atlas account
- Cloudinary account

### Frontend Setup
```bash
npm install
npm run dev
```

### Backend Setup
```bash
cd backend
npm install
npm run dev
```

### Environment Variables

**Frontend `.env`:**
```
VITE_API_URL=http://localhost:5000
VITE_SOCKET_URL=http://localhost:5000
```

**Backend `.env`:**
```
MONGODB_URI=your-mongodb-uri
JWT_SECRET=your-secret-key
PORT=5000
EMAIL_USER=your-gmail@gmail.com
EMAIL_PASS=your-app-password
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
ENCRYPTION_KEY=your-encryption-key
FRONTEND_URL=http://localhost:8080
```

---

## 📁 Project Structure
```
BlinkChat/
├── src/                  # Frontend React code
│   ├── components/       # UI Components
│   ├── hooks/            # Custom hooks
│   ├── utils/            # Utility functions
│   ├── i18n/             # Translations
│   └── data/             # Mock data
├── backend/              # Node.js backend
│   ├── routes/           # API routes
│   ├── models/           # MongoDB models
│   ├── middleware/        # Auth + rate limiting
│   └── utils/            # Encryption + notifications
├── electron/             # Desktop app
└── public/               # Static assets
```

---

## ⚠️ Development Status
```
Frontend UI          ██████████  100%
Authentication       ██████████  100%
Real-time Messaging  ████████░░   80%
Media Upload         ███████░░░   70%
Push Notifications   █████░░░░░   50%
Desktop App (Electron) ████░░░░░░  40%
Testing              ██░░░░░░░░   20%
```

---

## 👨‍💻 Developer

**Pawan Mishra** — [@mishraji018](https://github.com/mishraji018)

---

> 🚧 **In Development** — More features coming soon!