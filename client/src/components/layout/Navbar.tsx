import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from "@/components/ui/sheet";
import { 
  Menu, 
  Brain, 
  Trophy, 
  Award, 
  Wallet, 
  Home, 
  Dumbbell, 
  User,
  Diamond,
  Swords
} from "lucide-react";
import logo from "@/assets/logo.png";
import { connectWallet, disconnectWallet } from "@/utils/api";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "@/lib/queryClient";
import { useStore } from "@/store";

// Menu items
const menuItems = [
  { name: "Home", path: "/", icon: <Home className="h-5 w-5" /> },
  { name: "Dashboard", path: "/dashboard", icon: <Dumbbell className="h-5 w-5" /> },
  { name: "Quests", path: "/quests", icon: <Swords className="h-5 w-5" /> },
  { name: "Achievements", path: "/achievements", icon: <Award className="h-5 w-5" /> },
  { name: "Leaderboard", path: "/leaderboard", icon: <Trophy className="h-5 w-5" /> },
  { name: "NFT", path: "/nft", icon: <Diamond className="h-5 w-5" /> },
  { name: "Profile", path: "/profile", icon: <User className="h-5 w-5" /> },
];

export default function Navbar() {
  const { pathname } = useLocation();
  const [isMobile, setIsMobile] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Lấy state từ store
  const walletAddress = useStore((state: { walletAddress: string }) => state.walletAddress);
  const setWalletAddress = useStore((state: { setWalletAddress: (address: string) => void }) => state.setWalletAddress);

  // Theo dõi sự thay đổi kích thước màn hình
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    handleResize();
    window.addEventListener("resize", handleResize);
    
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  // Kiểm tra xem ví đã được kết nối chưa khi component mount
  useEffect(() => {
    const savedWalletAddress = localStorage.getItem('walletAddress');
    if (savedWalletAddress) {
      setWalletAddress(savedWalletAddress);
    }
  }, [setWalletAddress]);

  // Xử lý kết nối ví
  const handleConnect = async () => {
    try {
      // Kết nối với Petra wallet (Aptos)
      // @ts-ignore - Petra có thể không được định nghĩa trong window
      const petra = window.aptos;
      
      if (!petra) {
        toast({
          title: "Wallet not found",
          description: "Please install Petra wallet extension",
          variant: "destructive",
        });
        return;
      }
      
      // Kết nối ví
      const response = await petra.connect();
      const address = response.address;
      
      // Gọi API connect để lấy token và cập nhật user
      await connectWallet(address);
      
      // Cập nhật state
      setWalletAddress(address);
      
      toast({
        title: "Connected!",
        description: "Wallet connected successfully",
      });
      
      // Chuyển hướng đến trang profile nếu đang ở trang chủ
      if (pathname === "/") {
        navigate("/profile");
      }
    } catch (error) {
      console.error("Failed to connect wallet:", error);
      toast({
        title: "Connection Failed",
        description: "Failed to connect wallet. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  // Xử lý ngắt kết nối ví
  const handleDisconnect = async () => {
    try {
      // Gọi API để invalidate token
      await disconnectWallet();
      
      // Xóa địa chỉ ví khỏi state
      setWalletAddress("");
      
      toast({
        title: "Disconnected",
        description: "Wallet disconnected successfully",
      });
      
      // Chuyển về trang chủ
      navigate("/");
    } catch (error) {
      console.error("Failed to disconnect wallet:", error);
    }
  };

  return (
    <nav className="border-b">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center">
          <Link to="/" className="text-2xl font-bold mr-4">
            FitQuest
          </Link>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex space-x-4">
            {menuItems.slice(1, -1).map((item) => (
              <Link 
                key={item.path}
                to={item.path} 
                className={`flex items-center gap-1 ${pathname === item.path ? "text-primary" : "text-muted-foreground"} hover:text-primary transition-colors`}
              >
                {React.cloneElement(item.icon as React.ReactElement, { className: "h-4 w-4" })}
                <span>{item.name}</span>
              </Link>
            ))}
            <Link 
              to="/profile"
              className={`flex items-center gap-1 ${pathname === "/profile" ? "text-primary" : "text-muted-foreground"} hover:text-primary transition-colors`}
            >
              <User className="h-4 w-4" />
              <span>Profile</span>
            </Link>
          </div>
        </div>

        <div className="flex items-center">
          {/* Wallet Connection Button */}
          {walletAddress ? (
            <div className="hidden md:flex items-center space-x-2">
              <span className="text-sm text-muted-foreground">
                {`${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`}
              </span>
              <Button variant="outline" onClick={handleDisconnect} size="sm">
                <Wallet className="mr-2 h-4 w-4" />
                Disconnect
              </Button>
            </div>
          ) : (
            <Button onClick={handleConnect} size="sm" className="hidden md:flex">
              <Wallet className="mr-2 h-4 w-4" />
              Connect Wallet
            </Button>
          )}
          
          {/* Mobile Menu Button */}
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80">
              <SheetHeader className="pb-6">
                <SheetTitle className="text-2xl">FitQuest</SheetTitle>
              </SheetHeader>
              
              <div className="flex flex-col space-y-4 mt-8">
                {menuItems.map((item) => (
                  <SheetClose asChild key={item.path}>
                    <Link 
                      to={item.path}
                      className={`flex items-center gap-3 p-2 rounded-md ${pathname === item.path ? "bg-muted text-primary" : "hover:bg-muted"} transition-colors`}
                      onClick={() => setIsOpen(false)}
                    >
                      {item.icon}
                      <span className="font-medium">{item.name}</span>
                    </Link>
                  </SheetClose>
                ))}
              </div>
              
              <div className="mt-auto pt-6 border-t flex flex-col space-y-4">
                {walletAddress ? (
                  <>
                    <div className="text-sm text-muted-foreground px-2">
                      {`Wallet: ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`}
                    </div>
                    <Button onClick={handleDisconnect} variant="outline" className="w-full">
                      <Wallet className="mr-2 h-4 w-4" />
                      Disconnect
                    </Button>
                  </>
                ) : (
                  <Button onClick={handleConnect} className="w-full">
                    <Wallet className="mr-2 h-4 w-4" />
                    Connect Wallet
                  </Button>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  );
}