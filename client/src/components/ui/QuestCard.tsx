import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "./card";
import { Button } from "./button";
import { Badge } from "./badge";
import { Progress } from "./progress";
import { 
  Trophy, 
  Clock, 
  Coins, 
  Dumbbell, 
  Heart, 
  Brain, 
  Salad, 
  Sunrise, 
  CheckCircle2, 
  Sparkles,
  Play,
  ChevronDown,
  ChevronUp,
  Timer,
  Calendar,
  Zap
} from "lucide-react";

export interface QuestProps {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: string;
  objective: string;
  target: number;
  unit: string;
  progress?: number;
  rewards: {
    xp: number;
    gold: number;
    items?: string[];
  };
  energyCost?: number;
  completed?: boolean;
  expiresAt: string | Date;
  timeLeft?: number;
  type: 'personal' | 'server';
  locked?: boolean;
  active?: boolean;
  startedAt?: string | Date | null;
  estimatedTime?: number;
  onStart?: (id: string) => void;
  onComplete?: (id: string) => void;
  isLoading?: boolean;
  hasActiveQuest?: boolean;
  className?: string;
  disabled?: boolean;
  completionCriteria?: 'manual' | 'automatic' | 'verification';
  completionInstructions?: string;
  requiredLevel?: number;
  workoutDetails?: Array<{
    section: string;
    duration: number;
    exercises: Array<{
      name: string;
      time: string;
      description: string;
    }>;
  }>;
  onAccept?: (id: string) => void;
}

