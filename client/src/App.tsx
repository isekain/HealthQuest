import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "./components/ui/toaster";
import NotFound from "./pages/not-found";
import Dashboard from "./pages/dashboard";
import Profile from "./pages/profile";
import NFT from "./pages/nft";
import Leaderboard from "./pages/leaderboard";
import Achievements from "./pages/achievements";
import Navbar from "./components/layout/Navbar";
import BottomNavigation from "./components/layout/BottomNavigation";
import { AuthProvider } from "./hooks/use-auth";
import Quests from "./pages/quests";
import { useAuth } from "./hooks/use-auth";
import { useState, useEffect } from "react";
import { useStore } from "./store";
import Welcome from "./pages/welcome";
import MintNFT from "./pages/mint-nft";
import BossBattle from "./pages/boss-battle";

// ProtectedRoute component to check conditions before rendering route
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const walletAddress = useStore((state) => state.walletAddress);

  // If loading, display loading indicator
  if (isLoading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  // If wallet not connected, redirect to welcome page
  if (!walletAddress) {
    return <Navigate to="/welcome" replace />;
  }

  // If wallet connected but no profile, redirect to profile page to update information
  if (walletAddress && user && !user.profile) {
    return <Navigate to="/profile" replace />;
  }

  // If profile exists but no NFT minted yet, redirect to mint NFT page
  if (walletAddress && user && user.profile && !user.nftTokenId) {
    return <Navigate to="/mint-nft" replace />;
  }

  // If all conditions met, render children
  return <>{children}</>;
}

function Router() {
  const { user, isLoading } = useAuth();
  const walletAddress = useStore((state) => state.walletAddress);
  
  // Display loading indicator while fetching user data
  if (isLoading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Only show Navbar and BottomNavigation if user has complete information and NFT */}
      {walletAddress && user && user.profile && user.nftTokenId && (
        <>
          <Navbar />
          <main className="pb-16 md:pb-0">
            <Routes>
              <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/quests" element={<ProtectedRoute><Quests /></ProtectedRoute>} />
              <Route path="/boss-battle" element={<ProtectedRoute><BossBattle /></ProtectedRoute>} />
              <Route path="/leaderboard" element={<ProtectedRoute><Leaderboard /></ProtectedRoute>} />
              <Route path="/achievements" element={<ProtectedRoute><Achievements /></ProtectedRoute>} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/nft" element={<ProtectedRoute><NFT /></ProtectedRoute>} />
              <Route path="/mint-nft" element={<MintNFT />} />
              <Route path="/welcome" element={<Welcome />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </main>
          <BottomNavigation />
        </>
      )}

      {/* Show special routes when conditions are not met */}
      {(!walletAddress || !user || !user.profile || !user.nftTokenId) && (
        <main>
          <Routes>
            <Route path="/welcome" element={<Welcome />} />
            <Route path="/profile" element={walletAddress && user ? <Profile /> : <Navigate to="/welcome" replace />} />
            <Route path="/mint-nft" element={walletAddress && user && user.profile ? <MintNFT /> : <Navigate to={user && !user.profile ? "/profile" : "/welcome"} replace />} />
            <Route path="*" element={<Navigate to="/welcome" replace />} />
          </Routes>
        </main>
      )}
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <Router />
        </AuthProvider>
        <Toaster />
      </QueryClientProvider>
    </BrowserRouter>
  );
}