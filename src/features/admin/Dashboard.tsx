import React, { useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { LogOut, Shield, Database, RefreshCw, Users, Cpu, Activity, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../components/Toast';

interface SystemLog {
  id: string;
  txHash: string;
  blockNumber: number;
  operation: string;
  proofType: string;
  status: 'VERIFIED' | 'COMPUTING' | 'REJECTED';
  timestamp: string;
}

interface ApprovalRequest {
  id: string;
  targetName: string;
  role: 'Merchant' | 'Lender';
  requestType: string;
  status: 'Pending' | 'Approved';
  date: string;
}

const INITIAL_LOGS: SystemLog[] = [
  { id: 'log-1', txHash: '0x8f7a84b06e93c12f718a28db94b0d00f73c683b16d123e4f5a6b7c8d9e0f1a2b', blockNumber: 4892102, operation: 'FHE_INVOICE_ENCRYPT', proofType: 'dkg-threshold-proof', status: 'VERIFIED', timestamp: '2026-07-02 19:40:12' },
  { id: 'log-2', txHash: '0x1b4c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c', blockNumber: 4892095, operation: 'FHE_VIEW_PERMIT_SIGN', proofType: 'ecdsa-fhe-viewpermit', status: 'VERIFIED', timestamp: '2026-07-02 19:35:45' },
  { id: 'log-3', txHash: '0x5a2d8e7b6c5a4f3e2d1c0b9a8f7e6d5c4b3a2f1e0d9c8b7a6f5e4d3c2b1a0f9e', blockNumber: 4892080, operation: 'FHE_BID_OFFER_MATCH', proofType: 'fhe-ciphertext-cmp', status: 'VERIFIED', timestamp: '2026-07-02 19:12:03' },
  { id: 'log-4', txHash: '0x7e8c9b0a1f2e3d4c5b6a7f8e9d0c1b2a3f4e5d6c7b8a9f0e1d2c3b4a5f6e7d8c', blockNumber: 4892074, operation: 'FHE_INVOICE_REPAID', proofType: 'fhe-sub-balance', status: 'VERIFIED', timestamp: '2026-07-02 18:59:12' }
];

const INITIAL_REQUESTS: ApprovalRequest[] = [
  { id: 'REQ-092', targetName: 'Vanguard Shipping Ltd.', role: 'Merchant', requestType: 'Verify Wallet Credentials', status: 'Pending', date: '2026-07-03' },
  { id: 'REQ-093', targetName: 'Horizon Credit Fund', role: 'Lender', requestType: 'Clear KYC Threshold', status: 'Pending', date: '2026-07-03' },
  { id: 'REQ-094', targetName: 'Starlight Retail Inc.', role: 'Merchant', requestType: 'Verify Identity Documents', status: 'Pending', date: '2026-07-03' }
];

export const AdminDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  
  const [logs, setLogs] = useState<SystemLog[]>(INITIAL_LOGS);
  const [requests, setRequests] = useState<ApprovalRequest[]>(INITIAL_REQUESTS);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [approvingId, setApprovingId] = useState<string | null>(null);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleApprove = async (id: string, name: string) => {
    setApprovingId(id);
    await new Promise((resolve) => setTimeout(resolve, 800));
    
    setRequests((prev) => prev.filter((r) => r.id !== id));
    setApprovingId(null);
    showToast("Credentials Verified", `Access approved for ${name}.`, "accepted");

    // Add a new system log
    const newLog: SystemLog = {
      id: `log-${Date.now()}`,
      txHash: '0x' + Array.from({length: 64}, () => Math.floor(Math.random()*16).toString(16)).join(''),
      blockNumber: logs[0].blockNumber + 1,
      operation: 'ADMIN_ROLE_CREDENTIAL_APPROVE',
      proofType: 'ecdsa-admin-signature',
      status: 'VERIFIED',
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19)
    };
    setLogs([newLog, ...logs]);
  };

  const handleRefreshLogs = async () => {
    setIsRefreshing(true);
    await new Promise((resolve) => setTimeout(resolve, 800));
    
    const chars = '0123456789abcdef';
    let hex = '0x';
    for (let i = 0; i < 64; i++) {
      hex += chars[Math.floor(Math.random() * chars.length)];
    }
    
    const ops = ['FHE_INVOICE_ENCRYPT', 'FHE_VIEW_PERMIT_SIGN', 'FHE_BID_OFFER_MATCH', 'FHE_INVOICE_REPAID'];
    const proofs = ['dkg-threshold-proof', 'ecdsa-fhe-viewpermit', 'fhe-ciphertext-cmp', 'fhe-sub-balance'];
    const idx = Math.floor(Math.random() * ops.length);

    const newLog: SystemLog = {
      id: `log-${Date.now()}`,
      txHash: hex,
      blockNumber: logs[0].blockNumber + Math.floor(1 + Math.random() * 5),
      operation: ops[idx],
      proofType: proofs[idx],
      status: 'VERIFIED',
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19)
    };

    setLogs([newLog, ...logs]);
    setIsRefreshing(false);
  };

  return (
    <div className="min-h-screen bg-paper flex flex-col font-sans select-none text-ink">
      
      {/* Dashboard Header */}
      <header className="border-b border-ledger/20 py-4 px-6 md:px-12 bg-paper-light">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-display font-extrabold text-xl tracking-tighter text-seal bg-seal/5 px-2 py-0.5 rounded border border-seal/10">
              AD
            </span>
            <span className="font-display font-extrabold text-lg tracking-tight text-ink uppercase">
              Privora
            </span>
            <span className="hidden sm:inline-block border-l border-sage/40 pl-3 text-xs text-seal font-mono uppercase tracking-wider">
              System Admin Console
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-xs font-semibold text-ink font-mono">ROOT ACCOUNT</p>
              <p className="text-[9px] font-mono text-seal">{user.walletAddress || '0x0000...root'}</p>
            </div>
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
        
        {/* Visible Ledger Directive Note */}
        <div className="bg-seal/5 border-2 border-seal/30 p-4 rounded text-xs font-mono text-seal flex items-start gap-3 mb-8">
          <Shield className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold tracking-wider">CONFIDENTIALITY DIRECTIVE</span>
            <p className="mt-1 text-ink-light leading-relaxed font-sans">
              Individual invoice data is encrypted end-to-end and not visible to platform admins. Only aggregate statistics, network parameters, and validator proof matrices are accessible.
            </p>
          </div>
        </div>

        {/* Global Aggregate Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
          
          <div className="border border-ledger/20 p-5 bg-paper-light rounded shadow-sm flex items-center gap-4">
            <Database className="w-8 h-8 text-seal shrink-0 animate-pulse" />
            <div>
              <span className="font-mono text-[9px] text-sage font-bold uppercase block">TOTAL PLATFORM VOLUME</span>
              <p className="font-display text-2xl font-bold text-ink leading-tight">$2,485,100.00</p>
            </div>
          </div>

          <div className="border border-ledger/20 p-5 bg-paper-light rounded shadow-sm flex items-center gap-4">
            <Users className="w-8 h-8 text-ledger shrink-0" />
            <div>
              <span className="font-mono text-[9px] text-sage font-bold uppercase block">REGISTERED MERCHANTS</span>
              <p className="font-display text-2xl font-bold text-ink leading-tight">42 Accounts</p>
            </div>
          </div>

          <div className="border border-ledger/20 p-5 bg-paper-light rounded shadow-sm flex items-center gap-4">
            <Users className="w-8 h-8 text-ledger shrink-0" />
            <div>
              <span className="font-mono text-[9px] text-sage font-bold uppercase block">REGISTERED LENDERS</span>
              <p className="font-display text-2xl font-bold text-ink leading-tight">18 Accounts</p>
            </div>
          </div>

          <div className="border border-ledger/20 p-5 bg-paper-light rounded shadow-sm flex items-center gap-4">
            <Cpu className="w-8 h-8 text-seal shrink-0" />
            <div>
              <span className="font-mono text-[9px] text-sage font-bold uppercase block">TOTAL ACTIVE ADMINS</span>
              <p className="font-display text-2xl font-bold text-ink leading-tight">2 Accounts</p>
            </div>
          </div>

        </div>

        {/* Pending approvals queue & contract health side-by-side */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-10">
          
          {/* Left: Pending Approvals Queue */}
          <div className="lg:col-span-8 bg-paper-light border border-ledger/20 p-6 md:p-8 rounded shadow-sm">
            <div className="pb-4 mb-6 border-b border-ledger/20">
              <h3 className="font-display text-lg font-bold text-ink uppercase tracking-tight">Business Approvals Queue</h3>
              <p className="font-mono text-[9px] text-sage">VERIFY ENTITY CREDENTIALS FOR ON-CHAIN ACCESS</p>
            </div>

            <div className="space-y-4">
              {requests.length === 0 ? (
                <div className="p-8 text-center text-xs font-mono text-sage border border-dashed border-sage/40 rounded">
                  All platform business credentials verified and approved.
                </div>
              ) : (
                requests.map((req) => (
                  <div key={req.id} className="border border-ledger/20 p-4 bg-paper rounded flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 font-mono text-xs hover:border-ledger transition-colors">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] bg-ledger/10 text-ledger px-1.5 py-0.5 rounded border border-ledger/20 font-bold uppercase">
                          {req.role}
                        </span>
                        <span className="text-sage font-bold">{req.id}</span>
                      </div>
                      <h4 className="font-display font-bold text-sm text-ink uppercase">{req.targetName}</h4>
                      <p className="text-[10px] text-sage">{req.requestType} • Registered {req.date}</p>
                    </div>

                    <button
                      onClick={() => handleApprove(req.id, req.targetName)}
                      disabled={approvingId === req.id}
                      className="border border-ledger text-ledger hover:bg-ledger hover:text-paper font-sans font-bold text-xs py-2 px-4 transition-all flex items-center gap-1 shrink-0"
                    >
                      {approvingId === req.id ? (
                        <>
                          <RefreshCw className="w-3 h-3 animate-spin" />
                          VERIFYING...
                        </>
                      ) : (
                        <>
                          <Check className="w-3 h-3" />
                          APPROVE CREDENTIALS
                        </>
                      )}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right: Contract Health Placeholder */}
          <div className="lg:col-span-4 bg-paper-light border border-ledger/20 p-6 rounded shadow-sm flex flex-col justify-between relative overflow-hidden">
            <div>
              <div className="pb-3 mb-4 border-b border-ledger/20 flex items-center gap-2">
                <Activity className="w-4 h-4 text-seal" />
                <div>
                  <h3 className="font-display text-base font-bold text-ink uppercase tracking-tight">Contract Health</h3>
                  <p className="font-mono text-[9px] text-sage">ON-CHAIN VALIDATOR HEURISTICS</p>
                </div>
              </div>

              {/* Status parameters */}
              <div className="space-y-3 font-mono text-[11px] text-ink-light">
                <div className="flex justify-between border-b border-dashed border-sage/20 pb-1.5">
                  <span className="text-sage">FHE VM COMPILER</span>
                  <span className="font-bold text-ledger">v0.4.0 (ACTIVE)</span>
                </div>
                <div className="flex justify-between border-b border-dashed border-sage/20 pb-1.5">
                  <span className="text-sage">ACTIVE VALIDATORS</span>
                  <span className="font-bold">12 / 12 Nodes</span>
                </div>
                <div className="flex justify-between border-b border-dashed border-sage/20 pb-1.5">
                  <span className="text-sage">BLOCK TIME AVG</span>
                  <span className="font-bold">2.44 seconds</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sage">DKG SHIELD STATUS</span>
                  <span className="font-bold text-ledger">SEALED (99.84%)</span>
                </div>
              </div>
            </div>

            {/* Smart Contract Placeholder overlay/badge */}
            <div className="mt-8 p-4 bg-seal/5 border-2 border-seal/30 text-center rounded relative">
              <span className="rubber-stamp stamp-sealed text-[8px] tracking-wider py-0.5 px-2 mb-2">
                TESTNET DEPLOYMENT
              </span>
              <p className="text-[10px] text-ink-light font-sans leading-relaxed mt-2">
                Live statistics indexing will begin automatically once smart contracts are deployed on the Fhenix testnet.
              </p>
            </div>
          </div>

        </div>

        {/* Master Log Book (VM Events) */}
        <div className="bg-paper-light border border-ledger/20 p-6 md:p-8 rounded shadow-sm">
          <div className="pb-4 mb-6 border-b border-ledger/20 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="font-display text-lg font-bold text-ink uppercase tracking-tight">Fhevm Cryptographic Audit Trail</h3>
              <p className="font-mono text-[9px] text-sage">TRANSACTION HASH PROOF FEED</p>
            </div>
            <button 
              onClick={handleRefreshLogs}
              disabled={isRefreshing}
              className="border border-seal text-seal hover:bg-seal hover:text-paper font-mono text-[10px] font-bold py-1.5 px-3 transition-all flex items-center gap-1 shadow-[1px_1px_0px_#C4442E]"
            >
              <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
              REFRESH LOG STREAM
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs border-collapse">
              <thead>
                <tr className="border-b border-ledger/20 text-sage text-[10px]">
                  <th className="py-2.5">BLOCK</th>
                  <th className="py-2.5">TRANSACTION HASH</th>
                  <th className="py-2.5">OPERATION</th>
                  <th className="py-2.5">PROOF SCHEME</th>
                  <th className="py-2.5 text-center">PROOF STATUS</th>
                  <th className="py-2.5 text-right">TIMESTAMP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sage/20 text-[11px] text-ink-light">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-paper/50 transition-colors">
                    <td className="py-4 font-semibold text-ink">{log.blockNumber}</td>
                    <td className="py-4 text-xs font-mono tracking-tighter truncate max-w-[200px]" title={log.txHash}>
                      {log.txHash}
                    </td>
                    <td className="py-4 font-semibold text-ink">{log.operation}</td>
                    <td className="py-4">{log.proofType}</td>
                    <td className="py-4 text-center">
                      <span className="rubber-stamp stamp-approved border-ledger bg-ledger/5 text-ledger font-bold">
                        {log.status}
                      </span>
                    </td>
                    <td className="py-4 text-right text-sage">{log.timestamp}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </main>

      {/* Dashboard Footer */}
      <footer className="border-t border-ledger/10 py-6 px-6 md:px-12 bg-paper-light mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4 text-[10px] font-mono text-sage">
          <p>© 2026 PRIVORA PROTOCOL. DIAGNOSTIC INTERFACE ACTIVE.</p>
          <p>ADMIN CONTROL GATEWAY v0.2.0-SECURE</p>
        </div>
      </footer>

    </div>
  );
};
export default AdminDashboard;
