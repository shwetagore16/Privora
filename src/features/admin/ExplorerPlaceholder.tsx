import React from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ShieldAlert, Cpu } from 'lucide-react';

export const ExplorerPlaceholder: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const txHash = searchParams.get('tx') || '0x8f7a84b06e93c12f718a28db94b0d00f73c683b16d123e4f5a6b7c8d9e0f1a2b';

  return (
    <div className="min-h-screen bg-paper flex flex-col items-center justify-center p-6 text-center select-none text-ink">
      <div className="max-w-xl w-full p-8 bg-paper-light rounded-2xl border-2 border-ledger/30 shadow-md relative text-left">
        
        {/* Header stamps */}
        <div className="absolute top-4 right-4 flex gap-2">
          <span className="rubber-stamp stamp-pending">BLOCK EXPLORER</span>
        </div>

        <button 
          onClick={() => navigate(-1)} 
          className="flex items-center gap-1 text-xs font-mono text-ledger hover:text-ledger-light mb-6 border-b border-ledger/20 pb-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          RETURN
        </button>

        <div className="border-b border-ledger/20 pb-4 mb-6">
          <h2 className="font-display text-2xl font-bold text-ink uppercase tracking-tight">Fhenix EVM Explorer Gate</h2>
          <p className="font-mono text-[9px] text-sage">DECRYPTED PROOF GATEWAY ACCESS</p>
        </div>

        <div className="space-y-4 font-mono text-xs mb-8">
          <div className="p-4 bg-paper rounded border border-ledger/20 flex flex-col gap-2">
            <span className="text-[10px] text-sage uppercase">TRANSACTION PROOF HANDLE</span>
            <span className="text-ink font-semibold break-all text-[11px] leading-relaxed">
              {txHash}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="border border-dashed border-sage/40 p-3 rounded">
              <span className="text-[9px] text-sage block uppercase mb-1">TARGET TESTNET</span>
              <span className="text-ink font-bold">Fhenix Helium-3</span>
            </div>
            <div className="border border-dashed border-sage/40 p-3 rounded">
              <span className="text-[9px] text-sage block uppercase mb-1">NETWORK FEE</span>
              <span className="text-ink font-bold">0.00012 FHE</span>
            </div>
          </div>
        </div>

        <div className="p-5 bg-seal/5 border-2 border-seal/30 rounded flex gap-4 items-start mb-6">
          <ShieldAlert className="w-6 h-6 text-seal shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="font-display font-bold text-sm text-seal uppercase tracking-wide">Live once smart contracts are deployed.</h4>
            <p className="text-xs text-ink-light leading-relaxed">
              This transaction hash has been generated client-side by the Privora FHEVM interface. Verification, gas checks, and block indexing will execute dynamically on the blockchain explorer once smart contracts are deployed to testnet.
            </p>
          </div>
        </div>

        <div className="text-[10px] text-sage text-center border-t border-ledger/10 pt-4 flex justify-between items-center font-mono">
          <div className="flex items-center gap-1">
            <Cpu className="w-3 h-3 text-ledger animate-pulse" />
            <span>DKG KEY ENVELOPE SHIELDED</span>
          </div>
          <span>v0.1.0-HELIUM</span>
        </div>

      </div>
    </div>
  );
};
export default ExplorerPlaceholder;
