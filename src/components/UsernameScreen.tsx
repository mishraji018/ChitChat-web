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
    <div className="min-h-screen flex items-center justify-center bg-[#0b141a] p-4 font-sans text-white">
      <div className="w-full max-w-md space-y-8 text-center animate-in fade-in zoom-in duration-300">
        <div className="space-y-2">
          <h2 className="text-3xl font-bold tracking-tight text-[#00d4a0]">Almost there!</h2>
          <p className="text-gray-400 text-lg">Choose a unique username to start chatting.</p>
        </div>

        <div className="space-y-4">
          <div className="relative group">
            <User className="absolute left-3 top-3.5 h-5 w-5 text-gray-500 group-focus-within:text-[#00d4a0] transition-colors" />
            <Input
              placeholder="e.g. chat_master"
              className="pl-10 h-12 bg-[#1f2c33] border-none text-white focus-visible:ring-1 focus-visible:ring-[#00d4a0] rounded-xl"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
              disabled={loading}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            />
          </div>

          <Button
            onClick={handleSubmit}
            className="w-full h-12 bg-[#00d4a0] hover:bg-[#00b386] text-[#0b141a] font-bold text-lg rounded-xl shadow-lg transition-all active:scale-[0.98]"
            disabled={loading || username.length < 3}
          >
            {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : 'Enter ChitChat'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default UsernameScreen;
