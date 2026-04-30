import { Search, Bell, Settings, Sparkles, Zap } from 'lucide-react';

interface HeaderProps {
  onSearch?: (query: string) => void;
  onOpenSettings?: () => void;
  onOpenNotifications?: () => void;
  onOpenAI?: () => void;
}

const Header = ({ onSearch, onOpenSettings, onOpenNotifications, onOpenAI }: HeaderProps) => {
  return (
    <header className="h-16 border-b border-border bg-card/80 backdrop-blur-md flex items-center justify-between px-6 z-50 shrink-0">
      {/* Logo Section */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white shadow-lg shadow-primary/20">
          <Zap size={18} fill="currentColor" strokeWidth={2.5} />
        </div>
        <span className="text-xl font-bold tracking-tight text-foreground">Blink</span>
      </div>

      {/* Search Bar */}
      <div className="flex-1 max-w-md mx-8">
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={18} />
          <input
            type="text"
            placeholder="Search..."
            className="w-full bg-secondary/50 border-none rounded-full py-2 pl-10 pr-4 text-sm focus:ring-1 focus:ring-primary/20 transition-all outline-none"
            onChange={(e) => onSearch?.(e.target.value)}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button 
          onClick={onOpenAI}
          className="flex items-center gap-2 bg-accent px-4 py-1.5 rounded-full text-accent-foreground text-sm font-medium hover:bg-primary/10 transition-colors"
        >
          <Sparkles size={16} />
          <span>Ask AI</span>
          <span className="text-[10px] bg-primary/20 px-1.5 py-0.5 rounded-full text-primary font-bold">Beta</span>
        </button>
        
        <div className="w-px h-6 bg-border mx-1" />

        <button 
          onClick={onOpenNotifications}
          className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-full transition-all"
        >
          <Bell size={20} />
        </button>

        <button 
          onClick={onOpenSettings}
          className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-full transition-all"
        >
          <Settings size={20} />
        </button>
      </div>
    </header>
  );
};

export default Header;
