import mongoose from 'mongoose';

// Define the data type for bonuses
interface Bonuses {
  STR?: number;
  AGI?: number;
  VIT?: number;
  DEX?: number;
  INT?: number;
  WIS?: number;
  LUK?: number;
}

const nftItemSchema = new mongoose.Schema({
  userWallet: {
    type: String,
    required: true,
    index: true
  },
  itemId: {
    type: String,
    required: true
  },
  type: {
    type: String,
    required: true,
    enum: ['helmet', 'armor', 'weapon', 'gloves', 'boots', 'accessory']
  },
  name: {
    type: String,
    required: true
  },
  rarity: {
    type: String,
    required: true,
    enum: ['common', 'uncommon', 'rare', 'epic', 'legendary']
  },
  bonuses: {
    type: Object,
    default: {}
  },
  isEquipped: {
    type: Boolean,
    default: false
  },
  price: {
    type: Number,
    default: 0
  },
  imageUrl: {
    type: String
  },
  acquiredAt: {
    type: Date,
    default: Date.now
  }
});

// Create compound index for userWallet + itemId
nftItemSchema.index({ userWallet: 1, itemId: 1 }, { unique: true });

export const NFTItem = mongoose.model('NFTItem', nftItemSchema); 