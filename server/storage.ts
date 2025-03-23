import { User } from './models/User';
import type { InsertUser } from '@shared/schema';
import { Workout } from './models/Workout';
import { NFTStats } from './models/NFTStats';
import { Achievement } from './models/Achievement';

export interface IStorage {
  // User operations
  getUserByWallet(walletAddress: string): Promise<any>;
  createUser(user: InsertUser): Promise<any>;
  updateUserProfile(walletAddress: string, profile: any): Promise<any>;

  // Workout operations
  createWorkout(workout: Omit<Workout, "id" | "createdAt">): Promise<Workout>;
  getUserWorkouts(userWallet: string): Promise<Workout[]>;
  completeWorkout(id: number): Promise<Workout>;

  // NFT operations  
  getNFTStats(userWallet: string): Promise<NFTStats | undefined>;
  updateNFTStats(userWallet: string, stats: Omit<NFTStats, "id" | "userWallet" | "lastUpdated">): Promise<NFTStats>;

  // Leaderboard operations
  getLeaderboard(): Promise<any[]>;
  updateUserStats(walletAddress: string): Promise<any>;

  // Achievement operations
  getUserAchievements(userWallet: string): Promise<Achievement[]>;
  unlockAchievement(achievement: Omit<Achievement, "id" | "createdAt">): Promise<Achievement>;
  checkAndUnlockAchievements(userWallet: string): Promise<Achievement[]>;
}

export class MongoStorage implements IStorage {
  async getUserByWallet(walletAddress: string) {
    try {
      const user = await User.findOne({ walletAddress });
      return user;
    } catch (error) {
      console.error("Error getting user:", error);
      throw new Error("Failed to get user");
    }
  }

  async createUser(insertUser: InsertUser) {
    try {
      const defaultProfile = {
        age: 0,
        gender: "",
        height: 0,
        weight: 0,
        waistCircumference: 0,
        fitnessGoal: "",
        experience: "beginner",
        medicalConditions: "",
        injuries: [],
        sleepQuality: '',
        mentalHealth: '',
        activityLevel: '',
        dietaryHabits: "",
        dietaryRestrictions: "",
        dietType: '',
        foodAllergies: [],
        trackNutrition: false,
        targetWeight: 0,
        targetDuration: '',
        goalDescription: '',
        secondaryGoals: [],
        equipment: [],
        fitnessTracker: '',
        preferredActivities: [],
        workoutFrequency: {
          sessionsPerWeek: 3,
          minutesPerSession: 30,
        },
      };

      const user = await User.create({
        walletAddress: insertUser.walletAddress,
        username: insertUser.username,
        profile: { ...defaultProfile, ...(insertUser.profile || {}) },
      });
      return user;
    } catch (error) {
      console.error("Error creating user:", error);
      throw new Error("Failed to create user");
    }
  }

