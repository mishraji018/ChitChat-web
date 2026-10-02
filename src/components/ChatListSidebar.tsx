import { useState, useEffect, useRef, useMemo } from 'react';
import { Search, MoreVertical, Settings, User, Users, Archive, LogOut, ChevronRight, ArrowLeft, X, Bell, Zap, Plus, Sparkles } from 'lucide-react';
import { Chat, User as UserType } from '@/types/chat';
import { motion, AnimatePresence } from 'framer-motion';
import { translations } from '@/i18n/translations';
import ChatListItem from './ChatListItem';
import UserAvatar from './Avatar';
import { supabase } from '@/config/supabase';

interface ChatListSidebarProps {
  chats: Chat[];
  selectedChatId: string | null;
  onSelectChat: (id: string) => void;
  onOpenProfile: () => void;
  onNewChat: () => void;
  onOpenNewGroup: () => void;
  onLogout: () => void;
  onOpenSettings: () => void;
  onOpenNotifications?: () => void;
  onOpenAI?: () => void;
  t?: any;
  currentUser: UserType;
  globalSearch?: string;
  activeFilter?: string;
  onStartChat?: (user: UserType) => void;
  onRefresh?: () => Promise<void>;
}

type Filter = 'all' | 'unread' | 'favourites' | 'groups';

