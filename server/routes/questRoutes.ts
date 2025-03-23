import express from 'express';
import { authenticate } from '../middleware/authMiddleware';
import Quest from '../models/Quest';
import { QuestHistory } from '../models/QuestHistory';
import { User } from '../models/User';
import { NFTStats } from '../models/NFTStats';
import { v4 as uuidv4 } from 'uuid';
import OpenAI from 'openai';
import { QuestActivity } from '../models/QuestActivity';

// Interface for User model
interface UserType {
  walletAddress: string;
  profile?: Record<string, any>;
  [key: string]: any;
}

// Interface for QuestHistory model
interface QuestHistoryType {
  userWallet: string;
  questId: string;
  questType: string;
  questTitle: string;
  [key: string]: any;
}

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '', // Use your environment variable
});

const router = express.Router();

// Get all server quests
router.get('/server', authenticate, async (req, res) => {
  try {
    const walletAddress = req.query.walletAddress as string;
    
    // Validate wallet address
    if (!walletAddress) {
      return res.status(400).json({ error: 'Wallet address is required' });
    }
    
    // Get user's NFT stats to check level
    const nftStats = await NFTStats.findOne({ userWallet: walletAddress });
    const userLevel = nftStats?.level || 0;
    
    // Get quests that haven't expired and match the user's level
    const quests = await Quest.find({
      type: 'server',
      expiresAt: { $gt: new Date() },
      requiredLevel: { $lte: userLevel }
    });
    
    // Get completed quests for this user
    const completedQuestIds = await QuestHistory.find({
      userWallet: walletAddress,
      questType: 'server'
    }).distinct('questId');
    
    // Format and return quests
    const formattedQuests = quests.map(quest => ({
      id: quest.questId,
      title: quest.title,
      description: quest.description,
      category: quest.category,
      difficulty: quest.difficulty,
      objective: quest.objective,
      target: quest.target,
      unit: quest.unit,
      rewards: {
        xp: quest.rewards?.xp || 0,
        gold: quest.rewards?.gold || 0,
        items: quest.rewards?.items || []
      },
      energyCost: quest.energyCost,
      completed: completedQuestIds.includes(quest.questId),
      expiresAt: quest.expiresAt,
      timeLeft: Math.max(0, Math.floor((quest.expiresAt.getTime() - Date.now()) / 1000)),
      locked: false // Server quests are available to all users
    }));
    
    res.json(formattedQuests);
  } catch (error) {
    console.error('Error fetching server quests:', error);
    res.status(500).json({ error: 'Failed to fetch server quests' });
  }
});

// Get personal quests for a user
router.get('/personal', authenticate, async (req, res) => {
  try {
    const walletAddress = req.query.walletAddress as string;
    
    // Validate wallet address
    if (!walletAddress) {
      return res.status(400).json({ error: 'Wallet address is required' });
    }
    
    // Get user's personal quests that haven't expired
    const quests = await Quest.find({
      type: 'personal',
      userWallet: walletAddress, // Changed from targetWallet to userWallet to match schema
      expiresAt: { $gt: new Date() }
    });
    
    // Get completed quests for this user
    const completedQuestIds = await QuestHistory.find({
      userWallet: walletAddress,
      questType: 'personal'
    }).distinct('questId');
    
    // Format and return quests
    const formattedQuests = quests.map(quest => ({
      id: quest.questId,
      title: quest.title,
      description: quest.description,
      category: quest.category,
      difficulty: quest.difficulty,
      objective: quest.objective,
      target: quest.target,
      unit: quest.unit,
      rewards: {
        xp: quest.rewards?.xp || 0,
        gold: quest.rewards?.gold || 0,
        items: quest.rewards?.items || []
      },
      energyCost: 0, // Personal quests don't consume energy
      completed: completedQuestIds.includes(quest.questId),
      expiresAt: quest.expiresAt,
      timeLeft: Math.max(0, Math.floor((quest.expiresAt.getTime() - Date.now()) / 1000)),
      locked: false
    }));
    
    res.json(formattedQuests);
  } catch (error) {
    console.error('Error fetching personal quests:', error);
    res.status(500).json({ error: 'Failed to fetch personal quests' });
  }
});

