import { useState, useEffect } from 'react';
import { Pin, BellOff, Image, Mic, Video, FileText } from 'lucide-react';
import { useLocalStorage } from '@/hooks/use-local-storage';
import UserAvatar from './Avatar';
import { Chat } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/config/supabase';

interface ChatListItemProps {
  chat: Chat;
  isActive: boolean;
  onClick: () => void;
  currentUser: any;
}

const ChatListItem = ({ chat, isActive, onClick, currentUser }: ChatListItemProps) => {
  const [nickname] = useLocalStorage(`nickname_${chat.user.id}`, chat.user.displayName);
  const [isOnline, setIsOnline] = useState(chat.user.isOnline);

  useEffect(() => {
    // Relying on chat.user.isOnline which is updated by Index.tsx
    setIsOnline(chat.user.isOnline);
  }, [chat.user.isOnline]);

  const lastMsg = chat.lastMessage;
  const isMyMessage = lastMsg?.senderId === currentUser.id;
  const unreadCount = chat.unreadCount || 0;

  const renderMediaIcon = () => {
    if (!lastMsg) return null;
    switch (lastMsg.type) {
      case 'image': return <Image size={13} className="text-muted-foreground shrink-0" />;
      case 'voice': return <Mic size={13} className="text-muted-foreground shrink-0" />;
      case 'video': return <Video size={13} className="text-muted-foreground shrink-0" />;
      case 'document': return <FileText size={13} className="text-muted-foreground shrink-0" />;
      default: return null;
    }
  };

  const getPreviewText = () => {
    if (!lastMsg) return 'No messages yet';
    if (lastMsg.content) return lastMsg.content;
    const type = lastMsg.type;
    if (!type || type === 'text') return '';
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  const [showContextMenu, setShowContextMenu] = useState(false);
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setMenuPos({ x: e.clientX, y: e.clientY });
    setShowContextMenu(true);
  };

  useEffect(() => {
    const handleClick = () => setShowContextMenu(false);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  return (
    <>
      <div 
        onClick={onClick}
        onContextMenu={handleContextMenu}
        className={`flex items-center gap-3 px-4 py-3.5 cursor-pointer relative transition-all duration-300 group mx-2 my-1 rounded-2xl
          ${isActive ? 'bg-[#1a1a1a] shadow-lg shadow-purple-500/5' : 'hover:bg-[#1a1a1a]/50'}`}
      >
        {/* Avatar */}
        <div className="relative shrink-0">
          <UserAvatar name={chat.user.displayName} color={chat.user.avatarColor} size="md" isOnline={isOnline} className="w-12 h-12" />
          {isOnline && (
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-[#0f0f0f] shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
          )}
        </div>

        {/* Content section */}
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-center mb-1">
            <h3 className={`font-bold text-[14px] truncate flex-1 tracking-tight ${isActive ? 'text-purple-400' : 'text-zinc-200'}`}>
              {nickname}
            </h3>
            <span className={`text-[10px] shrink-0 font-medium tracking-tight ${unreadCount > 0 ? 'text-purple-400' : 'text-zinc-500'}`}>
              {lastMsg?.timestamp || ''}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <div className="flex items-center gap-1.5 min-w-0 overflow-hidden">
              {isMyMessage && lastMsg && (
                <span className={`text-[11px] shrink-0 font-bold ${lastMsg.status === 'seen' ? 'text-cyan-400' : 'text-zinc-600'}`}>
                  {lastMsg.status === 'seen' ? '✓✓' : '✓'}
                </span>
              )}
              {renderMediaIcon()}
              <span className="text-[12px] text-zinc-500 truncate leading-tight font-medium">
                 {chat.user.displayName.includes('Group') ? `~ ${lastMsg?.senderId === currentUser.id ? 'You' : 'Member'}: ` : ''}
                 {!chat.user.isOnline && !lastMsg && chat.user.lastSeen ? `Last seen ${chat.user.lastSeen}` : getPreviewText()}
              </span>
            </div>
            
            {/* Badges */}
            <div className="shrink-0 ml-1 flex items-center gap-1">
              {unreadCount > 0 && !isActive && (
                <span className="bg-orange-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center shadow-sm">
                  {unreadCount}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showContextMenu && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed z-[100] bg-card border border-primary/20 rounded-xl shadow-2xl py-2 w-48 overflow-hidden"
            style={{ top: menuPos.y, left: menuPos.x }}
          >
            {[
              { label: 'Archive Chat', action: () => {} },
              { label: 'Mute Notifications', action: () => {} },
              { label: 'Pin Chat', action: () => {} },
              { label: 'Mark as Unread', action: () => {} },
              { label: 'Delete Chat', action: () => {}, className: 'text-destructive' },
            ].map((item, idx) => (
              <button
                key={idx}
                onClick={(e) => { e.stopPropagation(); item.action(); setShowContextMenu(false); }}
                className={`w-full text-left px-4 py-2 text-sm hover:bg-primary/10 transition-colors ${item.className || 'text-foreground'}`}
              >
                {item.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default ChatListItem;
