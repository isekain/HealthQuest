import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Workout, Achievement } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Clock, Check, Brain, Medal } from "lucide-react";

interface WorkoutTaskProps {
  workout: Workout;
}

export default function WorkoutTask({ workout }: WorkoutTaskProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { mutate: completeWorkout, isPending } = useMutation({
    mutationFn: async () => {
      const res = await apiRequest(
        "POST",
        `/api/workouts/${workout.id}/complete`
      );
      return res.json();
    },
    onSuccess: (data: { workout: Workout; newAchievements: Achievement[] }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/users", workout.userId, "workouts"] });

      // Show achievement notifications
      if (data.newAchievements.length > 0) {
        data.newAchievements.forEach((achievement) => {
          toast({
            title: (
              <div className="flex items-center gap-2">
                <Medal className="h-4 w-4 text-yellow-500" />
                New Achievement!
              </div>
            ),
            description: `${achievement.name} - ${achievement.description}`,
          });
        });
      }

      toast({
        title: "Workout Completed",
        description: "Great job! Keep up the good work!",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <Card className={workout.completed ? "bg-muted" : ""}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-medium">
          {workout.type}
          {workout.aiGenerated && (
            <Badge variant="outline" className="ml-2">
              <Brain className="h-3 w-3 mr-1" />
              AI Generated
            </Badge>
          )}
        </CardTitle>
        {workout.completed && (
          <Badge variant="success">
            <Check className="h-3 w-3 mr-1" />
            Completed
          </Badge>
        )}
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">{workout.description}</p>
        <div className="flex items-center justify-between">
          <div className="flex items-center text-sm text-muted-foreground">
            <Clock className="h-4 w-4 mr-1" />
            {workout.duration} minutes
          </div>
          {!workout.completed && (
            <Button
              size="sm"
              onClick={() => completeWorkout()}
              disabled={isPending}
            >
              Complete
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}