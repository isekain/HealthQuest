import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useStore } from "@/store";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Shield, ChevronRight } from "lucide-react";
import { queryClient } from "@/lib/queryClient";
import { useEffect } from "react";
import { apiRequest } from "@/utils/api";

interface NFTStats {
  tokenId?: string;
  str: number;
  agi: number;
  vit: number;
  dex: number;
  int: number;
  wis: number;
  luk: number;
  level: number;
  exp: number;
  energy: number;
}

export default function MintNFT() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();
  const walletAddress = useStore((state) => state.walletAddress);

  // Check if user already has an NFT
  const { data: nftStats, isLoading: checkingNFT } = useQuery<NFTStats>({
    queryKey: [`/api/users/${walletAddress}/nft-stats`],
    enabled: !!walletAddress,
  });
  
  // Redirect if user already has NFT
  useEffect(() => {
    if (nftStats && nftStats.tokenId) {
      navigate("/dashboard");
    }
  }, [nftStats, navigate]);

  // Mint NFT mutation
  const { mutate: mintNFT, isPending: isMinting } = useMutation({
    mutationFn: async () => {
      if (!walletAddress) throw new Error("No wallet connected");
      
      try {
        // Generate a unique token ID
        const tokenId = `token-${Date.now()}`;
        const response = await apiRequest("/api/users/mint-nft", {
          method: "POST",
          data: {
            walletAddress,
            tokenId,
          }
        });
        
        return response;
      } catch (error) {
        console.error("Mint NFT error:", error);
        if (error instanceof Error) {
          throw error;
        } else if (typeof error === 'object' && error !== null && 'message' in error) {
          throw new Error(String(error.message));
        }
        throw new Error("An unknown error occurred");
      }
    },
    onSuccess: () => {
      toast({
        title: "NFT Minted",
        description: "Your Champion NFT has been minted successfully!",
      });
      
      // Refresh user data to get updated nftTokenId
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: [`/api/users/${walletAddress}/nft-stats`] });
      
      // Navigate to dashboard
      toast({
        title: "Redirecting",
        description: "You will be redirected to dashboard in 3 seconds...",
      });
      setTimeout(() => {
        navigate("/dashboard");
      }, 1500);
    },
    onError: (error: Error) => {
      toast({
        title: "Minting Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const handleMint = () => {
    mintNFT();
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Create Your Champion</CardTitle>
          <CardDescription>
            Mint your NFT to start your fitness journey
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="bg-muted rounded-lg p-6 text-center">
            <div className="flex justify-center mb-4">
              <Shield className="h-16 w-16 text-primary" />
            </div>
            <h3 className="text-lg font-medium mb-2">HealthQuest Champion</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Your NFT Champion will earn experience, level up, and gain new abilities
              as you complete fitness quests and achieve your health goals.
            </p>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <div className="text-primary font-medium">STR</div>
                <div className="text-sm">10</div>
              </div>
              <div>
                <div className="text-primary font-medium">AGI</div>
                <div className="text-sm">10</div>
              </div>
              <div>
                <div className="text-primary font-medium">VIT</div>
                <div className="text-sm">10</div>
              </div>
              <div>
                <div className="text-primary font-medium">DEX</div>
                <div className="text-sm">10</div>
              </div>
              <div>
                <div className="text-primary font-medium">INT</div>
                <div className="text-sm">10</div>
              </div>
              <div>
                <div className="text-primary font-medium">WIS</div>
                <div className="text-sm">10</div>
              </div>
            </div>
          </div>
          
          <div className="text-sm text-muted-foreground text-center">
            <p>Your NFT will evolve based on your fitness activity and quest completion.</p>
          </div>
        </CardContent>
        
        <CardFooter>
          <Button 
            onClick={handleMint} 
            disabled={isMinting || checkingNFT} 
            className="w-full"
          >
            {isMinting || checkingNFT ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isMinting ? "Minting NFT..." : "Checking..."}
              </>
            ) : (
              <>
                Mint Champion NFT
                <ChevronRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
} 