  async updateUserProfile(walletAddress: string, profile: any) {
    try {
      console.log('Updating profile for wallet:', walletAddress);
      console.log('Profile data:', JSON.stringify(profile, null, 2));

      // Validate required fields and log missing fields
      const requiredFields = ['age', 'gender', 'height', 'weight', 'fitnessGoal'];
      const missingFields = requiredFields.filter(field => !profile[field]);

      if (missingFields.length > 0) {
        console.error('Missing required fields:', missingFields);
        throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
      }

      // Prepare update operation
      const updateOperation: any = {};
      
      // If username is provided, update it separately
      if (profile.username) {
        updateOperation['username'] = profile.username;
      }
      
      // Ensure array fields are always arrays
      const ensureArray = (value: any) => Array.isArray(value) ? value : (value ? [value] : []);
      
      // Create a safe copy of profile for processing and validation
      const safeProfile = { ...profile };

      // Ensure dietaryRestrictions and goalDescription fields always exist
      if (safeProfile.dietaryRestrictions === undefined || safeProfile.dietaryRestrictions === null) {
        safeProfile.dietaryRestrictions = '';
      }
      
      if (safeProfile.goalDescription === undefined || safeProfile.goalDescription === null) {
        safeProfile.goalDescription = '';
      }
      
      // Prepare profile fields to update
      // Basic info
      updateOperation['profile.age'] = safeProfile.age;
      updateOperation['profile.gender'] = safeProfile.gender;
      updateOperation['profile.height'] = safeProfile.height;
      updateOperation['profile.weight'] = safeProfile.weight;
      updateOperation['profile.fitnessGoal'] = safeProfile.fitnessGoal;
      updateOperation['profile.experience'] = safeProfile.experience;
      
      // Health info
      updateOperation['profile.medicalConditions'] = safeProfile.medicalConditions || '';
      updateOperation['profile.injuries'] = ensureArray(safeProfile.injuries);
      updateOperation['profile.sleepQuality'] = safeProfile.sleepQuality || '';
      updateOperation['profile.mentalHealth'] = safeProfile.mentalHealth || '';
      
      // IMPORTANT: Ensure dietaryRestrictions field is updated
      console.log('Updating dietaryRestrictions:', safeProfile.dietaryRestrictions);
      updateOperation['profile.dietaryRestrictions'] = safeProfile.dietaryRestrictions;
      
      // Activity info
      updateOperation['profile.activityLevel'] = safeProfile.activityLevel || '';
      updateOperation['profile.dietaryHabits'] = safeProfile.dietaryHabits || '';
      updateOperation['profile.preferredActivities'] = ensureArray(safeProfile.preferredActivities);
      
      // Workout frequency
      updateOperation['profile.workoutFrequency.sessionsPerWeek'] = safeProfile.workoutFrequency?.sessionsPerWeek || 3;
      updateOperation['profile.workoutFrequency.minutesPerSession'] = safeProfile.workoutFrequency?.minutesPerSession || 60;
      
      // Diet info
      updateOperation['profile.dietType'] = safeProfile.dietType || '';
      updateOperation['profile.foodAllergies'] = ensureArray(safeProfile.foodAllergies);
      updateOperation['profile.trackNutrition'] = safeProfile.trackNutrition || false;
      
      // Goals
      if (safeProfile.targetWeight) {
        updateOperation['profile.targetWeight'] = safeProfile.targetWeight;
      }
      updateOperation['profile.targetDuration'] = safeProfile.targetDuration || '';
      
      // IMPORTANT: Ensure goalDescription field is updated
      console.log('Updating goalDescription:', safeProfile.goalDescription);
      updateOperation['profile.goalDescription'] = safeProfile.goalDescription;
      
      updateOperation['profile.secondaryGoals'] = ensureArray(safeProfile.secondaryGoals);
      
      // Equipment and trackers
      updateOperation['profile.equipment'] = ensureArray(safeProfile.equipment);
      updateOperation['profile.fitnessTrackers'] = ensureArray(safeProfile.fitnessTrackers);
      updateOperation['profile.fitnessTracker'] = safeProfile.fitnessTracker || '';
      
      if (safeProfile.waistCircumference) {
        updateOperation['profile.waistCircumference'] = safeProfile.waistCircumference;
      }

      // Log key fields for debugging
      console.log('Dietary Restrictions:', safeProfile.dietaryRestrictions);
      console.log('Goal Description:', safeProfile.goalDescription);
      console.log('Fitness Tracker:', safeProfile.fitnessTracker);
      console.log('Fitness Trackers:', safeProfile.fitnessTrackers);

      // Update user with all fields - Direct query to confirm update
      console.log('Update operation:', JSON.stringify(updateOperation, null, 2));
      
      // Perform update and get updated document
      const user = await User.findOneAndUpdate(
        { walletAddress },
        { $set: updateOperation },
        { 
          new: true, // Return updated document
          runValidators: true // Run model validations
        }
      );

      if (!user) {
        console.error('User not found:', walletAddress);
        throw new Error("User not found");
      }

      // Check if data has been updated and returned correctly
      console.log('Updated profile from DB:', JSON.stringify(user.profile, null, 2));
      console.log('Field dietaryRestrictions:', user.profile?.dietaryRestrictions);
      console.log('Field goalDescription:', user.profile?.goalDescription);
      
      // Return updated data
      return user;
    } catch (error) {
      console.error("Error updating profile:", error);
      throw error; // Throw original error for better debugging
    }
  }

  async createWorkout(workout: Omit<Workout, "id" | "createdAt">): Promise<Workout> {
    try {
      const newWorkout = await Workout.create(workout);
      return newWorkout;
    } catch (error) {
      console.error("Error creating workout:", error);
      throw new Error("Failed to create workout");
    }
  }

  async getUserWorkouts(userWallet: string): Promise<Workout[]> {
    try {
      const workouts = await Workout.find({ userWallet });
      return workouts;
    } catch (error) {
      console.error("Error getting workouts:", error);
      throw new Error("Failed to get workouts");
    }
  }

  async completeWorkout(id: number): Promise<Workout> {
    try {
      const workout = await Workout.findByIdAndUpdate(id, { completed: true, completedAt: new Date() }, { new: true });
      if (!workout) throw new Error("Workout not found");
      return workout;
    } catch (error) {
      console.error("Error completing workout:", error);
      throw new Error("Failed to complete workout");
    }
  }

  async getNFTStats(userWallet: string): Promise<NFTStats | undefined> {
    try {
      const stats = await NFTStats.findOne({ userWallet });
      return stats;
    } catch (error) {
      console.error("Error getting NFT stats:", error);
      throw new Error("Failed to get NFT stats");
    }
  }

