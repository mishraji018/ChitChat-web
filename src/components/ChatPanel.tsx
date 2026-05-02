/**
 * FILE: ChatPanel.tsx
 * PURPOSE: Main chat interface for viewing and sending messages
 * HOOKS USED: useRef, useEffect, useState, useLocalStorage, useMessages, usePresence, etc.
 * SUPABASE TABLES: messages, users (via hooks)
 */

import { useRef, useEffect, useState } from 'react';
import { supabase } from '@/config/supabase';
import { ArrowLeft, Search, MoreVertical, ChevronDown, BellOff, User, UserPlus, Image as Wallpaper, Archive, Pin, Trash2, Ban, Flag, ChevronUp, X as CloseIcon } from 'lucide-react';
import { Chat, Message, ThemeType, MessageStatus, User as UserType } from '@/types';
import UserAvatar from './Avatar';
import MessageBubble from './MessageBubble';
import InputBar from './InputBar';
import { motion, AnimatePresence } from 'framer-motion';
import { translations } from '@/i18n/translations';
import { v4 as uuidv4 } from 'uuid';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { useMessages } from '@/hooks/useMessages';
import { usePresence } from '@/hooks/usePresence';
import { useTyping } from '@/hooks/useTyping';
import { useStreak } from '@/hooks/useStreak';
import { MemoryCapsuleCreation } from './MemoryCapsule';
import { MemoryCapsuleList } from './MemoryCapsuleList';
import { useBoringDetector } from '@/hooks/useBoringDetector';
import { useOfflineQueue } from '@/hooks/useOfflineQueue';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useFileUpload } from '@/hooks/useFileUpload';
import { useIndexedDB } from '@/hooks/useIndexedDB';
import { toast } from 'sonner';
import { toast as shadcnToast } from '@/components/ui/use-toast';

interface ChatPanelProps {
  chat: Chat | null;
  onBack: () => void;
  currentTheme?: ThemeType;
  t?: any;
  currentUser: UserType;
  onSendMessage?: (chatId: string, message: Message) => void;
  onOpenInfo?: () => void;
  onOpenSearch?: () => void;
  showSearch?: boolean;
  onCloseSearch?: () => void;
  onToggleMute?: (chatId: string) => void;
  onTogglePin?: (chatId: string) => void;
  onToggleArchive?: (chatId: string) => void;
  onToggleBlock?: (chatId: string) => void;
  onDeleteChat?: (chatId: string) => void;
  onReportChat?: (chatId: string) => void;
  onAddToGroup?: (user: UserType) => void;
  onOpenWallpaper?: () => void;
  onReact?: (chatId: string, messageId: string, emoji: string) => void;
}

const TypingIndicator = () => (
  <div className="flex justify-start px-4 mb-2">
    <div className="bg-[#1e1e1e] border border-white/5 rounded-2xl rounded-bl-md px-4 py-2.5 shadow-sm">
      <div className="flex gap-1.5 items-center">
        {[0, 1, 2].map(i => (
          <motion.div key={i} className="w-1.5 h-1.5 rounded-full bg-purple-500/60"
            animate={{ scale: [0.7, 1, 0.7], opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }}
          />
        ))}
      </div>
    </div>
  </div>
);

