// Tạo auth đơn giản cho ứng dụng
import { create } from 'zustand';

interface AuthState {
  user: {
    isAdmin: boolean;
    [key: string]: any;
  };
  setUser: (user: any) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: { isAdmin: false },
  setUser: (user) => set({ user }),
}));

export const useAuth = () => {
  const { user } = useAuthStore();
  return { user };
}; 