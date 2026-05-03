import { X, MessageSquare, Phone, Video, Search, FileText, Download, Edit2, Check } from 'lucide-react';
import UserAvatar from './Avatar';
import { User, Message, Chat } from '@/types/chat';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useMemo, useEffect } from 'react';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { toast } from 'sonner';
import { supabase } from '@/config/supabase';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ContactInfoPanelProps {
  user: User;
  chat: Chat;
  messages: Message[];
  onClose: () => void;
  onOpenWallpaper: () => void;
  onOpenSearch: () => void;
  onMessageClick: () => void;
  onDeleteConversation: (chatId: string) => void;
}

const ContactInfoPanel = ({ 
  user, 
  chat, 
  messages, 
  onClose, 
  onOpenWallpaper, 
  onOpenSearch, 
  onMessageClick,
  onDeleteConversation 
}: ContactInfoPanelProps) => {
  const [showAllMedia, setShowAllMedia] = useState(false);
  const [isEditingNickname, setIsEditingNickname] = useState(false);
  const [nickname, setNickname] = useLocalStorage(`nickname_${user.id}`, user.displayName);
  const [tempNickname, setTempNickname] = useState(nickname);

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
    } catch (e) { return dateStr; }
  };

  // Real-time user updates (About/Bio/Online status)
  const [contactUser, setContactUser] = useState<User>(user);

  useEffect(() => {
    setContactUser(user);
  }, [user]);

  useEffect(() => {
    if (!user.id) return;

    const channel = supabase.channel(`user_updates_${user.id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'users',
        filter: `id=eq.${user.id}`
      }, (payload) => {
        const updated = payload.new;
        setContactUser(prev => ({
          ...prev,
          displayName: updated.display_name || updated.name || prev.displayName,
          username: updated.username || prev.username,
          status: updated.status || prev.status,
          avatar: updated.avatar_url || prev.avatar,
          lastSeen: updated.last_seen || prev.lastSeen
        }));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user.id]);

  // Fetch all media and documents from Supabase
  const [mediaList, setMediaList] = useState<any[]>([]);
  const [docsList, setDocsList] = useState<any[]>([]);

  useEffect(() => {
    const fetchSharedContent = async () => {
      if (!chat.id) return;
      
      const { data, error } = await supabase
        .from('messages')
        .select('media_url, media_type, media_name, media_size, created_at, text, type')
        .eq('chat_id', chat.id)
        .not('media_url', 'is', null)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setMediaList(data.filter(m => m.media_type?.startsWith('image') || m.type === 'image'));
        setDocsList(data.filter(m => m.media_type === 'document' || m.type === 'document' || m.type === 'file'));
      }
    };

    fetchSharedContent();
  }, [chat.id]);

  // Filter messages for this conversation only
  const conversationMessages = useMemo(() => 
    messages.filter(msg => msg.senderId === user.id || msg.receiverId === user.id),
    [messages, user.id]
  );

  const sharedMedia = useMemo(() => 
    conversationMessages.filter(msg => msg.type === 'image')
      .map(msg => ({ url: msg.content, date: msg.timestamp })),
    [conversationMessages]
  );

  const sharedDocs = useMemo(() => 
    conversationMessages.filter(msg => msg.type === 'document')
      .map(msg => ({
        name: msg.fileName || 'Document',
        size: msg.fileSize || 'Unknown size',
        date: msg.timestamp,
        url: msg.content
      })),
    [conversationMessages]
  );



  return (
    <>
      <motion.div 
        initial={{ x: 340 }}
        animate={{ x: 0 }}
        exit={{ x: 340 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="w-[340px] h-full bg-card border-l border-border flex flex-col z-40 shadow-xl overflow-hidden shrink-0"
      >
        <div className="flex items-center justify-between p-4 border-b border-border bg-card">
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="p-1 hover:bg-muted rounded-full transition-colors">
              <X size={20} />
            </button>
            <h2 className="font-bold text-lg">Contact Info</h2>
          </div>
          <button 
            onClick={() => { setIsEditingNickname(!isEditingNickname); setTempNickname(nickname); }}
            className={`p-2 rounded-full transition-colors ${isEditingNickname ? 'bg-primary text-white' : 'hover:bg-muted text-muted-foreground'}`}
          >
            <Edit2 size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {/* Profile Section */}
            <div className="flex flex-col items-center w-full">
              <div className="relative">
                <UserAvatar name={contactUser.displayName} color={contactUser.avatarColor} size="2xl" />
                {contactUser.isOnline && (
                  <span className="absolute bottom-1 right-1 w-6 h-6 bg-online rounded-full border-4 border-card" />
                )}
              </div>
              
              <div className="mt-4 w-full flex flex-col items-center">
                {isEditingNickname ? (
                  <div className="flex items-center gap-2 w-full px-4">
                    <div className="flex-1 bg-muted/50 rounded-lg px-3 py-2 border border-primary/30 flex flex-col">
                      <span className="text-[10px] text-primary font-bold uppercase tracking-tight">Nickname</span>
                      <input 
                        autoFocus
                        type="text"
                        value={tempNickname}
                        onChange={(e) => setTempNickname(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSaveNickname()}
                        className="bg-transparent border-none outline-none text-base font-bold text-foreground w-full"
                      />
                    </div>
                    <button 
                      onClick={handleSaveNickname}
                      className="p-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                    >
                      <Check size={20} />
                    </button>
                  </div>
                ) : (
                  <>
                    <h2 className="text-xl font-bold text-foreground text-center px-4">{nickname}</h2>
                    {nickname !== contactUser.displayName && (
                      <p className="text-xs text-muted-foreground mt-0.5">({contactUser.displayName})</p>
                    )}
                  </>
                )}
              </div>
              
              <p className="text-sm text-muted-foreground mt-1">@{contactUser.username}</p>
              <p className="text-sm text-primary mt-1 font-medium">{contactUser.isOnline ? 'Online' : formatDate(contactUser.lastSeen) || 'Last seen recently'}</p>
            </div>

          {/* Action Buttons Row */}
          <div className="flex justify-around px-2 py-4 border-b border-border">
            {[
              { icon: <MessageSquare size={20} />, label: 'Message', onClick: onMessageClick },
              { icon: <Phone size={20} />,         label: 'Call',    disabled: true },
              { icon: <Video size={20} />,         label: 'Video',   disabled: true },
              { icon: <Search size={20} />,        label: 'Search',  onClick: onOpenSearch },
            ].map(btn => (
              <button 
                key={btn.label} 
                onClick={btn.onClick}
                disabled={btn.disabled}
                className={`flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all group ${btn.disabled ? 'opacity-30 cursor-not-allowed' : 'hover:bg-primary/10 cursor-pointer'}`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${btn.disabled ? 'bg-muted text-muted-foreground' : 'bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white'}`}>
                  {btn.icon}
                </div>
                <span className="text-[11px] text-muted-foreground">{btn.label}</span>
              </button>
            ))}
          </div>

          {/* Bio / About */}
          <div className="px-4 py-6 border-b border-border">
            <p className="text-xs text-primary font-bold uppercase tracking-widest mb-2 font-display">About</p>
            <p className="text-sm text-foreground leading-relaxed">{contactUser.status || 'Hey there! I am using BlinkChat'}</p>
          </div>

          {/* Shared Media Section */}
          <div className="px-4 py-6 border-b border-border">
            <div className="flex justify-between items-center mb-4">
              <p className="text-xs text-primary font-bold uppercase tracking-widest font-display">Media, Links & Docs</p>
              {mediaList.length > 0 && (
                <button onClick={() => setShowAllMedia(true)} className="text-xs text-primary hover:underline font-semibold">See All</button>
              )}
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {mediaList.slice(0, 6).map((media, i) => (
                <div key={i} className="aspect-square rounded-lg overflow-hidden bg-muted cursor-pointer hover:opacity-80 transition-opacity">
                  <img src={media.media_url} alt={`Shared ${i}`} className="w-full h-full object-cover" />
                </div>
              ))}
              {mediaList.length === 0 && (
                <p className="col-span-3 text-sm text-muted-foreground text-center py-4 italic">No media shared yet</p>
              )}
            </div>
          </div>

          {/* Shared Documents */}
          <div className="px-4 py-6 border-b border-border">
            <p className="text-xs text-primary font-bold uppercase tracking-widest mb-4 font-display">Shared Documents</p>
            <div className="space-y-3">
              {docsList.map((doc, i) => (
                <div key={i} className="flex items-center gap-3 py-1 group cursor-pointer">
                  <div className="w-10 h-10 rounded-xl bg-muted group-hover:bg-primary/10 flex items-center justify-center transition-colors">
                    <FileText size={18} className="text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate text-foreground">{doc.media_name || 'Document'}</p>
                    <p className="text-[11px] text-muted-foreground">{doc.media_size ? `${(doc.media_size / 1024).toFixed(1)} KB` : 'Unknown size'} • {formatDate(doc.created_at)}</p>
                  </div>
                  <a href={doc.media_url} download target="_blank" rel="noreferrer" className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-full transition-all">
                    <Download size={16} />
                  </a>
                </div>
              ))}
              {docsList.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-2 italic">No documents shared</p>
              )}
            </div>
          </div>

        </div>
      </motion.div>


      <Dialog open={showAllMedia} onOpenChange={setShowAllMedia}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Shared Media</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-3 gap-3 max-h-[60vh] overflow-y-auto p-1 scrollbar-thin">
            {mediaList.map((media, i) => (
              <div key={i} className="aspect-square rounded-lg overflow-hidden bg-muted cursor-pointer hover:opacity-80 group transition-all">
                <img 
                  src={media.media_url} 
                  alt={`Shared ${i}`}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ContactInfoPanel;

