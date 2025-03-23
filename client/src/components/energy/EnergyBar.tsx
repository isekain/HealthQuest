import React, { useEffect, useState } from 'react';
import { Progress } from '@/components/ui/progress';
import { Battery, Clock } from 'lucide-react';

interface EnergyBarProps {
  energy: number;
  maxEnergy?: number;
  lastReset?: Date;
  resetTime?: number;
}

const EnergyBar = ({
  energy,
  maxEnergy = 100,
  lastReset,
  resetTime,
}: EnergyBarProps) => {
  const [timeUntilReset, setTimeUntilReset] = useState<string>('');
  const [energyPercent, setEnergyPercent] = useState<number>(0);
  
  useEffect(() => {
    // Calculate energy percentage
    const percent = (energy / maxEnergy) * 100;
    setEnergyPercent(percent);
    
    // Update timer if lastReset is available
    if (lastReset) {
      const updateTimer = () => {
        const now = new Date();
        // Reset happens at midnight
        const nextReset = new Date(now);
        nextReset.setHours(24, 0, 0, 0);
        
        const timeRemaining = nextReset.getTime() - now.getTime();
        const hours = Math.floor(timeRemaining / (1000 * 60 * 60));
        const minutes = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));
        
        setTimeUntilReset(`${hours}h ${minutes}m`);
      };
      
      updateTimer();
      const interval = setInterval(updateTimer, 60000);
      
      return () => clearInterval(interval);
    } else if (resetTime) {
      // If resetTime is provided directly in seconds
      const updateTimer = () => {
        const hours = Math.floor(resetTime / 3600);
        const minutes = Math.floor((resetTime % 3600) / 60);
        
        setTimeUntilReset(`${hours}h ${minutes}m`);
      };
      
      updateTimer();
    }
  }, [energy, maxEnergy, lastReset, resetTime]);
  
  // Determine color based on energy percentage
  const getEnergyColor = () => {
    if (energyPercent >= 75) return 'bg-green-500';
    if (energyPercent >= 50) return 'bg-blue-500';
    if (energyPercent >= 25) return 'bg-yellow-500';
    return 'bg-red-500';
  };
  
  return (
    <div className="w-full space-y-2">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Battery className="h-5 w-5 text-muted-foreground" />
          <span className="font-medium">Energy</span>
        </div>
        <span className="text-sm">
          {energy}/{maxEnergy}
        </span>
      </div>
      
      <div className={`relative w-full h-2 rounded-full bg-gray-200 overflow-hidden`}>
        <div 
          className={`absolute top-0 left-0 h-full ${getEnergyColor()} transition-all duration-300`}
          style={{ width: `${energyPercent}%` }}
        />
      </div>
      
      {timeUntilReset && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>Resets in {timeUntilReset}</span>
        </div>
      )}
    </div>
  );
};

export default EnergyBar; 