import React, { useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { getInvoices, getOffers, getYieldHistory } from '../../lib/mock-data';
import RedactionBar from '../../components/RedactionBar';
import { Lock, Unlock, LogOut, Eye, EyeOff, TrendingUp, ShoppingBag } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

export const LenderDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  const invoices = getInvoices();
  const offers = getOffers();
  const yieldHistory = getYieldHistory();

  const [authorizedMap, setAuthorizedMap] = useState<Record<string, boolean>>({});
  const [showBalance, setShowBalance] = useState(false);

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

  // 1. Expected Yield: calculate average discount rate of accepted positions
  const acceptedOffers = offers.filter(o => o.status === 'Accepted');
  const totalOffered = acceptedOffers.reduce((sum, o) => sum + o.offeredAmount, 0);
  const averageYield = acceptedOffers.length > 0 
    ? (acceptedOffers.reduce((sum, o) => sum + o.discountRate, 0) / acceptedOffers.length).toFixed(2)
    : '2.10';

  // 2. Active Positions: count of accepted deals not yet fully repaid
  const activePositionsCount = acceptedOffers.length;

  // 3. Funded Invoices Portfolio
  const fundedInvoices = invoices.filter(inv => 
    inv.status === 'Financed' || inv.status === 'Repaid'
  );

  // Helper to calculate days remaining
  const calculateDaysRemaining = (dueDateStr: string): string => {
    const today = new Date('2026-07-03'); // Anchor to mock current time
    const due = new Date(dueDateStr);
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? `${diffDays} Days` : 'Due';
  };

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
            <span className="hidden sm:inline-block border-l border-sage/40 pl-3 text-xs text-sage font-mono uppercase tracking-wider">
              Lender Ledger
            </span>
          </div>

          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate('/lender/marketplace')}
              className="flex items-center gap-1.5 text-xs font-mono text-ledger hover:text-ledger-light border border-ledger/20 px-3 py-1.5 rounded bg-ledger/5 hover:bg-ledger/10 transition-colors font-bold"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              RECEIVABLES MARKETPLACE
            </button>

            <button 
              onClick={() => navigate('/lender/profile')}
              className="text-right hover:opacity-80 transition-opacity focus:outline-none hidden sm:block"
              title="View Registry Profile"
            >
              <p className="text-xs font-semibold text-ink hover:underline">{user.businessName || 'Horizon Capital Partners'}</p>
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
            <h2 className="font-display text-2xl text-ledger font-semibold mb-1">Portfolio Ledger Terminal</h2>
            <p className="text-xs text-ink-light leading-relaxed max-w-xl">
              Track outstanding private positions, mature yields, and escrow repayments on decrypted FHE invoices.
            </p>
          </div>
          <button 
            onClick={() => navigate('/lender/marketplace')}
            className="bg-ledger text-paper hover:bg-ledger-light font-semibold tracking-wide py-2.5 px-5 rounded text-xs transition-all flex items-center gap-1.5 shadow-[1px_1px_0px_#0e2114]"
          >
            <ShoppingBag className="w-4 h-4" />
            BROWSE RECEIVABLES
          </button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          
          <div className="border border-ledger/20 p-5 bg-paper-light rounded shadow-sm relative flex flex-col justify-between">
            <div>
              <span className="font-mono text-[9px] text-sage font-bold uppercase block mb-1">WALLET BALANCE</span>
              <div className="flex items-center gap-2">
                <RedactionBar 
                  value="$750,000.00 USD" 
                  ciphertext="0x8d5c4b3a...a8f7" 
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
            <span className="text-[9px] text-sage font-mono block mt-2">CONNECTED ESCROW CAPITAL</span>
          </div>

          <div className="border border-ledger/20 p-5 bg-paper-light rounded shadow-sm flex flex-col justify-between">
            <div>
              <span className="font-mono text-[9px] text-ledger font-bold uppercase block mb-1">ACTIVE POSITIONS</span>
              <p className="font-display text-2xl font-bold text-ledger leading-none my-1">
                {activePositionsCount}
              </p>
            </div>
            <span className="text-[9px] text-sage font-mono block mt-2">FUNDED AUCTION CONTRACTS</span>
          </div>

          <div className="border border-ledger/20 p-5 bg-paper-light rounded shadow-sm flex flex-col justify-between">
            <div>
              <span className="font-mono text-[9px] text-sage font-bold uppercase block mb-1">TOTAL CAPITAL DEPLOYED</span>
              <p className="font-display text-2xl font-bold text-ink leading-none my-1">
                ${totalOffered > 0 ? totalOffered.toLocaleString() : '117,600'}.00
              </p>
            </div>
            <span className="text-[9px] text-sage font-mono block mt-2">SECURED ACTIVE POSITIONS</span>
          </div>

          <div className="border border-ledger/20 p-5 bg-paper-light rounded shadow-sm flex flex-col justify-between">
            <div>
              <span className="font-mono text-[9px] text-sage font-bold uppercase block mb-1">EXPECTED YIELD</span>
              <p className="font-display text-2xl font-bold text-ink leading-none my-1">
                {averageYield}%
              </p>
            </div>
            <span className="text-[9px] text-sage font-mono block mt-2">AVERAGE PORTFOLIO DISCOUNTS</span>
          </div>

        </div>

        {/* Dashboard Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Portfolio Table */}
          <div className="lg:col-span-7 bg-paper-light border border-ledger/20 p-6 md:p-8 rounded shadow-sm">
            <div className="pb-4 mb-6 border-b border-ledger/20">
              <h3 className="font-display text-lg font-bold text-ink uppercase tracking-tight font-semibold">Active Portfolio Positions</h3>
              <p className="font-mono text-[9px] text-sage">INVOICES CURRENTLY FINANCED & SECURED</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-xs border-collapse">
                <thead>
                  <tr className="border-b border-ledger/20 text-sage text-[10px]">
                    <th className="py-2.5">INVOICE ID</th>
                    <th className="py-2.5">DEBTOR (BUYER)</th>
                    <th className="py-2.5 text-right">CAPITAL FUNDED</th>
                    <th className="py-2.5 text-center">MATURITY COUNTDOWN</th>
                    <th className="py-2.5 text-center">STATUS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-sage/20">
                  {fundedInvoices.map((inv) => {
                    const isDecrypted = authorizedMap[inv.id] || false;
                    const offer = offers.find(o => o.invoiceId === inv.id && o.status === 'Accepted');
                    const fundedAmount = offer ? offer.offeredAmount : inv.financedAmount || (inv.amount * 0.98);

                    return (
                      <tr key={inv.id} className="hover:bg-paper/50 transition-colors">
                        <td className="py-4 font-semibold text-ink">{inv.invoiceNumber}</td>
                        <td className="py-4">
                          <div className="flex items-center gap-1.5">
                            <RedactionBar 
                              value={inv.debtorName} 
                              ciphertext={inv.encryptedDebtor} 
                              authorized={isDecrypted} 
                            />
                            <button
                              onClick={() => toggleInvoiceDecrypt(inv.id)}
                              className="p-1 hover:text-ledger transition-colors text-sage"
                              title={isDecrypted ? "Re-encrypt data" : "Request decrypt permit"}
                            >
                              {isDecrypted ? <Lock className="w-3 h-3 text-seal" /> : <Unlock className="w-3 h-3" />}
                            </button>
                          </div>
                        </td>
                        <td className="py-4 text-right font-semibold">
                          ${fundedAmount.toLocaleString()}.00
                        </td>
                        <td className="py-4 text-center font-bold text-ink-light">
                          {calculateDaysRemaining(inv.dueDate)}
                        </td>
                        <td className="py-4 text-center">
                          <span className={`rubber-stamp ${
                            inv.status === 'Repaid' ? 'stamp-approved' : 'stamp-financed'
                          } text-[9px]`}>
                            {inv.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recharts Yield Curve Graph */}
          <div className="lg:col-span-5 bg-paper-light border border-ledger/20 p-6 rounded shadow-sm flex flex-col justify-between">
            <div>
              <div className="pb-3 mb-6 border-b border-ledger/20">
                <h3 className="font-display text-base font-bold text-ink uppercase tracking-tight">Yield Performance Curve</h3>
                <p className="font-mono text-[9px] text-sage">HISTORICAL DISCOUNTS HARVEST (%)</p>
              </div>

              {/* Recharts container */}
              <div className="w-full h-64 font-mono text-[10px] text-ink">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={yieldHistory}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid stroke="#7A9B76" strokeDasharray="3 3" opacity={0.15} />
                    <XAxis 
                      dataKey="month" 
                      tickLine={false} 
                      axisLine={{ stroke: '#7A9B76', opacity: 0.3 }} 
                      stroke="#12180F"
                    />
                    <YAxis 
                      domain={[1.5, 2.5]}
                      tickLine={false} 
                      axisLine={{ stroke: '#7A9B76', opacity: 0.3 }} 
                      stroke="#12180F"
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#EDEEE4', 
                        borderColor: '#1B3A24',
                        color: '#12180F',
                        fontFamily: 'JetBrains Mono, monospace',
                        fontSize: '11px',
                        borderWidth: '1.5px',
                        borderRadius: '4px'
                      }}
                      labelStyle={{ fontWeight: 'bold' }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="yieldRate" 
                      name="Yield Rate"
                      stroke="#1B3A24" 
                      strokeWidth={2}
                      dot={{ r: 4, stroke: '#1B3A24', strokeWidth: 1, fill: '#EDEEE4' }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="mt-6 p-4 bg-ledger/5 border border-ledger/10 rounded flex items-center gap-2.5 font-mono text-[9px] text-ledger leading-relaxed">
              <TrendingUp className="w-4 h-4 text-ledger shrink-0" />
              <span>Yield curve matches Helium-3 validator commitments. Direct compound interest distributions occur at block finality.</span>
            </div>
          </div>

        </div>

      </main>

      {/* Dashboard Footer */}
      <footer className="border-t border-ledger/10 py-6 px-6 md:px-12 bg-paper-light mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4 text-[10px] font-mono text-sage">
          <p>© 2026 PRIVORA PROTOCOL. DISCOUNTS SECURED HOMOMORPHICALLY.</p>
          <p>LENDER LEDGER JOURNAL PORTAL CLIENT v0.1.0-HELIUM</p>
        </div>
      </footer>

    </div>
  );
};
export default LenderDashboard;
