import React from 'react';
import { useAuth } from '../auth/AuthContext';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield, Key, CheckCircle } from 'lucide-react';

export const Profile: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Role details fallbacks
  const roleName = user.role === 'merchant' ? 'MERCHANT' : 'LENDER';
  const businessName = user.businessName || (user.role === 'merchant' ? 'Alpha Logistics Ltd.' : 'Horizon Capital Partners');
  const walletAddress = user.walletAddress || '0x3b2f8a...00ef';
  const memberSince = 'July 2, 2026';

  // Return route
  const handleReturn = () => {
    if (user.role === 'merchant') {
      navigate('/merchant/dashboard');
    } else {
      navigate('/lender/dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-paper flex flex-col font-sans select-none text-ink relative">
      
      {/* Header */}
      <header className="border-b border-ledger/20 py-4 px-6 md:px-12 bg-paper-light">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-display font-extrabold text-xl tracking-tighter text-ledger bg-ledger/5 px-2 py-0.5 rounded border border-ledger/10">
              PR
            </span>
            <span className="font-display font-extrabold text-lg tracking-tight text-ink uppercase">
              Privora
            </span>
            <span className="border-l border-sage/40 pl-3 text-xs text-sage font-mono uppercase tracking-wider hidden sm:inline-block">
              Registry Node Profile
            </span>
          </div>

          <button 
            onClick={handleReturn}
            className="flex items-center gap-1.5 text-xs font-mono text-ledger hover:text-ledger-light"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            RETURN TO PORTAL
          </button>
        </div>
      </header>

      {/* Profile Box */}
      <main className="flex-1 max-w-xl w-full mx-auto p-6 md:py-16 flex flex-col justify-center">
        <div className="bg-paper-light border-2 border-ledger/30 rounded p-8 shadow-sm space-y-8 relative overflow-hidden">
          
          {/* Registry stamp badge */}
          <div className="absolute top-6 right-6">
            <span className="rubber-stamp stamp-financed border-ledger text-ledger text-[8px] py-1 px-3 tracking-widest font-bold">
              {roleName} REGISTRY
            </span>
          </div>

          {/* Title */}
          <div className="border-b border-ledger/20 pb-4">
            <h2 className="font-display text-2xl font-bold uppercase tracking-tight text-ink">
              Ledger Node Profile
            </h2>
            <p className="font-mono text-[9px] text-sage">ON-CHAIN FHESHEILD IDENTITY INDEX</p>
          </div>

          {/* Details list */}
          <div className="space-y-6">
            <div className="space-y-1">
              <span className="text-sage font-mono uppercase text-[9px] block">Business Registration Name</span>
              <span className="text-ink font-display font-bold text-lg block bg-paper p-3 border border-ledger/10">
                {businessName}
              </span>
            </div>

            <div className="space-y-1">
              <span className="text-sage font-mono uppercase text-[9px] block">Connected FHE Wallet Address</span>
              <span className="text-ink font-mono text-xs block bg-paper p-3 border border-ledger/10 select-all font-semibold tracking-wide">
                {walletAddress}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <span className="text-sage font-mono uppercase text-[9px] block">Registered Role</span>
                <span className="text-ink font-sans font-bold text-xs uppercase block bg-paper p-2.5 border border-ledger/10">
                  {roleName}
                </span>
              </div>
              <div className="space-y-1">
                <span className="text-sage font-mono uppercase text-[9px] block">Member Since</span>
                <span className="text-ink font-sans font-semibold text-xs block bg-paper p-2.5 border border-ledger/10">
                  {memberSince}
                </span>
              </div>
            </div>

            {/* Cryptographic Registry details */}
            <div className="border-t border-dashed border-sage/40 pt-6 space-y-4">
              <span className="text-sage font-mono uppercase text-[9px] block tracking-wide">
                FHE KEM Registry parameters
              </span>
              
              <div className="bg-paper p-4 border border-ledger/20 rounded font-mono text-[10px] space-y-2 text-sage/80 leading-normal">
                <div className="flex items-start gap-2">
                  <Key className="w-3.5 h-3.5 text-ledger shrink-0 mt-0.5" />
                  <div className="break-all">
                    <span className="text-ink font-semibold">fhePublicKey: </span>
                    0x047b1a2d8e9f...e5f3c2b1a0d7c6b5a4f3e2d1
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Shield className="w-3.5 h-3.5 text-ledger shrink-0 mt-0.5" />
                  <div className="break-all">
                    <span className="text-ink font-semibold">dkgVerificationHash: </span>
                    0x8a9b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-ledger shrink-0 mt-0.5" />
                  <div>
                    <span className="text-ink font-semibold">validationStatus: </span>
                    <span className="text-ledger font-bold">VERIFIED_ACTIVE</span>
                  </div>
                </div>
              </div>
            </div>

            {/* General Privacy Note */}
            <div className="p-3 bg-ledger/5 border border-ledger/20 rounded flex gap-2 text-[10px] text-ledger leading-relaxed font-sans">
              <Shield className="w-4 h-4 shrink-0 mt-0.5" />
              <p>
                This registry profile lists your cryptographic credential bindings on the Privora network. Your data is privately hashed and only accessible via designated decrypt permits.
              </p>
            </div>
          </div>
          
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-ledger/10 py-6 px-6 md:px-12 bg-paper-light mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4 text-[10px] font-mono text-sage">
          <p>© 2026 PRIVORA PROTOCOL. SECURED VIA CRYPTOGRAPHIC ZERO-KNOWLEDGE PROOFS.</p>
          <p>IDENTITY CLIENT v0.1.0-HELIUM</p>
        </div>
      </footer>

    </div>
  );
};

export default Profile;
