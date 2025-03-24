import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Toaster } from 'sonner';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { 
  Shield, 
  Sword, 
  Trophy, 
  Skull as SkullIcon, 
  Coins as CoinsIcon, 
  Flame as FlameIcon,
  User as UserIcon,
  Battery,
  BatteryMedium
} from "lucide-react";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageContainer } from "@/components/layout/containers";
import { useAuth } from "@/hooks/use-auth";


interface Boss {
  _id: string;
  name: string;
  description: string;
  imageUrl: string;
  level: number;
  health: number;
  maxHealth: number;
  damage: number;
  defense: number;
  STR: number;
  AGI: number;
  VIT: number;
  DEX: number;
  INT: number;
  rewardsXp: number;
  rewardsGold: number;
  isActive: boolean;
  isDefeated: boolean;
  abilities: string[];
  weaknesses: string[];
  immunities: string[];
  minLevelRequired: number;
}

interface LeaderboardItem {
  rank: number;
  walletAddress: string;
  username: string;
  totalDamage: number;
  totalXpEarned: number;
  totalGoldEarned: number;
  lastAttack: string;
}

interface BossHistoryItem {
  id: string;
  bossId: string;
  bossName: string;
  bossLevel: number;
  damage: number;
  rewardsXp: number;
  rewardsGold: number;
  timestamp: string;
  battleDescription?: string;
}

// Interface cho thông tin của NFT
interface NFTStats {
  level: number;
  strength: number;
  agility: number;
  STR: number;
  AGI: number;
  VIT: number;
  DEX: number;
  INT: number;
  energy: number;
  gold: number;
  xp: number;
  xpToNextLevel: number;
}

