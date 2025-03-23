import { useQuery } from "@tanstack/react-query";
import LeaderboardTable from "@/components/leaderboard/LeaderboardTable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User } from "@shared/schema";
import { Trophy } from "lucide-react";

export default function Leaderboard() {
  const { data: users, isLoading } = useQuery<User[]>({
    queryKey: ["/api/leaderboard"],
  });

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Trophy className="h-6 w-6 text-yellow-500" />
            <CardTitle>Leaderboard</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {users && users.length > 0 ? (
            <LeaderboardTable users={users} />
          ) : (
            <p className="text-center text-muted-foreground py-8">
              No users found on the leaderboard yet.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
