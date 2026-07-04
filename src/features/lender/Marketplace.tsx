import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { getInvoices, addOffer, type MockInvoice, type MockLenderOffer } from '../../lib/mock-data';
import { useToast } from '../../components/Toast';
import { mockEncrypt } from '../../lib/mock-encryption';
import RedactionBar from '../../components/RedactionBar';
import { LogOut, SlidersHorizontal, Cpu, Database, CheckCircle, LayoutDashboard } from 'lucide-react';
import { useWeb3 } from '../../lib/web3/useWeb3';
import { Encryptable } from '@cofhe/sdk';

export const Marketplace: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { account, connectWallet, getContract, cofheClient } = useWeb3();
  
  // States for filter
  const [selectedRisk, setSelectedRisk] = useState<string>('All');
  const [selectedTenor, setSelectedTenor] = useState<string>('All');
  const [selectedIndustry, setSelectedIndustry] = useState<string>('All');

  // Invoices from data pool (only list Approved / Pending ones for bids)
  const [invoicesList] = useState<MockInvoice[]>(() => {
    return getInvoices().filter(inv => inv.status === 'Approved' || inv.status === 'Pending');
  });

  // Modal submission state
  const [selectedInvoice, setSelectedInvoice] = useState<MockInvoice | null>(null);
  const [discountBid, setDiscountBid] = useState('');
  const [termDays, setTermDays] = useState('60');

  // Ceremony state
  const [ceremonyState, setCeremonyState] = useState<'idle' | 'encrypting_rate' | 'encrypting_amount' | 'signing_proof' | 'broadcasting' | 'completed'>('idle');
  const [logs, setLogs] = useState<string[]>([]);
  const [rateSealed, setRateSealed] = useState(false);
  const [amountSealed, setAmountSealed] = useState(false);
  const [txHash, setTxHash] = useState('');
  
  const [rateCipher, setRateCipher] = useState('');
  const [amountCipher, setAmountCipher] = useState('');
  const [offeredVal, setOfferedVal] = useState(0);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleOpenBidModal = (inv: MockInvoice) => {
    setSelectedInvoice(inv);
    setDiscountBid('1.80');
    setTermDays(inv.tenorDays.toString());
    setCeremonyState('idle');
    setLogs([]);
    setRateSealed(false);
    setAmountSealed(false);
  };

  // Run the lender bid FHE encryption ceremony
  const startBidCeremony = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice || !discountBid) return;

    if (!account) {
      await connectWallet();
      if (!account) return;
    }

    if (!cofheClient) {
      showToast("Error", "Fhenix client not initialized", "due");
      return;
    }

    const rate = parseFloat(discountBid);
    const calculatedOffer = selectedInvoice.amount * (1 - rate / 100);
    setOfferedVal(Math.round(calculatedOffer));

    setLogs(['[SYSTEM] Initializing lender FHEVM private bid tunnel...']);

    // Pre-calculate ciphers
    setRateCipher(mockEncrypt(`${rate}%`));
    setAmountCipher(mockEncrypt(`$${Math.round(calculatedOffer).toLocaleString()}.00`));

    try {
      // Phase 1 & 2: Encrypt Data with CoFHE
      setCeremonyState('encrypting_rate');
      setLogs(prev => [...prev, `[OP_ENCRYPT_UINT] Input Rate: ${rate}%`]);
      setLogs(prev => [...prev, `[OP_ENCRYPT_UINT] Input Amount: $${Math.round(calculatedOffer).toLocaleString()}.00`]);
      
      const parsedInvoiceId = parseInt(selectedInvoice.id.replace('inv-', '')) || 1; // Assuming numeric IDs in real SC
      const rateEuint = Encryptable.uint64(BigInt(Math.round(rate * 100))); // scaling rate to integer if needed
      const amountEuint = Encryptable.uint64(BigInt(Math.round(calculatedOffer)));
      
      const encrypted = await cofheClient.encryptInputs([rateEuint, amountEuint]).execute();
      
      setRateSealed(true);
      setAmountSealed(true);
      setLogs(prev => [...prev, ` -> Yield & Capital Ciphertexts secured.`]);

      // Phase 3 & 4: Smart Contract Call
      setCeremonyState('signing_proof');
      setLogs(prev => [...prev, `[DKG_THRESHOLD] Submitting offer to smart contract...`]);
      
      const offerMarket = await getContract('OfferMarket');
      const tx = await offerMarket.submitOffer(
        parsedInvoiceId,
        {
          ctHash: encrypted[0].ctHash,
          securityZone: encrypted[0].securityZone,
          utype: encrypted[0].utype,
          signature: encrypted[0].signature
        },
        {
          ctHash: encrypted[1].ctHash,
          securityZone: encrypted[1].securityZone,
          utype: encrypted[1].utype,
          signature: encrypted[1].signature
        }
      );
      
      setCeremonyState('broadcasting');
      setLogs(prev => [...prev, `[FHEVM_BLOCK] Broadcasting commitment proof... Tx: ${tx.hash}`]);
      setTxHash(tx.hash);
      
      await tx.wait();

      // Add to in-memory offers list (Fallback for mock data state)
      const newOffer: MockLenderOffer = {
        id: `off-${Date.now()}`,
        invoiceId: selectedInvoice.id,
        invoiceNumber: selectedInvoice.invoiceNumber,
        lenderName: user.businessName || 'Horizon Capital Partners',
        lenderAddress: account || user.walletAddress || undefined,
        requestedAmount: selectedInvoice.amount,
        offeredAmount: Math.round(calculatedOffer),
        discountRate: rate,
        repaymentTermDays: parseInt(termDays),
        status: 'Pending',
        createdAt: new Date().toISOString().split('T')[0]
      };
      addOffer(newOffer);

      setLogs(prev => [...prev, `[SYSTEM] Commitment block cleared. Bid offer lodged successfully.`]);
      showToast("Offer Submitted", `Bid offer for ${selectedInvoice.invoiceNumber} has been encrypted and registered.`, "received");
      setCeremonyState('completed');
    } catch (err: any) {
      console.error(err);
      setLogs(prev => [...prev, `[ERROR] Failed to submit offer: ${err.message}`]);
      setCeremonyState('idle');
      
      let errMsg = err.message || "Unknown error";
      if (err.reason) errMsg = err.reason;
      if (err.data && err.data.message) errMsg = err.data.message;
      
      showToast("Error", `Failed to submit offer: ${errMsg.substring(0, 50)}...`, "due");
    }
  };

  // Filter conditions
  const filteredInvoices = invoicesList.filter(inv => {
    if (selectedRisk !== 'All' && inv.riskTier !== selectedRisk) return false;
    if (selectedTenor !== 'All' && inv.tenorDays.toString() !== selectedTenor) return false;
    if (selectedIndustry !== 'All' && inv.industry !== selectedIndustry) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-paper flex flex-col font-sans select-none text-ink">
      
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
              Lender Ledger Marketplace
            </span>
          </div>

          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate('/lender/dashboard')}
              className="flex items-center gap-1.5 text-xs font-mono text-ledger hover:text-ledger-light border border-ledger/20 px-3 py-1.5 rounded bg-ledger/5 hover:bg-ledger/10 transition-colors"
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              PORTFOLIO DASHBOARD
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
        <div className="mb-8 bg-ledger/5 border border-ledger/20 p-6 rounded">
          <h2 className="font-display text-2xl text-ledger font-semibold mb-1">Receivables Exchange Marketplace</h2>
          <p className="text-xs text-ink-light leading-relaxed max-w-2xl">
            Lenders evaluate corporate invoice pools homomorphically. Securely submit discount bids on ciphertext range indicators. Debtor identities remain encrypted until terms are approved.
          </p>
        </div>

        {/* Filters Panel */}
        <div className="bg-paper-light border border-ledger/20 p-4 rounded shadow-sm mb-8 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs font-mono text-sage font-bold">
            <SlidersHorizontal className="w-4 h-4 text-ledger" />
            <span>EXCHANGE FILTERS</span>
          </div>

          <div className="flex flex-wrap items-center gap-4 font-mono text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-sage text-[10px] uppercase">RISK TIER</span>
              <select
                value={selectedRisk}
                onChange={(e) => setSelectedRisk(e.target.value)}
                className="bg-paper border border-ledger/20 text-ink focus:border-ledger px-2.5 py-1.5 rounded outline-none font-sans"
              >
                <option value="All">All Tiers</option>
                <option value="A+">Tier A+</option>
                <option value="A">Tier A</option>
                <option value="B">Tier B</option>
                <option value="C">Tier C</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-sage text-[10px] uppercase">TENOR</span>
              <select
                value={selectedTenor}
                onChange={(e) => setSelectedTenor(e.target.value)}
                className="bg-paper border border-ledger/20 text-ink focus:border-ledger px-2.5 py-1.5 rounded outline-none font-sans"
              >
                <option value="All">All Tenors</option>
                <option value="30">30 Days</option>
                <option value="60">60 Days</option>
                <option value="90">90 Days</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-sage text-[10px] uppercase">INDUSTRY</span>
              <select
                value={selectedIndustry}
                onChange={(e) => setSelectedIndustry(e.target.value)}
                className="bg-paper border border-ledger/20 text-ink focus:border-ledger px-2.5 py-1.5 rounded outline-none font-sans"
              >
                <option value="All">All Industries</option>
                <option value="Logistics">Logistics</option>
                <option value="SaaS">SaaS</option>
                <option value="Manufacturing">Manufacturing</option>
                <option value="Energy">Energy</option>
                <option value="Retail">Retail</option>
              </select>
            </div>
          </div>
        </div>

        {/* Opportunity Card Grid */}
        {filteredInvoices.length === 0 ? (
          <div className="bg-paper-light border border-dashed border-sage/40 rounded p-12 text-center text-sage font-mono text-xs">
            No matching receivables auctions found on Fhenix testnet.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredInvoices.map((inv) => (
              <div 
                key={inv.id} 
                className="bg-paper-light border border-ledger/20 rounded p-5 relative hover:shadow-md transition-all flex flex-col justify-between"
              >
                {/* Risk Tier Stamp */}
                <div className="absolute top-4 right-4 z-10">
                  <span className={`rubber-stamp ${
                    inv.riskTier === 'A+' ? 'stamp-financed border-ledger/60 text-ledger' :
                    inv.riskTier === 'A' ? 'stamp-approved border-ledger/40 text-ledger/80' :
                    'stamp-pending border-sage/60 text-sage'
                  } text-[8px] px-1.5 py-0.5 tracking-wider font-bold`}>
                    TIER {inv.riskTier}
                  </span>
                </div>

                <div className="space-y-4">
                  <div>
                    <span className="font-mono text-[9px] text-sage block uppercase">{inv.industry} CATEGORY</span>
                    <h3 className="font-display font-semibold text-lg text-ink mt-0.5">{inv.invoiceNumber}</h3>
                  </div>

                  <div className="border-t border-b border-ledger/10 py-3 my-2 space-y-2">
                    <div className="flex justify-between items-center text-xs font-mono">
                      <span className="text-sage">Maturity Tenor</span>
                      <span className="text-ink font-semibold">{inv.tenorDays} Days</span>
                    </div>

                    <div className="flex justify-between items-center text-xs font-mono">
                      <span className="text-sage">Face Value</span>
                      <div className="text-right">
                        <RedactionBar 
                          value={`$${inv.amount.toLocaleString()}.00`}
                          ciphertext={inv.encryptedAmount.substring(0, 14) + '...'}
                          authorized={false}
                          className="text-xs"
                        />
                        <span className="text-[9px] text-sage block mt-0.5">{inv.amountRange}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4 flex justify-end">
                  <button
                    onClick={() => handleOpenBidModal(inv)}
                    className="bg-ledger text-paper hover:bg-ledger-light font-bold text-xs py-2 px-4 rounded shadow-sm transition-all"
                  >
                    SUBMIT BID
                  </button>
                </div>

              </div>
            ))}
          </div>
        )}

      </main>

      {/* Offer Submission / Encryption Ceremony Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-sm flex items-center justify-center p-6 select-none">
          <div className="bg-paper-light border-2 border-ledger/30 max-w-md w-full p-6 rounded shadow-xl relative text-left">
            
            {/* Modal Idle State */}
            {ceremonyState === 'idle' && (
              <div>
                <h3 className="font-display text-lg text-ink uppercase tracking-tight pb-3 border-b border-ledger/20 mb-4">
                  Bid Offer Commitment: {selectedInvoice.invoiceNumber}
                </h3>
                
                <div className="bg-paper p-3 border border-ledger/20 rounded font-mono text-[11px] text-ink-light space-y-1 mb-4">
                  <div className="flex justify-between">
                    <span>Target Risk Grade:</span>
                    <span className="font-bold">Tier {selectedInvoice.riskTier}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Maturity Tenor:</span>
                    <span>{selectedInvoice.tenorDays} Days</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Invoice Face Value Range:</span>
                    <span className="text-ledger font-semibold">{selectedInvoice.amountRange}</span>
                  </div>
                </div>

                <form onSubmit={startBidCeremony} className="space-y-4 text-xs font-mono">
                  <div>
                    <label className="text-sage block mb-1 uppercase text-[10px]">DISCOUNT RATE (%)</label>
                    <input 
                      type="number" 
                      step="0.05"
                      required
                      value={discountBid}
                      onChange={(e) => setDiscountBid(e.target.value)}
                      placeholder="e.g. 1.85"
                      className="w-full bg-paper border border-ledger/20 text-ink focus:border-ledger px-3 py-2.5 outline-none font-sans font-medium"
                    />
                  </div>

                  <div>
                    <label className="text-sage block mb-1 uppercase text-[10px]">REPAYMENT DURATION LIMIT</label>
                    <select 
                      value={termDays}
                      onChange={(e) => setTermDays(e.target.value)}
                      className="w-full bg-paper border border-ledger/20 text-ink focus:border-ledger px-3 py-2.5 outline-none font-sans font-semibold"
                    >
                      <option value="30">30 Days</option>
                      <option value="60">60 Days</option>
                      <option value="90">90 Days</option>
                    </select>
                  </div>

                  <div className="pt-3 flex gap-3">
                    <button 
                      type="button" 
                      onClick={() => setSelectedInvoice(null)}
                      className="flex-1 py-2.5 font-bold border border-ledger text-ledger hover:bg-ledger/5 rounded"
                    >
                      CANCEL
                    </button>
                    <button 
                      type="submit" 
                      className="flex-1 py-2.5 font-bold bg-ledger text-paper hover:bg-ledger-light rounded shadow-md flex items-center justify-center gap-1.5"
                    >
                      ENCRYPT & SUBMIT
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Active Ceremony Animation */}
            {ceremonyState !== 'idle' && ceremonyState !== 'completed' && (
              <div className="space-y-6">
                <div className="text-center py-4">
                  <div className="inline-flex p-3 bg-ledger/5 border border-ledger/20 text-ledger rounded-full mb-3 animate-pulse">
                    <Cpu className="w-7 h-7 animate-spin" />
                  </div>
                  <h3 className="font-display text-lg font-bold uppercase tracking-tight text-ink">ENGAGING FHE BID SHIELD</h3>
                  <p className="font-mono text-[9px] text-sage">ENCRYPTING BID VALUE ON-CHAIN</p>
                </div>

                <div className="border border-ledger/20 p-5 bg-paper rounded space-y-4 font-mono text-xs">
                  <div className="flex justify-between items-center pb-2 border-b border-dashed border-sage/25">
                    <span className="text-sage">Discount Rate</span>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] text-sage font-bold italic transition-opacity duration-200 ${rateSealed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'}`}>
                        {discountBid}%
                      </span>
                      <RedactionBar value={`${discountBid}%`} ciphertext={rateCipher} authorized={!rateSealed} />
                    </div>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sage">Capital Offered</span>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] text-sage font-bold italic transition-opacity duration-200 ${amountSealed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'}`}>
                        ${offeredVal.toLocaleString()}.00
                      </span>
                      <RedactionBar value={`$${offeredVal.toLocaleString()}.00`} ciphertext={amountCipher} authorized={!amountSealed} />
                    </div>
                  </div>
                </div>

                {/* Event Logs */}
                <div className="bg-ink text-sage/75 p-3 rounded font-mono text-[9px] h-28 overflow-y-auto border border-ledger/20 space-y-1">
                  {logs.map((log, idx) => (
                    <p key={idx} className="leading-relaxed break-all">
                      {log}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {/* Ceremony Completed */}
            {ceremonyState === 'completed' && (
              <div className="space-y-6 text-center">
                <div className="relative py-2">
                  <div className="inline-flex p-3 bg-ledger/10 text-ledger border border-ledger/20 rounded-full mb-2">
                    <CheckCircle className="w-8 h-8" />
                  </div>
                  <h3 className="font-display text-xl font-bold uppercase tracking-tight text-ink">BID COMMITTED</h3>
                  <p className="font-mono text-[9px] text-sage">ON-CHAIN FHE OFFER RECORDED</p>
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-85 z-20">
                    <span className="rubber-stamp stamp-financed border-ledger text-ledger scale-110">FHE SECURED</span>
                  </div>
                </div>

                <div className="bg-paper p-4 border border-ledger/20 rounded font-mono text-xs space-y-2 text-left">
                  <div className="flex flex-col gap-0.5 border-b border-dashed border-sage/20 pb-2">
                    <span className="text-[9px] text-sage">TRANSACTION RECEIPT</span>
                    <span className="text-ink font-semibold break-all text-[10px] leading-normal">{txHash}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[9px] text-sage">COVENANT ENVELOPE</span>
                    <span className="text-ledger font-bold">ACTIVE SHIELD</span>
                  </div>
                </div>

                <div className="flex gap-4 pt-2">
                  <button
                    onClick={() => navigate(`/explorer/placeholder?tx=${txHash}`)}
                    className="flex-1 py-2.5 text-xs font-mono font-bold border-2 border-ledger text-ledger hover:bg-ledger hover:text-paper transition-all flex items-center justify-center gap-1.5"
                  >
                    <Database className="w-4 h-4" />
                    EXPLORER
                  </button>
                  <button
                    onClick={() => setSelectedInvoice(null)}
                    className="flex-1 py-2.5 text-xs font-bold bg-ledger text-paper hover:bg-ledger-light rounded"
                  >
                    CLOSE
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-ledger/10 py-6 px-6 md:px-12 bg-paper-light mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4 text-[10px] font-mono text-sage">
          <p>© 2026 PRIVORA PROTOCOL. EXCHANGE OPPORTUNITIES CRYPTOGRAPHICALLY ASSURED.</p>
          <p>MARKETPLACE TERMINAL CLIENT v0.1.0-HELIUM</p>
        </div>
      </footer>

    </div>
  );
};
export default Marketplace;
