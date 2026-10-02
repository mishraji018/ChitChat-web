import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Settings, 
  Bell, 
  Lock, 
  Palette, 
  Globe, 
  Download, 
  Trash2, 
  Check, 
  Shield, 
  Volume2, 
  LogOut, 
  Search, 
  Image as ImageIcon,
  User,
  AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { User as UserType, ThemeType } from '@/types/chat';
import { translations } from '@/i18n/translations';
import { useWallpaper } from '@/hooks/useWallpaper';
import WallpaperModal from './WallpaperModal';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  currentTheme: ThemeType;
  onThemeChange: (theme: ThemeType) => void;
  language: string;
  onLanguageChange: (lang: string) => void;
  currentUser: UserType;
  onLogout?: () => void;
}

type SettingsTab = 'appearance' | 'notifications' | 'privacy' | 'language' | 'chats' | 'account';

const themes: { key: ThemeType; label: string; desc: string; fill: string; border: string }[] = [
  { key: 'dark',      label: 'Midnight Dark',  desc: 'Sleek black OLED mode',     fill: '#0d0d0f', border: '#7c3aed' },
  { key: 'deep-blue', label: 'Deep Ocean',     desc: 'Calm navy obsidian',       fill: '#0a1628', border: '#4f8ef7' },
  { key: 'light',     label: 'Pure Light',     desc: 'Crisp minimal paper white', fill: '#f4f6fa', border: '#0d7377' },
  { key: 'rose',      label: 'Neon Rose',      desc: 'Vibrant magenta dark tone', fill: '#1a0a0f', border: '#f472b6' },
  { key: 'teal',      label: 'Emerald Teal',   desc: 'Nordic cyan balance',       fill: '#0d7377', border: '#14b8a6' },
];

const languages = [
  { code: 'English', label: 'English', native: 'English', region: 'United States / Global' },
  { code: 'Hindi',   label: 'Hindi',   native: 'हिन्दी', region: 'India (भारत)' },
  { code: 'Spanish', label: 'Spanish', native: 'Español', region: 'Spain & Latin America' },
  { code: 'French',  label: 'French',  native: 'Français', region: 'France & Francophone' },
];

