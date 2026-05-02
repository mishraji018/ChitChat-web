import { MessageCircle, Phone, Users, User } from 'lucide-react';
import { motion } from 'framer-motion';

export type MobileTab = 'chats' | 'calls' | 'groups' | 'profile';

interface BottomNavProps {
  activeTab: MobileTab;
  onTabChange: (tab: MobileTab) => void;
}

const BottomNav = ({ activeTab, onTabChange }: BottomNavProps) => {
  const tabs: { id: MobileTab; label: string; icon: any }[] = [
    { id: 'chats', label: 'Chats', icon: MessageCircle },
    { id: 'calls', label: 'Calls', icon: Phone },
    { id: 'groups', label: 'Groups', icon: Users },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-[#0f0f0f] border-t border-white/5 h-[60px] pb-[env(safe-area-inset-bottom)] flex items-center justify-around z-50">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className="flex flex-col items-center justify-center gap-1 w-full h-full relative"
          >
            <div className={`p-1 rounded-full transition-colors ${isActive ? 'text-purple-500' : 'text-zinc-500'}`}>
              <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
            </div>
            <span className={`text-[10px] font-bold transition-colors ${isActive ? 'text-purple-500' : 'text-zinc-500'}`}>
              {tab.label}
            </span>
            {isActive && (
              <motion.div
                layoutId="bottom-nav-indicator"
                className="absolute top-0 w-8 h-1 bg-purple-500 rounded-b-full"
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
};

export default BottomNav;
