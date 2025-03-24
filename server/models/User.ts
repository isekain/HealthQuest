import mongoose from 'mongoose';

const UserSchemaDefinition = {
  walletAddress: {
    type: String,
    required: true,
    unique: true,
  },
  username: {
    type: String,
    required: true,
  },
  authToken: {
    type: String,
    default: null,
  },
  gold: {
    type: Number,
    default: 10
  },
  profile: {
    // Basic info
    age: Number,
    gender: String,
    height: Number,
    weight: Number,
    waistCircumference: Number,
    
    // Fitness info
    fitnessGoal: String,
    experience: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced'],
      required: false 
    },
    preferredActivities: [String],
    activityLevel: String,
    workoutFrequency: {
      sessionsPerWeek: Number,
      minutesPerSession: Number
    },
    
    // Health info
    medicalConditions: String,
    injuries: [String],
    sleepQuality: String,
    mentalHealth: String,
    dietaryRestrictions: {
      type: String,
      default: ''
    },
    dietaryHabits: String,
    dietType: String,
    foodAllergies: [String],
    trackNutrition: Boolean,
    
    // Goals
    targetWeight: Number,
    targetDuration: String,
    goalDescription: {
      type: String,
      default: ''
    },
    secondaryGoals: [String],
    
    // Equipment & Trackers
    equipment: [String],
    fitnessTrackers: [String],
    fitnessTracker: String
  },
  nftTokenId: String,
  score: {
    type: Number,
    default: 0
  },
  rank: {
    type: Number,
    default: 0
  },
  totalWorkouts: {
    type: Number,
    default: 0
  },
  totalMinutes: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
};

const UserSchema = new mongoose.Schema(UserSchemaDefinition);

UserSchema.set('toJSON', {
  transform: function(doc, ret, options) {
    if (!ret.profile) {
      ret.profile = {};
    }
    if (ret.profile.dietaryRestrictions === undefined) {
      ret.profile.dietaryRestrictions = '';
    }
    
    if (ret.profile.goalDescription === undefined) {
      ret.profile.goalDescription = '';
    }

    return ret;
  }
});

// console.log('User Schema Definition:', JSON.stringify(UserSchemaDefinition.profile, null, 2));

export const User = mongoose.model('User', UserSchema);