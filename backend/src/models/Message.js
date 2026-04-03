const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    channelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Channel',
      required: true,
      index: true,
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // Plain text content (null for E2E encrypted DMs)
    content: {
      type: String,
      default: '',
    },
    type: {
      type: String,
      enum: ['text', 'file', 'system', 'encrypted'],
      default: 'text',
    },
    // Thread support
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
      default: null,
    },
    thread: {
      replyCount: { type: Number, default: 0 },
      lastReplyAt: Date,
      participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    },
    // Reactions: [{ emoji: '👍', users: [userId, ...] }]
    reactions: [
      {
        emoji: String,
        users: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
      },
    ],
    // Read receipts
    readBy: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        readAt: { type: Date, default: Date.now },
      },
    ],
    // Edit history
    editHistory: [
      {
        content: String,
        editedAt: { type: Date, default: Date.now },
      },
    ],
    editedAt: {
      type: Date,
      default: null,
    },
    // Soft delete
    deletedAt: {
      type: Date,
      default: null,
    },
    // File attachment (Phase 4)
    file: {
      key: String,
      url: String,
      thumbnailUrl: String,
      mimeType: String,
      size: Number,
      name: String,
      videoMeta: {
        duration: Number,
        width: Number,
        height: Number,
      },
    },
    // Link previews (Phase 4)
    linkPreviews: [
      {
        url: String,
        title: String,
        description: String,
        image: String,
        siteName: String,
      },
    ],
    // E2E Encryption (Phase 6)
    isEncrypted: {
      type: Boolean,
      default: false,
    },
    ciphertext: {
      type: String,
      default: null,
    },
    iv: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

// Compound index for cursor pagination
messageSchema.index({ channelId: 1, _id: -1 });

// Full-text search index on content
messageSchema.index({ content: 'text' });

module.exports = mongoose.model('Message', messageSchema);
