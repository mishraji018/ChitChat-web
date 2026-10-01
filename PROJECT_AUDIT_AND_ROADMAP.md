# 📋 ChitChat / Blink — Comprehensive Project Audit & Roadmap

> **Audit Date:** October 2026  
> **Repository:** `mishraji018/ChitChat-web`  
> **Target Experience:** WhatsApp / Instagram-Grade Real-Time Messaging

---

## 🏗️ 1. Architecture Overview & Current State

Aapke document me do architecture models ka discussion hai:
1. **Target Desired Architecture:** Node.js + Express + Socket.IO + MongoDB + Redis
2. **Current Project Implementation (`ChitChat-web`):**
   - **Frontend:** React + Vite + TypeScript + TailwindCSS + Lucide Icons + Framer Motion
   - **Backend / Real-time Service:** Supabase (PostgreSQL + Supabase Realtime Channels + Supabase Storage + Presence)
   - **Local Persistence & Offline:** `localStorage` + `idb-keyval` (IndexedDB) + Custom Hooks (`useOfflineQueue`, `useMessages`, `usePresence`)

> [!NOTE]
> Backend dependency cleanup me unused Express/Mongo server packages ko frontend bundle se remove kar diya gaya tha kyunki frontend directly Supabase Realtime se connect ho raha hai. Agar standalone Node.js/Socket.IO backend use karna hai, toh wo alag backend repository/service me host hoga.

---

## 📊 2. Feature Status Matrix (Kya Ho Gaya vs Kya Bacha Hai)

| Category | Feature | Status | Details |
| :--- | :--- | :---: | :--- |
| **Realtime Core** | Bina refresh real-time message aana | 🟢 **Working** | Supabase postgres_changes (`INSERT`) realtime channel se messages live update hote hain. |
| **Realtime Core** | Reconnection handling | 🟡 **Partial** | Connection drop par 2 sec retry logic hai, par active UI status banner ("Connecting...") aur missed message catchup sync optimize hona baki hai. |
| **Presence & Typing** | Typing indicator ("User is typing...") | 🟢 **Working** | `useTyping.ts` Supabase broadcast channel se typing start/stop debounce ke sath send karta hai. |
| **Presence & Typing** | Online / Offline status badge | 🟢 **Working** | Supabase Presence channel (`online-users`) se real-time online state sync hoti hai. |
| **Presence & Typing** | Last seen timestamp ("Last seen 5 mins ago") | 🟡 **Partial** | Database me `users.last_seen` store hota hai, par active real-time disconnect heartbeat hook incomplete hai. |
| **Message Status** | Single Tick (✓ Sent) | 🟢 **Working** | Message create hote hi `status: 'sent'` render hota hai. |
| **Message Status** | Double Tick (✓✓ Delivered) | 🔴 **Broken / Missing** | Abhi direct `sent` se `seen` hota hai; recipient ke device par deliver hone par `delivered` event emit nahi hota. |
| **Message Status** | Blue Tick (✓✓ Seen / Read Receipts) | 🟡 **Partial** | Chat open hone par `seen` mark hota hai, par message-level tick update real-time sync me kabhi delay karta hai. |
| **Message Status** | "Seen just now / 1 min ago" | 🔴 **Missing** | Conversation-level `lastReadAt` aur `lastReadMessageId` relative timer UI implemented nahi hai. |
| **Message Status** | Instagram-style last message par hi Seen | 🔴 **Missing** | Current implementation me har individual bubble apna status display karta hai, group read marker nahi hai. |
| **Low-Net & Offline** | Optimistic UI (Instant message display) | 🟢 **Working** | Message send karte hi UI me display hota hai aur background me request jati hai. |
| **Low-Net & Offline** | Offline Queue (Pending messages) | 🟡 **Partial** | `useOfflineQueue.ts` local queue me save karta hai, par reconnect par automated retry pipeline aur idempotency lock weak hai. |
| **Low-Net & Offline** | UUID Client Message IDs (Idempotency) | 🟢 **Working** | Client-side `uuidv4()` generate hota hai to prevent duplicates. |
| **Low-Net & Offline** | Network Speed & Ping Monitor | 🟢 **Working** | `useNetworkSpeed.ts` aur `WifiSignalIcon.tsx` header me ping (ms) aur speed indicator dikhate hain. |
| **UX & Interactions** | Message Reactions (❤️ 😂 👍 🔥) | 🟡 **Partial** | UI context menu aur popover ready hai, par backend DB me `reactions` table/column persistence incomplete hai. |
| **UX & Interactions** | Reply to Message (Swipe / Context menu) | 🔴 **Missing** | Context menu me "Reply soon" toast dikhata hai; message quote banner render nahi hota. |
| **UX & Interactions** | Copy / Star / Delete messages | 🟢 **Working** | Copy & local storage state working. Soft delete implemented. |
| **UX & Interactions** | Unread message counter | 🟡 **Partial** | State me `unreadCount` mapped hai, par multi-device persistent unread tracking nahi hai. |
| **UX & Interactions** | Auto-scroll vs "New message ↓" banner | 🟡 **Partial** | Bottom scroll button hai, par user upward scroll par hone par smart unread floating pill missing hai. |
| **Media & Files** | Image / Document / Audio upload | 🟢 **Working** | Supabase storage bucket + client compression hook (`useFileUpload`) working. |
| **Media & Files** | Voice Notes (Record & Send) | 🟡 **Partial** | Mic UI aur waveform timer hai, par audio blob upload to bucket hook se connect hona baki hai. |
| **Theming & UI** | 5 Custom Themes (Light, Dark, Teal, etc.) | 🟢 **Working** | All 5 themes high-contrast tablet/floating-card UI ke sath fully styled hain. |

