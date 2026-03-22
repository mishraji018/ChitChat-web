import { MessageSquare, Phone, Camera, Users, BarChart2, Image, Settings, UserCircle, Archive } from 'lucide-react';
import { motion } from 'framer-motion';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface NavbarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onOpenCamera: () => void;
  onOpenProfile: () => void;
  onOpenSettings: () => void;
  archivedCount?: number;
}

const Navbar = ({ activeTab, onTabChange, onOpenCamera, onOpenProfile, onOpenSettings, archivedCount = 0 }: NavbarProps) => {
  const topIcons = [
    { id: 'chats', icon: MessageSquare, label: 'Chats' },
    { id: 'archived', icon: Archive, label: 'Archived', badge: archivedCount },
    { id: 'calls', icon: Phone, label: 'Calls' },
    { id: 'camera', icon: Camera, label: 'Camera', action: onOpenCamera },
    { id: 'contacts', icon: Users, label: 'Contacts' },
  ];

  const bottomIcons = [
    { id: 'status', icon: BarChart2, label: 'Status' },
    { id: 'gallery', icon: Image, label: 'Gallery' },
    { id: 'settings', icon: Settings, label: 'Settings', action: onOpenSettings },
    { id: 'profile', icon: UserCircle, label: 'Profile', action: onOpenProfile },
  ];

  const NavItem = ({ icon: Icon, label, id, action }: any) => {
    const isActive = activeTab === id;
    
    return (
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => action ? action() : onTabChange(id)}
              className="relative group p-3 flex flex-col items-center justify-center transition-all duration-200"
            >
              <div className={`
                w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 relative
                ${isActive ? 'bg-primary/20 text-primary' : 'text-muted-foreground group-hover:bg-muted group-hover:text-foreground'}
              `}>
                <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
                {id === 'archived' && archivedCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-card">
                    {archivedCount}
                  </span>
                )}
              </div>
              {isActive && (
                <motion.div 
                  layoutId="active-pill"
                  className="absolute left-0 w-1 h-6 bg-primary rounded-r-full"
                />
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>{label}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  return (
    <div className="w-[60px] h-full bg-card border-r border-border flex flex-col items-center py-4 z-40 shrink-0">
      <div className="flex flex-col gap-2">
        {topIcons.map(item => (
          <NavItem key={item.id} {...item} />
        ))}
      </div>
      
      <div className="mt-auto flex flex-col gap-2">
        {bottomIcons.map(item => (
          <NavItem key={item.id} {...item} />
        ))}
      </div>
    </div>
  );
};

export default Navbar;
