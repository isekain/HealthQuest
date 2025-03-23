import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import WorkoutTask from "@/components/workouts/WorkoutTask";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Workout } from "@shared/schema";
import { Dumbbell, TrendingUp, Swords, Coins, BarChart3, Plus, Check } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { PageContainer, SectionContainer } from "@/components/ui/container";
import { apiRequest } from "@/utils/api";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import NFTCard from "@/components/nft/NFTCard";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

// Thêm định nghĩa kiểu dữ liệu cho progress
interface ProgressAnalysis {
  performance: number;
  suggestions: string[];
}

// Component để hiển thị lịch sử quest
function QuestHistoryTable({ history }: { history: any[] }) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Quest</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Energy</TableHead>
            <TableHead className="text-right">Rewards</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {history.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-muted-foreground">
                No quest history yet
              </TableCell>
            </TableRow>
          ) : (
            history.map((quest) => (
              <TableRow key={quest.id}>
                <TableCell className="font-medium">{quest.questTitle}</TableCell>
                <TableCell>
                  <Badge variant={quest.questType === 'personal' ? "outline" : "default"}>
                    {quest.questType}
                  </Badge>
                </TableCell>
                <TableCell>{quest.energyCost}</TableCell>
                <TableCell className="text-right">
                  <span className="text-amber-600">{quest.rewardsGold} Gold</span> +{" "}
                  <span className="text-green-600">{quest.rewardsXp} XP</span>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

// Component hiển thị thanh năng lượng
function EnergyBar({ energy = 100, maxEnergy = 100, lastReset }: { 
  energy: number; 
  maxEnergy?: number;
  lastReset?: Date;
}) {
  const [timeLeft, setTimeLeft] = useState<string>("");
  
  useEffect(() => {
    // Tính toán thời gian reset (giả sử reset lúc 00:00 mỗi ngày)
    const calculateTimeLeft = () => {
      const now = new Date();
      const resetTime = new Date();
      resetTime.setHours(24, 0, 0, 0); // Đặt thời gian 00:00:00 của ngày mai
      
      const diff = resetTime.getTime() - now.getTime();
      
      // Nếu đã quá thời gian reset
      if (diff <= 0) return "Ready to reset";
      
      // Tính giờ, phút, giây còn lại
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    };
    
    // Cập nhật thời gian mỗi giây
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);
    
    // Khởi tạo giá trị ban đầu
    setTimeLeft(calculateTimeLeft());
    
    return () => clearInterval(timer);
  }, [lastReset]);
  
  // Tính phần trăm năng lượng
  const percentage = Math.min(100, (energy / maxEnergy) * 100);
  
  // Xác định màu dựa trên phần trăm năng lượng
  let barColor = "bg-red-500";
  if (percentage > 75) {
    barColor = "bg-green-500"; // Xanh lá khi >= 75%
  } else if (percentage > 50) {
    barColor = "bg-blue-500"; // Xanh dương khi >= 50%
  } else if (percentage > 25) {
    barColor = "bg-yellow-500"; // Vàng khi >= 25%
  } // Đỏ khi < 25%
  
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

// Component cho một chỉ số (stat row) với nút tăng/giảm
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
            -
          </Button>
          <span className="mx-2 text-xs font-medium text-green-600">
            {toAdd > 0 ? `+${toAdd}` : ''}
          </span>
          <Button 
            variant="outline" 
            size="icon" 
            className="h-6 w-6"
            onClick={addValue}
            disabled={statPoints <= 0}
          >
            +
          </Button>
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const walletAddress = user?.walletAddress;
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // State để lưu trữ điểm chỉ số đang tăng
  const [statsToAdd, setStatsToAdd] = useState({
    STR: 0,
    AGI: 0,
    VIT: 0,
    DEX: 0,
    INT: 0,
    WIS: 0,
    LUK: 0
  });
  
  // Tính tổng điểm đã phân bổ
  const totalPointsUsed = Object.values(statsToAdd).reduce((sum, val) => sum + val, 0);

  const { data: workouts, isLoading } = useQuery<Workout[]>({
    queryKey: [`/api/users/${walletAddress}/workouts`],
    enabled: !!walletAddress,
  });

  const { data: progress } = useQuery<ProgressAnalysis>({
    queryKey: ["/api/ai/analyze-progress"],
    enabled: !!workouts?.length,
  });
  
  // Fetch NFT stats
  const { data: nftStats, isLoading: statsLoading } = useQuery({
    queryKey: [`/api/users/${walletAddress}/nft-stats`],
    enabled: !!walletAddress,
  });
  
  // Fetch user data (for gold balance)
  const { data: userData } = useQuery({
    queryKey: [`/api/users/${walletAddress}`],
    enabled: !!walletAddress,
  });
  
  // Fetch quest history
  const { data: questHistory, isLoading: historyLoading } = useQuery({
    queryKey: [`/api/users/${walletAddress}/quest-history`],
    enabled: !!walletAddress,
    // Mock data for history
    placeholderData: []
  });

  // Mutation để cập nhật chỉ số
  const { mutate: updateStats, isLoading: isUpdating } = useMutation({
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
        title: "Cập nhật chỉ số thành công",
        description: "Các chỉ số của bạn đã được cập nhật.",
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
        title: "Lỗi",
        description: error.message || "Không thể cập nhật chỉ số.",
        variant: "destructive",
      });
    }
  });
  
  // Các hàm xử lý tăng/giảm điểm
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

  if (isLoading || statsLoading || historyLoading) {
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
              Please connect your wallet to view your workouts.
            </p>
          </CardContent>
        </Card>
      </PageContainer>
    );
  }

  return (
    <PageContainer title="Dashboard">
      {/* NFT overview section at the top */}
      {nftStats && nftStats.tokenId && (
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="md:w-1/3 flex flex-col items-center">
                <div className="text-sm text-muted-foreground mb-1">Your Champion</div>
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
                {nftStats?.statsPoints > 0 && (
                  <div className="mt-2 text-sm bg-green-100 text-green-800 px-2 py-1 rounded">
                    {nftStats.statsPoints} stat points available
                  </div>
                )}
              </div>
              
              <div className="md:w-2/3">
                <div className="text-sm font-medium mb-2">Champion Stats</div>
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
      
      {/* Responsive grid - 1 column on mobile, 2 columns on tablet and above */}
      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <SectionContainer title="Your Workouts">
            <div className="space-y-4">
              {workouts?.length ? (
                workouts.map((workout) => (
                  <WorkoutTask key={workout.id} workout={workout} />
                ))
              ) : (
                <Card>
                  <CardContent className="p-6 text-center">
                    <p className="text-muted-foreground">No workouts found. Create your first workout!</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </SectionContainer>
          
          <div className="mt-6">
            <SectionContainer title="Quest History" icon={<BarChart3 className="h-4 w-4" />}>
              <QuestHistoryTable history={questHistory || []} />
            </SectionContainer>
          </div>
        </div>

        <div className="space-y-6">
          <SectionContainer title="Progress Analysis">
            <Card>
              <CardContent className="pt-6">
                {progress ? (
                  <>
                    <div className="text-3xl font-bold mb-4">
                      {progress.performance}% Performance
                    </div>
                    <div className="space-y-2">
                      {progress.suggestions.map((suggestion: string, i: number) => (
                        <p key={i} className="text-sm text-muted-foreground">
                          • {suggestion}
                        </p>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="text-muted-foreground">Complete workouts to see progress analysis.</p>
                )}
              </CardContent>
            </Card>
          </SectionContainer>

          <SectionContainer title="Quick Stats">
            <Card>
              <CardContent className="pt-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <div className="text-2xl font-bold">
                      {workouts?.filter((w) => w.completed).length || 0}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Completed Workouts
                    </div>
                  </div>
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <div className="text-2xl font-bold">
                      {workouts?.reduce((acc, w) => acc + (w.completed ? w.duration : 0), 0) || 0}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Total Minutes
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </SectionContainer>
        </div>
      </div>

      {/* Nút cập nhật chỉ số */}
      {totalPointsUsed > 0 && (
        <div className="flex justify-end mt-4">
          <Button 
            onClick={() => updateStats()}
            disabled={isUpdating}
            className="flex items-center"
          >
            <Check className="mr-2 h-4 w-4" />
            Cập nhật ({totalPointsUsed}/{nftStats?.statsPoints || 0} điểm)
          </Button>
        </div>
      )}
    </PageContainer>
  );
}