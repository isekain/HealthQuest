import mongoose from 'mongoose';

const NFTStatsSchema = new mongoose.Schema({
  userWallet: {
    type: String,
    required: true,
    ref: 'User'
  },
  tokenId: {
    type: String,
    required: true
  },
  
  STR: {
    type: Number,
    default: 10
  },
  AGI: {
    type: Number,
    default: 10
  },
  VIT: {
    type: Number,
    default: 10
  },
  DEX: {
    type: Number,
    default: 10
  },
  INT: {
    type: Number,
    default: 10
  },
  WIS: {
    type: Number,
    default: 10
  },
  LUK: {
    type: Number,
    default: 10
  },
  
  // Energy & Progression
  energy: {
    type: Number,
    default: 100
  },
  energyLastReset: {
    type: Date,
    default: Date.now
  },
  level: {
    type: Number,
    default: 1
  },
  xp: {
    type: Number,
    default: 0
  },
  xpToNextLevel: {
    type: Number,
    default: 100
  },
  statsPoints: {
    type: Number,
    default: 0
  },
  
  // Legacy fields for backward compatibility
  strength: {
    type: Number,
    default: 10
  },
  endurance: {
    type: Number,
    default: 10
  },
  agility: {
    type: Number,
    default: 10
  },
  
  lastUpdated: {
    type: Date,
    default: Date.now
  }
});

export const NFTStats = mongoose.model('NFTStats', NFTStatsSchema);
