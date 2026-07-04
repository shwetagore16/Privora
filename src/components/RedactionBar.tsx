import React from 'react';
import { Lock } from 'lucide-react';

interface RedactionBarProps {
  value: string;
  ciphertext?: string;
  authorized: boolean;
  className?: string;
}

export const RedactionBar: React.FC<RedactionBarProps> = ({
  value,
  ciphertext = '0x1b4c7d8e9f...b6c',
  authorized,
  className = '',
}) => {
  return (
    <div className={`relative inline-flex items-center select-none ${className}`}>
      {/* Real Decrypted Monospace Value (Underneath) */}
      <span 
        className={`transition-all duration-300 ease-out font-mono font-semibold tracking-wide text-ink text-sm bg-ledger/5 px-1.5 py-0.5 rounded border border-ledger/10 ${
          authorized ? 'opacity-100 scale-100' : 'opacity-0 scale-95 blur-[1px]'
        }`}
      >
        {value}
      </span>

      {/* Redaction Shield Cover */}
      <div
        className={`absolute inset-y-0 left-0 right-0 redaction-hatch rounded flex items-center justify-between px-2 transition-all duration-300 ease-out border border-ink ${
          authorized 
            ? 'opacity-0 pointer-events-none' 
            : 'opacity-100 shadow-sm'
        }`}
        style={{
          clipPath: authorized ? 'inset(0 100% 0 0)' : 'inset(0 0% 0 0)',
        }}
      >
        {/* Ciphertext representation under redaction, extremely small & muted */}
        <span className="text-[9px] text-sage/40 font-mono overflow-hidden whitespace-nowrap text-ellipsis max-w-[60%] mr-2 tracking-tighter">
          {ciphertext}
        </span>
        
        {/* Sealed stamp indicator */}
        <div className="flex items-center gap-1 shrink-0 bg-seal/10 border border-seal/40 text-seal px-1 py-0.5 rounded text-[8px] font-sans font-bold uppercase tracking-wider">
          <Lock className="w-2 h-2" />
          <span>Sealed</span>
        </div>
      </div>
    </div>
  );
};
export default RedactionBar;