const SettingsPanel = ({ 
  isOpen, 
  onClose, 
  currentTheme, 
  onThemeChange, 
  language, 
  onLanguageChange, 
  currentUser,
  onLogout
}: SettingsPanelProps) => {
  const safeT = translations[language as keyof typeof translations] || translations['English'];
  const isLight = currentTheme === 'light';

  const [activeTab, setActiveTab] = useState<SettingsTab>('appearance');
  const [searchQuery, setSearchQuery] = useState('');
  const [notifications, setNotifications] = useLocalStorage('blinkchat_notifications', { message: true, sound: true, vibration: true });
  const [privacy, setPrivacy] = useLocalStorage('blinkchat_privacy', { lastSeen: 'everyone', profilePhoto: 'everyone', readReceipts: true });
  const [exportFormat, setExportFormat] = useState<'pdf' | 'txt'>('pdf');
  const [deleteAccountName, setDeleteAccountName] = useState('');
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showWallpaperModal, setShowWallpaperModal] = useState(false);
  const { currentWallpaper, setWallpaper } = useWallpaper();

  // Keyboard shortcut: Escape to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const tabs = useMemo(() => [
    { id: 'appearance' as SettingsTab,    label: safeT.theme || 'Appearance',       icon: Palette,        desc: 'Themes & Wallpaper' },
    { id: 'notifications' as SettingsTab, label: safeT.notifications || 'Alerts',   icon: Bell,           desc: 'Messages, Tones & Vibe' },
    { id: 'privacy' as SettingsTab,       label: safeT.privacy || 'Privacy',        icon: Lock,           desc: 'Last seen & Read receipts' },
    { id: 'language' as SettingsTab,      label: safeT.appLanguage || 'Language',   icon: Globe,          desc: language },
    { id: 'chats' as SettingsTab,         label: 'Chats & Data',                   icon: Download,       desc: 'Export & Clear history' },
    { id: 'account' as SettingsTab,       label: safeT.profile || 'Account',        icon: User,           desc: `@${currentUser.username}` },
  ], [safeT, language, currentUser.username]);

  const filteredTabs = useMemo(() => {
    if (!searchQuery.trim()) return tabs;
    const q = searchQuery.toLowerCase();
    return tabs.filter(t => 
      t.label.toLowerCase().includes(q) || 
      t.desc.toLowerCase().includes(q) ||
      t.id.toLowerCase().includes(q)
    );
  }, [tabs, searchQuery]);

  const handleDeleteChats = () => {
    toast.success('Your chat history has been cleared locally');
    setShowClearConfirm(false);
  };

  const handleDeleteAccount = () => {
    toast.error('Account deletion initiated');
    setTimeout(() => window.location.reload(), 1000);
  };

  const handleDownload = () => {
    const data = `Blink Chat Export\nUser: ${currentUser.displayName} (@${currentUser.username})\nDate: ${new Date().toLocaleString()}\nFormat: ${exportFormat.toUpperCase()}\n\n-- End of summary --`;
    const blob = new Blob([data], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `blink-chat-export-${Date.now()}.${exportFormat === 'pdf' ? 'txt' : 'txt'}`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Chat export downloaded as ${exportFormat.toUpperCase()}`);
  };

  const playPreviewSound = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.35);
      toast('Notification tone previewed');
    } catch {
      toast('Notification audio triggered');
    }
  };

  if (!isOpen) return null;

  // Theme-aware dynamic classes
  const panelBg = isLight 
    ? 'bg-white/95 text-slate-900 border-slate-200 shadow-[0_25px_70px_rgba(0,0,0,0.15)]' 
    : 'bg-[#101015]/95 text-white border-white/10 shadow-[0_25px_70px_rgba(0,0,0,0.6)]';
  
  const headerBg = isLight ? 'bg-slate-50/70 border-slate-200' : 'bg-white/[0.02] border-white/10';
  const sidebarBg = isLight ? 'bg-slate-50/50 border-slate-200' : 'bg-black/20 border-white/10';
  const cardBg = isLight ? 'bg-slate-50 border-slate-200/80' : 'bg-white/[0.04] border-white/10';
  const textMuted = isLight ? 'text-slate-500' : 'text-zinc-400';
  const textTitle = isLight ? 'text-slate-900' : 'text-white';
  const searchInputBg = isLight 
    ? 'bg-slate-100 text-slate-900 placeholder:text-slate-400 border-slate-200' 
    : 'bg-white/10 text-white placeholder:text-zinc-400 border-white/10';
  const closeBtnBg = isLight 
    ? 'bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900' 
    : 'bg-white/10 hover:bg-white/20 text-zinc-300 hover:text-white';

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-5 md:p-8 bg-black/60 backdrop-blur-xl animate-in fade-in duration-200">
      
      {/* Backdrop click to close */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Glassy Modal Window in Middle of Screen */}
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 15 }}
        transition={{ type: 'spring', damping: 25, stiffness: 320 }}
        className={`relative z-10 w-full max-w-4xl h-[620px] max-h-[92vh] rounded-[2.2rem] backdrop-blur-3xl border flex flex-col overflow-hidden transition-colors ${panelBg}`}
      >
        {/* Ambient Top Glow Border */}
        <div className="absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-purple-500/50 to-transparent pointer-events-none" />

        {/* ── Modal Header ── */}
        <div className={`px-6 py-4 border-b flex items-center justify-between gap-4 shrink-0 transition-colors ${headerBg}`}>
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-purple-500/25 shrink-0">
              <Settings size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className={`text-xl font-black tracking-tight ${textTitle}`}>Blink Settings</h2>
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                  Command Center
                </span>
              </div>
              <p className={`text-xs ${textMuted}`}>Manage your themes, privacy, sounds and commands</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick Search Input */}
            <div className="relative hidden sm:block w-48 lg:w-60">
              <Search className={`absolute left-3 top-1/2 -translate-y-1/2 ${textMuted}`} size={14} />
              <input
                type="text"
                placeholder="Search commands..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full text-xs rounded-xl pl-9 pr-3 py-2 border focus:border-purple-500/40 focus:outline-none transition-all ${searchInputBg}`}
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className={`absolute right-2 top-1/2 -translate-y-1/2 ${textMuted} hover:opacity-100 p-0.5`}
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Close Button */}
            <button
              onClick={onClose}
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer ${closeBtnBg}`}
              title="Close (Esc)"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ── Modal Body: 2 Columns (Navigation Sidebar + Content Pane) ── */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* Left Column: Command & Category Navigation */}
          <div className={`w-64 sm:w-72 border-r p-3 flex flex-col gap-1.5 overflow-y-auto shrink-0 scrollbar-none transition-colors ${sidebarBg}`}>
            <div className={`px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider ${textMuted}`}>
              Commands & Modules
            </div>

            {filteredTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl text-left transition-all relative group cursor-pointer ${
                    isActive
                      ? 'bg-purple-600 text-white font-semibold shadow-lg shadow-purple-600/25'
                      : isLight 
                        ? 'text-slate-700 hover:bg-slate-200/60' 
                        : 'text-zinc-300 hover:bg-white/10'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                    isActive 
                      ? 'bg-white/20 text-white' 
                      : isLight 
                        ? 'bg-slate-200 text-slate-700' 
                        : 'bg-white/10 text-white'
                  }`}>
                    <Icon size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm leading-tight truncate ${isActive ? 'text-white font-bold' : textTitle}`}>
                      {tab.label}
                    </p>
                    <p className={`text-[11px] truncate mt-0.5 ${isActive ? 'text-purple-100' : textMuted}`}>
                      {tab.desc}
                    </p>
                  </div>
                </button>
              );
            })}

            {/* Quick Profile Summary Footer in Sidebar */}
            <div className={`mt-auto pt-3 border-t px-2 flex items-center gap-3 ${isLight ? 'border-slate-200' : 'border-white/10'}`}>
              <div 
                className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white shadow-sm text-sm shrink-0 overflow-hidden"
                style={{ backgroundColor: currentUser.avatarColor || '#7c3aed' }}
              >
                {currentUser.avatar ? (
                  <img 
                    src={currentUser.avatar} 
                    alt={currentUser.displayName} 
                    referrerPolicy="no-referrer"
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    className="w-full h-full object-cover" 
                  />
                ) : (
                  currentUser.displayName ? currentUser.displayName[0].toUpperCase() : 'U'
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-xs font-bold truncate ${textTitle}`}>{currentUser.displayName}</p>
                <p className={`text-[10px] truncate ${textMuted}`}>@{currentUser.username}</p>
              </div>
              {onLogout && (
                <button
                  onClick={onLogout}
                  className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                  title="Sign Out"
                >
                  <LogOut size={15} />
                </button>
              )}
            </div>
          </div>

          {/* Right Column: Active Command Pane */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 scrollbar-thin">
            <AnimatePresence mode="wait">
              {activeTab === 'appearance' && (
                <motion.div
                  key="appearance"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.15 }}
                  className="space-y-6"
                >
                  <div>
                    <h3 className={`text-lg font-bold flex items-center gap-2 ${textTitle}`}>
                      <Palette size={18} className="text-purple-500" />
                      Theme & Visual Style
                    </h3>
                    <p className={`text-xs ${textMuted} mt-0.5`}>
                      Select your favorite workspace theme and ambiance
                    </p>
                  </div>

                  {/* Theme Switcher Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {themes.map((t) => {
                      const isSelected = currentTheme === t.key;
                      return (
                        <button
                          key={t.key}
                          onClick={() => {
                            onThemeChange(t.key);
                            toast.success(`Theme switched to ${t.label}`);
                          }}
                          className={`flex flex-col p-4 rounded-2xl border text-left transition-all cursor-pointer relative overflow-hidden ${
                            isSelected
                              ? 'border-purple-500 bg-purple-500/10 ring-2 ring-purple-500/25 shadow-md'
                              : isLight
                                ? 'border-slate-200 bg-white hover:border-purple-500/30 hover:bg-slate-50'
                                : 'border-white/10 bg-white/[0.03] hover:border-purple-500/30 hover:bg-white/[0.06]'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div 
                              className="w-7 h-7 rounded-full border-2 flex items-center justify-center shadow-inner"
                              style={{ backgroundColor: t.fill, borderColor: t.border }}
                            >
                              {isSelected && <Check size={14} className="text-white drop-shadow" />}
                            </div>
                            {isSelected && (
                              <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 bg-purple-500/15 px-2 py-0.5 rounded-full border border-purple-500/20">
                                Active
                              </span>
                            )}
                          </div>
                          <span className={`text-sm font-bold ${textTitle}`}>{t.label}</span>
                          <span className={`text-xs ${textMuted} mt-0.5`}>{t.desc}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Chat Wallpaper Customizer Card */}
                  <div className={`p-4 rounded-2xl border flex items-center justify-between gap-4 ${cardBg}`}>
                    <div className="flex items-center gap-3.5">
                      <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-500 shrink-0">
                        <ImageIcon size={22} />
                      </div>
                      <div>
                        <h4 className={`text-sm font-bold ${textTitle}`}>Global Chat Wallpaper</h4>
                        <p className={`text-xs ${textMuted} mt-0.5`}>
                          Change the aesthetic background wallpaper for all conversations
                        </p>
                      </div>
                    </div>
                    <Button
                      onClick={() => setShowWallpaperModal(true)}
                      variant="outline"
                      className="rounded-xl border-purple-500/30 hover:bg-purple-500/10 text-purple-600 dark:text-purple-300 font-semibold cursor-pointer shrink-0"
                    >
                      Customize Wallpaper
                    </Button>
                  </div>
                </motion.div>
              )}

              {activeTab === 'notifications' && (
                <motion.div
                  key="notifications"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.15 }}
                  className="space-y-6"
                >
                  <div>
                    <h3 className={`text-lg font-bold flex items-center gap-2 ${textTitle}`}>
                      <Bell size={18} className="text-purple-500" />
                      Notifications & Audio Feedback
                    </h3>
                    <p className={`text-xs ${textMuted} mt-0.5`}>
                      Configure alert popups, in-app chime tones, and vibration
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div className={`p-4 rounded-2xl border flex items-center justify-between gap-4 ${cardBg}`}>
                      <div className="space-y-0.5">
                        <label className={`text-sm font-bold ${textTitle}`}>Show Message Previews</label>
                        <p className={`text-xs ${textMuted}`}>
                          Display sender name and message content snippets in push notifications.
                        </p>
                      </div>
                      <Switch 
                        checked={notifications.message} 
                        onCheckedChange={(v) => {
                          setNotifications({ ...notifications, message: v });
                          toast(v ? 'Message previews enabled' : 'Message previews disabled');
                        }} 
                      />
                    </div>

                    <div className={`p-4 rounded-2xl border flex items-center justify-between gap-4 ${cardBg}`}>
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <label className={`text-sm font-bold ${textTitle}`}>In-App Sound Chimes</label>
                          <button
                            onClick={playPreviewSound}
                            className="px-2 py-0.5 text-[11px] rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400 hover:bg-purple-500/20 font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <Volume2 size={12} /> Test Tone
                          </button>
                        </div>
                        <p className={`text-xs ${textMuted}`}>
                          Play an acoustic chime when receiving messages while chatting.
                        </p>
                      </div>
                      <Switch 
                        checked={notifications.sound} 
                        onCheckedChange={(v) => {
                          setNotifications({ ...notifications, sound: v });
                          toast(v ? 'In-app sounds enabled' : 'In-app sounds muted');
                        }} 
                      />
                    </div>

                    <div className={`p-4 rounded-2xl border flex items-center justify-between gap-4 ${cardBg}`}>
                      <div className="space-y-0.5">
                        <label className={`text-sm font-bold ${textTitle}`}>Haptic Vibration</label>
                        <p className={`text-xs ${textMuted}`}>
                          Vibrate mobile/laptop trackpad on incoming alerts.
                        </p>
                      </div>
                      <Switch 
                        checked={notifications.vibration} 
                        onCheckedChange={(v) => {
                          setNotifications({ ...notifications, vibration: v });
                          toast(v ? 'Vibration enabled' : 'Vibration disabled');
                        }} 
                      />
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === 'privacy' && (
                <motion.div
                  key="privacy"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.15 }}
                  className="space-y-6"
                >
                  <div>
                    <h3 className={`text-lg font-bold flex items-center gap-2 ${textTitle}`}>
                      <Shield size={18} className="text-purple-500" />
                      Privacy & Visibility Controls
                    </h3>
                    <p className={`text-xs ${textMuted} mt-0.5`}>
                      Control who can see your online presence and read receipts
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className={`p-5 rounded-2xl border space-y-3 ${cardBg}`}>
                      <div>
                        <h4 className={`text-sm font-bold ${textTitle}`}>Last Seen & Online Presence</h4>
                        <p className={`text-xs ${textMuted} mt-0.5`}>
                          Choose whether people can see your online green indicator and last active timestamp.
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-3 pt-1">
                        {(['everyone', 'nobody'] as const).map((opt) => {
                          const isSelected = privacy.lastSeen === opt;
                          return (
                            <button
                              key={opt}
                              onClick={() => {
                                setPrivacy({ ...privacy, lastSeen: opt });
                                toast.success(`Last seen set to ${opt === 'everyone' ? 'Everyone' : 'Nobody'}`);
                              }}
                              className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                                isSelected
                                  ? 'border-purple-500 bg-purple-500/10 font-bold text-purple-600 dark:text-purple-300 ring-1 ring-purple-500/30'
                                  : isLight
                                    ? 'border-slate-200 bg-white hover:bg-slate-100/70 text-slate-800'
                                    : 'border-white/10 hover:bg-white/5 text-white'
                              }`}
                            >
                              <span className="text-sm capitalize">{opt}</span>
                              {isSelected && <Check size={16} className="text-purple-500" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className={`p-5 rounded-2xl border flex items-center justify-between gap-4 ${cardBg}`}>
                      <div className="space-y-0.5">
                        <label className={`text-sm font-bold ${textTitle}`}>Read Receipts (Blue Ticks)</label>
                        <p className={`text-xs ${textMuted} max-w-md`}>
                          If turned off, you will not send or receive read receipts. Read receipts are always sent for group chats.
                        </p>
                      </div>
                      <Switch 
                        checked={privacy.readReceipts} 
                        onCheckedChange={(v) => {
                          setPrivacy({ ...privacy, readReceipts: v });
                          toast(v ? 'Read receipts enabled' : 'Read receipts turned off');
                        }} 
                      />
                    </div>

                    <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center shrink-0">
                        <Lock size={16} />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Direct Supabase Channel Security Active</p>
                        <p className={`text-[11px] ${textMuted}`}>Your messages transmit over encrypted TLS channels with strict Row Level Security (RLS).</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === 'language' && (
                <motion.div
                  key="language"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.15 }}
                  className="space-y-6"
                >
                  <div>
                    <h3 className={`text-lg font-bold flex items-center gap-2 ${textTitle}`}>
                      <Globe size={18} className="text-purple-500" />
                      App Language & Locale
                    </h3>
                    <p className={`text-xs ${textMuted} mt-0.5`}>
                      Select your preferred display language for Blink
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {languages.map((lang) => {
                      const isSelected = language === lang.code;
                      return (
                        <button
                          key={lang.code}
                          onClick={() => {
                            onLanguageChange(lang.code);
                            toast.success(`Language changed to ${lang.label}`);
                          }}
                          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                            isSelected
                              ? 'border-purple-500 bg-purple-500/10 ring-2 ring-purple-500/25 shadow-sm'
                              : isLight
                                ? 'border-slate-200 bg-white hover:border-purple-500/30 hover:bg-slate-50'
                                : 'border-white/10 bg-white/[0.03] hover:border-purple-500/30 hover:bg-white/[0.06]'
                          }`}
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className={`text-base font-bold ${textTitle}`}>{lang.native}</span>
                              <span className={`text-xs ${textMuted}`}>({lang.label})</span>
                            </div>
                            <p className={`text-[11px] ${textMuted} mt-1`}>{lang.region}</p>
                          </div>
                          {isSelected && (
                            <div className="w-6 h-6 rounded-full bg-purple-600 text-white flex items-center justify-center">
                              <Check size={14} />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {activeTab === 'chats' && (
                <motion.div
                  key="chats"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.15 }}
                  className="space-y-6"
                >
                  <div>
                    <h3 className={`text-lg font-bold flex items-center gap-2 ${textTitle}`}>
                      <Download size={18} className="text-purple-500" />
                      Chats & Data Management
                    </h3>
                    <p className={`text-xs ${textMuted} mt-0.5`}>
                      Export your messages or manage local message cache
                    </p>
                  </div>

                  <div className={`p-5 rounded-2xl border space-y-4 ${cardBg}`}>
                    <div>
                      <h4 className={`text-sm font-bold ${textTitle}`}>Export Chat Archive</h4>
                      <p className={`text-xs ${textMuted} mt-0.5`}>
                        Download your conversations as a formatted document file.
                      </p>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-3">
                      <div className="flex gap-2 w-full sm:w-auto">
                        <button
                          onClick={() => setExportFormat('pdf')}
                          className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                            exportFormat === 'pdf'
                              ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                              : isLight
                                ? 'border-slate-200 text-slate-600 hover:text-slate-900 bg-white'
                                : 'border-white/10 text-zinc-400 hover:text-white'
                          }`}
                        >
                          PDF Document
                        </button>
                        <button
                          onClick={() => setExportFormat('txt')}
                          className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                            exportFormat === 'txt'
                              ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                              : isLight
                                ? 'border-slate-200 text-slate-600 hover:text-slate-900 bg-white'
                                : 'border-white/10 text-zinc-400 hover:text-white'
                          }`}
                        >
                          Raw TXT
                        </button>
                      </div>

                      <Button
                        onClick={handleDownload}
                        className="w-full sm:w-auto sm:ml-auto rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold cursor-pointer"
                      >
                        <Download size={15} className="mr-2" /> Export My Chats
                      </Button>
                    </div>
                  </div>

                  <div className="p-5 rounded-2xl bg-destructive/5 border border-destructive/20 space-y-3">
                    <div className="flex items-center gap-3 text-destructive">
                      <Trash2 size={20} />
                      <div>
                        <h4 className="text-sm font-bold">Clear All Cached Chats</h4>
                        <p className="text-xs opacity-80 mt-0.5">
                          Removes locally stored messages and caches on this device.
                        </p>
                      </div>
                    </div>

                    {!showClearConfirm ? (
                      <Button
                        variant="outline"
                        onClick={() => setShowClearConfirm(true)}
                        className="rounded-xl border-destructive/30 text-destructive hover:bg-destructive/10 text-xs font-bold cursor-pointer"
                      >
                        Clear Chat History...
                      </Button>
                    ) : (
                      <div className="flex items-center gap-2 pt-1 animate-in fade-in">
                        <Button
                          variant="destructive"
                          onClick={handleDeleteChats}
                          className="rounded-xl text-xs font-bold"
                        >
                          Yes, Clear History
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => setShowClearConfirm(false)}
                          className="rounded-xl text-xs"
                        >
                          Cancel
                        </Button>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {activeTab === 'account' && (
                <motion.div
                  key="account"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.15 }}
                  className="space-y-6"
                >
                  <div>
                    <h3 className={`text-lg font-bold flex items-center gap-2 ${textTitle}`}>
                      <User size={18} className="text-purple-500" />
                      Account & Security Controls
                    </h3>
                    <p className={`text-xs ${textMuted} mt-0.5`}>
                      Review identity and manage sensitive session actions
                    </p>
                  </div>

                  <div className={`p-5 rounded-2xl border flex items-center gap-4 ${cardBg}`}>
                    <div 
                      className="w-16 h-16 rounded-2xl flex items-center justify-center text-white font-extrabold text-2xl shadow-md shrink-0 overflow-hidden"
                      style={{ backgroundColor: currentUser.avatarColor || '#7c3aed' }}
                    >
                      {currentUser.avatar ? (
                        <img 
                          src={currentUser.avatar} 
                          alt={currentUser.displayName} 
                          referrerPolicy="no-referrer"
                          onError={(e) => { e.currentTarget.style.display = 'none'; }}
                          className="w-full h-full object-cover" 
                        />
                      ) : (
                        currentUser.displayName ? currentUser.displayName[0].toUpperCase() : 'U'
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className={`text-base font-black truncate ${textTitle}`}>{currentUser.displayName}</h4>
                      <p className="text-xs text-purple-600 dark:text-purple-400 font-medium">@{currentUser.username}</p>
                      {currentUser.email && (
                        <p className={`text-xs ${textMuted} mt-1 truncate`}>{currentUser.email}</p>
                      )}
                    </div>
                    {onLogout && (
                      <Button
                        onClick={onLogout}
                        variant="outline"
                        className="rounded-xl border-red-500/30 text-red-500 hover:bg-red-500/10 text-xs font-bold cursor-pointer shrink-0"
                      >
                        <LogOut size={14} className="mr-1.5" /> Sign Out
                      </Button>
                    )}
                  </div>

                  <div className="p-5 rounded-2xl bg-destructive/5 border border-destructive/20 space-y-4">
                    <div className="flex items-center gap-3 text-destructive">
                      <AlertTriangle size={20} />
                      <div>
                        <h4 className="text-sm font-bold">Delete Blink Account</h4>
                        <p className="text-xs opacity-80 mt-0.5">
                          Permanently wipe your account, profile, and all conversation keys.
                        </p>
                      </div>
                    </div>

                    {!showDeleteConfirm ? (
                      <Button
                        variant="destructive"
                        onClick={() => setShowDeleteConfirm(true)}
                        className="rounded-xl text-xs font-bold cursor-pointer"
                      >
                        Delete My Account...
                      </Button>
                    ) : (
                      <div className="space-y-3 pt-2 animate-in fade-in">
                        <p className={`text-xs ${textMuted}`}>
                          Type your username <strong className="select-all px-1 py-0.5 rounded font-mono font-bold bg-black/10 dark:bg-white/10">{currentUser.username}</strong> to confirm:
                        </p>
                        <Input
                          value={deleteAccountName}
                          onChange={(e) => setDeleteAccountName(e.target.value)}
                          placeholder="Type username here..."
                          className="rounded-xl text-xs"
                        />
                        <div className="flex gap-2">
                          <Button
                            variant="destructive"
                            disabled={deleteAccountName !== currentUser.username}
                            onClick={handleDeleteAccount}
                            className="rounded-xl text-xs font-bold"
                          >
                            Permanently Delete
                          </Button>
                          <Button
                            variant="ghost"
                            onClick={() => {
                              setShowDeleteConfirm(false);
                              setDeleteAccountName('');
                            }}
                            className="rounded-xl text-xs"
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

      </motion.div>

      {/* Global Wallpaper Modal Child */}
      <WallpaperModal
        isOpen={showWallpaperModal}
        onClose={() => setShowWallpaperModal(false)}
        currentId={currentWallpaper.id}
        onApply={(id) => {
          setWallpaper(id, true);
          setShowWallpaperModal(false);
          toast.success('Chat wallpaper updated!');
        }}
        title="Global Chat Wallpaper"
      />
    </div>
  );
};

export default SettingsPanel;
