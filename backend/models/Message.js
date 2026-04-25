import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  conversationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true },
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  receiverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { 
    type: String, 
    enum: ['text', 'image', 'video', 'audio', 'pdf', 'location'],
    default: 'text'
  },
  text: { type: String },
  mediaUrl: { type: String },
  mediaSize: { type: Number },
  mediaDuration: { type: Number },
  location: {
    lat: { type: Number },
    lng: { type: Number },
    address: { type: String }
  },
  status: { 
    type: String, 
    enum: ['sent', 'delivered', 'read'],
    default: 'sent'
  },
  replyTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' },
  reactions: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    emoji: { type: String }
  }],
  isEdited: { type: Boolean, default: false },
  editedAt: { type: Date },
  isDeleted: { type: Boolean, default: false },
  deletedFor: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  isStarred: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  isForwarded: { type: Boolean, default: false }
}, { timestamps: true });

const Message = mongoose.model('Message', messageSchema);
export default Message;
