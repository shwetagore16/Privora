import React, { useState } from 'react';
import { useAuth } from './AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Shield, RefreshCw } from 'lucide-react';

export const Signup: React.FC = () => {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [role, setRole] = useState<'merchant' | 'lender'>('merchant');
  const [businessName, setBusinessName] = useState('');
  const [email, setEmail] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessName || !email) return;

    setIsConnecting(true);
    try {
      // Simulate wallet connection and key registry
      await signup(businessName, email, role);
      
      // Redirect based on selected role
      if (role === 'merchant') {
        navigate('/merchant/dashboard');
      } else {
        navigate('/lender/dashboard');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <div className="min-h-screen bg-paper flex flex-col items-center justify-center p-6 text-center select-none text-ink">
      <div className="max-w-md w-full p-8 bg-paper-light rounded-2xl border-2 border-ledger/30 shadow-md relative">
        
        {/* Decorative elements */}
        <div className="absolute top-4 right-4">
          <span className="rubber-stamp stamp-pending">REGISTRATION</span>
        </div>

        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-ledger/5 text-ledger mb-4 font-bold text-lg border border-ledger/10">
          Pv
        </div>

        <h1 className="text-3xl font-display font-bold tracking-tight mb-2">Privora Platform</h1>
        <p className="text-ink-light text-xs font-semibold uppercase tracking-wider mb-8">
          Establish Confidential Ledger Credentials
        </p>

        <form onSubmit={handleSubmit} className="space-y-6 text-left text-xs font-mono">
          
          {/* Role selector stamps */}
          <div>
            <label className="text-sage block mb-3 uppercase text-[10px] tracking-wider text-center">
              SELECT ACCOUNT LEDGER TYPE
            </label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setRole('merchant')}
                className={`py-3 text-center transition-all cursor-pointer font-display font-extrabold uppercase tracking-wide border-2 rounded ${
                  role === 'merchant'
                    ? 'border-ledger text-ledger bg-ledger/5 shadow-[2px_2px_0px_#1b3a24] scale-98'
                    : 'border-sage/40 text-sage hover:border-sage'
                }`}
              >
                <div className="text-[10px] font-sans font-bold text-sage">ROLE TYPE</div>
                MERCHANT
              </button>

              <button
                type="button"
                onClick={() => setRole('lender')}
                className={`py-3 text-center transition-all cursor-pointer font-display font-extrabold uppercase tracking-wide border-2 rounded ${
                  role === 'lender'
                    ? 'border-ledger text-ledger bg-ledger/5 shadow-[2px_2px_0px_#1b3a24] scale-98'
                    : 'border-sage/40 text-sage hover:border-sage'
                }`}
              >
                <div className="text-[10px] font-sans font-bold text-sage">ROLE TYPE</div>
                LENDER
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sage block mb-1 uppercase text-[10px]">BUSINESS REGISTRATION NAME</label>
              <input
                type="text"
                required
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="e.g. Alpha Freight Ltd."
                className="w-full bg-paper border border-ledger/20 text-ink focus:border-ledger px-3 py-2 outline-none font-sans font-medium"
                disabled={isConnecting}
              />
            </div>

            <div>
              <label className="text-sage block mb-1 uppercase text-[10px]">CORPORATE EMAIL ADDRESS</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. accounts@alphafreight.com"
                className="w-full bg-paper border border-ledger/20 text-ink focus:border-ledger px-3 py-2 outline-none font-sans font-medium"
                disabled={isConnecting}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isConnecting}
            className="w-full py-3.5 bg-ledger text-paper hover:bg-ledger-light font-sans font-bold tracking-wider text-sm transition-all flex items-center justify-center gap-2 shadow-[2px_2px_0px_#0e2114]"
          >
            {isConnecting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                CONNECTING WALLET & GENERATING FHE KEY...
              </>
            ) : (
              <>
                <Shield className="w-4 h-4" />
                CONNECT WALLET & REGISTER
              </>
            )}
          </button>
        </form>

        <div className="mt-8 text-center text-xs">
          <span className="text-sage">Already hold ledger keys? </span>
          <Link to="/login" className="text-ledger font-bold hover:underline">
            Connect Wallet to Login
          </Link>
        </div>

      </div>
    </div>
  );
};
export default Signup;
