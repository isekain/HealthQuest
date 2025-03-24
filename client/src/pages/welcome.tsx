import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { useStore } from "@/store";
import { connectWallet } from "@/utils/api";
import { Wallet } from "lucide-react";
import { Link } from "react-router-dom";

export default function Welcome() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const setWalletAddress = useStore((state) => state.setWalletAddress);

  const handleConnect = async () => {
    try {
      const petra = window.aptos;
      
      if (!petra) {
        toast({
          title: "Wallet not found",
          description: "Please install Petra wallet extension",
          variant: "destructive",
        });
        return;
      }
      
      const response = await petra.connect();
      const address = response.address;
    
      const userData = await connectWallet(address);
      setWalletAddress(address);
      window.location.href = "/profile";
    } catch (error) {
      console.error("Failed to connect wallet:", error);
      toast({
        title: "Connection Failed",
        description: "Failed to connect wallet. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex flex-col min-h-screen items-center justify-center p-4 md:p-8">
      <div className="max-w-2xl mx-auto text-center space-y-8">
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
          Welcome to <span className="text-primary">HealthQuest</span>
        </h1>
        
        <p className="text-xl md:text-2xl text-muted-foreground">
          Your journey to better health starts here.
        </p>
        
        <div className="space-y-4 max-w-lg mx-auto">
          <p className="text-muted-foreground">
            HealthQuest combines fitness with Web3 gaming to make your health journey rewarding and engaging.
            Track your progress, earn achievements, and compete on the leaderboard.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-6">
            <div className="bg-muted p-4 rounded-lg">
              <h3 className="font-medium mb-2">Track Progress</h3>
              <p className="text-sm text-muted-foreground">Monitor your fitness journey with detailed analytics</p>
            </div>
            <div className="bg-muted p-4 rounded-lg">
              <h3 className="font-medium mb-2">Complete Quests</h3>
              <p className="text-sm text-muted-foreground">Take on personalized fitness challenges and earn rewards</p>
            </div>
            <div className="bg-muted p-4 rounded-lg">
              <h3 className="font-medium mb-2">Earn NFT Items</h3>
              <p className="text-sm text-muted-foreground">Collect unique digital items that enhance your capabilities</p>
            </div>
          </div>
        </div>
        
        <div className="flex flex-col items-center space-y-4">
          <Button onClick={handleConnect} size="lg" className="w-full md:w-auto">
            <Wallet className="mr-2 h-5 w-5" />
            Connect Wallet to Begin
          </Button>
          
          <p className="text-sm text-muted-foreground">
            Need a wallet? <a href="https://petra.app/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Download Petra Wallet</a>
          </p>
        </div>
      </div>
    </div>
  );
} 