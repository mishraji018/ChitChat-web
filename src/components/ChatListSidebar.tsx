import { useState, useEffect, useRef } from 'react';
import { Search, MessageSquarePlus, MoreVertical, Settings, User, Users, Archive, Star, Download, LogOut } from 'lucide-react';
import { Chat, User as UserType } from '@/types/chat';
import { motion, AnimatePresence } from 'framer-motion';
import { translations } from '@/i18n/translations';
import ChatListItem from './ChatListItem';

interface ChatListSidebarProps {
  chats: Chat[];
  selectedChatId: string | null;
  onSelectChat: (id: string) => void;
  onOpenProfile: () => void;
  onNewChat: () => void;
  onOpenNewGroup: () => void;
  onLogout: () => void;
  t?: any;
  currentUser: UserType;
  activeFilter?: 'all' | 'archived';
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
  t, 
  currentUser,
  activeFilter = 'all'
}: ChatListSidebarProps) => {
  const safeT = t || translations['English'];
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
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

  const filtered = chats.filter(c => {
    if (filter === 'unread') return c.unreadCount > 0;
    if (filter === 'favourites') return c.isPinned; // Using pinned as favourites for now
    if (filter === 'groups') return c.user.displayName.includes('Group');
    return !c.isArchived;
  }).filter(c =>
    c.user.displayName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const menuItems = [
    { icon: <User size={18} />, label: 'Profile', action: onOpenProfile },
    { icon: <Settings size={18} />, label: 'Settings', action: () => {} },
    { icon: <MessageSquarePlus size={18} />, label: 'New Chat', action: onNewChat },
    { icon: <Users size={18} />, label: 'New Group', action: onOpenNewGroup },
    { icon: <Archive size={18} />, label: 'Archived Chats', action: () => {} },
    { icon: <Star size={18} />, label: 'Starred Messages', action: () => {} },
    { icon: <Download size={18} />, label: 'Download Chats', action: () => {} },
    { icon: <LogOut size={18} />, label: 'Logout', action: onLogout, className: 'text-destructive' },
  ];

  return (
    <div className="w-full lg:w-[340px] h-full flex flex-col bg-sidebar-custom border-r border-border relative overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">
          {activeFilter === 'archived' ? 'Archived' : 'Chats'}
        </h1>
        <div className="flex items-center gap-1">
          <button 
            onClick={onNewChat}
            className="p-2 text-foreground hover:bg-muted/50 rounded-full transition-colors"
          >
            <MessageSquarePlus size={20} />
          </button>
          <div className="relative" ref={menuRef}>
            <button 
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 text-foreground hover:bg-muted/50 rounded-full transition-colors"
            >
              <MoreVertical size={20} />
            </button>
            
            <AnimatePresence>
              {showMenu && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -10 }}
                  className="absolute right-0 mt-2 w-56 bg-card border border-primary/20 rounded-xl shadow-xl z-50 py-2 overflow-hidden"
                >
                  {menuItems.map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => { item.action(); setShowMenu(false); }}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-primary/10 transition-colors ${item.className || 'text-foreground'}`}
                    >
                      {item.icon}
                      <span>{item.label}</span>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="px-4 py-2">
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={18} />
          <input
            type="text"
            placeholder="Search or start a new chat"
            className="w-full bg-muted/30 border-none rounded-full py-2 pl-10 pr-4 text-[14px] focus:ring-1 focus:ring-primary/30 transition-all outline-none"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 px-3 py-2 overflow-x-auto scrollbar-none">
        {filters.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1 rounded-full text-[13px] font-medium whitespace-nowrap transition-all
              ${filter === f.key ? 'bg-primary text-white' : 'bg-muted/50 text-muted-foreground hover:bg-muted font-normal'}`}
          >
            {f.label}
          </button>
        ))}
        <button className="w-8 h-8 rounded-full bg-muted/50 flex items-center justify-center text-muted-foreground hover:bg-muted shrink-0">
          <span className="text-lg">+</span>
        </button>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto mt-2 scrollbar-thin">
        {filtered.length > 0 ? (
          filtered.map((chat) => (
            <ChatListItem
              key={chat.id}
              chat={chat}
              isActive={selectedChatId === chat.id}
              onClick={() => onSelectChat(chat.id)}
              currentUser={currentUser}
            />
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center text-muted-foreground">
            <Search size={48} className="mb-4 opacity-20" />
            <p className="font-medium text-foreground">No chats found</p>
            <p className="text-xs mt-1">Try searching with a different name</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatListSidebar;
