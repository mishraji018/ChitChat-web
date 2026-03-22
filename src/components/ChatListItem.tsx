import { useState, useEffect } from 'react';
import { Pin, BellOff, Image, Mic, Video, FileText } from 'lucide-react';
import { useLocalStorage } from '@/hooks/use-local-storage';
import UserAvatar from './Avatar';
import { Chat } from '@/types/chat';
import { motion, AnimatePresence } from 'framer-motion';

interface ChatListItemProps {
  chat: Chat;
  isActive: boolean;
  onClick: () => void;
  currentUser: any;
}

const ChatListItem = ({ chat, isActive, onClick, currentUser }: ChatListItemProps) => {
  const [nickname] = useLocalStorage(`nickname_${chat.user.id}`, chat.user.displayName);

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
    return lastMsg.content || (lastMsg.type !== 'text' ? lastMsg.type.charAt(0).toUpperCase() + lastMsg.type.slice(1) : '');
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
        className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer relative transition-colors duration-150 group
          ${isActive ? 'bg-muted/60' : 'hover:bg-muted/40'}`}
      >
        {/* Avatar */}
        <div className="relative shrink-0">
          <UserAvatar name={chat.user.displayName} color={chat.user.avatarColor} size="md" isOnline={chat.user.isOnline} />
        </div>

        {/* Content section */}
        <div className="flex-1 min-w-0 border-b border-border/30 pb-2.5">
          <div className="flex justify-between items-center">
            {/* Name + icons */}
            <div className="flex items-center gap-1 min-w-0">
              <h3 className={`font-semibold text-[15px] truncate flex-1 ${isActive ? 'text-primary' : 'text-foreground'}`}>
              {nickname}
            </h3>
              <div className="flex items-center gap-1 shrink-0">
                {chat.isPinned && <Pin size={11} className="text-primary" />}
                {chat.isMuted && <BellOff size={11} className="text-muted-foreground" />}
              </div>
            </div>
            {/* Time */}
            <span className={`text-[11px] shrink-0 font-medium ${unreadCount > 0 ? 'text-primary' : 'text-muted-foreground'}`}>
              {lastMsg?.timestamp || ''}
            </span>
          </div>

          <div className="flex justify-between items-center mt-0.5">
            {/* Message preview */}
            <div className="flex items-center gap-1 min-w-0 overflow-hidden">
              {isMyMessage && lastMsg && (
                <span className={`text-xs shrink-0 font-bold ${lastMsg.status === 'read' ? 'text-blue-400' : 'text-muted-foreground'}`}>
                  {lastMsg.isQueued ? '🕐' : lastMsg.status === 'sent' ? '✓' : '✓✓'}
                </span>
              )}
              {renderMediaIcon()}
              <span className="text-sm text-muted-foreground truncate leading-tight">
                 {chat.user.displayName.includes('Group') ? `~ ${lastMsg?.senderId === currentUser.id ? 'You' : 'Member'}: ` : ''}
                 {!chat.user.isOnline && !lastMsg && chat.user.lastSeen ? `Last seen ${chat.user.lastSeen}` : getPreviewText()}
              </span>
            </div>
            
            {/* Badges */}
            <div className="shrink-0 ml-1 flex items-center gap-1">
              {unreadCount > 0 && (
                <span className={`${chat.isMuted ? 'bg-muted' : 'bg-primary'} text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1`}>
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
