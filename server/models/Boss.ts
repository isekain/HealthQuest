import mongoose from 'mongoose';

const BossSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  imageUrl: { type: String, default: '' },
  level: { type: Number, required: true, default: 1 },
  
  // Basic stats
  health: { type: Number, required: true },
  maxHealth: { type: Number, required: true },
  damage: { type: Number, required: true },
  defense: { type: Number, required: true },
  
  // RPG stats like user
  STR: { type: Number, default: 10 },
  AGI: { type: Number, default: 10 },
  VIT: { type: Number, default: 10 },
  DEX: { type: Number, default: 10 },
  INT: { type: Number, default: 10 },
  
  // Rewards
  rewardsXp: { type: Number, required: true },
  rewardsGold: { type: Number, required: true },
  
  // Status
  isActive: { type: Boolean, default: true },
  isDefeated: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  defeatDate: { type: Date },
  
  // Special attributes
  abilities: [String],
  weaknesses: [String],
  immunities: [String],
  
  // Player requirements
  minLevelRequired: { type: Number, default: 1 }
});

export const Boss = mongoose.model('Boss', BossSchema); 