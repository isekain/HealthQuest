import mongoose from 'mongoose';

const WorkoutSchema = new mongoose.Schema({
  userWallet: {
    type: String,
    required: true,
    ref: 'User'
  },
  type: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  duration: {
    type: Number,
    required: true
  },
  completed: {
    type: Boolean,
    default: false
  },
  completedAt: Date,
  aiGenerated: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export const Workout = mongoose.model('Workout', WorkoutSchema);
