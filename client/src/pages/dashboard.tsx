import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Dumbbell, BarChart3, TrendingUp, Check, Swords, Coins, Calendar, Clock, Award, Zap } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { PageContainer, SectionContainer } from "@/components/ui/container";
import { apiRequest } from "@/utils/api";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface NFTStats {
  tokenId?: string;
  level?: number;
  STR?: number;
  AGI?: number;
  VIT?: number;
  DEX?: number;
  INT?: number;
  WIS?: number;
  LUK?: number;
  energy?: number;
  energyLastReset?: string | Date;
  statsPoints?: number;
}

interface UserData {
  gold?: number;
}

interface QuestHistoryItem {
  _id: string;
  userWallet: string;
  questId: string;
  questType: string;
  questTitle: string;
  energyCost: number;
  rewardsXp: number;
  rewardsGold: number;
  category: string;
  difficulty: string;
  estimatedTime: number;
  rewardsItems: string[];
  completedAt: string;
}

interface UpdateStatsParams {
  statsToAdd: {
    STR: number;
    AGI: number;
    VIT: number;
    DEX: number;
    INT: number;
    WIS: number;
    LUK: number;
  };
}

interface UpdateStatsResponse {
  success: boolean;
  message: string;
}

interface QuickStats {
  totalMinutes: number;
  totalQuests: number;
  totalRewardsGold: number;
  totalRewardsXp: number;
  maxStreak: number;
}

type TimeRange = 'day' | 'week' | 'month' | 'all';

