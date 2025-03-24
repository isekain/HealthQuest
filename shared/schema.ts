import { pgTable, text, serial, integer, jsonb, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  walletAddress: text("wallet_address").primaryKey(),
  username: text("username").notNull(),
  profile: jsonb("profile").$type<{
    age: number;
    gender: string;
    height: number;
    weight: number;
    waistCircumference?: number;
    fitnessGoal: string;
    medicalConditions: string;
    injuries: string[];
    sleepQuality: string;
    mentalHealth: string;
    activityLevel: string;
    dietaryHabits: string;
    preferredActivities: string[]; 
    workoutFrequency: {
      sessionsPerWeek: number;
      minutesPerSession: number; 
    };
    dietType: string;
    foodAllergies: string[];
    trackNutrition: boolean;
    targetWeight?: number;
    targetDuration: string; 
    secondaryGoals: string[];
    equipment: string; 
    fitnessTrackers: string[];
  }>(),
  nftTokenId: text("nft_token_id"),
  score: integer("score").default(0).notNull(),
  rank: integer("rank").default(0).notNull(),
  totalWorkouts: integer("total_workouts").default(0).notNull(),
  totalMinutes: integer("total_minutes").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const workouts = pgTable("workouts", {
  id: serial("id").primaryKey(),
  userWallet: text("user_wallet").references(() => users.walletAddress),
  type: text("type").notNull(),
  description: text("description").notNull(),
  duration: integer("duration").notNull(),
  completed: boolean("completed").default(false),
  completedAt: timestamp("completed_at"),
  aiGenerated: boolean("ai_generated").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const nftStats = pgTable("nft_stats", {
  id: serial("id").primaryKey(),
  userWallet: text("user_wallet").references(() => users.walletAddress),
  tokenId: text("token_id").notNull(),
  
  // Basic attributes
  STR: integer("str").default(10).notNull(), // Strength
  AGI: integer("agi").default(10).notNull(), // Agility
  VIT: integer("vit").default(10).notNull(), // Vitality
  DEX: integer("dex").default(10).notNull(), // Dexterity
  INT: integer("int").default(10).notNull(), // Intelligence
  WIS: integer("wis").default(10).notNull(), // Wisdom
  LUK: integer("luk").default(10).notNull(), // Luck
  
  // Energy & Progression
  energy: integer("energy").default(100).notNull(),
  energyLastReset: timestamp("energy_last_reset").defaultNow(),
  level: integer("level").default(1).notNull(),
  xp: integer("xp").default(0).notNull(),
  xpToNextLevel: integer("xp_to_next_level").default(100).notNull(),
  statsPoints: integer("stats_points").default(0).notNull(),
  
  // Legacy fields - keeping for compatibility
  strength: integer("strength").default(10).notNull(),
  endurance: integer("endurance").default(10).notNull(),
  agility: integer("agility").default(10).notNull(),
  
  lastUpdated: timestamp("last_updated").defaultNow(),
});

export const nftItems = pgTable("nft_items", {
  id: serial("id").primaryKey(),
  userWallet: text("user_wallet").references(() => users.walletAddress),
  itemId: text("item_id").notNull(),
  type: text("type").notNull(), // 'helmet', 'armor', 'weapon', 'gloves', 'boots', etc.
  name: text("name").notNull(),
  rarity: text("rarity").notNull(), // 'common', 'uncommon', 'rare', 'epic', 'legendary'
  bonuses: jsonb("bonuses").$type<{
    STR?: number,
    AGI?: number,
    VIT?: number,
    DEX?: number,
    INT?: number,
    WIS?: number,
    LUK?: number,
  }>(),
  isEquipped: boolean("is_equipped").default(false),
  imageUrl: text("image_url"),
  acquiredAt: timestamp("acquired_at").defaultNow(),
});

export const questHistory = pgTable("quest_history", {
  id: serial("id").primaryKey(),
  userWallet: text("user_wallet").references(() => users.walletAddress),
  questId: text("quest_id").notNull(),
  questType: text("quest_type").notNull(), // 'personal' or 'server'
  questTitle: text("quest_title").notNull(),
  energyCost: integer("energy_cost").default(0),
  rewardsXp: integer("rewards_xp").notNull(),
  rewardsGold: integer("rewards_gold").notNull(),
  rewardsItems: jsonb("rewards_items").$type<string[]>(), // Array of itemIds received
  completedAt: timestamp("completed_at").defaultNow(),
});

export const achievements = pgTable("achievements", {
  id: serial("id").primaryKey(),
  userWallet: text("user_wallet").references(() => users.walletAddress),
  type: text("type").notNull(), // e.g. 'workout_streak', 'total_minutes', etc.
  name: text("name").notNull(),
  description: text("description").notNull(),
  iconName: text("icon_name").notNull(),
  unlockedAt: timestamp("unlocked_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  walletAddress: true,
  username: true,
  profile: true,
});

export const insertWorkoutSchema = createInsertSchema(workouts).pick({
  userWallet: true,
  type: true,
  description: true,
  duration: true,
  aiGenerated: true,
});

export const insertNFTStatsSchema = createInsertSchema(nftStats).pick({
  userWallet: true,
  tokenId: true,
  STR: true,
  AGI: true,
  VIT: true,
  DEX: true,
  INT: true,
  WIS: true,
  LUK: true,
  energy: true,
  level: true,
  xp: true,
  statsPoints: true,
});

export const insertNFTItemSchema = createInsertSchema(nftItems).pick({
  userWallet: true,
  itemId: true,
  type: true,
  name: true,
  rarity: true,
  bonuses: true,
  imageUrl: true,
});

export const insertQuestHistorySchema = createInsertSchema(questHistory).pick({
  userWallet: true,
  questId: true,
  questType: true,
  questTitle: true,
  energyCost: true,
  rewardsXp: true,
  rewardsGold: true,
  rewardsItems: true,
});

export const insertAchievementSchema = createInsertSchema(achievements).pick({
  userWallet: true,
  type: true,
  name: true,
  description: true,
  iconName: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Workout = typeof workouts.$inferSelect;
export type NFTStats = typeof nftStats.$inferSelect;
export type NFTItem = typeof nftItems.$inferSelect;
export type QuestHistory = typeof questHistory.$inferSelect;
export type Achievement = typeof achievements.$inferSelect;

// Predefined options for profile fields
export const profileOptions = {
  gender: ['male', 'female', 'other'] as const,
  fitnessGoal: ['weight_loss', 'weight_gain', 'muscle_gain', 'endurance', 'health_maintenance'] as const,
  sleepQuality: ['poor', 'fair', 'good', 'excellent'] as const,
  mentalHealth: ['stressed', 'anxious', 'depressed', 'balanced', 'excellent'] as const,
  activityLevel: ['sedentary', 'lightly_active', 'moderately_active', 'very_active', 'athlete'] as const,
  dietType: ['omnivore', 'vegetarian', 'vegan', 'keto', 'paleo', 'mediterranean'] as const,
  targetDuration: ['1_month', '3_months', '6_months'] as const,
  preferredActivities: [
    'gym',
    'yoga',
    'meditation',
    'running',
    'swimming',
    'cycling',
    'hiking',
    'cardio',
    'pilates',
    'martial_arts',
    'dance',
    'climbing',
    'team_sports',
    'calisthenics',
    'hiit',
    'strength_training'
  ] as const,
  itemRarity: [
    'common',
    'uncommon',
    'rare',
    'epic',
    'legendary'
  ] as const,
  itemType: [
    'helmet',
    'armor',
    'weapon',
    'gloves',
    'boots',
    'accessory'
  ] as const,
};