export function QuestCard({
  id,
  title,
  description,
  category,
  difficulty,
  objective,
  target,
  unit,
  progress = 0,
  rewards,
  energyCost = 0,
  completed = false,
  expiresAt,
  timeLeft,
  type = "server",
  locked = false,
  active = false,
  startedAt = null,
  estimatedTime = 30,
  onStart,
  onComplete,
  isLoading = false,
  hasActiveQuest = false,
  className,
  disabled = false,
  completionCriteria = "manual",
  completionInstructions = "",
  requiredLevel = 0,
  workoutDetails = [],
  onAccept
}: QuestProps) {
  const [expanded, setExpanded] = useState(false);
  const [remainingTime, setRemainingTime] = useState<number | null>(null);
  const [progressPercent, setProgressPercent] = useState(0);

  // Format timeLeft for expiration
  const formatTimeLeft = () => {
    if (!timeLeft) return 'Expired';
    
    const days = Math.floor(timeLeft / 86400);
    const hours = Math.floor((timeLeft % 86400) / 3600);
    const minutes = Math.floor((timeLeft % 3600) / 60);
    
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  // Format time for countdown timer
  const formatCountdownTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Countdown timer for active quests
  useEffect(() => {
    if (!active || !startedAt) return;
    
    const startTime = new Date(startedAt).getTime();
    const endTime = startTime + (estimatedTime * 60 * 1000);
    const totalDuration = estimatedTime * 60; // Tổng thời gian tính bằng giây
    
    const updateProgress = () => {
      const now = new Date().getTime();
      const elapsed = now - startTime;
      const totalTime = (estimatedTime * 60 * 1000); // Tổng thời gian tính bằng mili giây
      
      // Tính phần trăm hoàn thành dựa trên thời gian thực đã trôi qua
      const percent = Math.min(100, Math.floor((elapsed / totalTime) * 100));
      const timeRemaining = Math.max(0, Math.floor((endTime - now) / 1000));
      
      console.log(`Progress: ${percent}%, Time elapsed: ${Math.floor(elapsed/1000)}s, Total: ${estimatedTime*60}s`);
      
      setRemainingTime(timeRemaining);
      setProgressPercent(percent);
      
      // Auto-complete quest when timer reaches 0
      if (timeRemaining === 0 && onComplete) {
        onComplete(id);
      }
    };
    
    // Initialize and update every second
    updateProgress();
    const interval = setInterval(updateProgress, 1000);
    
    return () => clearInterval(interval);
  }, [active, startedAt, estimatedTime, onComplete, id]);

  // Category icon
  const getCategoryIcon = () => {
    switch (category) {
      case 'strength':
        return <Dumbbell className="h-4 w-4" />;
      case 'cardio':
        return <Heart className="h-4 w-4" />;
      case 'flexibility':
        return <Sunrise className="h-4 w-4" />;
      case 'nutrition':
        return <Salad className="h-4 w-4" />;
      case 'mental':
        return <Zap className="h-4 w-4" />;
      case 'daily':
        return <Sparkles className="h-4 w-4" />;
      default:
        return <Trophy className="h-4 w-4" />;
    }
  };
  
  // Difficulty badge variant
  const getDifficultyVariant = () => {
    switch (difficulty) {
      case 'easy':
        return 'outline';
      case 'medium':
        return 'secondary';
      case 'hard':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getDifficultyColor = () => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'hard': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card className={`relative overflow-hidden border-2 transition-all duration-300 hover:shadow-lg ${className || ''}`}>
      {/* Quest Status Badge */}
      <div className="absolute right-3 top-3">
        {completed ? (
          <Badge variant="secondary" className="flex items-center gap-1 bg-green-500 text-white">
            <CheckCircle2 className="h-3 w-3" />
            <span>Completed</span>
          </Badge>
        ) : active ? (
          <Badge variant="secondary" className="flex items-center gap-1 bg-purple-500 text-white">
            <Timer className="h-3 w-3" />
            <span>In Progress</span>
          </Badge>
        ) : locked ? (
          <Badge variant="outline" className="bg-background/80">Locked</Badge>
        ) : (
          <Badge variant={getDifficultyVariant()} className={getDifficultyColor()}>
            {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
          </Badge>
        )}
      </div>
      
      {/* Card Header with Quest Type */}
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <div className={`rounded-full p-2 ${
            category === 'strength' ? 'bg-red-500/10' : 
            category === 'cardio' ? 'bg-pink-500/10' :
            category === 'flexibility' ? 'bg-orange-500/10' :
            category === 'nutrition' ? 'bg-green-500/10' :
            category === 'mental' ? 'bg-blue-500/10' :
            'bg-purple-500/10'
          }`}>
            {getCategoryIcon()}
          </div>
          <CardTitle className="text-sm font-medium">
            {type === 'personal' ? "Personal Quest" : "Server Quest"}
          </CardTitle>
        </div>
      </CardHeader>
      
      {/* Quest Content */}
      <CardContent>
        <h3 className="text-lg font-bold">{title}</h3>
        
        {/* Target (thay thế Objective) */}
        <div className="mt-3 rounded-md bg-muted p-2">
          <div className="text-xs text-muted-foreground">Target:</div>
          <div className="font-medium">
            {objective} 
          </div>
          
        </div>
        
        {/* Workout Details - redesigned */}
        {workoutDetails && workoutDetails.length > 0 && (
          <div className="mt-3">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-sm">Workout Details</h4>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setExpanded(!expanded)}
                className="h-6 px-2 text-xs"
              >
                {expanded ? 'Hide' : 'Show'} Details
              </Button>
            </div>
            
            {/* Always show sections and their durations */}
            <div className="rounded-md bg-secondary/30 p-2">
              {workoutDetails.map((section, idx) => (
                <div key={idx} className="flex justify-between items-center py-1 text-sm">
                  <span>{section.section}</span>
                  <span className="text-muted-foreground">{section.duration} mins</span>
                </div>
              ))}
            </div>
            
            {/* Show full exercise details only when expanded */}
            {expanded && (
              <div className="bg-background/50 rounded-md p-3 mt-2 border">
                {workoutDetails.map((section, idx) => (
                  <div key={idx} className="mb-4 last:mb-0">
                    <div className="font-semibold border-b pb-1 mb-2">{section.section} ({section.duration} mins)</div>
                    <div className="space-y-3">
                      {section.exercises.map((exercise, exIdx) => (
                        <div key={exIdx} className="border-l-2 border-primary/50 pl-3">
                          <div className="flex justify-between">
                            <span className="font-medium">{exercise.name}</span>
                            <span className="text-sm">{exercise.time}</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">{exercise.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        
        {/* Active Quest Countdown Timer */}
        {active && remainingTime !== null && (
          <div className="mt-3">
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm font-medium">{objective}: {target} {unit}</span>
              <span className="text-sm font-medium flex items-center">
                <Clock className="h-4 w-4 mr-1" />
                {formatCountdownTime(remainingTime)}
              </span>
            </div>
            
            {/* Sử dụng div thay vì component Progress để hiển thị thanh tiến trình */}
            <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary mt-1">
              <div 
                className="h-full bg-primary transition-all duration-1000" 
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            
            <p className="text-xs text-center mt-1">
              {remainingTime > 0 
                ? `Đã hoàn thành ${progressPercent}% - Còn ${formatCountdownTime(remainingTime)}` 
                : 'Có thể hoàn thành quest!'}
            </p>
          </div>
        )}
        
        {/* Progress Bar (only show if not completed and not locked) */}
        {!completed && !locked && !active && (
          <div className="mt-3">
            
          </div>
        )}
        
        {/* Rewards */}
        <div className="mt-3 flex items-center gap-2">
          <Coins className="h-4 w-4 text-yellow-500" />
          <span className="text-sm font-medium">{rewards.gold} gold</span>
          <Trophy className="ml-2 h-4 w-4 text-orange-500" />
          <span className="text-sm font-medium">{rewards.xp} XP</span>
          {rewards.items && rewards.items.length > 0 && (
            <>
              <Sparkles className="ml-2 h-4 w-4 text-purple-500" />
              <span className="text-sm font-medium">{rewards.items.length} item{rewards.items.length > 1 ? 's' : ''}</span>
            </>
          )}
        </div>
        
        {/* Energy Cost */}
        {energyCost > 0 && (
          <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
            <span>Energy cost: {energyCost}</span>
          </div>
        )}
        
        {/* Time Remaining until expiration */}
        {!active && (
          <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>Expires in: {formatTimeLeft()}</span>
          </div>
        )}
      </CardContent>
      
      {/* Card Footer with Action Button */}
      <CardFooter className="pt-0">
        {completed ? (
          <Button variant="outline" className="w-full" disabled>
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Complete
          </Button>
        ) : active ? (
          remainingTime && remainingTime > 0 ? (
            <div className="w-full bg-muted rounded-md p-2 text-center">
              <div className="text-xs text-muted-foreground">Time remaining</div>
              <div className="text-base font-mono">{formatCountdownTime(remainingTime)}</div>
            </div>
          ) : (
            <Button 
              variant="default" 
              className="w-full" 
              onClick={() => onComplete?.(id)}
              disabled={!onComplete}
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Complete Quest
            </Button>
          )
        ) : locked ? (
          <Button variant="outline" className="w-full" disabled>
            <span>Locked</span>
          </Button>
        ) : (
          <Button 
            variant="default" 
            className="w-full" 
            onClick={() => onStart?.(id)}
            disabled={isLoading || hasActiveQuest || disabled}
          >
            {isLoading ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Starting...
              </span>
            ) : hasActiveQuest ? (
              <span className="text-xs">Complete active quest first</span>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Start Quest
              </>
            )}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
} 