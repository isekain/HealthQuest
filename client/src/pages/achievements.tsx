import { useQuery } from "@tanstack/react-query";
import AchievementCard from "@/components/achievements/AchievementCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Achievement } from "@shared/schema";
import { Award } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export default function Achievements() {
  const { user } = useAuth();
  const walletAddress = user?.walletAddress;

  const { data: achievements, isLoading } = useQuery<Achievement[]>({
    queryKey: [`/api/users/${walletAddress}/achievements`],
    enabled: !!walletAddress,
  });

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!walletAddress) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              Please connect your wallet to view your achievements.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Award className="h-6 w-6 text-primary" />
            <CardTitle>Your Achievements</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {achievements && achievements.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {achievements.map((achievement) => (
                <AchievementCard
                  key={achievement.id}
                  achievement={achievement}
                />
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              Complete workouts to unlock achievements!
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
