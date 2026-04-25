import mongoose from 'mongoose';

const conversationSchema = new mongoose.Schema({
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  lastMessage: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' },
  lastMessageTime: { type: Date, default: Date.now },
  unreadCount: { type: Map, of: Number, default: {} },
  isPinned: { type: Map, of: Boolean, default: {} },
  isMuted: { type: Map, of: Boolean, default: {} },
  isArchived: { type: Map, of: Boolean, default: {} },
  wallpaper: { type: Map, of: String, default: {} }
}, { timestamps: true });

const Conversation = mongoose.model('Conversation', conversationSchema);
export default Conversation;
