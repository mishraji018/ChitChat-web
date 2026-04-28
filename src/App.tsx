import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Toaster as Sonner, toast } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import SplashScreen from "@/components/SplashScreen";
import LoginScreen from "@/components/LoginScreen";
import UsernameScreen from "@/components/UsernameScreen";
import { supabase } from "@/config/supabase";
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
          await supabase
            .from('users')
            .update({ is_online: true })
            .eq('id', dbUser.id);
            
          setCurrentUser({ ...dbUser, is_online: true });
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
      const newUser = {
        id: tempAuthUser.id,
        email: tempAuthUser.email,
        username,
        display_name: tempAuthUser.user_metadata.full_name || username,
        avatar_url: tempAuthUser.user_metadata.avatar_url,
        is_online: true,
        last_seen: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('users')
        .insert(newUser)
        .select()
        .single();

      if (error) throw error;

      setCurrentUser(data);
      setIsLoggedIn(true);
      setShowUsernameScreen(false);
      toast.success(`Welcome to Blink, ${username}!`);
    } catch (err: any) {
      console.error('Error in handleUsernameComplete:', err);
      toast.error(err.message || 'Failed to set username');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    if (currentUser) {
      await supabase
        .from('users')
        .update({ is_online: false, last_seen: new Date().toISOString() })
        .eq('id', currentUser.id);
    }
    await supabase.auth.signOut();
    window.location.reload();
  };

  const handleSwitchAccount = async () => {
    try {
      setLoading(true);
      await supabase.auth.signOut();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          queryParams: {
            prompt: 'select_account',
            access_type: 'offline',
          },
          redirectTo: window.location.origin
        },
      });
      if (error) throw error;
    } catch (err: any) {
      toast.error(err.message || 'Failed to switch account');
    } finally {
      setLoading(false);
    }
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
              onSwitchAccount={handleSwitchAccount}
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
