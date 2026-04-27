import { useRef, useEffect, useState } from 'react';
import { ArrowLeft, Search, MoreVertical, ChevronDown, BellOff, User, UserPlus, Image as Wallpaper, Archive, Pin, Trash2, Ban, Flag, ChevronUp, X as CloseIcon } from 'lucide-react';
import { Chat, Message, ThemeType, User as UserType } from '@/types/chat';
import UserAvatar from './Avatar';
import MessageBubble from './MessageBubble';
import InputBar from './InputBar';
import { motion, AnimatePresence } from 'framer-motion';
import { translations } from '@/i18n/translations';
import { useSocket } from '@/hooks/use-socket';
import { v4 as uuidv4 } from 'uuid';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { apiFetch } from '@/utils/tokenManager';

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
  <div className="flex justify-start px-4 mb-1.5">
    <div className="bg-bubble-received rounded-2xl rounded-bl-md px-4 py-3">
      <div className="flex gap-1">
        {[0, 1, 2].map(i => (
          <motion.div
            key={i}
            className="w-2 h-2 rounded-full bg-muted-foreground"
            animate={{ scale: [0.6, 1, 0.6], opacity: [0.4, 1, 0.4] }}
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
  const [isContactOnline, setContactOnline] = useState(chat?.user.isOnline || false);
  const [contactLastSeen, setContactLastSeen] = useState(chat?.user.lastSeen || '');
  const [isRecipientTyping, setIsRecipientTyping] = useState(false);
  
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const topObserverRef = useRef<HTMLDivElement>(null);

  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  
  const { sendMessage, startTyping, stopTyping, markAsRead, socket } = useSocket(currentUser.id);
  
  const safeT = t || translations['English'];

  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => { 
    if (!chat) return;
    setContactOnline(chat.user.isOnline || false);
    setContactLastSeen(chat.user.lastSeen || '');
    setIsRecipientTyping(false);
    
    // Reset for new chat
    setMessages([]);
    setHasMore(true);
    fetchMessages();
  }, [chat?.id]);

  const fetchMessages = async (before?: string) => {
    if (!chat || !currentUser) return;
    if (isLoadingMore) return;
    
    // Skip fetching for mock IDs if any still remain
    if (typeof chat.id === 'string' && (chat.id.startsWith('c1') || chat.id.startsWith('c2'))) {
      setMessages([]);
      setHasMore(false);
      return;
    }

    setIsLoadingMore(before ? true : false);

    try {
      // Use conversationId if available, otherwise try to find/create one using receiverId
      const targetId = chat.id;
      const res = await apiFetch(`/api/messages/${targetId}?userId=${currentUser.id}${before ? `&before=${before}` : ''}&limit=30`);
      
      if (res && res.status === 404 && !targetId.includes('-')) {
        // If 404 and ID is not a UUID, it might be a userId. 
        // This is a hint to the backend to find conversation by participants.
        // We'll handle this by letting the backend getMessages handle it or redirect.
      }

      if (!res) return;
      const data = await res.json();
      
      const fetchedMessages = Array.isArray(data) ? data : (data.messages || data.data || []);
      
      if (fetchedMessages.length < 30) setHasMore(false);
      
      if (before) {
        const container = containerRef.current;
        const previousHeight = container?.scrollHeight || 0;
        setMessages(prev => [...fetchedMessages, ...prev]);
        setTimeout(() => {
          if (container) container.scrollTop = container.scrollHeight - previousHeight;
        }, 0);
      } else {
        setMessages(fetchedMessages);
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'auto' }), 100);
      }
    } catch (err) {
      console.error('Fetch messages error:', err);
    } finally {
      setIsLoadingMore(false);
    }
  };

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore && messages.length > 0) {
          fetchMessages(messages[0].timestamp);
        }
      },
      { threshold: 0.1 }
    );

    if (topObserverRef.current) observer.observe(topObserverRef.current);
    return () => observer.disconnect();
  }, [hasMore, isLoadingMore, messages, chat?.id]);

  // Socket Events
  useEffect(() => {
    if (!socket || !chat) return;

    const handleReceiveMessage = (message: any) => {
      if (message.senderId === chat.user.id) {
        const normalizedMsg = { ...message, id: message._id || message.id };
        setMessages(prev => [...prev, normalizedMsg]);
        markAsRead(normalizedMsg.conversationId, currentUser.id);
      }
    };

    const handleMessageSent = ({ tempId, messageId, status, timestamp, isQueued }: any) => {
      setMessages(prev => prev.map(msg =>
        msg.id === tempId
          ? { ...msg, id: messageId, status, timestamp: new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), isQueued }
          : msg
      ));
    };

    const handleMessageDelivered = ({ messageId }: any) => {
      setMessages(prev => prev.map(msg =>
        msg.id === messageId ? { ...msg, status: 'delivered' } : msg
      ));
    };

    const handleReadReceipt = ({ messageId }: any) => {
      setMessages(prev => prev.map(msg =>
        msg.id === messageId ? { ...msg, status: 'read' } : msg
      ));
    };

    const handleShowTyping = ({ senderId }: any) => {
      if (senderId === chat.user.id) setIsRecipientTyping(true);
    };

    const handleHideTyping = ({ senderId }: any) => {
      if (senderId === chat.user.id) setIsRecipientTyping(false);
    };

    const handleUserStatus = ({ userId, isOnline, lastSeen }: any) => {
      if (userId === chat.user.id) {
        setContactOnline(isOnline);
        if (!isOnline && lastSeen) {
          setContactLastSeen(new Date(lastSeen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        }
      }
    };

    const handleDeletedEveryone = ({ messageId }: any) => {
      setMessages(prev => prev.map(msg =>
        msg.id === messageId ? { ...msg, content: 'This message was deleted', type: 'text' } : msg
      ));
    };

    const handleMessageEdited = ({ messageId, newContent }: any) => {
      setMessages(prev => prev.map(msg =>
        msg.id === messageId ? { ...msg, content: newContent, isEdited: true } : msg
      ));
    };

    const handleMessageReacted = ({ messageId, reactions }: any) => {
      setMessages(prev => prev.map(msg =>
        msg.id === messageId ? { ...msg, reactions } : msg
      ));
    };

    socket.on('message:receive', handleReceiveMessage);
    socket.on('message:sent', handleMessageSent);
    socket.on('message:delivered', handleMessageDelivered);
    socket.on('message:read-receipt', handleReadReceipt);
    socket.on('typing:show', handleShowTyping);
    socket.on('typing:hide', handleHideTyping);
    socket.on('user:status', handleUserStatus);
    socket.on('message:deleted-for-everyone', handleDeletedEveryone);
    socket.on('message:edited', handleMessageEdited);
    socket.on('message:reacted', handleMessageReacted);

    return () => {
      socket.off('message:receive', handleReceiveMessage);
      socket.off('message:sent', handleMessageSent);
      socket.off('message:delivered', handleMessageDelivered);
      socket.off('message:read-receipt', handleReadReceipt);
      socket.off('typing:show', handleShowTyping);
      socket.off('typing:hide', handleHideTyping);
      socket.off('user:status', handleUserStatus);
      socket.off('message:deleted-for-everyone', handleDeletedEveryone);
      socket.off('message:edited', handleMessageEdited);
      socket.off('message:reacted', handleMessageReacted);
    };
  }, [socket, chat, markAsRead]);

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

  const handleSend = (text: string, incomingType?: string, incomingMediaData?: any) => {
    if (!chat || !currentUser) return;
    
    let type: any = incomingType || 'text';
    let mediaData = incomingMediaData;
    let content = text;

    if (!incomingType) {
      if (text.startsWith('http') && (text.includes('unsplash') || text.match(/\.(jpeg|jpg|gif|png)$/) != null)) {
        type = 'image';
      } else if (text.startsWith('📍')) {
        type = 'location';
        content = text.replace('📍 ', '');
        mediaData = { name: 'Mock Location', address: content };
      } else if (text.startsWith('📄')) {
        type = 'document';
        content = text.replace('📄 ', '');
      }
    }

    const tempId = uuidv4();
    const newMsg: Message = {
      id: tempId,
      senderId: currentUser.id,
      receiverId: chat.user.id,
      type,
      content,
      mediaData,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'sent',
    };

    setMessages(prev => [...prev, newMsg]);
    sendMessage({ tempId, senderId: currentUser.id, receiverId: chat.user.id, type, content, mediaData });
    if (onSendMessage) onSendMessage(chat.id, newMsg);
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  const handleTyping = () => {
    if (!chat) return;
    startTyping(currentUser.id, chat.user.id);
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      stopTyping(currentUser.id, chat.user.id);
    }, 1500);
  };

  if (!chat) {
    return (
      <div className="flex-1 flex items-center justify-center bg-chat chat-pattern messages-area text-center">
        <div>
          <div className="w-24 h-24 rounded-full bg-muted/30 flex items-center justify-center mx-auto mb-4">
            <Search size={48} className="text-muted-foreground opacity-20" />
          </div>
          <h3 className="text-lg font-medium text-foreground mb-1">Select a chat</h3>
          <p className="text-sm text-muted-foreground">Select a chat to start messaging</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-chat relative overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card/80 backdrop-blur-sm z-30">
        <button onClick={onBack} className="lg:hidden p-1 text-muted-foreground hover:text-foreground">
          <ArrowLeft size={20} />
        </button>
        <div className="flex items-center gap-3 cursor-pointer group flex-1 min-w-0" onClick={onOpenInfo}>
          <UserAvatar name={chat.user.displayName} color={chat.user.avatarColor} isOnline={isContactOnline} />
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-foreground text-sm group-hover:text-primary transition-colors truncate">{nickname}</h3>
              {chat.isMuted && <BellOff size={14} className="text-muted-foreground flex-shrink-0" />}
            </div>
            <p className="text-xs text-muted-foreground truncate">
              {isRecipientTyping ? <span className="text-primary font-medium">{safeT.typing}</span> : 
               isContactOnline ? <span className="text-online font-medium">{safeT.online}</span> : 
               contactLastSeen ? `${safeT.lastSeen} ${contactLastSeen}` : 'Offline'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={onOpenSearch} className="p-2 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted/50 transition-colors"><Search size={18} /></button>
          <div className="relative" ref={menuRef}>
            <button onClick={() => setShowMenu(!showMenu)} className="p-2 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted/50 transition-colors"><MoreVertical size={18} /></button>
            <AnimatePresence>
              {showMenu && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -10 }}
                  className="absolute right-0 mt-2 w-60 bg-card border border-border rounded-xl shadow-xl z-[100] py-2 overflow-hidden"
                >
                  {[
                    { icon: <User size={16} />,        label: 'Contact Info',      action: onOpenInfo },
                    { icon: <UserPlus size={16} />,    label: 'Add to Group',      action: () => onAddToGroup?.(chat.user) },
                    { icon: <BellOff size={16} />,     label: chat.isMuted ? 'Unmute' : 'Mute Notifications', action: () => onToggleMute?.(chat.id) },
                    { icon: <Wallpaper size={16} />,   label: 'Custom Wallpaper',  action: onOpenWallpaper },
                    { icon: <Archive size={16} />,     label: chat.isArchived ? 'Unarchive Chat' : 'Archive Chat', action: () => onToggleArchive?.(chat.id) },
                    { icon: <Pin size={16} />,         label: chat.isPinned ? 'Unpin Chat' : 'Pin Chat',      action: () => onTogglePin?.(chat.id) },
                    { isSeparator: true },
                    { icon: <Trash2 size={16} />,      label: 'Delete Chat',       action: () => onDeleteChat?.(chat.id), className: 'text-destructive' },
                    { icon: <Ban size={16} />,         label: isBlocked ? 'Unblock' : 'Block User',     action: () => onToggleBlock?.(chat.id), className: 'text-destructive' },
                    { icon: <Flag size={16} />,        label: 'Report',            action: () => onReportChat?.(chat.id), className: 'text-destructive' },
                  ].map((item, idx) => (
                    (item as any).isSeparator ? <div key={`sep-${idx}`} className="px-0 py-1"><div className="h-px bg-border" /></div> : (
                      <button
                        key={idx}
                        onClick={() => { (item as any).action?.(); setShowMenu(false); }}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-primary/10 transition-colors ${(item as any).className || 'text-foreground'}`}
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
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="absolute top-full left-0 right-0 bg-card border-b border-border z-20 px-4 py-2 flex items-center gap-2"
            >
              <Search size={18} className="text-muted-foreground" />
              <input 
                autoFocus
                type="text" 
                placeholder="Search messages..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent border-none outline-none text-sm py-1"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    if (searchResults.length > 0) {
                      const nextMatch = (currentMatch + 1) % searchResults.length;
                      setCurrentMatch(nextMatch);
                    }
                  }
                }}
              />
              <div className="flex items-center gap-2">
                {searchQuery && (
                  <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                    {searchResults.length > 0 ? `${currentMatch + 1} of ${searchResults.length}` : 'No results'}
                  </span>
                )}
                <div className="flex items-center border-l border-border pl-2">
                  <button 
                    disabled={searchResults.length === 0}
                    onClick={() => setCurrentMatch(prev => (prev - 1 + searchResults.length) % searchResults.length)}
                    className="p-1.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
                  >
                    <ChevronUp size={16} />
                  </button>
                  <button 
                    disabled={searchResults.length === 0}
                    onClick={() => setCurrentMatch(prev => (prev + 1) % searchResults.length)}
                    className="p-1.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
                  >
                    <ChevronDown size={16} />
                  </button>
                </div>
                <button 
                  onClick={() => { onCloseSearch?.(); setSearchQuery(''); }}
                  className="p-1.5 text-muted-foreground hover:text-primary transition-colors"
                >
                  <CloseIcon size={18} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Blocked Banner */}
      {isBlocked && (
        <div className="bg-destructive/10 text-destructive text-[13px] py-2 px-4 text-center border-b border-destructive/20 z-20">
          You have blocked this contact. <button onClick={() => setIsBlocked(false)} className="font-bold underline ml-1">Unblock</button>
        </div>
      )}

      {/* Messages */}
      <div ref={containerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto p-4 flex flex-col gap-1 chat-pattern scrollbar-thin messages-area z-10">
        <div ref={topObserverRef} className="h-4 flex items-center justify-center">
          {isLoadingMore && <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />}
        </div>
        {messages.map((msg, idx) => (
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
        ))}
        {isRecipientTyping && <TypingIndicator />}
        <div ref={bottomRef} />
      </div>

      {/* Scroll to bottom */}
      <AnimatePresence>
        {showScrollBtn && (
          <motion.button initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} onClick={() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' })} className="absolute bottom-20 right-6 w-10 h-10 rounded-full bg-card border border-border shadow-lg flex items-center justify-center text-muted-foreground hover:text-foreground z-20">
            <ChevronDown size={20} />
          </motion.button>
        )}
      </AnimatePresence>

      <InputBar onSend={handleSend} t={safeT} currentUser={currentUser} onTyping={handleTyping} disabled={isBlocked} isRecipientOnline={isContactOnline} />
    </div>
  );
};

export default ChatPanel;
