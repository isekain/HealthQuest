import mongoose from 'mongoose';

const BossDamageSchema = new mongoose.Schema({
  userWallet: { type: String, required: true },
  bossId: { type: mongoose.Schema.Types.ObjectId, ref: 'Boss', required: true },
  damage: { type: Number, required: true },
  rewardsXp: { type: Number, required: true },
  rewardsGold: { type: Number, required: true },
  battleDescription: { type: String, required: true },
  isCritical: { type: Boolean, default: false },
  specialEffects: { type: [String], default: [] },
  timestamp: { type: Date, default: Date.now }
});

export const BossDamage = mongoose.model('BossDamage', BossDamageSchema); 