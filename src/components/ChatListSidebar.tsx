import { useState, useEffect, useRef, useMemo } from 'react';
import { Search, MoreVertical, Settings, User, Users, Archive, LogOut, ChevronRight, ArrowLeft, X, Bell, Zap, Plus, Sparkles } from 'lucide-react';
import { Chat, User as UserType } from '@/types/chat';
import { motion, AnimatePresence } from 'framer-motion';
import { translations } from '@/i18n/translations';
import ChatListItem from './ChatListItem';
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
  onStartChat
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
      return;
    }

    const fetchUsers = async () => {
      setIsSearchingUsers(true);
      try {
        let queryBuilder = supabase.from('users').select('*').neq('id', currentUser.id);
        
        if (userSearchQuery) {
          queryBuilder = queryBuilder.or(`username.ilike.%${userSearchQuery}%,email.ilike.%${userSearchQuery}%,display_name.ilike.%${userSearchQuery}%`);
        }

        const { data, error } = await queryBuilder.limit(10);
        
        if (error) throw error;

        if (data) {
          setFoundUsers(data.map((u: any) => ({
            id: u.id,
            username: u.username,
            displayName: u.display_name || u.username || u.email.split('@')[0],
            avatar: u.avatar_url,
            avatarColor: '#8b5cf6',
            isOnline: u.is_online,
            lastSeen: u.last_seen,
            status: u.bio || 'Available'
          })));
        }
      } catch (err) {
        console.error('Error fetching users from Supabase:', err);
      } finally {
        setIsSearchingUsers(false);
      }
    };

    const timer = setTimeout(() => {
      fetchUsers();
    }, userSearchQuery ? 300 : 0);

    return () => clearTimeout(timer);
  }, [userSearchQuery, showNewChatUI, currentUser.id]);

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
    <div className="w-full h-full flex flex-col bg-[var(--bg-primary)] border-r border-[var(--border-color)] relative overflow-hidden">
      {/* New Redesigned Header */}
      <div className="px-6 pt-6 pb-2">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            {showArchived && (
              <button onClick={() => setShowArchived(false)} className="p-2 -ml-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
                <ArrowLeft size={20} />
              </button>
            )}
            {!showArchived ? (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center text-white">
                  <Zap size={18} fill="currentColor" />
                </div>
                <h1 className="text-2xl font-bold text-white tracking-tight">Blink</h1>
              </div>
            ) : (
              <h1 className="text-xl font-bold text-[var(--text-primary)]">Archived</h1>
            )}
          </div>
          
          <div className="flex items-center gap-1">

            {/* Notifications Button */}
            <div className="relative" ref={notificationsRef}>
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className={`p-2 rounded-full transition-all ${showNotifications ? 'text-[var(--text-primary)] bg-white/5' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/5'}`}
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
                    className="absolute right-0 mt-2 w-72 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl shadow-2xl z-50 py-4 px-4 overflow-hidden"
                  >
                    <h3 className="text-sm font-bold text-[var(--text-primary)] mb-4 px-2">Notifications</h3>
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-3 text-[var(--text-secondary)]">
                        <Bell size={24} />
                      </div>
                      <p className="text-xs text-[var(--text-secondary)]">No notifications yet</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <button 
              onClick={onOpenSettings}
              className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/5 rounded-full transition-all"
              title="Settings"
            >
              <Settings size={20} />
            </button>
            <div className="relative" ref={menuRef}>
              <button onClick={() => setShowMenu(!showMenu)} className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/5 rounded-full">
                <MoreVertical size={20} />
              </button>
              <AnimatePresence>
                {showMenu && (
                  <motion.div initial={{ opacity: 0, scale: 0.95, y: -10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: -10 }} className="absolute right-0 mt-2 w-56 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl shadow-2xl z-50 py-2 overflow-hidden">
                    {[
                      { icon: <User size={18} />, label: 'Profile', action: onOpenProfile },
                      { icon: <Users size={18} />, label: 'New Group', action: onOpenNewGroup },
                      { icon: <Archive size={18} />, label: 'Archived Chats', action: () => { setShowArchived(true); setShowMenu(false); } },
                      { isSeparator: true },
                      { icon: <LogOut size={18} />, label: 'Logout', action: onLogout, className: 'text-red-400' },
                    ].map((item, idx) => (item as any).isSeparator ? <div key={idx} className="h-px border-b border-[var(--border-color)] my-1" /> : (
                      <button key={idx} onClick={() => { (item as any).action(); setShowMenu(false); }} className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-white/5 transition-colors ${(item as any).className || 'text-[var(--text-primary)]'}`}>
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

        {/* Search Bar - Full Width, Dark */}
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] group-focus-within:text-purple-500 transition-colors" size={18} />
          <input
            type="text"
            placeholder={showArchived ? "Search archived..." : "Search messages..."}
            className="w-full bg-[var(--bg-secondary)] border border-transparent focus:border-purple-500/30 rounded-2xl py-3 pl-12 pr-10 text-sm focus:outline-none transition-all placeholder:text-[var(--text-secondary)] text-[var(--text-primary)]"
            value={activeSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
          />
          {activeSearch && (
            <button 
              onClick={() => { setLocalSearch(''); }} 
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-1"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      {!showArchived && (
        <div className="flex items-center gap-2 px-6 py-2 overflow-x-auto scrollbar-none mb-2 mt-2">
          {filters.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all
                ${filter === f.key ? 'bg-purple-600 text-white' : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-white/5'}`}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto mt-2 scrollbar-thin relative pb-24">
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

      {/* New Chat Panel Overlay inside Sidebar */}
      <AnimatePresence>
        {showNewChatUI && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="absolute inset-0 z-[60] bg-[var(--bg-primary)] flex flex-col h-full"
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-[var(--border-color)] flex items-center gap-4">
              <button 
                onClick={() => setShowNewChatUI(false)}
                className="p-2 -ml-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-full hover:bg-white/5 transition-colors"
              >
                <ArrowLeft size={20} />
              </button>
              <h2 className="font-bold text-lg text-[var(--text-primary)] flex-1">
                New Chat
              </h2>
            </div>

            {/* Search Bar */}
            <div className="px-6 py-4">
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] group-focus-within:text-purple-500 transition-colors" size={18} />
                <input
                  autoFocus
                  type="text"
                  placeholder="Search users on Blink"
                  className="w-full bg-[var(--bg-secondary)] border border-transparent focus:border-purple-500/30 rounded-2xl py-3 pl-12 pr-4 text-sm focus:outline-none transition-all placeholder:text-[var(--text-secondary)] text-[var(--text-primary)]"
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {/* User List */}
            <div className="flex-1 overflow-y-auto scrollbar-thin px-4">
              {isSearchingUsers ? (
                <div className="flex justify-center py-10">
                  <div className="w-6 h-6 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
                </div>
              ) : foundUsers.length > 0 ? (
                <div className="space-y-1 pb-4">
                  {foundUsers.map((user, i) => (
                    <motion.div
                      key={user.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      onClick={() => {
                        onStartChat?.(user);
                        setShowNewChatUI(false);
                      }}
                      className="flex items-center gap-3 p-3 hover:bg-white/5 rounded-2xl cursor-pointer transition-all group"
                    >
                      <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-400 font-bold text-lg border border-purple-500/10">
                        {user.displayName[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm text-[var(--text-primary)] truncate">{user.displayName}</p>
                        <p className="text-xs text-[var(--text-secondary)] truncate">@{user.username}</p>
                      </div>
                      <button className="px-4 py-1.5 bg-purple-600/10 text-purple-400 text-xs font-bold rounded-lg opacity-0 group-hover:opacity-100 transition-all">
                        Message
                      </button>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
                  <div className="w-16 h-16 rounded-full bg-[var(--bg-secondary)] flex items-center justify-center mb-4 text-[var(--text-secondary)]">
                    <Search size={32} />
                  </div>
                  <p className="font-bold text-[var(--text-primary)]">No users found</p>
                  <p className="text-xs text-[var(--text-secondary)] mt-1">Try searching for someone else</p>
                </div>
              )}
            </div>
            
            <p className="text-center text-[10px] text-[var(--text-secondary)] py-6 px-10 font-medium">
              Search users on Blink
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ChatListSidebar;
