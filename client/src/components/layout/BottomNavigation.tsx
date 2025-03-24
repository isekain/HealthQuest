import React from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Home, Swords, Trophy, Award, User, Sword, History } from "lucide-react";

interface BottomNavItemProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
}

const BottomNavItem = ({ to, icon, label, isActive }: BottomNavItemProps) => {
  return (
    <Link 
      to={to} 
      className={cn(
        "flex flex-col items-center justify-center flex-1 px-2 py-1",
        isActive ? "text-primary" : "text-muted-foreground"
      )}
    >
      {icon}
      <span className="text-xs mt-1">{label}</span>
    </Link>
  );
};

export default function BottomNavigation() {
  const { pathname } = useLocation();
  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-background border-t z-50">
      <div className="flex items-center justify-between h-16">
        <BottomNavItem 
          to="/" 
          icon={<Home className="h-5 w-5" />} 
          label="Home" 
          isActive={pathname === "/" || pathname === "/dashboard"}
        />
        
        <BottomNavItem 
          to="/quests" 
          icon={<Swords className="h-5 w-5" />} 
          label="Quests" 
          isActive={pathname === "/quests"}
        />
        
        <BottomNavItem 
          to="/boss-battle" 
          icon={<Sword className="h-5 w-5" />} 
          label="Boss" 
          isActive={pathname === "/boss-battle"}
        />
        
        <BottomNavItem 
          to="/boss-history" 
          icon={<History className="h-5 w-5" />} 
          label="History" 
          isActive={pathname === "/boss-history"}
        />
        
        <BottomNavItem 
          to="/leaderboard" 
          icon={<Trophy className="h-5 w-5" />} 
          label="Leaderboard" 
          isActive={pathname === "/leaderboard"}
        />
        
        
        
        <BottomNavItem 
          to="/profile" 
          icon={<User className="h-5 w-5" />} 
          label="Profile" 
          isActive={pathname === "/profile"}
        />
      </div>
    </div>
  );
} 