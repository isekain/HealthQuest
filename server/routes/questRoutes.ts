import express from 'express';
import { authenticate } from '../middleware/authMiddleware';
import Quest from '../models/Quest';
import { QuestHistory } from '../models/QuestHistory';
import { User } from '../models/User';
import { NFTStats } from '../models/NFTStats';
import { v4 as uuidv4 } from 'uuid';
import OpenAI from 'openai';
import { QuestActivity } from '../models/QuestActivity';
import dotenv from 'dotenv';
dotenv.config();
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

interface Exercise {
  name?: string;
  time?: string;
  description?: string;
}

interface WorkoutSection {
  section?: string;
  duration?: number;
  exercises?: Exercise[];
}

// Initialize OpenAI client
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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
    const formattedQuests = quests.map(quest => {
      console.log('Quest workoutDetails:', quest.workoutDetails);
      return {
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
        locked: false, // Server quests are available to all users
        type: 'server',
        active: quest.active || false,
        startedAt: quest.startedAt || null,
        estimatedTime: quest.estimatedTime || 30,
        completionCriteria: quest.completionCriteria || 'manual',
        completionInstructions: quest.completionInstructions || '',
        workoutDetails: quest.workoutDetails || []
      };
    });
    
    console.log('Formatted quests:', formattedQuests);
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
      expiresAt: { $gt: new Date() },
      completed: false // Chỉ lấy những quest chưa hoàn thành
    });
    
   
    
    // Format and return quests
    const formattedQuests = quests.map(quest => {
      console.log('Quest workoutDetails:', quest.workoutDetails);
      return {
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
        completed: false,
        active: quest.active || false,
        startedAt: quest.startedAt || null,
      expiresAt: quest.expiresAt,
      timeLeft: Math.max(0, Math.floor((quest.expiresAt.getTime() - Date.now()) / 1000)),
        estimatedTime: quest.estimatedTime || 30,
        completionCriteria: quest.completionCriteria || 'manual',
        completionInstructions: quest.completionInstructions || '',
        workoutDetails: quest.workoutDetails || [],
        locked: false,
        type: 'personal'
      };
    });
    
    console.log('Formatted quests:', formattedQuests);
    res.json(formattedQuests);
  } catch (error) {
    console.error('Error fetching personal quests:', error);
    res.status(500).json({ error: 'Failed to fetch personal quests' });
  }
});

