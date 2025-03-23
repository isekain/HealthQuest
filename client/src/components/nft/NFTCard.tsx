import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { NFTStats } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface NFTCardProps {
  stats: NFTStats;
  tokenId: string;
  onStatIncrease?: (stat: string) => void;
  statsPoints?: number;
}

export default function NFTCard({ stats, tokenId, onStatIncrease, statsPoints = 0 }: NFTCardProps) {
  const [expandedSection, setExpandedSection] = useState<string | null>("base");

  const statLabels: Record<string, string> = {
    STR: "Strength",
    AGI: "Agility",
    VIT: "Vitality",
    DEX: "Dexterity",
    INT: "Intelligence",
    WIS: "Wisdom",
    LUK: "Luck",
  };

  const renderStatBar = (stat: string, value: number) => {
    const label = statLabels[stat] || stat;
    
    return (
      <div key={stat}>
        <div className="flex justify-between items-center mb-1">
          <span className="text-sm font-medium">{label}</span>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{value}</span>
            {statsPoints > 0 && onStatIncrease && (
              <button 
                onClick={() => onStatIncrease(stat)}
                className="text-xs text-primary hover:text-primary/80"
              >
                <PlusCircle className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
        <Progress 
          value={value * 2} // Scale to percentage (since max is 50 for display)
          className="h-2"
        />
      </div>
    );
  };

  return (
    <Card className="w-full max-w-md overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg">Champion #{tokenId}</CardTitle>
          <div className="text-sm font-medium bg-primary/10 text-primary px-2 py-1 rounded">
            Level {stats.level || 1}
          </div>
        </div>
      </CardHeader>
      
      {/* Energy Section */}
      <CardContent className="pb-0">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium">Energy</span>
          <span className="text-sm text-muted-foreground">{stats.energy || 0}/100</span>
        </div>
        <Progress 
          value={stats.energy || 0} 
          className={cn("h-3 mt-1", 
            (stats.energy || 0) > 75 ? "bg-green-500" : 
            (stats.energy || 0) > 50 ? "bg-blue-500" : 
            (stats.energy || 0) > 25 ? "bg-yellow-500" : 
            "bg-red-500"
          )}
        />
        
        <div className="flex justify-between text-xs text-muted-foreground mt-1">
          <span>Resets at 00:00</span>
          <span>Used for quests</span>
        </div>
      </CardContent>
      
      <CardContent className="pb-0 pt-2">
        <div className="flex justify-between mb-1">
          <span className="text-sm font-medium">XP</span>
          <span className="text-sm text-muted-foreground">
            {stats.xp || 0}/{stats.xpToNextLevel || 100}
          </span>
        </div>
        <Progress 
          value={((stats.xp || 0) / (stats.xpToNextLevel || 100)) * 100} 
          className={cn("h-2", "bg-green-500")}
        />
        {statsPoints > 0 && (
          <div className="mt-2 text-sm text-center font-medium text-primary">
            {statsPoints} Stat Points Available
          </div>
        )}
      </CardContent>
      
      <div className="px-6 py-2">
        <Separator />
      </div>
      
      {/* Stats Section */}
      <CardContent>
        <div className="space-y-3">
          <div className="flex gap-2 mb-2">
            <Button 
              variant={expandedSection === "base" ? "default" : "outline"} 
              size="sm" 
              onClick={() => setExpandedSection("base")}
              className="flex-1 h-8 text-xs"
            >
              Base Stats
            </Button>
            <Button 
              variant={expandedSection === "details" ? "default" : "outline"} 
              size="sm" 
              onClick={() => setExpandedSection("details")}
              className="flex-1 h-8 text-xs"
            >
              Details
            </Button>
          </div>
          
          {expandedSection === "base" && (
            <div className="space-y-3">
              {renderStatBar("STR", stats.STR || 10)}
              {renderStatBar("AGI", stats.AGI || 10)}
              {renderStatBar("VIT", stats.VIT || 10)}
              {renderStatBar("DEX", stats.DEX || 10)}
              {renderStatBar("INT", stats.INT || 10)}
              {renderStatBar("WIS", stats.WIS || 10)}
              {renderStatBar("LUK", stats.LUK || 10)}
            </div>
          )}
          
          {expandedSection === "details" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-muted/50 rounded p-2">
                  <div className="text-xs text-muted-foreground">Total Quests</div>
                  <div className="text-lg font-medium">0</div>
                </div>
                <div className="bg-muted/50 rounded p-2">
                  <div className="text-xs text-muted-foreground">Items</div>
                  <div className="text-lg font-medium">0</div>
                </div>
                <div className="bg-muted/50 rounded p-2">
                  <div className="text-xs text-muted-foreground">Gold</div>
                  <div className="text-lg font-medium">0</div>
                </div>
                <div className="bg-muted/50 rounded p-2">
                  <div className="text-xs text-muted-foreground">Rarity</div>
                  <div className="text-lg font-medium text-green-500">Common</div>
                </div>
              </div>
              
              <div className="text-xs text-muted-foreground">
                Minted on: {new Date(stats.lastUpdated || new Date()).toLocaleDateString()}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
