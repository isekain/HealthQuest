import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../components/ui/form";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "../hooks/use-toast";
import { apiRequest } from "../lib/queryClient";
import { useAuth } from "../hooks/use-auth";
import { MultiSelect } from "../components/ui/multi-select";
import { Checkbox } from "../components/ui/checkbox";
import { Loader2, Pencil } from "lucide-react";
import React, { useEffect, useState, useMemo } from 'react';
import { PageContainer } from "@/components/ui/container";
import { useNavigate } from "react-router-dom";

const profileOptions = {
  gender: ['male', 'female', 'other'] as const,
  fitnessGoal: [
    'weight_loss',
    'weight_gain', 
    'muscle_gain',
    'endurance',
    'flexibility',
    'mental_health',
    'injury_recovery'
  ] as const,
  experience: ['beginner', 'intermediate', 'advanced'] as const,
  sleepQuality: ['poor', 'fair', 'good', 'excellent'] as const,
  mentalHealth: ['poor', 'fair', 'good', 'excellent'] as const,
  activityLevel: ['sedentary', 'lightly_active', 'moderately_active', 'very_active'] as const,
  dietType: ['vegetarian', 'vegan', 'keto', 'paleo', 'other'] as const,
  targetDuration: ['short_term', 'mid_term', 'long_term'] as const,
  fitnessTrackers: ['fitbit', 'apple_watch', 'garmin', 'other'] as const,
  preferredActivities: [
    'running',
    'walking',
    'cycling',
    'swimming',
    'yoga',
    'pilates',
    'weight_lifting',
    'hiit',
    'dancing',
    'boxing',
    'martial_arts',
    'team_sports'
  ] as const,
  injuries: [
    'shoulder',
    'knee',
    'ankle',
    'wrist',
    'back',
    'neck',
    'hip'
  ] as const
};

