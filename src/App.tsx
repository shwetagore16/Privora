import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Link, useNavigate, Navigate } from 'react-router-dom'
import { Lock, Unlock, Upload, Shield, Check, AlertCircle, RefreshCw, ArrowRight } from 'lucide-react'
import RedactionBar from './components/RedactionBar'
import { AuthProvider, useAuth } from './features/auth/AuthContext'
import Login from './features/auth/Login'
import Signup from './features/auth/Signup'
import MerchantDashboard from './features/merchant/Dashboard'
import LenderDashboard from './features/lender/Dashboard'
import AdminDashboard from './features/admin/Dashboard'
import UploadWizard from './features/merchant/UploadWizard'
import ExplorerPlaceholder from './features/admin/ExplorerPlaceholder'
import Marketplace from './features/lender/Marketplace'
import OfferComparison from './features/merchant/OfferComparison'
import Repay from './features/merchant/Repay'
import { ToastProvider } from './components/Toast'
import { Profile } from './features/profile/Profile'
import { Web3Provider } from './features/auth/Web3Context'


// Route Guardian for Role Verification
const ProtectedRoute = ({ children, allowedRole }: { children: React.ReactNode, allowedRole: 'merchant' | 'lender' | 'admin' }) => {
  const { user } = useAuth();
  if (user.role !== allowedRole) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

// Landing Page Component (extracted from old App body)
function LandingPage() {
  const navigate = useNavigate();
  const [isDemoAuthorized, setIsDemoAuthorized] = useState(false);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [decryptionProgress, setDecryptionProgress] = useState(0);

  // Simulated FHE Decryption process with step-by-step loading state
  const handleDecryptToggle = () => {
    if (isDemoAuthorized) {
      setIsDemoAuthorized(false);
      setDecryptionProgress(0);
    } else {
      setIsDecrypting(true);
      setDecryptionProgress(10);
      
      const interval = setInterval(() => {
        setDecryptionProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            setIsDecrypting(false);
            setIsDemoAuthorized(true);
            return 100;
          }
          return prev + 30;
        });
      }, 250);
    }
  };

  // Automatic cycling demo on initial load so the visitor sees the redact effect immediately
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsDemoAuthorized(true);
      setTimeout(() => {
        setIsDemoAuthorized(false);
      }, 2500);
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="relative min-h-screen flex flex-col font-sans select-none selection:bg-ledger/20 text-ink">
      
      {/* 1. Header */}
      <header className="border-b border-ledger/20 py-4 px-6 md:px-12 bg-paper-light/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-display font-extrabold text-2xl tracking-tighter text-ledger bg-ledger/5 px-2 py-0.5 rounded border border-ledger/10">
              PR
            </span>
            <span className="font-display font-extrabold text-xl tracking-tight text-ink uppercase">
              Privora
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold tracking-wide text-ink-light">
            <a href="#how-it-works" className="hover:text-ledger transition-colors">How It Works</a>
            <a href="#ledger-security" className="hover:text-ledger transition-colors">Security Model</a>
            <a href="#use-cases" className="hover:text-ledger transition-colors">Private Markets</a>
          </nav>

          <div className="flex items-center gap-4">
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-ledger/10 border border-ledger/20 text-[10px] font-mono text-ledger uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-ledger animate-pulse"></span>
              Network: Fhenix FHE VM
            </span>
            <Link 
              to="/login"
              className="border-2 border-ledger text-ledger hover:bg-ledger hover:text-paper font-mono text-xs font-bold px-4 py-2 transition-all duration-200 active:scale-95 shadow-[1px_1px_0px_#1b3a24]"
            >
              CONNECT FHE WALLET
            </Link>
          </div>
        </div>
      </header>

      {/* 2. Hero Section */}
      <section className="py-16 px-6 md:px-12 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        
        <div className="lg:col-span-6 flex flex-col items-start text-left">
          <div className="inline-flex items-center gap-1.5 bg-seal/10 border border-seal/30 text-seal px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider mb-6">
            <Shield className="w-3.5 h-3.5" />
            <span>Fhevm Confidential Ledger Protocol</span>
          </div>

          <h1 className="font-display text-4xl md:text-5xl lg:text-6xl tracking-tight text-ink leading-[1.05] mb-6">
            The invoice financing ledger <span className="italic font-normal text-ledger underline decoration-sage/40 decoration-wavy">that can't be read.</span>
          </h1>

          <p className="text-base text-ink-light leading-relaxed mb-8 max-w-xl">
            Fund business accounts receivable without exposing corporate secrets. Privora encrypts invoice amounts, buyers, and settlement dates on-chain using Fully Homomorphic Encryption (FHE). Lenders run risk scoring on encrypted metadata—blocking frontrunning and competitive scraping.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
            <button 
              onClick={() => navigate('/signup')}
              className="bg-ledger text-paper hover:bg-ledger-light font-semibold tracking-wide py-3.5 px-7 rounded shadow-md text-sm transition-all flex items-center justify-center gap-2"
            >
              <Upload className="w-4 h-4" />
              UPLOAD INVOICE
            </button>
            <button 
              onClick={() => navigate('/signup')}
              className="border-2 border-ledger text-ledger hover:bg-ledger hover:text-paper font-semibold tracking-wide py-3.5 px-7 rounded text-sm transition-all flex items-center justify-center"
            >
              START LENDING
            </button>
          </div>
        </div>

        {/* Hero Interactive Document Demo */}
        <div className="lg:col-span-6 w-full flex justify-center">
          <div className="w-full max-w-lg bg-paper-light border-2 border-ledger/30 rounded shadow-md relative p-6 md:p-8">
            {/* Header stamps */}
            <div className="absolute top-4 right-4 flex gap-2">
              <span className="rubber-stamp stamp-pending">MEMO #409-F</span>
              {isDemoAuthorized ? (
                <span className="rubber-stamp stamp-approved">DECRYPTED</span>
              ) : (
                <span className="rubber-stamp stamp-sealed">FHE SHIELDED</span>
              )}
            </div>

            {/* Document details */}
            <div className="border-b border-ledger/20 pb-4 mb-6">
              <h3 className="font-display text-lg font-bold text-ink uppercase tracking-tight">Ledger Memorandum</h3>
              <p className="font-mono text-[10px] text-sage">MEMORANDUM VALUE RECORD • PRIVATE CONTEXT</p>
            </div>

            <div className="space-y-4 text-sm font-mono">
              <div className="flex justify-between border-b border-dashed border-sage/30 pb-2">
                <span className="text-sage text-xs">ISSUING MERCHANT</span>
                <span className="text-ink font-semibold">Alpha Logistics Ltd.</span>
              </div>

              <div className="flex justify-between items-center border-b border-dashed border-sage/30 pb-2">
                <span className="text-sage text-xs">DEBTOR ENTITY</span>
                <RedactionBar 
                  value="Acme International Corp" 
                  ciphertext="0x9d2e4c...0d2e"
                  authorized={isDemoAuthorized} 
                  className="max-w-[200px]"
                />
              </div>

              <div className="flex justify-between items-center border-b border-dashed border-sage/30 pb-2">
                <span className="text-sage text-xs">FACE VALUE AMOUNT</span>
                <RedactionBar 
                  value="$184,500.00 USD" 
                  ciphertext="0x8f7a84...1a2b"
                  authorized={isDemoAuthorized} 
                />
              </div>

              <div className="flex justify-between items-center border-b border-dashed border-sage/30 pb-2">
                <span className="text-sage text-xs">MATURITY/DUE DATE</span>
                <RedactionBar 
                  value="60 Days (Net 60) — Aug 15" 
                  ciphertext="0x5a2d8e...0f9e"
                  authorized={isDemoAuthorized} 
                />
              </div>

              <div className="flex justify-between items-center border-b border-dashed border-sage/30 pb-2">
                <span className="text-sage text-xs">LENDER OFFER DETAIL</span>
                <RedactionBar 
                  value="1.8% Discount Rate (Apex Capital)" 
                  ciphertext="0x7e8c9b...7d8c"
                  authorized={isDemoAuthorized} 
                />
              </div>
            </div>

            {/* Interaction panel */}
            <div className="mt-8 pt-6 border-t border-ledger/20 flex flex-col items-center gap-4">
              <div className="w-full flex items-center justify-between text-xs font-semibold text-ink">
                <div className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${isDemoAuthorized ? 'bg-ledger animate-pulse' : 'bg-seal'}`}></span>
                  <span className="font-mono text-[10px]">
                    {isDecrypting ? 'DECRYPTING FHE VIA FHENIX...' : isDemoAuthorized ? 'VIEWING DECRYPTED LEDGER' : 'LEDGER STATE: SECURED'}
                  </span>
                </div>
                {isDecrypting && <span className="font-mono">{decryptionProgress}%</span>}
              </div>

              {/* Progress bar */}
              {isDecrypting && (
                <div className="w-full bg-sage/20 h-1.5 rounded-full overflow-hidden">
                  <div 
                    className="bg-ledger h-full transition-all duration-300"
                    style={{ width: `${decryptionProgress}%` }}
                  ></div>
                </div>
              )}

              <button 
                onClick={handleDecryptToggle}
                disabled={isDecrypting}
                className={`w-full py-3 font-mono text-xs font-bold border-2 transition-all flex items-center justify-center gap-2 ${
                  isDemoAuthorized 
                    ? 'border-seal text-seal hover:bg-seal hover:text-paper shadow-[1px_1px_0px_#C4442E]' 
                    : 'border-ledger text-ledger hover:bg-ledger hover:text-paper shadow-[1px_1px_0px_#1b3a24]'
                }`}
              >
                {isDecrypting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    COMPUTING DECRYPTION KEY...
                  </>
                ) : isDemoAuthorized ? (
                  <>
                    <Lock className="w-3.5 h-3.5" />
                    RE-ENGAGE CRYPTO SHIELD (REDACT)
                  </>
                ) : (
                  <>
                    <Unlock className="w-3.5 h-3.5" />
                    SIGN FHE DECRYPTION REQUEST
                  </>
                )}
              </button>
              <p className="text-[10px] text-sage text-center max-w-xs font-sans">
                Lenders can only decrypt data under customized view permits approved by the merchant.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Problem Section (Before vs After Contrast) */}
      <section id="ledger-security" className="py-20 bg-paper-dark/30 border-y border-ledger/20 px-6 md:px-12">
        <div className="max-w-7xl mx-auto w-full">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="font-display text-3xl md:text-4xl tracking-tight mb-4">
              Public blockchains are corporate espionage assets.
            </h2>
            <p className="text-sm text-ink-light">
              Conventional DeFi exposes trade details to competitor bots. Privora's homomorphic smart contracts shield your transaction flow while proving credit stats.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Exposed Public Ledger */}
            <div className="bg-paper-light border-2 border-seal/30 p-6 md:p-8 rounded shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center pb-4 mb-6 border-b border-seal/20">
                  <div>
                    <h4 className="font-display font-bold text-base text-seal">Public DeFi Invoice Pool</h4>
                    <p className="text-[10px] text-sage font-mono">FULLY EXPOSED LEDGER FLOW</p>
                  </div>
                  <span className="rubber-stamp stamp-sealed border-seal bg-seal/10 text-seal">EXPOSED DATA</span>
                </div>

                <div className="space-y-4 font-mono text-xs">
                  <div className="flex justify-between items-center py-2 border-b border-dashed border-sage/20">
                    <span className="text-sage">Merchant Entity</span>
                    <span className="text-ink">Alpha Logistics Ltd.</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-dashed border-sage/20">
                    <span className="text-sage">Debtor Corporate Name</span>
                    <span className="text-seal font-bold">Acme International Corp</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-dashed border-sage/20">
                    <span className="text-sage">Invoice Face Value</span>
                    <span className="text-seal font-bold">$184,500.00 USD</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-dashed border-sage/20">
                    <span className="text-sage">Payment Net Due</span>
                    <span className="text-seal font-bold">60 Days (Net 60)</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-dashed border-sage/20">
                    <span className="text-sage">Agreed Financing Rate</span>
                    <span className="text-seal font-bold">2.25% Discount</span>
                  </div>
                </div>
              </div>

              <div className="mt-8 p-4 bg-seal/5 border border-seal/20 rounded flex gap-3 text-xs text-seal">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  Competitors scrap this ledger to track client names, order sizes, pricing terms, and cash flow strains in real time.
                </p>
              </div>
            </div>

            {/* Shielded Privora Ledger */}
            <div className="bg-paper-light border-2 border-ledger/30 p-6 md:p-8 rounded shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center pb-4 mb-6 border-b border-ledger/20">
                  <div>
                    <h4 className="font-display font-bold text-base text-ledger">Privora Confidential Ledger</h4>
                    <p className="text-[10px] text-sage font-mono">HOMOMORPHICALLY SEALED</p>
                  </div>
                  <span className="rubber-stamp stamp-approved border-ledger bg-ledger/10 text-ledger">FHE SHIELDED</span>
                </div>

                <div className="space-y-4 font-mono text-xs">
                  <div className="flex justify-between items-center py-2 border-b border-dashed border-sage/20">
                    <span className="text-sage">Merchant Entity</span>
                    <span className="text-ink">Alpha Logistics Ltd.</span>
                  </div>
                  <div className="flex justify-between items-center py-2.5 border-b border-dashed border-sage/20">
                    <span className="text-sage">Debtor Corporate Name</span>
                    <RedactionBar value="Acme International Corp" authorized={false} />
                  </div>
                  <div className="flex justify-between items-center py-2.5 border-b border-dashed border-sage/20">
                    <span className="text-sage">Invoice Face Value</span>
                    <RedactionBar value="$184,500.00 USD" authorized={false} />
                  </div>
                  <div className="flex justify-between items-center py-2.5 border-b border-dashed border-sage/20">
                    <span className="text-sage">Payment Net Due</span>
                    <RedactionBar value="60 Days (Net 60)" authorized={false} />
                  </div>
                  <div className="flex justify-between items-center py-2.5 border-b border-dashed border-sage/20">
                    <span className="text-sage">Agreed Financing Rate</span>
                    <RedactionBar value="2.25% Discount" authorized={false} />
                  </div>
                </div>
              </div>

              <div className="mt-8 p-4 bg-ledger/5 border border-ledger/20 rounded flex gap-3 text-xs text-ledger">
                <Check className="w-5 h-5 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  Only the merchant and the specific matched lender hold keys to decrypt parameters. The blockchain computes financing stats on cyphertext.
                </p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 4. How It Works Section */}
      <section id="how-it-works" className="py-20 px-6 md:px-12 max-w-7xl mx-auto w-full">
        <div className="max-w-2xl text-left mb-16">
          <span className="font-mono text-xs text-ledger font-bold uppercase tracking-wider bg-ledger/10 px-2 py-0.5 rounded border border-ledger/20">
            TRANSACTION PIPELINE
          </span>
          <h2 className="font-display text-3xl md:text-4xl tracking-tight mt-3 text-ink">
            Securing liquidity without revealing parameters.
          </h2>
        </div>

        <div className="border-t border-ledger/20">
          
          {/* Step 1 */}
          <div className="ledger-row group">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start w-full py-2">
              <div className="md:col-span-1 font-mono text-sage text-sm font-bold pt-1">
                01
              </div>
              <div className="md:col-span-4 pr-4">
                <h3 className="font-display text-xl text-ink mb-1 group-hover:text-ledger transition-colors">
                  Upload & Local Extraction
                </h3>
                <span className="font-mono text-[9px] text-sage tracking-wider uppercase">OP_UPLOAD_MEMORANDUM</span>
              </div>
              <div className="md:col-span-7 text-sm text-ink-light leading-relaxed">
                Merchant securely uploads invoice files. Key fields (debtor, due date, face amount) are parsed and structured. No information is stored on generic backend databases.
              </div>
            </div>
          </div>

          {/* Step 2 */}
          <div className="ledger-row group">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start w-full py-2">
              <div className="md:col-span-1 font-mono text-sage text-sm font-bold pt-1">
                02
              </div>
              <div className="md:col-span-4 pr-4">
                <h3 className="font-display text-xl text-ink mb-1 group-hover:text-ledger transition-colors">
                  Homomorphic Shielding
                </h3>
                <span className="font-mono text-[9px] text-sage tracking-wider uppercase">OP_FHE_SHIELD</span>
              </div>
              <div className="md:col-span-7 text-sm text-ink-light leading-relaxed">
                Privora encrypts fields using Fhenix FHEVM before pushing them to the blockchain. The invoice data exists solely as random-looking cryptographic ciphertext hashes on-chain.
              </div>
            </div>
          </div>

          {/* Step 3 */}
          <div className="ledger-row group">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start w-full py-2">
              <div className="md:col-span-1 font-mono text-sage text-sm font-bold pt-1">
                03
              </div>
              <div className="md:col-span-4 pr-4">
                <h3 className="font-display text-xl text-ink mb-1 group-hover:text-ledger transition-colors">
                  Confidential Credit Score
                </h3>
                <span className="font-mono text-[9px] text-sage tracking-wider uppercase">OP_ENCRYPTED_MATCHING</span>
              </div>
              <div className="md:col-span-7 text-sm text-ink-light leading-relaxed">
                Smart contracts run calculations directly on the encrypted fields to calculate discount margins. Lenders bid and verify merchant credit histories without ever seeing buyers or invoice details.
              </div>
            </div>
          </div>

          {/* Step 4 */}
          <div className="ledger-row group">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start w-full py-2">
              <div className="md:col-span-1 font-mono text-sage text-sm font-bold pt-1">
                04
              </div>
              <div className="md:col-span-4 pr-4">
                <h3 className="font-display text-xl text-ink mb-1 group-hover:text-ledger transition-colors">
                  Sealed Escrow Settlement
                </h3>
                <span className="font-mono text-[9px] text-sage tracking-wider uppercase">OP_ZERO_EXPOSURE_SETTLEMENT</span>
              </div>
              <div className="md:col-span-7 text-sm text-ink-light leading-relaxed">
                Matched deals fund instantly through shielded vaults. Stablecoin payments route to secure, confidential escrow addresses, and repayment accounts settle with zero public footprints.
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* 5. Use Cases Section */}
      <section id="use-cases" className="py-20 bg-paper-light border-y border-ledger/20 px-6 md:px-12">
        <div className="max-w-7xl mx-auto w-full">
          <div className="text-left mb-16">
            <h2 className="font-display text-3xl md:text-4xl tracking-tight text-ink mb-2">
              Engineered for private credit markets.
            </h2>
            <p className="text-sm text-ink-light">
              FHE ledger scaling unlocks secure liquidity across high-stakes private industries.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Card 1 */}
            <div className="border border-ledger/20 p-6 md:p-8 bg-paper rounded shadow-sm flex flex-col justify-between hover:border-ledger hover:shadow-md transition-all duration-200">
              <div>
                <span className="font-mono text-[10px] text-ledger font-bold uppercase block mb-3">01 / CORPORATE TRADE</span>
                <h3 className="font-display text-2xl text-ink mb-4">SMEs & Suppliers</h3>
                <p className="text-xs text-ink-light leading-relaxed mb-6">
                  Financially optimize supply lines by monetizing purchase orders and net terms. Keep valuable supply-chain structures hidden from competitor price scraping.
                </p>
              </div>
              <span className="inline-flex items-center text-xs font-bold text-ledger gap-1 hover:underline cursor-pointer">
                View Trade Protocol <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </div>

            {/* Card 2 */}
            <div className="border border-ledger/20 p-6 md:p-8 bg-paper rounded shadow-sm flex flex-col justify-between hover:border-ledger hover:shadow-md transition-all duration-200">
              <div>
                <span className="font-mono text-[10px] text-ledger font-bold uppercase block mb-3">02 / INTERNATIONAL LOGISTICS</span>
                <h3 className="font-display text-2xl text-ink mb-4">Cross-Border Exporters</h3>
                <p className="text-xs text-ink-light leading-relaxed mb-6">
                  Fund international ocean bills and freight invoices without revealing geopolitical transit links, customs declarations, or wholesale pricing structures.
                </p>
              </div>
              <span className="inline-flex items-center text-xs font-bold text-ledger gap-1 hover:underline cursor-pointer">
                View Export Protocol <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </div>

            {/* Card 3 */}
            <div className="border border-ledger/20 p-6 md:p-8 bg-paper rounded shadow-sm flex flex-col justify-between hover:border-ledger hover:shadow-md transition-all duration-200">
              <div>
                <span className="font-mono text-[10px] text-ledger font-bold uppercase block mb-3">03 / INSTITUTIONAL FINANCE</span>
                <h3 className="font-display text-2xl text-ink mb-4">Private Credit Funds</h3>
                <p className="text-xs text-ink-light leading-relaxed mb-6">
                  Lenders issue assets, track covenant standards, and calculate portfolio margins privately on public chains without breaching client NDA requirements.
                </p>
              </div>
              <span className="inline-flex items-center text-xs font-bold text-ledger gap-1 hover:underline cursor-pointer">
                View Fund Protocol <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </div>

          </div>
        </div>
      </section>

      {/* 6. Footer */}
      <footer className="mt-auto border-t border-ledger/20 py-12 px-6 md:px-12 bg-paper-light">
        <div className="max-w-7xl mx-auto w-full grid grid-cols-1 md:grid-cols-4 gap-8">
          
          <div className="md:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <span className="font-display font-extrabold text-lg tracking-tighter text-ledger bg-ledger/5 px-1.5 py-0.5 rounded border border-ledger/10">
                PR
              </span>
              <span className="font-display font-extrabold text-base tracking-tight text-ink uppercase">
                Privora
              </span>
            </div>
            <p className="text-xs text-ink-light leading-relaxed max-w-sm mb-4">
              Confidential invoice financing on Fhenix network. Providing encrypted enterprise liquidity without public traces.
            </p>
            <div className="p-3 bg-ledger/5 border border-ledger/10 text-[11px] font-mono text-ledger inline-block rounded">
              "Even we can't see your invoice data."
            </div>
          </div>

          <div>
            <h4 className="font-mono text-xs font-bold text-ink uppercase tracking-wider mb-4">Ledger Systems</h4>
            <ul className="space-y-2 text-xs font-semibold text-ink-light">
              <li><Link to="/login" className="hover:text-ledger">Merchant Portal (Mock)</Link></li>
              <li><Link to="/login" className="hover:text-ledger">Lender Dashboard (Mock)</Link></li>
              <li><Link to="/login" className="hover:text-ledger">Admin Terminal (Mock)</Link></li>
              <li><span className="hover:text-ledger cursor-pointer">Fhenix Explorer</span></li>
            </ul>
          </div>

          <div>
            <h4 className="font-mono text-xs font-bold text-ink uppercase tracking-wider mb-4">Protocol Core</h4>
            <ul className="space-y-2 text-xs font-semibold text-ink-light">
              <li><span className="hover:text-ledger cursor-pointer">Whitepaper (FHEVM)</span></li>
              <li><span className="hover:text-ledger cursor-pointer">Contracts README</span></li>
              <li><span className="hover:text-ledger cursor-pointer">Backend Specs</span></li>
              <li><span className="hover:text-ledger cursor-pointer">GitHub Code</span></li>
            </ul>
          </div>

        </div>

        <div className="max-w-7xl mx-auto w-full border-t border-ledger/10 mt-8 pt-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-[10px] text-sage font-mono">
            © 2026 PRIVORA PROTOCOL. SECURED VIA FULLY HOMOMORPHIC ENCRYPTION.
          </p>
          <div className="flex gap-4 text-[10px] font-mono text-sage">
            <span className="hover:text-ledger cursor-pointer">PRIVACY POLICY</span>
            <span>•</span>
            <span className="hover:text-ledger cursor-pointer">TERMS OF CUSTODY</span>
          </div>
        </div>
      </footer>

    </div>
  )
}

export function App() {
  return (
    <ToastProvider>
      <Web3Provider>
        <AuthProvider>
          <BrowserRouter>
          <Routes>
            {/* Landing route */}
            <Route path="/" element={<LandingPage />} />

            {/* Auth routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />

            {/* Protected Dashboard routes */}
            <Route 
              path="/merchant/dashboard" 
              element={
                <ProtectedRoute allowedRole="merchant">
                  <MerchantDashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/merchant/invoices/upload" 
              element={
                <ProtectedRoute allowedRole="merchant">
                  <UploadWizard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/merchant/invoices/:id/repay" 
              element={
                <ProtectedRoute allowedRole="merchant">
                  <Repay />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/lender/dashboard" 
              element={
                <ProtectedRoute allowedRole="lender">
                  <LenderDashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/lender/marketplace" 
              element={
                <ProtectedRoute allowedRole="lender">
                  <Marketplace />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/merchant/invoices/:id/offers" 
              element={
                <ProtectedRoute allowedRole="merchant">
                  <OfferComparison />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/dashboard" 
              element={
                <ProtectedRoute allowedRole="admin">
                  <AdminDashboard />
                </ProtectedRoute>
              } 
            />

            {/* Explorer placeholder route */}
            <Route path="/explorer/placeholder" element={<ExplorerPlaceholder />} />

            <Route 
              path="/merchant/profile" 
              element={
                <ProtectedRoute allowedRole="merchant">
                  <Profile />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/lender/profile" 
              element={
                <ProtectedRoute allowedRole="lender">
                  <Profile />
                </ProtectedRoute>
              } 
            />

            {/* Catch-all redirects back to home */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
      </Web3Provider>
    </ToastProvider>
  )
}

export default App
