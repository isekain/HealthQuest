import { create } from 'zustand';

interface StoreState {
  walletAddress: string;
  setWalletAddress: (address: string) => void;
}

export const useStore = create<StoreState>((set) => ({
  walletAddress: localStorage.getItem('walletAddress') || '',
  setWalletAddress: (address: string) => set({ walletAddress: address }),
})); 