import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/config/supabase';
import { User as UserType } from '@/types';
import { Camera, Loader2, Trash2 } from 'lucide-react';
import { uploadAvatarToStorage, generateRandomAvatarColor } from '@/lib/avatar';
import { toast } from 'sonner';

interface ProfilePanelProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserType;
  onSignOut: () => void;
}

const ProfilePanel = ({ isOpen, onClose, user, onSignOut }: ProfilePanelProps) => {
  const [bio, setBio] = useState(user?.status || 'Available');
  const [isEditing, setIsEditing] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem('blinkchat_theme') || 'dark');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync theme with document
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('blinkchat_theme', theme);
  }, [theme]);

  const handleSaveBio = async () => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ bio })
        .eq('id', user.id);
      
      if (error) throw error;
      setIsEditing(false);
      user.status = bio; // Update local state
    } catch (err) {
      console.error('Failed to update bio:', err);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      
      const avatarUrl = await uploadAvatarToStorage(file, user.id);
      
      const { error } = await supabase
        .from('users')
        .update({ avatar_url: avatarUrl })
        .eq('id', user.id);

      if (error) throw error;
      
      user.avatar = avatarUrl;
      toast.success('Profile photo updated!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update photo');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemovePhoto = async () => {
    try {
      setIsUploading(true);
      const newColor = user.avatarColor || generateRandomAvatarColor();
      const { error } = await supabase
        .from('users')
        .update({ avatar_url: null, avatar_color: newColor })
        .eq('id', user.id);

      if (error) throw error;
      
      user.avatar = undefined;
      user.avatarColor = newColor;
      toast.success('Profile photo removed');
    } catch (err: any) {
      toast.error(err.message || 'Failed to remove photo');
    } finally {
      setIsUploading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-start pointer-events-none">
      {/* Backdrop */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm pointer-events-auto"
      />

      {/* Panel */}
      <motion.div
        initial={{ x: '-100%' }}
        animate={{ x: 0 }}
        exit={{ x: '-100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="relative w-full max-w-[340px] h-full bg-[#0f0f0f] border-r border-white/10 flex flex-col pointer-events-auto shadow-2xl"
      >
        {/* Header */}
        <div className="p-6 flex items-center justify-between border-b border-white/5">
          <h2 className="text-xl font-bold text-white">Profile</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors text-2xl font-light">×</button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-none">
          {/* Avatar & Name */}
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="relative w-24 h-24 rounded-3xl bg-gradient-to-br from-purple-600 to-indigo-700 p-1 shadow-xl group">
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/jpeg,image/png,image/webp" 
                onChange={handleFileSelect} 
              />
              <button 
                disabled={isUploading}
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-full rounded-[1.4rem] overflow-hidden bg-[#1a1a1a] flex items-center justify-center relative cursor-pointer"
                style={{ backgroundColor: !user?.avatar ? user?.avatarColor : undefined }}
              >
                {isUploading ? (
                  <Loader2 className="h-8 w-8 text-white animate-spin" />
                ) : user?.avatar ? (
                  <img src={user.avatar} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-4xl font-bold text-white">{(user?.displayName || user?.username || user?.email || '?')[0].toUpperCase()}</span>
                )}
                
                {/* Overlay on hover */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center">
                  <Camera className="h-6 w-6 text-white mb-1" />
                  <span className="text-[9px] font-bold text-white uppercase tracking-wider">Change</span>
                </div>
              </button>
            </div>
            
            {user?.avatar && (
              <button 
                onClick={handleRemovePhoto} 
                disabled={isUploading}
                className="flex items-center gap-1.5 text-xs font-bold text-rose-400 hover:text-rose-300 transition-colors"
              >
                <Trash2 size={14} /> Remove photo
              </button>
            )}

            <div>
              <h3 className="text-2xl font-black text-white tracking-tight">{user?.displayName || user?.username || 'User'}</h3>
              <p className="text-sm text-zinc-500 font-medium">{user?.email}</p>
            </div>
          </div>

          {/* Bio Section */}
          <div className="space-y-3">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">About</label>
            {isEditing ? (
              <div className="space-y-2">
                <textarea
                  autoFocus
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="w-full bg-[#1a1a1a] border border-purple-500/30 rounded-2xl p-4 text-sm text-zinc-300 outline-none focus:ring-2 focus:ring-purple-500/20 resize-none"
                  rows={3}
                />
                <button 
                  onClick={handleSaveBio}
                  className="w-full py-2 bg-purple-600 text-white text-xs font-bold rounded-xl hover:bg-purple-500 transition-colors"
                >
                  Save Changes
                </button>
              </div>
            ) : (
              <div 
                onClick={() => setIsEditing(true)}
                className="bg-[#1a1a1a] border border-white/5 rounded-2xl p-4 text-sm text-zinc-400 hover:bg-white/5 cursor-pointer transition-all"
              >
                {bio}
              </div>
            )}
          </div>

          {/* Theme Toggle */}
          <div className="space-y-3">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">Settings</label>
            <div className="flex items-center justify-between bg-[#1a1a1a] border border-white/5 rounded-2xl p-4">
              <span className="text-sm font-bold text-zinc-200">Dark Mode</span>
              <button 
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className={`w-12 h-6 rounded-full transition-all relative ${theme === 'dark' ? 'bg-purple-600' : 'bg-zinc-700'}`}
              >
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${theme === 'dark' ? 'left-7' : 'left-1'}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Sign Out */}
        <div className="p-6 border-t border-white/5">
          <button 
            onClick={onSignOut}
            className="w-full py-4 bg-rose-600 hover:bg-rose-500 text-white rounded-2xl font-black text-sm uppercase tracking-widest transition-all shadow-lg shadow-rose-600/20"
          >
            Sign Out
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default ProfilePanel;
