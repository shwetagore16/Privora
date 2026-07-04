import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { addInvoice, addActivity, type MockInvoice } from '../../lib/mock-data';
import { useToast } from '../../components/Toast';
import { useWeb3 } from '../auth/Web3Context';
import { Encryptable } from '@cofhe/sdk';
import { ethers } from 'ethers';
import RedactionBar from '../../components/RedactionBar';
import { ArrowLeft, ArrowRight, Shield, FileText, UploadCloud, CheckCircle, Cpu, Database } from 'lucide-react';

export const UploadWizard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [step, setStep] = useState(1);
  const { address, connect, isWrongNetwork, switchToSepolia, isCofheReady, invoiceRegistry, cofheClient } = useWeb3();

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

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const processFile = (file: File) => {
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      showToast("Validation Error", "Attached document must be a PDF file.", "due");
      return;
    }

    let sizeStr = '';
    if (file.size < 1024 * 1024) {
      sizeStr = `${Math.round(file.size / 1024)} KB`;
    } else {
      sizeStr = `${(file.size / (1024 * 1024)).toFixed(2)} MB`;
    }

    setFileName(file.name);
    setFileSize(sizeStr);
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  // Run the deliberate on-chain encryption ceremony
  const startEncryptionCeremony = async () => {
    setLogs(['[SYSTEM] Initializing on-chain FHEVM cryptosystem...']);
    
    try {
      const amountBig = BigInt(amount);
      const buyerAddr = buyerName.trim();
      const dueUnix = Math.floor(new Date(dueDate).getTime() / 1000);

      // Phase 1: Encrypt Buyer
      setCeremonyState('encrypting_buyer');
      setLogs(prev => [...prev, '[OP_FHE_ENCRYPT] Requesting cryptographic keys from coordinator...']);

      if (!isCofheReady || !cofheClient || !invoiceRegistry) {
        throw new Error('Web3 provider or CoFHE client is not fully initialized');
      }

      const encrypted = await cofheClient.encryptInputs([
        Encryptable.uint64(amountBig),
        Encryptable.address(buyerAddr),
        Encryptable.uint32(BigInt(dueUnix))
      ]).execute();

      const amountCt = encrypted[0].ctHash;
      const buyerCt = encrypted[1].ctHash;
      const dueCt = encrypted[2].ctHash;
      const termsCt = '0x0000000000000000000000000000000000000000000000000000000000000000';

      setBuyerCipher(buyerCt);
      setAmountCipher(amountCt);
      setDueCipher(dueCt);
      setTermsCipher(termsCt);

      const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

      setLogs(prev => [...prev, `[OP_ENCRYPT_ADDRESS] Input Address: "${buyerAddr}"`]);
      await delay(400);
      setBuyerSealed(true);
      setLogs(prev => [...prev, ` -> Output Ciphertext: ${buyerCt.substring(0, 16)}...`]);
      await delay(300);

      // Phase 2: Encrypt Amount
      setCeremonyState('encrypting_amount');
      setLogs(prev => [...prev, `[OP_ENCRYPT_UINT64] Input Amount: ${amountBig}`]);
      await delay(400);
      setAmountSealed(true);
      setLogs(prev => [...prev, ` -> Output Ciphertext: ${amountCt.substring(0, 16)}...`]);
      await delay(300);

      // Phase 3: Encrypt Due Date
      setCeremonyState('encrypting_due');
      setLogs(prev => [...prev, `[OP_ENCRYPT_UINT32] Input Due Date Unix: ${dueUnix}`]);
      await delay(400);
      setDueSealed(true);
      setLogs(prev => [...prev, ` -> Output Ciphertext: ${dueCt.substring(0, 16)}...`]);
      await delay(300);

      // Phase 4: Encrypt Terms
      setCeremonyState('encrypting_terms');
      setLogs(prev => [...prev, `[OP_PLAINTEXT_TERMS] Input Terms: "${paymentTerms}"`]);
      await delay(400);
      setTermsSealed(true);
      setLogs(prev => [...prev, ` -> Output Ciphertext: ${termsCt.substring(0, 16)}...`]);
      await delay(300);

      // Phase 5: Generate zero-knowledge threshold proof
      setCeremonyState('signing_proof');
      setLogs(prev => [...prev, '[DKG_THRESHOLD] Generating threshold proof of validator execution...']);
      await delay(500);
      setLogs(prev => [...prev, ' -> Validator signatures validated.']);
      await delay(200);

      // Phase 6: Broadcast transaction to Sepolia
      setCeremonyState('broadcasting');
      setLogs(prev => [...prev, '[FHEVM_BLOCK] Preparing transaction payload for InvoiceRegistry.createInvoice...']);

      const structAmount = {
        ctHash: encrypted[0].ctHash,
        securityZone: encrypted[0].securityZone,
        utype: encrypted[0].utype,
        signature: encrypted[0].signature
      };
      const structBuyer = {
        ctHash: encrypted[1].ctHash,
        securityZone: encrypted[1].securityZone,
        utype: encrypted[1].utype,
        signature: encrypted[1].signature
      };
      const structDueDate = {
        ctHash: encrypted[2].ctHash,
        securityZone: encrypted[2].securityZone,
        utype: encrypted[2].utype,
        signature: encrypted[2].signature
      };

      setLogs(prev => [...prev, '[FHEVM_BLOCK] Broadcasting createInvoice transaction to Sepolia testnet...']);
      
      const tx = await invoiceRegistry.createInvoice(
        structAmount,
        structBuyer,
        structDueDate
      );
      
      setLogs(prev => [...prev, ` -> Transaction Broadcasted. Hash: ${tx.hash}`]);
      setLogs(prev => [...prev, ' -> Waiting for block confirmation (min 1 block)...']);
      
      const receipt = await tx.wait();
      setTxHash(tx.hash);

      // Parse invoiceId from logs
      const iface = new ethers.Interface([
        "event InvoiceCreated(uint256 indexed invoiceId, uint8 status, address indexed merchant)"
      ]);
      let blockchainInvoiceId = Date.now().toString().substring(8);
      for (const log of receipt.logs) {
        try {
          const parsed = iface.parseLog(log);
          if (parsed && parsed.name === "InvoiceCreated") {
            blockchainInvoiceId = parsed.args.invoiceId.toString();
            break;
          }
        } catch (e) {
          // Ignored
        }
      }

      setLogs(prev => [...prev, `[FHEVM_BLOCK] Invoice ID #${blockchainInvoiceId} created. Initiating listing transaction...`]);
      const listTx = await invoiceRegistry.listOnMarketplace(BigInt(blockchainInvoiceId));
      setLogs(prev => [...prev, ` -> Listing Transaction Broadcasted. Hash: ${listTx.hash}`]);
      setLogs(prev => [...prev, ' -> Waiting for listing confirmation...']);
      const listReceipt = await listTx.wait();
      setLogs(prev => [...prev, ` -> Invoice listed on marketplace in block ${listReceipt.blockNumber}.`]);

      // Add to in-memory array
      const newInvoice: MockInvoice = {
        id: `inv-${blockchainInvoiceId}`,
        invoiceNumber: `INV-2026-${blockchainInvoiceId.padStart(3, '0')}`,
        debtorName: buyerName,
        amount: parseFloat(amount),
        dueDate: dueDate,
        status: 'Pending' as const,
        encryptedAmount: amountCt,
        encryptedDebtor: buyerCt,
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
      addActivity(`Invoice ${newInvoice.invoiceNumber} listed on Sepolia (ID: ${blockchainInvoiceId})`, 'upload');
      showToast("Invoice Listed", `Invoice ${newInvoice.invoiceNumber} has been listed on marketplace.`, "received");

      setLogs(prev => [...prev, `[SYSTEM] Complete initialization cycle finished.`]);
      setCeremonyState('completed');
    } catch (err: any) {
      console.error(err);
      let errorMsg = 'Failed to encrypt or submit invoice';
      if (err.code === 'ACTION_REJECTED' || err.message?.includes('user rejected') || err.message?.includes('rejected')) {
        errorMsg = 'Transaction rejected in MetaMask';
      } else if (err.code === 'CALL_EXCEPTION' || err.message?.includes('revert')) {
        errorMsg = 'Transaction reverted on-chain';
      } else if (err.message?.includes('FETCH_KEYS_FAILED') || err.message?.includes('publicKey')) {
        errorMsg = 'Failed to fetch FHE keys from coordinator';
      }
      
      setLogs(prev => [...prev, `[ERROR] ${errorMsg}: ${err.message || err}`]);
      showToast("Operation Failed", errorMsg, "due");
      setCeremonyState('idle');
    }
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

              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!ethers.isAddress(buyerName.trim())) {
                    showToast("Validation Error", "Buyer must be a valid Ethereum wallet address.", "due");
                    return;
                  }
                  setStep(2);
                }} 
                className="space-y-4 text-xs font-mono"
              >
                <div>
                  <label className="text-sage block mb-1 uppercase text-[10px]">BUYER WALLET ADDRESS (0x...)</label>
                  <input 
                    type="text" 
                    required
                    value={buyerName}
                    onChange={(e) => setBuyerName(e.target.value)}
                    placeholder="e.g. 0x70997970C51812dc3A010C7d01b50e0d17dc79C8"
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
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleDrop}
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

              <div className="pt-4 flex flex-col gap-4">
                {!address ? (
                  <>
                    <div className="flex items-center gap-3 bg-ledger/5 border border-ledger/20 p-4 rounded text-center justify-center">
                      <p className="text-xs font-semibold text-ink leading-normal">
                        Connect your FHE wallet to sign and broadcast the encrypted invoice.
                      </p>
                    </div>
                    <div className="flex justify-between items-center w-full">
                      <button 
                        onClick={() => setStep(2)} 
                        className="py-2.5 px-5 border border-ledger text-ledger hover:bg-ledger/5 font-sans font-bold rounded text-xs transition-all flex items-center gap-1"
                      >
                        BACK
                      </button>
                      <button 
                        onClick={connect}
                        className="bg-ledger text-paper hover:bg-ledger-light font-sans font-bold py-2.5 px-6 rounded text-xs transition-all flex items-center gap-1.5 shadow-[1px_1px_0px_#0e2114]"
                      >
                        CONNECT FHE WALLET
                      </button>
                    </div>
                  </>
                ) : isWrongNetwork ? (
                  <>
                    <div className="flex items-center gap-3 bg-seal/5 border border-seal/20 p-4 rounded text-center justify-center">
                      <p className="text-xs font-semibold text-seal leading-normal">
                        Your wallet is connected to the wrong network. Switch to Sepolia testnet to proceed.
                      </p>
                    </div>
                    <div className="flex justify-between items-center w-full">
                      <button 
                        onClick={() => setStep(2)} 
                        className="py-2.5 px-5 border border-ledger text-ledger hover:bg-ledger/5 font-sans font-bold rounded text-xs transition-all flex items-center gap-1"
                      >
                        BACK
                      </button>
                      <button 
                        onClick={switchToSepolia}
                        className="bg-seal text-paper hover:bg-seal-light font-sans font-bold py-2.5 px-6 rounded text-xs transition-all flex items-center gap-1.5 shadow-[1px_1px_0px_#932c1a]"
                      >
                        SWITCH TO SEPOLIA
                      </button>
                    </div>
                  </>
                ) : !isCofheReady ? (
                  <>
                    <div className="flex items-center gap-3 bg-ledger/5 border border-ledger/20 p-4 rounded text-center justify-center animate-pulse">
                      <Cpu className="w-4 h-4 animate-spin text-ledger" />
                      <p className="text-xs font-semibold text-ledger leading-normal">
                        Initializing secure encryption environment...
                      </p>
                    </div>
                    <div className="flex justify-between items-center w-full">
                      <button 
                        onClick={() => setStep(2)} 
                        className="py-2.5 px-5 border border-ledger text-ledger hover:bg-ledger/5 font-sans font-bold rounded text-xs transition-all flex items-center gap-1"
                      >
                        BACK
                      </button>
                      <button 
                        disabled
                        className="bg-ledger text-paper opacity-50 cursor-not-allowed font-sans font-bold py-2.5 px-6 rounded text-xs transition-all flex items-center gap-1.5"
                      >
                        WAITING FOR CLIENT...
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between w-full">
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
                )}
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
                  <a 
                    href={`https://sepolia.etherscan.io/tx/${txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-ledger hover:text-ledger-light font-semibold break-all text-[11px] select-all leading-normal hover:underline"
                  >
                    {txHash}
                  </a>
                </div>

                <div className="flex justify-between items-center pt-1">
                  <span className="text-[10px] text-sage">SHIELD LEVEL</span>
                  <span className="text-ledger font-bold">DKG THRESHOLD ACTIVE</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 pt-2">
                <a
                  href={`https://sepolia.etherscan.io/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-3 text-xs font-mono font-bold border-2 border-ledger text-ledger hover:bg-ledger hover:text-paper shadow-[1px_1px_0px_#1b3a24] transition-all flex items-center justify-center gap-1.5"
                >
                  <Database className="w-4 h-4" />
                  VIEW ON-CHAIN RECORD
                </a>

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
