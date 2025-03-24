import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useState } from "react";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { PageContainer, SectionContainer } from "@/components/layout/containers";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface LeaderboardItem {
  rank: number;
  walletAddress: string;
  username: string;
  questCount: number;
  sumEstimatedTime: number;
}

export default function Leaderboard() {
  const [timeRange, setTimeRange] = useState<'all' | 'day' | 'week' | 'month'>('all');
  
  const { data: leaderboardData, isLoading } = useQuery<LeaderboardItem[]>({
    queryKey: [`/api/leaderboard`, timeRange],
    queryFn: async () => {
      const response = await fetch(`/api/leaderboard?period=${timeRange}`);
      if (!response.ok) {
        throw new Error('Failed to fetch leaderboard data');
      }
      return response.json();
    }
  });

  return (
    <PageContainer>
      <div className="flex flex-col">
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-1">Leaderboard</h1>
          <p className="text-muted-foreground">Top 50 users who have completed the most quests</p>
        </div>
        
        <SectionContainer>
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
              
                <Tabs defaultValue="all" value={timeRange} onValueChange={(value) => setTimeRange(value as any)}>
                  <TabsList>
                    <TabsTrigger value="all">All</TabsTrigger>
                    <TabsTrigger value="day">Day</TabsTrigger>
                    <TabsTrigger value="week">Week</TabsTrigger>
                    <TabsTrigger value="month">Month</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="h-40 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
                </div>
              ) : leaderboardData && leaderboardData.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">Rank</TableHead>
                      <TableHead>Username</TableHead>
                      <TableHead className="text-right">Total Tasks</TableHead>
                      <TableHead className="text-right">Total Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leaderboardData.map((item) => (
                      <TableRow key={item.walletAddress}>
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
                          
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium">{item.questCount}</TableCell>
                        <TableCell className="text-right">{item.sumEstimatedTime}</TableCell>
                        
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  There is no rating data for this time period.
                </div>
              )}
            </CardContent>
          </Card>
        </SectionContainer>
      </div>
    </PageContainer>
  );
}
