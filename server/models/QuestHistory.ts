import mongoose from 'mongoose';

const QuestHistorySchema = new mongoose.Schema({
  userWallet: {
    type: String,
    required: true,
    ref: 'User'
  },
  questId: {
    type: String,
    required: true
  },
  questType: {
    type: String,
    required: true,
    enum: ['personal', 'server']
  },
  questTitle: {
    type: String,
    required: true
  },
  energyCost: {
    type: Number,
    default: 0
  },
  rewardsXp: {
    type: Number,
    required: true
  },
  rewardsGold: {
    type: Number,
    required: true
  },
  rewardsItems: {
    type: [String],
    default: []
  },
  completedAt: {
    type: Date,
    default: Date.now
  }
});

export const QuestHistory = mongoose.model('QuestHistory', QuestHistorySchema); 