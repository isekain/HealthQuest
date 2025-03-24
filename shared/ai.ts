import OpenAI from "openai";
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  console.error("OPENAI_API_KEY is not defined in environment variables");
}

const openai = new OpenAI({ 
  apiKey: apiKey || 'dummy-key-for-development' 
});

export interface WorkoutPlan {
  type: string;
  description: string;
  duration: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  equipment: string[];
  exercises: {
    name: string;
    sets: number;
    reps: number;
    duration?: number; // for time-based exercises
    restBetweenSets: number;
    form: string;
    modifications: {
      easier: string;
      harder: string;
    };
  }[];
  warmup: {
    description: string;
    duration: number;
  };
  cooldown: {
    description: string;
    duration: number;
  };
  caloriesBurned: {
    min: number;
    max: number;
  };
  warnings: string[];
}

export async function generateWorkoutPlan(userProfile: any): Promise<WorkoutPlan> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `As an expert fitness trainer, create a detailed, personalized workout plan based on the user's profile. 
Consider all health conditions, limitations, and available equipment.
Return a single workout plan in JSON format with the following structure:
{
  "type": "workout type (e.g., HIIT, Strength, Cardio)",
  "description": "detailed overview of the workout",
  "duration": total minutes including warmup/cooldown,
  "difficulty": "beginner/intermediate/advanced",
  "equipment": ["required equipment"],
  "exercises": [{
    "name": "exercise name",
    "sets": number,
    "reps": number,
    "duration": optional minutes for time-based exercises,
    "restBetweenSets": rest time in seconds,
    "form": "detailed form instructions",
    "modifications": {
      "easier": "easier variation",
      "harder": "challenging variation"
    }
  }],
  "warmup": {
    "description": "detailed warmup instructions",
    "duration": minutes
  },
  "cooldown": {
    "description": "detailed cooldown instructions",
    "duration": minutes
  },
  "caloriesBurned": {
    "min": estimated minimum,
    "max": estimated maximum
  },
  "warnings": ["any health/safety warnings based on user profile"]
}`
        },
        {
          role: "user",
          content: JSON.stringify(userProfile),
        },
      ],
      response_format: { type: "json_object" },
    });

    if (!response.choices[0].message.content) {
      throw new Error("No response from OpenAI");
    }

    const plan = JSON.parse(response.choices[0].message.content) as WorkoutPlan;

    // Validate the response has all required fields
    if (!plan.type || !plan.description || !plan.duration || !plan.exercises) {
      throw new Error("Invalid workout plan format from OpenAI");
    }

    return plan;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to generate workout plan: ${error.message}`);
    }
    throw new Error("Failed to generate workout plan");
  }
}

export async function analyzeWorkoutProgress(
  completedWorkouts: {
    type: string;
    duration: number;
    completedAt: Date;
  }[]
): Promise<{
  performance: number;
  suggestions: string[];
}> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "Analyze the user's workout progress and provide a performance score (0-100) and suggestions for improvement. Return in JSON format.",
        },
        {
          role: "user",
          content: JSON.stringify(completedWorkouts),
        },
      ],
      response_format: { type: "json_object" },
    });

    if (!response.choices[0].message.content) {
      throw new Error("No response from OpenAI");
    }

    return JSON.parse(response.choices[0].message.content);
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to analyze workout progress: ${error.message}`);
    }
    throw new Error("Failed to analyze workout progress");
  }
}