// Route for generating a personal quest
// @route POST /api/quests/personal
// @access Private
router.post('/personal', authenticate, async (req, res) => {
  try {
    const { walletAddress } = req.body;
    
    // Validate wallet address
    if (!walletAddress) {
      return res.status(400).json({ error: 'Wallet address is required' });
    }
    
    // Check if user has energy
    const nftStats = await NFTStats.findOne({ userWallet: walletAddress });
    if (!nftStats || nftStats.energy < 25) {
      return res.status(400).json({ 
        error: 'Not enough energy to generate a personal quest', 
        currentEnergy: nftStats?.energy || 0
      });
    }
    
    // Check if user already has an active quest
    const activeQuest = await Quest.findOne({ 
      type: 'personal',
      userWallet: walletAddress, // Changed from targetWallet to userWallet
      active: true
    });
    
    if (activeQuest) {
      return res.status(400).json({ 
        error: 'You already have an active quest. Complete it before starting a new one.',
        activeQuestId: activeQuest.questId
      });
    }
    
    // Check if user already has 5 personal quests
    const personalQuestCount = await Quest.countDocuments({
      type: 'personal',
      userWallet: walletAddress, // Changed from targetWallet to userWallet
      completed: false
    });
    
    if (personalQuestCount >= 5) {
      return res.status(400).json({ error: 'You already have 5 personal quests. Complete or wait for some to expire before generating more.' });
    }
    
    // Get user activity history for context
    const activityHistory = await QuestHistory.find({ 
      userWallet: walletAddress,
      questType: 'personal'
    })
      .sort({ completedAt: -1 })
      .limit(10);
    
    // Get user profile for personalization
    const user = await User.findOne({ walletAddress });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Generate personal quest with AI
    const personalQuest = await generatePersonalQuest(user as UserType, activityHistory as QuestHistoryType[]);
    
    // Deduct energy cost
    await NFTStats.updateOne(
      { userWallet: walletAddress },
      { $inc: { energy: -25 } }
    );
    
    // Create quest with 1 hour expiration instead of 24 hours
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
    
    const newQuest = new Quest({
      questId: uuidv4(),
      userId: user._id,
      userWallet: walletAddress,
      type: 'personal',
      title: personalQuest.title,
      description: personalQuest.description,
      category: personalQuest.category,
      difficulty: personalQuest.difficulty,
      objective: personalQuest.objective,
      target: personalQuest.target,
      unit: personalQuest.unit,
      rewards: personalQuest.rewards,
      energyCost: 25, // Set energy cost to 25
      completionCriteria: personalQuest.completionCriteria || 'manual',
      completionInstructions: personalQuest.completionInstructions || '',
      expiresAt,
      estimatedTime: personalQuest.estimatedTime || 30
    });
    
    await newQuest.save();
    
    // Get updated NFT stats
    const updatedNftStats = await NFTStats.findOne({ userWallet: walletAddress });
    
    res.json({
      success: true,
      quest: {
        id: newQuest.questId,
        title: newQuest.title,
        description: newQuest.description,
        category: newQuest.category,
        difficulty: newQuest.difficulty,
        objective: newQuest.objective,
        target: newQuest.target,
        unit: newQuest.unit,
        progress: 0,
        rewards: newQuest.rewards,
        energyCost: 25,
        expiresAt: newQuest.expiresAt,
        estimatedTime: newQuest.estimatedTime,
        type: 'personal'
      },
      currentEnergy: updatedNftStats?.energy || 0
    });
  } catch (error) {
    console.error('Error generating personal quest:', error);
    res.status(500).json({ error: 'Failed to generate personal quest' });
  }
});

