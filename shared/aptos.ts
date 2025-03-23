import { AptosClient, Types, HexString } from "aptos";

// Add Petra wallet type definitions
declare global {
  interface Window {
    petra?: {
      connect: () => Promise<{ address: string }>;
      disconnect: () => Promise<void>;
      signAndSubmitTransaction: (transaction: Types.TransactionPayload) => Promise<Types.PendingTransaction>;
    };
  }
}

const NODE_URL = import.meta.env.APTOS_NODE_URL || "https://fullnode.mainnet.aptoslabs.com/v1";
const client = new AptosClient(NODE_URL);

export const CONTRACT_ADDRESS = import.meta.env.CONTRACT_ADDRESS || "";
export const COLLECTION_NAME = "FitQuest Champions";

export async function mintNFT(
  walletAddress: string,
  tokenName: string,
  description: string,
  uri: string
): Promise<Types.TransactionPayload> {
  const payload: Types.TransactionPayload = {
    type: "entry_function_payload",
    function: `${CONTRACT_ADDRESS}::nft::mint`,
    type_arguments: [],
    arguments: [
      COLLECTION_NAME,
      tokenName,
      description,
      uri,
      [], // Property keys
      [], // Property values
      [], // Property types
    ],
  };

  return payload;
}

export async function getNFTBalance(walletAddress: string): Promise<number> {
  try {
    const resource = await client.getAccountResource(
      walletAddress,
      `${CONTRACT_ADDRESS}::nft::NFTBalance`
    );
    return (resource.data as any).balance;
  } catch (error) {
    console.error("Error getting NFT balance:", error);
    return 0;
  }
}

export async function updateNFTStats(
  tokenId: string,
  stats: { strength: number; endurance: number; agility: number }
): Promise<Types.TransactionPayload> {
  const payload: Types.TransactionPayload = {
    type: "entry_function_payload",
    function: `${CONTRACT_ADDRESS}::nft::update_stats`,
    type_arguments: [],
    arguments: [tokenId, stats.strength, stats.endurance, stats.agility],
  };

  return payload;
}