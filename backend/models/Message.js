import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  senderId: { type: String, required: true },
  receiverId: { type: String, required: true },
  conversationId: { type: String, required: true },
  type: {
    type: String,
    enum: ['text', 'image', 'pdf', 'voice', 'video', 'location'],
    required: true
  },
  content: { type: String, required: true },
  fileName: { type: String },
  fileSize: { type: String },
  duration: { type: String },
  mediaData: {
    publicId: String,
    width: Number,
    height: Number,
    size: String,
    thumbnail: String,
    duration: String,
    fileName: String,
    fileType: String,
    latitude: Number,
    longitude: Number,
    address: String
  },
  linkPreview: {
    url: String,
    title: String,
    description: String,
    image: String,
    siteName: String
  },
  timestamp: { type: Date, default: Date.now },
  editedAt: { type: Date, default: null },
  isEdited: { type: Boolean, default: false },
  status: {
    type: String,
    enum: ['sent', 'delivered', 'read'],
    default: 'sent'
  },
  isQueued: { type: Boolean, default: false },      // waiting for delivery
  queuedAt: { type: Date, default: null },          // when it was queued
  deliveredAt: { type: Date, default: null },       // when delivered
  readAt: { type: Date, default: null },            // when read
  deletedFor: [{ type: String }],
  reactions: [{
    userId: { type: String },
    emoji: { type: String }
  }],
  replyTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Message', default: null },
  isDeletedForEveryone: { type: Boolean, default: false },
  isStarred: [{ type: String }]
});

export const Message = mongoose.model('Message', messageSchema);
