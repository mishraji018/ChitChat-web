import { useState, useRef } from 'react';
import { X, Bell, Lock, Image as ImageIcon, Globe, Check, Upload, Download, Trash2, UserX, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { User, ThemeType } from '@/types/chat';
import { translations } from '@/i18n/translations';
import { wallpapers } from '@/data/wallpapers';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  currentTheme: ThemeType;
  onThemeChange: (theme: ThemeType) => void;
  wallpaper: string;
  onWallpaperChange: (wallpaper: string) => void;
  language: string;
  onLanguageChange: (lang: string) => void;
  currentUser: User;
}

const themes: { key: ThemeType; label: string; fill: string; border: string }[] = [
  { key: 'dark',      label: 'Dark',      fill: '#0d0a0f', border: '#f472b6' },
  { key: 'deep-blue', label: 'Deep Blue', fill: '#0a1628', border: '#4f8ef7' },
  { key: 'light',     label: 'Light',     fill: '#f4f6fa', border: '#00b894' },
  { key: 'rose',      label: 'Rose',      fill: '#1a0a0f', border: '#f472b6' },
];

const languages = ['English', 'Hindi', 'Spanish', 'French'];

const SettingsItem = ({ icon, title, subtitle, onClick }: { icon: React.ReactNode, title: string, subtitle: string, onClick?: () => void }) => (
  <button onClick={onClick}
    className="flex items-center gap-4 w-full px-4 py-3.5 rounded-2xl hover:bg-muted/30 transition-colors">
    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
      {icon}
    </div>
    <div className="text-left">
      <p className="text-[15px] font-semibold text-foreground leading-tight">{title}</p>
      <p className="text-[13px] text-muted-foreground mt-0.5">{subtitle}</p>
    </div>
    <ChevronRight size={16} className="text-muted-foreground ml-auto" />
  </button>
);

