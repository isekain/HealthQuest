import { Achievement } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import * as Icons from "lucide-react";
import { cn } from "@/lib/utils";

interface AchievementCardProps {
  achievement: Achievement;
  className?: string;
}

export default function AchievementCard({ achievement, className }: AchievementCardProps) {
  // Dynamically get the icon component from lucide-react
  const Icon = Icons[achievement.iconName as keyof typeof Icons] || Icons.Award;

  return (
    <Card className={cn("relative overflow-hidden transition-all hover:scale-105", className)}>
      <CardContent className="p-6 flex items-center gap-4">
        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
          <Icon className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold">{achievement.name}</h3>
          <p className="text-sm text-muted-foreground">{achievement.description}</p>
          <p className="text-xs text-muted-foreground mt-1">
            Unlocked: {new Date(achievement.unlockedAt).toLocaleDateString()}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
