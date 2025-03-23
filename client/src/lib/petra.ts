import { Types } from "aptos";
import { apiRequest } from "./queryClient";

// Define type for Petra wallet
declare global {
  interface Window {
    petra?: {
      connect: () => Promise<{ address: string }>;
      disconnect: () => Promise<void>;
      signAndSubmitTransaction: (transaction: Types.TransactionPayload) => Promise<Types.PendingTransaction>;
      signMessage: (message: string) => Promise<{ signature: string; fullMessage: string }>;
    };
  }
}

export async function connectWallet(): Promise<string> {
  try {
    if (!window.petra) {
      throw new Error("Petra wallet is not installed");
    }

    // Connect wallet
    const response = await window.petra.connect();
    const walletAddress = response.address;
    
    try {
      // After successful connection, sign message for authentication
      await authenticateWithSignature(walletAddress);
    } catch (authError) {
      console.error("Authentication failed, continuing without token:", authError);
      // Continue without authentication token
    }
    
    return walletAddress;
  } catch (error: any) {
    throw new Error(`Failed to connect wallet: ${error.message}`);
  }
}

// Function to authenticate with signature and create token
async function authenticateWithSignature(walletAddress: string): Promise<void> {
  try {
    if (!window.petra) {
      throw new Error("Petra wallet is not installed");
    }
    
    // Create message to sign
    const timestamp = Date.now();
    const message = `Sign in to FitQuest with wallet address: ${walletAddress}\nTimestamp: ${timestamp}`;
    
    // Check if signMessage exists
    if (typeof window.petra.signMessage !== 'function') {
      throw new Error("Wallet does not support signMessage method");
    }
    
    // Sign message
    const { signature } = await window.petra.signMessage(message);
    
    // Send signature to server for verification and get token
    const response = await apiRequest("/api/auth/verify-signature", {
      method: "POST",
      data: {
        walletAddress,
        message,
        signature,
        timestamp
      }
    });
    
    // Save token to localStorage
    if (response && response.token) {
      localStorage.setItem('authToken', response.token);
      console.log("Authentication successful");
    } else {
      throw new Error("Failed to authenticate: No token received");
    }
  } catch (error: any) {
    console.error("Authentication failed:", error);
    throw error;
  }
}

export async function signAndSubmitTransaction(
  transaction: Types.TransactionPayload
): Promise<Types.PendingTransaction> {
  try {
    if (!window.petra) {
      throw new Error("Petra wallet is not installed");
    }

    const pendingTransaction = await window.petra.signAndSubmitTransaction(transaction);
    return pendingTransaction;
  } catch (error: any) {
    throw new Error(`Transaction failed: ${error.message}`);
  }
}

export async function signMessage(message: string): Promise<string> {
  try {
    if (!window.petra) {
      throw new Error("Petra wallet is not installed");
    }
    
    // Check if signMessage method exists
    if (typeof window.petra.signMessage !== 'function') {
      throw new Error("Wallet does not support signMessage method");
    }
    
    const { signature } = await window.petra.signMessage(message);
    return signature;
  } catch (error: any) {
    throw new Error(`Message signing failed: ${error.message}`);
  }
}

export async function disconnect(): Promise<void> {
  if (window.petra) {
    await window.petra.disconnect();
    // Remove token on logout
    localStorage.removeItem('authToken');
  }
}
