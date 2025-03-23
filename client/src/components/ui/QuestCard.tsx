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
  type,
  locked = false,
  active = false,
  startedAt = null,
  estimatedTime = 30,
  onStart,
  onComplete,
  isLoading = false,
  hasActiveQuest = false
}: QuestProps) {
  const [expanded, setExpanded] = useState(false);
  const [remainingTime, setRemainingTime] = useState<number | null>(null);

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
    
    const updateRemainingTime = () => {
      const now = new Date().getTime();
      const timeRemaining = Math.max(0, Math.floor((endTime - now) / 1000));
      
      setRemainingTime(timeRemaining);
      
      // Auto-complete quest when timer reaches 0
      if (timeRemaining === 0 && onComplete) {
        onComplete(id);
      }
    };
    
    // Initialize and update every second
    updateRemainingTime();
    const interval = setInterval(updateRemainingTime, 1000);
    
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
    <Card className="relative overflow-hidden border-2 transition-all duration-300 hover:shadow-lg">
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
            {type === 'personal' ? "Personal Quest" : "Community Quest"}
          </CardTitle>
        </div>
      </CardHeader>
      
      {/* Quest Content */}
      <CardContent>
        <h3 className="text-lg font-bold">{title}</h3>
        
        {/* Description with expand/collapse functionality */}
        <div className="mt-1">
          <p className={`text-sm text-muted-foreground ${expanded ? '' : 'line-clamp-2'}`}>
            {description}
          </p>
          <button 
            className="text-xs text-primary flex items-center mt-1 hover:text-primary/80 transition-colors"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? (
              <>
                <ChevronUp className="h-3 w-3 mr-1" />
                <span>Show less</span>
              </>
            ) : (
              <>
                <ChevronDown className="h-3 w-3 mr-1" />
                <span>Show more</span>
              </>
            )}
          </button>
        </div>
        
        {/* Objective */}
        <div className="mt-3 rounded-md bg-muted p-2">
          <div className="text-xs text-muted-foreground">Objective:</div>
          <div className="font-medium">
            {objective} {target} {unit}
          </div>
        </div>
        
        {/* Active Quest Countdown Timer */}
        {active && remainingTime !== null && (
          <div className="mt-3 rounded-md bg-purple-100 p-2">
            <div className="text-xs text-purple-700">Time Remaining:</div>
            <div className="font-bold text-purple-900">
              {formatCountdownTime(remainingTime)}
            </div>
            <div className="text-xs text-purple-700 mt-1">
              Estimated Completion: {estimatedTime} minutes
            </div>
          </div>
        )}
        
        {/* Progress Bar (only show if not completed and not locked) */}
        {!completed && !locked && !active && (
          <div className="mt-3">
            <div className="flex justify-between text-xs">
              <span>Progress: {progress}/{target}</span>
              <span>{Math.round((progress/target) * 100)}%</span>
            </div>
            <Progress value={(progress/target) * 100} className="mt-1 h-2" />
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
      
      {/* Card Actions */}
      <CardFooter className="pt-0">
        {completed ? (
          <Button variant="outline" size="sm" className="w-full" disabled>
            Completed
          </Button>
        ) : active ? (
          <Button variant="secondary" size="sm" className="w-full" disabled>
            <Timer className="mr-2 h-4 w-4" />
            In Progress
          </Button>
        ) : locked ? (
          <Button variant="outline" size="sm" className="w-full" disabled>
            Locked
          </Button>
        ) : onComplete && !hasActiveQuest ? (
          <Button 
            variant="default" 
            size="sm" 
            className="w-full" 
            onClick={() => onComplete(id)}
            disabled={isLoading}
          >
            {isLoading ? 'Completing...' : 'Complete Quest'}
          </Button>
        ) : onStart ? (
          <Button 
            variant="default" 
            size="sm" 
            className="w-full" 
            onClick={() => onStart(id)}
            disabled={isLoading || hasActiveQuest}
            title={hasActiveQuest ? "You have an active quest already" : ""}
          >
            {isLoading ? 'Starting...' : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Start Quest ({estimatedTime} min)
              </>
            )}
          </Button>
        ) : (
          <Button variant="outline" size="sm" className="w-full">
            View Details
          </Button>
        )}
      </CardFooter>
    </Card>
  );
} 