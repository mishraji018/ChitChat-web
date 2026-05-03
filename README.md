# ⚡ BlinkChat

> 🚧 **BlinkChat is a premium, full-stack real-time messaging application.**
> Built with a modern tech stack to provide a seamless, secure, and delightful communication experience.

---

## ✨ Features

### 💬 Core Messaging
- **Real-time Private Chat**: Instant message delivery powered by Supabase Realtime.
- **Media Sharing**: Share photos, videos, and documents with ease.
- **Message Status**: Real-time indicators for Sent ✓ and Seen 🔵✓✓.
- **Typing Indicators**: See when your friends are typing in real-time.
- **Offline Support**: Queue messages while offline; they'll sync automatically when you're back.

### 🔐 Security & Auth
- **Google Authentication**: Quick and secure login via Supabase Auth.
- **Privacy Controls**: Block, Mute, or Archive conversations.
- **Data Persistence**: Local caching with IndexedDB for faster load times.

### 🎨 Personalization
- **Modern Themes**: Choose between Light, Dark, Deep Blue, and Rose modes.
- **Multilingual**: Support for English, Hindi, Spanish, and French.
- **Custom Wallpapers**: Personalize your chat backgrounds.

### 🧠 Smart Features
- **Blink AI**: An intelligent assistant powered by **Groq (Llama 3)** to help you with anything.
- **Streak System**: Track your consistent interactions with friends.
- **Boring Detector**: Get fun conversation starters when the chat feels quiet.
- **Memory Capsules**: (In Development) Save special moments in your chats.

---

## 🛠️ Tech Stack

| Category | Technology |
|---|---|
| **Frontend** | React 18 + TypeScript + Vite |
| **Styling** | Tailwind CSS + Shadcn UI + Framer Motion |
| **Backend/BaaS** | Supabase (Auth, DB, Realtime, Storage) |
| **AI Integration** | Groq (Llama 3) |
| **State Management** | TanStack Query (React Query) |
| **Icons** | Lucide React |
| **I18n** | i18next |

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- A Supabase Project
- A Groq API Key (for AI features)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/mishraji018/ChitChat-web.git
   cd ChitChat-web
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure Environment Variables**
   Create a `.env` file in the root directory and add the following:
   ```env
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   VITE_GROQ_API_KEY=your_groq_api_key
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

---

## 📁 Project Structure

```text
ChitChat-web/
├── src/
│   ├── components/       # UI Components (Shadcn + Custom)
│   ├── hooks/            # Custom React hooks (Logic & State)
│   ├── services/         # API & Supabase services
│   ├── pages/            # Main application views
│   ├── i18n/             # Internationalization files
│   ├── lib/              # Utility libraries
│   ├── types/            # TypeScript definitions
│   └── data/             # Mock data and constants
├── public/               # Static assets
└── tailwind.config.ts    # Styling configuration
```

---

## ⚠️ Development Status

| Module | Status |
|---|---|
| **Frontend UI** | ██████████ 100% |
| **Supabase Integration** | ██████████ 100% |
| **Real-time Messaging** | █████████░ 90% |
| **AI Assistant** | ████████░░ 80% |
| **Media Sharing** | ███████░░░ 70% |
| **Desktop App** | ████░░░░░░ 40% (Planned) |

---

## 👨‍💻 Developer

**Pawan Mishra** — [@mishraji018](https://github.com/mishraji018)

---

> 💖 Built with passion for a better communication experience.

---

> 🚧 **In Development** — More features coming soon!