// Generate server quests
router.post('/generate-server', authenticate, async (req, res) => {
  try {
    // Optional: Check if user has admin permissions
    
    // Generate AI server quests
    const serverQuests = await generateServerQuests();
    
    // Calculate expiration date (14 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 14);
    
    // Create quests in database
    const createdQuests = await Promise.all(
      serverQuests.map(async (quest: {
        title: string;
        description: string;
        category: string;
        difficulty: string;
        objective: string;
        target: number;
        unit: string;
        energyCost?: number;
        requiredLevel?: number;
        rewards: {
          xp: number;
          gold: number;
          items?: string[];
        };
        completionCriteria?: string;
        completionInstructions?: string;
      }) => {
        return await Quest.create({
          questId: uuidv4(),
          userId: 'server', // Server ID
          userWallet: 'server', // Server wallet
          type: 'server',
          title: quest.title,
          description: quest.description,
          category: quest.category,
          difficulty: quest.difficulty,
          objective: quest.objective,
          target: quest.target,
          unit: quest.unit,
          expiresAt,
          energyCost: quest.energyCost || 5,
          requiredLevel: quest.requiredLevel || 0,
          rewards: {
            xp: quest.rewards?.xp || 0,
            gold: quest.rewards?.gold || 0,
            items: quest.rewards?.items || []
          },
          aiGenerated: true,
          completionCriteria: quest.completionCriteria || 'manual',
          completionInstructions: quest.completionInstructions || ''
        });
      })
    );
    
    res.json({
      success: true,
      quests: createdQuests.map(quest => ({
        id: quest.questId,
        title: quest.title,
        description: quest.description,
        category: quest.category,
        difficulty: quest.difficulty,
        objective: quest.objective,
        rewards: quest.rewards
      }))
    });
  } catch (error) {
    console.error('Error generating server quests:', error);
    res.status(500).json({ error: 'Failed to generate server quests' });
  }
});

