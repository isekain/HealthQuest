import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Zap, Clock } from 'lucide-react';

interface EnergyBarProps {
  energy: number;
  maxEnergy: number;
  lastReset?: Date;
}

export const EnergyBar: React.FC<EnergyBarProps> = ({
  energy,
  maxEnergy,
  lastReset,
}) => {
  const [percentage, setPercentage] = useState(0);
  const [color, setColor] = useState('bg-green-500');
  const [timeToReset, setTimeToReset] = useState<string>('');

  useEffect(() => {
    // Calculate percentage
    const calculatedPercentage = Math.min(Math.max((energy / maxEnergy) * 100, 0), 100);
    setPercentage(calculatedPercentage);

    // Set color based on energy percentage
    if (calculatedPercentage >= 75) {
      setColor('bg-green-500');
    } else if (calculatedPercentage >= 50) {
      setColor('bg-blue-500');
    } else if (calculatedPercentage >= 25) {
      setColor('bg-yellow-500');
    } else {
      setColor('bg-red-500');
    }

    // Calculate time to reset (midnight)
    const calculateResetTime = () => {
      const now = new Date();
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);

      const diff = tomorrow.getTime() - now.getTime();
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      setTimeToReset(`${hours}h ${minutes}m`);
    };

    calculateResetTime();
    const timer = setInterval(calculateResetTime, 60000); // Update every minute

    return () => clearInterval(timer);
  }, [energy, maxEnergy]);

  return (
    <Card className="min-w-[200px]">
      <CardContent className="p-4">
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center">
            <Zap className="h-4 w-4 text-yellow-500 mr-1" />
            <span className="text-sm font-medium">Energy</span>
          </div>
          <span className="text-sm font-medium">{energy}/{maxEnergy}</span>
        </div>
        <Progress 
          value={percentage} 
          className={`h-2 ${color}`}
        />
        <div className="flex items-center justify-end mt-1">
          <Clock className="h-3 w-3 text-muted-foreground mr-1" />
          <span className="text-xs text-muted-foreground">Resets in {timeToReset}</span>
        </div>
      </CardContent>
    </Card>
  );
};

export default EnergyBar; 