router.post('/personal', authenticate, async (req, res) => {
  try {
    const { walletAddress } = req.body;
    if (!walletAddress) {
      return res.status(400).json({ error: 'Wallet address is required' });
    }
    
    // Lấy user và năng lượng
    const [user, nftStats] = await Promise.all([
      User.findOne({ walletAddress }),
      NFTStats.findOne({ userWallet: walletAddress })
    ]);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!nftStats || nftStats.energy < 25) {
      return res.status(400).json({ 
        error: 'Not enough energy to generate a personal quest', 
        currentEnergy: nftStats?.energy || 0
      });
    }
    
    // Call AI to create quest
    const personalQuest = await generatePersonalQuest(user as UserType, []);
    if (!personalQuest) {
      return res.status(500).json({ error: 'Failed to generate quest information' });
    }

    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    // Ensure completionCriteria is always valid
    const validCompletionCriteria = ['manual', 'automatic', 'verification'];
    if (!validCompletionCriteria.includes(personalQuest.completionCriteria)) {
      personalQuest.completionCriteria = 'manual';
    }

    // Ensure completionInstructions has a value
    if (!personalQuest.completionInstructions || personalQuest.completionInstructions.trim() === '') {
      personalQuest.completionInstructions = `Complete ${personalQuest.target} ${personalQuest.unit} of ${personalQuest.objective.toLowerCase()}`;
    }

    // Save quest to MongoDB
    const newQuest = await Quest.create({
      questId: uuidv4(),
      userWallet: walletAddress,
      type: 'personal',
      title: personalQuest.title,
      description: personalQuest.description,
      category: personalQuest.category,
      difficulty: personalQuest.difficulty,
      objective: personalQuest.objective,
      target: personalQuest.target,
      unit: personalQuest.unit,
      expiresAt,
      energyCost: 0, 
      estimatedTime: personalQuest.estimatedTime || 30,
      rewards: {
        xp: personalQuest.rewards.xp,
        gold: personalQuest.rewards.gold,
        items: personalQuest.rewards.items || []
      },
      completionCriteria: personalQuest.completionCriteria,
      completionInstructions: personalQuest.completionInstructions,
      workoutDetails: personalQuest.workoutDetails || [],
      aiGenerated: true,
      active: false,
      completed: false
    });

    // Update user's energy
    nftStats.energy -= 25;
    await nftStats.save();
    // console.log('newQuest log ne:',newQuest);
    res.status(200).json({ 
      quest: {
        id: newQuest.questId,
        title: newQuest.title,
        description: newQuest.description,
        category: newQuest.category,
        difficulty: newQuest.difficulty,
        objective: newQuest.objective,
        target: newQuest.target,
        unit: newQuest.unit,
        rewards: newQuest.rewards,
        energyCost: 0,
        completed: false,
        expiresAt: newQuest.expiresAt,
        timeLeft: Math.max(0, Math.floor((newQuest.expiresAt.getTime() - Date.now()) / 1000)),
        estimatedTime: newQuest.estimatedTime,
        type: 'personal',
        completionCriteria: newQuest.completionCriteria,
        completionInstructions: newQuest.completionInstructions,
        workoutDetails: newQuest.workoutDetails || []
      },
      currentEnergy: nftStats.energy,
      newQuest
    });

  } catch (error: unknown) {
    console.error('❌ Error creating personal quest:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: errorMessage });
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
        workoutDetails?: Array<{
          section: string;
          duration: number;
          exercises: Array<{
            name: string;
            time: string;
            description: string;
          }>;
        }>;
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
          completionInstructions: quest.completionInstructions || '',
          workoutDetails: quest.workoutDetails || []
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
    // Return updated quest
    const questResponse = {
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
        progress: 0,
        rewards: quest.rewards,
        energyCost: quest.energyCost,
        expiresAt: quest.expiresAt,
        estimatedTime: quest.estimatedTime,
        active: true,
        startedAt: quest.startedAt,
        type: quest.type,
        workoutDetails: quest.workoutDetails || [], 
        completionCriteria: quest.completionCriteria || 'manual',
        completionInstructions: quest.completionInstructions || ''
      }
    };
    res.json(questResponse);
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
    quest.progress = quest.target;
    await quest.save();
    
    // Record quest activity

    await QuestHistory.create({
      userWallet: walletAddress,
      questId: quest.questId,
      questType: quest.type,
      questTitle: quest.title,
      energyCost: quest.energyCost,
      rewardsXp: quest.rewards?.xp || 0,
      rewardsGold: quest.rewards?.gold || 0,
      rewardsItems: quest.rewards?.items || [],
      category: quest.category,
      difficulty: quest.difficulty,
      estimatedTime: quest.estimatedTime,
      completedAt: new Date()
    });
    await Quest.deleteOne({ questId, userWallet: walletAddress });
    await QuestActivity.deleteOne({ questId, userWallet: walletAddress });
    
    // Add XP to NFT stats
    let levelUp = false;
    let randomStatPoints = Math.floor(Math.random() * 5) + 1;
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
              $inc: { level: 1, statsPoints: 3 + randomStatPoints }, // Thêm random luôn khi lên level
              $set: { 
                xp: updatedNft.xp - (updatedNft.xpToNextLevel || 100),
                xpToNextLevel: Math.floor((updatedNft.xpToNextLevel || 100) * 1.5)
              }
            }
          );
          levelUp = true;
        } else {
          await NFTStats.updateOne(
            { userWallet: walletAddress },
            { $inc: { statsPoints: randomStatPoints } });
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
        items: quest.rewards?.items || [],
        statsPoints: randomStatPoints
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
  if (!process.env.OPENAI_API_KEY?.trim()) {
    console.error('Missing OpenAI API key');
    return null;
  }

    const profile = user.profile || {};
  const recentActivities = activityHistory.map(h => h.questTitle).join(', ') || 'none';
    
    const prompt = `
    You are a personal trainer. Based on the following information, give me a detailed workout assignment for today:
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
    - Equipment: ${profile.equipment?.join(', ') || 'Nothing'}
    - Recent Completed Quests: ${recentActivities}

  ✅ Required JSON return includes:
  - title: Short, catchy title
  - description: 1-2 sentences explaining the quest
  - category: MUST be one of: strength, cardio, flexibility, nutrition, mental, daily
  - difficulty: MUST be one of: easy, medium, hard
  - objective: What needs to be done (e.g., "Complete pushups")
  - target: MUST be a number (e.g., 10 for 10 pushups)
  - unit: Unit of measurement (e.g., "pushups", "minutes", "reps")
  - estimatedTime: MUST be a number between 10-60 minutes
  - rewards:
    - xp: MUST be a number (easy: 50-100, medium: 100-150, hard: 150-250)
    - gold: MUST be a number (easy: 50-100, medium: 100-150, hard: 150-250)
    - items: Array of strings (optional)
  - completionCriteria: MUST be one of: "manual", "automatic", "verification"
  - completionInstructions: Clear instructions on how to complete/verify
  - workoutDetails: Array of sections, each with:
    - section: Section name (e.g., "Warm-up", "Main Workout", "Cool-down")
    - duration: MUST be a number (minutes)
    - exercises: Array of exercises, each with:
      - name: Exercise name
      - time: Time or reps (e.g., "30 seconds", "10 reps")
      - description: How to perform the exercise

✅ Important rules:
1. target MUST be a number, not a string
2. estimatedTime MUST be a number between 10-60
3. rewards.xp and rewards.gold MUST be numbers
4. category and difficulty MUST be from the allowed values
5. workoutDetails duration MUST be a number

✅ Output format: Return a valid JSON object with all required fields. No comments or introduction.
  `;

  try {
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });
    
    const content = completion?.choices?.[0]?.message?.content;
    if (!content) {
      console.error('Empty response from OpenAI');
      return null;
    }
   
    
    const questData = JSON.parse(content);
    
    if (typeof questData.target === 'string' || isNaN(Number(questData.target))) {
      console.log(`Invalid target value: ${questData.target}, setting default target`);
      questData.target = 
        questData.difficulty === 'easy' ? 10 :
        questData.difficulty === 'medium' ? 20 : 30;
    }

    if (!questData.rewards || typeof questData.rewards !== 'object') {
      questData.rewards = { xp: 0, gold: 0, items: [] };
    }

    if (typeof questData.rewards.xp !== 'number' || isNaN(questData.rewards.xp)) {
      questData.rewards.xp = 
        questData.difficulty === 'easy' ? 50 :
        questData.difficulty === 'medium' ? 100 : 150;
    }

    if (typeof questData.rewards.gold !== 'number' || isNaN(questData.rewards.gold)) {
      questData.rewards.gold = 
        questData.difficulty === 'easy' ? 50 :
        questData.difficulty === 'medium' ? 100 : 150;
    }

    if (!Array.isArray(questData.rewards.items)) {
      questData.rewards.items = [];
    }
    
    if (questData.estimatedTime) {
      if (typeof questData.estimatedTime === 'string') {
        console.log(`estimatedTime is string: "${questData.estimatedTime}"`);
        const numberMatch = questData.estimatedTime.match(/(\d+)/);
        if (numberMatch && numberMatch[1]) {
          questData.estimatedTime = parseInt(numberMatch[1], 10);
        } else {
          questData.estimatedTime = 
            questData.difficulty === 'easy' ? 15 :
                               questData.difficulty === 'medium' ? 30 : 45;
        }
      }
    }
    
    if (!questData.estimatedTime || isNaN(Number(questData.estimatedTime)) || questData.estimatedTime < 10 || questData.estimatedTime > 60) {
      questData.estimatedTime =
        questData.difficulty === 'easy' ? 15 :
        questData.difficulty === 'medium' ? 30 : 45;
    }

    const validCategories = ['strength', 'cardio', 'flexibility', 'nutrition', 'mental', 'daily'];
    if (!validCategories.includes(questData.category)) {
      console.log(`Invalid category: ${questData.category}, defaulting to 'cardio'`);
      questData.category = 'cardio';
    }

    const validDifficulties = ['easy', 'medium', 'hard'];
    if (!validDifficulties.includes(questData.difficulty)) {
      console.log(`Invalid difficulty: ${questData.difficulty}, defaulting to 'easy'`);
      questData.difficulty = 'easy';
    }

    // Ensure completionCriteria is a valid value
    const validCompletionCriteria = ['manual', 'automatic', 'verification'];
    if (!validCompletionCriteria.includes(questData.completionCriteria)) {
      questData.completionCriteria = 'manual';
    }

    // Ensure workoutDetails is an array and has the correct format
    if (!questData.workoutDetails || !Array.isArray(questData.workoutDetails)) {
      questData.workoutDetails = [];
    }

    questData.workoutDetails = questData.workoutDetails.map((section: WorkoutSection) => ({
      section: section.section || 'Unnamed Section',
      duration: typeof section.duration === 'number' ? section.duration : 0,
      exercises: Array.isArray(section.exercises) ? section.exercises.map((exercise: Exercise) => ({
        name: exercise.name || 'Unnamed Exercise',
        time: exercise.time || '0 minutes',
        description: exercise.description || 'No description provided'
      })) : []
    }));

    // Ensure completionInstructions has a value
    if (!questData.completionInstructions || questData.completionInstructions.trim() === '') {
      questData.completionInstructions = `Complete ${questData.target} ${questData.unit} of ${questData.objective.toLowerCase()}`;
    }

    const requiredFields = ['title', 'description', 'category', 'difficulty', 'objective', 'target', 'unit', 'rewards'];
    const missing = requiredFields.filter(f => !questData[f]);
    if (missing.length) {
      console.error('Missing required quest fields:', missing.join(', '));
      return null;
    }
    return questData;
  } catch (error) {
    console.error('OpenAI API error (gpt-4o only):', error);
    return null;
  }
}