// Complete a quest
router.post('/:questId/complete', authenticate, async (req, res) => {
  try {
    const { questId } = req.params;
    const { walletAddress } = req.body;
    
    // Validate inputs
    if (!walletAddress) {
      return res.status(400).json({ error: 'Wallet address is required' });
    }
    
    // Find the quest
    const quest = await Quest.findOne({ questId });
    if (!quest) {
      return res.status(404).json({ error: 'Quest not found' });
    }
    
    // Check if quest is expired
    if (quest.expiresAt < new Date()) {
      return res.status(400).json({ error: 'Quest has expired' });
    }
    
    // Check if user is authorized to complete this quest
    if (quest.type === 'personal' && quest.userWallet !== walletAddress) {
      return res.status(403).json({ error: 'Not authorized to complete this quest' });
    }
    
    // Check if user has already completed this quest
    const existingCompletion = await QuestHistory.findOne({
      userWallet: walletAddress,
      questId
    });
    
    if (existingCompletion) {
      return res.status(400).json({ error: 'Quest already completed' });
    }
    
    // For server quests, check energy
    if (quest.type === 'server' && quest.energyCost > 0) {
      const nftStats = await NFTStats.findOne({ userWallet: walletAddress });
      
      if (!nftStats) {
        return res.status(400).json({ error: 'User does not have NFT stats' });
      }
      
      if ((nftStats.energy || 0) < quest.energyCost) {
        return res.status(400).json({ 
          error: 'Not enough energy',
          currentEnergy: nftStats.energy || 0,
          requiredEnergy: quest.energyCost
        });
      }
      
      // Deduct energy
      await NFTStats.updateOne(
        { userWallet: walletAddress },
        { $inc: { energy: -quest.energyCost } }
      );
    }
    
    // Create quest history record
    await QuestHistory.create({
      userWallet: walletAddress,
      questId: quest.questId,
      questType: quest.type,
      questTitle: quest.title,
      energyCost: quest.type === 'server' ? quest.energyCost : 0,
      rewardsXp: quest.rewards?.xp || 0,
      rewardsGold: quest.rewards?.gold || 0,
      rewardsItems: quest.rewards?.items || [],
      completedAt: new Date()
    });
    
    // Add XP to NFT stats
    let levelUp = false;
    if (quest.rewards?.xp && quest.rewards.xp > 0) {
      const nftStats = await NFTStats.findOne({ userWallet: walletAddress });
      
      if (nftStats) {
        // Update XP
        await NFTStats.updateOne(
          { userWallet: walletAddress },
          { $inc: { xp: quest.rewards.xp } }
        );
        
        // Check level up
        const updatedNft = await NFTStats.findOne({ userWallet: walletAddress });
        if (updatedNft && updatedNft.xp >= (updatedNft.xpToNextLevel || 100)) {
          await NFTStats.updateOne(
            { userWallet: walletAddress },
            { 
              $inc: { level: 1, statsPoints: 3 },
              $set: { 
                xp: updatedNft.xp - (updatedNft.xpToNextLevel || 100),
                xpToNextLevel: Math.floor((updatedNft.xpToNextLevel || 100) * 1.5)
              }
            }
          );
          levelUp = true;
        }
      }
    }
    
    // Add gold to user
    if (quest.rewards?.gold && quest.rewards.gold > 0) {
      await User.updateOne(
        { walletAddress },
        { $inc: { gold: quest.rewards.gold } }
      );
    }
    
    // TODO: Handle item rewards if needed
    
    // Get final updated NFT stats
    const finalNftStats = await NFTStats.findOne({ userWallet: walletAddress });
    
    res.json({
      success: true,
      questId: quest.questId,
      rewards: {
        xp: quest.rewards?.xp || 0,
        gold: quest.rewards?.gold || 0,
        items: quest.rewards?.items || []
      },
      levelUp,
      currentEnergy: finalNftStats?.energy || 0
    });
  } catch (error) {
    console.error('Error completing quest:', error);
    res.status(500).json({ error: 'Failed to complete quest' });
  }
});

// Route for starting a quest
// @route PUT /api/quests/:questId/start
// @access Private
router.put('/:questId/start', authenticate, async (req, res) => {
  try {
    const { questId } = req.params;
    const { walletAddress } = req.body || { walletAddress: '' };
    
    // Check if user already has an active quest
    const activeQuest = await Quest.findOne({ 
      userWallet: walletAddress,
      active: true
    });
    
    if (activeQuest) {
      return res.status(400).json({ 
        error: 'You already have an active quest. Complete it before starting a new one.',
        activeQuestId: activeQuest.questId
      });
    }
    
    // Find the quest to start
    const quest = await Quest.findOne({ questId, userWallet: walletAddress });
    
    if (!quest) {
      return res.status(404).json({ error: 'Quest not found' });
    }
    
    if (quest.completed) {
      return res.status(400).json({ error: 'This quest is already completed' });
    }
    
    if (quest.active) {
      return res.status(400).json({ error: 'This quest is already active' });
    }
    
    // Mark quest as active and set startedAt time
    quest.active = true;
    quest.startedAt = new Date();
    await quest.save();
    
    // Return updated quest
    res.json({
      success: true,
      quest: {
        id: quest.questId,
        title: quest.title,
        description: quest.description,
        category: quest.category,
        difficulty: quest.difficulty,
        objective: quest.objective,
        target: quest.target,
        unit: quest.unit,
        progress: quest.progress,
        rewards: quest.rewards,
        energyCost: quest.energyCost,
        expiresAt: quest.expiresAt,
        estimatedTime: quest.estimatedTime,
        active: true,
        startedAt: quest.startedAt,
        type: quest.type
      }
    });
  } catch (error) {
    console.error('Error starting quest:', error);
    res.status(500).json({ error: 'Failed to start quest' });
  }
});

