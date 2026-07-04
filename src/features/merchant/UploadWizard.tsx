import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { addInvoice, addActivity, type MockInvoice } from '../../lib/mock-data';
import { useToast } from '../../components/Toast';
import { mockEncrypt } from '../../lib/mock-encryption';
import RedactionBar from '../../components/RedactionBar';
import { ArrowLeft, ArrowRight, Shield, FileText, UploadCloud, CheckCircle, Cpu, Database } from 'lucide-react';

export const UploadWizard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [step, setStep] = useState(1);

  // Step 1: Details
  const [buyerName, setBuyerName] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('Net 60');

  // Step 2: Document Upload
  const [fileName, setFileName] = useState('');
  const [fileSize, setFileSize] = useState('');
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Step 3: Ceremony State
  const [ceremonyState, setCeremonyState] = useState<'idle' | 'encrypting_buyer' | 'encrypting_amount' | 'encrypting_due' | 'encrypting_terms' | 'signing_proof' | 'broadcasting' | 'completed'>('idle');
  const [logs, setLogs] = useState<string[]>([]);
  const [buyerSealed, setBuyerSealed] = useState(false);
  const [amountSealed, setAmountSealed] = useState(false);
  const [dueSealed, setDueSealed] = useState(false);
  const [termsSealed, setTermsSealed] = useState(false);
  const [txHash, setTxHash] = useState('');

  // Generated FHE Ciphertexts
  const [buyerCipher, setBuyerCipher] = useState('');
  const [amountCipher, setAmountCipher] = useState('');
  const [dueCipher, setDueCipher] = useState('');
  const [termsCipher, setTermsCipher] = useState('');

  // Mock file selector click
  const triggerFileSelect = () => {
    startMockUpload('invoice_tesla.pdf', 245100);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      startMockUpload(file.name, file.size);
    }
  };

  const startMockUpload = (name: string, size: number) => {
    setFileName(name);
    const sizeKB = Math.round(size / 1024);
    setFileSize(`${sizeKB} KB`);
    setIsUploadingFile(true);
    setUploadProgress(0);

    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsUploadingFile(false);
          return 100;
        }
        return prev + 25;
      });
    }, 200);
  };

  // Run the deliberate on-chain encryption ceremony
  const startEncryptionCeremony = async () => {
    setLogs(['[SYSTEM] Initializing on-chain FHEVM cryptosystem...']);
    setTxHash(`0x${Math.abs(Math.random() * 10000000).toString(16).padEnd(64, 'd')}`);

    // Pre-calculate ciphertexts
    setBuyerCipher(mockEncrypt(buyerName));
    setAmountCipher(mockEncrypt(`$${parseFloat(amount).toLocaleString()}.00`));
    setDueCipher(mockEncrypt(dueDate));
    setTermsCipher(mockEncrypt(paymentTerms));

    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    // Phase 1: Encrypt Buyer
    setCeremonyState('encrypting_buyer');
    setLogs(prev => [...prev, `[OP_ENCRYPT_STRING] Input: "${buyerName}"`]);
    await delay(500);
    setBuyerSealed(true);
    setLogs(prev => [...prev, ` -> Output Ciphertext: ${mockEncrypt(buyerName).substring(0, 16)}...`]);
    await delay(300);

    // Phase 2: Encrypt Amount
    setCeremonyState('encrypting_amount');
    setLogs(prev => [...prev, `[OP_ENCRYPT_UINT] Input: ${amount}`]);
    await delay(500);
    setAmountSealed(true);
    setLogs(prev => [...prev, ` -> Output Ciphertext: ${mockEncrypt(amount).substring(0, 16)}...`]);
    await delay(300);

    // Phase 3: Encrypt Due Date
    setCeremonyState('encrypting_due');
    setLogs(prev => [...prev, `[OP_ENCRYPT_DATE] Input: "${dueDate}"`]);
    await delay(500);
    setDueSealed(true);
    setLogs(prev => [...prev, ` -> Output Ciphertext: ${mockEncrypt(dueDate).substring(0, 16)}...`]);
    await delay(300);

    // Phase 4: Encrypt Terms
    setCeremonyState('encrypting_terms');
    setLogs(prev => [...prev, `[OP_ENCRYPT_STRING] Input: "${paymentTerms}"`]);
    await delay(500);
    setTermsSealed(true);
    setLogs(prev => [...prev, ` -> Output Ciphertext: ${mockEncrypt(paymentTerms).substring(0, 16)}...`]);
    await delay(300);

    // Phase 5: Generate zero-knowledge threshold proof
    setCeremonyState('signing_proof');
    setLogs(prev => [...prev, `[DKG_THRESHOLD] Computing secret keys with validator nodes...`]);
    await delay(600);
    setLogs(prev => [...prev, ` -> Key shares combined successfully.`]);
    await delay(300);

    // Phase 6: Broadcast transaction to Fhenix Testnet
    setCeremonyState('broadcasting');
    setLogs(prev => [...prev, `[FHEVM_BLOCK] Broadcasting to Fhenix Helium-3 testnet...`]);
    await delay(700);
    
    // Add to in-memory array
    const newInvoice: MockInvoice = {
      id: `inv-${Date.now()}`,
      invoiceNumber: `INV-2026-${Math.floor(100 + Math.random() * 900)}`,
      debtorName: buyerName,
      amount: parseFloat(amount),
      dueDate: dueDate,
      status: 'Pending',
      encryptedAmount: mockEncrypt(amount),
      encryptedDebtor: mockEncrypt(buyerName),
      isEncrypted: true,
      merchantName: user.businessName || 'Alpha Logistics Ltd',
      financingRequestDate: new Date().toISOString().split('T')[0],
      paymentTerms: paymentTerms,
      riskTier: 'B',
      industry: 'SaaS',
      tenorDays: paymentTerms === 'Net 30' ? 30 : paymentTerms === 'Net 60' ? 60 : 90,
      amountRange: parseFloat(amount) < 50000 ? '$20K - $40K' : parseFloat(amount) < 100000 ? '$70K - $90K' : '$100K - $130K'
    };
    addInvoice(newInvoice);
    addActivity(`Invoice ${newInvoice.invoiceNumber} encrypted and submitted to auction pool`, 'upload');
    showToast("Invoice Encrypted", `Invoice ${newInvoice.invoiceNumber} has been encrypted and submitted.`, "received");

    setLogs(prev => [...prev, `[SYSTEM] Block verified. Receipt registered.`]);
    setCeremonyState('completed');
  };

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
            <span className="border-l border-sage/40 pl-3 text-xs text-sage font-mono uppercase tracking-wider">
              RECEIVABLES FILE GATE
            </span>
          </div>

          <button 
            onClick={() => navigate('/merchant/dashboard')}
            className="flex items-center gap-1.5 text-xs font-mono text-ledger hover:text-ledger-light"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            RETURN TO PORTAL
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-2xl w-full mx-auto p-6 md:py-12 flex flex-col justify-center">
        
        {/* Wizard Card */}
        <div className="bg-paper-light border-2 border-ledger/30 rounded shadow-md p-6 md:p-8">
          
          {/* Step indicators */}
          {ceremonyState === 'idle' && (
            <div className="flex items-center justify-between border-b border-ledger/20 pb-4 mb-6 font-mono text-[9px] text-sage">
              <span className={step === 1 ? 'text-ledger font-bold' : ''}>01 / METADATA</span>
              <span className="w-8 border-t border-sage/35 border-dashed"></span>
              <span className={step === 2 ? 'text-ledger font-bold' : ''}>02 / ATTACHMENT</span>
              <span className="w-8 border-t border-sage/35 border-dashed"></span>
              <span className={step === 3 ? 'text-ledger font-bold' : ''}>03 / CRYPTO SEAL</span>
            </div>
          )}

          {/* STEP 1: Invoice Details Form */}
          {step === 1 && ceremonyState === 'idle' && (
            <div>
              <div className="mb-6">
                <h3 className="font-display text-xl text-ink uppercase tracking-tight">Invoice Details</h3>
                <p className="font-mono text-[9px] text-sage">DECLARATIVE METADATA ENTRIES</p>
              </div>

              <form onSubmit={(e) => { e.preventDefault(); setStep(2); }} className="space-y-4 text-xs font-mono">
                <div>
                  <label className="text-sage block mb-1 uppercase text-[10px]">BUYER CORPORATION</label>
                  <input 
                    type="text" 
                    required
                    value={buyerName}
                    onChange={(e) => setBuyerName(e.target.value)}
                    placeholder="e.g. Acme Corporation"
                    className="w-full bg-paper border border-ledger/20 text-ink focus:border-ledger px-3 py-2.5 outline-none font-sans font-medium"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sage block mb-1 uppercase text-[10px]">INVOICE AMOUNT (USD)</label>
                    <input 
                      type="number" 
                      required
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="e.g. 150000"
                      className="w-full bg-paper border border-ledger/20 text-ink focus:border-ledger px-3 py-2.5 outline-none font-sans font-medium"
                    />
                  </div>
                  <div>
                    <label className="text-sage block mb-1 uppercase text-[10px]">PAYMENT TERMS</label>
                    <select
                      value={paymentTerms}
                      onChange={(e) => setPaymentTerms(e.target.value)}
                      className="w-full bg-paper border border-ledger/20 text-ink focus:border-ledger px-3 py-2.5 outline-none font-sans font-semibold"
                    >
                      <option value="Net 30">Net 30</option>
                      <option value="Net 60">Net 60</option>
                      <option value="Net 90">Net 90</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-sage block mb-1 uppercase text-[10px]">INVOICE DUE DATE</label>
                  <input 
                    type="date" 
                    required
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full bg-paper border border-ledger/20 text-ink focus:border-ledger px-3 py-2.5 outline-none font-sans font-medium"
                  />
                </div>

                <div className="pt-4 flex justify-end">
                  <button 
                    type="submit" 
                    className="bg-ledger text-paper hover:bg-ledger-light font-sans font-bold py-2.5 px-6 rounded text-xs transition-all flex items-center gap-1 shadow-[1px_1px_0px_#0e2114]"
                  >
                    CONTINUE
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* STEP 2: Document Upload Simulation */}
          {step === 2 && ceremonyState === 'idle' && (
            <div>
              <div className="mb-6">
                <h3 className="font-display text-xl text-ink uppercase tracking-tight">Attach Memorandum PDF</h3>
                <p className="font-mono text-[9px] text-sage">UPLOAD PROOF FILE FOR COMPLIANCE</p>
              </div>

              <div className="space-y-6">
                {/* Drag Drop Box */}
                <div 
                  onClick={triggerFileSelect}
                  className="border-2 border-dashed border-ledger/30 hover:border-ledger bg-paper p-8 rounded text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3"
                >
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileChange} 
                    className="hidden" 
                    accept=".pdf"
                  />
                  <UploadCloud className="w-8 h-8 text-sage" />
                  <p className="text-xs font-semibold">Click to select or drag PDF file</p>
                  <p className="text-[10px] text-sage font-mono">PDF formats only, max 5MB</p>
                </div>

                {/* Uploading progress bar */}
                {isUploadingFile && (
                  <div className="p-4 bg-paper rounded border border-ledger/20 font-mono text-[10px] space-y-2">
                    <div className="flex justify-between font-bold">
                      <span>UPLOADING: {fileName}</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="w-full bg-sage/20 h-1 rounded-full overflow-hidden">
                      <div className="bg-ledger h-full transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
                    </div>
                  </div>
                )}

                {/* Completed upload show file */}
                {fileName && !isUploadingFile && (
                  <div className="p-4 bg-ledger/5 border-2 border-ledger/30 rounded flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileText className="w-6 h-6 text-ledger" />
                      <div className="font-mono text-xs">
                        <p className="font-bold text-ink">{fileName}</p>
                        <p className="text-[9px] text-sage">{fileSize}</p>
                      </div>
                    </div>
                    <span className="rubber-stamp stamp-approved border-ledger bg-ledger/5 text-ledger">ATTACHED</span>
                  </div>
                )}

                <div className="pt-4 flex justify-between">
                  <button 
                    onClick={() => setStep(1)} 
                    className="py-2.5 px-5 border border-ledger text-ledger hover:bg-ledger/5 font-sans font-bold rounded text-xs transition-all flex items-center gap-1"
                  >
                    BACK
                  </button>
                  <button 
                    onClick={() => setStep(3)} 
                    disabled={!fileName}
                    className="bg-ledger text-paper hover:bg-ledger-light font-sans font-bold py-2.5 px-6 rounded text-xs transition-all flex items-center gap-1 disabled:opacity-50 disabled:pointer-events-none shadow-[1px_1px_0px_#0e2114]"
                  >
                    CONTINUE
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Review and Encrypt Ceremony */}
          {step === 3 && ceremonyState === 'idle' && (
            <div>
              <div className="mb-6">
                <h3 className="font-display text-xl text-ink uppercase tracking-tight">Review & Sign Shield</h3>
                <p className="font-mono text-[9px] text-sage">VERIFY METADATA IN PLAINTEXT BEFORE SEALING</p>
              </div>

              <div className="space-y-4 font-mono text-xs mb-8">
                <div className="flex justify-between border-b border-dashed border-sage/20 pb-2">
                  <span className="text-sage">BUYER ENTITY</span>
                  <span className="text-ink font-semibold">{buyerName}</span>
                </div>
                <div className="flex justify-between border-b border-dashed border-sage/20 pb-2">
                  <span className="text-sage">FACE VALUE AMOUNT</span>
                  <span className="text-ink font-bold">${parseFloat(amount).toLocaleString()}.00 USD</span>
                </div>
                <div className="flex justify-between border-b border-dashed border-sage/20 pb-2">
                  <span className="text-sage">DUE DATE</span>
                  <span className="text-ink font-semibold">{dueDate}</span>
                </div>
                <div className="flex justify-between border-b border-dashed border-sage/20 pb-2">
                  <span className="text-sage">PAYMENT TERMS</span>
                  <span className="text-ink font-semibold">{paymentTerms}</span>
                </div>
                <div className="flex justify-between border-b border-dashed border-sage/20 pb-2">
                  <span className="text-sage">MEMORANDUM FILE</span>
                  <span className="text-ledger font-bold uppercase">{fileName} ({fileSize})</span>
                </div>
              </div>

              <div className="pt-4 flex justify-between">
                <button 
                  onClick={() => setStep(2)} 
                  className="py-2.5 px-5 border border-ledger text-ledger hover:bg-ledger/5 font-sans font-bold rounded text-xs transition-all flex items-center gap-1"
                >
                  BACK
                </button>
                <button 
                  onClick={startEncryptionCeremony}
                  className="bg-ledger text-paper hover:bg-ledger-light font-sans font-bold py-2.5 px-6 rounded text-xs transition-all flex items-center gap-1.5 shadow-[1px_1px_0px_#0e2114]"
                >
                  <Shield className="w-4 h-4" />
                  CONFIRM & ENCRYPT INVOICE
                </button>
              </div>
            </div>
          )}

          {/* ACTIVE ENCRYPTION CEREMONY SCREEN */}
          {ceremonyState !== 'idle' && ceremonyState !== 'completed' && (
            <div className="space-y-6">
              <div className="text-center py-6">
                <div className="inline-flex p-3 bg-ledger/5 border border-ledger/20 text-ledger rounded-full mb-3 animate-pulse">
                  <Cpu className="w-8 h-8 animate-spin" />
                </div>
                <h3 className="font-display text-xl font-bold uppercase tracking-tight text-ink">ENGAGING FHE SHIELD</h3>
                <p className="font-mono text-[9px] text-sage">EXECUTING HOMOMORPHIC SEAL MATRICES</p>
              </div>

              {/* Fields visual encryption transition */}
              <div className="border border-ledger/20 p-5 bg-paper rounded space-y-4 font-mono text-xs">
                
                <div className="flex justify-between items-center pb-2 border-b border-dashed border-sage/25">
                  <span className="text-sage">Buyer Corporate</span>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] text-sage font-bold italic transition-opacity duration-200 ${buyerSealed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'}`}>
                      {buyerName}
                    </span>
                    <RedactionBar value={buyerName} ciphertext={buyerCipher} authorized={!buyerSealed} />
                  </div>
                </div>

                <div className="flex justify-between items-center pb-2 border-b border-dashed border-sage/25">
                  <span className="text-sage">Face Value</span>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] text-sage font-bold italic transition-opacity duration-200 ${amountSealed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'}`}>
                      ${parseFloat(amount).toLocaleString()}.00
                    </span>
                    <RedactionBar value={`$${parseFloat(amount).toLocaleString()}.00`} ciphertext={amountCipher} authorized={!amountSealed} />
                  </div>
                </div>

                <div className="flex justify-between items-center pb-2 border-b border-dashed border-sage/25">
                  <span className="text-sage">Maturity Date</span>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] text-sage font-bold italic transition-opacity duration-200 ${dueSealed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'}`}>
                      {dueDate}
                    </span>
                    <RedactionBar value={dueDate} ciphertext={dueCipher} authorized={!dueSealed} />
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sage">Payment Terms</span>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] text-sage font-bold italic transition-opacity duration-200 ${termsSealed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'}`}>
                      {paymentTerms}
                    </span>
                    <RedactionBar value={paymentTerms} ciphertext={termsCipher} authorized={!termsSealed} />
                  </div>
                </div>

              </div>

              {/* Cryptographic operation log feed */}
              <div className="bg-ink text-sage/75 p-4 rounded font-mono text-[9px] h-32 overflow-y-auto border border-ledger/20 space-y-1 select-text">
                {logs.map((log, index) => (
                  <p key={index} className="leading-normal break-all">
                    {log}
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* CEREMONY COMPLETED SCREEN */}
          {ceremonyState === 'completed' && (
            <div className="space-y-8">
              
              <div className="text-center relative py-4">
                <div className="inline-flex p-3 bg-ledger/10 text-ledger rounded-full mb-2 border border-ledger/25">
                  <CheckCircle className="w-8 h-8" />
                </div>
                <h3 className="font-display text-2xl font-bold uppercase tracking-tight text-ink mb-1">MEMORANDUM SECURED</h3>
                <p className="font-mono text-[9px] text-sage">ON-CHAIN SEAL REGISTRATION COMPLETE</p>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-85 z-20">
                  <span className="rubber-stamp stamp-financed border-ledger text-ledger scale-125">FHE SEALED</span>
                </div>
              </div>

              <div className="space-y-4 font-mono text-xs bg-paper p-4 border border-ledger/20 rounded">
                <div className="flex flex-col gap-1 border-b border-dashed border-sage/20 pb-3">
                  <span className="text-[10px] text-sage">TRANSACTION HASH RECEIPT</span>
                  <span className="text-ink font-semibold break-all text-[11px] select-all leading-normal">
                    {txHash}
                  </span>
                </div>

                <div className="flex justify-between items-center pt-1">
                  <span className="text-[10px] text-sage">SHIELD LEVEL</span>
                  <span className="text-ledger font-bold">DKG THRESHOLD ACTIVE</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 pt-2">
                <button
                  onClick={() => navigate(`/explorer/placeholder?tx=${txHash}`)}
                  className="flex-1 py-3 text-xs font-mono font-bold border-2 border-ledger text-ledger hover:bg-ledger hover:text-paper shadow-[1px_1px_0px_#1b3a24] transition-all flex items-center justify-center gap-1.5"
                >
                  <Database className="w-4 h-4" />
                  VIEW ON-CHAIN RECORD
                </button>

                <button
                  onClick={() => navigate('/merchant/dashboard')}
                  className="flex-1 py-3 text-xs font-bold bg-ledger text-paper hover:bg-ledger-light rounded shadow-md transition-all flex items-center justify-center"
                >
                  RETURN TO DASHBOARD
                </button>
              </div>

            </div>
          )}

        </div>

      </main>

      {/* Footer */}
      <footer className="border-t border-ledger/10 py-6 px-6 md:px-12 bg-paper-light mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4 text-[10px] font-mono text-sage">
          <p>© 2026 PRIVORA PROTOCOL. ALL RECEIPTS COMPUTED IN CIPHERTEXT.</p>
          <p>UPLOADER CLIENT TERMINAL v0.1.0-HELIUM</p>
        </div>
      </footer>

    </div>
  );
};
export default UploadWizard;
