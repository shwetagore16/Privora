import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getInvoices, getOffers, addActivity, type MockLenderOffer } from '../../lib/mock-data';
import { ArrowLeft, Check, Building, ShieldCheck } from 'lucide-react';
import { useToast } from '../../components/Toast';

export const OfferComparison: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const invoices = getInvoices();
  const invoice = invoices.find(inv => inv.id === id);

  const [offersList] = useState<MockLenderOffer[]>(() => {
    const rawOffers = getOffers().filter(off => off.invoiceId === id);
    // Sort best to worst (lowest discountRate first)
    return [...rawOffers].sort((a, b) => a.discountRate - b.discountRate);
  });

  const { showToast } = useToast();
  const [successState, setSuccessState] = useState<{
    acceptedOffer: MockLenderOffer;
    netAmount: number;
  } | null>(null);

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

  const handleAcceptOffer = (offer: MockLenderOffer) => {
    // 1. Update in-memory invoice status
    invoice.status = 'Financed';
    invoice.discountRate = offer.discountRate;
    invoice.financedAmount = offer.offeredAmount;
    invoice.paymentTerms = `Net ${offer.repaymentTermDays}`;

    // 2. Update offer statuses in memory
    const allOffers = getOffers();
    allOffers.forEach(off => {
      if (off.invoiceId === invoice.id) {
        if (off.id === offer.id) {
          off.status = 'Accepted';
        } else {
          off.status = 'Declined';
        }
      }
    });

    // 3. Trigger dynamic logs and stamps toasts
    addActivity(`Bid accepted for ${invoice.invoiceNumber}. Escrow funding of $${offer.offeredAmount.toLocaleString()}.00 cleared.`, 'accept');
    showToast("Offer Accepted", `Bid for ${invoice.invoiceNumber} accepted.`, "accepted");
    showToast("Funds Released", `${offer.offeredAmount.toLocaleString()}.00 USD transferred to connected wallet.`, "released");
    
    // 4. Enter visual success state
    setSuccessState({
      acceptedOffer: offer,
      netAmount: offer.offeredAmount
    });
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

      <main className="flex-1 max-w-4xl w-full mx-auto p-6 md:py-12">
        
        {/* Invoice Summary Card */}
        <div className="bg-paper-light border-2 border-ledger/30 rounded p-6 shadow-sm mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
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
              Review homomorphically compiled funding term proposals. Click accept to finalize threshold escrow covenants.
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
            
            {/* Success stamp overlay */}
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
              Escrow tokens were combined homomorphically. Liquid collateral has been transferred to your connected wallet.
            </p>

            <button
              onClick={() => navigate('/merchant/dashboard')}
              className="py-3 px-8 bg-ledger text-paper hover:bg-ledger-light font-bold rounded shadow-md text-xs transition-all inline-flex items-center gap-1.5"
            >
              RETURN TO LEDGER JOURNAL
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <h3 className="font-display text-base font-bold text-ink uppercase tracking-wider mb-4 border-b border-ledger/20 pb-2">
              Lender Offers Received ({offersList.length})
            </h3>

            {offersList.length === 0 ? (
              <div className="bg-paper-light border border-dashed border-sage/40 rounded p-12 text-center text-sage font-mono text-xs">
                No homomorphic bids have been registered in this invoice auction pool yet.
              </div>
            ) : (
              <div className="space-y-4">
                {offersList.map((off, index) => {
                  const isBest = index === 0;
                  return (
                    <div 
                      key={off.id}
                      className={`bg-paper-light border-2 rounded p-5 relative transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-4 ${
                        isBest ? 'border-ledger shadow-sm' : 'border-ledger/20'
                      }`}
                    >
                      {/* Best Value rubber stamp */}
                      {isBest && (
                        <div className="absolute top-2 right-4 pointer-events-none">
                          <span className="rubber-stamp stamp-approved border-ledger bg-ledger/5 text-ledger font-bold text-[8px] tracking-widest scale-95 py-0.5 px-2">
                            BEST VALUE
                          </span>
                        </div>
                      )}

                      <div className="flex items-center gap-4">
                        <div className={`p-2 rounded-full hidden sm:block ${isBest ? 'bg-ledger/10 text-ledger' : 'bg-paper text-sage'}`}>
                          <Building className="w-5 h-5" />
                        </div>
                        <div className="space-y-0.5">
                          <span className="text-[9px] font-mono text-sage block uppercase">MUTUAL PRIVATE CREDITOR</span>
                          <h4 className="font-display font-bold text-sm text-ink uppercase tracking-wide">
                            {off.lenderName}
                          </h4>
                          <span className="text-[9px] font-mono text-sage uppercase">
                            Submitted: {off.createdAt}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap md:flex-nowrap gap-6 md:gap-8 items-center font-mono text-xs">
                        <div className="space-y-0.5 min-w-24 text-left md:text-right">
                          <span className="text-[9px] text-sage uppercase block">DISCOUNT RATE</span>
                          <span className="text-ink font-bold text-sm text-ledger">
                            {off.discountRate.toFixed(2)}%
                          </span>
                        </div>

                        <div className="space-y-0.5 min-w-28 text-left md:text-right">
                          <span className="text-[9px] text-sage uppercase block">REPAYMENT TERM</span>
                          <span className="text-ink font-bold text-sm">
                            {off.repaymentTermDays} Days
                          </span>
                        </div>

                        <div className="space-y-0.5 min-w-28 text-left md:text-right">
                          <span className="text-[9px] text-sage uppercase block">FUNDING CAPITAL</span>
                          <span className="text-ink font-bold text-sm">
                            ${off.offeredAmount.toLocaleString()}.00
                          </span>
                        </div>

                        <div className="pt-2 md:pt-0">
                          <button
                            onClick={() => handleAcceptOffer(off)}
                            className="bg-ledger text-paper hover:bg-ledger-light font-sans font-bold py-2 px-5 rounded text-xs transition-all flex items-center gap-1 shadow-[1px_1px_0px_#0e2114] active:scale-95"
                          >
                            <Check className="w-3.5 h-3.5" />
                            ACCEPT BID
                          </button>
                        </div>
                      </div>

                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

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
