export interface MockInvoice {
  id: string;
  invoiceNumber: string;
  debtorName: string;
  amount: number;
  dueDate: string;
  status: 'Draft' | 'Pending' | 'Approved' | 'Rejected' | 'Financed' | 'Repaid' | 'Settled';
  encryptedAmount: string; // Mock FHE ciphertext
  encryptedDebtor: string; // Mock FHE ciphertext
  isEncrypted: boolean;
  merchantName: string;
  financingRequestDate?: string;
  discountRate?: number; // e.g. 1.8%
  financedAmount?: number;
  paymentTerms?: string;
  // Marketplace enhancements
  riskTier: 'A+' | 'A' | 'B' | 'C';
  industry: 'Logistics' | 'SaaS' | 'Manufacturing' | 'Energy' | 'Retail';
  tenorDays: number;
  amountRange: string;
}

export interface MockLenderOffer {
  id: string;
  invoiceId: string;
  invoiceNumber: string;
  lenderName: string;
  lenderAddress?: string;
  requestedAmount: number;
  offeredAmount: number;
  discountRate: number; // in %
  repaymentTermDays: number;
  status: 'Pending' | 'Accepted' | 'Declined' | 'Expired';
  createdAt: string;
}

export interface YieldDataPoint {
  month: string;
  yieldRate: number;
}

// Memory arrays
let invoices: MockInvoice[] = [
  {
    id: "inv-001",
    invoiceNumber: "INV-2026-001",
    debtorName: "Acme Corporation",
    amount: 50000,
    dueDate: "2026-08-15",
    status: "Approved",
    encryptedAmount: "0x8f7a84b06e93c12f718a28db94b0d00f73c683b16d123e4f5a6b7c8d9e0f1a2b",
    encryptedDebtor: "0x1b4c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c",
    isEncrypted: true,
    merchantName: "Alpha Logistics Ltd",
    financingRequestDate: "2026-07-01",
    discountRate: 1.8,
    paymentTerms: "Net 60",
    riskTier: "A",
    industry: "Manufacturing",
    tenorDays: 60,
    amountRange: "$40K - $60K"
  },
  {
    id: "inv-002",
    invoiceNumber: "INV-2026-002",
    debtorName: "Globex Industries",
    amount: 120000,
    dueDate: "2026-09-01",
    status: "Financed",
    encryptedAmount: "0x5a2d8e7b6c5a4f3e2d1c0b9a8f7e6d5c4b3a2f1e0d9c8b7a6f5e4d3c2b1a0f9e",
    encryptedDebtor: "0x7e8c9b0a1f2e3d4c5b6a7f8e9d0c1b2a3f4e5d6c7b8a9f0e1d2c3b4a5f6e7d8c",
    isEncrypted: true,
    merchantName: "Alpha Logistics Ltd",
    financingRequestDate: "2026-06-25",
    discountRate: 2.2,
    financedAmount: 117600,
    paymentTerms: "Net 90",
    riskTier: "A+",
    industry: "Logistics",
    tenorDays: 90,
    amountRange: "$100K - $130K"
  },
  {
    id: "inv-003",
    invoiceNumber: "INV-2026-003",
    debtorName: "Initech Systems",
    amount: 35000,
    dueDate: "2026-07-20",
    status: "Pending",
    encryptedAmount: "0x3c9f8e7d6a5b4c3d2e1f0a9b8c7d6e5f4a3b2c1d0e9f8a7b6c5d4e3f2a1b0c9d",
    encryptedDebtor: "0x9d2e4c6a8b0c2d4e6f8a0b2c4d6e8f0a2b4c6d8e0f2a4b6c8d0e2f4a6b8c0d2e",
    isEncrypted: true,
    merchantName: "Alpha Logistics Ltd",
    financingRequestDate: "2026-07-02",
    paymentTerms: "Net 30",
    riskTier: "B",
    industry: "SaaS",
    tenorDays: 30,
    amountRange: "$20K - $40K"
  },
  {
    id: "inv-004",
    invoiceNumber: "INV-2026-004",
    debtorName: "Retail Giants Inc",
    amount: 80000,
    dueDate: "2026-09-10",
    status: "Approved",
    encryptedAmount: "0xfa123e4d567c89ba01efcba9876543210abcdef0123456789abcdef012345678",
    encryptedDebtor: "0xbcde0123456789abcdef0123456789abcdef0123456789abcdef0123456789",
    isEncrypted: true,
    merchantName: "Alpha Logistics Ltd",
    financingRequestDate: "2026-07-02",
    paymentTerms: "Net 60",
    riskTier: "A",
    industry: "Retail",
    tenorDays: 60,
    amountRange: "$70K - $90K"
  }
];