const profileFormSchema = z.object({
  personal: z.object({
    username: z.string().min(3).max(30),
    age: z.coerce.number().min(16).max(100),
    gender: z.enum(profileOptions.gender),
    height: z.coerce.number().min(100).max(250),
    weight: z.coerce.number().min(30).max(250),
  }),
  fitness: z.object({
    fitnessGoal: z.enum(profileOptions.fitnessGoal),
    experience: z.enum(profileOptions.experience),
    preferredActivities: z.array(z.string()).min(1).max(5),
    activityLevel: z.enum(profileOptions.activityLevel),
    workoutDays: z.coerce.number().min(1).max(7),
    workoutDuration: z.coerce.number().min(15).max(120),
    equipment: z.array(z.string()).optional(),
  }),
  health: z.object({
    medicalConditions: z.string().optional(),
    injuries: z.array(z.string()).optional(),
    sleepQuality: z.enum(profileOptions.sleepQuality),
    mentalHealth: z.enum(profileOptions.mentalHealth),
    dietaryRestrictions: z.string().optional(),
    dietType: z.enum(profileOptions.dietType),
    foodAllergies: z.array(z.string()).optional(),
    trackNutrition: z.boolean().optional()
  }),
  goals: z.object({
    targetDuration: z.enum(profileOptions.targetDuration),
    goalDescription: z.string().min(5).max(500),
    usesFitnessTracker: z.boolean(),
    fitnessTracker: z.enum(profileOptions.fitnessTrackers).optional(),
    secondaryGoals: z.array(z.string()).optional(),
  }),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

const defaultValues: Partial<ProfileFormValues> = {
  personal: {
    username: "",
    age: 30,
    gender: "male",
    height: 175,
    weight: 70,
  },
  fitness: {
    fitnessGoal: "weight_loss",
    experience: "beginner",
    preferredActivities: ["running"],
    activityLevel: "moderately_active",
    workoutDays: 3,
    workoutDuration: 30,
    equipment: [],
  },
  health: {
    medicalConditions: "",
    injuries: [],
    sleepQuality: "good",
    mentalHealth: "good",
    dietaryRestrictions: "",
    dietType: "other",
    foodAllergies: [],
    trackNutrition: false,
  },
  goals: {
    targetDuration: "mid_term",
    goalDescription: "I want to improve my overall fitness and lose some weight.",
    usesFitnessTracker: false,
    fitnessTracker: undefined,
    secondaryGoals: [],
  },
};

// Component Tab Personal
const PersonalTab = ({ isEditing, form }: { isEditing: boolean, form: any }) => (
  <Card>
    <CardHeader>
      <CardTitle>Personal Information</CardTitle>
    </CardHeader>
    <CardContent className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="personal.username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Username</FormLabel>
              <FormControl>
                <Input
                  placeholder="Enter your username"
                  {...field}
                  disabled={!isEditing}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="personal.age"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Age</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder="Enter your age"
                  {...field}
                  disabled={!isEditing}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="personal.gender"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Gender</FormLabel>
              <Select 
                onValueChange={field.onChange} 
                defaultValue={field.value} 
                disabled={!isEditing}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your gender" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {profileOptions.gender.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option.charAt(0).toUpperCase() + option.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="personal.height"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Height (cm)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder="Enter your height"
                  {...field}
                  disabled={!isEditing}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="personal.weight"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Weight (kg)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder="Enter your weight"
                  {...field}
                  disabled={!isEditing}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </CardContent>
  </Card>
);

// Component Tab Fitness
const FitnessTab = ({ isEditing, form }: { isEditing: boolean, form: any }) => (
  <Card>
    <CardHeader>
      <CardTitle>Fitness Information</CardTitle>
    </CardHeader>
    <CardContent className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="fitness.fitnessGoal"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Fitness Goal</FormLabel>
              <Select 
                onValueChange={field.onChange} 
                defaultValue={field.value}
                disabled={!isEditing}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your fitness goal" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {profileOptions.fitnessGoal.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="fitness.experience"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Experience Level</FormLabel>
              <Select 
                onValueChange={field.onChange} 
                defaultValue={field.value}
                disabled={!isEditing}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your experience level" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {profileOptions.experience.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option.charAt(0).toUpperCase() + option.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="fitness.preferredActivities"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Preferred Activities (select up to 5)</FormLabel>
              <FormControl>
                <MultiSelect
                  options={profileOptions.preferredActivities.map(activity => ({
                    label: activity.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
                    value: activity,
                  }))}
                  value={field.value}
                  onValueChange={field.onChange}
                  placeholder="Select your preferred activities"
                  disabled={!isEditing}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="fitness.activityLevel"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Daily Activity Level</FormLabel>
              <Select 
                onValueChange={field.onChange} 
                defaultValue={field.value}
                disabled={!isEditing}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your activity level" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {profileOptions.activityLevel.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="fitness.workoutDays"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Workout Days per Week</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min="1"
                  max="7"
                  placeholder="Days per week"
                  {...field}
                  onChange={e => field.onChange(Number(e.target.value))}
                  disabled={!isEditing}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="fitness.workoutDuration"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Workout Duration (minutes)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min="15"
                  max="120"
                  placeholder="Minutes per session"
                  {...field}
                  onChange={e => field.onChange(Number(e.target.value))}
                  disabled={!isEditing}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </CardContent>
  </Card>
);

// Component Tab Health
const HealthTab = ({ isEditing, form }: { isEditing: boolean, form: any }) => (
  <Card>
    <CardHeader>
      <CardTitle>Health Information</CardTitle>
    </CardHeader>
    <CardContent className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="health.medicalConditions"
          render={({ field }) => (
            <FormItem className="col-span-full">
              <FormLabel>Medical Conditions (if any)</FormLabel>
              <FormControl>
                <Input
                  placeholder="Enter any medical conditions"
                  {...field}
                  disabled={!isEditing}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="health.injuries"
          render={({ field }) => (
            <FormItem className="col-span-full">
              <FormLabel>Injuries or Limitations</FormLabel>
              <FormControl>
                <MultiSelect
                  options={profileOptions.injuries.map(injury => ({
                    label: injury.charAt(0).toUpperCase() + injury.slice(1),
                    value: injury,
                  }))}
                  value={field.value || []}
                  onValueChange={field.onChange}
                  placeholder="Select any current injuries"
                  disabled={!isEditing}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="health.sleepQuality"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Sleep Quality</FormLabel>
              <Select 
                onValueChange={field.onChange} 
                defaultValue={field.value}
                disabled={!isEditing}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your sleep quality" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {profileOptions.sleepQuality.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option.charAt(0).toUpperCase() + option.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="health.mentalHealth"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Mental Health</FormLabel>
              <Select 
                onValueChange={field.onChange} 
                defaultValue={field.value}
                disabled={!isEditing}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your mental health status" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {profileOptions.mentalHealth.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option.charAt(0).toUpperCase() + option.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="health.dietaryRestrictions"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Dietary Restrictions</FormLabel>
              <FormControl>
                <Input
                  placeholder="Enter any dietary restrictions"
                  {...field}
                  disabled={!isEditing}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="health.dietType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Diet Type</FormLabel>
              <Select 
                onValueChange={field.onChange} 
                defaultValue={field.value}
                disabled={!isEditing}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your diet type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {profileOptions.dietType.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option.charAt(0).toUpperCase() + option.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="health.trackNutrition"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  disabled={!isEditing}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>
                  Track nutrition
                </FormLabel>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </CardContent>
  </Card>
);

// Component Tab Goals
const GoalsTab = ({ isEditing, form }: { isEditing: boolean, form: any }) => (
  <Card>
    <CardHeader>
      <CardTitle>Goals and Preferences</CardTitle>
    </CardHeader>
    <CardContent className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="goals.targetDuration"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Goal Timeframe</FormLabel>
              <Select 
                onValueChange={field.onChange} 
                defaultValue={field.value}
                disabled={!isEditing}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your goal timeframe" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {profileOptions.targetDuration.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="goals.goalDescription"
          render={({ field }) => (
            <FormItem className="col-span-full">
              <FormLabel>Detailed Goal Description</FormLabel>
              <FormControl>
                <textarea
                  className="flex min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="Describe your fitness goals in detail"
                  {...field}
                  disabled={!isEditing}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="goals.usesFitnessTracker"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  disabled={!isEditing}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>
                  I use a fitness tracker
                </FormLabel>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
        
        {form.watch("goals.usesFitnessTracker") && (
          <FormField
            control={form.control}
            name="goals.fitnessTracker"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fitness Tracker Type</FormLabel>
                <Select 
                  onValueChange={field.onChange} 
                  value={field.value}
                  disabled={!isEditing}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select your fitness tracker" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {profileOptions.fitnessTrackers.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
      </div>
    </CardContent>
  </Card>
);

const useUserProfile = (walletAddress: string | null) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const { data: userData, isLoading: profileLoading } = useQuery({
    queryKey: ["user", walletAddress],
    queryFn: async () => {
      if (!walletAddress) return null;
      
      try {
        const response = await apiRequest(`/api/users/${walletAddress}`);
        return response;
      } catch (error) {
        if (error && typeof error === 'object' && 'status' in error && error.status === 404) {
          console.log("User not found, will create new user");
        }
        return null;
      }
    },
    enabled: !!walletAddress,
  });

  const createUser = async () => {
    if (!walletAddress || userData) return;
    
    const defaultUsername = `User-${walletAddress.slice(0, 6)}`;
    
    try {
      const response = await apiRequest(`/api/users`, {
        method: "POST",
        data: {
          walletAddress: walletAddress,
          username: defaultUsername,
        }
      });
      
      queryClient.invalidateQueries({ queryKey: ["user", walletAddress] });
      
      toast({
        title: "Hello!",
        description: "Please complete your profile information to have the best experience.",
      });
      
      return response;
    } catch (error) {
      console.error("Error creating user:", error);
      return null;
    }
  };
  const { mutate: updateProfile, isPending: isUpdating } = useMutation({
    mutationFn: async (values: ProfileFormValues) => {
      if (!walletAddress) throw new Error("No wallet address");
      
      const profileData = {
        username: values.personal.username,
        age: values.personal.age,
        gender: values.personal.gender,
        height: values.personal.height,
        weight: values.personal.weight,
        fitnessGoal: values.fitness.fitnessGoal,
        experience: values.fitness.experience,
        preferredActivities: values.fitness.preferredActivities || [],
        activityLevel: values.fitness.activityLevel,
        workoutFrequency: {
          sessionsPerWeek: values.fitness.workoutDays,
          minutesPerSession: values.fitness.workoutDuration,
        },
        medicalConditions: values.health.medicalConditions || '',
        injuries: values.health.injuries || [],
        sleepQuality: values.health.sleepQuality,
        mentalHealth: values.health.mentalHealth,
        dietaryRestrictions: values.health.dietaryRestrictions || '',
        dietType: values.health.dietType,
        trackNutrition: values.health.trackNutrition || false,
        foodAllergies: values.health.foodAllergies || [],
        targetDuration: values.goals.targetDuration,
        goalDescription: values.goals.goalDescription,
        secondaryGoals: values.goals.secondaryGoals || [],
        equipment: values.fitness.equipment || [],
        fitnessTracker: values.goals.usesFitnessTracker && values.goals.fitnessTracker ? values.goals.fitnessTracker : '',
      };
      
      try {
        const response = await apiRequest(`/api/users/${walletAddress}/profile`, {
          method: "PATCH",
          data: profileData
        });

        return response;
      } catch (error) {
        console.error("Error updating profile:", error);
        throw error;
      }
    },
    onSuccess: (data) => {
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
      });
      
      queryClient.invalidateQueries({ queryKey: ["user", walletAddress] });
      
      if (data) {
        toast({
          title: "Redirect",
          description: "Success you will be redirected in a moment...",
        });
        
        return data;
      }
    },
    onError: (error) => {
      toast({
        title: "Error updating profile",
        description: (error as Error).message,
        variant: "destructive",
      });
    },
  });

  return {
    userData,
    profileLoading,
    createUser,
    updateProfile,
    isUpdating
  };
};

const Profile = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const navigate = useNavigate();
  
  const storedWalletAddress = localStorage.getItem("walletAddress");
  
  const { 
    userData, 
    profileLoading, 
    createUser, 
    updateProfile, 
    isUpdating 
  } = useUserProfile(storedWalletAddress);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues,
  });

  useEffect(() => {
    if (storedWalletAddress && !userData && !profileLoading) {
      createUser();
    }
  }, [storedWalletAddress, userData, profileLoading]);

  useEffect(() => {
    if (userData && userData.profile) {
      const formData = {
        personal: {
          username: userData.username || `User-${storedWalletAddress?.slice(0, 6)}`,
          age: userData.profile.age || 30,
          gender: userData.profile.gender || "male",
          height: userData.profile.height || 175,
          weight: userData.profile.weight || 70,
        },
        fitness: {
          fitnessGoal: userData.profile.fitnessGoal || "weight_loss",
          experience: userData.profile.experience || "beginner",
          preferredActivities: userData.profile.preferredActivities || ["running"],
          activityLevel: userData.profile.activityLevel || "moderately_active",
          workoutDays: userData.profile.workoutFrequency?.sessionsPerWeek || 3,
          workoutDuration: userData.profile.workoutFrequency?.minutesPerSession || 30,
          equipment: userData.profile.equipment || [],
        },
        health: {
          medicalConditions: userData.profile.medicalConditions || "",
          injuries: Array.isArray(userData.profile.injuries) ? userData.profile.injuries : [],
          sleepQuality: userData.profile.sleepQuality || "good",
          mentalHealth: userData.profile.mentalHealth || "good",
          dietaryRestrictions: userData.profile.dietaryRestrictions || "",
          dietType: userData.profile.dietType || "other",
          foodAllergies: userData.profile.foodAllergies || [],
          trackNutrition: userData.profile.trackNutrition || false,
        },
        goals: {
          targetDuration: userData.profile.targetDuration || "mid_term",
          goalDescription: userData.profile.goalDescription || "I want to improve my overall fitness and lose some weight.",
          usesFitnessTracker: !!userData.profile.fitnessTracker,
          fitnessTracker: userData.profile.fitnessTracker || undefined,
          secondaryGoals: userData.profile.secondaryGoals || [],
        },
      };
      
      form.reset(formData);
    }
  }, [userData, form, storedWalletAddress]);

  const isProfileIncomplete = useMemo(() => {
    if (!userData || !userData.profile) return true;
    
    return !userData.profile.age || 
      !userData.profile.gender || 
      !userData.profile.height || 
      !userData.profile.weight ||
      !userData.profile.fitnessGoal ||
      !userData.profile.preferredActivities ||
      userData.profile.preferredActivities.length === 0;
  }, [userData]);

  useEffect(() => {
    if (storedWalletAddress && isProfileIncomplete && !isEditing) {
      setIsEditing(true);
    }
  }, [storedWalletAddress, isProfileIncomplete, isEditing]);

  const onSubmit = (values: ProfileFormValues) => {
    updateProfile(values, {
      onSuccess: (data) => {
        setIsEditing(false);
        setTimeout(() => {
          navigate("/mint-nft");
        }, 1500);
      }
    });
  };

  if (profileLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="animate-spin h-8 w-8 text-primary" />
      </div>
    );
  }

  if (!storedWalletAddress) {
    return (
      <div className="container mx-auto py-10">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-10">
            <h2 className="text-2xl font-bold mb-4">Connect Your Wallet</h2>
            <p className="text-center text-muted-foreground mb-6">
              Please connect your wallet to view and manage your fitness profile.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <PageContainer title="Your Fitness Profile">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Button 
            variant={isEditing ? "default" : "outline"}
            onClick={() => setIsEditing(!isEditing)}
          >
            <Pencil className="mr-2 h-4 w-4" /> 
            {isEditing ? "Cancel" : "Edit Profile"}
          </Button>
        </div>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <Tabs defaultValue="personal" className="w-full">
              <TabsList className="w-full flex flex-wrap mb-8">
                <TabsTrigger value="personal" className="flex-1">Personal</TabsTrigger>
                <TabsTrigger value="fitness" className="flex-1">Fitness</TabsTrigger>
                <TabsTrigger value="health" className="flex-1">Health</TabsTrigger>
                <TabsTrigger value="goals" className="flex-1">Goals</TabsTrigger>
              </TabsList>
              
              <TabsContent value="personal">
                <PersonalTab isEditing={isEditing} form={form} />
              </TabsContent>
              
              <TabsContent value="fitness">
                <FitnessTab isEditing={isEditing} form={form} />
              </TabsContent>
              
              <TabsContent value="health">
                <HealthTab isEditing={isEditing} form={form} />
              </TabsContent>
              
              <TabsContent value="goals">
                <GoalsTab isEditing={isEditing} form={form} />
              </TabsContent>
            </Tabs>
            
            {isEditing && (
              <div className="flex justify-end">
                <Button type="submit" disabled={isUpdating}>
                  {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Profile
                </Button>
              </div>
            )}
          </form>
        </Form>
      </div>
    </PageContainer>
  );
};

export default Profile;