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

// One-time wipe of old test state to start clean
try {
  if (!localStorage.getItem('privora_wipe_v3')) {
    localStorage.removeItem('privora_invoices');
    localStorage.removeItem('privora_offers');
    localStorage.removeItem('privora_activities');
    localStorage.removeItem('privora_merchant_balance');
    localStorage.setItem('privora_wipe_v3', 'true');
  }
} catch (e) {
  console.error("Wipe failed", e);
}

const loadFromLocalStorage = <T>(key: string, defaultValue: T): T => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    return defaultValue;
  }
};

const saveToLocalStorage = <T>(key: string, value: T): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error("LocalStorage save failed", error);
  }
};

// Memory arrays initial values
const initialInvoices: MockInvoice[] = [];

const initialOffers: MockLenderOffer[] = [];

let invoices: MockInvoice[] = loadFromLocalStorage('privora_invoices', initialInvoices)
  .filter(inv => !['inv-001', 'inv-002', 'inv-003', 'inv-004'].includes(inv.id));
let offers: MockLenderOffer[] = loadFromLocalStorage('privora_offers', initialOffers)
  .filter(o => !['off-001', 'off-002', 'off-003', 'off-004', 'off-005'].includes(o.id));

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
  saveData();
};
export const getOffers = (): MockLenderOffer[] => offers;
export const addOffer = (offer: MockLenderOffer): void => {
  offers = [offer, ...offers];
  saveData();
};
export const getYieldHistory = (): YieldDataPoint[] => yieldHistory;

let merchantBalance: number = loadFromLocalStorage('privora_merchant_balance', 250000);
export const getMerchantBalance = (): number => merchantBalance;
export const deductMerchantBalance = (amount: number): void => {
  merchantBalance = Math.max(0, merchantBalance - amount);
  saveData();
};
export const repayInvoice = (id: string): boolean => {
  const inv = invoices.find(i => i.id === id);
  if (inv && inv.status === 'Financed') {
    inv.status = 'Repaid';
    deductMerchantBalance(inv.amount);
    saveData();
    return true;
  }
  return false;
};

export const settleInvoiceInMock = (id: string): boolean => {
  const inv = invoices.find(i => i.id === id);
  if (inv && inv.status === 'Repaid') {
    inv.status = 'Settled';
    saveData();
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

const initialActivities: MockActivity[] = [];

let activities: MockActivity[] = loadFromLocalStorage('privora_activities', initialActivities)
  .filter(act => !['act-1', 'act-2', 'act-3', 'act-4'].includes(act.id));

export const getActivities = (): MockActivity[] => activities;
export const addActivity = (event: string, type: string): void => {
  const newAct: MockActivity = {
    id: `act-${Date.now()}`,
    event,
    type,
    date: new Date().toISOString().replace('T', ' ').substring(0, 19)
  };
  activities = [newAct, ...activities];
  saveData();
};

export const saveData = (): void => {
  saveToLocalStorage('privora_invoices', invoices);
  saveToLocalStorage('privora_offers', offers);
  saveToLocalStorage('privora_merchant_balance', merchantBalance);
  saveToLocalStorage('privora_activities', activities);
};
