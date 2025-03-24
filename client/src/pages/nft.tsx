import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import NFTCard from "@/components/nft/NFTCard";
import { Button } from "@/components/ui/button";
import { mintNFT } from "@shared/aptos";
import { signAndSubmitTransaction } from "@/lib/petra";
import { useToast } from "@/hooks/use-toast";
import { ShoppingBag, ShoppingCart, Swords, Coins, AlertCircle } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
import { PageContainer, SectionContainer } from "@/components/ui/container";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { useState } from "react";
import { apiRequest } from "@/utils/api";
import { NFTItem } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Component để hiển thị item trong inventory
function InventoryItem({ 
  item, 
  onEquip,
  onSell 
}: { 
  item: NFTItem; 
  onEquip: (itemId: string) => void;
  onSell: (itemId: string) => void;
}) {
  // Tính bonuses của item
  const bonuses = Object.entries(item.bonuses || {})
    .map(([stat, value]) => `${stat} +${value}`)
    .join(", ");
  
  // State để show modal xác nhận bán
  const [showSellModal, setShowSellModal] = useState(false);
  
  // Xác định giá bán (80% giá trị)
  const sellPrice = item.price ? Math.floor(item.price * 0.8) : 0;

  return (
    <Card className={`overflow-hidden ${
      item.rarity === 'common' ? 'border-slate-400' :
      item.rarity === 'uncommon' ? 'border-green-500' :
      item.rarity === 'rare' ? 'border-blue-500' :
      item.rarity === 'epic' ? 'border-purple-500' :
      'border-orange-500'
    }`}>
      <CardHeader className={`py-2 ${
        item.rarity === 'common' ? 'bg-slate-100' :
        item.rarity === 'uncommon' ? 'bg-green-100' :
        item.rarity === 'rare' ? 'bg-blue-100' :
        item.rarity === 'epic' ? 'bg-purple-100' :
        'bg-orange-100'
      }`}>
        <div className="flex justify-between items-center">
          <CardTitle className="text-sm font-medium">
            {item.name}
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            {item.type}
          </Badge>
        </div>
        <CardDescription className="text-xs capitalize">
          {item.rarity}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4">
        <div className="text-xs text-muted-foreground mb-2">
          {bonuses || 'No bonuses'}
        </div>
        
        {item.price > 0 && (
          <div className="text-xs text-amber-600 mb-2">
            Price: {Math.floor(item.price * 0.8)} gold (80% of original price)
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between gap-2 p-2">
        <Button 
          size="sm" 
          variant={item.isEquipped ? "default" : "outline"}
          className="flex-1"
          onClick={() => onEquip(item.itemId)}
        >
          {item.isEquipped ? "Unequip" : "Equip"}
        </Button>
        <Button 
          size="sm" 
          variant="outline"
          className="flex-1"
          disabled={item.isEquipped}
          onClick={() => setShowSellModal(true)}
        >
          {item.isEquipped ? "Need to unequip first" : "Sell"}
        </Button>
        
        {showSellModal && (
          <Dialog open={showSellModal} onOpenChange={setShowSellModal}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Sell Item</DialogTitle>
                <DialogDescription>
                  Are you sure you want to sell "{item.name}" for {sellPrice} gold {sellPrice > 0 ? "(80% of original price)" : "(0 gold because it has no original price)"}?
                </DialogDescription>
              </DialogHeader>
              <div className="flex justify-end gap-4 mt-4">
                <Button variant="outline" onClick={() => setShowSellModal(false)}>
                  Cancel
                </Button>
                <Button onClick={() => {
                  onSell(item.itemId);
                  setShowSellModal(false);
                }}>
                  Confirm
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </CardFooter>
    </Card>
  );
}

// Component để hiển thị item trong marketplace
function MarketplaceItem({ item, onBuy, userGold }: { 
  item: NFTItem & { price: number }; 
  onBuy: (itemId: string) => void;
  userGold: number;
}) {
  const rarityColors = {
    common: "bg-slate-200 text-slate-800",
    uncommon: "bg-green-100 text-green-800",
    rare: "bg-blue-100 text-blue-800",
    epic: "bg-purple-100 text-purple-800",
    legendary: "bg-amber-100 text-amber-800",
  };

  const rarityColor = rarityColors[item.rarity as keyof typeof rarityColors] || rarityColors.common;
  const canAfford = userGold >= item.price;

  return (
    <Card className={`overflow-hidden transition-all hover:shadow-md ${!canAfford ? "opacity-60" : ""}`}>
      <div className={`h-1 w-full ${rarityColor.split(" ")[0]}`}></div>
      <CardHeader className="p-4 pb-2">
        <div className="flex justify-between items-start">
          <CardTitle className="text-sm">{item.name}</CardTitle>
          <Badge variant="outline" className={rarityColor}>
            {item.rarity}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0 space-y-3">
        <div className="text-xs text-muted-foreground capitalize">
          {item.type}
        </div>
        
        {/* Bonuses */}
        <div className="space-y-1">
          {item.bonuses && Object.entries(item.bonuses).map(([stat, bonus]) => (
            <div key={stat} className="flex justify-between text-xs">
              <span>{stat}</span>
              <span className="text-green-600">+{bonus}</span>
            </div>
          ))}
        </div>
        
        <div className="flex items-center justify-between mt-2 font-medium">
          <span className={`flex items-center ${!canAfford ? "text-red-500" : "text-amber-600"}`}>
            <Coins className="h-4 w-4 mr-1" />
            {item.price}
          </span>
          <Button 
            size="sm" 
            variant={canAfford ? "default" : "outline"}
            onClick={() => onBuy(item.itemId)}
            disabled={!canAfford}
            title={!canAfford ? "Not enough gold" : ""}
          >
            {!canAfford ? (
              <>
                <AlertCircle className="h-4 w-4 mr-1" />
                Not enough gold
              </>
            ) : (
              "Buy"
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function NFT() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const walletAddress = user?.walletAddress;
  const [activeTab, setActiveTab] = useState("inventory");
  
  // Fetch user data (for gold balance)
  const { data: userData } = useQuery({
    queryKey: [`/api/users/${walletAddress}`],
    enabled: !!walletAddress,
  });
  
  // Fetch NFT stats
  const { data: nftStats, isLoading: statsLoading } = useQuery({
    queryKey: [`/api/users/${walletAddress}/nft-stats`],
    enabled: !!walletAddress,
  });
  
  // Fetch inventory
  const { data: inventory, isLoading: inventoryLoading } = useQuery<NFTItem[]>({
    queryKey: [`/api/users/${walletAddress}/nft-items`],
    enabled: !!walletAddress,
  });
  
  // Mock marketplace data
  const marketplaceItems = [
    {
      id: 101,
      itemId: "helmet-002",
      type: "helmet",
      name: "Gladiator Helm",
      rarity: "rare",
      price: 500,
      bonuses: {
        STR: 2,
        VIT: 3,
        DEX: 1
      },
      imageUrl: ""
    },
    {
      id: 102,
      itemId: "weapon-001",
      type: "weapon",
      name: "Training Sword",
      rarity: "uncommon",
      price: 300,
      bonuses: {
        STR: 3,
        AGI: 1
      },
      imageUrl: ""
    },
    {
      id: 103,
      itemId: "armor-002",
      type: "armor",
      name: "Knight's Plate",
      rarity: "rare",
      price: 600,
      bonuses: {
        VIT: 4,
        STR: 1,
        DEX: 1
      },
      imageUrl: ""
    },
    {
      id: 104,
      itemId: "accessory-001",
      type: "accessory",
      name: "Runner's Amulet",
      rarity: "uncommon",
      price: 250,
      bonuses: {
        AGI: 3,
        DEX: 1
      },
      imageUrl: ""
    }
  ];
  
  // Mutation để trang bị item
  const { mutate: equipItem } = useMutation({
    mutationFn: async (itemId: string) => {
      if (!user?.walletAddress) throw new Error("No wallet connected");
      
      return await apiRequest(`/api/users/${user.walletAddress}/nft-items/equip`, {
        method: "POST",
        data: { itemId }
      });
    },
    onSuccess: (data) => {
      console.log("Equipment success:", data);
      
      // Hiển thị thông báo thành công
      toast({
        title: data.equipped ? "Item equipped" : "Item unequipped",
        description: data.message,
      });
      
      // Cập nhật lại dữ liệu của inventory và NFT stats
      queryClient.invalidateQueries({ queryKey: [`/api/users/${user?.walletAddress}/nft-items`] });
      queryClient.invalidateQueries({ queryKey: [`/api/users/${user?.walletAddress}/nft-stats`] });
      
      // Hiển thị thông tin thay đổi chỉ số
      if (data.statsUpdated && Object.keys(data.statsUpdated).length > 0) {
        const statChanges = Object.entries(data.statsUpdated)
          .map(([stat, value]) => `${stat} ${value > 0 ? '+' : ''}${value}`)
          .join(', ');
        
        toast({
          title: "Stats updated",
          description: `${statChanges}`,
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to equip item",
        variant: "destructive",
      });
    }
  });
  
  // Sell item mutation
  const { mutate: sellItem } = useMutation({
    mutationFn: async (itemId: string) => {
      if (!walletAddress) throw new Error("No wallet connected");
      
      // API call to sell item
      return await apiRequest(`/api/users/${walletAddress}/nft-items/sell`, {
        method: "POST",
        data: {
          itemId
        }
      });
    },
    onSuccess: (data) => {
      toast({
        title: "Item Sold",
        description: `You received ${data.goldReceived} gold for your item.`,
      });
      
      // Refresh inventory data, NFT stats, and user gold
      queryClient.invalidateQueries({ queryKey: [`/api/users/${walletAddress}/nft-items`] });
      queryClient.invalidateQueries({ queryKey: [`/api/users/${walletAddress}/nft-stats`] });
      queryClient.invalidateQueries({ queryKey: [`/api/users/${walletAddress}`] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Sell",
        description: error.message || "Failed to sell item",
        variant: "destructive",
      });
    }
  });

  // Buy item mutation
  const { mutate: buyItem, isPending: isBuying } = useMutation({
    mutationFn: async (itemId: string) => {
      if (!walletAddress) throw new Error("No wallet connected");
      
      // API call to buy item
      return await apiRequest("/api/marketplace/buy", {
        method: "POST",
        data: {
          walletAddress,
          itemId
        }
      });
    },
    onSuccess: (data) => {
      toast({
        title: "Item Purchased",
        description: "Your item has been added to your inventory!",
      });
      
      // Refresh inventory data and user gold
      queryClient.invalidateQueries({ queryKey: [`/api/users/${walletAddress}/nft-items`] });
      queryClient.invalidateQueries({ queryKey: [`/api/users/${walletAddress}`] });
      
      console.log("Purchase successful:", data);
    },
    onError: (error: any) => {
      if (error.message === "Insufficient gold") {
        toast({
          title: "Not Enough Gold",
          description: "You don't have enough gold to purchase this item.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Purchase Failed",
          description: error.message || "Failed to buy item",
          variant: "destructive",
        });
      }
    }
  });

  if (statsLoading || inventoryLoading) {
    return (
      <PageContainer>
        <div className="flex justify-center items-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </PageContainer>
    );
  }

  if (!walletAddress) {
    return (
      <PageContainer>
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              Please connect your wallet to view your NFTs.
            </p>
          </CardContent>
        </Card>
      </PageContainer>
    );
  }

  if (!nftStats?.tokenId) {
    return (
      <PageContainer>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground mb-4">
              You need to mint a Champion NFT first to access your inventory.
            </p>
            <Button onClick={() => window.location.href = "/mint-nft"}>
              Mint NFT
            </Button>
          </CardContent>
        </Card>
      </PageContainer>
    );
  }

  const userGold = userData?.gold || 0;

  return (
    <PageContainer title="NFT Inventory">
      {/* Gold display */}
      <div className="flex justify-end mb-4">
        <div className="font-medium text-lg flex items-center text-amber-600 bg-amber-50 px-3 py-1 rounded-md">
          <Coins className="h-5 w-5 mr-2" />
          <span>{userGold} Gold</span>
        </div>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="w-full">
          <TabsTrigger value="inventory" className="flex items-center gap-2 flex-1">
            <ShoppingBag className="h-4 w-4" />
            <span>Inventory</span>
          </TabsTrigger>
          <TabsTrigger value="marketplace" className="flex items-center gap-2 flex-1">
            <ShoppingCart className="h-4 w-4" />
            <span>Marketplace</span>
          </TabsTrigger>
        </TabsList>
        
        {/* Inventory Tab */}
        <TabsContent value="inventory">
          <SectionContainer 
            title="Your Inventory" 
            description="Items and equipment for your champion"
          >
            {inventory && inventory.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {inventory.map(item => (
                  <InventoryItem 
                    key={item.itemId} 
                    item={item} 
                    onEquip={equipItem}
                    onSell={sellItem}
                  />
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-6 text-center">
                  <p className="text-muted-foreground">
                    Your inventory is empty. Visit the Marketplace to buy items!
                  </p>
                </CardContent>
              </Card>
            )}
          </SectionContainer>
        </TabsContent>
        
        {/* Marketplace Tab */}
        <TabsContent value="marketplace">
          <SectionContainer 
            title="NFT Marketplace" 
            description="Buy equipment to enhance your champion's abilities"
          >
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {marketplaceItems.map(item => (
                <MarketplaceItem 
                  key={item.itemId} 
                  item={item} 
                  onBuy={buyItem}
                  userGold={userGold}
                />
              ))}
            </div>
          </SectionContainer>
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
}