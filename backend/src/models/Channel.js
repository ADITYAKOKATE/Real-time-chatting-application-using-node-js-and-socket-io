const mongoose = require('mongoose');

const channelSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    admins: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    isPrivate: {
      type: Boolean,
      default: false,
    },
    // DM channel between exactly 2 users
    isDM: {
      type: Boolean,
      default: false,
    },
    // Track last message for sidebar preview
    lastMessage: {
      content: String,
      senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      sentAt: Date,
    },
    // For unread counts: per-user read cursors
    readCursors: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        lastReadMessageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' },
        lastReadAt: Date,
      },
    ],
  },
  { timestamps: true }
);

// Index for DM lookup (two user IDs → unique DM channel)
channelSchema.index({ isDM: 1, members: 1 });

module.exports = mongoose.model('Channel', channelSchema);
