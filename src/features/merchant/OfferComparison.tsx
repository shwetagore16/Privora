import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getInvoices, getOffers, addActivity, type MockLenderOffer, saveData } from '../../lib/mock-data';
import { ArrowLeft, Check, Building, ShieldCheck, Cpu, Lock, Clock } from 'lucide-react';
import { useToast } from '../../components/Toast';
import { useWeb3 } from '../auth/Web3Context';
import RedactionBar from '../../components/RedactionBar';

interface OfferActivity {
  invoiceId: number;
  offerId: number;
  lenderAddress: string;
  eventType: 'Submitted' | 'Compared' | 'Accepted' | 'Rejected';
  status: string;
  txHash: string;
  blockNumber: number;
  createdAt: string;
}

interface DBStatus {
  invoiceId: number;
  offersCount: number;
  hasCompared: boolean;
  isAccepted: boolean;
  winningOfferId: number | null;
  lenderAddress: string | null;
}

export const OfferComparison: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const invoices = getInvoices();
  const invoice = invoices.find(inv => inv.id === id);

  const { showToast } = useToast();
  const { address, isCofheReady, cofheClient, offerMarket } = useWeb3();

  // Component States
  const [onChainOffers, setOnChainOffers] = useState<{ offerId: number; lender: string }[]>([]);
  const [activityLogs, setActivityLogs] = useState<OfferActivity[]>([]);
  const [, setDbStatus] = useState<DBStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isComparing, setIsComparing] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);
  const [decryptedWinningOfferId, setDecryptedWinningOfferId] = useState<number | null>(null);
  
  const [successState, setSuccessState] = useState<{
    acceptedOffer: MockLenderOffer;
    netAmount: number;
  } | null>(null);

  const numericInvoiceId = parseInt(id?.replace('inv-', '') || '1') || 1;

  // Helper to fetch activity & on-chain data
  const fetchData = async () => {
    if (!offerMarket || !address) {
      setIsLoading(false);
      return;
    }

    try {
      // 1. Fetch on-chain offers
      const rawOffers = await offerMarket.getOffersForInvoice(numericInvoiceId);
      const formatted = rawOffers.map((off: any) => ({
        offerId: Number(off.offerId),
        lender: off.lender
      }));
      setOnChainOffers(formatted);

      // 2. Fetch backend activities
      const activityRes = await fetch(`http://localhost:5000/api/invoices/${numericInvoiceId}/offers/activity`);
      if (activityRes.ok) {
        const actData = await activityRes.json();
        setActivityLogs(actData);
      }

      // 3. Fetch backend status summary
      const statusRes = await fetch(`http://localhost:5000/api/invoices/${numericInvoiceId}/offers/status`);
      if (statusRes.ok) {
        const statData = await statusRes.json();
        setDbStatus(statData);

        // 4. If compared or accepted, try fetching and decrypting winning offer
        if ((statData.hasCompared || statData.isAccepted) && isCofheReady && cofheClient) {
          try {
            const bestOfferEuint = await offerMarket.getBestOffer(numericInvoiceId);
            if (bestOfferEuint && bestOfferEuint !== '0x0000000000000000000000000000000000000000000000000000000000000000') {
              const decryptedVal = await cofheClient.decryptForView(bestOfferEuint, 5).execute();
              const decryptedId = Number(decryptedVal);
              setDecryptedWinningOfferId(decryptedId);

              // If contract status is already accepted, set success view directly
              if (statData.isAccepted) {
                const matchedOffer = matchMockOffer({ offerId: decryptedId, lender: statData.lenderAddress || '' });
                if (matchedOffer) {
                  setSuccessState({
                    acceptedOffer: matchedOffer,
                    netAmount: matchedOffer.offeredAmount
                  });
                }
              }
            }
          } catch (decryptErr) {
            console.warn("Could not decrypt best offer (permit might not be signed yet):", decryptErr);
          }
        }
      }
    } catch (err) {
      console.error("Failed to load offer data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [offerMarket, address, isCofheReady]);

  if (!invoice) {
    return (
      <div className="min-h-screen bg-paper flex flex-col items-center justify-center p-6 text-center text-ink">
        <p className="font-display text-xl font-bold">Invoice records not found.</p>
        <button onClick={() => navigate('/merchant/dashboard')} className="mt-4 text-xs font-mono text-ledger hover:underline">
          Return to Dashboard
        </button>
      </div>
    );
  }

  // Cross-reference on-chain offer with local mock-data to display detailed terms
  const matchMockOffer = (onChainOff: { offerId: number; lender: string }): MockLenderOffer | null => {
    const lenderAddress = onChainOff.lender.toLowerCase();
    const invoiceMockOffers = getOffers().filter(o => 
      o.invoiceId === invoice.id && 
      o.lenderAddress?.toLowerCase() === lenderAddress
    );
    // Return mock offer corresponding to order of submission, or first one as fallback
    return invoiceMockOffers[0] || null;
  };

  // 1. Compare Offers via on-chain FHE VM
  const handleCompareOffers = async () => {
    if (!offerMarket || !address || !isCofheReady) {
      showToast("Error", "FHE environment not initialized.", "due");
      return;
    }

    setIsComparing(true);
    showToast("Transaction Started", "Invoking compareOffers() on-chain. FHE VM is evaluating rates...", "received");

    try {
      const tx = await offerMarket.compareOffers(numericInvoiceId);
      showToast("Broadcasting Proof", "Transaction broadcast. Waiting for block confirmation...", "received");
      const receipt = await tx.wait();

      // Post comparison event to local MongoDB for quick status queries
      await fetch(`http://localhost:5000/api/invoices/${numericInvoiceId}/compare`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          txHash: receipt.hash || tx.hash,
          blockNumber: receipt.blockNumber,
          senderAddress: address
        })
      });

      // Query the winning offer handle and decrypt it client-side
      const bestOfferEuint = await offerMarket.getBestOffer(numericInvoiceId);
      const decryptedVal = await cofheClient.decryptForView(bestOfferEuint, 5).execute();
      const decryptedId = Number(decryptedVal);
      setDecryptedWinningOfferId(decryptedId);

      addActivity(`Compared offers for ${invoice.invoiceNumber}. Homomorphic winner identified (ID: #${decryptedId}).`, 'compare');
      showToast("Decrypted Winner", `Winning Offer ID #${decryptedId} successfully decrypted.`, "accepted");
      await fetchData();
    } catch (err: any) {
      console.error(err);
      showToast("Error", `Comparison failed: ${err.message || 'Verification rejected.'}`, "due");
    } finally {
      setIsComparing(false);
    }
  };

  // 2. Accept winning offer on-chain
  const handleAcceptOffer = async (offerId: number, mockOffer: MockLenderOffer) => {
    if (!offerMarket || !address || !isCofheReady) {
      showToast("Error", "FHE environment not initialized.", "due");
      return;
    }

    setIsAccepting(true);
    showToast("Transaction Started", `Accepting offer #${offerId} on-chain...`, "received");

    try {
      const tx = await offerMarket.acceptOffer(numericInvoiceId, offerId);
      showToast("Broadcasting Settlement", "Transaction broadcast. Settling escrow ledger...", "received");
      await tx.wait();

      // Update local storage mock-data to stay synchronized
      invoice.status = 'Financed';
      invoice.discountRate = mockOffer.discountRate;
      invoice.financedAmount = mockOffer.offeredAmount;
      invoice.paymentTerms = `Net ${mockOffer.repaymentTermDays}`;

      const allOffers = getOffers();
      allOffers.forEach(off => {
        if (off.invoiceId === invoice.id) {
          if (off.lenderAddress?.toLowerCase() === mockOffer.lenderAddress?.toLowerCase()) {
            off.status = 'Accepted';
          } else {
            off.status = 'Declined';
          }
        }
      });
      saveData();

      // Trigger stamps and notifications
      addActivity(`Bid accepted for ${invoice.invoiceNumber}. Escrow funding of $${mockOffer.offeredAmount.toLocaleString()}.00 cleared.`, 'accept');
      showToast("Offer Accepted", `Bid for ${invoice.invoiceNumber} accepted.`, "accepted");
      showToast("Funds Released", `${mockOffer.offeredAmount.toLocaleString()}.00 USD transferred to connected wallet.`, "released");

      setSuccessState({
        acceptedOffer: mockOffer,
        netAmount: mockOffer.offeredAmount
      });
      await fetchData();
    } catch (err: any) {
      console.error(err);
      showToast("Error", `Failed to accept offer: ${err.message || 'Signature rejected.'}`, "due");
    } finally {
      setIsAccepting(false);
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
              Bid Book comparator
            </span>
          </div>

          <button 
            onClick={() => navigate('/merchant/dashboard')}
            className="flex items-center gap-1.5 text-xs font-mono text-ledger hover:text-ledger-light"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            BACK TO PORTAL
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto p-6 md:py-12 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Comparator & Bids */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* Invoice Summary Card */}
          <div className="bg-paper-light border-2 border-ledger/30 rounded p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-sage">INVOICE UNDER REVIEW</span>
                <span className="text-sm font-mono font-bold text-ink bg-ledger/5 px-2 py-0.5 rounded border border-ledger/20">
                  {invoice.invoiceNumber}
                </span>
              </div>
              <h2 className="font-display text-2xl font-bold uppercase tracking-tight text-ink">
                Compare Credit Bids
              </h2>
              <p className="text-xs text-ink-light leading-relaxed max-w-md">
                Review homomorphically compiled funding term proposals. Bids remain sealed in ciphertext until evaluated on-chain.
              </p>
            </div>

            <div className="bg-paper p-4 border border-ledger/20 rounded font-mono text-xs space-y-1 md:w-60">
              <div className="flex justify-between">
                <span className="text-sage">Maturity Date:</span>
                <span className="text-ink font-semibold">{invoice.dueDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sage">Terms:</span>
                <span className="text-ink font-semibold">{invoice.paymentTerms || 'Net 60'}</span>
              </div>
              <div className="flex justify-between items-center pt-1 border-t border-ledger/10 mt-1">
                <span className="text-[10px] text-sage">DECLARED AMOUNT</span>
                <span className="font-bold text-ledger">${invoice.amount.toLocaleString()}.00</span>
              </div>
            </div>
          </div>

          {/* Dynamic Success Panel or Offer Grid */}
          {successState ? (
            <div className="bg-paper-light border-2 border-ledger border-dashed rounded p-8 text-center space-y-6 relative overflow-hidden shadow-md">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-85 z-20">
                <span className="rubber-stamp stamp-financed border-ledger text-ledger scale-150">FUNDS RELEASED</span>
              </div>

              <div className="inline-flex p-3 bg-ledger/10 text-ledger border border-ledger/25 rounded-full">
                <ShieldCheck className="w-8 h-8" />
              </div>

              <div className="space-y-1">
                <h3 className="font-display text-2xl font-bold uppercase tracking-tight text-ink">
                  Threshold Escrow Cleared
                </h3>
                <p className="font-mono text-[9px] text-sage">DKG SETTLEMENT PROOFS DEPLOYED</p>
              </div>

              <div className="max-w-md mx-auto bg-paper p-5 border border-ledger/20 rounded font-mono text-xs space-y-3 text-left">
                <div className="flex justify-between items-center border-b border-dashed border-sage/30 pb-2">
                  <span className="text-sage">ESCROW MUTUAL LENDER</span>
                  <span className="text-ink font-bold uppercase">{successState.acceptedOffer.lenderName}</span>
                </div>
                <div className="flex justify-between items-center border-b border-dashed border-sage/30 pb-2">
                  <span className="text-sage">DISCOUNT YIELD DEDUCTED</span>
                  <span className="text-seal font-bold">-{successState.acceptedOffer.discountRate}%</span>
                </div>
                <div className="flex justify-between items-center pt-1">
                  <span className="text-[10px] text-sage font-bold">CAPITAL LIQUIDITY TRANSFERRED</span>
                  <span className="text-ledger font-extrabold text-sm">
                    ${successState.netAmount.toLocaleString()}.00 USD
                  </span>
                </div>
              </div>

              <p className="text-xs text-ink-light leading-relaxed max-w-sm mx-auto">
                Escrow tokens were settled homomorphically. Liquid collateral has been transferred to your connected wallet.
              </p>

              <button
                onClick={() => navigate('/merchant/dashboard')}
                className="py-3 px-8 bg-ledger text-paper hover:bg-ledger-light font-bold rounded shadow-md text-xs transition-all inline-flex items-center gap-1.5"
              >
                RETURN TO MERCHANT DASHBOARD
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              
              {/* Actions Header */}
              <div className="flex justify-between items-center border-b border-ledger/20 pb-4">
                <h3 className="font-display text-base font-bold text-ink uppercase tracking-wider">
                  Lender Offers Received ({onChainOffers.length})
                </h3>

                {onChainOffers.length > 0 && !decryptedWinningOfferId && (
                  <button
                    onClick={handleCompareOffers}
                    disabled={isComparing || !isCofheReady}
                    className="bg-ledger text-paper hover:bg-ledger-light disabled:opacity-50 font-sans font-bold py-2 px-6 rounded text-xs transition-all flex items-center gap-1.5 shadow-[1px_1px_0px_#0e2114] active:scale-95"
                  >
                    <Cpu className={`w-3.5 h-3.5 ${isComparing ? 'animate-spin' : ''}`} />
                    {isComparing ? 'COMPARING FHE RATES...' : 'COMPARE BIDS (FHE)'}
                  </button>
                )}
              </div>

              {isLoading ? (
                <div className="py-12 text-center text-xs font-mono text-sage animate-pulse flex flex-col items-center gap-3">
                  <Cpu className="w-6 h-6 animate-spin text-ledger" />
                  <span>Scanning Sepolia blockchain for bidder signatures...</span>
                </div>
              ) : onChainOffers.length === 0 ? (
                <div className="bg-paper-light border border-dashed border-sage/40 rounded p-12 text-center text-sage font-mono text-xs">
                  No homomorphic bids have been registered in this invoice auction pool yet.
                </div>
              ) : (
                <div className="space-y-4">
                  {onChainOffers.map((off) => {
                    const mockOffer = matchMockOffer(off);
                    const isWinner = decryptedWinningOfferId !== null && off.offerId === decryptedWinningOfferId;
                    const canReveal = isWinner && mockOffer;

                    return (
                      <div 
                        key={off.offerId}
                        className={`bg-paper-light border-2 rounded p-5 relative transition-all flex flex-col justify-between gap-4 ${
                          isWinner 
                            ? 'border-ledger shadow-md bg-ledger/5' 
                            : decryptedWinningOfferId !== null 
                              ? 'border-sage/20 opacity-60' 
                              : 'border-ledger/20'
                        }`}
                      >
                        {/* Winner/Encrypted Badge */}
                        <div className="absolute top-4 right-4 pointer-events-none">
                          {isWinner ? (
                            <span className="rubber-stamp stamp-approved border-ledger bg-ledger/10 text-ledger font-bold text-[8px] tracking-widest py-0.5 px-2">
                              WINNING BID (DECRYPTED)
                            </span>
                          ) : decryptedWinningOfferId !== null ? (
                            <span className="rubber-stamp border-sage/40 text-sage font-bold text-[8px] tracking-widest py-0.5 px-2">
                              REJECTED (FHE SHIELDED)
                            </span>
                          ) : (
                            <span className="rubber-stamp border-ledger/20 text-sage/70 font-bold text-[8px] tracking-widest py-0.5 px-2 flex items-center gap-1">
                              <Lock className="w-2.5 h-2.5" /> FHE SHIELDED
                            </span>
                          )}
                        </div>

                        {/* Bid Info */}
                        <div className="flex items-center gap-4">
                          <div className={`p-2 rounded-full hidden sm:block ${isWinner ? 'bg-ledger/10 text-ledger' : 'bg-paper text-sage'}`}>
                            <Building className="w-5 h-5" />
                          </div>
                          <div className="space-y-0.5">
                            <span className="text-[9px] font-mono text-sage block uppercase">MUTUAL PRIVATE CREDITOR</span>
                            <h4 className="font-display font-bold text-sm text-ink uppercase tracking-wide">
                              {canReveal ? mockOffer.lenderName : `Shielded Lender (${off.lender.substring(0, 8)}...${off.lender.substring(38)})`}
                            </h4>
                            <span className="text-[9px] font-mono text-sage uppercase">
                              ON-CHAIN OFFER ID: #{off.offerId}
                            </span>
                          </div>
                        </div>

                        {/* Encrypted/Decrypted Terms */}
                        <div className="flex flex-wrap md:flex-nowrap gap-6 md:gap-8 items-center justify-between font-mono text-xs border-t border-ledger/10 pt-4 mt-2">
                          <div className="space-y-0.5 min-w-24 text-left">
                            <span className="text-[9px] text-sage uppercase block">DISCOUNT RATE</span>
                            {canReveal ? (
                              <span className="text-ink font-bold text-sm text-ledger">
                                {mockOffer.discountRate.toFixed(2)}%
                              </span>
                            ) : (
                              <RedactionBar 
                                value="SHIELDED" 
                                ciphertext="0xbf7a...e8e4" 
                                authorized={false}
                                className="text-xs" 
                              />
                            )}
                          </div>

                          <div className="space-y-0.5 min-w-28 text-left">
                            <span className="text-[9px] text-sage uppercase block">REPAYMENT TERM</span>
                            {canReveal ? (
                              <span className="text-ink font-bold text-sm">
                                {mockOffer.repaymentTermDays} Days
                              </span>
                            ) : (
                              <span className="text-sage italic text-[11px]">[ENCRYPTED]</span>
                            )}
                          </div>

                          <div className="space-y-0.5 min-w-28 text-left">
                            <span className="text-[9px] text-sage uppercase block">FUNDING CAPITAL</span>
                            {canReveal ? (
                              <span className="text-ink font-bold text-sm">
                                ${mockOffer.offeredAmount.toLocaleString()}.00
                              </span>
                            ) : (
                              <RedactionBar 
                                value="SHIELDED" 
                                ciphertext="0x52f4...0a1e" 
                                authorized={false}
                                className="text-xs" 
                              />
                            )}
                          </div>

                          {isWinner && mockOffer && (
                            <div className="pt-2 md:pt-0 w-full md:w-auto flex justify-end">
                              <button
                                onClick={() => handleAcceptOffer(off.offerId, mockOffer)}
                                disabled={isAccepting}
                                className="bg-ledger text-paper hover:bg-ledger-light font-sans font-bold py-2.5 px-6 rounded text-xs transition-all flex items-center gap-1 shadow-[1px_1px_0px_#0e2114] active:scale-95 w-full md:w-auto justify-center"
                              >
                                {isAccepting ? (
                                  <Cpu className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Check className="w-3.5 h-3.5" />
                                )}
                                {isAccepting ? 'ACCEPTING BID...' : 'ACCEPT WINNING BID'}
                              </button>
                            </div>
                          )}
                        </div>

                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: DB Event Activity Feed */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-paper-light border border-ledger/20 p-6 rounded shadow-sm flex flex-col justify-between min-h-[400px]">
            <div>
              <div className="pb-3 mb-4 border-b border-ledger/20 flex items-center gap-2">
                <Clock className="w-4 h-4 text-ledger" />
                <div>
                  <h3 className="font-display text-base font-bold text-ink uppercase tracking-tight">Bid Activity Feed</h3>
                  <p className="font-mono text-[9px] text-sage">INDEXED VIA MONGODB</p>
                </div>
              </div>

              {activityLogs.length === 0 ? (
                <p className="text-[10px] font-mono text-sage italic py-4">No events indexed for this invoice yet.</p>
              ) : (
                <div className="space-y-4 max-h-[450px] overflow-y-auto pr-1">
                  {activityLogs.map((log, idx) => (
                    <div key={idx} className="flex gap-2.5 items-start font-mono text-[10px] leading-relaxed border-b border-sage/10 pb-2">
                      <div className={`p-1 rounded mt-0.5 ${
                        log.eventType === 'Accepted' ? 'bg-ledger/10 text-ledger' :
                        log.eventType === 'Rejected' ? 'bg-seal/10 text-seal' :
                        log.eventType === 'Compared' ? 'bg-indigo-500/10 text-indigo-400' :
                        'bg-paper text-sage'
                      }`}>
                        <Clock className="w-3 h-3" />
                      </div>
                      <div>
                        <p className="text-ink">
                          {log.eventType === 'Submitted' && `Bid offer #${log.offerId} submitted by ${log.lenderAddress.substring(0,6)}...`}
                          {log.eventType === 'Compared' && `Bids homomorphically compared via FHE VM.`}
                          {log.eventType === 'Accepted' && `Offer #${log.offerId} accepted & Escrow created.`}
                          {log.eventType === 'Rejected' && `Offer #${log.offerId} rejected.`}
                        </p>
                        <span className="text-[8px] text-sage block mt-0.5">
                          Block: {log.blockNumber} • Tx: {log.txHash.substring(0, 10)}...
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-8 p-3 bg-ledger/5 border border-ledger/10 text-[9px] font-mono text-ledger text-center rounded">
              Verified MongoDB indexing state active.
            </div>
          </div>
        </div>

      </main>

      {/* Footer */}
      <footer className="border-t border-ledger/10 py-6 px-6 md:px-12 bg-paper-light mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4 text-[10px] font-mono text-sage">
          <p>© 2026 PRIVORA PROTOCOL. DISCOUNTS HOMOMORPHICALLY SECURED.</p>
          <p>BID COMPARATOR COMPILER v0.1.0-HELIUM</p>
        </div>
      </footer>

    </div>
  );
};
export default OfferComparison;
