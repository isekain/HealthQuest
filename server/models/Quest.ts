import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

const questSchema = new mongoose.Schema(
  {
    questId: { type: String, required: true, default: () => uuidv4() },
    userWallet: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    category: { type: String, required: true, enum: ['strength', 'cardio', 'flexibility', 'nutrition', 'mental', 'daily'] },
    difficulty: { type: String, required: true, enum: ['easy', 'medium', 'hard'] },
    objective: { type: String, required: true },
    target: { type: Number, required: true },
    unit: { type: String, required: true },
    progress: { type: Number, default: 0 },
    rewards: {
      xp: { type: Number, required: true },
      gold: { type: Number, required: true },
      items: [String],
     
    },
    type: { type: String, required: true, enum: ['personal', 'server'] , default: 'personal'},
    energyCost: { type: Number, default: 0 },
    requiredLevel: { type: Number, default: 0 },
    completed: { type: Boolean, default: false },
    completedAt: { type: Date, default: null },
    completionCriteria: { type: String, enum: ['manual', 'automatic', 'verification'], default: 'manual' },
    completionInstructions: { type: String, default: '' },
    expiresAt: { type: Date, required: true, default: () => new Date(Date.now() + 24 * 60 * 60 * 1000) },
    estimatedTime: { type: Number, default: 30 },
    startedAt: { type: Date, default: null },
    active: { type: Boolean, default: false },

  
    workoutDetails: [
      {
        section: { type: String, required: true },
        duration: { type: Number, required: true },
        exercises: [
          {
            name: { type: String, required: true },
            time: { type: String, required: true },
            description: { type: String, required: true }
          }
        ]
      }
    ]
  },
  { timestamps: true }
);

// Index for finding active quests
questSchema.index({ userWallet: 1, active: 1 });

// Add index for expired quests
questSchema.index({ expiresAt: 1 });

const Quest = mongoose.model('Quest', questSchema);

export default Quest; 