const ChatListSidebar = ({ 
  chats, 
  selectedChatId, 
  onSelectChat, 
  onOpenProfile, 
  onNewChat, 
  onOpenNewGroup,
  onLogout,
  onOpenSettings,
  onOpenNotifications,
  onOpenAI,
  t, 
  currentUser,
  globalSearch = '',
  onStartChat,
  onRefresh,
}: ChatListSidebarProps) => {
  const safeT = t || translations['English'];
  const [localSearch, setLocalSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [showArchived, setShowArchived] = useState(false);
  const [showNewChatUI, setShowNewChatUI] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [foundUsers, setFoundUsers] = useState<UserType[]>([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);

  // ─── Pull-to-Refresh state ────────────────────────────────────
  const [pullY, setPullY] = useState(0);          // how far user has pulled (px)
  const [isRefreshing, setIsRefreshing] = useState(false);
  const touchStartY = useRef(0);
  const listRef = useRef<HTMLDivElement>(null);
  const PULL_THRESHOLD = 70; // px needed to trigger refresh

  const handleTouchStart = (e: React.TouchEvent) => {
    // Only start pull tracking if list is scrolled to top
    if (listRef.current && listRef.current.scrollTop === 0) {
      touchStartY.current = e.touches[0].clientY;
    } else {
      touchStartY.current = 0;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartY.current || isRefreshing) return;
    const delta = e.touches[0].clientY - touchStartY.current;
    if (delta > 0 && listRef.current?.scrollTop === 0) {
      // Dampen the pull so it feels elastic
      setPullY(Math.min(delta * 0.45, PULL_THRESHOLD + 20));
    }
  };

  const handleTouchEnd = async () => {
    if (pullY >= PULL_THRESHOLD && onRefresh && !isRefreshing) {
      setIsRefreshing(true);
      setPullY(0);
      try { await onRefresh(); } finally { setIsRefreshing(false); }
    } else {
      setPullY(0);
    }
    touchStartY.current = 0;
  };
  // ──────────────────────────────────────────────────────────────

  // Task 3: State variable to track archived chats for immediate UI updates
  const [archivedIds, setArchivedIds] = useState<string[]>(() => 
    chats.map(c => c.id).filter(id => localStorage.getItem(`archived_${id}`) === 'true')
  );

  // Sync archivedIds with chats and localStorage
  useEffect(() => {
    const checkArchived = () => {
      const current = chats.map(c => c.id).filter(id => localStorage.getItem(`archived_${id}`) === 'true');
      setArchivedIds(current);
    };
    
    // Check every 500ms for localStorage changes (hacky but works for cross-component sync)
    const interval = setInterval(checkArchived, 500);
    return () => clearInterval(interval);
  }, [chats]);

  useEffect(() => {
    if (!showNewChatUI) {
      setUserSearchQuery('');
      setFoundUsers([]);
      setIsSearchingUsers(false);
      return;
    }

    let isMounted = true;

    const fetchUsers = async () => {
      setIsSearchingUsers(true);
      try {
        let queryBuilder = supabase
          .from('users')
          .select('id, username, display_name, email, avatar_url, avatar_color, is_online, last_seen, bio');

        if (currentUser?.id) {
          queryBuilder = queryBuilder.neq('id', currentUser.id);
        }

        const trimmed = userSearchQuery.trim();
        if (trimmed) {
          queryBuilder = queryBuilder.or(`username.ilike.%${trimmed}%,email.ilike.%${trimmed}%,display_name.ilike.%${trimmed}%`);
        }

        const queryPromise = queryBuilder.order('display_name', { ascending: true }).limit(30);
        const timeoutPromise = new Promise<{ data: any; error: any }>((_, reject) =>
          setTimeout(() => reject(new Error('Query timeout')), 6000)
        );

        const { data, error } = await Promise.race([queryPromise, timeoutPromise]);
        
        if (error) throw error;

        if (isMounted && data) {
          const mapped = data.map((u: any) => ({
            id: u.id,
            username: u.username || 'user',
            displayName: u.display_name || u.username || (u.email ? u.email.split('@')[0] : 'User'),
            avatar: u.avatar_url,
            avatarColor: u.avatar_color || '#8b5cf6',
            isOnline: Boolean(u.is_online),
            lastSeen: u.last_seen,
            status: u.bio || 'Available'
          }));
          setFoundUsers(mapped);
        }
      } catch (err) {
        console.error('Error fetching users from Supabase:', err);
        if (isMounted) {
          // Fallback to known chat users if database query fails
          const knownUsers = chats
            .map(c => c.user)
            .filter(u => u && u.id && u.id !== currentUser?.id);
          const uniqueUsers = Array.from(new Map(knownUsers.map(u => [u.id, u])).values());
          if (uniqueUsers.length > 0) {
            setFoundUsers(uniqueUsers);
          }
        }
      } finally {
        if (isMounted) {
          setIsSearchingUsers(false);
        }
      }
    };

    const timer = setTimeout(() => {
      fetchUsers();
    }, userSearchQuery ? 250 : 0);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [userSearchQuery, showNewChatUI, currentUser?.id]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filters: { key: Filter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'unread', label: 'Unread' },
    { key: 'favourites', label: 'Favourites' },
    { key: 'groups', label: 'Groups' },
  ];

  const processedChats = useMemo(() => {
    return chats.map(c => {
      const isPinned = localStorage.getItem(`pinned_${c.id}`) === 'true';
      return { ...c, isPinned, isArchived: archivedIds.includes(c.id) };
    });
  }, [chats, archivedIds]);

  const archivedCount = archivedIds.length;
  const activeSearch = globalSearch || localSearch;

  const filtered = useMemo(() => {
    let list = processedChats;

    if (showArchived) {
      list = list.filter(c => c.isArchived);
    } else {
      list = list.filter(c => !c.isArchived);
      if (filter === 'unread') list = list.filter(c => c.unreadCount > 0);
      if (filter === 'favourites') list = list.filter(c => c.isPinned);
      if (filter === 'groups') list = list.filter(c => (c.user.displayName || c.user.username || '').toLowerCase().includes('group'));
    }

    if (activeSearch) {
      const q = activeSearch.toLowerCase();
      list = list.filter(c => 
        (c.user.displayName || c.user.username || '').toLowerCase().includes(q) ||
        (c.lastMessage?.content || c.lastMessage?.text || '').toLowerCase().includes(q)
      );
    }

    return [...list].sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      const dateA = a.lastMessage ? new Date(a.lastMessage.createdAt || (a.lastMessage as any).timestamp || a.updatedAt || a.lastMessageAt || 0).getTime() : new Date(a.updatedAt || a.lastMessageAt || 0).getTime();
      const dateB = b.lastMessage ? new Date(b.lastMessage.createdAt || (b.lastMessage as any).timestamp || b.updatedAt || b.lastMessageAt || 0).getTime() : new Date(b.updatedAt || b.lastMessageAt || 0).getTime();
      return dateB - dateA;
    });
  }, [processedChats, showArchived, filter, activeSearch]);

  return (
    <div className="w-full h-full flex flex-col bg-[var(--chat-list-bg,#ffffff)] text-[var(--chat-list-text,#111111)] relative overflow-hidden">
      {/* New Redesigned Header */}
      <div className="px-6 pt-6 pb-2">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {showArchived && (
              <button onClick={() => setShowArchived(false)} className="p-2 -ml-2 text-[var(--chat-list-subtext,#666666)] hover:opacity-80">
                <ArrowLeft size={20} />
              </button>
            )}
            {!showArchived ? (
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 bg-gradient-to-tr from-[#7c3aed] to-[#6366f1] rounded-xl flex items-center justify-center text-white shadow-md shadow-purple-500/25 shrink-0">
                  <Zap size={18} fill="currentColor" />
                </div>
                <h1 className="text-2xl font-black text-[var(--chat-list-text,#111111)] tracking-tight">Blink</h1>
              </div>
            ) : (
              <h1 className="text-xl font-bold text-[var(--chat-list-text,#111111)]">Archived</h1>
            )}
          </div>
          
          <div className="flex items-center gap-1.5">
            {/* User Profile Avatar Quick Button */}
            <button 
              onClick={onOpenProfile}
              className="p-0.5 rounded-full hover:ring-2 hover:ring-purple-500/50 transition-all cursor-pointer shrink-0"
              title={`My Profile (${currentUser.displayName || currentUser.username})`}
            >
              <UserAvatar 
                name={currentUser.displayName || currentUser.username} 
                avatar={currentUser.avatar} 
                color={currentUser.avatarColor} 
                size="sm" 
              />
            </button>

            {/* Notifications Button */}
            <div className="relative" ref={notificationsRef}>
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className={`p-2 rounded-full transition-all ${showNotifications ? 'text-[var(--chat-list-text,#111111)] bg-black/10 dark:bg-white/10' : 'text-[var(--chat-list-subtext,#666666)] hover:text-[var(--chat-list-text,#111111)] hover:bg-black/5 dark:hover:bg-white/10'}`}
                title="Notifications"
              >
                <Bell size={20} />
              </button>
              <AnimatePresence>
                {showNotifications && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95, y: -10 }} 
                    animate={{ opacity: 1, scale: 1, y: 0 }} 
                    exit={{ opacity: 0, scale: 0.95, y: -10 }} 
                    className="absolute right-0 mt-2 w-72 bg-[var(--chat-list-bg,#ffffff)] text-[var(--chat-list-text,#111111)] border border-black/10 dark:border-white/10 rounded-2xl shadow-2xl z-50 py-4 px-4 overflow-hidden"
                  >
                    <h3 className="text-sm font-bold text-[var(--chat-list-text,#111111)] mb-4 px-2">Notifications</h3>
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <div className="w-12 h-12 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center mb-3 text-[var(--chat-list-subtext,#666666)]">
                        <Bell size={24} />
                      </div>
                      <p className="text-xs text-[var(--chat-list-subtext,#666666)]">No notifications yet</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <button 
              onClick={onOpenSettings}
              className="p-2 text-[var(--chat-list-subtext,#666666)] hover:text-[var(--chat-list-text,#111111)] hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-all"
              title="Settings"
            >
              <Settings size={20} />
            </button>
            <div className="relative" ref={menuRef}>
              <button onClick={() => setShowMenu(!showMenu)} className="p-2 text-[var(--chat-list-subtext,#666666)] hover:text-[var(--chat-list-text,#111111)] hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-all">
                <MoreVertical size={20} />
              </button>
              <AnimatePresence>
                {showMenu && (
                  <motion.div initial={{ opacity: 0, scale: 0.95, y: -10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: -10 }} className="absolute right-0 mt-2 w-56 bg-[var(--chat-list-bg,#ffffff)] text-[var(--chat-list-text,#111111)] border border-black/10 dark:border-white/10 rounded-2xl shadow-2xl z-50 py-2 overflow-hidden">
                    {[
                      { icon: <User size={18} />, label: 'Profile', action: onOpenProfile },
                      { icon: <Users size={18} />, label: 'New Group', action: onOpenNewGroup },
                      { icon: <Archive size={18} />, label: 'Archived Chats', action: () => { setShowArchived(true); setShowMenu(false); } },
                      { isSeparator: true },
                      { icon: <LogOut size={18} />, label: 'Logout', action: onLogout, className: 'text-red-500' },
                    ].map((item, idx) => (item as any).isSeparator ? <div key={idx} className="h-px border-b border-black/10 dark:border-white/10 my-1" /> : (
                      <button key={idx} onClick={() => { (item as any).action(); setShowMenu(false); }} className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-black/5 dark:hover:bg-white/10 transition-colors ${(item as any).className || 'text-[var(--chat-list-text,#111111)]'}`}>
                        {(item as any).icon}
                        <span>{(item as any).label}</span>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Search Bar - Rounded Pill */}
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--chat-list-subtext,#666666)] opacity-70 group-focus-within:opacity-100 transition-opacity" size={17} />
          <input
            type="text"
            placeholder={showArchived ? "Search archived..." : "Search messages..."}
            className="w-full bg-black/5 dark:bg-white/10 border border-transparent focus:border-black/10 dark:focus:border-white/20 rounded-2xl py-2.5 pl-11 pr-10 text-sm focus:outline-none transition-all placeholder:text-[var(--chat-list-subtext,#666666)] text-[var(--chat-list-text,#111111)]"
            value={activeSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
          />
          {activeSearch && (
            <button 
              onClick={() => { setLocalSearch(''); }} 
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--chat-list-subtext,#666666)] hover:opacity-100 p-1"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      {!showArchived && (
        <div className="flex items-center gap-1.5 px-6 py-2 overflow-x-auto scrollbar-none mb-1">
          {filters.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                filter === f.key
                  ? 'bg-[var(--bg-primary)] text-white shadow-sm'
                  : 'bg-black/5 dark:bg-white/10 text-[var(--chat-list-subtext,#666666)] hover:bg-black/10'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}

      {/* Chat List with Pull-to-Refresh */}
      <div
        ref={listRef}
        className="flex-1 overflow-y-auto mt-2 scrollbar-thin relative pb-24"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Pull indicator */}
        {(pullY > 0 || isRefreshing) && (
          <div
            className="flex items-center justify-center transition-all"
            style={{ height: isRefreshing ? 48 : pullY, overflow: 'hidden' }}
          >
            <div className={`flex flex-col items-center gap-1 ${
              pullY >= PULL_THRESHOLD || isRefreshing ? 'text-[var(--bg-primary)]' : 'text-[var(--text-secondary)]'
            }`}>
              <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center ${
                isRefreshing
                  ? 'border-[var(--bg-primary)] border-t-transparent animate-spin'
                  : pullY >= PULL_THRESHOLD
                    ? 'border-[var(--bg-primary)] bg-[var(--bg-primary)]/10'
                    : 'border-current'
              }`}>
                {!isRefreshing && (
                  <svg
                    width="14" height="14" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2.5"
                    style={{ transform: `rotate(${Math.min(pullY / PULL_THRESHOLD, 1) * 180}deg)`, transition: 'transform 0.1s' }}
                  >
                    <path d="M12 5v14M5 12l7 7 7-7" />
                  </svg>
                )}
              </div>
              <span className="text-[10px] font-semibold">
                {isRefreshing ? 'Refreshing...' : pullY >= PULL_THRESHOLD ? 'Release to refresh' : 'Pull to refresh'}
              </span>
            </div>
          </div>
        )}
        {filtered.length > 0 ? (
          filtered.map((chat) => (
            <ChatListItem
              key={chat.id}
              chat={chat as any}
              isActive={selectedChatId === chat.id}
              onClick={() => onSelectChat(chat.id)}
              currentUser={currentUser}
            />
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center text-[var(--text-secondary)]">
            <Search size={48} className="mb-4 opacity-10" />
            <p className="font-medium text-[var(--text-primary)]">No chats found</p>
            <p className="text-xs mt-1">Try searching with a different name</p>
          </div>
        )}

        {/* Archived Button */}
        {!showArchived && archivedCount > 0 && (
          <div className="px-4 py-4">
            <button 
              onClick={() => setShowArchived(true)}
              className="w-full p-4 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] flex items-center justify-between group hover:bg-white/5 transition-all shadow-xl"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400">
                  <Archive size={20} />
                </div>
                <div className="text-left">
                  <p className="text-[14px] font-bold text-[var(--text-primary)]">Archived Chats</p>
                  <p className="text-[11px] text-[var(--text-secondary)] font-medium">{archivedCount} conversation{archivedCount !== 1 ? 's' : ''}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded-full">{archivedCount}</span>
                <ChevronRight size={18} className="text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-all" />
              </div>
            </button>
          </div>
        )}
      </div>

      {/* NEW: Floating Action Button (Orange) */}
      {!showArchived && !showNewChatUI && (
        <button 
          onClick={() => setShowNewChatUI(true)}
          className="fixed md:absolute bottom-24 md:bottom-6 right-6 w-14 h-14 rounded-full bg-orange-500 text-white shadow-2xl flex items-center justify-center hover:bg-orange-600 active:scale-95 transition-all z-50 group"
          title="New Chat"
        >
          <Plus size={28} className="group-hover:rotate-90 transition-transform duration-300" />
        </button>
      )}

      {/* New Chat Modal - Centered Glassy Modal */}
      <AnimatePresence>
        {showNewChatUI && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-5 md:p-8 bg-black/60 backdrop-blur-xl animate-in fade-in duration-200">
            {/* Backdrop */}
            <div className="absolute inset-0" onClick={() => setShowNewChatUI(false)} />

            {/* Modal Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 15 }}
              transition={{ type: 'spring', damping: 25, stiffness: 320 }}
              className="relative z-10 w-full max-w-lg h-[620px] max-h-[90vh] rounded-[2.2rem] bg-white/95 dark:bg-[#101015]/95 text-foreground backdrop-blur-3xl border border-black/10 dark:border-white/10 shadow-[0_25px_70px_rgba(0,0,0,0.6)] flex flex-col overflow-hidden"
            >
              {/* Top Accent Line */}
              <div className="absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-purple-500/50 to-transparent pointer-events-none" />

              {/* Header */}
              <div className="px-6 py-4 border-b border-black/10 dark:border-white/10 flex items-center justify-between gap-4 shrink-0 bg-black/[0.02] dark:bg-white/[0.02]">
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-purple-500/25 shrink-0">
                    <Zap size={20} />
                  </div>
                  <div>
                    <h2 className="text-xl font-black tracking-tight text-foreground">
                      New Chat
                    </h2>
                    <p className="text-xs text-muted-foreground">Find and message people on Blink</p>
                  </div>
                </div>

                <button 
                  onClick={() => setShowNewChatUI(false)}
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 transition-all cursor-pointer"
                  title="Close (Esc)"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Search Bar */}
              <div className="px-6 pt-4 pb-2">
                <div className="relative group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-purple-500 transition-colors" size={17} />
                  <input
                    autoFocus
                    type="text"
                    placeholder="Search by name, @username, or email..."
                    className="w-full bg-black/5 dark:bg-white/10 border border-black/5 dark:border-white/10 focus:border-purple-500/50 rounded-2xl py-3 pl-11 pr-4 text-sm focus:outline-none transition-all placeholder:text-muted-foreground text-foreground"
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                  />
                  {userSearchQuery && (
                    <button 
                      onClick={() => setUserSearchQuery('')}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>

              {/* User List */}
              <div className="flex-1 overflow-y-auto scrollbar-thin px-4 py-2 space-y-1">
                {isSearchingUsers ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-3">
                    <div className="w-8 h-8 border-3 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
                    <p className="text-xs text-muted-foreground">Searching users...</p>
                  </div>
                ) : foundUsers.length > 0 ? (
                  <div className="space-y-1 pb-4">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-3 py-1">
                      {userSearchQuery ? `Search Results (${foundUsers.length})` : `Suggested Users (${foundUsers.length})`}
                    </p>
                    {foundUsers.map((user, i) => (
                      <motion.div
                        key={user.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.03 }}
                        onClick={() => {
                          onStartChat?.(user);
                          setShowNewChatUI(false);
                        }}
                        className="flex items-center gap-3.5 p-3 hover:bg-black/5 dark:hover:bg-white/5 rounded-2xl cursor-pointer transition-all group border border-transparent hover:border-black/5 dark:hover:border-white/10"
                      >
                        <UserAvatar 
                          name={user.displayName || user.username} 
                          avatar={user.avatar} 
                          color={user.avatarColor} 
                          size="md" 
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="font-bold text-sm text-foreground truncate">{user.displayName}</p>
                            {user.isOnline && (
                              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" title="Online" />
                            )}
                          </div>
                          <p className="text-xs text-purple-600 dark:text-purple-400 truncate">@{user.username}</p>
                          {user.status && (
                            <p className="text-[11px] text-muted-foreground truncate mt-0.5">{user.status}</p>
                          )}
                        </div>
                        <button className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl opacity-90 group-hover:opacity-100 transition-all shadow-sm shrink-0">
                          Chat
                        </button>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
                    <div className="w-16 h-16 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center mb-4 text-muted-foreground">
                      <Search size={32} />
                    </div>
                    <p className="font-bold text-foreground">No users found</p>
                    <p className="text-xs text-muted-foreground mt-1">Try typing another username or name</p>
                  </div>
                )}
              </div>

              {/* Modal Footer Note */}
              <div className="px-6 py-3 border-t border-black/10 dark:border-white/10 text-center bg-black/[0.01] dark:bg-white/[0.01]">
                <p className="text-[11px] text-muted-foreground">
                  Click any user to begin chatting instantly
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ChatListSidebar;
