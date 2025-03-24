import mongoose from 'mongoose';

const AchievementSchema = new mongoose.Schema({
  userWallet: {
    type: String,
    required: true,
    ref: 'User'
  },
  type: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  iconName: {
    type: String,
    required: true
  },
  unlockedAt: {
    type: Date,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Create compound unique index to prevent duplicate achievements
AchievementSchema.index({ userWallet: 1, type: 1 }, { unique: true });

export const Achievement = mongoose.model('Achievement', AchievementSchema);