async function generateServerQuests() {
  try {
    const prompt = `
      You are a fitness coach in a health and fitness themed game called HealthQuest. 
      Please generate 5 server quests for users to complete.
      
      Create varied quests across these categories: strength, cardio, flexibility, nutrition, mental, daily
      With difficulty levels: easy, medium, hard
      
      For each quest provide:
      - title: Short, catchy title
      - description: 1-2 sentences explaining the quest
      - category: One of the categories listed above
      - difficulty: easy, medium, or hard
      - objective: What the user needs to do (e.g., "Complete 5 pushups")
      - target: Numerical target (e.g., 5)
      - unit: Unit of measurement (e.g., "pushups", "minutes", "glasses")
      - energyCost: Energy cost to accept (5-15 based on difficulty)
      - requiredLevel: Minimum level required (0-5)
      - rewards: 
        - xp: XP rewarded (50-200 based on difficulty)
        - gold: Gold rewarded (10-50 based on difficulty)
        - items: Array of string item names (optional)
      - completionCriteria: How to verify completion (one of: "manual", "automatic", "verification")
      - completionInstructions: Instructions on how to complete or verify the quest
      - workoutDetails: Array of workout sections (typically: warmup, main workout, cooldown), each with:
        - section: Section name (e.g., "Warm-up", "Main Workout", "Cool-down")
        - duration: Duration in minutes
        - exercises: Array of exercises
          - name: Exercise name
          - time: Time specification (e.g., "30 seconds", "10 reps")
          - description: How to perform the exercise
        
      ✅ Output format: Return a valid JSON array containing 5 quest objects
    `;
    // console.log(prompt);
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
      return questsData.quests.map((quest: any) => {
        if (quest.workoutDetails && typeof quest.workoutDetails === 'object' && !Array.isArray(quest.workoutDetails)) {
          const workoutDetailsArray = [];
          for (const sectionName in quest.workoutDetails) {
            const sectionData = quest.workoutDetails[sectionName];
            workoutDetailsArray.push({
              section: sectionName,
              duration: sectionData.duration || 0,
              exercises: Array.isArray(sectionData.exercises) ? sectionData.exercises : []
            });
          }
          quest.workoutDetails = workoutDetailsArray;
        }
        if (!quest.workoutDetails || !Array.isArray(quest.workoutDetails)) {
          quest.workoutDetails = [];
        }
        quest.workoutDetails = quest.workoutDetails.map((section: WorkoutSection) => ({
          section: section.section || 'Unnamed Section',
          duration: section.duration || 0,
          exercises: Array.isArray(section.exercises) ? section.exercises.map((exercise: Exercise) => ({
            name: exercise.name || 'Unnamed Exercise',
            time: exercise.time || '0 minutes',
            description: exercise.description || 'No description provided'
          })) : []
        }));

        if (quest.estimatedTime) {
          if (typeof quest.estimatedTime === 'string') {
            console.log(`Quest estimatedTime is string: "${quest.estimatedTime}"`);
            const numberMatch = quest.estimatedTime.match(/(\d+)/);
            if (numberMatch && numberMatch[1]) {
              quest.estimatedTime = parseInt(numberMatch[1], 10);
            } else {
              quest.estimatedTime = 
                quest.difficulty === 'easy' ? 15 :
                quest.difficulty === 'medium' ? 30 : 45;
            }
          }
        }
        if (!quest.estimatedTime || isNaN(Number(quest.estimatedTime)) || quest.estimatedTime < 10 || quest.estimatedTime > 60) {
          quest.estimatedTime =
            quest.difficulty === 'easy' ? 15 :
            quest.difficulty === 'medium' ? 30 : 45;
        }

        const validCategories = ['strength', 'cardio', 'flexibility', 'nutrition', 'mental', 'daily'];
        if (!validCategories.includes(quest.category)) {
          console.log(`Invalid category: ${quest.category}, defaulting to 'cardio'`);
          quest.category = 'cardio';
        }

        const validDifficulties = ['easy', 'medium', 'hard'];
        if (!validDifficulties.includes(quest.difficulty)) {
          console.log(`Invalid difficulty: ${quest.difficulty}, defaulting to 'easy'`);
          quest.difficulty = 'easy';
        }
        const validCompletionCriteria = ['manual', 'automatic', 'verification'];
        if (!validCompletionCriteria.includes(quest.completionCriteria)) {
          quest.completionCriteria = 'manual';
        }

        return quest;
      });
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
        completionInstructions: "Track your steps with any fitness device or app and report your total.",
        workoutDetails: [
          {
            section: "Warm-up",
            duration: 5,
            exercises: [
              {
                name: "Brisk Walking",
                time: "5 minutes",
                description: "Start with a brisk walk to get your heart rate up."
              }
            ]
          },
          {
            section: "Main Workout",
            duration: 20,
            exercises: [
              {
                name: "Walking/Jogging",
                time: "20 minutes",
                description: "Maintain a steady pace that challenges you but allows you to maintain the activity for the full duration."
              }
            ]
          },
          {
            section: "Cool-down",
            duration: 5,
            exercises: [
              {
                name: "Gentle Walking",
                time: "5 minutes",
                description: "Gradually reduce your pace to bring your heart rate down."
              }
            ]
          }
        ]
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
        completionInstructions: "Complete any combination of bodyweight exercises totaling 100 reps.",
        workoutDetails: [
          {
            section: "Warm-up",
            duration: 5,
            exercises: [
              {
                name: "Arm Circles",
                time: "30 seconds",
                description: "Rotate your arms in circles, forward and backward."
              },
              {
                name: "Jumping Jacks",
                time: "1 minute",
                description: "Jump while raising arms and spreading legs to the sides."
              }
            ]
          },
          {
            section: "Main Workout",
            duration: 20,
            exercises: [
              {
                name: "Push-ups",
                time: "As many as comfortable",
                description: "Lower your body to the ground and push back up using your arms."
              },
              {
                name: "Squats",
                time: "As many as comfortable",
                description: "Bend your knees and lower your hips as if sitting in a chair."
              },
              {
                name: "Sit-ups",
                time: "As many as comfortable",
                description: "Lie on your back and lift your torso toward your knees."
              }
            ]
          },
          {
            section: "Cool-down",
            duration: 5,
            exercises: [
              {
                name: "Stretching",
                time: "5 minutes",
                description: "Stretch all major muscle groups, holding each stretch for 15-30 seconds."
              }
            ]
          }
        ]
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
        completionInstructions: "Sit quietly and focus on your breath for 15 minutes total.",
        workoutDetails: [
          {
            section: "Preparation",
            duration: 2,
            exercises: [
              {
                name: "Finding a Quiet Space",
                time: "2 minutes",
                description: "Find a quiet, comfortable place where you won't be disturbed."
              }
            ]
          },
          {
            section: "Meditation",
            duration: 15,
            exercises: [
              {
                name: "Mindful Breathing",
                time: "15 minutes",
                description: "Sit comfortably, close your eyes, and focus on your breath. Notice the sensation of breathing in and out. When your mind wanders, gently bring it back to your breath."
              }
            ]
          },
          {
            section: "Reflection",
            duration: 3,
            exercises: [
              {
                name: "Mental Check-in",
                time: "3 minutes",
                description: "Notice how you feel after the meditation. Observe any changes in your mental state."
              }
            ]
          }
        ]
      }
    ];
  }
}

export default router; 