import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Toaster } from 'sonner';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Zap, Dumbbell, Heart, Brain, Trophy, Plus, Clock, CheckCircle } from 'lucide-react';
import { PageContainer, SectionContainer } from '@/components/layout/containers';
import { QuestCard } from '@/components/ui/QuestCard';
import { EnergyBar } from '@/components/layout/EnergyBar';
import { useAuth } from "@/hooks/use-auth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Temporary interface definitions to fix TypeScript errors
interface Reward {
  xp: number;
  gold: number;
  items?: string[];
}

interface Quest {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: string;
  objective: string;
  target: number;
  unit: string;
  progress?: number;
  rewards: Reward;
  energyCost: number;
  completed: boolean;
  expiresAt: string;
  timeLeft: number;
  locked?: boolean;
  type: 'server' | 'personal';
  startedAt?: string;
  active?: boolean;
  estimatedTime?: number;
  workoutDetails?: { section: string; duration: number; exercises: { name: string; time: string; description: string }[] }[];
}

// Create a Loading component if it doesn't exist
const Loading = ({ size = "md" }: { size?: "sm" | "md" | "lg" }) => {
  const sizeClass = size === "sm" ? "h-4 w-4" : size === "lg" ? "h-8 w-8" : "h-6 w-6";
  return (
    <div className="flex justify-center items-center">
      <div className={`animate-spin rounded-full ${sizeClass} border-b-2 border-primary`}></div>
    </div>
  );
};

