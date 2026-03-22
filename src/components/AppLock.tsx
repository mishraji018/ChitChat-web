import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Lock, Delete } from 'lucide-react';

interface AppLockProps {
  correctPin: string;
  onUnlock: () => void;
  title?: string;
}

const AppLock = ({ correctPin, onUnlock, title = "App Locked" }: AppLockProps) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  useEffect(() => {
    if (pin.length === 4) {
      if (pin === correctPin) {
        onUnlock();
      } else {
        setError(true);
        setTimeout(() => {
          setPin('');
          setError(false);
        }, 500);
      }
    }
  }, [pin, correctPin, onUnlock]);

  const handleNumber = (n: number) => {
    if (pin.length < 4) setPin(prev => prev + n);
  };

  const handleDelete = () => {
    setPin(prev => prev.slice(0, -1));
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[200] bg-background flex flex-col items-center justify-center p-6"
    >
      <div className="w-full max-w-xs flex flex-col items-center">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-6">
          <Lock className="text-primary" size={32} />
        </div>
        
        <h2 className="text-2xl font-bold mb-2">{title}</h2>
        <p className="text-muted-foreground text-sm mb-8">Enter your 4-digit PIN to continue</p>
        
        {/* PIN Indicators */}
        <div className={`flex gap-4 mb-12 ${error ? 'animate-shake' : ''}`}>
          {[0, 1, 2, 3].map(i => (
            <div 
              key={i} 
              className={`w-4 h-4 rounded-full border-2 transition-all duration-200 ${
                pin.length > i 
                  ? 'bg-primary border-primary scale-110' 
                  : 'bg-transparent border-muted-foreground/30'
              } ${error ? 'border-destructive bg-destructive' : ''}`}
            />
          ))}
        </div>
        
        {/* Keypad */}
        <div className="grid grid-cols-3 gap-6 w-full">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
            <button
              key={n}
              onClick={() => handleNumber(n)}
              className="w-full aspect-square rounded-full bg-muted/30 hover:bg-muted/60 text-2xl font-semibold transition-colors flex items-center justify-center active:scale-95 outline-none focus:ring-2 focus:ring-primary/50"
            >
              {n}
            </button>
          ))}
          <div className="w-full" />
          <button
            onClick={() => handleNumber(0)}
            className="w-full aspect-square rounded-full bg-muted/30 hover:bg-muted/60 text-2xl font-semibold transition-colors flex items-center justify-center active:scale-95 outline-none focus:ring-2 focus:ring-primary/50"
          >
            0
          </button>
          <button
            onClick={handleDelete}
            className="w-full aspect-square rounded-full bg-muted/30 hover:bg-muted/60 text-muted-foreground transition-colors flex items-center justify-center active:scale-95 outline-none focus:ring-2 focus:ring-primary/50"
          >
            <Delete size={24} />
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default AppLock;
