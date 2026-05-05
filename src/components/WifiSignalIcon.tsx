import React from 'react';
import { motion } from 'framer-motion';
import { NetworkSpeed } from '@/hooks/useNetworkSpeed';

interface WifiSignalIconProps {
  speed: NetworkSpeed;
  className?: string;
}

const WifiSignalIcon: React.FC<WifiSignalIconProps> = ({ speed, className = "" }) => {
  const getStyles = () => {
    switch (speed) {
      case 'fast':
        return {
          color: '#22c55e',
          opacity: 1,
          bars: 4,
          animate: false
        };
      case 'medium':
        return {
          color: '#eab308',
          opacity: 0.8,
          bars: 3,
          animate: false
        };
      case 'slow':
        return {
          color: '#f97316',
          opacity: 0.6,
          bars: 2,
          animate: true
        };
      case 'offline':
        return {
          color: '#ef4444',
          opacity: 0.5,
          bars: 0,
          animate: false
        };
      default:
        return {
          color: '#22c55e',
          opacity: 1,
          bars: 4,
          animate: false
        };
    }
  };

  const { color, opacity, bars, animate } = getStyles();

  return (
    <motion.svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`${className} ${animate ? 'animate-pulse' : ''}`}
      style={{ opacity, transition: 'all 0.3s ease' }}
    >
      {/* Bar 1 */}
      <line x1="4" y1="20" x2="4" y2="16" opacity={bars >= 1 ? 1 : 0.3} />
      {/* Bar 2 */}
      <line x1="9" y1="20" x2="9" y2="12" opacity={bars >= 2 ? 1 : 0.3} />
      {/* Bar 3 */}
      <line x1="14" y1="20" x2="14" y2="8" opacity={bars >= 3 ? 1 : 0.3} />
      {/* Bar 4 */}
      <line x1="19" y1="20" x2="19" y2="4" opacity={bars >= 4 ? 1 : 0.3} />
      
      {speed === 'offline' && (
        <line x1="4" y1="4" x2="20" y2="20" stroke="#ef4444" strokeWidth="2" />
      )}
    </motion.svg>
  );
};

export default WifiSignalIcon;
