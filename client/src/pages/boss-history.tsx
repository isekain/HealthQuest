import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/use-auth';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Coins, Clock, Flame, ChevronDown, ChevronUp } from 'lucide-react';

interface BossAttackHistory {
  id: string;
  bossId: string;
  bossName: string;
  bossLevel: number;
  damage: number;
  rewardsXp: number;
  rewardsGold: number;
  battleDescription: string;
  shortDescription?: string;
  isCritical: boolean;
  specialEffects: string[];
  timestamp: string;
}

export default function BossHistory() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<BossAttackHistory[]>([]);
  const navigate = useNavigate();
  const [expandedBattles, setExpandedBattles] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    const fetchHistory = async () => {
      try {
        console.log("Fetching boss history for wallet:", user.walletAddress);
        const response = await fetch(`/api/users/${user.walletAddress}/boss-history`, {
          headers: {
            "Authorization": `Bearer ${localStorage.getItem("authToken") || ""}`
          }
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch history: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log("Boss history data:", data);
        
        // Validate data
        if (Array.isArray(data)) {
          // Kiểm tra xem dữ liệu có chứa battleDescription không
          const hasBattleDesc = data.some(item => !!item.battleDescription);
          console.log("Data has battle descriptions:", hasBattleDesc);
          
          if (!hasBattleDesc) {
            console.warn("No battle descriptions found in data!");
          }
          
          setHistory(data);
        } else {
          console.error("Invalid data format:", data);
        }
      } catch (error) {
        console.error("Error fetching boss attack history:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [user, navigate]);

  // Hàm toggle hiển thị/ẩn mô tả chi tiết
  const toggleBattleDescription = (battleId: string) => {
    console.log("Toggling battle description for:", battleId);
    const newExpandedBattles = new Set(expandedBattles);
    if (newExpandedBattles.has(battleId)) {
      newExpandedBattles.delete(battleId);
    } else {
      newExpandedBattles.add(battleId);
    }
    setExpandedBattles(newExpandedBattles);
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Battle Log</h1>
        {Array(4).fill(0).map((_, index) => (
          <Card key={index} className="mb-4">
            <CardHeader>
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-60" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-16 w-full" />
            </CardContent>
            <CardFooter>
              <Skeleton className="h-4 w-32" />
            </CardFooter>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Battle Log</h1>

      {history.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-lg text-neutral-500 dark:text-neutral-400">
            Bạn chưa tấn công boss nào. Hãy tham gia chiến đấu để có lịch sử hiển thị ở đây!
          </p>
          <Button 
            className="mt-4"
            onClick={() => navigate('/boss-battle')}
          >
            Đi Đến Trang Boss Battle
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {history.map((entry) => (
            <Card key={entry.id} className="overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-lg">
                    {entry.bossName} <span className="text-sm font-normal">(Lv.{entry.bossLevel})</span>
                  </CardTitle>
                  {entry.isCritical && (
                    <Badge variant="destructive">
                      <Flame className="h-3 w-3 mr-1" /> Chí mạng
                    </Badge>
                  )}
                </div>
                <CardDescription>
                  <Clock className="inline h-3 w-3 mr-1" />
                  {formatDistanceToNow(new Date(entry.timestamp), {
                    addSuffix: true,
                    locale: vi
                  })}
                </CardDescription>
              </CardHeader>

              <CardContent className="pb-2">
                {/* Hiển thị mô tả ngắn khi chưa mở rộng */}
                {!expandedBattles.has(entry.id) && (
                  <p className="text-sm text-neutral-700 dark:text-neutral-300 mb-3">
                    {entry.shortDescription || (entry.battleDescription && entry.battleDescription.length > 50 
                      ? entry.battleDescription.slice(0, 50) + '...' 
                      : entry.battleDescription) || "Không có mô tả"}
                  </p>
                )}
                
                {/* Hiển thị mô tả đầy đủ khi đã mở rộng */}
                {expandedBattles.has(entry.id) && (
                  <div className="prose prose-sm dark:prose-invert mb-3 p-3 bg-neutral-50 dark:bg-neutral-900 rounded-md">
                    {entry.battleDescription ? (
                      <p>{entry.battleDescription}</p>
                    ) : (
                      <p className="italic text-neutral-500">Không có mô tả chi tiết cho trận đấu này.</p>
                    )}
                    
                    {entry.specialEffects && entry.specialEffects.length > 0 && (
                      <div className="mt-2">
                        <h4 className="font-medium text-sm">Hiệu ứng đặc biệt:</h4>
                        <ul className="list-disc pl-5 text-sm">
                          {entry.specialEffects.map((effect, index) => (
                            <li key={index}>{effect}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    <div className="grid grid-cols-3 gap-4 text-center mt-3">
                      <div className="bg-neutral-100 dark:bg-neutral-800 p-2 rounded-md">
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">Sát thương</p>
                        <p className="font-bold">{entry.damage.toLocaleString()}</p>
                      </div>
                      <div className="bg-neutral-100 dark:bg-neutral-800 p-2 rounded-md">
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">XP</p>
                        <div className="font-bold flex items-center justify-center">
                          <Sparkles className="h-3 w-3 text-purple-500 mr-1" />
                          {entry.rewardsXp.toLocaleString()}
                        </div>
                      </div>
                      <div className="bg-neutral-100 dark:bg-neutral-800 p-2 rounded-md">
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">Gold</p>
                        <div className="font-bold flex items-center justify-center">
                          <Coins className="h-3 w-3 text-yellow-500 mr-1" />
                          {entry.rewardsGold.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="flex gap-3 text-sm">
                  <div className="flex items-center">
                    <Badge variant="outline">
                      <span className="font-bold">{entry.damage.toLocaleString()}</span> Sát thương
                    </Badge>
                  </div>
                </div>
              </CardContent>

              <CardFooter className="flex justify-between pt-2">
                <div className="flex items-center gap-2 text-sm">
                  <div className="flex items-center">
                    <Sparkles className="h-4 w-4 text-purple-500 mr-1" />
                    <span>{entry.rewardsXp.toLocaleString()} XP</span>
                  </div>
                  <div className="flex items-center">
                    <Coins className="h-4 w-4 text-yellow-500 mr-1" />
                    <span>{entry.rewardsGold.toLocaleString()} Gold</span>
                  </div>
                </div>

                {/* Nút chuyển đổi hiển thị mô tả */}
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => toggleBattleDescription(entry.id)}
                  className="flex items-center gap-1"
                >
                  {expandedBattles.has(entry.id) ? (
                    <>Thu gọn <ChevronUp className="h-4 w-4" /></>
                  ) : (
                    <>Xem mô tả <ChevronDown className="h-4 w-4" /></>
                  )}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
} 