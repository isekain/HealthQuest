import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Trophy, Medal, Timer, Dumbbell } from "lucide-react";
import { User } from "@shared/schema";

interface LeaderboardTableProps {
  users: User[];
}

export default function LeaderboardTable({ users }: LeaderboardTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-16">Rank</TableHead>
          <TableHead>User</TableHead>
          <TableHead className="text-right">Score</TableHead>
          <TableHead className="text-right">Workouts</TableHead>
          <TableHead className="text-right">Minutes</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.map((user, index) => (
          <TableRow key={user.walletAddress}>
            <TableCell className="font-medium">
              {index + 1 <= 3 ? (
                <span className="flex items-center">
                  {index + 1 === 1 && <Trophy className="h-5 w-5 text-yellow-500" />}
                  {index + 1 === 2 && <Medal className="h-5 w-5 text-gray-400" />}
                  {index + 1 === 3 && <Medal className="h-5 w-5 text-amber-600" />}
                </span>
              ) : (
                index + 1
              )}
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-2">
                <span className="font-medium">{user.username}</span>
                <span className="text-xs text-muted-foreground">
                  {user.walletAddress.slice(0, 6)}...{user.walletAddress.slice(-4)}
                </span>
              </div>
            </TableCell>
            <TableCell className="text-right font-medium">{user.score}</TableCell>
            <TableCell className="text-right">
              <span className="flex items-center justify-end gap-1">
                <Dumbbell className="h-4 w-4 text-muted-foreground" />
                {user.totalWorkouts}
              </span>
            </TableCell>
            <TableCell className="text-right">
              <span className="flex items-center justify-end gap-1">
                <Timer className="h-4 w-4 text-muted-foreground" />
                {user.totalMinutes}
              </span>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
