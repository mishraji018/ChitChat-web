import React, { useState, useMemo, useEffect } from 'react';
import { X, MessageSquare, Phone, Video, Search, FileText, Download, Edit2, Check, User as UserIcon, Image as ImageIcon, Sparkles } from 'lucide-react';
import UserAvatar from './Avatar';
import { User, Message, Chat, ThemeType } from '@/types/chat';
import { motion } from 'framer-motion';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { toast } from 'sonner';
import { supabase } from '@/config/supabase';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ContactInfoPanelProps {
  user: User;
  chat: Chat;
  messages: Message[];
  onClose: () => void;
  onOpenWallpaper: () => void;
  onOpenSearch: () => void;
  onMessageClick: () => void;
  onDeleteConversation: (chatId: string) => void;
  currentTheme?: ThemeType;
}

const ContactInfoPanel = ({ 
  user, 
  chat, 
  messages, 
  onClose, 
  onOpenWallpaper, 
  onOpenSearch, 
  onMessageClick,
  onDeleteConversation,
  currentTheme = 'dark'
}: ContactInfoPanelProps) => {
  const isLight = currentTheme === 'light';
  const [showAllMedia, setShowAllMedia] = useState(false);
  const [isEditingNickname, setIsEditingNickname] = useState(false);
  const [nickname, setNickname] = useLocalStorage(`nickname_${user.id}`, user.displayName);
  const [tempNickname, setTempNickname] = useState(nickname);

  const [mediaList, setMediaList] = useState<any[]>([]);
  const [docsList, setDocsList] = useState<any[]>([]);
  const [isLoadingMedia, setIsLoadingMedia] = useState(false);
  const [contactUser, setContactUser] = useState<User>(user);

  // Keyboard shortcut: Escape to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleSaveNickname = () => {
    setNickname(tempNickname);
    setIsEditingNickname(false);
    toast.success('Nickname updated');
  };

  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toLocaleDateString('en-IN', {
        day: 'numeric', month: 'long', year: 'numeric'
      });
    } catch { return dateStr; }
  };

  // Real-time user updates
  useEffect(() => {
    const fetchUserData = async () => {
      const { data } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();
      if (data) {
        setContactUser(prev => ({
          ...prev,
          displayName: data.display_name || prev.displayName,
          username: data.username || prev.username,
          avatar: data.avatar_url || prev.avatar,
          avatarColor: data.avatar_color || prev.avatarColor,
          status: data.bio || prev.status,
          isOnline: data.is_online,
          lastSeen: data.last_seen,
        }));
      }
    };
    fetchUserData();
  }, [user.id]);

  // Fetch shared media from database
  useEffect(() => {
    const fetchSharedContent = async () => {
      setIsLoadingMedia(true);
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('chat_id', chat.id)
        .not('media_url', 'is', null)
        .order('created_at', { ascending: false });

      if (!error && data) {
        const media = data.filter(m => {
          const mt = (m.media_type || m.type || '').toLowerCase();
          return mt.includes('image') || mt.includes('video') || mt === 'image' || mt === 'video';
        });
        const docs = data.filter(m => {
          const mt = (m.media_type || m.type || '').toLowerCase();
          return mt === 'document' || mt === 'file' 
            || mt.includes('pdf') || mt.includes('word') || mt.includes('text')
            || mt.includes('zip') || mt.includes('application');
        });
        setMediaList(media);
        setDocsList(docs);
      }
      setIsLoadingMedia(false);
    };

    fetchSharedContent();
  }, [chat.id]);

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

      {/* Glassy Centered Modal */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.94, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 15 }}
        transition={{ type: 'spring', damping: 25, stiffness: 320 }}
        className={`relative z-10 w-full max-w-lg h-[640px] max-h-[90vh] rounded-[2.2rem] backdrop-blur-3xl border flex flex-col overflow-hidden transition-colors ${panelBg}`}
      >
        {/* Top Glow Accent */}
        <div className="absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-purple-500/50 to-transparent pointer-events-none" />

        {/* ── Modal Header ── */}
        <div className={`px-6 py-4 border-b flex items-center justify-between gap-4 shrink-0 transition-colors ${headerBg}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-purple-500/25 shrink-0">
              <UserIcon size={20} />
            </div>
            <div>
              <h2 className={`text-xl font-black tracking-tight ${textTitle}`}>Contact Details</h2>
              <p className={`text-xs ${textMuted}`}>Overview of conversations and media</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={() => { setIsEditingNickname(!isEditingNickname); setTempNickname(nickname); }}
              className={`p-2 rounded-xl transition-all cursor-pointer ${
                isEditingNickname ? 'bg-purple-600 text-white' : closeBtnBg
              }`}
              title="Edit Nickname"
            >
              <Edit2 size={16} />
            </button>
            <button 
              onClick={onClose}
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer ${closeBtnBg}`}
              title="Close (Esc)"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ── Modal Body ── */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin">
          
          {/* Contact Header Showcase */}
          <div className="flex flex-col items-center w-full text-center">
            <div className="relative">
              <UserAvatar name={contactUser.displayName} color={contactUser.avatarColor} avatar={contactUser.avatar} size="2xl" />
              {contactUser.isOnline && (
                <span className="absolute bottom-1 right-1 w-5 h-5 bg-emerald-500 rounded-full border-2 border-white dark:border-[#101015] shadow-sm flex items-center justify-center">
                  <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />
                </span>
              )}
            </div>
            
            <div className="mt-3.5 w-full flex flex-col items-center">
              {isEditingNickname ? (
                <div className="flex items-center gap-2 w-full max-w-xs px-2 animate-in fade-in">
                  <input 
                    autoFocus
                    type="text"
                    value={tempNickname}
                    onChange={(e) => setTempNickname(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveNickname()}
                    placeholder="Enter nickname..."
                    className={`flex-1 rounded-xl px-3 py-1.5 text-sm font-bold border focus:border-purple-500 outline-none ${
                      isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-white/10 border-white/20 text-white'
                    }`}
                  />
                  <button 
                    onClick={handleSaveNickname}
                    className="p-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors cursor-pointer"
                  >
                    <Check size={16} />
                  </button>
                </div>
              ) : (
                <>
                  <h3 className={`text-xl font-black tracking-tight ${textTitle}`}>{nickname}</h3>
                  {nickname !== contactUser.displayName && (
                    <p className={`text-xs ${textMuted}`}>({contactUser.displayName})</p>
                  )}
                </>
              )}
            </div>
            
            <p className="text-xs font-semibold text-purple-600 dark:text-purple-400 mt-1">@{contactUser.username}</p>
            <p className="text-xs font-medium text-emerald-500 mt-0.5">
              {contactUser.isOnline ? 'Online now' : formatDate(contactUser.lastSeen) ? `Last seen ${formatDate(contactUser.lastSeen)}` : 'Offline'}
            </p>
          </div>

          {/* Quick Actions Bar */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { icon: <MessageSquare size={18} />, label: 'Message', onClick: () => { onMessageClick(); onClose(); } },
              { icon: <Phone size={18} />,         label: 'Call',    disabled: true },
              { icon: <Video size={18} />,         label: 'Video',   disabled: true },
              { icon: <Search size={18} />,        label: 'Search',  onClick: () => { onOpenSearch(); onClose(); } },
            ].map(btn => (
              <button 
                key={btn.label} 
                onClick={btn.onClick}
                disabled={btn.disabled}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border transition-all ${cardBg} ${
                  btn.disabled ? 'opacity-40 cursor-not-allowed' : 'hover:scale-[1.03] cursor-pointer hover:border-purple-500/40'
                }`}
              >
                <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                  {btn.icon}
                </div>
                <span className={`text-[11px] font-semibold ${textMuted}`}>{btn.label}</span>
              </button>
            ))}
          </div>

          {/* About / Bio Status */}
          <div className={`p-4 rounded-2xl border space-y-1.5 ${cardBg}`}>
            <p className={`text-[10px] font-bold uppercase tracking-wider ${textMuted}`}>About & Bio</p>
            <p className={`text-sm leading-relaxed ${textTitle}`}>
              {contactUser.status || 'Hey there! I am using Blink'}
            </p>
          </div>

          {/* Shared Media Section */}
          <div className={`p-4 rounded-2xl border space-y-3 ${cardBg}`}>
            <div className="flex justify-between items-center">
              <p className={`text-[10px] font-bold uppercase tracking-wider ${textMuted}`}>Shared Media & Files</p>
              {mediaList.length > 0 && (
                <button 
                  onClick={() => setShowAllMedia(true)} 
                  className="text-xs text-purple-600 dark:text-purple-400 hover:underline font-bold cursor-pointer"
                >
                  See All ({mediaList.length})
                </button>
              )}
            </div>

            <div className="grid grid-cols-4 gap-2">
              {mediaList.slice(0, 4).map((media, i) => {
                const isVideo = (media.media_type || media.type || '').toLowerCase().startsWith('video');
                return (
                  <div key={i} className="aspect-square rounded-xl overflow-hidden bg-black/10 dark:bg-white/5 cursor-pointer hover:opacity-85 transition-opacity relative group">
                    {isVideo ? (
                      <>
                        <video src={media.media_url} className="w-full h-full object-cover" muted />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                          <span className="text-white text-xs">▶</span>
                        </div>
                      </>
                    ) : (
                      <img src={media.media_url} alt={`Shared ${i}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    )}
                  </div>
                );
              })}
              {isLoadingMedia ? (
                <div className="col-span-4 flex justify-center py-4">
                  <div className="w-5 h-5 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
                </div>
              ) : mediaList.length === 0 ? (
                <p className={`col-span-4 text-xs ${textMuted} text-center py-3 italic`}>No photos or videos shared yet</p>
              ) : null}
            </div>
          </div>

          {/* Shared Documents */}
          {docsList.length > 0 && (
            <div className={`p-4 rounded-2xl border space-y-2.5 ${cardBg}`}>
              <p className={`text-[10px] font-bold uppercase tracking-wider ${textMuted}`}>Documents</p>
              <div className="space-y-2">
                {docsList.slice(0, 3).map((doc, i) => (
                  <div key={i} className="flex items-center gap-3 p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                    <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center shrink-0">
                      <FileText size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-bold truncate ${textTitle}`}>{doc.media_name || 'Document'}</p>
                      <p className={`text-[10px] ${textMuted}`}>
                        {doc.media_size ? `${(doc.media_size / 1024).toFixed(1)} KB` : 'Document'}
                      </p>
                    </div>
                    <a 
                      href={doc.media_url} 
                      download 
                      target="_blank" 
                      rel="noreferrer" 
                      className={`p-1.5 rounded-lg ${closeBtnBg}`}
                    >
                      <Download size={14} />
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

      </motion.div>

      {/* Expanded Shared Media Modal */}
      <Dialog open={showAllMedia} onOpenChange={setShowAllMedia}>
        <DialogContent className="max-w-2xl rounded-3xl backdrop-blur-2xl">
          <DialogHeader>
            <DialogTitle>All Shared Media</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 max-h-[60vh] overflow-y-auto p-1 scrollbar-thin">
            {mediaList.map((media, i) => (
              <div key={i} className="aspect-square rounded-xl overflow-hidden bg-black/10 dark:bg-white/5 cursor-pointer hover:opacity-85 transition-opacity">
                <img 
                  src={media.media_url} 
                  alt={`Shared ${i}`}
                  className="w-full h-full object-cover hover:scale-105 transition-transform"
                />
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ContactInfoPanel;
