import React, { useState } from 'react';
import { User, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface UsernameScreenProps {
  onComplete: (username: string) => void;
  loading?: boolean;
}

const UsernameScreen: React.FC<UsernameScreenProps> = ({ onComplete, loading }) => {
  const [username, setUsername] = useState('');

  const handleSubmit = () => {
    if (username.length >= 3) {
      onComplete(username);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 font-sans text-foreground">
      <div className="w-full max-w-md space-y-10 text-center animate-in fade-in zoom-in duration-300">
        <div className="space-y-4">
          <div className="mx-auto w-20 h-20 bg-primary/10 rounded-[2rem] flex items-center justify-center">
            <User className="h-10 w-10 text-primary" />
          </div>
          <div className="space-y-2">
            <h2 className="text-4xl font-black tracking-tight text-foreground">Almost there!</h2>
            <p className="text-muted-foreground text-lg font-medium">Choose a unique username to start your journey on Blink.</p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="relative group">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input
              placeholder="e.g. blink_master"
              className="pl-12 h-14 bg-secondary/50 border-none text-foreground placeholder:text-muted-foreground/50 focus-visible:ring-2 focus-visible:ring-primary/20 rounded-2xl font-semibold"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
              disabled={loading}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            />
          </div>

          <Button
            onClick={handleSubmit}
            className="w-full h-14 bg-primary hover:bg-primary/90 text-white font-bold text-lg rounded-2xl shadow-xl shadow-primary/20 transition-all active:scale-[0.98]"
            disabled={loading || username.length < 3}
          >
            {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : 'Enter Blink'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default UsernameScreen;
