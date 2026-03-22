import { Chat, Message, User } from '@/types/chat';

export const currentUser: User = {
  id: 'me',
  username: 'you',
  displayName: 'You',
  avatarColor: '#00d4a0',
  status: "Hey there! I'm using BlinkChat",
  isOnline: true,
};

const aarav: User = {
  id: 'u1',
  username: 'aarav',
  displayName: 'Aarav',
  avatarColor: '#4f8ef7',
  status: 'Building something awesome 🚀',
  isOnline: true,
};

const priya: User = {
  id: 'u2',
  username: 'priya',
  displayName: 'Priya',
  avatarColor: '#f472b6',
  status: 'At the gym 💪',
  isOnline: false,
  lastSeen: '2:30 PM',
};

const rohan: User = {
  id: 'u3',
  username: 'rohan',
  displayName: 'Rohan',
  avatarColor: '#facc15',
  status: 'Available',
  isOnline: true,
};

const aaravMessages: Message[] = [
  { id: 'm1', senderId: 'u1', receiverId: 'me', type: 'text', content: 'Hey! How are you doing?', timestamp: '9:00 AM', status: 'read' },
  { id: 'm2', senderId: 'me', receiverId: 'u1', type: 'text', content: "I'm great! Just working on a new project.", timestamp: '9:02 AM', status: 'read' },
  { id: 'm3', senderId: 'u1', receiverId: 'me', type: 'text', content: 'That sounds awesome! What kind of project?', timestamp: '9:03 AM', status: 'read' },
  { id: 'm4', senderId: 'me', receiverId: 'u1', type: 'text', content: "A chat app called BlinkChat ⚡", timestamp: '9:05 AM', status: 'read' },
  { id: 'm5', senderId: 'u1', receiverId: 'me', type: 'image', content: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=400', timestamp: '9:10 AM', status: 'read' },
  { id: 'm6', senderId: 'u1', receiverId: 'me', type: 'text', content: 'Check out this cool setup I found!', timestamp: '9:10 AM', status: 'read' },
  { id: 'm7', senderId: 'me', receiverId: 'u1', type: 'voice', content: '', timestamp: '9:15 AM', status: 'delivered', duration: '0:34' },
  { id: 'm8', senderId: 'u1', receiverId: 'me', type: 'document', content: '', timestamp: '9:20 AM', status: 'read', fileName: 'project-plan.pdf', fileSize: '2.4 MB' },
  { id: 'm9', senderId: 'me', receiverId: 'u1', type: 'text', content: "Thanks! I'll review this tonight 🙏", timestamp: '9:22 AM', status: 'delivered' },
  { id: 'm10', senderId: 'u1', receiverId: 'me', type: 'text', content: "No rush! Let me know what you think when you're done.", timestamp: '9:25 AM', status: 'read' },
];

const priyaMessages: Message[] = [
  { id: 'p1', senderId: 'u2', receiverId: 'me', type: 'text', content: 'Hey! Are we still meeting tomorrow?', timestamp: '11:00 AM', status: 'read' },
  { id: 'p2', senderId: 'me', receiverId: 'u2', type: 'text', content: "Yes! Coffee at 3pm works?", timestamp: '11:05 AM', status: 'read' },
  { id: 'p3', senderId: 'u2', receiverId: 'me', type: 'text', content: 'Perfect ☕', timestamp: '11:06 AM', status: 'read' },
  { id: 'p4', senderId: 'u2', receiverId: 'me', type: 'location', content: 'Café Mocha, MG Road', timestamp: '11:10 AM', status: 'read' },
  { id: 'p5', senderId: 'me', receiverId: 'u2', type: 'text', content: "Great spot! I've been there before 👍", timestamp: '11:12 AM', status: 'delivered' },
  { id: 'p6', senderId: 'u2', receiverId: 'me', type: 'image', content: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400', timestamp: '11:15 AM', status: 'read' },
  { id: 'p7', senderId: 'u2', receiverId: 'me', type: 'text', content: 'Their cappuccino is the best!', timestamp: '11:15 AM', status: 'read' },
  { id: 'p8', senderId: 'me', receiverId: 'u2', type: 'text', content: "Can't wait! See you there 😊", timestamp: '11:20 AM', status: 'read' },
];

const rohanMessages: Message[] = [
  { id: 'r1', senderId: 'me', receiverId: 'u3', type: 'text', content: 'Bro did you see the match last night?', timestamp: '8:00 PM', status: 'read' },
  { id: 'r2', senderId: 'u3', receiverId: 'me', type: 'text', content: 'YES! That last over was insane 🏏🔥', timestamp: '8:02 PM', status: 'read' },
  { id: 'r3', senderId: 'me', receiverId: 'u3', type: 'text', content: 'That six in the final ball... legendary!', timestamp: '8:03 PM', status: 'read' },
  { id: 'r4', senderId: 'u3', receiverId: 'me', type: 'video', content: '', timestamp: '8:05 PM', status: 'read', duration: '0:45' },
  { id: 'r5', senderId: 'u3', receiverId: 'me', type: 'text', content: 'Watch the highlights clip I saved 👆', timestamp: '8:05 PM', status: 'read' },
  { id: 'r6', senderId: 'me', receiverId: 'u3', type: 'voice', content: '', timestamp: '8:10 PM', status: 'delivered', duration: '0:12' },
  { id: 'r7', senderId: 'u3', receiverId: 'me', type: 'text', content: 'Wanna watch the next match together?', timestamp: '8:15 PM', status: 'read' },
  { id: 'r8', senderId: 'me', receiverId: 'u3', type: 'text', content: "100%! Let's plan it 🙌", timestamp: '8:16 PM', status: 'sent' },
];

export const mockChats: Chat[] = [
  {
    id: 'c1',
    user: aarav,
    messages: aaravMessages,
    lastMessage: aaravMessages[aaravMessages.length - 1],
    unreadCount: 2,
    isPinned: true,
    isMuted: false,
    isArchived: false,
    isTyping: true,
  },
  {
    id: 'c2',
    user: priya,
    messages: priyaMessages,
    lastMessage: priyaMessages[priyaMessages.length - 1],
    unreadCount: 0,
    isPinned: false,
    isMuted: false,
    isArchived: false,
  },
  {
    id: 'c3',
    user: rohan,
    messages: rohanMessages,
    lastMessage: rohanMessages[rohanMessages.length - 1],
    unreadCount: 1,
    isPinned: false,
    isMuted: true,
    isArchived: false,
  },
];
export const registeredUsers: User[] = [aarav, priya, rohan];
