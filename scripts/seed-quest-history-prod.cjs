// Script thêm dữ liệu giả vào MongoDB Atlas cho collection QuestHistory
// Sử dụng: node seed-quest-history-prod.cjs

const mongoose = require('mongoose');

// Kết nối tới MongoDB Atlas
const MONGODB_URI = 'mongodb+srv://baka:baka@cluster0.tqk74.mongodb.net/t28?retryWrites=true&w=majority&appName=Cluster0';

console.log('Connecting to MongoDB Atlas...');
mongoose.connect(MONGODB_URI)
  .then(() => console.log('Connected to MongoDB Atlas'))
  .catch(err => {
    console.error('Error connecting to MongoDB:', err);
    process.exit(1);
  });

// Define QuestHistory schema
const QuestHistorySchema = new mongoose.Schema({
  userWallet: String,
  questId: String,
  questType: String,
  questTitle: String,
  energyCost: Number,
  rewardsXp: Number,
  rewardsGold: Number,
  category: String,
  difficulty: String,
  estimatedTime: Number,
  rewardsItems: [String],
  completedAt: Date
});

const QuestHistory = mongoose.model('QuestHistory', QuestHistorySchema);
const userWallet = 'your_wallet_address';

const categories = ['strength', 'cardio', 'flexibility', 'balance', 'hiit', 'mind', 'daily'];
const difficulties = ['easy', 'medium', 'hard'];
const questTypes = ['personal'];


const questTitlesByCategory = {
  strength: [
    'Power Lift Challenge', 'Muscle Builder Quest', 'Strength Endurance Test',
    'Iron Grip Challenge', 'Powerhouse Champion', 'Heavy Lifting Adventure',
    'Strength Foundation Builder', 'Mighty Muscles Quest'
  ],
  cardio: [
    'Endurance Boost Quest', 'Heart Rate Challenge', 'Cardio Warrior Test',
    'Stamina Builder Quest', 'Aerobic Excellence', 'Running Master',
    'Interval Training Challenge', 'Cardio Blast Quest'
  ],
  flexibility: [
    'Flexibility Master', 'Yoga Flow Challenge', 'Stretch Goals Quest',
    'Mobility Improver', 'Suppleness Champion', 'Joint Mobility Quest',
    'Dynamic Stretching Adventure', 'Flexibility Builder'
  ],
  balance: [
    'Balance Master', 'Stability Challenge', 'Core Control Quest',
    'Equilibrium Test', 'Poise Champion', 'Center of Gravity Quest',
    'Coordination Builder', 'Stability Foundation'
  ],
  hiit: [
    'HIIT Warrior', 'Intensity Challenge', 'Tabata Master',
    'Interval Crusher', 'Circuit Dominator', 'Metabolic Burner',
    'High Intensity Champion', 'Explosive Training Quest'
  ],
  mind: [
    'Mindfulness Quest', 'Mental Clarity Challenge', 'Focus Master',
    'Stress Reduction Journey', 'Meditation Milestone', 'Inner Peace Quest',
    'Mind-Body Connection', 'Awareness Builder'
  ],
  daily: [
    'Daily Movement Challenge', 'Everyday Fitness Quest', 'Routine Builder',
    'Habit Forming Challenge', 'Consistency Master', 'Daily Activity Boost',
    'Lifestyle Improvement Quest', 'Health Routine Builder'
  ]
};

const rewardsItemsByCategory = {
  strength: ['Strength Potion', 'Power Gloves', 'Lifting Belt', 'Muscle Elixir', 'Protein Shake', 'Power Band'],
  cardio: ['Endurance Band', 'Wind Boots', 'Heart Elixir', 'Stamina Charm', 'Runner\'s Kit', 'Cardio Boost'],
  flexibility: ['Stretch Band', 'Flexibility Potion', 'Yoga Mat+', 'Suppleness Charm', 'Joint Oil', 'Flex Cream'],
  balance: ['Balance Stone', 'Core Stabilizer', 'Equilibrium Charm', 'Poise Elixir', 'Stability Shoes', 'Balance Board'],
  hiit: ['Energy Booster', 'Recovery Potion', 'Intensity Charm', 'Circuit Token', 'Interval Timer', 'HIIT Guide'],
  mind: ['Focus Crystal', 'Clarity Potion', 'Mind Stone', 'Zen Charm', 'Meditation Guide', 'Mindfulness Journal'],
  daily: ['Daily Boost', 'Routine Token', 'Habit Strengthener', 'Consistency Badge', 'Lifestyle Coach', 'Health Tracker']
};


function generateId() {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
}


function getRandomItem(array) {
  return array[Math.floor(Math.random() * array.length)];
}


function getRandomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}


async function seedQuestHistory() {
  console.log('Starting to create Quest History data...');

  try {
    // Check current number of documents
    const count = await QuestHistory.countDocuments();
    console.log(`Current number of quest history: ${count}`);
    
    const quests = [];
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 6); // Data in the last 6 months
    
    console.log('Creating 100 new quests...');
    
    for (let i = 0; i < 100; i++) {
      const category = getRandomItem(categories);
      const difficulty = getRandomItem(difficulties);
      const questType = getRandomItem(questTypes);
      
      // Determine rewards and estimated time based on difficulty
      let rewardsXp, rewardsGold, estimatedTime;
      
      if (difficulty === 'easy') {
        rewardsXp = Math.floor(Math.random() * 50) + 50; // 50-100
        rewardsGold = Math.floor(Math.random() * 40) + 50; // 50-90
        estimatedTime = Math.floor(Math.random() * 16) + 15; // 15-30
      } else if (difficulty === 'medium') {
        rewardsXp = Math.floor(Math.random() * 70) + 100; // 100-170
        rewardsGold = Math.floor(Math.random() * 60) + 90; // 90-150
        estimatedTime = Math.floor(Math.random() * 16) + 30; // 30-45
      } else { // hard
        rewardsXp = Math.floor(Math.random() * 100) + 170; // 170-270
        rewardsGold = Math.floor(Math.random() * 80) + 150; // 150-230
        estimatedTime = Math.floor(Math.random() * 16) + 45; // 45-60
      }
      
      // Customize for server quests
      const energyCost = questType === 'server' ? Math.floor(Math.random() * 15) + 5 : 0;
      
      // Determine if there is a reward item (30% chance)
      const hasItems = Math.random() < 0.3;
      const rewardsItems = hasItems ? 
        [getRandomItem(rewardsItemsByCategory[category] || rewardsItemsByCategory.daily)] : [];
      
      // Create quest with fixed wallet address
      const quest = {
        userWallet, // Use fixed wallet address
        questId: `quest-${generateId()}`,
        questType,
        questTitle: getRandomItem(questTitlesByCategory[category] || questTitlesByCategory.daily),
        energyCost,
        rewardsXp,
        rewardsGold,
        category,
        difficulty,
        estimatedTime,
        rewardsItems,
        completedAt: getRandomDate(startDate, endDate)
      };
      
      quests.push(quest);
    }
    
    quests.sort((a, b) => new Date(a.completedAt) - new Date(b.completedAt));
    console.log('Adding quests to MongoDB Atlas...');
    await QuestHistory.insertMany(quests);
    console.log(`Successfully added ${quests.length} quests to database`);

    const newCount = await QuestHistory.countDocuments();
    console.log(`Total number of quest history: ${newCount}`);
  } catch (error) {
    console.error('Error adding data:', error);
  } finally {
    // Close connection
    mongoose.connection.close();
    console.log('Closed MongoDB connection');
  }
}

// Run function seed
seedQuestHistory(); 