// Tạo store đơn giản cho ứng dụng
import { create } from 'zustand';

interface StoreState {
  walletAddress: string;
  setWalletAddress: (address: string) => void;
}

export const useStore = create<StoreState>((set) => ({
  walletAddress: 'wallet123', // Mock wallet address
  setWalletAddress: (address) => set({ walletAddress: address }),
})); 