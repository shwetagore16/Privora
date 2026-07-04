import React, { useState } from 'react';
import { useAuth } from './AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Shield, RefreshCw } from 'lucide-react';

export const Login: React.FC = () => {
  const { loginWithWallet, loginWithEmail } = useAuth();
  const navigate = useNavigate();
  const [role, setRole] = useState<'merchant' | 'lender'>('merchant');
  
  // Wallet Connection Simulation
  const [isConnecting, setIsConnecting] = useState(false);

  // Email Fallback Simulation
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [showOtpField, setShowOtpField] = useState(false);
  const [isVerifyingEmail, setIsVerifyingEmail] = useState(false);

  const handleWalletConnect = async () => {
    setIsConnecting(true);
    try {
      await loginWithWallet(role);
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

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    if (!showOtpField) {
      setIsVerifyingEmail(true);
      // Simulate sending OTP
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setIsVerifyingEmail(false);
      setShowOtpField(true);
    } else {
      if (!otp) return;
      setIsVerifyingEmail(true);
      try {
        await loginWithEmail(email, otp, role);
        if (role === 'merchant') {
          navigate('/merchant/dashboard');
        } else {
          navigate('/lender/dashboard');
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsVerifyingEmail(false);
      }
    }
  };

  const handleAdminAccess = async () => {
    setIsConnecting(true);
    try {
      await loginWithWallet('admin');
      navigate('/admin/dashboard');
    } catch (err) {
      console.error(err);
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <div className="min-h-screen bg-paper flex flex-col items-center justify-center p-6 text-center select-none text-ink">
      <div className="max-w-md w-full p-8 bg-paper-light rounded-2xl border-2 border-ledger/30 shadow-md relative">
        
        {/* Decorative stamp */}
        <div className="absolute top-4 right-4">
          <span className="rubber-stamp stamp-pending">LEDGER ACCESS</span>
        </div>

        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-ledger/5 text-ledger mb-4 font-bold text-lg border border-ledger/10">
          Pv
        </div>

        <h1 className="text-3xl font-display font-bold tracking-tight mb-2">Privora Platform</h1>
        <p className="text-ink-light text-xs font-semibold uppercase tracking-wider mb-8">
          Authenticate Ledger View Keys
        </p>

        {/* Role toggle */}
        <div className="flex justify-center gap-2 mb-6 font-mono text-[10px]">
          <button
            onClick={() => setRole('merchant')}
            className={`px-3 py-1 border transition-all ${
              role === 'merchant'
                ? 'border-ledger text-ledger bg-ledger/5 font-bold'
                : 'border-sage/40 text-sage hover:border-sage'
            }`}
          >
            MERCHANT ROLE
          </button>
          <button
            onClick={() => setRole('lender')}
            className={`px-3 py-1 border transition-all ${
              role === 'lender'
                ? 'border-ledger text-ledger bg-ledger/5 font-bold'
                : 'border-sage/40 text-sage hover:border-sage'
            }`}
          >
            LENDER ROLE
          </button>
        </div>

        {/* Primary Method: Wallet Connect */}
        <div className="space-y-4">
          <button
            onClick={handleWalletConnect}
            disabled={isConnecting || isVerifyingEmail}
            className="w-full py-4 bg-ledger text-paper hover:bg-ledger-light font-sans font-bold tracking-wider text-sm transition-all flex items-center justify-center gap-2 shadow-[2px_2px_0px_#0e2114]"
          >
            {isConnecting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                CONNECTING FHE WALLET KEYS...
              </>
            ) : (
              <>
                <Shield className="w-4 h-4" />
                CONNECT WALLET & LOGIN
              </>
            )}
          </button>
        </div>

        {/* Divider line */}
        <div className="relative my-8">
          <div className="absolute inset-0 flex items-center" aria-hidden="true">
            <div className="w-full border-t border-dashed border-sage/45"></div>
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-paper-light px-2 text-[10px] text-sage font-mono uppercase">OR EMAIL OTP FALLBACK</span>
          </div>
        </div>

        {/* Secondary Method: Email OTP */}
        <form onSubmit={handleEmailSubmit} className="space-y-4 text-left font-mono text-[11px] text-ink-light max-w-sm mx-auto">
          {!showOtpField ? (
            <div>
              <label className="text-sage block mb-1 uppercase text-[9px]">REGISTERED BUSINESS EMAIL</label>
              <div className="flex gap-2">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. audit@business.com"
                  className="flex-1 bg-paper border border-ledger/20 text-ink focus:border-ledger px-3 py-1.5 outline-none font-sans"
                  disabled={isConnecting || isVerifyingEmail}
                />
                <button
                  type="submit"
                  disabled={isConnecting || isVerifyingEmail}
                  className="border border-ledger text-ledger hover:bg-ledger hover:text-paper font-sans font-semibold px-3 py-1.5 transition-all text-xs shrink-0"
                >
                  {isVerifyingEmail ? 'REQUESTING...' : 'SEND OTP'}
                </button>
              </div>
            </div>
          ) : (
            <div>
              <label className="text-sage block mb-1 uppercase text-[9px]">ENTER ONE-TIME PASSCODE (OTP)</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  required
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="e.g. 582490"
                  className="flex-1 bg-paper border border-ledger/20 text-ink focus:border-ledger px-3 py-1.5 outline-none tracking-widest text-center"
                  disabled={isConnecting || isVerifyingEmail}
                />
                <button
                  type="submit"
                  disabled={isConnecting || isVerifyingEmail}
                  className="border border-ledger text-ledger hover:bg-ledger hover:text-paper font-sans font-semibold px-3 py-1.5 transition-all text-xs shrink-0"
                >
                  {isVerifyingEmail ? 'VERIFYING...' : 'VERIFY OTP'}
                </button>
              </div>
            </div>
          )}
        </form>

        <div className="mt-8 text-center text-xs">
          <span className="text-sage">First time accessing Privora? </span>
          <Link to="/signup" className="text-ledger font-bold hover:underline">
            Register Ledger Credentials
          </Link>
        </div>

        {/* Discrete Admin Link */}
        <div className="mt-12 pt-6 border-t border-ledger/10 text-center">
          <button 
            onClick={handleAdminAccess}
            disabled={isConnecting}
            className="text-[9px] font-mono text-sage/70 hover:text-seal tracking-wider uppercase transition-colors"
          >
            Access Ledger Admin Console
          </button>
        </div>

      </div>
    </div>
  );
};
export default Login;
