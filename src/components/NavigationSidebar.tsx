import { Home, MessageSquare, Compass, User, Bookmark, Settings, ArrowLeftRight, ChevronDown, LogOut } from 'lucide-react';
import { motion } from 'framer-motion';
import { User as UserType } from '@/types/chat';

interface NavigationSidebarProps {
  currentUser: UserType;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onLogout: () => void;
}

const NavigationSidebar = ({ currentUser, activeTab, onTabChange, onLogout }: NavigationSidebarProps) => {
  const navItems = [
    { id: 'messages', icon: MessageSquare, label: 'Messages' },
  ];

  const profileItems = [
    { id: 'profile', icon: User, label: 'Visit Profile' },
    { id: 'settings', icon: Settings, label: 'Settings' },
    { id: 'switch', icon: ArrowLeftRight, label: 'Switch Account' },
  ];

  return (
    <div className="w-[200px] h-full bg-[#0f0f0f] border-r border-white/5 flex flex-col p-3 z-40 shrink-0">
      {/* Navigation Section */}
      <div className="space-y-1 mb-8">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-300 group
              ${activeTab === item.id ? 'bg-[#1a1a1a] text-purple-400 font-semibold shadow-lg shadow-purple-500/5' : 'text-zinc-500 hover:bg-[#1a1a1a] hover:text-zinc-300'}
            `}
          >
            <item.icon size={18} strokeWidth={activeTab === item.id ? 2.5 : 2} />
            <span className="text-[13px]">{item.label}</span>
          </button>
        ))}
      </div>

      {/* User Profile Section */}
      <div className="flex-1">
        <div className="px-3 py-2 text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-2">
          User Profile
        </div>
        <div className="space-y-1">
          {profileItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-zinc-500 hover:bg-[#1a1a1a] hover:text-zinc-200 transition-all duration-200 text-[13px]`}
            >
              <item.icon size={16} />
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Bottom User Card */}
      <div className="mt-auto pt-4 border-t border-white/5 space-y-2">
        <div className="bg-[#1a1a1a] p-3 rounded-2xl flex items-center gap-3">
          <div 
            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[11px] font-bold shadow-lg shrink-0 uppercase"
            style={{ backgroundColor: currentUser.avatarColor || '#3b82f6' }}
          >
            {(currentUser.name?.[0] || currentUser.username?.[0] || currentUser.email?.[0] || '?')}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[12px] font-bold text-zinc-200 truncate">{currentUser.name || currentUser.username || 'User'}</span>
            <span className="text-[10px] text-zinc-500 truncate">{currentUser.email || 'Online'}</span>
          </div>
        </div>
        <button 
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-red-400/70 hover:bg-red-500/10 hover:text-red-400 transition-all duration-200 text-[13px] font-semibold"
        >
          <LogOut size={16} />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
};

export default NavigationSidebar;
