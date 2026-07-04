import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { getInvoices, getOffers, getMerchantBalance, getActivities } from '../../lib/mock-data';
import { useToast } from '../../components/Toast';
import RedactionBar from '../../components/RedactionBar';
import { Lock, Unlock, LogOut, Plus, Eye, EyeOff, Activity, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const MerchantDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const invoices = getInvoices();
  const [authorizedMap, setAuthorizedMap] = useState<Record<string, boolean>>({});
  const [showBalance, setShowBalance] = useState(false);

  // Trigger simulated physical stamp toasts on dashboard load
  useEffect(() => {
    const timer1 = setTimeout(() => {
      showToast("Offer Received", "Horizon Capital submitted a new bid (1.85%) on INV-2026-004.", "received");
    }, 1200);

    const timer2 = setTimeout(() => {
      showToast("Repayment Due", "INV-2026-001 settlement repayment due in 12 days.", "due");
    }, 3500);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [showToast]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const toggleInvoiceDecrypt = (id: string) => {
    setAuthorizedMap((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const mockActivities = getActivities();

  return (
    <div className="min-h-screen bg-paper flex flex-col font-sans select-none text-ink">
      
      {/* Dashboard Header */}
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
              Merchant Ledger
            </span>
          </div>

          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate('/merchant/profile')}
              className="text-right hover:opacity-80 transition-opacity focus:outline-none"
              title="View Registry Profile"
            >
              <p className="text-xs font-semibold text-ink hover:underline">{user.businessName || 'Alpha Logistics Ltd.'}</p>
              <p className="text-[10px] font-mono text-sage hover:underline">{user.walletAddress}</p>
            </button>
            <button 
              onClick={handleLogout}
              className="p-2 border border-ledger/20 hover:border-seal text-ink hover:text-seal hover:bg-seal/5 rounded transition-all active:scale-95"
              title="Logout from platform"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-12">
        
        {/* Banner */}
        <div className="mb-10 bg-ledger/5 border border-ledger/20 p-6 rounded flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="font-display text-2xl text-ledger font-semibold">Active Ledger Book</h2>
            <p className="text-xs text-ink-light leading-relaxed max-w-xl">
              Upload invoices to encrypt their face value and buyer identity. Lenders submit bids on ciphertext aggregates.
            </p>
          </div>
          <button 
            onClick={() => navigate('/merchant/invoices/upload')}
            className="bg-ledger text-paper hover:bg-ledger-light font-semibold tracking-wide py-2.5 px-5 rounded text-xs transition-all flex items-center gap-1.5 shadow-[1px_1px_0px_#0e2114]"
          >
            <Plus className="w-4 h-4" />
            UPLOAD NEW INVOICE
          </button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          
          <div className="border border-ledger/20 p-5 bg-paper-light rounded shadow-sm relative flex flex-col justify-between">
            <div>
              <span className="font-mono text-[9px] text-sage font-bold uppercase block mb-1">AVAILABLE BALANCE</span>
              <div className="flex items-center gap-2">
                <RedactionBar 
                  value={`$${getMerchantBalance().toLocaleString()}.00 USD`} 
                  ciphertext="0x7b2f3e8a...00ef" 
                  authorized={showBalance} 
                  className="text-base"
                />
                <button 
                  onClick={() => setShowBalance(!showBalance)}
                  className="p-1 hover:text-ledger transition-colors text-sage shrink-0"
                  title="Toggle balance visibility"
                >
                  {showBalance ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <span className="text-[9px] text-sage font-mono block mt-2">MERCHANT PRIVATE TREASURY</span>
          </div>

          <div className="border border-ledger/20 p-5 bg-paper-light rounded shadow-sm flex flex-col justify-between">
            <div>
              <span className="font-mono text-[9px] text-ledger font-bold uppercase block mb-1">ACTIVE FUNDING DRAWN</span>
              <p className="font-display text-2xl font-bold text-ledger leading-none my-1">
                ${invoices.filter(inv => inv.status === 'Financed').reduce((sum, inv) => sum + (inv.financedAmount || 0), 0).toLocaleString()}.00
              </p>
            </div>
            <span className="text-[9px] text-sage font-mono block mt-2">SETTLED IN ESCROW VAULTS</span>
          </div>

          <div className="border border-ledger/20 p-5 bg-paper-light rounded shadow-sm flex flex-col justify-between">
            <div>
              <span className="font-mono text-[9px] text-sage font-bold uppercase block mb-1">PENDING INVOICES</span>
              <p className="font-display text-2xl font-bold text-ink leading-none my-1">
                {invoices.filter(inv => inv.status === 'Pending').length}
              </p>
            </div>
            <span className="text-[9px] text-sage font-mono block mt-2">ACTIVE FHE AUCTION MATRICES</span>
          </div>

          <div className="border border-ledger/20 p-5 bg-paper-light rounded shadow-sm flex flex-col justify-between">
            <div>
              <span className="font-mono text-[9px] text-seal font-bold uppercase block mb-1">UPCOMING REPAYMENT</span>
              <p className="font-display text-2xl font-bold text-ink leading-none my-1">
                $50,000.00
              </p>
            </div>
            <span className="text-[9px] text-seal font-mono block mt-2">NET TERMS SETTLEMENT DUE AUG 15</span>
          </div>

        </div>

        {/* Main Grid: Invoice list + Activity Feed */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Invoice Table */}
          <div className="lg:col-span-8 bg-paper-light border border-ledger/20 p-6 md:p-8 rounded shadow-sm">
            <div className="pb-4 mb-6 border-b border-ledger/20 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <div>
                <h3 className="font-display text-lg font-bold text-ink uppercase tracking-tight">Invoice Ledger Records</h3>
                <p className="font-mono text-[9px] text-sage">INVOICES REGISTERED ON FHENIX BLOCKCHAIN</p>
              </div>
              <p className="text-[9px] text-sage font-mono italic">
                Data is sealed even to you by default to show FHE state.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-xs border-collapse">
                <thead>
                  <tr className="border-b border-ledger/20 text-sage text-[10px]">
                    <th className="py-2.5">INVOICE ID</th>
                    <th className="py-2.5">BUYER (DEBTOR)</th>
                    <th className="py-2.5 text-right">FACE AMOUNT</th>
                    <th className="py-2.5 text-center">DUE DATE</th>
                    <th className="py-2.5 text-center">STATUS</th>
                    <th className="py-2.5 text-center">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-sage/20">
                  {invoices.map((inv) => {
                    const isDecrypted = authorizedMap[inv.id] || false;
                    return (
                      <tr key={inv.id} className="hover:bg-paper/50 transition-colors">
                        <td className="py-4 font-semibold text-ink">{inv.invoiceNumber}</td>
                        <td className="py-4">
                          <RedactionBar 
                            value={inv.debtorName} 
                            ciphertext={inv.encryptedDebtor}
                            authorized={isDecrypted} 
                          />
                        </td>
                        <td className="py-4 text-right">
                          <RedactionBar 
                            value={`$${inv.amount.toLocaleString()}.00`} 
                            ciphertext={inv.encryptedAmount.substring(0, 12) + '...'}
                            authorized={isDecrypted} 
                          />
                        </td>
                        <td className="py-4 text-center text-ink-light">{inv.dueDate}</td>
                        <td className="py-4 text-center">
                          <span className={`rubber-stamp ${
                            inv.status === 'Financed' ? 'stamp-financed' :
                            inv.status === 'Approved' ? 'stamp-approved' :
                            inv.status === 'Settled' || inv.status === 'Repaid' ? 'stamp-settled' :
                            'stamp-pending'
                          }`}>
                            {inv.status === 'Settled' || inv.status === 'Repaid' ? 'Settled' : inv.status}
                          </span>
                        </td>
                        <td className="py-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => toggleInvoiceDecrypt(inv.id)}
                              className={`p-1.5 rounded border transition-all ${
                                isDecrypted 
                                  ? 'border-seal/40 text-seal bg-seal/5 hover:bg-seal/15' 
                                  : 'border-ledger/20 text-ledger hover:bg-ledger/5'
                              }`}
                              title={isDecrypted ? "Re-encrypt data" : "Request view permit key"}
                            >
                              {isDecrypted ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                            </button>
                            {((inv.status === 'Approved' || inv.status === 'Pending') && getOffers().filter(o => o.invoiceId === inv.id && o.status === 'Pending').length > 0) && (
                              <button
                                onClick={() => navigate(`/merchant/invoices/${inv.id}/offers`)}
                                className="bg-ledger text-paper hover:bg-ledger-light text-[10px] font-sans font-bold px-2.5 py-1 rounded transition-all shadow-[0.5px_0.5px_0px_#0e2114] active:scale-95"
                                title="Review received lender bids"
                              >
                                BIDS ({getOffers().filter(o => o.invoiceId === inv.id && o.status === 'Pending').length})
                              </button>
                            )}
                            {inv.status === 'Financed' && (
                              <button
                                onClick={() => navigate(`/merchant/invoices/${inv.id}/repay`)}
                                className="bg-seal text-paper hover:bg-seal-light text-[10px] font-sans font-bold px-2.5 py-1 rounded transition-all shadow-[0.5px_0.5px_0px_#C4442E] active:scale-95 animate-pulse"
                                title="Repay this invoice to settle balance"
                              >
                                REPAY
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent Activity Panel */}
          <div className="lg:col-span-4 bg-paper-light border border-ledger/20 p-6 rounded shadow-sm flex flex-col justify-between">
            <div>
              <div className="pb-3 mb-4 border-b border-ledger/20 flex items-center gap-2">
                <Activity className="w-4 h-4 text-ledger" />
                <div>
                  <h3 className="font-display text-base font-bold text-ink uppercase tracking-tight">Ledger Journal</h3>
                  <p className="font-mono text-[9px] text-sage">EVENT LOG MATRIX FEED</p>
                </div>
              </div>

              <div className="space-y-4">
                {mockActivities.map((act) => (
                  <div key={act.id} className="flex gap-2.5 items-start font-mono text-[10px] leading-relaxed">
                    <Clock className="w-3.5 h-3.5 text-sage shrink-0 mt-0.5" />
                    <div>
                      <p className="text-ink-light">{act.event}</p>
                      <span className="text-[8px] text-sage font-bold block mt-1 uppercase">{act.date}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-8 p-3 bg-ledger/5 border border-ledger/10 text-[9px] font-mono text-ledger text-center rounded">
              All events verified via Helium-3 FHE consensus block.
            </div>
          </div>

        </div>

      </main>

      {/* Dashboard Footer */}
      <footer className="border-t border-ledger/10 py-6 px-6 md:px-12 bg-paper-light mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4 text-[10px] font-mono text-sage">
          <p>© 2026 PRIVORA PROTOCOL. SECURED VIA FULLY HOMOMORPHIC ENCRYPTION.</p>
          <p>MERCHANT LEDGER PORTAL CLIENT v0.1.0-HELIUM</p>
        </div>
      </footer>

    </div>
  );
};
export default MerchantDashboard;
