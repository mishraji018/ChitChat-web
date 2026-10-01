import { MessageSquare, User, Star, Settings, LogOut, ArrowLeftRight } from 'lucide-react';
import { User as UserType } from '@/types/chat';

interface NavigationSidebarProps {
  currentUser: UserType;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onLogout: () => void;
}

const NavigationSidebar = ({ currentUser, activeTab, onTabChange, onLogout }: NavigationSidebarProps) => {
  const tabs = [
    { id: 'messages', icon: MessageSquare, label: 'Messages' },
    { id: 'profile', icon: User, label: 'Profile' },
    { id: 'favourites', icon: Star, label: 'Starred' },
    { id: 'settings', icon: Settings, label: 'Settings' },
    { id: 'switch', icon: ArrowLeftRight, label: 'Switch' },
  ];

  return (
    <div className="h-full flex items-center pl-3 py-6 z-40 shrink-0">
      <div className="w-[72px] h-[85vh] max-h-[580px] bg-[var(--nav-bg,#0a5f62)] rounded-r-[2.2rem] rounded-l-[1.2rem] flex flex-col items-center py-6 shadow-2xl relative border-r border-y border-white/10">
        {/* Navigation Icon List */}
        <div className="flex-1 flex flex-col items-center gap-6 justify-center w-full">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                title={tab.label}
                className={`relative p-3.5 rounded-2xl transition-all duration-300 group ${
                  isActive
                    ? 'text-white bg-white/20 shadow-md scale-110'
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                }`}
              >
                <tab.icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                {isActive && (
                  <span className="absolute -right-3 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-white rounded-l-full shadow-sm" />
                )}
              </button>
            );
          })}
        </div>

        {/* Bottom Signout Button */}
        <div className="pt-4 border-t border-white/10 w-full flex flex-col items-center">
          <button
            onClick={onLogout}
            title="Sign Out"
            className="p-3 text-white/70 hover:text-red-300 hover:bg-red-500/20 rounded-2xl transition-all duration-200"
          >
            <LogOut size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default NavigationSidebar;