// Route for completing an active quest
// @route PUT /api/quests/:questId/complete-active
// @access Private
router.put('/:questId/complete-active', authenticate, async (req, res) => {
  try {
    const { questId } = req.params;
    const { walletAddress } = req.body || { walletAddress: '' };
    
    // Find the active quest
    const quest = await Quest.findOne({ 
      questId, 
      userWallet: walletAddress,
      active: true 
    });
    
    if (!quest) {
      return res.status(404).json({ error: 'Active quest not found' });
    }
    
    if (quest.completed) {
      return res.status(400).json({ error: 'This quest is already completed' });
    }
    
    // Verify the quest has been active for at least the estimated time
    const startTime = new Date(quest.startedAt || Date.now()).getTime();
    const estimatedEndTime = startTime + ((quest.estimatedTime || 30) * 60 * 1000);
    const currentTime = Date.now();
    
    if (currentTime < estimatedEndTime) {
      // Allow completion if at least 80% of the estimated time has passed
      const timePassedPercent = (currentTime - startTime) / (estimatedEndTime - startTime) * 100;
      
      if (timePassedPercent < 80) {
        const remainingSeconds = Math.ceil((estimatedEndTime - currentTime) / 1000);
        return res.status(400).json({ 
          error: 'Quest cannot be completed yet', 
          remainingTime: remainingSeconds 
        });
      }
    }
    
    // Mark quest as completed
    quest.completed = true;
    quest.completedAt = new Date();
    quest.active = false;
    quest.progress = quest.target; // Set progress to target
    await quest.save();
    
    // Record quest activity
    await QuestActivity.create({
      userWallet: walletAddress,
      questId: quest.questId,
      questType: quest.type,
      questTitle: quest.title,
      energyCost: quest.energyCost,
      rewardsXp: quest.rewards?.xp || 0,
      rewardsGold: quest.rewards?.gold || 0,
      rewardsItems: quest.rewards?.items || [],
      completedAt: new Date()
    });
    
    // Add XP to NFT stats
    let levelUp = false;
    if (quest.rewards?.xp && quest.rewards.xp > 0) {
      const nftStats = await NFTStats.findOne({ userWallet: walletAddress });
      
      if (nftStats) {
        // Update XP
        await NFTStats.updateOne(
          { userWallet: walletAddress },
          { $inc: { xp: quest.rewards.xp } }
        );
        
        // Check level up
        const updatedNft = await NFTStats.findOne({ userWallet: walletAddress });
        if (updatedNft && updatedNft.xp >= (updatedNft.xpToNextLevel || 100)) {
          await NFTStats.updateOne(
            { userWallet: walletAddress },
            { 
              $inc: { level: 1, statsPoints: 3 },
              $set: { 
                xp: updatedNft.xp - (updatedNft.xpToNextLevel || 100),
                xpToNextLevel: Math.floor((updatedNft.xpToNextLevel || 100) * 1.5)
              }
            }
          );
          levelUp = true;
        }
      }
    }
    
    // Add gold to user
    if (quest.rewards?.gold && quest.rewards.gold > 0) {
      await User.updateOne(
        { walletAddress },
        { $inc: { gold: quest.rewards.gold } }
      );
    }
    
    // Get final updated NFT stats
    const finalNftStats = await NFTStats.findOne({ userWallet: walletAddress });
    
    res.json({
      success: true,
      questId: quest.questId,
      rewards: {
        xp: quest.rewards?.xp || 0,
        gold: quest.rewards?.gold || 0,
        items: quest.rewards?.items || []
      },
      levelUp,
      currentEnergy: finalNftStats?.energy || 0
    });
  } catch (error) {
    console.error('Error completing active quest:', error);
    res.status(500).json({ error: 'Failed to complete quest' });
  }
});