export default function QuestsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const walletAddress = user?.walletAddress;
  const [serverQuests, setServerQuests] = useState<Quest[]>([]);
  const [personalQuests, setPersonalQuests] = useState<Quest[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [questLimit, setQuestLimit] = useState(false);
  const [currentEnergy, setCurrentEnergy] = useState(0);
  const [maxEnergy, setMaxEnergy] = useState(100);
  const [hasActiveQuest, setHasActiveQuest] = useState(false);
  const [activeQuest, setActiveQuest] = useState<Quest | null>(null);
  const [questLoading, setQuestLoading] = useState({
    start: false,
    complete: false,
    generate: false,
    questId: null
  });
  const [activeQuestTimeLeft, setActiveQuestTimeLeft] = useState(0);
  const [activeQuestProgress, setActiveQuestProgress] = useState(0);
  const [tabValue, setTabValue] = useState<string>('personal');

  const fetchQuests = async () => {
    setLoading(true);
    try {
      
      const personalResponse = await fetch(`/api/quests/personal?walletAddress=${walletAddress}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken') || ''}`,
          'Content-Type': 'application/json',
        }
      });
      const energyResponse = await fetch(`/api/users/${walletAddress}/nft-stats`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken') || ''}`,
          'Content-Type': 'application/json',
        }
      });
    
      if (personalResponse.ok) {
        const personalData = await personalResponse.json();
        setPersonalQuests(personalData);
        
        // Check if any quest is active
        const active = personalData.find((q: Quest) => q.active);
        if (active) {
          setHasActiveQuest(true);
          setActiveQuest(active);
        }
        
        // Check if reached quest limit
        if (personalData.length >= 5) {
          setQuestLimit(true);
        }
      }
    
      const energyData = await energyResponse.json();
      console.log(energyData);
      if (energyResponse.ok) {
        setCurrentEnergy(energyData.energy);
        
      }
    } catch (error) {
      console.error('Error fetching quests:', error);
      toast.error('Failed to load quests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (walletAddress) {
      fetchQuests();
    }
  }, [walletAddress]);

  useEffect(() => {
    if (!activeQuest || !activeQuest.estimatedTime || !activeQuest.startedAt) return;
    
    const startTime = new Date(activeQuest.startedAt).getTime();
    const estimatedTimeMs = (activeQuest.estimatedTime || 30) * 60 * 1000;
    const endTime = startTime + estimatedTimeMs;
    
    const updateTimer = () => {
      const now = new Date().getTime();
      const timeLeft = Math.max(0, Math.floor((endTime - now) / 1000));
      setActiveQuestTimeLeft(timeLeft);
      
      // Calculate progress percentage
      const elapsed = now - startTime;
      const progressPercent = Math.min(100, Math.floor((elapsed / estimatedTimeMs) * 100));
      setActiveQuestProgress(progressPercent);
    };
    
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    
    return () => clearInterval(interval);
  }, [activeQuest, hasActiveQuest]);

  // Format time to MM:SS
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
  };

  const generatePersonalQuest = async () => {
    if (questLimit) {
      toast.error('You already have 5 personal quests');
      return;
    }
    
    if (currentEnergy < 25) {
      toast.error('Not enough energy to generate a quest');
      return;
    }
    
    setGenerating(true);
    try {
      const response = await fetch('/api/quests/personal', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken') || ''}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ walletAddress }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setTimeout(() => {
          toast.success(`🎉 Quest generated!`);
        }, 150);
        setCurrentEnergy(data.currentEnergy);
        setPersonalQuests([...personalQuests, data.quest]);
        if (personalQuests.length + 1 >= 5) {
          setQuestLimit(true);
        }
      } else {
        toast.error(data.error || 'Failed to generate quest');
      }
    } catch (error) {
      console.error('Error generating quest:', error);
      toast.error('Failed to generate quest');
    } finally {
      setGenerating(false);
    }
  };

  const onCompleteQuest = async (questId: string) => {
    setQuestLoading({ start: false, complete: true, generate: false, questId: null });
    try {
      const response = await fetch(`/api/quests/${questId}/complete-active`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken') || ''}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ walletAddress }),
      });
      
      const data = await response.json();
      console.log('Response status:', response.status);
      console.log('Response data:', data);
      
      if (response.status === 200) {
        setTimeout(() => {
          toast.success(`🎉 Quest completed! Earned ${data.rewards.xp} XP and ${data.rewards.gold} gold, ${data.rewards.items?.length} chest, ${data.rewards.statsPoints} statsPoints`);
        }, 300);
        
        if (data.levelUp) {
          toast.success('🎉 You leveled up!');
        }
        
        // Update personal quests list
        setPersonalQuests(personalQuests.map(q => 
          q.id === questId ? { ...q, completed: true, active: false } : q
        ));
        
        setHasActiveQuest(false);
        setActiveQuest(null);
        setCurrentEnergy(data.currentEnergy);
      } else {
        
        toast.error(data.error || 'Failed to complete quest');
      }
    } catch (error) {
     
      toast.error('Failed to complete quest');
    } finally {
      setQuestLoading({ start: false, complete: false, generate: false, questId: null });
    }
  };

  const onStartQuest = async (questId: string) => {
    if (hasActiveQuest) {
      toast.error('You already have an active quest');
      return;
    }
    
    setQuestLoading({ start: true, complete: false, generate: false, questId:null});
    try {
      const response = await fetch(`/api/quests/${questId}/start`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken') || ''}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ walletAddress }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setTimeout(() => {
          toast.success(`Quest started!`);
        }, 150);
        // Update personal quests list
        const updatedQuests = personalQuests.map(q => 
          q.id === questId ? { ...q, active: true, startedAt: data.quest.startedAt } : q
        );
        
        setPersonalQuests(updatedQuests);
        setHasActiveQuest(true);
        setActiveQuest(data.quest);
      } else {
        toast.error(data.error || 'Failed to start quest');
      }
    } catch (error) {
      console.error('Error starting quest:', error);
      toast.error('Failed to start quest');
    } finally {
      setQuestLoading({ start: false, complete: false, generate: false, questId: null });
    }
  };

  const calculateTimeLeft = (quest: Quest) => {
    if (!quest.startedAt || !quest.estimatedTime) return 0;
    
    const startTime = new Date(quest.startedAt).getTime();
    const endTime = startTime + (quest.estimatedTime * 60 * 1000);
    const now = Date.now();
    
    if (now >= endTime) return 0;
    return Math.floor((endTime - now) / 1000);
  };

  async function handleCompleteServerQuest(quest: Quest) {
    try {
    
      const response = await fetch(`/api/quests/${quest.id}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ walletAddress }),
      });
      
      const data = await response.json();
      console.log('Server quest response:', response.status, data);
      
      if (response.ok) {
        
        setTimeout(() => {
          toast.success(`🎉 Quest completed! Earned ${data.rewards.xp} XP and ${data.rewards.gold} gold, ${data.rewards.items?.length} chest, ${data.rewards.statsPoints} statsPoints`);
        }, 300);
        
        if (data.levelUp) {
          toast.success('🎉 You leveled up!');
        }
        
        // Update server quests list
        setServerQuests(serverQuests.map(q => 
          q.id === quest.id ? { ...q, completed: true } : q
        ));
        
        setCurrentEnergy(data.currentEnergy);
      } else {
        
        toast.error(data.error || 'Failed to complete quest');
      }
    } catch (error) {
     
      toast.error('Failed to complete quest');
    }
  }

  function getCategoryVariant(category: string) {
    switch (category.toLowerCase()) {
      case 'strength':
        return 'default';
      case 'cardio':
        return 'destructive';
      case 'flexibility':
        return 'secondary';
      case 'nutrition':
        return 'outline';
      case 'mental':
        return 'secondary';
      default:
        return 'default';
    }
  }

    return (
      <PageContainer>
      <Toaster position="top-right" richColors />
      <div className="flex flex-col md:flex-row justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Quests</h1>
          <p className="text-muted-foreground">Complete quests to earn XP and gold</p>
        </div>
        <EnergyBar 
          energy={currentEnergy} 
          maxEnergy={maxEnergy} 
        />
      </div>
      
      {loading ? (
        <Loading />
      ) : (
        <Tabs defaultValue="personal" className="w-full">
          <TabsList className="w-full mb-6">
            <TabsTrigger value="personal" className="flex-1">Personal Quests</TabsTrigger>
            <TabsTrigger value="server" className="flex-1">Server Quests</TabsTrigger>
          </TabsList>
          
          <TabsContent value="personal">
            <SectionContainer>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Personal Quests</h2>
                <Button 
                  onClick={generatePersonalQuest} 
                  disabled={generating || questLimit || currentEnergy < 25 || hasActiveQuest}
                  size="sm"
                >
                  {generating ? (
                    <>
                      <Loading size="sm" />
                      <span className="ml-2">Generating...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Generate Quest (25 <Zap className="h-3 w-3 inline" />)
                    </>
                  )}
                </Button>
              </div>
              
              {hasActiveQuest && activeQuest && (
                <div className="mb-4">
                  <Card className="border-2 border-primary">
                    <CardHeader>
                      <div className="flex justify-between items-center">
                        <CardTitle className="text-lg">{activeQuest.title}</CardTitle>
                        <Badge variant="secondary">Active Quest</Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="mb-2">{activeQuest.description}</p>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium">{activeQuest.objective}</span>
                        <span className="text-sm font-medium flex items-center">
                          <Clock className="h-4 w-4 mr-1" />
                          {formatTime(activeQuestTimeLeft)}
                        </span>
                      </div>
                      <div className="mt-2">
                        <Progress value={activeQuestProgress} rainbow={true} className="h-2" />
                      </div>
                      
                      {/* Workout Details Section */}
                      {activeQuest.workoutDetails && activeQuest.workoutDetails.length > 0 && (
                        <div className="mt-4 rounded-md bg-muted p-3">
                          <h3 className="text-sm font-semibold mb-2">Workout Details</h3>
                          <div className="space-y-3">
                            {activeQuest.workoutDetails.map((section, idx) => (
                              <div key={idx} className="bg-background rounded-md p-2">
                                <div className="font-medium text-sm border-b pb-1 mb-2">
                                  {section.section} ({section.duration} mins)
                                </div>
                                <div className="space-y-2">
                                  {section.exercises.map((exercise, exIdx) => (
                                    <div key={exIdx} className="border-l-2 border-primary/50 pl-2">
                                      <div className="flex justify-between">
                                        <span className="font-medium text-sm">{exercise.name}</span>
                                        <span className="text-xs">{exercise.time}</span>
                                      </div>
                                      <p className="text-xs text-muted-foreground">{exercise.description}</p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      <div className="flex justify-between items-center mt-4">
                        <span className="text-sm">Rewards: {activeQuest.rewards.xp} XP, {activeQuest.rewards.gold} gold, {activeQuest.rewards.items?.length} chest</span>
                        <Button 
                          onClick={() => onCompleteQuest(activeQuest.id)}
                          disabled={(questLoading.complete && questLoading.questId === activeQuest.id) || activeQuestTimeLeft > 0}
                          size="sm"
                        >
                          {questLoading.complete && questLoading.questId === activeQuest.id ? (
                            <>
                              <Loading size="sm" />
                              <span className="ml-2">Completing...</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Complete Quest
                            </>
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
              
              {personalQuests.length === 0 ? (
                <Card>
                  <CardContent className="py-6">
                    <p className="text-center text-muted-foreground">No personal quests available. Generate one to get started.</p>
                  </CardContent>
                </Card>
              ) : personalQuests
                  .filter(quest => !quest.active && !quest.completed)
                  .length === 0 && hasActiveQuest ? (
                <Card>
                  <CardContent className="py-6">
                    <p className="text-center text-muted-foreground">No other quests available. Complete your active quest first.</p>
                  </CardContent>
                </Card>  
              ) : personalQuests
                  .filter(quest => !quest.active && !quest.completed)
                  .length === 0 && !hasActiveQuest ? (
                <Card>
                  <CardContent className="py-6">
                    <p className="text-center text-muted-foreground">No uncompleted quests available. Generate a new quest.</p>
                  </CardContent>
                </Card>  
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {personalQuests
                    .filter(quest => !quest.active && !quest.completed)
                    .map(quest => (
                  <QuestCard 
                    key={quest.id} 
                        {...quest}
                        hasActiveQuest={hasActiveQuest}
                        onStart={hasActiveQuest ? undefined : () => onStartQuest(quest.id)}
                        isLoading={questLoading.start && questLoading.questId === quest.id}
                        disabled={hasActiveQuest}
                        className={hasActiveQuest ? 'opacity-50' : ''}
                  />
                ))}
              </div>
              )}
            </SectionContainer>
          </TabsContent>
          
          <TabsContent value="server">
            <SectionContainer>
              <h2 className="text-xl font-semibold mb-4">Server Quests</h2>
              {serverQuests.length === 0 ? (
                <Card>
                  <CardContent className="py-6">
                    <p className="text-center text-muted-foreground">No server quests available at this time.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {serverQuests.map(quest => (
                    <Card key={quest.id} className={quest.completed ? 'opacity-70' : ''}>
                <CardHeader>
                        <div className="flex justify-between">
                          <CardTitle className="text-lg">{quest.title}</CardTitle>
                          <Badge variant={getCategoryVariant(quest.category)}>{quest.category}</Badge>
                        </div>
                        <CardDescription>{quest.difficulty} • {quest.energyCost} <Zap className="h-3 w-3 inline" /></CardDescription>
                </CardHeader>
                <CardContent>
                        <p className="mb-4">{quest.description}</p>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm font-medium">{quest.objective}</span>
                          <span className="text-sm">{quest.target} {quest.unit}</span>
                        </div>
                        <Progress value={quest.completed ? 100 : 0} className="h-2 mt-1" />
                        <div className="flex items-center justify-between mt-4">
                          <div className="flex items-center space-x-4">
                            <div className="flex items-center">
                              <Trophy className="h-4 w-4 mr-1 text-yellow-500" />
                              <span className="text-sm">{quest.rewards.xp} XP</span>
                            </div>
                            <div className="flex items-center">
                              <span className="text-sm font-medium text-yellow-500 mr-1">⦿</span>
                              <span className="text-sm">{quest.rewards.gold} gold</span>
                            </div>
                          </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button 
                          variant={quest.completed ? "outline" : "default"} 
                    className="w-full"
                          disabled={quest.completed || currentEnergy < quest.energyCost}
                          onClick={() => handleCompleteServerQuest(quest)}
                        >
                          {quest.completed ? (
                            'Completed'
                          ) : currentEnergy < quest.energyCost ? (
                            'Not enough energy'
                          ) : (
                            `Complete (${quest.energyCost} energy)`
                          )}
                  </Button>
                </CardFooter>
                    </Card>
                  ))}
                </div>
              )}
            </SectionContainer>
          </TabsContent>
        </Tabs>
      )}
    </PageContainer>
  );
} 