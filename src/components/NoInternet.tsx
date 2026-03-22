import { useEffect, useState } from 'react';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';

const NoInternet = ({ onRetry }: { onRetry: () => void }) => (
  <div className="fixed inset-0 bg-background flex flex-col items-center justify-center z-[999] gap-6">
    {/* Animated background orbs */}
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className="absolute w-96 h-96 rounded-full bg-destructive/5 blur-3xl -top-20 -left-20 animate-pulse" />
      <div className="absolute w-64 h-64 rounded-full bg-destructive/5 blur-3xl -bottom-10 -right-10 animate-pulse delay-1000" />
    </div>

    {/* Icon */}
    <div className="relative">
      <div className="w-24 h-24 rounded-3xl bg-destructive/10 border border-destructive/20 flex items-center justify-center">
        <WifiOff size={40} className="text-destructive" />
      </div>
      {/* Pulse ring */}
      <div className="absolute inset-0 rounded-3xl border-2 border-destructive/30 animate-ping" />
    </div>

    {/* Text */}
    <div className="text-center space-y-2 px-8">
      <h2 className="text-2xl font-bold text-foreground">No Internet Connection</h2>
      <p className="text-muted-foreground text-sm max-w-xs">
        BlinkChat requires an active internet connection to send and receive messages.
      </p>
    </div>

    {/* Status indicator */}
    <div className="flex items-center gap-2 px-4 py-2 bg-destructive/10 border border-destructive/20 rounded-xl">
      <div className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
      <span className="text-sm text-destructive font-medium">Disconnected</span>
    </div>

    {/* Retry button */}
    <button
      onClick={onRetry}
      className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-pink-500 to-fuchsia-500 text-white font-bold rounded-xl hover:opacity-90 transition-opacity active:scale-95"
    >
      <RefreshCw size={18} />
      Try Again
    </button>

    {/* App branding */}
    <div className="absolute bottom-8 flex items-center gap-2 opacity-30">
      <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-pink-500 to-fuchsia-500 flex items-center justify-center">
        <span className="text-xs text-white font-bold">B</span>
      </div>
      <span className="text-sm font-bold">BlinkChat</span>
    </div>
  </div>
);

export default NoInternet;
