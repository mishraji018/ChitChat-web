import React, { useState, useRef } from 'react';
import { User, Loader2, Camera, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { processAvatarFile, generateRandomAvatarColor } from '@/lib/avatar';

interface UsernameScreenProps {
  onComplete: (data: { username: string; avatarFile: File | null; avatarColor: string }) => void;
  loading?: boolean;
  initialAvatar?: string;
}

const UsernameScreen: React.FC<UsernameScreenProps> = ({ onComplete, loading, initialAvatar }) => {
  const [username, setUsername] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(initialAvatar || null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (initialAvatar) return; // Frozen for Google OAuth
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }

    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleSubmit = () => {
    if (username.length >= 3) {
      onComplete({
        username,
        avatarFile,
        avatarColor: generateRandomAvatarColor()
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 font-sans text-foreground">
      <div className="w-full max-w-md space-y-10 text-center animate-in fade-in zoom-in duration-300">
        <div className="space-y-4">
          <div className="flex flex-col items-center gap-2">
            <div className="relative mx-auto w-24 h-24">
              {!initialAvatar && (
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/jpeg,image/png,image/webp" 
                  onChange={handleFileSelect} 
                />
              )}
              
              <div 
                onClick={() => {
                  if (!initialAvatar) fileInputRef.current?.click();
                }}
                className={`w-full h-full bg-primary/10 rounded-[2.5rem] flex items-center justify-center transition-all overflow-hidden relative shadow-sm border-2 border-purple-500/30 ${
                  initialAvatar ? 'cursor-default' : 'hover:bg-primary/20 hover:border-primary/50 cursor-pointer group'
                }`}
              >
                {isUploading ? (
                  <Loader2 className="h-8 w-8 text-primary animate-spin" />
                ) : avatarPreview ? (
                  <>
                    <img src={avatarPreview} alt="Avatar preview" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                    {!initialAvatar && (
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Camera className="h-8 w-8 text-white" />
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <User className="h-10 w-10 text-primary group-hover:scale-110 transition-transform" />
                    <div className="absolute bottom-1 right-1 w-7 h-7 bg-primary rounded-full flex items-center justify-center border-2 border-background shadow-sm">
                      <Camera className="h-3.5 w-3.5 text-white" />
                    </div>
                  </>
                )}
              </div>
            </div>

            {initialAvatar && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-300 text-xs font-semibold shadow-sm">
                <Lock size={12} className="text-purple-500 shrink-0" />
                <span>Google Profile Photo (Locked)</span>
              </div>
            )}
          </div>
          <div className="space-y-2">
            <h2 className="text-4xl font-black tracking-tight text-foreground">Almost there!</h2>
            <p className="text-muted-foreground text-lg font-medium">Choose a unique username and a photo for Blink.</p>
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
