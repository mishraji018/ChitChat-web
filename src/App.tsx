import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { useState, useEffect } from "react";
import { Toaster as Sonner, toast } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import SplashScreen from "@/components/SplashScreen";
import LoginScreen from "@/components/LoginScreen";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { useLanguage } from "@/hooks/use-language";
import { currentUser as defaultUser } from "@/data/mockData";
import { getToken, isTokenExpired, refreshToken, apiFetch } from "@/utils/tokenManager";

import AppLock from "./components/AppLock";
import { useInternet } from '@/hooks/use-internet';
import NoInternet from '@/components/NoInternet';
import { Wifi } from 'lucide-react';

const queryClient = new QueryClient();

const App = () => {
  const { isOnline, retry } = useInternet();
  const [prevOnline, setPrevOnline] = useState(true);

  // Show toast when connection changes
  useEffect(() => {
    if (!isOnline && prevOnline) {
      setPrevOnline(false);
    } else if (isOnline && !prevOnline) {
      setPrevOnline(true);
      toast.success('Back online! 🌐', {
        icon: <Wifi size={16} />,
        duration: 3000
      });
    }
  }, [isOnline, prevOnline]);

  const [showSplash, setShowSplash] = useState(true);
  const { t, language, changeLanguage } = useLanguage();
  const [currentUser, setCurrentUser] = useLocalStorage("blinkchat_user", defaultUser);
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    const saved = localStorage.getItem("blinkchat_user");
    if (!saved) return false;
    try {
      return JSON.parse(saved).isLoggedIn || false;
    } catch { return false; }
  });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [appPin] = useLocalStorage('blinkchat_app_pin', '');
  const [isAppUnlocked, setIsAppUnlocked] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      const token = getToken();
      if (!token) {
        setIsLoggedIn(false);
        return;
      }

      if (isTokenExpired(token)) {
        setIsRefreshing(true);
        const newToken = await refreshToken();
        setIsRefreshing(false);
        if (!newToken) {
          setIsLoggedIn(false);
          toast.error("Session expired. Please login again.");
          return;
        }
      }
      setIsLoggedIn(true);
    };

    checkSession();
  }, []);

  useEffect(() => {
    if (!currentUser?.id || !isLoggedIn) return;

    const checkPending = async () => {
      try {
        const res = await apiFetch(`/api/messages/pending/${currentUser.id}`);
        if (!res) return;
        
        const data = await res.json();
        if (data.pendingCount > 0) {
          toast.info(`📦 ${data.message}`, { duration: 5000 });
        }
      } catch (err) {
        console.error('Pending check error:', err);
      }
    };

    checkPending();
  }, [currentUser, isLoggedIn]);



  const handleLogin = (user: any) => {
    setCurrentUser(user);
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentUser(null);
    setIsAppUnlocked(false);
    localStorage.removeItem("blinkchat_token"); // Replaced clearToken() with existing logic
    localStorage.removeItem("blinkchat_user");
    window.location.reload();
  };

  if (appPin && !isAppUnlocked && isLoggedIn) {
    return <AppLock correctPin={appPin} onUnlock={() => setIsAppUnlocked(true)} />;
  }

  // Show no internet screen
  if (!isOnline) {
    return <NoInternet onRetry={retry} />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <div className="h-screen w-screen overflow-hidden">
          {showSplash ? (
            <SplashScreen onComplete={() => setShowSplash(false)} />
          ) : !isLoggedIn ? (
            <LoginScreen onLogin={handleLogin} t={t} />
          ) : (
            <Index 
              currentUser={currentUser} 
              onLogout={handleLogout} 
              t={t}
              language={language}
              onLanguageChange={changeLanguage}
            />
          )}
        </div>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
