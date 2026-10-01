/**
 * FILE: ChatListItem.tsx
 * PURPOSE: Renders a single conversation item in the sidebar list
 * HOOKS USED: useState, useEffect, useLocalStorage
 */

import { useState, useEffect, useMemo } from 'react';
import { Pin, BellOff, Image, Mic, Video, FileText, ChevronRight } from 'lucide-react';
import { useLocalStorage } from '@/hooks/use-local-storage';
import UserAvatar from './Avatar';
import { Chat } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';

interface Props { chat: Chat; isActive: boolean; onClick: () => void; currentUser: any; }

const ChatListItem = ({ chat, isActive, onClick, currentUser }: Props) => {
  // ─── [1-15] State & Refs ──────────────────
  const [nick] = useLocalStorage(`nickname_${chat.user.id}`, chat.user.displayName);
  const [isO, setIsO] = useState(chat.user.isOnline);
  const [showCtx, setShowCtx] = useState(false);
  const [mPos, setMPos] = useState({ x: 0, y: 0 });

  // Persistent states from localStorage
  const isPinned = useMemo(() => localStorage.getItem(`pinned_${chat.id}`) === 'true', [chat.id]);
  const isMuted = useMemo(() => localStorage.getItem(`muted_${chat.id}`) === 'true', [chat.id]);

  useEffect(() => setIsO(chat.user.isOnline), [chat.user.isOnline]);
  useEffect(() => { const hC = () => setShowCtx(false); window.addEventListener('click', hC); return () => window.removeEventListener('click', hC); }, []);

  // ─── [16-60] Helpers ──────────────────────
  const last = chat.lastMessage, isMe = last?.senderId === currentUser.id, uCount = chat.unreadCount || 0;

  const renderIcon = () => {
    if (!last) return null;
    const props = { size: 13, className: "shrink-0" };
    switch (last.type) {
      case 'image':
      case 'photo': return <Image {...props} />;
      case 'voice':
      case 'audio': return <Mic {...props} />;
      case 'video': return <Video {...props} />;
      case 'file':
      case 'document': return <FileText {...props} />;
      default: return null;
    }
  };

  const getPText = () => {
    if (!last) return 'No messages yet';
    if (last.type === 'text' || !last.type) return last.content || last.text || 'No messages yet';
    const labels: Record<string, string> = { 
      image: '📷 Photo', 
      photo: '📷 Photo',
      video: '🎥 Video', 
      audio: '🎵 Audio', 
      voice: '🎵 Audio', 
      file: '📄 File', 
      document: '📄 File' 
    };
    return labels[last.type] || last.type.charAt(0).toUpperCase() + last.type.slice(1);
  };

  const hCtx = (e: React.MouseEvent) => { e.preventDefault(); setMPos({ x: e.clientX, y: e.clientY }); setShowCtx(true); };

  // ─── [61-148] Render ──────────────────────
  return (
    <>
      <div onClick={onClick} onContextMenu={hCtx} className={`flex items-center gap-3 px-4 py-3 cursor-pointer relative transition-all group mx-3 my-1 rounded-2xl ${isActive ? 'bg-black/5 dark:bg-white/10 shadow-sm' : 'hover:bg-black/5 dark:hover:bg-white/5'}`}>
        <div className="relative shrink-0">
          <UserAvatar name={chat.user.displayName} color={chat.user.avatarColor} size="md" isOnline={isO} className="w-11 h-11" />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-center mb-0.5">
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              <h3 className={`font-bold text-[14px] truncate ${isActive ? 'text-[var(--bg-primary)] font-extrabold' : 'text-[var(--chat-list-text,#111111)]'}`}>
                {nick}
              </h3>
              {isMuted && <BellOff size={12} className="text-[var(--chat-list-subtext,#666666)] opacity-60 shrink-0" />}
              {isPinned && <Pin size={12} className="text-[var(--bg-primary)] rotate-45 shrink-0" />}
            </div>
            <span className={`text-[10px] shrink-0 font-medium ${uCount > 0 ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-[var(--chat-list-subtext,#666666)] opacity-70'}`}>
              {last?.timestamp || ''}
            </span>
          </div>
          
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-1.5 min-w-0 overflow-hidden">
              {isMe && last && <span className={`text-[11px] font-bold ${last.status === 'seen' ? 'text-teal-600' : 'text-[var(--chat-list-subtext,#666666)] opacity-60'}`}>{last.status === 'seen' ? '✓✓' : '✓'}</span>}
              {renderIcon()}
              <span className="text-[12px] text-[var(--chat-list-subtext,#666666)] truncate font-medium">{getPText()}</span>
            </div>
            <div className="flex items-center gap-1.5">
              {uCount > 0 && !isActive && (
                <span className="bg-emerald-500 text-white dark:bg-emerald-500 dark:text-white text-[10px] font-extrabold rounded-full min-w-[20px] h-5 px-1.5 flex items-center justify-center shadow-md">
                  {uCount}
                </span>
              )}
              {isPinned && !isActive && <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />}
              <ChevronRight size={14} className="text-[var(--chat-list-subtext,#666666)] opacity-40 md:hidden" />
            </div>
          </div>
        </div>
      </div>
      
      <AnimatePresence>
        {showCtx && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }} 
            animate={{ opacity: 1, scale: 1 }} 
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed z-[100] bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl shadow-2xl py-2 w-48 overflow-hidden backdrop-blur-xl" 
            style={{ top: mPos.y, left: mPos.x }}
          >
            {[
              { label: isPinned ? 'Unpin' : 'Pin', icon: <Pin size={14} /> },
              { label: isMuted ? 'Unmute' : 'Mute', icon: <BellOff size={14} /> },
              { label: 'Archive', icon: <FileText size={14} /> },
              { isSeparator: true },
              { label: 'Delete', icon: <Trash2Icon size={14} />, className: 'text-red-400' }
            ].map((l: any, i) => l.isSeparator ? <div key={i} className="h-px border-b border-[var(--border-color)] my-1" /> : (
              <button key={i} className={`w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-white/5 transition-colors ${l.className || 'text-[var(--text-primary)]'}`}>
                {l.icon}
                <span>{l.label} Chat</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

const Trash2Icon = ({ size, className }: { size?: number, className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
);

export default ChatListItem;
