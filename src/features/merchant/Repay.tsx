import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getInvoices, repayInvoice, getMerchantBalance, addActivity } from '../../lib/mock-data';
import { useToast } from '../../components/Toast';
import RedactionBar from '../../components/RedactionBar';
import { ArrowLeft, Lock, Unlock, Eye, EyeOff, RefreshCw, Shield, CheckCircle } from 'lucide-react';
import { useWeb3 } from '../../lib/web3/useWeb3';
import { parseEther } from 'ethers';

export const Repay: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { account, connectWallet, getContract } = useWeb3();
  
  const invoices = getInvoices();
  const invoice = invoices.find(inv => inv.id === id);

  const [isRevealed, setIsRevealed] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [settledState, setSettledState] = useState(false);

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

  const handleRepay = async () => {
    if (!account) {
      await connectWallet();
      if (!account) return;
    }

    try {
      setIsProcessing(true);

      const parsedInvoiceId = parseInt(invoice.id.replace('inv-', '')) || 1;
      const escrowContract = await getContract('Escrow');

      // The repayment amount in ETH is face amount / 100000
      const repaymentAmountInEth = (invoice.amount / 100000).toString();
      const valueToSend = parseEther(repaymentAmountInEth);

      const tx = await escrowContract.repay(parsedInvoiceId, { value: valueToSend });
      showToast("Repayment Broadcasted", `Transaction: ${tx.hash}`, "received");

      await tx.wait();

      const success = repayInvoice(invoice.id);
      setIsProcessing(false);

      if (success) {
        setSettledState(true);
        addActivity(`Repayment cleared for ${invoice.invoiceNumber}. Escrow security deposits released.`, 'repay');
        showToast("Repayment Settled", `Invoice ${invoice.invoiceNumber} payment of $${invoice.amount.toLocaleString()}.00 cleared.`, "accepted");
        showToast("Escrow Released", "Shielded escrow vault unlocked and collateral released to creditor.", "released");
      } else {
        showToast("Repayment Failed", "Escrow verification check failed.", "due");
      }
    } catch (err: any) {
      console.error(err);
      setIsProcessing(false);

      let errMsg = err.message || "Unknown error";
      if (err.reason) errMsg = err.reason;
      if (err.data && err.data.message) errMsg = err.data.message;

      showToast("Repayment Failed", `Failed: ${errMsg.substring(0, 50)}...`, "due");
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
              Settlement Gateway
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

      {/* Main Settlement Box */}
      <main className="flex-1 max-w-2xl w-full mx-auto p-6 md:py-16">
        
        {isProcessing ? (
          <div className="bg-paper-light border-2 border-ledger/30 rounded p-12 text-center space-y-6 shadow-sm min-h-[350px] flex flex-col justify-center items-center">
            <RefreshCw className="w-12 h-12 text-ledger animate-spin" />
            <div className="space-y-1">
              <h3 className="font-display text-xl font-bold uppercase tracking-tight text-ink">
                Settling Escrow Vault
              </h3>
              <p className="font-mono text-[9px] text-sage">DECRYPTING NET COVENANTS & ROUTING FUNDS...</p>
            </div>
            <p className="text-xs text-ink-light leading-relaxed max-w-sm">
               Smart contracts are executing on-chain via fully homomorphic balance subtraction to settle the loan without public balance leakage.
            </p>
          </div>
        ) : settledState ? (
          <div className="bg-paper-light border-2 border-ledger border-dashed rounded p-12 text-center space-y-6 relative overflow-hidden shadow-md">
            
            {/* Settled rubber stamp overlay */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-85 z-20">
              <span className="rubber-stamp stamp-settled border-ledger text-ledger scale-[2] py-2 px-6">
                SETTLED
              </span>
            </div>

            <div className="inline-flex p-3 bg-ledger/10 text-ledger border border-ledger/25 rounded-full">
              <CheckCircle className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h3 className="font-display text-2xl font-bold uppercase tracking-tight text-ink">
                Repayment Confirmed
              </h3>
              <p className="font-mono text-[9px] text-sage">TX PROOF GENERATED & RECORDED</p>
            </div>

            <div className="max-w-md mx-auto bg-paper p-5 border border-ledger/20 rounded font-mono text-xs space-y-2 text-left">
              <div className="flex justify-between items-center">
                <span className="text-sage">INVOICE ID</span>
                <span className="text-ink font-bold">{invoice.invoiceNumber}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sage">BUYER DEBTOR</span>
                <span className="text-ink font-semibold">{invoice.debtorName}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-ledger/10">
                <span className="text-[10px] text-sage font-bold">TOTAL AMOUNT PAID</span>
                <span className="text-ledger font-extrabold text-sm">
                  ${invoice.amount.toLocaleString()}.00 USD
                </span>
              </div>
            </div>

            <p className="text-xs text-ink-light leading-relaxed max-w-sm mx-auto">
              Repayment settled successfully. The invoice ledger record has been updated to **Settled** on the Fhenix blockchain.
            </p>

            <button
              onClick={() => navigate('/merchant/dashboard')}
              className="py-3 px-8 bg-ledger text-paper hover:bg-ledger-light font-bold rounded shadow-md text-xs transition-all inline-flex items-center gap-1.5"
            >
              RETURN TO LEDGER JOURNAL
            </button>
          </div>
        ) : (
          <div className="bg-paper-light border-2 border-ledger/30 rounded p-8 shadow-sm space-y-8 relative">
            
            {/* Tilted Stamp Accent */}
            <div className="absolute top-4 right-4">
              <span className="rubber-stamp stamp-sealed text-[8px] tracking-wider py-0.5 px-2">
                REPAYMENT PENDING
              </span>
            </div>

            <div className="border-b border-ledger/20 pb-4">
              <h2 className="font-display text-2xl font-bold uppercase tracking-tight text-ink">
                Invoice Repayment
              </h2>
              <p className="font-mono text-[9px] text-sage">SECURE NET TERMS COLLATERAL REDEMPTION</p>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                <div className="space-y-1">
                  <span className="text-sage uppercase text-[9px] block">INVOICE NUMBER</span>
                  <span className="text-ink font-bold block bg-paper p-2.5 border border-ledger/10">
                    {invoice.invoiceNumber}
                  </span>
                </div>
                <div className="space-y-1">
                  <span className="text-sage uppercase text-[9px] block">DUE DATE (MATURITY)</span>
                  <span className="text-ink font-semibold block bg-paper p-2.5 border border-ledger/10">
                    {invoice.dueDate}
                  </span>
                </div>
              </div>

              <div className="space-y-1 font-mono text-xs">
                <span className="text-sage uppercase text-[9px] block">BUYER DEBTOR</span>
                <span className="text-ink font-semibold block bg-paper p-2.5 border border-ledger/10">
                  {invoice.debtorName}
                </span>
              </div>

              <div className="border-t border-dashed border-sage/40 pt-6">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-mono text-xs text-sage uppercase tracking-wider">TOTAL AMOUNT DUE</span>
                  <button 
                    onClick={() => setIsRevealed(!isRevealed)}
                    className="flex items-center gap-1 text-[10px] font-mono text-ledger hover:text-ledger-light transition-colors"
                  >
                    {isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    {isRevealed ? 'RE-ENCRYPT' : 'REVEAL TERMS'}
                  </button>
                </div>
                
                <div className="bg-paper p-4 border border-ledger/20 rounded flex items-center justify-between">
                  <RedactionBar 
                    value={`$${invoice.amount.toLocaleString()}.00 USD`} 
                    ciphertext={invoice.encryptedAmount} 
                    authorized={isRevealed} 
                    className="text-lg font-bold"
                  />
                  <div className="flex gap-1">
                    {isRevealed ? <Unlock className="w-4 h-4 text-ledger" /> : <Lock className="w-4 h-4 text-seal" />}
                  </div>
                </div>
              </div>

              <div className="p-4 bg-ledger/5 border border-ledger/20 rounded flex gap-3 text-xs text-ledger leading-relaxed font-sans">
                <Shield className="w-5 h-5 shrink-0 mt-0.5" />
                <p>
                  By clicking **REPAY NOW**, you authorize the settlement gateway to deduct the face value from your connected vault and transfer the funds to the lender.
                </p>
              </div>

              <button
                onClick={handleRepay}
                className="w-full py-4 bg-ledger text-paper hover:bg-ledger-light font-bold text-sm tracking-wide transition-all shadow-[2px_2px_0px_#0e2114] flex items-center justify-center gap-2"
              >
                REPAY NOW
              </button>
            </div>
            
          </div>
        )}
      </main>
      
      {/* Footer */}
      <footer className="border-t border-ledger/10 py-6 px-6 md:px-12 bg-paper-light mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4 text-[10px] font-mono text-sage">
          <p>© 2026 PRIVORA PROTOCOL. SECURED VIA ON-CHAIN ESCROW VAULT.</p>
          <p>SETTLEMENT COMPILER v0.1.0-HELIUM</p>
        </div>
      </footer>

    </div>
  );
};
export default Repay;
