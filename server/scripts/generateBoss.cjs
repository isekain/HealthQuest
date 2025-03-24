// node server/scripts/generateBoss.cjs [level]
// ex: node server/scripts/generateBoss.cjs 1
const mongoose = require('mongoose');
const { config } = require('dotenv');
const { OpenAI } = require('openai');
const fs = require('fs');
const path = require('path');

config();

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

const Boss = mongoose.models.Boss || mongoose.model('Boss', bossSchema);

async function connectToDatabase() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
}
const generateBossPrompt = (level) => {
  return `Create a unique monster Boss in RPG game with full attributes, skills and detailed description. The boss should be level ${level}.

Return ONLY valid JSON with the following fields (IMPORTANT: ONLY JSON, no explanations):
{
  "name": "A cool name, suitable for appearance and personality.",
  "description": "Briefly describe appearance, species, temperament, special skills or ability to haunt on the battlefield.",
  "level": ${level},
  "health": number (scaled based on level, level 1: ~10000, level 5: ~50000, level 10: ~120000),
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

async function generateBoss() {
  const level = parseInt(process.argv[2], 10) || 1;
  
  if (isNaN(level) || level < 1) {
    console.error('Please provide a valid level (minimum 1)');
    process.exit(1);
  }
  
  try {
    await connectToDatabase()
    if (!process.env.OPENAI_API_KEY) {
      console.error('OpenAI API key is missing. Please set OPENAI_API_KEY in your environment variables.');
      process.exit(1);
    }
    
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    
    console.log(`Generating a level ${level} boss...`);
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { 
          role: "system", 
          content: "You are a creative RPG game designer specializing in creating unique and interesting bosses." 
        },
        { 
          role: "user", 
          content: generateBossPrompt(level) 
        }
      ],
      temperature: 0.8,
    });
    let content = completion.choices[0].message.content.trim();
// Loại bỏ markdown code fences nếu có
if (content.startsWith("```")) {
  content = content.replace(/```json\n|```\n|```/g, "");
}
const bossData = JSON.parse(content);
    
    bossData.maxHealth = bossData.health;
    const activeBosses = await Boss.find({ isActive: true });
    if (activeBosses.length > 0) {
      console.log(`Setting ${activeBosses.length} active bosses to inactive...`);
      await Boss.updateMany({ isActive: true }, { isActive: false });
    }
    const newBoss = new Boss(bossData);
    const savedBoss = await newBoss.save();
    
    console.log('Boss generated and saved successfully!');
    console.log(`Boss ID: ${savedBoss._id}`);
    console.log(`Name: ${savedBoss.name}`);
    console.log(`Level: ${savedBoss.level}`);
    console.log(`Health: ${savedBoss.health}`);
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    
  } catch (error) {
    console.error('Error generating boss:', error);
    process.exit(1);
  }
}
generateBoss(); 