// AI QUEST GENERATION FUNCTIONS
async function generatePersonalQuest(user: UserType, activityHistory: QuestHistoryType[]) {
  try {
    // Summarize recent activity for the prompt
    const recentActivities = activityHistory.map(h => h.questTitle).join(', ');
    
    // Prepare profile data for the prompt
    const profile = user.profile || {};
    
    const prompt = `
      Create a personalized fitness quest based on this user's profile:
      - Age: ${profile.age || 'unknown'}
      - Gender: ${profile.gender || 'unknown'}
      - Height: ${profile.height || 'unknown'}cm
      - Weight: ${profile.weight || 'unknown'}kg
      - Fitness Goal: ${profile.fitnessGoal || 'general fitness'}
      - Experience Level: ${profile.experience || 'beginner'}
      - Medical Conditions: ${profile.medicalConditions || 'none'}
      - Injuries: ${profile.injuries?.join(', ') || 'none'}
      - Preferred Activities: ${profile.preferredActivities?.join(', ') || 'variety'}
      - Activity Level: ${profile.activityLevel || 'moderate'}
      - Workout Frequency: ${profile.workoutFrequency?.sessionsPerWeek || 3} sessions per week, ${profile.workoutFrequency?.minutesPerSession || 30} minutes per session
      - Available Equipment: ${profile.equipment?.join(', ') || 'minimal equipment'}
      - Recent Completed Quests: ${recentActivities || 'none'}
      
      Create a quest with these components:
      1. A short, motivating title
      2. A detailed description explaining the benefits
      3. A specific objective with a numerical target
      4. One of these categories: strength, cardio, flexibility, nutrition, mental, daily
      5. An appropriate difficulty level (easy, medium, hard) based on experience
      6. Appropriate measurement units
      7. Challenging but realistic targets
      8. Instructions for completing the quest
      9. Estimated completion time in minutes (between 10 to 60 minutes)
      
      The quest should be tailored to the user's fitness goals, health conditions, and preferences.
      Return the quest in JSON format with these fields:
      {
        "title": "",
        "description": "",
        "category": "",
        "difficulty": "",
        "objective": "",
        "target": 0,
        "unit": "",
        "estimatedTime": 0,
        "rewards": {
          "xp": 0,
          "gold": 0,
          "items": []
        },
        "completionCriteria": "",
        "completionInstructions": ""
      }
      
      Rewards should scale with difficulty: easy (50-100 XP, 50-100 gold), medium (100-150 XP, 100-150 gold), hard (150-250 XP, 150-250 gold).
      Estimated time should be realistic and proportional to the difficulty of the quest (e.g., easy: 10-20 minutes, medium: 20-40 minutes, hard: 30-60 minutes).
    `;
    
    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: "gpt-4o", // or another appropriate model
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });
    
    // Handle the possibility of null content
    const content = completion.choices[0].message.content || '{"title":"Daily Fitness","description":"A basic fitness activity","category":"daily","difficulty":"easy","objective":"Complete physical activity","target":30,"unit":"minutes","estimatedTime":30,"rewards":{"xp":50,"gold":50,"items":[]},"completionCriteria":"manual","completionInstructions":"Mark as complete when done."}';
    
    const questData = JSON.parse(content);
    
    // Set default estimated time if not provided
    if (!questData.estimatedTime || questData.estimatedTime < 10 || questData.estimatedTime > 60) {
      questData.estimatedTime = questData.difficulty === 'easy' ? 15 : 
                               questData.difficulty === 'medium' ? 30 : 45;
    }
    
    return questData;
  } catch (error) {
    console.error('Error generating personal quest with AI:', error);
    
    // Return fallback quest if AI generation fails
    return {
      title: "Daily Movement Challenge",
      description: "Get your body moving with this personalized activity challenge tailored to your fitness level.",
      category: "daily",
      difficulty: "easy",
      objective: "Complete minutes of physical activity",
      target: 30,
      unit: "minutes",
      estimatedTime: 15,
      rewards: {
        xp: 75,
        gold: 75
      },
      completionCriteria: "manual",
      completionInstructions: "After completing your activity, come back and mark this quest complete."
    };
  }
}

