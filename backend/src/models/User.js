const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 2,
      maxlength: 30,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    avatar: {
      type: String,
      default: '',
    },
    // E2E Encryption (Phase 6)
    publicKey: {
      type: String,
      default: '',
    },
    privateKeyBackup: {
      type: String, // PBKDF2-encrypted private key backup
      default: '',
    },
    // Presence
    status: {
      type: String,
      enum: ['ONLINE', 'AWAY', 'OFFLINE'],
      default: 'OFFLINE',
    },
    lastSeen: {
      type: Date,
      default: Date.now,
    },
    // Push Notifications (Phase 5)
    pushSubscriptions: [
      {
        endpoint: String,
        keys: {
          p256dh: String,
          auth: String,
        },
        deviceLabel: String,
        quietHours: {
          enabled: { type: Boolean, default: false },
          from: { type: Number, default: 22 }, // 10 PM
          to: { type: Number, default: 8 },    // 8 AM
        },
      },
    ],
  },
  { timestamps: true }
);

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('passwordHash')) return next();
  this.passwordHash = await bcrypt.hash(this.passwordHash, 12);
  next();
});

// Compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

// Return safe user object (no password)
userSchema.methods.toSafeObject = function () {
  const obj = this.toObject();
  delete obj.passwordHash;
  delete obj.privateKeyBackup;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