function QuestHistoryTable({ history }: { history: QuestHistoryItem[] }) {
  return (
    <div className="rounded-md border overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Quest</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Difficulty</TableHead>
            <TableHead>Time</TableHead>
            <TableHead className="text-right">Rewards</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {history.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground">
                No quest history yet
              </TableCell>
            </TableRow>
          ) : (
            history.map((quest) => (
              <TableRow key={quest._id}>
                <TableCell className="font-medium">{quest.questTitle}</TableCell>
                <TableCell>
                  <Badge variant={quest.questType === 'personal' ? "outline" : "default"}>
                    {quest.questType}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
                    {quest.category}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge 
                    className={
                      quest.difficulty === 'easy' 
                        ? 'bg-green-100 text-green-800 hover:bg-green-100' 
                        : quest.difficulty === 'medium'
                          ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100'
                          : 'bg-red-100 text-red-800 hover:bg-red-100'
                    }
                  >
                    {quest.difficulty}
                  </Badge>
                </TableCell>
                <TableCell>{quest.estimatedTime} min</TableCell>
                <TableCell className="text-right">
                  <span className="text-amber-600">{quest.rewardsGold} Gold</span>{" "}
                  <span className="text-green-600">{quest.rewardsXp} XP</span>
                  {quest.rewardsItems?.length > 0 && (
                    <span className="text-purple-600 block text-xs">
                      +{quest.rewardsItems.join(', ')}
                    </span>
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

function EnergyBar({ energy = 100, maxEnergy = 100, lastReset }: { 
  energy: number; 
  maxEnergy?: number;
  lastReset?: Date;
}) {
  const [timeLeft, setTimeLeft] = useState<string>("");
  
  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      const resetTime = new Date();
      resetTime.setHours(24, 0, 0, 0); 
      
      const diff = resetTime.getTime() - now.getTime();
      if (diff <= 0) return "Ready to reset";

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    };
    
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);
    
    setTimeLeft(calculateTimeLeft());
    
    return () => clearInterval(timer);
  }, [lastReset]);
  
  const percentage = Math.min(100, (energy / maxEnergy) * 100);
  let barColor = "bg-red-500";
  if (percentage > 75) {
    barColor = "bg-green-500";
  } else if (percentage > 50) {
    barColor = "bg-blue-500"; 
  } else if (percentage > 25) {
    barColor = "bg-yellow-500"; 
  } 
  
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center text-xs">
        <span className="font-medium text-blue-600">{energy}/{maxEnergy} Energy</span>
        {timeLeft && (
          <span className="text-gray-500">Reset: {timeLeft}</span>
        )}
      </div>
      <div className="h-2 bg-gray-200 rounded-full w-full">
        <div 
          className={`h-2 ${barColor} rounded-full transition-all`}
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
    </div>
  );
}

function StatRow({ 
  label, 
  value, 
  color, 
  showControls, 
  statPoints,
  addValue,
  removeValue,
  toAdd
}: { 
  label: string; 
  value: number; 
  color: string;
  showControls: boolean;
  statPoints: number;
  addValue: () => void;
  removeValue: () => void;
  toAdd: number;
}) {
  return (
    <div className="flex items-center">
      <div className="w-10 text-muted-foreground">{label}</div>
      <div className="h-2 bg-gray-200 rounded-full flex-1 mr-2">
        <div 
          className={`h-2 ${color} rounded-full`} 
          style={{ width: `${Math.min(100, (value / 30) * 100)}%` }}
        ></div>
      </div>
      <div className="w-8 text-right font-medium">{value}</div>
      {showControls && (
        <div className="flex items-center ml-2">
          <Button 
            variant="outline" 
            size="icon" 
            className="h-6 w-6"
            onClick={removeValue}
            disabled={toAdd <= 0}
          >
            <span>-</span>
          </Button>
          <span className="mx-2 text-xs font-medium w-4 text-center">
            {toAdd}
          </span>
          <Button 
            variant="outline" 
            size="icon" 
            className="h-6 w-6"
            onClick={addValue}
            disabled={statPoints <= 0}
          >
            <span>+</span>
          </Button>
        </div>
      )}
    </div>
  );
}

function QuickStatsSection({ data, timeRange }: { data: QuestHistoryItem[], timeRange: TimeRange }) {
  const filteredData = filterDataByTimeRange(data, timeRange);
  
  const stats = calculateStats(filteredData);
  
  const title = timeRange === 'day' ? 'Today' : 
                timeRange === 'week' ? '7 days ago' : 
                timeRange === 'month' ? '30 days ago' : 'All';
  
  return (
    <Card className="mb-6">
      <CardContent className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">{title}</h3>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex flex-col items-center p-4 bg-blue-50 rounded-lg">
            <Clock className="h-6 w-6 mb-2 text-blue-500" />
            <span className="text-xl font-bold">{stats.totalMinutes}</span>
            <span className="text-sm text-muted-foreground">Training Minutes</span>
          </div>
          
          <div className="flex flex-col items-center p-4 bg-green-50 rounded-lg">
            <Dumbbell className="h-6 w-6 mb-2 text-green-500" />
            <span className="text-xl font-bold">{stats.totalQuests}</span>
            <span className="text-sm text-muted-foreground">Completed Quests</span>
          </div>
          
          <div className="flex flex-col items-center p-4 bg-amber-50 rounded-lg">
            <Coins className="h-6 w-6 mb-2 text-amber-500" />
            <span className="text-xl font-bold">{stats.totalRewardsGold}</span>
            <span className="text-sm text-muted-foreground">Gold</span>
          </div>
          
          <div className="flex flex-col items-center p-4 bg-purple-50 rounded-lg">
            <Zap className="h-6 w-6 mb-2 text-purple-500" />
            <span className="text-xl font-bold">{stats.maxStreak}</span>
            <span className="text-sm text-muted-foreground">Max Streak</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function filterDataByTimeRange(data: QuestHistoryItem[], timeRange: TimeRange): QuestHistoryItem[] {
  const now = new Date();
  
  switch (timeRange) {
    case 'day':
      return data.filter(item => {
        const itemDate = new Date(item.completedAt);
        return itemDate.toDateString() === now.toDateString();
      });
      
    case 'week':
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(now.getDate() - 7);
      return data.filter(item => {
        const itemDate = new Date(item.completedAt);
        return itemDate >= oneWeekAgo;
      });
      
    case 'month':
      const oneMonthAgo = new Date();
      oneMonthAgo.setDate(now.getDate() - 30);
      return data.filter(item => {
        const itemDate = new Date(item.completedAt);
        return itemDate >= oneMonthAgo;
      });
      
    case 'all':
    default:
      return data;
  }
}

function calculateStats(data: QuestHistoryItem[]): QuickStats {
  const totalMinutes = data.reduce((sum, item) => sum + (item.estimatedTime || 0), 0);
  const totalQuests = data.length;
  const totalRewardsGold = data.reduce((sum, item) => sum + (item.rewardsGold || 0), 0);
  const totalRewardsXp = data.reduce((sum, item) => sum + (item.rewardsXp || 0), 0);
  
  let maxStreak = 0;
  
  if (data.length > 0) {
    const sortedData = [...data].sort((a, b) => 
      new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime()
    );
    
    const uniqueDates = new Set(
      sortedData.map(item => new Date(item.completedAt).toDateString())
    );
    const dates = Array.from(uniqueDates).map(dateStr => new Date(dateStr));
    dates.sort((a, b) => a.getTime() - b.getTime());
    
    let currentStreak = 1;
    
    for (let i = 1; i < dates.length; i++) {
      const prevDate = dates[i - 1];
      const currDate = dates[i];
    
      const diffTime = currDate.getTime() - prevDate.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) {
        currentStreak++;
        maxStreak = Math.max(maxStreak, currentStreak);
      } else {
        currentStreak = 1;
      }
    }
    
    maxStreak = Math.max(maxStreak, currentStreak);
  }
  
  return {
    totalMinutes,
    totalQuests,
    totalRewardsGold,
    totalRewardsXp,
    maxStreak
  };
}

export default function Dashboard() {
  const { user } = useAuth();
  const walletAddress = user?.walletAddress;
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [statsToAdd, setStatsToAdd] = useState({
    STR: 0,
    AGI: 0,
    VIT: 0,
    DEX: 0,
    INT: 0,
    WIS: 0,
    LUK: 0
  });
  const [timeRange, setTimeRange] = useState<TimeRange>('week');

  const totalPointsUsed = Object.values(statsToAdd).reduce((sum, current) => sum + current, 0);

  // Fetch NFT stats
  const { 
    data: nftStats, 
    isLoading: statsLoading 
  } = useQuery<NFTStats>({
    queryKey: [`/api/users/${walletAddress}/nft-stats`],
    queryFn: async () => {
      if (!walletAddress) throw new Error("No wallet connected");
      
      return await apiRequest(`/api/users/${walletAddress}/nft-stats`);
    },
    enabled: !!walletAddress
  });

  // Fetch user data (gold)
  const { 
    data: userData, 
    isLoading: isUserLoading 
  } = useQuery<UserData>({
    queryKey: [`/api/users/${walletAddress}`],
    queryFn: async () => {
      if (!walletAddress) throw new Error("No wallet connected");
      
      return await apiRequest(`/api/users/${walletAddress}`);
    },
    enabled: !!walletAddress
  });

  // Fetch quest history
  const { 
    data: questHistoryResponse, 
    isLoading: historyLoading 
  } = useQuery<{
    data: QuestHistoryItem[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  }>({
    queryKey: [`/api/users/${walletAddress}/quest-history`],
    queryFn: async () => {
      if (!walletAddress) throw new Error("No wallet connected");
      
      try {
        const result = await apiRequest(`/api/users/${walletAddress}/quest-history?limit=100`);
        if (Array.isArray(result)) {
          return {
            data: result,
            pagination: {
              total: result.length,
              page: 1,
              limit: 100,
              totalPages: 1
            }
          };
        }
        
        return result;
      } catch (error) {
        console.log("Error fetching quest history:", error);
        return {
          data: [
            {
              _id: "67e0ad8ac1c078ffaf878723",
              userWallet: walletAddress,
              questId: "bd18d91f-d37f-4bc5-a800-cb1232c35996",
              questType: "personal",
              questTitle: "Endurance Boost Quest",
              energyCost: 0,
              rewardsXp: 95,
              rewardsGold: 90,
              category: "cardio",
              difficulty: "easy",
              estimatedTime: 30,
              rewardsItems: ["Endurance Band"],
              completedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
            },
            {
              _id: "67e0ad8ac1c078ffaf878724",
              userWallet: walletAddress,
              questId: "bd18d91f-d37f-4bc5-a800-cb1232c35997",
              questType: "server",
              questTitle: "Strength Challenge",
              energyCost: 10,
              rewardsXp: 150,
              rewardsGold: 120,
              category: "strength",
              difficulty: "medium",
              estimatedTime: 45,
              rewardsItems: [],
              completedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
            },
            {
              _id: "67e0ad8ac1c078ffaf878725",
              userWallet: walletAddress,
              questId: "bd18d91f-d37f-4bc5-a800-cb1232c35998",
              questType: "personal",
              questTitle: "Flexibility Master",
              energyCost: 0,
              rewardsXp: 80,
              rewardsGold: 70,
              category: "flexibility",
              difficulty: "easy",
              estimatedTime: 25,
              rewardsItems: ["Stretch Band"],
              completedAt: new Date().toISOString()
            }
          ],
          pagination: {
            total: 3,
            page: 1,
            limit: 100,
            totalPages: 1
          }
        };
      }
    },
    enabled: !!walletAddress
  });

  const questHistory = questHistoryResponse?.data || [];
 
  const { mutate: updateStats, isPending: isUpdating } = useMutation<
    UpdateStatsResponse, // Response data type
    Error,              // Error type
    void,               // Variables type (void for no params)
    unknown             // Context type
  >({
    mutationFn: async () => {
      if (!walletAddress) throw new Error("No wallet connected");
      
      return await apiRequest(`/api/users/${walletAddress}/nft-stats/update`, {
        method: "POST",
        data: {
          statsToAdd
        }
      });
    },
    onSuccess: () => {
      toast({
        title: "Update stats successfully",
        description: "Your stats have been updated.",
      });
      
      // Reset state
      setStatsToAdd({
        STR: 0,
        AGI: 0,
        VIT: 0,
        DEX: 0,
        INT: 0,
        WIS: 0,
        LUK: 0
      });
      
      // Refresh NFT stats
      queryClient.invalidateQueries({ queryKey: [`/api/users/${walletAddress}/nft-stats`] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Cannot update stats.",
        variant: "destructive",
      });
    }
  });
  
  const increasePoint = (stat: string) => {
    if (nftStats && nftStats.statsPoints && totalPointsUsed < nftStats.statsPoints) {
      setStatsToAdd(prev => ({
        ...prev,
        [stat]: prev[stat as keyof typeof prev] + 1
      }));
    }
  };
  
  const decreasePoint = (stat: string) => {
    if (statsToAdd[stat as keyof typeof statsToAdd] > 0) {
      setStatsToAdd(prev => ({
        ...prev,
        [stat]: prev[stat as keyof typeof prev] - 1
      }));
    }
  };

  if (statsLoading || isUserLoading || historyLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!walletAddress) {
    return (
      <PageContainer>
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              Please connect your wallet to view your dashboard.
            </p>
          </CardContent>
        </Card>
      </PageContainer>
    );
  }

  return (
    <PageContainer title="Overview">
      {nftStats && nftStats.tokenId && (
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="md:w-1/3 flex flex-col items-center">
                <div className="text-sm text-muted-foreground mb-1">Your Info</div>
                <div className="text-2xl font-bold mb-2 flex items-center">
                  <Swords className="h-5 w-5 mr-2 text-primary" />
                  Level {nftStats?.level || 1}
                </div>
                <div className="text-lg font-medium flex items-center text-amber-600 mb-2">
                  <Coins className="h-4 w-4 mr-1" />
                  {userData?.gold || 0} Gold
                </div>
                <div className="w-full">
                  <EnergyBar 
                    energy={nftStats?.energy ?? 0} 
                    maxEnergy={100} 
                    lastReset={nftStats?.energyLastReset ? new Date(nftStats.energyLastReset) : undefined}
                  />
                </div>
                {nftStats?.statsPoints && nftStats.statsPoints > 0 && (
                  <div className="mt-2 text-sm bg-green-100 text-green-800 px-2 py-1 rounded">
                    {nftStats.statsPoints} stat points available
                  </div>
                )}
              </div>
              
              <div className="md:w-2/3">
                <div className="text-sm font-medium mb-2"> Stats</div>
                <div className="space-y-2">
                  <StatRow 
                    label="STR" 
                    value={nftStats?.STR || 10} 
                    color="bg-red-500" 
                    showControls={!!nftStats?.statsPoints && nftStats.statsPoints > 0}
                    statPoints={(nftStats?.statsPoints || 0) - totalPointsUsed}
                    addValue={() => increasePoint('STR')}
                    removeValue={() => decreasePoint('STR')}
                    toAdd={statsToAdd.STR}
                  />
                  
                  <StatRow 
                    label="AGI" 
                    value={nftStats?.AGI || 10} 
                    color="bg-green-500" 
                    showControls={!!nftStats?.statsPoints && nftStats.statsPoints > 0}
                    statPoints={(nftStats?.statsPoints || 0) - totalPointsUsed}
                    addValue={() => increasePoint('AGI')}
                    removeValue={() => decreasePoint('AGI')}
                    toAdd={statsToAdd.AGI}
                  />
                  
                  <StatRow 
                    label="VIT" 
                    value={nftStats?.VIT || 10} 
                    color="bg-blue-500" 
                    showControls={!!nftStats?.statsPoints && nftStats.statsPoints > 0}
                    statPoints={(nftStats?.statsPoints || 0) - totalPointsUsed}
                    addValue={() => increasePoint('VIT')}
                    removeValue={() => decreasePoint('VIT')}
                    toAdd={statsToAdd.VIT}
                  />
                  
                  <StatRow 
                    label="DEX" 
                    value={nftStats?.DEX || 10} 
                    color="bg-yellow-500" 
                    showControls={!!nftStats?.statsPoints && nftStats.statsPoints > 0}
                    statPoints={(nftStats?.statsPoints || 0) - totalPointsUsed}
                    addValue={() => increasePoint('DEX')}
                    removeValue={() => decreasePoint('DEX')}
                    toAdd={statsToAdd.DEX}
                  />
                  
                  <StatRow 
                    label="INT" 
                    value={nftStats?.INT || 10} 
                    color="bg-purple-500" 
                    showControls={!!nftStats?.statsPoints && nftStats.statsPoints > 0}
                    statPoints={(nftStats?.statsPoints || 0) - totalPointsUsed}
                    addValue={() => increasePoint('INT')}
                    removeValue={() => decreasePoint('INT')}
                    toAdd={statsToAdd.INT}
                  />
                  
                  <StatRow 
                    label="WIS" 
                    value={nftStats?.WIS || 10} 
                    color="bg-cyan-500" 
                    showControls={!!nftStats?.statsPoints && nftStats.statsPoints > 0}
                    statPoints={(nftStats?.statsPoints || 0) - totalPointsUsed}
                    addValue={() => increasePoint('WIS')}
                    removeValue={() => decreasePoint('WIS')}
                    toAdd={statsToAdd.WIS}
                  />
                  
                  <StatRow 
                    label="LUK" 
                    value={nftStats?.LUK || 10} 
                    color="bg-pink-500" 
                    showControls={!!nftStats?.statsPoints && nftStats.statsPoints > 0}
                    statPoints={(nftStats?.statsPoints || 0) - totalPointsUsed}
                    addValue={() => increasePoint('LUK')}
                    removeValue={() => decreasePoint('LUK')}
                    toAdd={statsToAdd.LUK}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Phần bộ lọc thời gian */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Activity Stats</h3>
        <div className="w-40">
          <Select value={timeRange} onValueChange={(value: TimeRange) => setTimeRange(value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select time" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Today</SelectItem>
              <SelectItem value="week">7 days ago</SelectItem>
              <SelectItem value="month">30 days ago</SelectItem>
              <SelectItem value="all">All</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      {/* Thống kê nhanh */}
      {questHistory && questHistory.length > 0 ? (
        <QuickStatsSection data={questHistory} timeRange={timeRange} />
      ) : (
        <div className="mb-6">
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-muted-foreground">No quest data yet.</p>
              <p className="text-muted-foreground">Complete some quests to see the stats.</p>
            </CardContent>
          </Card>
        </div>
      )}
      
      {/* Quest History Table */}
      <SectionContainer title="Quest History" icon={<BarChart3 className="h-4 w-4" />}>
        <QuestHistoryTable history={questHistory || []} />
      </SectionContainer>

      {/* Nút cập nhật chỉ số */}
      {totalPointsUsed > 0 && (
        <div className="flex justify-end mt-4">
          <Button 
            onClick={() => updateStats()}
            disabled={isUpdating}
            className="flex items-center"
          >
            <Check className="mr-2 h-4 w-4" />
            Update ({totalPointsUsed}/{nftStats?.statsPoints || 0} points)
          </Button>
        </div>
      )}
    </PageContainer>
  );
}