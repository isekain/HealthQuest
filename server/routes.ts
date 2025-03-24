import type { Express } from "express";
import { createServer } from "http";
import { storage } from "./storage";
import { generateWorkoutPlan, analyzeWorkoutProgress } from "@shared/ai";
import { insertUserSchema, insertWorkoutSchema, insertNFTStatsSchema } from "@shared/schema";
import { z } from "zod";
import { authenticate, verifyWalletOwnership, verifyDbToken, generateToken, generateAuthToken } from "./middleware/authMiddleware";
import { User } from "./models/User";
import { NFTStats } from "./models/NFTStats";
import { NFTItem } from "./models/NFTItem";
import { QuestHistory } from "./models/QuestHistory";
import authRoutes from './routes/authRoutes';
import questRoutes from './routes/questRoutes';
import { Boss } from "./models/Boss";
import { BossDamage } from "./models/BossDamage";
import mongoose from "mongoose";
import { OpenAI } from "openai";

export async function registerRoutes(app: Express) {
  // Auth routes
  app.post("/api/auth/connect", async (req, res) => {
    try {
      const { walletAddress } = req.body;
      
      if (!walletAddress) {
        return res.status(400).json({ error: "Wallet address is required" });
      }
      
      // Create JWT token
      const jwtToken = generateToken(walletAddress);
      
      // Create auth token and save to DB
      const authToken = generateAuthToken();
      
      // Check if user exists
      let user = await storage.getUserByWallet(walletAddress);
      
      if (!user) {
        // Create new user if it doesn't exist
        user = await storage.createUser({
          walletAddress,
          username: `user_${walletAddress.slice(0, 6)}`,
        });
      }
      
      // Update auth token
      await User.findOneAndUpdate(
        { walletAddress },
        { $set: { authToken } },
        { new: true }
      );
      
      res.json({
        token: jwtToken,
        user
      });
    } catch (error) {
      console.error("Auth connect error:", error);
      res.status(500).json({ error: "Failed to authenticate" });
    }
  });

  app.post("/api/auth/disconnect", authenticate, async (req, res) => {
    try {
      const { walletAddress } = req.user!;
      
      // Remove auth token from DB
      await User.findOneAndUpdate(
        { walletAddress },
        { $set: { authToken: null } },
        { new: true }
      );
      
      res.json({ success: true });
    } catch (error) {
      console.error("Auth disconnect error:", error);
      res.status(500).json({ error: "Failed to disconnect" });
    }
  });

  // User routes
  app.post("/api/users", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const existingUser = await storage.getUserByWallet(userData.walletAddress);

      if (existingUser) {
        // If user exists, return the existing user
        return res.json(existingUser);
      }

      const user = await storage.createUser(userData);
      res.json(user);
    } catch (error) {
      console.error("Error in POST /api/users:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid user data", details: error.errors });
      } else {
        res.status(500).json({ error: "Failed to create user" });
      }
    }
  });

  // Route to mint NFT
  app.post("/api/users/mint-nft", authenticate, async (req, res) => {
    try {
      const { walletAddress, tokenId } = req.body;
      
      if (!walletAddress || !tokenId) {
        return res.status(400).json({ error: "Wallet address and token ID are required" });
      }
      
      // Check if user already has an NFT
      const existingNFT = await NFTStats.findOne({ userWallet: walletAddress });
      if (existingNFT) {
        return res.status(400).json({ error: "User already has an NFT" });
      }
      
      // Create new NFT stats with default values
      const nftData = {
        userWallet: walletAddress,
        tokenId,
        STR: 10,
        AGI: 10,
        VIT: 10,
        DEX: 10,
        INT: 10,
        WIS: 10,
        LUK: 10,
        energy: 100,
        level: 1,
        xp: 0,
        xpToNextLevel: 100,
        statsPoints: 3, // Allow user to add 3 stat points when creating NFT
      };
      
      // Save NFT to database
      const nftStats = await NFTStats.create(nftData);
      
      // Update user with new tokenId
      await User.findOneAndUpdate(
        { walletAddress },
        { $set: { nftTokenId: tokenId } },
        { new: true }
      );
      
      res.json(nftStats);
    } catch (error) {
      console.error("Error minting NFT:", error);
      res.status(500).json({ error: "Failed to mint NFT" });
    }
  });
  
  // Route to increase NFT stats
  app.post("/api/users/:walletAddress/nft-stats/increase", authenticate, verifyWalletOwnership, async (req, res) => {
    try {
      const { stat, tokenId } = req.body;
      
      if (!stat || !tokenId) {
        return res.status(400).json({ error: "Stat and token ID are required" });
      }
      
      // Check if NFT exists
      const nftStats = await NFTStats.findOne({ 
        userWallet: req.params.walletAddress,
        tokenId 
      });
      
      if (!nftStats) {
        return res.status(404).json({ error: "NFT not found" });
      }
      
      // Check if there are enough stat points to increase stat
      if (nftStats.statsPoints <= 0) {
        return res.status(400).json({ error: "Not enough stat points" });
      }
      
      // Check if stat is valid
      const validStats = ['STR', 'AGI', 'VIT', 'DEX', 'INT', 'WIS', 'LUK'];
      if (!validStats.includes(stat)) {
        return res.status(400).json({ error: "Invalid stat" });
      }
      
      // Update stat
      const update: any = {
        $inc: { statsPoints: -1 },
        $set: { lastUpdated: new Date() }
      };
      update.$inc[stat] = 1;
      
      const updatedNFT = await NFTStats.findOneAndUpdate(
        { userWallet: req.params.walletAddress, tokenId },
        update,
        { new: true }
      );
      
      res.json(updatedNFT);
    } catch (error) {
      console.error("Error increasing NFT stat:", error);
      res.status(500).json({ error: "Failed to increase NFT stat" });
    }
  });
  
  // Route to equip item
  app.post("/api/users/:walletAddress/nft-items/equip", authenticate, async (req, res) => {
    try {
      const { itemId } = req.body;
      const { walletAddress } = req.params;
      
      console.log(`[EQUIP] Starting to process item/unequip item ${itemId} for wallet ${walletAddress}`);
      
      if (!itemId) {
        return res.status(400).json({ error: "Item ID is required" });
      }
      
      // Get item information
      const item = await NFTItem.findOne({ 
        userWallet: walletAddress,
        itemId
      });
      
      if (!item) {
        return res.status(404).json({ error: "Item not found in inventory" });
      }
      
      console.log(`[EQUIP] Item information:`, JSON.stringify(item, null, 2));
      
      // Get current NFT stats
      const nftStats = await NFTStats.findOne({ userWallet: walletAddress });
      
      if (!nftStats) {
        return res.status(404).json({ error: "NFT not found" });
      }
      
      console.log(`[EQUIP] Current NFT stats:`, JSON.stringify(nftStats, null, 2));
      
      // If item is already equipped, perform unequip
      if (item.isEquipped) {
        console.log(`[EQUIP] Unequipping item ${itemId}`);
        
        // Update item status to unequipped
        await NFTItem.findOneAndUpdate(
          { userWallet: walletAddress, itemId },
          { $set: { isEquipped: false } }
        );
        
        // Get bonuses from item to decrease stats
        const bonuses = item.bonuses as Record<string, number>;
        console.log(`[EQUIP] Bonuses when unequipping:`, bonuses);
        
        // Create object to update decrease stats
        const updateQuery: Record<string, any> = { $inc: {} };
        let hasUpdates = false;
        let statsUpdated: Record<string, number> = {};
        
        for (const stat in bonuses) {
          if (['STR', 'AGI', 'VIT', 'DEX', 'INT', 'WIS', 'LUK'].includes(stat)) {
            const value = bonuses[stat];
            if (typeof value === 'number') {
              updateQuery.$inc[stat] = -value; // Decrease stats
              statsUpdated[stat] = -value;
              hasUpdates = true;
              console.log(`[EQUIP] Decrease ${stat} by ${value} points`);
            }
          }
        }
        
        // Only update if there are changes
        let updatedNFT = nftStats;
        if (hasUpdates) {
          console.log(`[EQUIP] Updating decrease stats:`, updateQuery);
          
          // Perform update and get new result
          updatedNFT = await NFTStats.findOneAndUpdate(
            { userWallet: walletAddress },
            updateQuery,
            { new: true }
          );
          
          console.log(`[EQUIP] NFT stats after unequipping:`, updatedNFT);
        }
        
        res.json({
          success: true,
          equipped: false,
          message: "Item unequipped successfully",
          stats: updatedNFT,
          statsUpdated
        });
        return;
      }
      
      // Process equip item
      console.log(`[EQUIP] Equipping item ${itemId}`);
      
      // Find and unequip item of the same type (if any)
      const oldEquippedItem = await NFTItem.findOne({ 
        userWallet: walletAddress, 
        type: item.type,
        isEquipped: true
      });
      
      let statsDecrease: Record<string, number> = {};
      
      // Unequip old item if exists
      if (oldEquippedItem) {
        console.log(`[EQUIP] Found same type item equipped:`, oldEquippedItem);
        
        // Update old item status to unequipped
        await NFTItem.updateOne(
          { _id: oldEquippedItem._id },
          { $set: { isEquipped: false } }
        );
        
        // Get bonuses from old item to decrease stats
        const oldBonuses = oldEquippedItem.bonuses as Record<string, number>;
        console.log(`[EQUIP] Bonuses of old item:`, oldBonuses);
        
        // Create object to update decrease stats from old item
        const decreaseQuery: Record<string, any> = { $inc: {} };
        let hasDecreaseUpdates = false;
        
        for (const stat in oldBonuses) {
          if (['STR', 'AGI', 'VIT', 'DEX', 'INT', 'WIS', 'LUK'].includes(stat)) {
            const value = oldBonuses[stat];
            if (typeof value === 'number') {
              decreaseQuery.$inc[stat] = -value; // Decrease stats from old item
              statsDecrease[stat] = -value;
              hasDecreaseUpdates = true;
              console.log(`[EQUIP] Decrease ${stat} by ${value} points from old item`);
            }
          }
        }
        
        // Update decrease stats from old item
        if (hasDecreaseUpdates) {
          console.log(`[EQUIP] Updating decrease stats from old item:`, decreaseQuery);
          
          await NFTStats.updateOne(
            { userWallet: walletAddress },
            decreaseQuery
          );
        }
      }
      
      // Equip new item
      await NFTItem.findOneAndUpdate(
        { userWallet: walletAddress, itemId },
        { $set: { isEquipped: true } }
      );
      
      // Get bonuses from new item to increase stats
      const newBonuses = item.bonuses as Record<string, number>;
      console.log(`[EQUIP] Bonuses of new item:`, newBonuses);
      
      // Create object to update increase stats
      const increaseQuery: Record<string, any> = { $inc: {} };
      let hasIncreaseUpdates = false;
      let statsIncrease: Record<string, number> = {};
      
      for (const stat in newBonuses) {
        if (['STR', 'AGI', 'VIT', 'DEX', 'INT', 'WIS', 'LUK'].includes(stat)) {
          const value = newBonuses[stat];
          if (typeof value === 'number') {
            increaseQuery.$inc[stat] = value; // Increase stats
            statsIncrease[stat] = value;
            hasIncreaseUpdates = true;
            console.log(`[EQUIP] Increase ${stat} by ${value} points`);
          }
        }
      }
      
      // Final result
      let finalNFTStats;
      
      // Update increase stats from new item
      if (hasIncreaseUpdates) {
        console.log(`[EQUIP] Updating increase stats from new item:`, increaseQuery);
        
        finalNFTStats = await NFTStats.findOneAndUpdate(
          { userWallet: walletAddress },
          increaseQuery,
          { new: true }
        );
        
        console.log(`[EQUIP] NFT stats after equipping:`, finalNFTStats);
      } else {
        finalNFTStats = await NFTStats.findOne({ userWallet: walletAddress });
      }
      
      // Calculate total stats change
      const combinedStats: Record<string, number> = {};
      
      // Add stats decrease from old item (if exists)
      for (const [stat, value] of Object.entries(statsDecrease)) {
        combinedStats[stat] = (combinedStats[stat] || 0) + value;
      }
      
      // Add stats increase from new item
      for (const [stat, value] of Object.entries(statsIncrease)) {
        combinedStats[stat] = (combinedStats[stat] || 0) + value;
      }
      
      console.log(`[EQUIP] Total stats change:`, combinedStats);
      
      // Return result
      res.json({
        success: true,
        equipped: true,
        message: "Item equipped successfully",
        stats: finalNFTStats,
        statsUpdated: statsIncrease,
        statsTotal: combinedStats
      });
    } catch (error) {
      console.error("Error equipping item:", error);
      res.status(500).json({ error: "Failed to equip item" });
    }
  });

  app.get("/api/users", async (req, res) => {
    const walletAddress = req.query.walletAddress as string;
    if (!walletAddress) {
      res.status(400).json({ error: "Wallet address is required" });
      return;
    }

    const user = await storage.getUserByWallet(walletAddress);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    res.json(user);
  });

  app.get("/api/users/:walletAddress", authenticate, verifyDbToken, verifyWalletOwnership, async (req, res) => {
    const user = await storage.getUserByWallet(req.params.walletAddress);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    res.json(user);
  });

  app.patch("/api/users/:walletAddress/profile", authenticate, verifyDbToken, verifyWalletOwnership, async (req, res) => {
    try {
      

      const profileSchema = z.object({
        username: z.string().min(3).max(30).optional(),
        age: z.number().min(13).max(100),
        gender: z.enum(['male', 'female', 'other']),
        height: z.number().positive(),
        weight: z.number().positive(),
        fitnessGoal: z.enum([
          'weight_loss',
          'weight_gain',
          'muscle_gain',
          'endurance',
          'flexibility',
          'mental_health',
          'injury_recovery'
        ]),
        experience: z.enum(['beginner', 'intermediate', 'advanced']),
        medicalConditions: z.string().optional(),
        injuries: z.array(z.string()).optional(),
        sleepQuality: z.enum(['poor', 'fair', 'good', 'excellent']).optional(),
        mentalHealth: z.enum(['poor', 'fair', 'good', 'excellent']).optional(),
        activityLevel: z.enum(['sedentary', 'lightly_active', 'moderately_active', 'very_active']).optional(),
        dietaryRestrictions: z.string().optional(),
        dietaryHabits: z.string().optional(),
        preferredActivities: z.array(z.string()),
        workoutFrequency: z.object({
          sessionsPerWeek: z.number().min(1).max(14),
          minutesPerSession: z.number().min(15).max(180),
        }),
        dietType: z.enum(['vegetarian', 'vegan', 'keto', 'paleo', 'other']).optional(),
        foodAllergies: z.array(z.string()).optional(),
        trackNutrition: z.boolean().optional(),
        targetWeight: z.number().positive().optional(),
        targetDuration: z.enum(['short_term', 'mid_term', 'long_term']).optional(),
        goalDescription: z.string().optional(),
        secondaryGoals: z.array(z.string()).optional(),
        equipment: z.array(z.string()).optional(),
        fitnessTrackers: z.array(z.string()).optional(),
        fitnessTracker: z.string().optional(),
      });

      try {
        const validatedProfile = profileSchema.parse(req.body);
        
        const user = await storage.updateUserProfile(req.params.walletAddress, validatedProfile);

        if (!user) {
          res.status(404).json({ error: "User not found" });
          return;
        }


        res.json(user);
      } catch (error) {
        if (error instanceof z.ZodError) {
          console.error('Validation error:', error.errors);
          res.status(400).json({ 
            error: "Invalid profile data", 
            details: error.errors.map(err => ({
              path: err.path.join('.'),
              message: err.message
            }))
          });
        } else {
          throw error;
        }
      }
    } catch (error) {
      console.error('Profile update error:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to update profile" });
    }
  });

  // Workout routes
  app.post("/api/workouts", async (req, res) => {
    try {
      const workoutData = insertWorkoutSchema.parse({
        ...req.body,
        completed: false,
        completedAt: null,
      });
      const workout = await storage.createWorkout(workoutData);
      res.json(workout);
    } catch (error) {
      console.error("Error creating workout:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid workout data", details: error.errors });
      } else {
        res.status(500).json({ error: "Failed to create workout" });
      }
    }
  });

  app.get("/api/users/:walletAddress/workouts", async (req, res) => {
    const workouts = await storage.getUserWorkouts(req.params.walletAddress);
    res.json(workouts);
  });

  app.post("/api/workouts/:id/complete", async (req, res) => {
    try {
      const workout = await storage.completeWorkout(parseInt(req.params.id));
      // Update user stats after completing workout
      const user = await storage.updateUserStats(workout.userWallet);
      // Check and unlock achievements
      const newAchievements = await storage.checkAndUnlockAchievements(workout.userWallet);
      
      // Reward gold to user when completing workout (50-150 gold)
      const goldReward = Math.floor(Math.random() * 100) + 50;
      await User.findOneAndUpdate(
        { walletAddress: workout.userWallet },
        { $inc: { gold: goldReward } }
      );

      res.json({ workout, newAchievements, goldReward });
    } catch (error) {
      res.status(500).json({ error: "Failed to complete workout" });
    }
  });

  // AI routes
  app.post("/api/ai/generate-workout", async (req, res) => {
    try {
      const plan = await generateWorkoutPlan(req.body);
      res.json(plan);
    } catch (error) {
      res.status(500).json({ error: "Failed to generate workout plan" });
    }
  });

  app.post("/api/ai/analyze-progress", async (req, res) => {
    try {
      const analysis = await analyzeWorkoutProgress(req.body);
      res.json(analysis);
    } catch (error) {
      res.status(500).json({ error: "Failed to analyze progress" });
    }
  });

  // NFT routes
  app.get("/api/users/:walletAddress/nft-stats", async (req, res) => {
    const stats = await storage.getNFTStats(req.params.walletAddress);
    if (!stats) {
      res.status(404).json({ error: "NFT stats not found" });
      return;
    }
    const statsObj = stats.toObject ? stats.toObject() : stats;
    res.json({
      ...statsObj,
      maxEnergy: 100
    });
  });

  app.patch("/api/users/:walletAddress/nft-stats", async (req, res) => {
    try {
      const stats = await storage.updateNFTStats(req.params.walletAddress, req.body);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Failed to update NFT stats" });
    }
  });

  // Achievement routes
  app.get("/api/users/:walletAddress/achievements", async (req, res) => {
    try {
      const achievements = await storage.getUserAchievements(req.params.walletAddress);
      res.json(achievements);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch achievements" });
    }
  });

  // Leaderboard route
  app.get("/api/leaderboard", async (req, res) => {
    try {
      const { period = 'all' } = req.query;
      
      let startDate = null;
      const now = new Date();
      
      if (period === 'day') {
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      } else if (period === 'week') {
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
      } else if (period === 'month') {
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 30);
      }
      let query = {};
      if (startDate) {
        query = { completedAt: { $gte: startDate } };
      }
      const questStats = await QuestHistory.aggregate([
        { $match: query },
        { 
          $group: { 
            _id: "$userWallet", 
            questCount: { $sum: 1 },
            sumEstimatedTime: { $sum: "$estimatedTime" },
          } 
        },
        { $sort: { questCount: -1 } },
        { $limit: 50 }
      ]);
      const walletAddresses = questStats.map(stat => stat._id);
      const users = await User.find(
        { walletAddress: { $in: walletAddresses } },
        'walletAddress username'  
      );
      const leaderboardData = questStats.map((stat, index) => {
        const user = users.find(u => u.walletAddress === stat._id);
        return {
          rank: index + 1,
          walletAddress: stat._id,
          username: user?.username || `User-${stat._id.slice(0, 6)}`,
          questCount: stat.questCount,
          sumEstimatedTime: stat.sumEstimatedTime
        };
      });
      
      res.json(leaderboardData);
    } catch (error) {
      console.error("Error getting leaderboard:", error);
      res.status(500).json({ error: "Failed to fetch leaderboard" });
    }
  });

  // Marketplace routes
  app.post("/api/marketplace/buy", authenticate, async (req, res) => {
    try {
      const { walletAddress, itemId } = req.body;
      
      if (!walletAddress || !itemId) {
        return res.status(400).json({ error: "Wallet address and item ID are required" });
      }
      
      // Get user information
      const user = await User.findOne({ walletAddress });
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      // Check if user has NFT
      const nft = await NFTStats.findOne({ userWallet: walletAddress });
      
      if (!nft) {
        return res.status(400).json({ error: "User does not have an NFT" });
      }
      
      // Find item information in marketplace
      const marketplaceItems = [
        {
          itemId: "weapon-001",
          type: "weapon",
          name: "Training Sword",
          rarity: "uncommon",
          price: 300,
          bonuses: {
            STR: 3,
            AGI: 1
          }
        },
        {
          itemId: "helmet-001",
          type: "helmet",
          name: "Leather Cap",
          rarity: "common",
          price: 200,
          bonuses: {
            STR: 2,
            VIT: 3,
            DEX: 1
          }
        },
        {
          itemId: "armor-001",
          type: "armor",
          name: "Leather Armor",
          rarity: "common",
          price: 400,
          bonuses: {
            VIT: 5,
            DEX: 2
          }
        },
        {
          itemId: "armor-002",
          type: "armor",
          name: "Knight's Plate",
          rarity: "rare",
          price: 600,
          bonuses: {
            VIT: 4,
            STR: 1,
            DEX: 1
          }
        },
        {
          itemId: "accessory-001",
          type: "accessory",
          name: "Runner's Amulet",
          rarity: "uncommon",
          price: 250,
          bonuses: {
            AGI: 3,
            DEX: 1
          }
        }
      ];
      
      const item = marketplaceItems.find(item => item.itemId === itemId);
      
      if (!item) {
        return res.status(404).json({ error: "Item not found in marketplace" });
      }
      
      // Check balance
      if ((user.gold || 0) < item.price) {
        return res.status(400).json({ error: "Insufficient gold" });
      }
      
      // Deduct gold
      await User.findOneAndUpdate(
        { walletAddress },
        { $inc: { gold: -item.price } }
      );
      
      // Add item to inventory with purchase price
      const inventoryItem = new NFTItem({
        userWallet: walletAddress,
        itemId: item.itemId,
        type: item.type,
        name: item.name,
        rarity: item.rarity,
        bonuses: item.bonuses,
        isEquipped: false,
        price: item.price // Save purchase price
      });
      
      await inventoryItem.save();
      
      res.json({
        success: true,
        item: inventoryItem,
        newBalance: (await User.findOne({ walletAddress }))?.gold || 0
      });
    } catch (error) {
      console.error("Error buying item:", error);
      res.status(500).json({ error: "Failed to buy item" });
    }
  });
  
  // NFT Inventory routes
  app.get("/api/users/:walletAddress/nft-items", async (req, res) => {
    try {
      const items = await NFTItem.find({ userWallet: req.params.walletAddress });
      res.json(items);
    } catch (error) {
      console.error("Error fetching inventory:", error);
      res.status(500).json({ error: "Failed to fetch inventory" });
    }
  });
  
  // Add route to sell item
  app.post("/api/users/:walletAddress/nft-items/sell", authenticate, async (req, res) => {
    try {
      const { itemId } = req.body;
      const { walletAddress } = req.params;
      
      if (!itemId) {
        return res.status(400).json({ error: "Item ID is required" });
      }
      
      // Get item information
      const item = await NFTItem.findOne({ 
        userWallet: walletAddress,
        itemId
      });
      
      if (!item) {
        return res.status(404).json({ error: "Item not found in inventory" });
      }
      
      // Check if item is equipped
      if (item.isEquipped) {
        return res.status(400).json({ 
          error: "Cannot sell equipped item", 
          message: "Please unequip the item before selling"
        });
      }
      
      // Calculate sell price
      let sellPrice = 0;
      
      // If item has price stored in DB
      if (item.price) {
        sellPrice = Math.floor(item.price * 0.8);
      } else {
        // Check item price information in marketplace
        const marketplaceItems = [
          {
            itemId: "weapon-001",
            price: 300
          },
          {
            itemId: "helmet-001",
            price: 200
          },
          {
            itemId: "armor-001", 
            price: 400
          },
          {
            itemId: "armor-002",
            price: 600
          },
          {
            itemId: "accessory-001",
            price: 250
          }
        ];
        
        const marketItem = marketplaceItems.find(mItem => mItem.itemId === item.itemId);
        
        if (marketItem) {
          sellPrice = Math.floor(marketItem.price * 0.8);
        }
      }
      
      // Remove item from inventory
      await NFTItem.deleteOne({ _id: item._id });
      
      // Add gold to user
      await User.findOneAndUpdate(
        { walletAddress },
        { $inc: { gold: sellPrice } }
      );
      
      res.json({ 
        success: true, 
        sold: true, 
        goldReceived: sellPrice,
        newBalance: (await User.findOne({ walletAddress }))?.gold || 0
      });
    } catch (error) {
      console.error("Error selling item:", error);
      res.status(500).json({ error: "Failed to sell item" });
    }
  });

  // Quest routes
  app.post("/api/quests/:id/complete", authenticate, async (req, res) => {
    try {
      const { id } = req.params;
      const { walletAddress, questType, questTitle, energyCost } = req.body;
      
      if (!walletAddress) {
        return res.status(400).json({ error: "Wallet address is required" });
      }
      
      // Check if user exists
      const user = await User.findOne({ walletAddress });
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      // Check if user has NFT
      const nft = await NFTStats.findOne({ userWallet: walletAddress });
      
      if (!nft) {
        return res.status(400).json({ error: "User does not have an NFT" });
      }
      
      // Check energy if it's a server quest
      if (questType === 'server' && (nft.energy || 0) < energyCost) {
        return res.status(400).json({ 
          error: "Not enough energy",
          currentEnergy: nft.energy || 0,
          requiredEnergy: energyCost
        });
      }
      
      // Calculate reward
      const xpReward = Math.floor(Math.random() * 50) + 50; // 50-100 XP
      const goldReward = Math.floor(Math.random() * 100) + 100; // 100-200 Gold
      
      // Update NFT stats: XP and Energy
      let updateData: any = { 
        $inc: { xp: xpReward } 
      };
      
      // Deduct energy for server quest
      if (questType === 'server') {
        updateData.$inc.energy = -energyCost;
      }
      
      // Check level up
      const updatedNft = await NFTStats.findOneAndUpdate(
        { userWallet: walletAddress },
        updateData,
        { new: true }
      );
      
      // Level up if enough XP
      if (updatedNft && updatedNft.xp >= (updatedNft.xpToNextLevel || 100)) {
        await NFTStats.findOneAndUpdate(
          { userWallet: walletAddress },
          { 
            $inc: { level: 1, statsPoints: 3 },
            $set: { 
              xp: updatedNft.xp - (updatedNft.xpToNextLevel || 100),
              xpToNextLevel: (updatedNft.xpToNextLevel || 100) * 1.5
            }
          }
        );
      }
      
      // Create quest history
      const questHistory = {
        userWallet: walletAddress,
        questId: id,
        questType,
        questTitle,
        energyCost: questType === 'server' ? energyCost : 0,
        rewardsXp: xpReward,
        rewardsGold: goldReward,
        completedAt: new Date()
      };
      
      // Save quest history
      await QuestHistory.create(questHistory);
      
      // Add gold to user
      await User.findOneAndUpdate(
        { walletAddress },
        { $inc: { gold: goldReward } }
      );
      
      res.json({
        success: true,
        rewards: {
          xp: xpReward,
          gold: goldReward
        },
        levelUp: updatedNft && updatedNft.xp >= (updatedNft.xpToNextLevel || 100)
      });
    } catch (error) {
      console.error("Error completing quest:", error);
      res.status(500).json({ error: "Failed to complete quest" });
    }
  });
  
  app.get("/api/users/:walletAddress/quest-history", async (req, res) => {
    try {
      const history = await QuestHistory.find({ 
        userWallet: req.params.walletAddress 
      }).sort({ completedAt: -1 }).limit(10);
      
      res.json(history);
    } catch (error) {
      console.error("Error fetching quest history:", error);
      res.status(500).json({ error: "Failed to fetch quest history" });
    }
  });

  // Add route to update NFT stats
  app.post("/api/users/:walletAddress/nft-stats/update", authenticate, async (req, res) => {
    try {
      const { walletAddress } = req.params;
      const { statsToAdd } = req.body;
      
      if (!statsToAdd) {
        return res.status(400).json({ error: "Stats to add are required" });
      }
      
      // Check if user has NFT
      const nftStats = await NFTStats.findOne({ userWallet: walletAddress });
      
      if (!nftStats) {
        return res.status(404).json({ error: "NFT not found" });
      }
      
      // Check if points are enough
      const totalPointsToAdd = Object.values(statsToAdd).reduce((sum: number, val: number) => sum + val, 0);
      
      if (totalPointsToAdd > (nftStats.statsPoints || 0)) {
        return res.status(400).json({ 
          error: "Not enough stat points",
          available: nftStats.statsPoints || 0,
          requested: totalPointsToAdd
        });
      }
      
      // Update each stat
      const updateData: any = { 
        $inc: {
          statsPoints: -totalPointsToAdd
        } 
      };
      
      for (const [stat, value] of Object.entries(statsToAdd)) {
        if (value > 0 && ['STR', 'AGI', 'VIT', 'DEX', 'INT', 'WIS', 'LUK'].includes(stat)) {
          updateData.$inc[stat] = value;
        }
      }
      
      // Perform update
      const updatedNft = await NFTStats.findOneAndUpdate(
        { userWallet: walletAddress },
        updateData,
        { new: true }
      );
      
      res.json({
        success: true,
        nftStats: updatedNft
      });
    } catch (error) {
      console.error("Error updating NFT stats:", error);
      res.status(500).json({ error: "Failed to update NFT stats" });
    }
  });

  app.post("/api/users/:walletAddress/nft-stats/update-energy", authenticate, async (req, res) => {
    try {
      const { walletAddress } = req.params;
      const { energy, energyUsed } = req.body;
      
      // Validate inputs
      if (energy === undefined && energyUsed === undefined) {
        return res.status(400).json({ error: "Either energy or energyUsed must be provided" });
      }
      
      // Get current NFT stats
      const nftStats = await NFTStats.findOne({ userWallet: walletAddress });
      
      if (!nftStats) {
        return res.status(404).json({ error: "NFT stats not found" });
      }
      
      let updateData = {};
      
      // Update by direct value or by reduction
      if (energy !== undefined) {
        updateData = { energy: energy };
      } else if (energyUsed !== undefined) {
        // Make sure not to go below 0
        const newEnergy = Math.max(0, (nftStats.energy || 0) - energyUsed);
        updateData = { energy: newEnergy };
      }
      
      // Update the NFT stats
      const updatedStats = await NFTStats.findOneAndUpdate(
        { userWallet: walletAddress },
        { $set: updateData },
        { new: true }
      );
      
      // Log for debugging
      console.log(`Updated energy for ${walletAddress}. Current energy: ${updatedStats.energy}`);
      
      res.json({
        success: true,
        nftStats: updatedStats
      });
    } catch (error) {
      console.error("Error updating NFT energy:", error);
      res.status(500).json({ error: "Failed to update NFT energy" });
    }
  });

  // Register authentication routes
  app.use('/api/auth', authRoutes);
  
  // Register quest routes
  app.use('/api/quests', questRoutes);

  app.get("/api/boss/current", async (_req, res) => {
    try {
      const boss = await Boss.findOne({ isActive: true, isDefeated: false })
        .sort({ createdAt: -1 });
      
      if (!boss) {
        return res.status(404).json({ error: "No active boss found" });
      }
      
      res.json(boss);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch current boss" });
    }
  });

  // Get boss leaderboard
  app.get("/api/boss/:bossId/leaderboard", async (req, res) => {
    try {
      const { bossId } = req.params;
      
      const leaderboard = await BossDamage.aggregate([
        { $match: { bossId: new mongoose.Types.ObjectId(bossId) } },
        { 
          $group: { 
            _id: "$userWallet", 
            totalDamage: { $sum: "$damage" },
            totalXpEarned: { $sum: "$rewardsXp" },
            totalGoldEarned: { $sum: "$rewardsGold" },
            lastAttack: { $max: "$timestamp" }
          } 
        },
        { $sort: { totalDamage: -1 } },
        { $limit: 50 }
      ]);
      
      // Get username from users table
      const walletAddresses = leaderboard.map(entry => entry._id);
      const users = await User.find({ walletAddress: { $in: walletAddresses } });
      
      const result = leaderboard.map((entry, index) => {
        const user = users.find(u => u.walletAddress === entry._id);
        return {
          rank: index + 1,
          walletAddress: entry._id,
          username: user?.username || `User-${entry._id.slice(0, 6)}`,
          totalDamage: entry.totalDamage,
          totalXpEarned: entry.totalXpEarned,
          totalGoldEarned: entry.totalGoldEarned,
          lastAttack: entry.lastAttack
        };
      });
      
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch boss leaderboard" });
    }
  });

  // API get boss attack history of user
  app.get("/api/users/:walletAddress/boss-history", async (req, res) => {
    try {
      const { walletAddress } = req.params;
      
      // Get boss attack history
      const history = await BossDamage.find({ userWallet: walletAddress })
        .sort({ timestamp: -1 })
        .limit(50);
      
      if (!history || history.length === 0) {
        return res.json([]);
      }
      
      // Get all boss ids from history
      const bossIds = new Set(history.map(entry => entry.bossId));
      
      // Get boss information
      const bosses = await Boss.find({ _id: { $in: Array.from(bossIds) } });
      
      // Map data to return
      const result = history.map(entry => {
        const boss = bosses.find(b => b._id.toString() === entry.bossId.toString());
        return {
          id: entry._id,
          bossId: entry.bossId,
          bossName: boss?.name || "Unknown Boss",
          bossLevel: boss?.level || 0,
          damage: entry.damage,
          rewardsXp: entry.rewardsXp,
          rewardsGold: entry.rewardsGold,
          battleDescription: entry.battleDescription || "",
          shortDescription: entry.shortDescription || "",
          isCritical: entry.isCritical || false,
          specialEffects: entry.specialEffects || [],
          timestamp: entry.timestamp
        };
      });
      
      // Log return data for debugging
      console.log("History data:", result.map(item => ({
        id: item.id,
        battleDescription: item.battleDescription ? 
          (item.battleDescription.length > 50 ? item.battleDescription.substring(0, 50) + '...' : item.battleDescription) 
          : 'Missing'
      })));
      
      res.json(result);
    } catch (error) {
      console.error("Error fetching boss history:", error);
      res.status(500).json({ error: "Failed to fetch boss attack history" });
    }
  });

  // API attack boss
  app.post("/api/boss/:bossId/attack", authenticate, async (req, res) => {
    try {
      const { bossId } = req.params;
      const { walletAddress, damage } = req.body;
      
      if (!walletAddress) {
        return res.status(400).json({ error: "Wallet address is required" });
      }
      const boss = await Boss.findOne({ 
        _id: bossId,
        isActive: true,
        isDefeated: false
      });
      
      if (!boss) {
        return res.status(404).json({ error: "Boss does not exist or has been defeated" });
      }
      const user = await User.findOne({ walletAddress });
      if (!user) {
        return res.status(404).json({ error: "User does not exist" });
      }
      const nftStats = await NFTStats.findOne({ userWallet: walletAddress });
      if (!nftStats) {
        return res.status(400).json({ error: "User does not have NFT" });
      }
      
      if (nftStats.level < boss.minLevelRequired) {
        return res.status(400).json({ 
          error: `You need to reach level ${boss.minLevelRequired} to fight this boss` 
        });
      }
      const energyCost = 10; 
      
      if (nftStats.energy === undefined || nftStats.energy < energyCost) {
        return res.status(400).json({ 
          error: `Not enough energy. Need ${energyCost} energy to attack boss`,
          currentEnergy: nftStats.energy || 0,
          requiredEnergy: energyCost
        });
      }
      const attackCost = 100; 
      
      if (user.gold === undefined || user.gold < attackCost) {
        return res.status(400).json({ 
          error: `Not enough gold to attack. Need ${attackCost} gold` 
        });
      }
      
      await User.updateOne(
        { walletAddress },
        { $inc: { gold: -attackCost } }
      );
      
      await NFTStats.updateOne(
        { userWallet: walletAddress },
        { $inc: { energy: -energyCost } }
      );
      
      if (!process.env.OPENAI_API_KEY) {
        return res.status(500).json({ error: "Server configuration error" });
      }
      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });
      
      const prompt = `
Describe a dramatic and creative battle between a player and a boss in an RPG game based on the following information.:

PLAYER INFORMATION:
- Name: ${user.username || "Warrior"}
- Level: ${nftStats.level}
- Strength (STR): ${nftStats.STR || 0}
- Agility (AGI): ${nftStats.AGI || 0}
- Vitality (VIT): ${nftStats.VIT || 0}
- Dexterity (DEX): ${nftStats.DEX || 0}
- Intelligence (INT): ${nftStats.INT || 0}
- Wisdom (WIS): ${nftStats.WIS || 0}
- Luck (LUK): ${nftStats.LUK || 0}

BOSS INFORMATION:
- Name: ${boss.name}
- Description: ${boss.description}
- Level: ${boss.level}
- Current health: ${boss.health}/${boss.maxHealth}
- Strength (STR): ${boss.STR}
- Agility (AGI): ${boss.AGI}
- Vitality (VIT): ${boss.VIT}
- Dexterity (DEX): ${boss.DEX}
- Intelligence (INT): ${boss.INT}
- Abilities: ${boss.abilities ? boss.abilities.join(", ") : "None"}
- Weaknesses: ${boss.weaknesses ? boss.weaknesses.join(", ") : "None"}
- Immunities: ${boss.immunities ? boss.immunities.join(", ") : "None"}

Describe the battle in detail with a heroic, dramatic tone.
Calculate the appropriate amount of damage the player can deal to the boss based on their stats.

Return the result in JSON format:
{
  "battleDescription": "Battle detail",
  "shortDescription": "Short description (max 50 characters)",
  "damage": <damage>,
  "isCritical": true/false,
  "specialEffects": ["special effects if any"]
} `;
      
      try {
        const completion = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            { 
              role: "system", 
              content: "You are a game master describing battles in an RPG game in a detailed and dramatic way. Please return the result in the exact JSON format as requested." 
            },
            { 
              role: "user", 
              content: prompt 
            }
          ],
          response_format: { type: "json_object" },
          temperature: 0.7,
        });
        const battleResult = JSON.parse(completion.choices[0].message.content.trim());
        const damage = battleResult.damage;
        const damagePercent = (damage / boss.maxHealth) * 100;
        const rewardsXp = Math.round(boss.rewardsXp * damagePercent);
        const rewardsGold = Math.round(boss.rewardsGold * damagePercent);
        const bossDamage = new BossDamage({
          userWallet: walletAddress,
          bossId: boss._id,
          damage,
          rewardsXp,
          rewardsGold,
          battleDescription: battleResult.battleDescription,
          isCritical: battleResult.isCritical,
          specialEffects: battleResult.specialEffects || []
        });
        
        await bossDamage.save();
        boss.health = Math.max(0, boss.health - damage);
        if (boss.health <= 0) {
          boss.isDefeated = true;
          boss.defeatDate = new Date();
        }
        
        await boss.save();
        await User.updateOne(
          { walletAddress },
          { $inc: { xp: rewardsXp, gold: rewardsGold } } 
        );
        const updatedNFTStats = await NFTStats.findOne({ userWallet: walletAddress });
        let levelUp = false;
        
        if (updatedNFTStats && updatedNFTStats.xp >= updatedNFTStats.xpToNextLevel) {
          const xpRemainder = updatedNFTStats.xp - updatedNFTStats.xpToNextLevel;
          const newLevel = updatedNFTStats.level + 1;
          const newXpToNextLevel = 100 * Math.pow(1.5, newLevel - 1);
          
          await NFTStats.updateOne(
            { userWallet: walletAddress },
            { 
              $set: { 
                level: newLevel,
                xp: xpRemainder,
                xpToNextLevel: newXpToNextLevel,
                statsPoints: (updatedNFTStats.statsPoints || 0) + 5
              }
            }
          );
          
          levelUp = true;
        }
        res.json({
          ...battleResult,
          rewardsXp,
          rewardsGold,
          netGold: rewardsGold - attackCost,
          bossHealth: boss.health,
          bossMaxHealth: boss.maxHealth,
          bossDefeated: boss.health <= 0,
          levelUp
        });
        
      } catch (openaiError) {
        console.error("OpenAI API error:", openaiError);
        
        const baseDamage = 20 + (nftStats.level * 5);
        const strBonus = (nftStats.STR || 0) * 2;
        const agiBonus = (nftStats.AGI || 0) * 1.5;
        const isCritical = Math.random() < 0.2;
        
        let damage = baseDamage + strBonus + agiBonus;
        if (isCritical) damage *= 2;
        damage = Math.floor(damage);
        const damagePercent = damage / boss.maxHealth;
        const rewardsXp = Math.round(boss.rewardsXp * damagePercent);
        const rewardsGold = Math.round(boss.rewardsGold * damagePercent);
        const battleDescription = isCritical
          ? `${user.username || "You"} unleashed a critical attack on ${boss.name}, dealing ${damage} damage! The enemy staggered back, blood seeping from the deep wounds. Your attack was too powerful for ${boss.name} to react in time.`
          : `${user.username || "You"} attacked ${boss.name}, dealing ${damage} damage! Your quick and precise attack made the enemy stagger back. ${boss.name} let out a painful groan before preparing to counterattack.`;
        
        const shortDescription = isCritical
          ? `Critical hit! Caused ${damage} damage.`
          : `Successful attack! Caused ${damage} damage.`;
        
        const bossDamage = new BossDamage({
          userWallet: walletAddress,
          bossId: boss._id,
          damage,
          rewardsXp,
          rewardsGold,
          battleDescription,
          isCritical,
          specialEffects: []
        });
        
        await bossDamage.save();
        boss.health = Math.max(0, boss.health - damage);
        if (boss.health <= 0) {
          boss.isDefeated = true;
          boss.defeatDate = new Date();
        }
        
        await boss.save();
        await User.updateOne(
          { walletAddress },
          { $inc: { xp: rewardsXp, gold: rewardsGold } }
        );
        const updatedNFTStats = await NFTStats.findOne({ userWallet: walletAddress });
        let levelUp = false;
        
        if (updatedNFTStats && updatedNFTStats.xp >= updatedNFTStats.xpToNextLevel) {
          const xpRemainder = updatedNFTStats.xp - updatedNFTStats.xpToNextLevel;
          const newLevel = updatedNFTStats.level + 1;
          const newXpToNextLevel = 100 * Math.pow(1.5, newLevel - 1);
          
          await NFTStats.updateOne(
            { userWallet: walletAddress },
            { 
              $set: { 
                level: newLevel,
                xp: xpRemainder,
                xpToNextLevel: newXpToNextLevel,
                statsPoints: (updatedNFTStats.statsPoints || 0) + 5
              }
            }
          );
          
          levelUp = true;
        }
        res.json({
          battleDescription,
          shortDescription,
          damage,
          isCritical,
          specialEffects: [],
          rewardsXp,
          rewardsGold,
          netGold: rewardsGold - attackCost,
          bossHealth: boss.health,
          bossMaxHealth: boss.maxHealth,
          bossDefeated: boss.health <= 0,
          levelUp
        });
      }
      
    } catch (error) {
      console.error("Attack boss error:", error);
      res.status(500).json({ error: "Error attacking boss" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}