---

## 🔍 3. Broken / Problematic Areas (Current Issues)

### 1. Old Messages Not Showing in Some Chats
- **Issue:** Purani chat kholne par conversation empty ya 0 messages dikhati hai.
- **Root Causes:**
  1. **RLS (Row Level Security):** Supabase `messages` table par authenticated users ke liye `SELECT` policy restricted hona ya chat participants match na hona.
  2. **Cache Mismatch:** `localStorage.getItem('messages_${chatId}')` me purana empty snapshot cache ho jana jo fetch hone ke baad bhi overwrite hone me race condition karta hai.
  3. **Chat Id Lookup:** Naye chat click karne par existing `chat_id` reuse na hokar new empty chat create hona.

### 2. Double Tick (Delivered) Missing
- Current code me messages sirf `sent` aur `seen` status follow karte hain. Jab recipient app open karta hai par chat nahi kholta, tab message `delivered` hona chahiye — ye logic server/socket background me missing hai.

### 3. Voice Recording Persistence
- Input bar me microphone press karne par timer aur waveform chalta hai, par audio blob file bucket me upload hokar message banne ka pipeline adha hai.

### 4. Message Quoting / Reply Thread
- Context menu me **Reply** dabane par input bar ke upar quote box render hona aur message document me `replyToMessageId` attach hona baki hai.

---

## 🚀 4. Step-by-Step Action Plan (Next Phases)

### **Phase 1: Fix Old Messages & Chat Data Flow (Immediate)**
- Supabase SQL RLS policies audit karna taaki dono participants messages read kar sakein.
- `useMessages.ts` me cache race-condition fix karna taaki server data hamesha authoritative rahe.

### **Phase 2: Conversation Read State & "Seen just now"**
- Add `last_read_message_id` aur `last_read_at` to `chats` table.
- Individual message status ke bajay conversation read marker se latest message ke niche "Seen just now / 1 min ago" show karna.

### **Phase 3: Delivered Status (`✓✓`)**
- Jaise hi receiver online aaye ya message receive kare, auto-emit `delivered` event.
- Receiver ke chat open karne par hi `seen` trigger ho.

### **Phase 4: Message Reply & Persistent Reactions**
- Input bar me `replyingTo` state and UI pill.
- Message bubble me parent quoted message preview.
- Supabase me message reactions persist karna.

### **Phase 5: Voice Notes & Media Hardening**
- Voice recorder se `.webm` / `.mp3` blob generate karke Supabase bucket me store karna aur audio player bubble me play karwana.
