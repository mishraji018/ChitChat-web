import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/config/supabase';
import { User as UserType, ThemeType } from '@/types/chat';
import { X, User, Mail, AtSign, Check, LogOut, Sparkles, ShieldCheck, Lock, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

interface ProfilePanelProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserType;
  onSignOut: () => void;
  currentTheme?: ThemeType;
}

const ProfilePanel: React.FC<ProfilePanelProps> = ({ 
  isOpen, 
  onClose, 
  user, 
  onSignOut,
  currentTheme = 'dark'
}) => {
  const isLight = currentTheme === 'light';
  const [bio, setBio] = useState(user?.status || 'Available');
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [isSavingBio, setIsSavingBio] = useState(false);

  // Keyboard shortcut: Escape to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleSaveBio = async () => {
    try {
      setIsSavingBio(true);
      const { error } = await supabase
        .from('users')
        .update({ bio })
        .eq('id', user.id);
      
      if (error) throw error;
      setIsEditingBio(false);
      user.status = bio;
      toast.success('About status updated!');
    } catch (err: any) {
      console.error('Failed to update bio:', err);
      toast.error(err.message || 'Failed to update about');
    } finally {
      setIsSavingBio(false);
    }
  };


  if (!isOpen) return null;

  const panelBg = isLight 
    ? 'bg-white/95 text-slate-900 border-slate-200 shadow-[0_25px_70px_rgba(0,0,0,0.15)]' 
    : 'bg-[#101015]/95 text-white border-white/10 shadow-[0_25px_70px_rgba(0,0,0,0.6)]';
  
  const headerBg = isLight ? 'bg-slate-50/70 border-slate-200' : 'bg-white/[0.02] border-white/10';
  const cardBg = isLight ? 'bg-slate-50/80 border-slate-200/80' : 'bg-white/[0.04] border-white/10';
  const textMuted = isLight ? 'text-slate-500' : 'text-zinc-400';
  const textTitle = isLight ? 'text-slate-900' : 'text-white';
  const closeBtnBg = isLight 
    ? 'bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900' 
    : 'bg-white/10 hover:bg-white/20 text-zinc-300 hover:text-white';

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-5 md:p-8 bg-black/60 backdrop-blur-xl animate-in fade-in duration-200">
      
      {/* Backdrop */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Glassy Centered Profile Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 15 }}
        transition={{ type: 'spring', damping: 25, stiffness: 320 }}
        className={`relative z-10 w-full max-w-lg rounded-[2.2rem] backdrop-blur-3xl border flex flex-col overflow-hidden transition-colors ${panelBg}`}
      >
        {/* Ambient Top Glow Border */}
        <div className="absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-purple-500/50 to-transparent pointer-events-none" />

        {/* ── Modal Header ── */}
        <div className={`px-6 py-4 border-b flex items-center justify-between gap-4 shrink-0 transition-colors ${headerBg}`}>
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-purple-500/25 shrink-0">
              <User size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className={`text-xl font-black tracking-tight ${textTitle}`}>My Profile</h2>
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                  Identity
                </span>
              </div>
              <p className={`text-xs ${textMuted}`}>Manage photo, account details & status</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer ${closeBtnBg}`}
            title="Close (Esc)"
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Modal Body ── */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[75vh] scrollbar-thin">
          
          {/* Avatar Showcase */}
          {/* Avatar Showcase - Frozen with Google Account */}
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="relative group">
              <div 
                className="w-24 h-24 rounded-3xl p-1 shadow-xl relative overflow-hidden flex items-center justify-center border-2 border-purple-500/30"
                style={{ backgroundColor: !user?.avatar ? (user?.avatarColor || '#7c3aed') : undefined }}
              >
                {user?.avatar ? (
                  <img 
                    src={user.avatar} 
                    alt="Profile" 
                    referrerPolicy="no-referrer"
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    className="w-full h-full object-cover rounded-2xl" 
                  />
                ) : (
                  <span className="text-4xl font-extrabold text-white">
                    {(user?.displayName || user?.username || user?.email || '?')[0].toUpperCase()}
                  </span>
                )}
              </div>

              {/* Status Badge */}
              <span className="absolute bottom-1 right-1 w-5 h-5 bg-emerald-500 rounded-full border-2 border-white dark:border-[#101015] shadow-sm flex items-center justify-center" title="Online">
                <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />
              </span>
            </div>

            {/* Frozen / Locked Google Avatar Badge */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-300 text-xs font-semibold shadow-sm">
              <Lock size={12} className="text-purple-500 shrink-0" />
              <span>Google Profile Photo (Locked)</span>
            </div>
          </div>

          {/* User Details Card */}
          <div className={`p-4 rounded-2xl border space-y-3.5 ${cardBg}`}>
            {/* Display Name */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                <User size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-[10px] font-bold uppercase tracking-wider ${textMuted}`}>Display Name</p>
                <p className={`text-sm font-bold truncate ${textTitle}`}>{user?.displayName || 'User'}</p>
              </div>
            </div>

            {/* Username Handle */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                <AtSign size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-[10px] font-bold uppercase tracking-wider ${textMuted}`}>Blink Handle</p>
                <p className="text-sm font-bold text-purple-600 dark:text-purple-400 truncate">@{user?.username || 'user'}</p>
              </div>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400">
                Verified
              </span>
            </div>

            {/* Email Address */}
            {user?.email && (
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <Mail size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-[10px] font-bold uppercase tracking-wider ${textMuted}`}>Account Email</p>
                  <p className={`text-sm font-medium truncate ${textTitle}`}>{user.email}</p>
                </div>
              </div>
            )}
          </div>

          {/* About / Bio Status Section */}
          <div className={`p-4 rounded-2xl border space-y-2.5 ${cardBg}`}>
            <div className="flex items-center justify-between">
              <label className={`text-xs font-bold uppercase tracking-wider ${textMuted}`}>About / Status</label>
              {!isEditingBio && (
                <button
                  onClick={() => setIsEditingBio(true)}
                  className="text-xs font-bold text-purple-600 dark:text-purple-400 hover:underline cursor-pointer"
                >
                  Edit
                </button>
              )}
            </div>

            {isEditingBio ? (
              <div className="space-y-2 pt-1 animate-in fade-in">
                <textarea
                  autoFocus
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell people about yourself..."
                  maxLength={160}
                  className={`w-full text-sm rounded-xl p-3 border focus:border-purple-500 focus:outline-none resize-none transition-all ${
                    isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-white/10 border-white/20 text-white'
                  }`}
                  rows={3}
                />
                <div className="flex items-center justify-between">
                  <span className={`text-[11px] ${textMuted}`}>{bio.length}/160</span>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setBio(user?.status || 'Available');
                        setIsEditingBio(false);
                      }}
                      className="rounded-xl text-xs"
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      disabled={isSavingBio}
                      onClick={handleSaveBio}
                      className="rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white"
                    >
                      {isSavingBio ? <Loader2 size={13} className="animate-spin mr-1" /> : <Check size={13} className="mr-1" />}
                      Save Status
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <p className={`text-sm italic cursor-pointer ${textTitle}`} onClick={() => setIsEditingBio(true)}>
                "{bio}"
              </p>
            )}
          </div>

          {/* Security & Sign Out Section */}
          <div className="pt-2 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <ShieldCheck size={16} className="text-emerald-500" />
              <span className={`text-xs ${textMuted}`}>Blink Session Authenticated</span>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={onSignOut}
              className="rounded-xl text-xs font-bold border-rose-500/30 text-rose-500 hover:bg-rose-500/10 cursor-pointer"
            >
              <LogOut size={13} className="mr-1.5" /> Sign Out
            </Button>
          </div>

        </div>

      </motion.div>
    </div>
  );
};

export default ProfilePanel;
