import mongoose from 'mongoose';

const QuestActivitySchema = new mongoose.Schema({
  userWallet: {
    type: String,
    required: true,
    index: true
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
}, {
  timestamps: true
});

export const QuestActivity = mongoose.model('QuestActivity', QuestActivitySchema); 