import React, { createContext, useContext, useState } from 'react';

export interface User {
  role: 'merchant' | 'lender' | 'admin' | null;
  walletAddress: string | null;
  businessName?: string;
  email?: string;
}

interface AuthContextType {
  user: User;
  isAuthenticated: boolean;
  loginWithWallet: (role: 'merchant' | 'lender' | 'admin') => Promise<string>;
  loginWithEmail: (email: string, otp: string, role: 'merchant' | 'lender' | 'admin') => Promise<void>;
  signup: (businessName: string, email: string, role: 'merchant' | 'lender') => Promise<string>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User>({ role: null, walletAddress: null });

  // Generate random fake FHE wallet address
  const generateMockAddress = (): string => {
    const chars = '0123456789abcdef';
    let hex = '0x';
    for (let i = 0; i < 40; i++) {
      hex += chars[Math.floor(Math.random() * chars.length)];
    }
    return `${hex.substring(0, 6)}...${hex.substring(38)}`;
  };

  const loginWithWallet = async (role: 'merchant' | 'lender' | 'admin'): Promise<string> => {
    // Simulate wallet connection latency
    await new Promise((resolve) => setTimeout(resolve, 800));
    const walletAddress = generateMockAddress();
    setUser({ role, walletAddress });
    return walletAddress;
  };

  const loginWithEmail = async (email: string, _otp: string, role: 'merchant' | 'lender' | 'admin'): Promise<void> => {
    // Simulate OTP validation latency
    await new Promise((resolve) => setTimeout(resolve, 800));
    const walletAddress = `0x${email.substring(0, 4).padEnd(4, 'f')}...fhe`;
    setUser({ role, walletAddress, email });
  };

  const signup = async (businessName: string, email: string, role: 'merchant' | 'lender'): Promise<string> => {
    // Simulate signup and wallet key generation latency
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const walletAddress = generateMockAddress();
    setUser({ role, walletAddress, businessName, email });
    return walletAddress;
  };

  const logout = () => {
    setUser({ role: null, walletAddress: null });
  };

  const isAuthenticated = user.role !== null;

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, loginWithWallet, loginWithEmail, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
export default AuthContext;
