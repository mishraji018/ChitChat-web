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
import { apiFetch } from '@/utils/tokenManager';
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
          <motion.div
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-purple-500/60"
            animate={{ scale: [0.7, 1, 0.7], opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }}
          />
        ))}
      </div>
    </div>
  </div>
);

const ChatPanel = ({ 
  chat, 
  onBack, 
  currentTheme, 
  t, 
  currentUser, 
  onSendMessage, 
  onOpenInfo,
  onOpenSearch,
  showSearch,
  onCloseSearch,
  onToggleMute,
  onTogglePin,
  onToggleArchive,
  onToggleBlock,
  onDeleteChat,
  onReportChat,
  onAddToGroup,
  onOpenWallpaper,
  onReact
}: ChatPanelProps) => {
  const [isBlocked, setIsBlocked] = useLocalStorage(`blocked_${chat?.user.id}`, false);
  const [nickname] = useLocalStorage(`nickname_${chat?.user.id}`, chat?.user.displayName || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [currentMatch, setCurrentMatch] = useState(0);
  const [searchResults, setSearchResults] = useState<number[]>([]);
  
  const bottomRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const topObserverRef = useRef<HTMLDivElement>(null);

  // Hooks for Supabase logic
  const { messages, sendMessage, markAsRead, loading: messagesLoading, setMessages } = useMessages(chat?.id || null);
  const { isOnline: checkIsOnline } = usePresence(currentUser.id);
  const { isTyping: isRecipientTyping, handleTyping } = useTyping(chat?.id || null, currentUser.id);
  const { streak, updateStreak, justBroken } = useStreak(currentUser.id, chat?.user.id || '');
  const { checkIfBoring } = useBoringDetector();
  const lastCheckedCount = useRef(0);
  const { addToQueue, getQueue } = useOfflineQueue();
  const { isOnline, wasOffline } = useNetworkStatus();
  const { uploadFile, getFileCategory } = useFileUpload();
  const { saveToIndexedDB } = useIndexedDB();
  
  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  useEffect(() => {
    if (chat?.id) {
      scrollToBottom('auto');
    }
  }, [chat?.id]);

  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom('smooth');
    }
  }, [messages.length]);

  useEffect(() => {
    if (chat?.id && currentUser?.id) {
      markAsRead(chat.id, currentUser.id);
    }
  }, [chat?.id, currentUser.id]);

  useEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.senderId !== currentUser.id && chat?.id) {
        markAsRead(chat.id, currentUser.id);
      }
    }
  }, [messages.length, chat?.id, currentUser.id]);

  useEffect(() => {
    if (justBroken) {
      shadcnToast({ title: "💔 Streak ended!", description: "Start a new one?", variant: "destructive" });
    }
  }, [justBroken]);

  useEffect(() => {
    const runBoringDetection = async () => {
      if (messages.length > 0 && messages.length % 10 === 0 && messages.length !== lastCheckedCount.current) {
        lastCheckedCount.current = messages.length;
        const result = await checkIfBoring(messages, currentUser.id);
        if (result && result.boringScore > 65) {
          toast.custom((id) => (
            <div className="w-[350px] bg-gradient-to-br from-[#1a0b2e] to-[#0a0a0a] border border-purple-500/30 p-5 rounded-2xl shadow-2xl backdrop-blur-xl">
              <div className="flex flex-col gap-4">
                <div className="flex items-start gap-3">
                  <div className="text-2xl">{result.emoji}</div>
                  <div className="flex-1">
                    <p className="text-zinc-100 font-medium text-sm">😴 Chat feels a bit quiet...</p>
                    <p className="text-purple-300 text-xs mt-1 italic">{result.suggestion}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => toast.dismiss(id)}
                    className="flex-1 py-2 bg-purple-600 hover:bg-purple-700 text-white text-[11px] font-bold rounded-lg transition-all"
                  >
                    Let's try it! 🙌
                  </button>
                  <button 
                    onClick={() => toast.dismiss(id)}
                    className="flex-1 py-2 bg-white/5 hover:bg-white/10 text-zinc-400 text-[11px] font-medium rounded-lg transition-all"
                  >
                    We're fine 😅
                  </button>
                </div>
              </div>
            </div>
          ), { duration: 8000, position: 'bottom-center' });
        }
      }
    };
    runBoringDetection();
  }, [messages.length, currentUser.id, checkIfBoring]);

  const isContactOnline = chat ? checkIsOnline(chat.user.id) : false;
  const contactLastSeen = chat?.user.lastSeen || '';
  
  const safeT = t || translations['English'];

  const handleSend = async (text: string, incomingType?: string, incomingMediaData?: any) => {
    if (!chat || !currentUser) return;
    
    const type: any = incomingType || 'text';
    const mediaData = incomingMediaData;
    const content = text;

    const tempId = uuidv4();
    const newMsg: Message = {
      id: tempId,
      senderId: currentUser.id,
      receiverId: chat.user.id,
      type,
      content,
      mediaData,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: (isOnline ? 'sending' : 'queued') as MessageStatus,
    };

    // Optimistic Update
    setMessages(prev => [...prev, newMsg]);

    if (!isOnline) {
      addToQueue({
        id: tempId,
        chatId: chat.id,
        senderId: currentUser.id,
        text: content,
        createdAt: new Date().toISOString()
      });
      return;
    }

    try {
      await sendMessage(content, currentUser.id, chat.id, type, mediaData, tempId);
      await updateStreak();
      
      setMessages(prev => prev.map(m => 
        m.id === tempId ? { ...m, status: 'sent' as MessageStatus } : m
      ));
      
      if (onSendMessage) onSendMessage(chat.id, newMsg);
    } catch (err) {
      console.error('Error sending message:', err);
      // Supabase failed even though online — queue it
      addToQueue({
        id: tempId,
        chatId: chat.id,
        senderId: currentUser.id,
        text: content,
        createdAt: new Date().toISOString()
      });
      setMessages(prev => prev.map(m => 
        m.id === tempId ? { ...m, status: 'queued' as MessageStatus } : m
      ));
    }
  };

  const handleFileSend = async (file: File) => {
    if (!chat || !currentUser) return;

    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      shadcnToast({ title: "File too large", description: "Maximum size is 50MB", variant: "destructive" });
      return;
    }

    const tempId = uuidv4();
    const isSmall = file.size < 1 * 1024 * 1024; // under 1MB

    // Show message immediately with uploading status
    const localUrl = URL.createObjectURL(file);
    const newMsg: Message = {
      id: tempId,
      senderId: currentUser.id,
      receiverId: chat.user.id,
      type: getFileCategory(file) as any,
      content: '',
      mediaUrl: localUrl,
      mediaType: getFileCategory(file),
      mediaName: file.name,
      mediaSize: file.size,
      uploadStatus: isOnline ? 'uploading' : 'queued',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: (isOnline ? 'sending' : 'queued') as MessageStatus,
    };

    setMessages(prev => [...prev, newMsg]);

    if (!isOnline) {
      if (isSmall) {
        // Save file blob to IndexedDB for later upload
        const reader = new FileReader();
        reader.onload = async () => {
          await saveToIndexedDB({
            id: tempId,
            chatId: chat.id,
            senderId: currentUser.id,
            fileData: reader.result,
            fileName: file.name,
            fileType: file.type,
            fileSize: file.size,
            createdAt: new Date().toISOString()
          });
        };
        reader.readAsArrayBuffer(file);

        shadcnToast({ 
          title: "📵 Offline", 
          description: "File saved — will upload when connected" 
        });
      } else {
        // Large file offline → cannot queue
        setMessages(prev => prev.filter(m => m.id !== tempId));
        shadcnToast({ 
          title: "Cannot send large file offline",
          description: "Connect to internet and try again",
          variant: "destructive"
        });
      }
      return;
    }

    // Online — upload to Supabase Storage
    try {
      const result = await uploadFile(file, chat.id, currentUser.id);

      // Save message to Supabase with media URL
      await supabase.from('messages').insert({
        id: tempId,
        chat_id: chat.id,
        sender_id: currentUser.id,
        text: '',
        media_url: result.url,
        media_type: result.type,
        media_name: result.name,
        media_size: result.size,
        upload_status: 'done',
        seen: false
      });

      setMessages(prev => prev.map(m =>
        m.id === tempId 
          ? { ...m, mediaUrl: result.url, uploadStatus: 'done', status: 'sent' as MessageStatus } 
          : m
      ));

    } catch (err) {
      console.error('Upload failed:', err);
      setMessages(prev => prev.map(m =>
        m.id === tempId 
          ? { ...m, uploadStatus: 'error' } 
          : m
      ));
      shadcnToast({ 
        title: "Upload failed", 
        description: "Please try again later",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!searchQuery) {
      setSearchResults([]);
      return;
    }
    const matches = messages
      .map((msg, idx) => msg.type === 'text' && msg.content.toLowerCase().includes(searchQuery.toLowerCase()) ? idx : -1)
      .filter(idx => idx !== -1);
    setSearchResults(matches);
    setCurrentMatch(0);
  }, [searchQuery, messages]);

  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    setShowScrollBtn(scrollHeight - scrollTop - clientHeight > 100);
  };


  return (
    <div className="flex-1 h-full bg-[#0f0f0f] relative overflow-hidden flex flex-col">
      {!chat ? (
        <div className="flex-1 flex items-center justify-center text-center p-8 bg-[#0f0f0f]">
          <div className="flex flex-col items-center">
            <div className="w-24 h-24 rounded-[32px] bg-purple-500/5 flex items-center justify-center mb-6 border border-purple-500/10">
              <Search size={48} className="text-purple-500/40" />
            </div>
            <h3 className="text-xl font-bold text-zinc-100 mb-2 tracking-tight">Select a chat</h3>
            <p className="text-zinc-500 text-sm max-w-[240px]">Select a conversation from the list to start messaging.</p>
          </div>
        </div>
      ) : (
        <>
          {/* Header */}
          <div className="h-[72px] px-6 border-b border-white/5 bg-[#0f0f0f]/80 backdrop-blur-xl flex items-center justify-between z-30 shrink-0">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <button onClick={onBack} className="p-2 -ml-2 text-zinc-500 hover:text-zinc-300 lg:hidden">
                <ArrowLeft size={20} />
              </button>
              <div className="relative cursor-pointer group flex items-center gap-3" onClick={onOpenInfo}>
                <UserAvatar name={nickname || chat.user.displayName} color={chat.user.avatarColor} size="md" isOnline={isContactOnline} className="w-10 h-10" />
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-[15px] text-zinc-100 truncate tracking-tight">{nickname || chat.user.displayName}</h3>
                    {streak >= 2 && (
                      <span className={`text-sm font-bold flex items-center gap-1 ${
                        streak >= 30 ? 'text-yellow-400 animate-pulse' : 
                        streak >= 7 ? 'text-yellow-400' : 
                        'text-orange-400'
                      }`}>
                        {streak >= 30 ? '🔥🔥🔥' : streak >= 7 ? '🔥🔥' : '🔥'} {streak}
                      </span>
                    )}
                  </div>
                  <span className={`text-[11px] font-medium ${isRecipientTyping ? 'text-purple-400' : 'text-zinc-500'}`}>
                    {isRecipientTyping ? 'typing...' : isContactOnline ? 'Online' : contactLastSeen ? `Last seen ${contactLastSeen}` : 'Offline'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <MemoryCapsuleCreation chatId={chat.id} currentUserId={currentUser.id} />
              <MemoryCapsuleList chatId={chat.id} />
              <button onClick={onOpenSearch} className="p-2 text-zinc-500 hover:text-purple-400 hover:bg-white/5 rounded-xl transition-all">
                <Search size={20} />
              </button>
              <div className="relative" ref={menuRef}>
                <button onClick={() => setShowMenu(!showMenu)} className="p-2 text-zinc-500 hover:text-zinc-200 hover:bg-white/5 rounded-xl transition-all">
                  <MoreVertical size={20} />
                </button>
                <AnimatePresence>
                  {showMenu && (
                    <motion.div initial={{ opacity: 0, scale: 0.95, y: -10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: -10 }}
                      className="absolute right-0 mt-2 w-60 bg-[#1a1a1a] border border-white/10 rounded-2xl shadow-2xl z-[100] py-2 overflow-hidden backdrop-blur-xl"
                    >
                      {[
                        { icon: <User size={16} />,        label: 'Contact Info',      action: onOpenInfo },
                        { icon: <UserPlus size={16} />,    label: 'Add to Group',      action: () => onAddToGroup?.(chat.user) },
                        { icon: <BellOff size={16} />,     label: chat.isMuted ? 'Unmute' : 'Mute Notifications', action: () => onToggleMute?.(chat.id) },
                        { icon: <Wallpaper size={16} />,   label: 'Custom Wallpaper',  action: onOpenWallpaper },
                        { icon: <Archive size={16} />,     label: chat.isArchived ? 'Unarchive Chat' : 'Archive Chat', action: () => onToggleArchive?.(chat.id) },
                        { icon: <Pin size={16} />,         label: chat.isPinned ? 'Unpin Chat' : 'Pin Chat',      action: () => onTogglePin?.(chat.id) },
                        { isSeparator: true },
                        { icon: <Trash2 size={16} />,      label: 'Delete Chat',       action: () => onDeleteChat?.(chat.id), className: 'text-red-400' },
                        { icon: <Ban size={16} />,         label: isBlocked ? 'Unblock' : 'Block User',     action: () => onToggleBlock?.(chat.id), className: 'text-red-400' },
                        { icon: <Flag size={16} />,        label: 'Report',            action: () => onReportChat?.(chat.id), className: 'text-red-400' },
                      ].map((item, idx) => (
                        (item as any).isSeparator ? <div key={`sep-${idx}`} className="px-0 py-1"><div className="h-px bg-white/5" /></div> : (
                          <button key={idx} onClick={() => { (item as any).action?.(); setShowMenu(false); }}
                            className={`w-full flex items-center gap-3 px-4 py-2.5 text-[13px] font-medium hover:bg-white/5 transition-colors ${(item as any).className || 'text-zinc-300'}`}
                          >
                            {(item as any).icon}
                            <span>{(item as any).label}</span>
                          </button>
                        )
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* In-chat Search Bar Overlay */}
            <AnimatePresence>
              {showSearch && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                  className="absolute top-full left-0 right-0 bg-[#1a1a1a] border-b border-white/5 z-20 px-4 py-3 flex items-center gap-3 backdrop-blur-xl"
                >
                  <Search size={18} className="text-zinc-500" />
                  <input autoFocus type="text" placeholder="Search messages..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1 bg-transparent border-none outline-none text-[14px] text-zinc-100 py-1"
                  />
                  <div className="flex items-center gap-2">
                    {searchQuery && (
                      <span className="text-[11px] text-zinc-500 whitespace-nowrap bg-white/5 px-2 py-0.5 rounded-full">
                        {searchResults.length > 0 ? `${currentMatch + 1} of ${searchResults.length}` : 'No results'}
                      </span>
                    )}
                    <div className="flex items-center border-l border-white/10 pl-2">
                      <button disabled={searchResults.length === 0} onClick={() => setCurrentMatch(prev => (prev - 1 + searchResults.length) % searchResults.length)}
                        className="p-1.5 text-zinc-500 hover:text-zinc-200 disabled:opacity-30"
                      >
                        <ChevronUp size={16} />
                      </button>
                      <button disabled={searchResults.length === 0} onClick={() => setCurrentMatch(prev => (prev + 1) % searchResults.length)}
                        className="p-1.5 text-zinc-500 hover:text-zinc-200 disabled:opacity-30"
                      >
                        <ChevronDown size={16} />
                      </button>
                    </div>
                    <button onClick={() => { onCloseSearch?.(); setSearchQuery(''); }} className="p-1.5 text-zinc-500 hover:text-purple-400 transition-colors">
                      <CloseIcon size={18} />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Blocked Banner */}
          {isBlocked && (
            <div className="bg-red-500/10 text-red-400 text-[12px] py-2 px-4 text-center border-b border-red-500/20 z-20">
              You have blocked this contact. <button onClick={() => setIsBlocked(false)} className="font-bold underline ml-1 hover:text-red-300 transition-colors">Unblock</button>
            </div>
          )}

          {/* Messages */}
          <div ref={containerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto p-4 flex flex-col gap-1 chat-pattern scrollbar-thin messages-area z-10">
            {!isOnline && (
              <div className="bg-red-500/20 border border-red-500/30 text-red-400 text-xs text-center py-2 px-4 rounded-lg mx-4 mt-2 mb-4">
                📵 You're offline — messages will send when you reconnect
                {getQueue().length > 0 && (
                  <div className="text-[10px] opacity-80 mt-1">
                    {getQueue().length} message(s) waiting to send
                  </div>
                )}
              </div>
            )}

            {wasOffline && isOnline && (
              <div className="bg-green-500/20 border border-green-500/30 text-green-400 text-xs text-center py-2 px-4 rounded-lg mx-4 mt-2 mb-4 animate-pulse">
                ✅ Back online! Sending queued messages...
              </div>
            )}

            <div ref={topObserverRef} className="h-4 flex items-center justify-center mb-4">
              {messagesLoading && <div className="w-5 h-5 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />}
            </div>
            
            {messages.length === 0 && !messagesLoading ? (
              <div className="flex-1 flex flex-col items-center justify-center opacity-40 py-20">
                <div className="w-16 h-16 rounded-full bg-purple-500/10 flex items-center justify-center mb-4">
                  <motion.span animate={{ rotate: [0, 20, 0] }} transition={{ repeat: Infinity, duration: 1.5 }} className="text-3xl">👋</motion.span>
                </div>
                <p className="text-zinc-400 font-medium tracking-tight">Say hi to {nickname || chat.user.displayName}!</p>
              </div>
            ) : (
              messages.map((msg, idx) => (
                <MessageBubble 
                  key={msg.id} 
                  message={msg} 
                  isSent={msg.senderId === currentUser.id} 
                  t={t} 
                  currentUser={currentUser} 
                  searchQuery={searchQuery}
                  isHighlighted={searchResults[currentMatch] === idx}
                  onReact={(emoji) => onReact?.(chat.id, msg.id, emoji)}
                />
              ))
            )}
            
            {isRecipientTyping && <TypingIndicator />}
            <div ref={messagesEndRef} />
            <div ref={bottomRef} />
          </div>

          {/* Scroll to bottom */}
          <AnimatePresence>
            {showScrollBtn && (
              <motion.button initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} onClick={() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' })} 
                className="absolute bottom-32 right-6 w-10 h-10 rounded-full bg-[#1a1a1a] border border-white/10 shadow-2xl flex items-center justify-center text-zinc-400 hover:text-zinc-100 z-20 hover:scale-110 transition-all"
              >
                <ChevronDown size={20} />
              </motion.button>
            )}
          </AnimatePresence>

          <InputBar onSend={handleSend} t={safeT} currentUser={currentUser} onTyping={handleTyping} onSendFile={handleFileSend} isRecipientOnline={isContactOnline} messages={messages} currentUserId={currentUser.id} />
        </>
      )}
    </div>
  );
};

export default ChatPanel;