export default function BossBattle() {
  const { user } = useAuth();
  const walletAddress = user?.walletAddress;
  const [attackLoading, setAttackLoading] = useState(false);
  const [bossHealth, setBossHealth] = useState<number | null>(null);
  const [expandedBattles, setExpandedBattles] = useState<Set<string>>(new Set());
  const { data: currentBoss, isLoading: bossLoading, refetch: refetchBoss } = useQuery<Boss>({
    queryKey: ["/api/boss/current"],
    queryFn: async () => {
      const response = await fetch("/api/boss/current");
      if (!response.ok) {
        throw new Error("Failed to fetch current boss");
      }
      const data = await response.json();
      setBossHealth(data.health);
      return data;
    },
    enabled: !!walletAddress,
  });
  const { data: playerStats, refetch: refetchPlayerStats } = useQuery<NFTStats>({
    queryKey: ["/api/users/nft-stats", walletAddress],
    queryFn: async () => {
      if (!walletAddress) return null;
      const response = await fetch(`/api/users/${walletAddress}/nft-stats`, {
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("authToken") || ""}`
        }
      });
      if (!response.ok) {
        throw new Error("Failed to fetch NFT stats");
      }
      return response.json();
    },
    enabled: !!walletAddress,
  });
  
  const { data: leaderboard, isLoading: leaderboardLoading } = useQuery<LeaderboardItem[]>({
    queryKey: ["/api/boss/leaderboard", currentBoss?._id],
    queryFn: async () => {
      if (!currentBoss?._id) return [];
      const response = await fetch(`/api/boss/${currentBoss._id}/leaderboard`);
      if (!response.ok) {
        throw new Error("Failed to fetch leaderboard");
      }
      return response.json();
    },
    enabled: !!currentBoss?._id && !!walletAddress,
  });
  
  const { data: bossHistory, isLoading: historyLoading } = useQuery<BossHistoryItem[]>({
    queryKey: ["/api/users/boss-history", walletAddress],
    queryFn: async () => {
      if (!walletAddress) return [];
      const response = await fetch(`/api/users/${walletAddress}/boss-history`);
      if (!response.ok) {
        throw new Error("Failed to fetch boss history");
      }
      return response.json();
    },
    enabled: !!walletAddress,
  });
  
  const attackBoss = async () => {
    if (attackLoading || !currentBoss || !walletAddress) return;
    
    setAttackLoading(true);
    try {
      // Calculate damage based on player level and stats
      let dmg = Math.round(
        (playerStats?.level || 1) * (
          (playerStats?.strength || 0) * 0.5 + 
          (playerStats?.agility || 0) * 0.3
        ) + 10
      );
      
      // Determine critical hit (critical hit)
      const isCritical = Math.random() < 0.25;  
      if (isCritical) {
        dmg = Math.round(dmg * 1.5);  
        toast.success('A critical hit!', {
          icon: <FlameIcon className="h-5 w-5 text-red-500" />,
          duration: 3000
        });
      }
      const response = await fetch(`/api/boss/${currentBoss._id}/attack`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("authToken") || ""}`
        },
        body: JSON.stringify({
          walletAddress,
          damage: dmg
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setBossHealth(Math.max(0, (bossHealth || currentBoss.health) - dmg));
        toast.success(`You caused ${dmg.toLocaleString()} damage to ${currentBoss.name}!`, {
          duration: 1000
        });
        if (data.rewardsXp || data.rewardsGold) {
          toast.success(
            <div>
              <p>Rewards:</p>
              <p>{data.rewardsXp > 0 ? `+${data.rewardsXp.toLocaleString()} XP` : ''}</p>
              <p>{data.rewardsGold > 0 ? `+${data.rewardsGold.toLocaleString()} Gold` : ''}</p>
            </div>,
            { duration: 1000 }
          );
        }
        if (data.levelUp) {
          toast.success(`Congratulations! You have reached level ${data.newLevel}!`, {
            icon: '🎉',
            duration: 1000
          });
        }
        if (data.bossDefeated) {
          toast.success(`You have defeated ${currentBoss.name}!`, {
            icon: '🏆',
            duration: 1000
          });
          refetchBoss();
        }
        if (data.newXp || data.newLevel) {
          refetchPlayerStats();
        }
      } else {
        if (data.error) {
          const errorMessage = typeof data.error === 'string' ? data.error.toLowerCase() : String(data.error).toLowerCase();
          if (errorMessage.includes("not enough gold") || 
              errorMessage.includes("need 100 gold")) {
            toast.error(
              <div>
                <p className="font-bold">Not enough gold!</p>
                <p>You need 100 Gold to attack. Complete tasks to earn more gold.</p>
              </div>,
              {
                icon: <CoinsIcon className="h-5 w-5 text-yellow-500" />,
                duration: 5000
              }
            );
          } else if (errorMessage.includes("không đủ năng lượng") || errorMessage.includes("not enough energy")) {
            toast.error(
              <div>
                <p className="font-bold">Not enough energy!</p>
                <p>You need 10 energy to attack this boss. Wait for energy to recharge or complete quests.</p>
              </div>,
              {
                icon: <BatteryMedium className="h-5 w-5 text-green-500" />,
                duration: 5000
              }
            );
          } else if (errorMessage.includes("level") || errorMessage.includes("level")) {
            toast.error(
              <div>
                <p className="font-bold">Level not enough!</p>
                <p>You need to reach a higher level to fight this boss. Complete tasks to level up.</p>
              </div>,
              {
                icon: <UserIcon className="h-5 w-5 text-blue-500" />,
                duration: 5000
              }
            );
          } else {
            // Đảm bảo hiển thị mọi loại lỗi khác
            toast.error(String(data.error));
          }
        } else {
          toast.error('An error occurred while attacking the boss.');
        }
      }
    } catch (error) {
      console.error('Error attacking boss:', error);
      toast.error('An error occurred while attacking the boss.');
    } finally {
      setAttackLoading(false);
    }
  };
  
  const toggleBattleDescription = (battleId: string) => {
    const newExpandedBattles = new Set(expandedBattles);
    if (newExpandedBattles.has(battleId)) {
      newExpandedBattles.delete(battleId);
    } else {
      newExpandedBattles.add(battleId);
    }
    setExpandedBattles(newExpandedBattles);
  };
  
  if (!walletAddress) {
    return (
      <PageContainer>
        <div className="text-center py-20">
          <h1 className="text-2xl font-bold mb-4">Please connect your wallet to join Boss Battle</h1>
        </div>
      </PageContainer>
    );
  }
  
  return (
    <PageContainer>
      <Toaster position="top-right" richColors />
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-1">Boss Battle</h1>
        <p className="text-muted-foreground">Attack the boss to receive rewards</p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Boss Card */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SkullIcon className="h-5 w-5 text-red-500" />
              {bossLoading ? "Loading..." : currentBoss?.name || "No boss"}
            </CardTitle>
            <CardDescription>
              {bossLoading ? "" : currentBoss ? `Boss Level ${currentBoss.level}` : ""}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {bossLoading ? (
              <div className="animate-pulse flex flex-col gap-4">
                <div className="h-40 bg-gray-200 rounded-md"></div>
                <div className="h-4 bg-gray-200 rounded-md"></div>
                <div className="h-4 bg-gray-200 rounded-md w-3/4"></div>
              </div>
            ) : currentBoss ? (
              <>
                <div className="aspect-square bg-muted rounded-md mb-4 flex items-center justify-center">
                  {currentBoss.imageUrl ? (
                    <img 
                      src={currentBoss.imageUrl} 
                      alt={currentBoss.name} 
                      className="w-full h-full object-cover rounded-md"
                    />
                  ) : (
                    <SkullIcon className="h-20 w-20 text-muted-foreground" />
                  )}
                </div>
                
                <p className="text-sm mb-4">{currentBoss.description}</p>
                
                {/* HP Bar */}
                <div className="mb-4">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium">HP</span>
                    <span className="text-sm">
                      {currentBoss.health.toLocaleString()} / {currentBoss.maxHealth.toLocaleString()}
                    </span>
                  </div>
                  <Progress 
                    value={(currentBoss.health / currentBoss.maxHealth) * 100} 
                    className="h-2.5"
                  />
                </div>
                
                {/* Stats */}
                <div className="grid grid-cols-2 gap-2 mb-4">
                  <div className="flex items-center gap-2">
                    <Sword className="h-4 w-4 text-red-500" />
                    <span className="text-sm">Damage: {currentBoss.damage}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-blue-500" />
                    <span className="text-sm">Defense: {currentBoss.defense}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-purple-500" />
                    <span className="text-sm">XP: {currentBoss.rewardsXp}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CoinsIcon className="h-4 w-4 text-yellow-500" />
                    <span className="text-sm">Gold: {currentBoss.rewardsGold}</span>
                  </div>
                </div>
                
                {/* Abilities and Weaknesses */}
                <div className="space-y-2">
                  {currentBoss.abilities?.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold">Abilities:</h3>
                      <ul className="text-xs list-disc list-inside">
                        {currentBoss.abilities.map((ability, idx) => (
                          <li key={idx}>{ability}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {currentBoss.weaknesses?.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold">Weaknesses:</h3>
                      <ul className="text-xs list-disc list-inside">
                        {currentBoss.weaknesses.map((weakness, idx) => (
                          <li key={idx}>{weakness}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="text-center py-6">
                <p>No active boss</p>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            {/* Player Stats */}
            {playerStats && (
              <div className="w-full grid grid-cols-2 gap-2 text-sm mb-2">
                
                
                <div className="flex items-center gap-1">
                  <Battery className="h-4 w-4 text-green-500" />
                  <span>Energy: {playerStats.energy}/100</span>
                </div>
                <div className="flex items-center gap-1">
                  <Sword className="h-4 w-4 text-red-500" />
                  <span>Attack Cost: -10 Energy, -100 Gold</span>
                </div>
              </div>
            )}
            
            {currentBoss && !currentBoss.isDefeated && (
              <Button 
                variant="destructive"
                size="lg"
                className="w-full"
                onClick={attackBoss}
                disabled={attackLoading || !currentBoss}
              >
                {attackLoading ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Attacking...
                  </span>
                ) : (
                  <>
                    <Sword className="mr-2 h-5 w-5" />
                    Attack Boss
                  </>
                )}
              </Button>
            )}
            
            {currentBoss && currentBoss.isDefeated && (
              <Button variant="outline" disabled className="w-full">
                Boss Defeated
              </Button>
            )}
          </CardFooter>
        </Card>
        
        {/* Leaderboard and History */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="leaderboard">
            <TabsList className="w-full mb-4">
              <TabsTrigger value="leaderboard" className="flex-1">Leaderboard</TabsTrigger>
              <TabsTrigger value="history" className="flex-1">Attack History</TabsTrigger>
            </TabsList>
            
            <TabsContent value="leaderboard">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Leaderboard</CardTitle>
                  <CardDescription>
                    Top 50 players with the most damage
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {leaderboardLoading ? (
                    <div className="h-40 flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                  ) : leaderboard && leaderboard.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-16">Rank</TableHead>
                          <TableHead>Player</TableHead>
                          <TableHead className="text-right">Damage</TableHead>
                          <TableHead className="text-right">XP</TableHead>
                          <TableHead className="text-right">Gold</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {leaderboard.map((item) => (
                          <TableRow key={item.walletAddress} className={
                            item.walletAddress === walletAddress ? "bg-muted/50" : ""
                          }>
                            <TableCell className="font-medium">
                              {item.rank <= 3 ? (
                                <span className="flex items-center justify-center">
                                  {item.rank === 1 && <span className="text-xl text-yellow-500">🏆</span>}
                                  {item.rank === 2 && <span className="text-xl text-gray-400">🥈</span>}
                                  {item.rank === 3 && <span className="text-xl text-amber-600">🥉</span>}
                                </span>
                              ) : (
                                <span className="text-center block">{item.rank}</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{item.username}</span>
                                {item.walletAddress === walletAddress && (
                                  <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-md">You</span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-medium">{item.totalDamage.toLocaleString()}</TableCell>
                            <TableCell className="text-right">{item.totalXpEarned.toLocaleString()}</TableCell>
                            <TableCell className="text-right">{item.totalGoldEarned.toLocaleString()}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">
                        No one has attacked this boss yet.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="history">
              <Card>
               
                <CardContent>
                  {historyLoading ? (
                    <div className="h-40 flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                  ) : bossHistory && bossHistory.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Boss</TableHead>
                          <TableHead className="text-right">Damage</TableHead>
                          <TableHead className="text-right">XP</TableHead>
                          <TableHead className="text-right">Gold</TableHead>
                          <TableHead className="text-right">Time</TableHead>
                          <TableHead className="text-right">Details</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {bossHistory.map((item) => (
                          <React.Fragment key={item.id}>
                            <TableRow>
                              <TableCell>
                                <div className="flex flex-col">
                                  <span className="font-medium">{item.bossName}</span>
                                  <span className="text-xs text-muted-foreground">Level {item.bossLevel}</span>
                                </div>
                              </TableCell>
                              <TableCell className="text-right font-medium">
                                {item.damage.toLocaleString()}
                              </TableCell>
                              <TableCell className="text-right">{item.rewardsXp.toLocaleString()}</TableCell>
                              <TableCell className="text-right">{item.rewardsGold.toLocaleString()}</TableCell>
                              <TableCell className="text-right">
                                <span className="text-xs text-muted-foreground">
                                  {new Date(item.timestamp).toLocaleString()}
                                </span>
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => toggleBattleDescription(item.id)}
                                >
                                  {expandedBattles.has(item.id) ? "Hide" : "View"}
                                </Button>
                              </TableCell>
                            </TableRow>
                            {expandedBattles.has(item.id) && (
                              <TableRow>
                                <TableCell colSpan={6} className="p-0 border-t-0">
                                  <Card className="mx-2 my-2 shadow-sm border border-muted">
                                    <CardHeader className="pb-2">
                                      <CardTitle className="text-lg flex justify-between items-center">
                                        <span>{item.bossName} <span className="text-sm font-normal">(Lv.{item.bossLevel})</span></span>
                                        <Button 
                                          variant="ghost" 
                                          size="sm" 
                                          onClick={() => toggleBattleDescription(item.id)}
                                          className="ml-auto"
                                        >
                                          Close
                                        </Button>
                                      </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                      <div className="prose prose-sm dark:prose-invert mb-3 p-3 bg-muted/50 rounded-md">
                                        {item.battleDescription ? (
                                          <p>{item.battleDescription}</p>
                                        ) : (
                                          <p className="italic text-muted-foreground">Không có mô tả chi tiết cho trận chiến này.</p>
                                        )}
                                      </div>
                                      
                                      <div className="grid grid-cols-3 gap-4 text-center mt-3">
                                        <div className="bg-muted/30 p-2 rounded-md">
                                          <p className="text-xs text-muted-foreground">Damage</p>
                                          <p className="font-bold">{item.damage.toLocaleString()}</p>
                                        </div>
                                        <div className="bg-muted/30 p-2 rounded-md">
                                          <p className="text-xs text-muted-foreground">XP Earned</p>
                                          <div className="font-bold flex items-center justify-center">
                                            <Trophy className="h-3 w-3 text-purple-500 mr-1" />
                                            {item.rewardsXp.toLocaleString()}
                                          </div>
                                        </div>
                                        <div className="bg-muted/30 p-2 rounded-md">
                                          <p className="text-xs text-muted-foreground">Gold Earned</p>
                                          <div className="font-bold flex items-center justify-center">
                                            <CoinsIcon className="h-3 w-3 text-yellow-500 mr-1" />
                                            {item.rewardsGold.toLocaleString()}
                                          </div>
                                        </div>
                                      </div>
                                    </CardContent>
                                  </Card>
                                </TableCell>
                              </TableRow>
                            )}
                          </React.Fragment>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">
                        You have not attacked this boss yet.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </PageContainer>
  );
} 