const SettingsPanel = ({ isOpen, onClose, currentTheme, onThemeChange, wallpaper, onWallpaperChange, language, onLanguageChange, currentUser }: SettingsPanelProps) => {
  const safeT = translations[language as keyof typeof translations] || translations['English'];
  
  const [notifications, setNotifications] = useLocalStorage('blinkchat_notifications', { message: true, sound: true, vibration: true });
  const [privacy, setPrivacy] = useLocalStorage('blinkchat_privacy', { lastSeen: 'everyone', profilePhoto: 'everyone', readReceipts: true });
  const [deleteAccountName, setDeleteAccountName] = useState('');
  const deviceWallpaperRef = useRef<HTMLInputElement>(null);

  const handleDeleteChats = () => {
    toast.success('Your chats have been cleared');
  };

  const handleDeleteAccount = () => {
    window.location.reload();
  };

  const handleDownload = () => {
    toast('Chat export coming soon!');
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ x: -100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: -100, opacity: 0 }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      className="absolute inset-y-0 left-0 z-40 bg-card flex flex-col w-full lg:w-[340px] lg:border-r lg:border-border shadow-2xl"
    >
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-border">
        <button onClick={onClose} className="p-1 hover:bg-muted rounded-full transition-colors">
          <X size={20} />
        </button>
        <h2 className="font-bold text-lg">Settings</h2>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1 scrollbar-thin">
        
        {/* Notifications */}
        <Dialog>
          <DialogTrigger asChild>
            <SettingsItem icon={<Bell size={18} />} title="Notifications" subtitle="Message, group & call tones" />
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Notifications</DialogTitle>
            </DialogHeader>
            <div className="space-y-6 py-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <label className="text-sm font-medium">Show Message Previews</label>
                  <p className="text-[13px] text-muted-foreground">Preview message text in alerts.</p>
                </div>
                <Switch checked={notifications.message} onCheckedChange={(v) => setNotifications({...notifications, message: v})} />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <label className="text-sm font-medium">In-App Sounds</label>
                  <p className="text-[13px] text-muted-foreground">Play sounds for incoming messages.</p>
                </div>
                <Switch checked={notifications.sound} onCheckedChange={(v) => setNotifications({...notifications, sound: v})} />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <label className="text-sm font-medium">Vibrate</label>
                  <p className="text-[13px] text-muted-foreground">Vibrate on message receive.</p>
                </div>
                <Switch checked={notifications.vibration} onCheckedChange={(v) => setNotifications({...notifications, vibration: v})} />
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Privacy */}
        <Dialog>
          <DialogTrigger asChild>
            <SettingsItem icon={<Lock size={18} />} title="Privacy" subtitle="Last seen, profile photo, read receipts" />
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Privacy</DialogTitle>
            </DialogHeader>
            <div className="space-y-6 py-4">
              <div className="space-y-3">
                <label className="text-sm font-semibold text-primary">Last Seen & Online</label>
                <div className="flex gap-4">
                  {(['everyone', 'nobody'] as const).map(opt => (
                    <label key={opt} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="radio" name="lastseen" checked={privacy.lastSeen === opt} onChange={() => setPrivacy({...privacy, lastSeen: opt})} className="accent-primary" />
                      {opt === 'everyone' ? 'Everyone' : 'Nobody'}
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between border-t border-border/50 pt-5">
                <div className="space-y-0.5">
                  <label className="text-sm font-semibold">Read Receipts</label>
                  <p className="text-[12px] text-muted-foreground">If turned off, you won't send or receive Read Receipts.</p>
                </div>
                <Switch checked={privacy.readReceipts} onCheckedChange={(v) => setPrivacy({...privacy, readReceipts: v})} />
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Wallpaper */}
        <Dialog>
          <DialogTrigger asChild>
            <SettingsItem icon={<ImageIcon size={18} />} title="Chat Wallpaper" subtitle="Change default background" />
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Chat Wallpaper</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-3 gap-4 py-4">
              {wallpapers.map(wp => (
                <button
                  key={wp.id}
                  onClick={() => onWallpaperChange(wp.id)}
                  className={`h-24 rounded-xl border-4 transition-all relative overflow-hidden ${wallpaper === wp.id ? 'border-primary scale-105' : 'border-border hover:border-primary/50'}`}
                  style={{ background: wp.color }}
                >
                  {wallpaper === wp.id && (
                    <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                      <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                        <Check size={14} className="text-primary-foreground" />
                      </div>
                    </div>
                  )}
                </button>
              ))}
              <button
                onClick={() => deviceWallpaperRef.current?.click()}
                className="h-24 rounded-xl border-2 border-dashed border-primary/50 hover:border-primary flex flex-col items-center justify-center gap-2 transition-all hover:bg-primary/10"
              >
                <Upload size={20} className="text-primary" />
                <span className="text-xs text-primary font-medium">Device</span>
              </button>
              <input type="file" accept="image/*" className="hidden" ref={deviceWallpaperRef} onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onload = (ev) => {
                    const dataUrl = ev.target?.result as string;
                    onWallpaperChange(`device:${dataUrl}`);
                  };
                  reader.readAsDataURL(file);
                }
              }} />
            </div>
          </DialogContent>
        </Dialog>

        {/* Language */}
        <Dialog>
          <DialogTrigger asChild>
            <SettingsItem icon={<Globe size={18} />} title="App Language" subtitle={language} />
          </DialogTrigger>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>App Language</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-2 mt-4">
              {languages.map(lang => (
                <Button 
                  key={lang} 
                  variant={language === lang ? "default" : "ghost"} 
                  className={`justify-start ${language === lang ? 'bg-primary text-primary-foreground' : ''}`}
                  onClick={() => onLanguageChange(lang)}
                >
                  {lang}
                </Button>
              ))}
            </div>
          </DialogContent>
        </Dialog>

        {/* Theme Section */}
        <div className="px-4 py-4">
          <label className="text-xs font-semibold text-primary uppercase tracking-wider mb-4 block">Theme</label>
          <div className="flex gap-5">
            {themes.map(t => (
              <button key={t.key} onClick={() => onThemeChange(t.key)}
                className="flex flex-col items-center gap-1.5">
                <div className="w-10 h-10 rounded-full border-2 flex items-center justify-center transition-transform hover:scale-110"
                  style={{ backgroundColor: t.fill, borderColor: t.border,
                    transform: currentTheme === t.key ? 'scale(1.15)' : 'scale(1)',
                    boxShadow: currentTheme === t.key ? `0 4px 12px ${t.border}60` : 'none' }}>
                  {currentTheme === t.key && <Check size={14} style={{ color: t.border }} />}
                </div>
                <span className="text-[11px] text-muted-foreground">{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Download Chats */}
        <Dialog>
          <DialogTrigger asChild>
            <SettingsItem icon={<Download size={18} />} title="Download My Chats" subtitle="Export as PDF or TXT" />
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Download My Chats</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">Format</label>
                <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none">
                  <option>PDF Document</option>
                  <option>TXT Raw Document</option>
                </select>
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button onClick={handleDownload} className="w-full">Download</Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <div className="h-px bg-border/50 my-3 mx-2" />

        {/* Danger Zone */}
        <Dialog>
          <DialogTrigger asChild>
            <button className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-destructive/10 text-destructive font-medium transition-colors">
              <Trash2 size={18} />
              <span>Delete All Chats</span>
            </button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Clear all chats?</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground py-2">
              This will permanently delete all your message history. This action cannot be undone.
            </p>
            <DialogFooter className="gap-2">
              <DialogClose asChild>
                <Button variant="secondary">Cancel</Button>
              </DialogClose>
              <Button variant="destructive" onClick={handleDeleteChats}>Clear All</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog>
          <DialogTrigger asChild>
            <button className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-destructive/10 text-destructive font-medium transition-colors">
              <UserX size={18} />
              <span>Delete Account</span>
            </button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete your account?</DialogTitle>
            </DialogHeader>
            <div className="py-2 space-y-4">
              <p className="text-sm border border-destructive/30 bg-destructive/10 text-destructive p-3 rounded-lg font-medium">
                Warning: This is permanent and all your data will be wiped.
              </p>
              <p className="text-sm font-medium">Type <strong className="select-all bg-muted px-1 py-0.5 rounded">{currentUser.username}</strong> to confirm.</p>
              <Input 
                value={deleteAccountName}
                onChange={e => setDeleteAccountName(e.target.value)}
                placeholder="Username..."
              />
            </div>
            <DialogFooter className="gap-2">
              <DialogClose asChild>
                <Button variant="secondary">Cancel</Button>
              </DialogClose>
              <Button 
                variant="destructive" 
                disabled={deleteAccountName !== currentUser.username}
                onClick={handleDeleteAccount}
              >
                Delete Account
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </motion.div>
  );
};

export default SettingsPanel;