async function generateServerQuests() {
  try {
    const prompt = `
      Create 5 diverse fitness quests for a community fitness app.
      Include a mix of different categories (strength, cardio, flexibility, nutrition, mental, daily)
      and difficulties (easy, medium, hard).
      
      Each quest should have:
      1. An engaging title
      2. A detailed description explaining what to do and benefits
      3. A clear objective with specific metrics
      4. Appropriate difficulty rating
      5. Realistic target numbers
      6. Instructions for completion
      
      Return the quests as a JSON array with these fields for each quest:
      {
        "title": "",
        "description": "",
        "category": "",
        "difficulty": "",
        "objective": "",
        "target": 0,
        "unit": "",
        "energyCost": 0,
        "requiredLevel": 0,
        "rewards": {
          "xp": 0,
          "gold": 0,
          "items": []
        },
        "completionCriteria": "",
        "completionInstructions": ""
      }
      
      Energy costs should vary by difficulty: easy (3-5), medium (5-8), hard (8-10).
      Rewards should scale with difficulty: easy (50-100 XP, 50-100 gold), medium (100-150 XP, 100-150 gold), hard (150-250 XP, 150-250 gold).
      Required levels should be: easy (0), medium (3), hard (5+).
    `;
    
    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: "gpt-4o", // or another appropriate model
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });
    
    // Handle the possibility of null content
    const content = completion.choices[0].message.content || '{"quests":[{"title":"Community Steps Challenge","description":"Join the community in tracking daily steps to promote movement and cardiovascular health.","category":"cardio","difficulty":"easy","objective":"Walk a total of steps","target":10000,"unit":"steps","energyCost":3,"requiredLevel":0,"rewards":{"xp":75,"gold":75,"items":[]},"completionCriteria":"manual","completionInstructions":"Track your steps with any fitness device or app and report your total."}]}';
    
    const questsData = JSON.parse(content);
    
    // Validate and return quests
    if (Array.isArray(questsData.quests)) {
      return questsData.quests;
    } else {
      throw new Error('AI did not return a valid array of quests');
    }
  } catch (error) {
    console.error('Error generating server quests with AI:', error);
    
    // Return fallback quests if AI generation fails
    return [
      {
        title: "Community Steps Challenge",
        description: "Join the community in tracking daily steps to promote movement and cardiovascular health.",
        category: "cardio",
        difficulty: "easy",
        objective: "Walk a total of steps",
        target: 10000,
        unit: "steps",
        energyCost: 3,
        requiredLevel: 0,
        rewards: {
          xp: 75,
          gold: 75,
          items: []
        },
        completionCriteria: "manual",
        completionInstructions: "Track your steps with any fitness device or app and report your total."
      },
      {
        title: "Strength Foundation",
        description: "Build fundamental strength with this bodyweight exercise challenge.",
        category: "strength",
        difficulty: "medium",
        objective: "Complete bodyweight exercise reps",
        target: 100,
        unit: "reps",
        energyCost: 6,
        requiredLevel: 3,
        rewards: {
          xp: 125,
          gold: 125,
          items: []
        },
        completionCriteria: "manual",
        completionInstructions: "Complete any combination of bodyweight exercises totaling 100 reps."
      },
      {
        title: "Mindfulness Minutes",
        description: "Improve mental clarity and reduce stress with dedicated mindfulness practice.",
        category: "mental",
        difficulty: "easy",
        objective: "Practice mindfulness meditation",
        target: 15,
        unit: "minutes",
        energyCost: 2,
        requiredLevel: 0,
        rewards: {
          xp: 60,
          gold: 60,
          items: []
        },
        completionCriteria: "manual",
        completionInstructions: "Sit quietly and focus on your breath for 15 minutes total."
      }
    ];
  }
}

export default router; 