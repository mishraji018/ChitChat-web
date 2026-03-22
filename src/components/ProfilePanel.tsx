import { useState, useRef } from 'react';
import { X, Camera, Copy, LogOut, Pencil, Phone, Lock } from 'lucide-react';
import { User } from '@/types/chat';
import UserAvatar from './Avatar';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useLocalStorage } from '@/hooks/use-local-storage';
import ImageCropModal from './ImageCropModal';

interface ProfilePanelProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  onLogout: () => void;
}

const ProfilePanel = ({ isOpen, onClose, currentUser, onLogout }: ProfilePanelProps) => {
  const [avatarUrl, setAvatarUrl] = useLocalStorage('blinkchat_avatarUrl', '');
  const [displayName, setDisplayName] = useLocalStorage('blinkchat_displayName', currentUser.displayName);
  const [status, setStatus] = useLocalStorage('blinkchat_status', currentUser.status);

  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState(displayName);

  const [isEditingStatus, setIsEditingStatus] = useState(false);
  const [editStatus, setEditStatus] = useState(status);
  
  const [appPin, setAppPin] = useLocalStorage('blinkchat_app_pin', '');
  
  const [tempImage, setTempImage] = useState<string | null>(null);
  const [showCropModal, setShowCropModal] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCopyUsername = () => {
    navigator.clipboard.writeText(`@${currentUser.username}`);
    toast.success('Copied!');
  };

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setTempImage(reader.result as string);
        setShowCropModal(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCropComplete = async (blob: Blob) => {
    setShowCropModal(false);
    const url = URL.createObjectURL(blob);
    setAvatarUrl(url);
    
    // Save to backend
    try {
      const formData = new FormData();
      formData.append('avatar', blob, 'avatar.jpg');
      
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const res = await fetch(`${API_URL}/api/auth/update-avatar`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('blinkchat_token')}` },
        body: formData
      });
      
      if (res.ok) {
        toast.success('Profile picture updated!');
      }
    } catch (err) {
      console.error('Avatar upload error:', err);
    }
  };

  const saveName = () => {
    if (editName.trim()) setDisplayName(editName.trim());
    else setEditName(displayName);
    setIsEditingName(false);
  };

  const saveStatus = () => {
    if (editStatus.trim()) setStatus(editStatus.trim());
    else setEditStatus(status);
    setIsEditingStatus(false);
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
        <h2 className="font-bold text-lg">Profile</h2>
      </div>

      {/* Cover gradient */}
      <div className="h-28 bg-gradient-to-br from-pink-500 to-fuchsia-600 relative shrink-0" />

      {/* Avatar Section */}
      <div className="flex flex-col items-center -mt-12 px-4 shrink-0">
        <div className="relative">
          <UserAvatar name={displayName} color={currentUser.avatarColor} size="xl" image={avatarUrl || undefined} />
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="absolute bottom-0 right-0 w-9 h-9 rounded-full bg-primary flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
          >
            <Camera size={16} className="text-white" />
          </button>
          <input type="file" accept="image/*" ref={fileInputRef} className="hidden" onChange={handleAvatarSelect} />
        </div>

        {/* Editable Name */}
        <div className="mt-4 flex items-center gap-2">
          {isEditingName ? (
            <input 
              autoFocus 
              value={editName} 
              onChange={e => setEditName(e.target.value)}
              onBlur={saveName} 
              onKeyDown={e => e.key === 'Enter' && saveName()}
              className="text-xl font-bold bg-muted rounded-lg px-3 py-1 text-center border-none outline-none ring-1 ring-primary/30" 
            />
          ) : (
            <h2 className="text-xl font-bold text-foreground">{displayName}</h2>
          )}
          <button onClick={() => setIsEditingName(true)} className="text-muted-foreground hover:text-primary transition-colors">
            <Pencil size={14} />
          </button>
        </div>

        {/* Username */}
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1 cursor-pointer hover:text-foreground transition-colors" onClick={handleCopyUsername}>
          <span>@{currentUser.username}</span>
          <Copy size={13} />
        </div>
      </div>

      {/* About Section */}
      <div className="px-5 mt-8">
        <label className="text-xs font-semibold text-primary uppercase tracking-wider mb-2 block">About</label>
        {isEditingStatus ? (
          <div className="relative">
            <textarea 
              autoFocus 
              value={editStatus} 
              onChange={e => setEditStatus(e.target.value)}
              onBlur={saveStatus} 
              maxLength={100} 
              rows={3}
              className="w-full bg-muted/50 border border-primary/50 rounded-xl px-4 py-3 text-sm resize-none outline-none focus:ring-1 focus:ring-primary/30" 
            />
            <span className="absolute bottom-2 right-3 text-xs text-muted-foreground">{editStatus.length}/100</span>
          </div>
        ) : (
          <div 
            onClick={() => setIsEditingStatus(true)}
            className="w-full bg-muted/30 border border-border/30 hover:border-border/60 rounded-xl px-4 py-3 text-sm cursor-pointer flex items-start justify-between gap-2 transition-all"
          >
            <span className="text-foreground leading-relaxed">{status}</span>
            <Pencil size={13} className="text-muted-foreground shrink-0 mt-0.5" />
          </div>
        )}
      </div>

      {/* Mobile Number Section */}
      <div className="px-5 mt-4">
        <label className="text-xs font-semibold text-primary uppercase tracking-wider mb-2 block">Mobile Number</label>
        <div className="flex items-center gap-2 bg-muted/30 border border-border/30 rounded-xl px-4 py-3 group">
          <Phone size={14} className="text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">+91 {currentUser.mobileNumber || 'N/A'}</span>
          <span className="ml-auto text-[10px] font-medium text-muted-foreground bg-muted p-1 rounded">Read-only</span>
        </div>
      </div>

      {/* Security Section */}
      <div className="px-5 mt-4 text-left">
        <label className="text-xs font-semibold text-primary uppercase tracking-wider mb-2 block">Security</label>
        <button 
          onClick={() => {
            const pin = prompt('Enter new 4-digit PIN (or leave empty to disable):');
            if (pin === null) return;
            if (pin === '' || /^\d{4}$/.test(pin)) {
              setAppPin(pin);
              toast.success(pin ? 'App Lock enabled!' : 'App Lock disabled!');
            } else {
              toast.error('PIN must be 4 digits');
            }
          }}
          className="w-full flex items-center justify-between bg-muted/30 border border-border/30 rounded-xl px-4 py-3 hover:bg-muted/50 transition-all text-left"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Lock size={14} className="text-primary" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium text-foreground">App Lock</span>
              <span className="text-[10px] text-muted-foreground">Require PIN to open app</span>
            </div>
          </div>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${appPin ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
            {appPin ? 'Enabled' : 'Disabled'}
          </span>
        </button>
      </div>

      <div className="flex-1" />

      {/* Logout */}
      <div className="p-4 border-t border-border">
        <button 
          onClick={onLogout}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-destructive hover:bg-destructive/10 transition-colors font-medium border border-destructive/10"
        >
          <LogOut size={18} />
          Logout
        </button>
      </div>
      {/* Image Crop Modal */}
      <AnimatePresence>
        {showCropModal && tempImage && (
          <ImageCropModal 
            imageSrc={tempImage} 
            onCropComplete={handleCropComplete} 
            onCancel={() => setShowCropModal(false)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default ProfilePanel;
