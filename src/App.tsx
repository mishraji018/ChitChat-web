import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Toaster as Sonner, toast } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import SplashScreen from "@/components/SplashScreen";
import LoginScreen from "@/components/LoginScreen";
import UsernameScreen from "@/components/UsernameScreen";
import { supabase } from "@/lib/supabase";
import { syncGoogleAuth, completeGoogleSignup } from "@/services/authService";
import { useLanguage } from "@/hooks/use-language";
import { useInternet } from '@/hooks/use-internet';
import NoInternet from '@/components/NoInternet';

const queryClient = new QueryClient();

const App = () => {
  const { isOnline, retry } = useInternet();
  const [showSplash, setShowSplash] = useState(true);
  const { t, language, changeLanguage } = useLanguage();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showUsernameScreen, setShowUsernameScreen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tempAuthUser, setTempAuthUser] = useState<any>(null);

  useEffect(() => {
    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session) {
        const { user } = session;
        localStorage.setItem("blinkchat_token", session.access_token);
        
        // Check if user exists in public.users table
        const { data: dbUser, error } = await supabase
          .from('users')
          .select('*')
          .eq('email', user.email)
          .single();

        if (error || !dbUser) {
          // New User
          setTempAuthUser(user);
          setShowUsernameScreen(true);
        } else {
          // Existing User
          setCurrentUser(dbUser);
          setIsLoggedIn(true);
          setShowUsernameScreen(false);
        }
      } else {
        setIsLoggedIn(false);
        setCurrentUser(null);
        localStorage.removeItem("blinkchat_token");
        localStorage.removeItem("blinkchat_user");
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleUsernameComplete = async (username: string) => {
    setLoading(true);
    try {
      const res = await completeGoogleSignup({
        userId: tempAuthUser.id,
        email: tempAuthUser.email,
        username,
        avatar_url: tempAuthUser.user_metadata.avatar_url
      });

      if (!res.success) throw new Error(res.message);

      setCurrentUser(res.data.user);
      setIsLoggedIn(true);
      setShowUsernameScreen(false);
      toast.success(`Welcome to ChitChat, ${username}!`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to set username');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  if (!isOnline) return <NoInternet onRetry={retry} />;

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <div className="h-screen w-screen overflow-hidden">
          {showSplash ? (
            <SplashScreen onComplete={() => setShowSplash(false)} />
          ) : showUsernameScreen ? (
            <UsernameScreen onComplete={handleUsernameComplete} loading={loading} />
          ) : !isLoggedIn ? (
            <LoginScreen onLogin={() => {}} />
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
