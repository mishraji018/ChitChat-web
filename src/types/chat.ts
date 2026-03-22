export type MessageType = 'text' | 'image' | 'document' | 'voice' | 'video' | 'location' | 'sticker';
export type MessageStatus = 'sent' | 'delivered' | 'read';
export type ThemeType = 'dark' | 'deep-blue' | 'light' | 'rose';

export interface User {
  id: string;
  username: string;
  displayName: string;
  avatar?: string;
  avatarColor: string;
  status: string;
  isOnline: boolean;
  lastSeen?: string;
  mobileNumber?: string;
  email?: string;
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  type: MessageType;
  content: string;
  timestamp: string;
  status: MessageStatus;
  isQueued?: boolean;
  replyTo?: string;
  reactions?: { emoji: string; userId: string }[];
  isEdited?: boolean;
  isStarred?: boolean;
  isDeleted?: boolean;
  fileName?: string;
  fileSize?: string;
  duration?: string;
  mediaData?: {
    address?: string;
    latitude?: number;
    longitude?: number;
    name?: string;
  };
}

export interface Chat {
  id: string;
  user: User;
  messages: Message[];
  lastMessage?: Message;
  unreadCount: number;
  isPinned: boolean;
  isMuted: boolean;
  isArchived: boolean;
  isTyping?: boolean;
}