const ChatPanel = ({ chat, onBack, t, currentUser, onSendMessage, onOpenInfo, onOpenSearch, showSearch, onCloseSearch, onToggleMute, onTogglePin, onToggleArchive, onToggleBlock, onDeleteChat, onReportChat, onAddToGroup, onOpenWallpaper, onReact }: ChatPanelProps) => {
  // ─── [1-45] State & Refs ──────────────────
  const [isBlocked, setIsBlocked] = useLocalStorage(`blocked_${chat?.user.id}`, false);
  const [nickname] = useLocalStorage(`nickname_${chat?.user.id}`, chat?.user.displayName || '');
  const [isMuted, setIsMuted] = useLocalStorage(`muted_${chat?.id}`, false);
  const [isPinned, setIsPinned] = useLocalStorage(`pinned_${chat?.id}`, false);
  const [isArchived, setIsArchived] = useLocalStorage(`archived_${chat?.id}`, false);
  const [wallpaper, setWallpaper] = useLocalStorage(`wallpaper_${chat?.id}`, 'default');
  
  const [searchQuery, setSearchQuery] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [currentMatch, setCurrentMatch] = useState(0);
  const [searchResults, setSearchResults] = useState<number[]>([]);
  
  // Modals state
  const [showWallpaperModal, setShowWallpaperModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showBlockConfirm, setShowBlockConfirm] = useState(false);
  
  const bottomRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const topObserverRef = useRef<HTMLDivElement>(null);

  // ─── [46-75] Hooks ────────────────────────
  const { messages, sendMessage, markAsRead, loading: mLoading, setMessages } = useMessages(chat?.id || null);
  const { onlineUsers } = usePresence(currentUser.id);
  const { isTyping: isRecTyping, handleTyping } = useTyping(chat?.id || null, currentUser.id);
  const { streak, updateStreak, justBroken } = useStreak(currentUser.id, chat?.user.id || '');
  const { checkIfBoring } = useBoringDetector();
  const { addToQueue, getQueue } = useOfflineQueue();
  const { isOnline, wasOffline } = useNetworkStatus();
  const { uploadFile, getFileCategory } = useFileUpload();
  const { saveToIndexedDB } = useIndexedDB();
  const lastCheckedCount = useRef(0);

  // ─── [76-130] Effects & Helpers ───────────
  const scroll = (b: ScrollBehavior = 'smooth') => messagesEndRef.current?.scrollIntoView({ behavior: b });

  useEffect(() => {
    if (chat?.id) scroll(messages.length > 0 ? 'smooth' : 'auto');
  }, [chat?.id, messages]);

  useEffect(() => {
    if (chat?.id && currentUser?.id) {
      markAsRead(chat.id, currentUser.id);
      if (messages.length > 0) {
        const last = messages[messages.length - 1];
        if (last.senderId !== currentUser.id) markAsRead(chat.id, currentUser.id);
      }
    }
  }, [chat?.id, currentUser.id, messages.length]);

  useEffect(() => {
    if (justBroken) shadcnToast({ title: "💔 Streak ended!", variant: "destructive" });
  }, [justBroken]);

  useEffect(() => {
    (async () => {
      if (messages.length > 0 && messages.length % 10 === 0 && messages.length !== lastCheckedCount.current) {
        lastCheckedCount.current = messages.length;
        const res = await checkIfBoring(messages, currentUser.id);
        if (res && res.boringScore > 65) {
          toast.custom((id) => (
            <div className="w-[350px] bg-gradient-to-br from-[#1a0b2e] to-[#0a0a0a] border border-purple-500/30 p-5 rounded-2xl shadow-2xl backdrop-blur-xl flex flex-col gap-4">
              <div className="flex items-start gap-3">
                <div className="text-2xl">{res.emoji}</div>
                <div className="flex-1"><p className="text-zinc-100 font-medium text-sm">😴 Chat feels quiet...</p><p className="text-purple-300 text-xs mt-1 italic">{res.suggestion}</p></div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => toast.dismiss(id)} className="flex-1 py-2 bg-purple-600 text-white text-[11px] font-bold rounded-lg">Try it! 🙌</button>
                <button onClick={() => toast.dismiss(id)} className="flex-1 py-2 bg-white/5 text-zinc-400 text-[11px] font-medium rounded-lg">Fine 😅</button>
              </div>
            </div>
          ), { duration: 8000 });
        }
      }
    })();
  }, [messages.length, currentUser.id, checkIfBoring]);

  const isContactOnline = chat ? onlineUsers.includes(chat.user.id) : false;
  
  const formatLS = (d: string) => {
    if (!d) return 'Offline';
    const date = new Date(d), now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 60000);
    if (diff < 1) return 'Last seen just now';
    if (diff < 60) return `Last seen ${diff} min${diff > 1 ? 's' : ''} ago`;
    return date.toDateString() === now.toDateString() ? `Last seen today at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : `Last seen on ${date.toLocaleDateString()} at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  const statusText = isRecTyping ? 'typing...' : isContactOnline ? 'Online' : formatLS(chat?.user.lastSeen || '');
  const safeT = t || translations['English'];

  const WALLPAPERS = [
    { id: 'default', name: 'Default', class: 'bg-[#0f0f0f]' },
    { id: 'purple', name: 'Purple Gradient', class: 'bg-gradient-to-br from-[#1a0b2e] via-[#0f0f0f] to-[#0a0a0a]' },
    { id: 'blue', name: 'Blue Gradient', class: 'bg-gradient-to-br from-[#0b1a2e] via-[#0f0f0f] to-[#050505]' },
    { id: 'green', name: 'Green Gradient', class: 'bg-gradient-to-br from-[#0b2e1a] via-[#0f0f0f] to-[#050505]' },
    { id: 'sunset', name: 'Sunset Gradient', class: 'bg-gradient-to-br from-[#2e1a0b] via-[#0f0f0f] to-[#0a0a0a]' },
    { id: 'ocean', name: 'Ocean Gradient', class: 'bg-gradient-to-br from-[#004e92] via-[#000428] to-[#0a0a0a]' },
  ];

  const REPORT_REASONS = ["Spam", "Harassment", "Fake Account", "Inappropriate Content", "Other"];

  // ─── [131-250] Handlers ───────────────────
  const handleSend = async (text: string, iType?: string, iMedia?: any) => {
    if (!chat || !currentUser) return;
    const type = iType || 'text', content = text.trim();
    if (type === 'text' && !content) return;

    if (!isOnline) {
      addToQueue({ id: uuidv4(), chatId: chat.id, senderId: currentUser.id, text: content, createdAt: new Date().toISOString() });
      return;
    }
    try {
      console.log('Sending:', { content, chatId: chat.id, userId: currentUser.id });
      const data = await sendMessage(content, currentUser.id, chat.id, type, iMedia);
      await updateStreak();
      if (onSendMessage && data) onSendMessage(chat.id, { id: data.id, senderId: currentUser.id, receiverId: chat.user.id, type, content, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), createdAt: data.created_at, status: 'sent' } as Message);
    } catch (err) {
      console.error('Send failed:', err);
      toast.error('Failed to send message');
    }
  };

  const handleFileSend = async (f: File) => {
    if (!chat || !currentUser) return;
    if (f.size > 50 * 1024 * 1024) return shadcnToast({ title: "File too large (max 50MB)", variant: "destructive" });

    if (!isOnline) {
      if (f.size < 1024 * 1024) {
        const r = new FileReader(), tid = uuidv4();
        r.onload = async () => saveToIndexedDB({ id: tid, chatId: chat.id, senderId: currentUser.id, fileData: r.result, fileName: f.name, fileType: f.type, fileSize: f.size, createdAt: new Date().toISOString() });
        r.readAsArrayBuffer(f);
        shadcnToast({ title: "📵 Offline", description: "Saved for later" });
      } else shadcnToast({ title: "Large file offline", variant: "destructive" });
      return;
    }
    try {
      const result = await uploadFile(f, chat.id, currentUser.id);
      await supabase.from('messages').insert({
        chat_id: chat.id,
        sender_id: currentUser.id,
        text: result.name,
        type: result.type,
        media_url: result.url,
        media_type: result.type,
        media_name: result.name,
        media_size: result.size,
        upload_status: 'done',
        status: 'sent',
        seen: false,
        created_at: new Date().toISOString()
      });
    } catch (e) { console.error('Upload error:', e); }
  };

  // ─── [Internal Action Handlers] ───────────
  const handleMute = () => {
    const newVal = !isMuted;
    setIsMuted(newVal);
    onToggleMute?.(chat!.id);
    toast.success(newVal ? "Notifications muted 🔇" : "Notifications unmuted");
  };

  const handlePin = () => {
    const newVal = !isPinned;
    setIsPinned(newVal);
    onTogglePin?.(chat!.id);
    toast.success(newVal ? "Chat pinned 📌" : "Chat unpinned");
  };

  const handleArchive = () => {
    const newVal = !isArchived;
    setIsArchived(newVal);
    onToggleArchive?.(chat!.id);
    toast.success(newVal ? "Chat archived 📦" : "Chat ununarchived");
  };

  const handleDelete = async () => {
    try {
      await supabase.from('messages').delete().eq('chat_id', chat!.id);
      await supabase.from('chats').delete().eq('id', chat!.id);
      toast.success("Chat deleted 🗑️");
      onDeleteChat?.(chat!.id);
      onBack();
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete chat");
    }
  };

  const handleBlock = () => {
    const newVal = !isBlocked;
    setIsBlocked(newVal);
    onToggleBlock?.(chat!.id);
    toast.success(newVal ? "User blocked 🚫" : "User unblocked");
    setShowBlockConfirm(false);
  };

  const handleReport = (reason: string) => {
    toast.success("Report submitted. We'll review it soon. 🚩");
    onReportChat?.(chat!.id);
    setShowReportModal(false);
  };

  useEffect(() => {
    const click = (e: MouseEvent) => menuRef.current && !menuRef.current.contains(e.target as Node) && setShowMenu(false);
    document.addEventListener('mousedown', click);
    return () => document.removeEventListener('mousedown', click);
  }, []);

  useEffect(() => {
    if (!searchQuery) return setSearchResults([]);
    const m = messages.map((msg, i) => msg.type === 'text' && msg.content.toLowerCase().includes(searchQuery.toLowerCase()) ? i : -1).filter(i => i !== -1);
    setSearchResults(m); setCurrentMatch(0);
  }, [searchQuery, messages]);

  const onScroll = () => { if (containerRef.current) setShowScrollBtn(containerRef.current.scrollHeight - containerRef.current.scrollTop - containerRef.current.clientHeight > 100); };

  // ─── [251-561] Render ─────────────────────
  return (
    <div className="flex-1 h-full bg-[#0f0f0f] relative overflow-hidden flex flex-col">
      {!chat ? (
        <div className="flex-1 flex items-center justify-center text-center p-8 bg-[#0f0f0f]">
          <div className="flex flex-col items-center"><div className="w-24 h-24 rounded-[32px] bg-purple-500/5 flex items-center justify-center mb-6 border border-purple-500/10"><Search size={48} className="text-purple-500/40" /></div><h3 className="text-xl font-bold text-zinc-100 mb-2">Select a chat</h3><p className="text-zinc-500 text-sm max-w-[240px]">Select a conversation to start.</p></div>
        </div>
      ) : (
        <>
          <div className="h-[72px] px-6 border-b border-white/5 bg-[#0f0f0f]/80 backdrop-blur-xl flex items-center justify-between z-30 shrink-0">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <button onClick={onBack} className="p-2 -ml-2 text-zinc-500 md:hidden"><ArrowLeft size={20} /></button>
              <div className="relative cursor-pointer flex items-center gap-3" onClick={onOpenInfo}>
                <UserAvatar name={nickname || chat.user.displayName} color={chat.user.avatarColor} size="md" isOnline={isContactOnline} className="w-10 h-10" />
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-[15px] text-zinc-100 truncate">{nickname || chat.user.displayName}</h3>
                    {isMuted && <BellOff size={12} className="text-zinc-500" />}
                    {streak >= 2 && <span className={`text-sm font-bold flex items-center gap-1 ${streak >= 30 ? 'text-yellow-400 animate-pulse' : streak >= 7 ? 'text-yellow-400' : 'text-orange-400'}`}>{streak >= 30 ? '🔥🔥🔥' : streak >= 7 ? '🔥🔥' : '🔥'} {streak}</span>}
                  </div>
                  <span className={`text-[11px] font-medium ${isRecTyping ? 'text-purple-400' : 'text-zinc-500'} flex items-center gap-1`}>{isContactOnline && !isRecTyping && !isBlocked && <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />}{!isBlocked ? statusText : 'Offline'}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <MemoryCapsuleCreation chatId={chat.id} currentUserId={currentUser.id} /><MemoryCapsuleList chatId={chat.id} /><button onClick={onOpenSearch} className="p-2 text-zinc-500 hover:text-purple-400 hover:bg-white/5 rounded-xl"><Search size={20} /></button>
              <div className="relative" ref={menuRef}><button onClick={() => setShowMenu(!showMenu)} className="p-2 text-zinc-500 hover:text-zinc-200 hover:bg-white/5 rounded-xl"><MoreVertical size={20} /></button>
                <AnimatePresence>{showMenu && <motion.div initial={{ opacity: 0, scale: 0.95, y: -10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: -10 }} className="absolute right-0 mt-2 w-60 bg-[#1a1a1a] border border-white/10 rounded-2xl shadow-2xl z-[100] py-2 overflow-hidden backdrop-blur-xl">
                  {[
                    { icon: <User size={16} />, label: 'Contact Info', action: onOpenInfo },
                    { icon: <UserPlus size={16} />, label: 'Add to Group', action: () => { toast.info("Group feature coming soon!"); onAddToGroup?.(chat.user); } },
                    { icon: <BellOff size={16} />, label: isMuted ? 'Unmute' : 'Mute', action: handleMute },
                    { icon: <Wallpaper size={16} />, label: 'Wallpaper', action: () => setShowWallpaperModal(true) },
                    { icon: <Archive size={16} />, label: isArchived ? 'Unarchive' : 'Archive', action: handleArchive },
                    { icon: <Pin size={16} />, label: isPinned ? 'Unpin' : 'Pin', action: handlePin },
                    { isSeparator: true },
                    { icon: <Trash2 size={16} />, label: 'Delete', action: () => setShowDeleteConfirm(true), className: 'text-red-400' },
                    { icon: <Ban size={16} />, label: isBlocked ? 'Unblock' : 'Block', action: () => isBlocked ? handleBlock() : setShowBlockConfirm(true), className: 'text-red-400' },
                    { icon: <Flag size={16} />, label: 'Report', action: () => setShowReportModal(true), className: 'text-red-400' },
                  ].map((item, idx) =>
                    (item as any).isSeparator
                      ? <div key={idx} className="h-px bg-white/5 my-1" />
                      : (
                        <button
                          key={idx}
                          onClick={() => { (item as any).action?.(); setShowMenu(false); }}
                          className={`w-full flex items-center gap-3 px-4 py-2.5 text-[13px] font-medium hover:bg-white/5 transition-colors ${(item as any).className || 'text-zinc-300'}`}
                        >
                          {(item as any).icon}
                          <span>{(item as any).label}</span>
                        </button>
                      )
                  )}
                </motion.div>}</AnimatePresence>
              </div>
            </div>
            <AnimatePresence>{showSearch && <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="absolute top-full left-0 right-0 bg-[#1a1a1a] border-b border-white/5 z-20 px-4 py-3 flex items-center gap-3 backdrop-blur-xl"><Search size={18} className="text-zinc-500" /><input autoFocus type="text" placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="flex-1 bg-transparent border-none outline-none text-[14px] text-zinc-100" /><div className="flex items-center gap-2">{searchQuery && <span className="text-[11px] text-zinc-500 bg-white/5 px-2 py-0.5 rounded-full">{searchResults.length > 0 ? `${currentMatch + 1}/${searchResults.length}` : '0 results'}</span>}<div className="flex items-center border-l border-white/10 pl-2"><button disabled={!searchResults.length} onClick={() => setCurrentMatch(p => (p - 1 + searchResults.length) % searchResults.length)} className="p-1.5 text-zinc-500 disabled:opacity-30"><ChevronUp size={16} /></button><button disabled={!searchResults.length} onClick={() => setCurrentMatch(p => (p + 1) % searchResults.length)} className="p-1.5 text-zinc-500 disabled:opacity-30"><ChevronDown size={16} /></button></div><button onClick={() => { onCloseSearch?.(); setSearchQuery(''); }} className="p-1.5 text-zinc-500 hover:text-purple-400"><CloseIcon size={18} /></button></div></motion.div>}</AnimatePresence>
          </div>
          {isBlocked && <div className="bg-red-500/10 text-red-400 text-[12px] py-2 px-4 text-center border-b border-red-500/20 z-20">You have blocked this user. <button onClick={handleBlock} className="font-bold underline">Unblock</button></div>}
          <div ref={containerRef} onScroll={onScroll} className={`flex-1 overflow-y-auto overflow-x-hidden p-4 flex flex-col gap-1 chat-pattern scrollbar-thin z-10 ${WALLPAPERS.find(w => w.id === wallpaper)?.class || 'bg-[#0f0f0f]'}`}>
            {!isOnline && <div className="bg-red-500/20 border border-red-500/30 text-red-400 text-xs text-center py-2 px-4 rounded-lg mx-4 my-2">{getQueue().length > 0 ? `📵 Offline — ${getQueue().length} queued` : "📵 You're offline"}</div>}
            {wasOffline && isOnline && <div className="bg-green-500/20 border border-green-500/30 text-green-400 text-xs text-center py-2 px-4 rounded-lg mx-4 my-2 animate-pulse">✅ Back online! Sending...</div>}
            <div ref={topObserverRef} className="h-4 flex items-center justify-center mb-4">{mLoading && <div className="w-5 h-5 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />}</div>
            {messages.length === 0 && !mLoading ? <div className="flex-1 flex flex-col items-center justify-center opacity-40 py-20"><div className="w-16 h-16 rounded-full bg-purple-500/10 flex items-center justify-center mb-4"><motion.span animate={{ rotate: [0, 20, 0] }} transition={{ repeat: Infinity, duration: 1.5 }} className="text-3xl">👋</motion.span></div><p className="text-zinc-400 font-medium">Say hi to {nickname || chat.user.displayName}!</p></div> : messages.map((m, i) => <MessageBubble key={m.id} message={m} isSent={m.senderId === currentUser.id} t={t} currentUser={currentUser} searchQuery={searchQuery} isHighlighted={searchResults[currentMatch] === i} onReact={(e) => onReact?.(chat.id, m.id, e)} />)}
            {isRecTyping && <TypingIndicator />}<div ref={messagesEndRef} /><div ref={bottomRef} />
          </div>
           <AnimatePresence>{showScrollBtn && <motion.button initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} onClick={() => scroll()} className="absolute bottom-32 right-6 w-10 h-10 rounded-full bg-[#1a1a1a] border border-white/10 shadow-2xl flex items-center justify-center text-zinc-400 hover:text-zinc-100 z-20"><ChevronDown size={20} /></motion.button>}</AnimatePresence>
          <InputBar onSend={handleSend} t={safeT} currentUser={currentUser} onTyping={handleTyping} onSendFile={handleFileSend} isRecipientOnline={isContactOnline} messages={messages} currentUserId={currentUser.id} disabled={isBlocked} />
        </>
      )}

      {/* Modals */}
      <AnimatePresence>
        {showWallpaperModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-[#1a1a1a] border border-white/10 rounded-[32px] w-full max-w-md overflow-hidden">
              <div className="p-6 border-b border-white/5 flex items-center justify-between">
                <h3 className="text-xl font-bold text-zinc-100">Chat Wallpaper</h3>
                <button onClick={() => setShowWallpaperModal(false)} className="p-2 text-zinc-500 hover:text-zinc-100"><CloseIcon size={20} /></button>
              </div>
              <div className="p-6 grid grid-cols-2 gap-4">
                {WALLPAPERS.map(w => (
                  <button key={w.id} onClick={() => { setWallpaper(w.id); setShowWallpaperModal(false); }} className={`group relative h-24 rounded-2xl border-2 transition-all overflow-hidden ${w.class} ${wallpaper === w.id ? 'border-purple-500 ring-4 ring-purple-500/20' : 'border-white/5 hover:border-white/20'}`}>
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-xs font-bold text-white uppercase tracking-wider">{w.name}</span>
                    </div>
                    {wallpaper === w.id && <div className="absolute top-2 right-2 w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center text-[10px] text-white">✓</div>}
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}

        {showReportModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-[#1a1a1a] border border-white/10 rounded-[32px] w-full max-w-md overflow-hidden">
              <div className="p-6 border-b border-white/5 flex items-center justify-between">
                <h3 className="text-xl font-bold text-zinc-100">Report Chat</h3>
                <button onClick={() => setShowReportModal(false)} className="p-2 text-zinc-500 hover:text-zinc-100"><CloseIcon size={20} /></button>
              </div>
              <div className="p-6 flex flex-col gap-2">
                <p className="text-sm text-zinc-400 mb-4">Select a reason for reporting this conversation. Your report is anonymous.</p>
                {REPORT_REASONS.map(r => (
                  <button key={r} onClick={() => handleReport(r)} className="w-full text-left px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-[13px] text-zinc-200 transition-colors">{r}</button>
                ))}
              </div>
            </motion.div>
          </div>
        )}

        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-[#1a1a1a] border border-white/10 rounded-[32px] w-full max-w-sm p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-6 text-red-500"><Trash2 size={32} /></div>
              <h3 className="text-xl font-bold text-zinc-100 mb-2">Delete Chat?</h3>
              <p className="text-zinc-400 text-sm mb-8">This action cannot be undone. All messages in this conversation will be permanently removed.</p>
              <div className="flex gap-3">
                <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 py-3 bg-white/5 text-zinc-300 rounded-xl font-bold">Cancel</button>
                <button onClick={handleDelete} className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold">Delete</button>
              </div>
            </motion.div>
          </div>
        )}

        {showBlockConfirm && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-[#1a1a1a] border border-white/10 rounded-[32px] w-full max-w-sm p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-6 text-red-500"><Ban size={32} /></div>
              <h3 className="text-xl font-bold text-zinc-100 mb-2">Block User?</h3>
              <p className="text-zinc-400 text-sm mb-8">You will no longer receive messages from this contact, and they won't be able to see your status.</p>
              <div className="flex gap-3">
                <button onClick={() => setShowBlockConfirm(false)} className="flex-1 py-3 bg-white/5 text-zinc-300 rounded-xl font-bold">Cancel</button>
                <button onClick={handleBlock} className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold">Block</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ChatPanel;
