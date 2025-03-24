const mongoose = require('mongoose');
const { config } = require('dotenv');
const { OpenAI } = require('openai');

// Load environment variables
config();

// Boss schema
const bossSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  imageUrl: { type: String, default: '' },
  level: { type: Number, required: true },
  health: { type: Number, required: true },
  maxHealth: { type: Number, required: true },
  damage: { type: Number, required: true },
  defense: { type: Number, required: true },
  STR: { type: Number, required: true },
  AGI: { type: Number, required: true },
  VIT: { type: Number, required: true },
  DEX: { type: Number, required: true },
  INT: { type: Number, required: true },
  rewardsXp: { type: Number, required: true },
  rewardsGold: { type: Number, required: true },
  isActive: { type: Boolean, default: true },
  isDefeated: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  defeatDate: { type: Date },
  abilities: [{ type: String }],
  weaknesses: [{ type: String }],
  immunities: [{ type: String }],
  minLevelRequired: { type: Number, required: true }
});

// Create model if it doesn't exist
const Boss = mongoose.models.Boss || mongoose.model('Boss', bossSchema);

// Connect to MongoDB
async function connectToDatabase() {
  try {
    // Sử dụng URI trực tiếp nếu không có trong env
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/healthquest';
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
}

// Generate boss prompt
const generateBossPrompt = (level) => {
  return `Generate a creative RPG boss for a fitness gamified application. The boss should be level ${level}.

Return ONLY valid JSON with the following fields (IMPORTANT: ONLY JSON, no explanations):
{
  "name": "Creative and thematic boss name",
  "description": "Detailed description of the boss, its backstory and why it's an enemy of fitness",
  "level": ${level},
  "health": number (scaled based on level, level 1: ~1000, level 5: ~5000, level 10: ~12000),
  "damage": number (scaled based on level, level 1: ~20, level 5: ~60, level 10: ~120),
  "defense": number (scaled based on level, level 1: ~10, level 5: ~40, level 10: ~80),
  "STR": number between 1-20 (scaled with level),
  "AGI": number between 1-20 (scaled with level),
  "VIT": number between 1-20 (scaled with level),
  "DEX": number between 1-20 (scaled with level),
  "INT": number between 1-20 (scaled with level),
  "rewardsXp": number (scaled based on level, level 1: ~100, level 5: ~500, level 10: ~1200),
  "rewardsGold": number (scaled based on level, level 1: ~50, level 5: ~250, level 10: ~600),
  "abilities": array of 2-4 special abilities as strings,
  "weaknesses": array of 1-3 weaknesses as strings,
  "immunities": array of 0-2 immunities as strings,
  "minLevelRequired": number (usually level-2, minimum 1)
}`;
};

// Main function to generate boss
async function generateBoss() {
  // Get level from command line arguments
  const level = parseInt(process.argv[2], 10) || 1;
  
  if (isNaN(level) || level < 1) {
    console.error('Please provide a valid level (minimum 1)');
    process.exit(1);
  }
  
  try {
    await connectToDatabase();
    
    // Bỏ qua kiểm tra API key, sử dụng dữ liệu mẫu
    console.log(`Generating a level ${level} boss...`);
    
    // Test data
    const bossData = {
      name: "Lazarus the Couch Tyrant",
      description: "Once a fitness instructor who became consumed by sloth, Lazarus now draws power from inactivity and junk food. His massive form blocks the path to fitness, and his aura of lethargy saps the motivation of those around him.",
      level: level,
      health: level * 1000,
      damage: level * 20,
      defense: level * 10,
      STR: Math.min(5 + Math.floor(level * 1.5), 20),
      AGI: Math.min(3 + Math.floor(level * 0.7), 15),
      VIT: Math.min(8 + Math.floor(level * 1.2), 20),
      DEX: Math.min(2 + Math.floor(level * 0.8), 15),
      INT: Math.min(6 + Math.floor(level * 0.9), 18),
      rewardsXp: level * 100,
      rewardsGold: level * 50,
      abilities: [
        "Laziness Aura: Reduces player motivation and stamina recovery",
        "Junk Food Barrage: Throws unhealthy snacks for area damage",
        "Couch Lock: Temporarily immobilizes the player",
        "Remote Control Blast: Ranged attack that causes confusion"
      ],
      weaknesses: [
        "Consistent Exercise: Repeated attacks wear him down faster",
        "Healthy Choices: Nutritious items deal extra damage"
      ],
      immunities: ["Quick Fatigue"],
      minLevelRequired: Math.max(1, level - 2)
    };
    
    // Ensure required fields
    bossData.maxHealth = bossData.health;
    
    // Check if there are any active bosses
    const activeBosses = await Boss.find({ isActive: true });
    
    // If there are active bosses, set them all to inactive
    if (activeBosses.length > 0) {
      console.log(`Setting ${activeBosses.length} active bosses to inactive...`);
      await Boss.updateMany({ isActive: true }, { isActive: false });
    }
    
    // Create new boss
    const newBoss = new Boss(bossData);
    const savedBoss = await newBoss.save();
    
    console.log('Boss generated and saved successfully!');
    console.log(`Boss ID: ${savedBoss._id}`);
    console.log(`Name: ${savedBoss.name}`);
    console.log(`Level: ${savedBoss.level}`);
    console.log(`Health: ${savedBoss.health}`);
    
    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    
  } catch (error) {
    console.error('Error generating boss:', error);
    process.exit(1);
  }
}

// Run the function
generateBoss(); 