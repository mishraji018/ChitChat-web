import mongoose from 'mongoose';

const conversationSchema = new mongoose.Schema({
  conversationId: { type: String, required: true, unique: true },
  participants: [{ type: String, required: true }],
  lastMessage: { type: String },
  lastMessageTime: { type: Date },
  lastMessageType: { type: String },
  unreadCount: { 
    type: Map, 
    of: Number,
    default: {}
  },
  pinnedBy: [{ type: String }],
  mutedBy: [{ type: String }],
  archivedBy: [{ type: String }],
  createdAt: { type: Date, default: Date.now }
});

export const Conversation = mongoose.model('Conversation', conversationSchema);
