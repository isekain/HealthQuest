import React from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Home, Swords, Trophy, Award, User } from "lucide-react";

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

  // Chỉ hiển thị trên thiết bị di động
  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-background border-t z-50">
      <div className="flex items-center justify-between h-16">
        <BottomNavItem 
          to="/" 
          icon={<Home className="h-5 w-5" />} 
          label="Trang chủ" 
          isActive={pathname === "/" || pathname === "/dashboard"}
        />
        
        <BottomNavItem 
          to="/quests" 
          icon={<Swords className="h-5 w-5" />} 
          label="Quests" 
          isActive={pathname === "/quests"}
        />
        
        <BottomNavItem 
          to="/leaderboard" 
          icon={<Trophy className="h-5 w-5" />} 
          label="Xếp hạng" 
          isActive={pathname === "/leaderboard"}
        />
        
        <BottomNavItem 
          to="/achievements" 
          icon={<Award className="h-5 w-5" />} 
          label="Thành tựu" 
          isActive={pathname === "/achievements"}
        />
        
        <BottomNavItem 
          to="/profile" 
          icon={<User className="h-5 w-5" />} 
          label="Hồ sơ" 
          isActive={pathname === "/profile"}
        />
      </div>
    </div>
  );
} 