  async updateNFTStats(
    userWallet: string,
    stats: Omit<NFTStats, "id" | "userWallet" | "lastUpdated">
  ): Promise<NFTStats> {
    try {
      const updatedStats = await NFTStats.findOneAndUpdate(
        { userWallet },
        { $set: { ...stats, lastUpdated: new Date() } },
        { upsert: true, new: true }
      );
      return updatedStats;
    } catch (error) {
      console.error("Error updating NFT stats:", error);
      throw new Error("Failed to update NFT stats");
    }
  }

  async getLeaderboard(): Promise<any[]> {
    try {
      const users = await User.find().sort({ score: -1 }).limit(100);
      return users;
    } catch (error) {
      console.error("Error getting leaderboard:", error);
      throw new Error("Failed to get leaderboard");
    }
  }

  async updateUserStats(walletAddress: string): Promise<any> {
    try {
      const workoutStats = await Workout.aggregate([
        { $match: { userWallet: walletAddress, completed: true } },
        { $group: { _id: null, totalWorkouts: { $sum: 1 }, totalMinutes: { $sum: '$duration' } } },
      ]);

      const score = (workoutStats[0]?.totalWorkouts || 0) * 100 + Math.floor((workoutStats[0]?.totalMinutes || 0) / 10);

      const user = await User.findOneAndUpdate(
        { walletAddress },
        { $set: { score, totalWorkouts: workoutStats[0]?.totalWorkouts || 0, totalMinutes: workoutStats[0]?.totalMinutes || 0 } },
        { new: true }
      );
      if (!user) throw new Error("User not found");
      return user;
    } catch (error) {
      console.error("Error updating user stats:", error);
      throw new Error("Failed to update user stats");
    }
  }


  async getUserAchievements(userWallet: string): Promise<Achievement[]> {
    try {
      const achievements = await Achievement.find({ userWallet }).sort({ unlockedAt: 1 });
      return achievements;
    } catch (error) {
      console.error("Error getting user achievements:", error);
      throw new Error("Failed to get user achievements");
    }
  }

  async unlockAchievement(achievement: Omit<Achievement, "id" | "createdAt">): Promise<Achievement> {
    try {
      const newAchievement = await Achievement.create({ ...achievement, unlockedAt: new Date() });
      return newAchievement;
    } catch (error) {
      if (error.code === 11000) { // Duplicate key error
        return null; // Achievement already exists
      }
      console.error("Error unlocking achievement:", error);
      throw new Error("Failed to unlock achievement");
    }
  }

  async checkAndUnlockAchievements(userWallet: string): Promise<Achievement[]> {
    const user = await this.getUserByWallet(userWallet);
    if (!user) throw new Error("User not found");

    const unlockedAchievements: Achievement[] = [];

    // First Workout
    if (user.totalWorkouts === 1) {
      const achievement = await this.unlockAchievement({
        userWallet,
        type: "first_workout",
        name: "First Step",
        description: "Complete your first workout",
        iconName: "footprints",
      });
      if (achievement) unlockedAchievements.push(achievement);
    }

    // Workout Milestones
    const workoutMilestones = [10, 25, 50, 100];
    for (const milestone of workoutMilestones) {
      if (user.totalWorkouts >= milestone) {
        const achievement = await this.unlockAchievement({
          userWallet,
          type: `workouts_${milestone}`,
          name: `${milestone} Workouts`,
          description: `Complete ${milestone} workouts`,
          iconName: "dumbbell",
        });
        if (achievement) unlockedAchievements.push(achievement);
      }
    }

    // Time Milestones (in hours)
    const timeMilestones = [1, 5, 10, 25, 50, 100];
    const totalHours = Math.floor(user.totalMinutes / 60);
    for (const milestone of timeMilestones) {
      if (totalHours >= milestone) {
        const achievement = await this.unlockAchievement({
          userWallet,
          type: `hours_${milestone}`,
          name: `${milestone} Hours`,
          description: `Spend ${milestone} hours working out`,
          iconName: "clock",
        });
        if (achievement) unlockedAchievements.push(achievement);
      }
    }

    // Ranking Achievements
    const rankMilestones = [100, 50, 25, 10, 1];
    for (const milestone of rankMilestones) {
      if (user.rank <= milestone) {
        const achievement = await this.unlockAchievement({
          userWallet,
          type: `rank_${milestone}`,
          name: `Top ${milestone}`,
          description: `Reach top ${milestone} on the leaderboard`,
          iconName: "trophy",
        });
        if (achievement) unlockedAchievements.push(achievement);
      }
    }

    return unlockedAchievements;
  }
}

export const storage = new MongoStorage();