let offers: MockLenderOffer[] = [
  {
    id: "off-001",
    invoiceId: "inv-001",
    invoiceNumber: "INV-2026-001",
    lenderName: "Horizon Capital Partners",
    requestedAmount: 50000,
    offeredAmount: 49100,
    discountRate: 1.8,
    repaymentTermDays: 60,
    status: "Pending",
    createdAt: "2026-07-02"
  },
  {
    id: "off-002",
    invoiceId: "inv-002",
    invoiceNumber: "INV-2026-002",
    lenderName: "Apex Liquidity Partners",
    requestedAmount: 120000,
    offeredAmount: 117600,
    discountRate: 2.0,
    repaymentTermDays: 90,
    status: "Accepted",
    createdAt: "2026-06-26"
  },
  // Mock offers for inv-004 (Offer Comparison testing)
  {
    id: "off-003",
    invoiceId: "inv-004",
    invoiceNumber: "INV-2026-004",
    lenderName: "Horizon Capital Partners",
    requestedAmount: 80000,
    offeredAmount: 78520,
    discountRate: 1.85,
    repaymentTermDays: 60,
    status: "Pending",
    createdAt: "2026-07-03"
  },
  {
    id: "off-004",
    invoiceId: "inv-004",
    invoiceNumber: "INV-2026-004",
    lenderName: "Apex Liquidity Partners",
    requestedAmount: 80000,
    offeredAmount: 78600,
    discountRate: 1.75,
    repaymentTermDays: 60,
    status: "Pending",
    createdAt: "2026-07-03"
  },
  {
    id: "off-005",
    invoiceId: "inv-004",
    invoiceNumber: "INV-2026-004",
    lenderName: "Sovereign Yield Fund",
    requestedAmount: 80000,
    offeredAmount: 78320,
    discountRate: 2.10,
    repaymentTermDays: 60,
    status: "Pending",
    createdAt: "2026-07-03"
  }
];

const yieldHistory: YieldDataPoint[] = [
  { month: 'Jan', yieldRate: 1.65 },
  { month: 'Feb', yieldRate: 1.72 },
  { month: 'Mar', yieldRate: 1.80 },
  { month: 'Apr', yieldRate: 1.88 },
  { month: 'May', yieldRate: 1.95 },
  { month: 'Jun', yieldRate: 2.10 }
];

// In-memory getters & setters
export const getInvoices = (): MockInvoice[] => invoices;
export const addInvoice = (invoice: MockInvoice): void => {
  invoices = [invoice, ...invoices];
};
export const getOffers = (): MockLenderOffer[] => offers;
export const addOffer = (offer: MockLenderOffer): void => {
  offers = [offer, ...offers];
};
export const getYieldHistory = (): YieldDataPoint[] => yieldHistory;

let merchantBalance = 250000;
export const getMerchantBalance = (): number => merchantBalance;
export const deductMerchantBalance = (amount: number): void => {
  merchantBalance = Math.max(0, merchantBalance - amount);
};
export const repayInvoice = (id: string): boolean => {
  const inv = invoices.find(i => i.id === id);
  if (inv && inv.status === 'Financed') {
    inv.status = 'Settled';
    deductMerchantBalance(inv.amount);
    return true;
  }
  return false;
};

export interface MockActivity {
  id: string;
  event: string;
  type: string;
  date: string;
}

let activities: MockActivity[] = [
  { id: 'act-1', event: 'FHE Decryption View Permit generated for Horizon Capital Partners', type: 'permit', date: '2026-07-02 19:40:12' },
  { id: 'act-2', event: 'Bid offer off-001 received from Horizon Capital Partners (1.8% discount)', type: 'bid', date: '2026-07-02 19:35:45' },
  { id: 'act-3', event: 'Escrow vault established for invoice INV-2026-002', type: 'escrow', date: '2026-07-02 16:45:22' },
  { id: 'act-4', event: 'Funding drawn: $117,600.00 transferred from Apex Liquidity Partners vault', type: 'fund', date: '2026-07-02 16:40:10' }
];

export const getActivities = (): MockActivity[] => activities;
export const addActivity = (event: string, type: string): void => {
  const newAct: MockActivity = {
    id: `act-${Date.now()}`,
    event,
    type,
    date: new Date().toISOString().replace('T', ' ').substring(0, 19)
  };
  activities = [newAct, ...activities];
};
