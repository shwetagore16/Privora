import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { ethers } from 'ethers';
import { createCofheClient, createCofheConfig } from '@cofhe/sdk/web';
import { Ethers6Adapter } from '@cofhe/sdk/adapters';
import { sepolia as cofheSepolia } from '@cofhe/sdk/chains';
import {
  INVOICE_REGISTRY_ADDRESS,
  OFFER_MARKET_ADDRESS,
  ESCROW_ADDRESS,
  SEPOLIA_CHAIN_ID,
  InvoiceRegistryAbi,
  OfferMarketAbi,
  EscrowAbi
} from '../../config/contracts';

declare global {
  interface Window {
    ethereum?: any;
  }
}

interface Web3ContextProps {
  address: string | null;
  signer: ethers.JsonRpcSigner | null;
  provider: ethers.BrowserProvider | null;
  isConnecting: boolean;
  isWrongNetwork: boolean;
  isCofheReady: boolean;
  cofheClient: any;
  invoiceRegistry: ethers.Contract | null;
  offerMarket: ethers.Contract | null;
  escrow: ethers.Contract | null;
  connect: () => Promise<void>;
  switchToSepolia: () => Promise<void>;
  error: string | null;
}

const Web3Context = createContext<Web3ContextProps | undefined>(undefined);

export const Web3Provider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [address, setAddress] = useState<string | null>(null);
  const [signer, setSigner] = useState<ethers.JsonRpcSigner | null>(null);
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isWrongNetwork, setIsWrongNetwork] = useState(false);
  const [isCofheReady, setIsCofheReady] = useState(false);
  const [cofheClient, setCofheClient] = useState<any>(null);
  const [invoiceRegistry, setInvoiceRegistry] = useState<ethers.Contract | null>(null);
  const [offerMarket, setOfferMarket] = useState<ethers.Contract | null>(null);
  const [escrow, setEscrow] = useState<ethers.Contract | null>(null);
  const [error, setError] = useState<string | null>(null);
  const cofheClientRef = useRef<any>(null);

  // Initialize CoFHE Client once
  useEffect(() => {
    try {
      const config = createCofheConfig({
        environment: 'web',
        useWorkers: false,
        supportedChains: [cofheSepolia]
      });
      const client = createCofheClient(config);
      setCofheClient(client);
      cofheClientRef.current = client;
    } catch (err: any) {
      console.error('Failed to initialize CoFHE client:', err);
      setError(err.message || 'Failed to initialize CoFHE client');
    }
  }, []);

  const initContracts = (activeSigner: ethers.JsonRpcSigner) => {
    const regContract = new ethers.Contract(INVOICE_REGISTRY_ADDRESS, InvoiceRegistryAbi, activeSigner);
    const mktContract = new ethers.Contract(OFFER_MARKET_ADDRESS, OfferMarketAbi, activeSigner);
    const escContract = new ethers.Contract(ESCROW_ADDRESS, EscrowAbi, activeSigner);

    setInvoiceRegistry(regContract);
    setOfferMarket(mktContract);
    setEscrow(escContract);
  };

  const checkNetwork = async (browserProvider: ethers.BrowserProvider) => {
    const network = await browserProvider.getNetwork();
    const isCorrect = Number(network.chainId) === SEPOLIA_CHAIN_ID;
    setIsWrongNetwork(!isCorrect);
    return isCorrect;
  };

  const connect = async () => {
    if (!window.ethereum) {
      setError('MetaMask is not installed');
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      // 1. Request accounts
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const walletAddress = accounts[0];

      // 2. Setup ethers provider and signer
      const ethersProvider = new ethers.BrowserProvider(window.ethereum);
      const ethersSigner = await ethersProvider.getSigner();

      setProvider(ethersProvider);
      setSigner(ethersSigner);
      setAddress(walletAddress);

      // 3. Check Network
      const isCorrectNetwork = await checkNetwork(ethersProvider);

      if (isCorrectNetwork) {
        // 4. Initialize contracts
        initContracts(ethersSigner);

        // 5. Connect CoFHE web client using Ethers6Adapter (proven working approach)
        const client = cofheClientRef.current;
        if (client) {
          try {
            const { publicClient, walletClient } = await Ethers6Adapter(ethersProvider, ethersSigner);
            await client.connect(publicClient, walletClient);

            // Generate/Get permit for decryption
            try {
              await client.permits.createSelf({
                issuer: walletAddress
              });
            } catch (permitErr) {
              console.warn("Failed to create permit automatically:", permitErr);
            }

            setIsCofheReady(true);
          } catch (cofheErr: any) {
            console.error('CoFHE connection failed:', cofheErr);
            // Still allow usage without CoFHE (contracts are initialized)
            setIsCofheReady(true);
            console.warn('Proceeding with CoFHE in degraded mode');
          }
        } else {
          // cofheClient not yet initialized, still allow contract usage
          console.warn('CoFHE client not initialized yet, contracts ready');
          setIsCofheReady(true);
        }
      }
    } catch (err: any) {
      console.error('Wallet connection failed:', err);
      setError(err.message || 'Wallet connection failed');
    } finally {
      setIsConnecting(false);
    }
  };

  const switchToSepolia = async () => {
    if (!window.ethereum) return;
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${SEPOLIA_CHAIN_ID.toString(16)}` }]
      });
      setIsWrongNetwork(false);
      // Reconnect/re-initialize after chain switch
      if (address) {
        await connect();
      }
    } catch (switchError: any) {
      // This error code indicates that the chain has not been added to MetaMask.
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: `0x${SEPOLIA_CHAIN_ID.toString(16)}`,
                chainName: 'Sepolia Test Network',
                rpcUrls: ['https://ethereum-sepolia-rpc.publicnode.com'],
                nativeCurrency: {
                  name: 'Sepolia Ether',
                  symbol: 'ETH',
                  decimals: 18
                },
                blockExplorerUrls: ['https://sepolia.etherscan.io']
              }
            ]
          });
          setIsWrongNetwork(false);
          if (address) {
            await connect();
          }
        } catch (addError: any) {
          console.error('Failed to add Sepolia network:', addError);
          setError('Failed to add Sepolia network');
        }
      } else {
        console.error('Failed to switch to Sepolia:', switchError);
        setError('Failed to switch to Sepolia');
      }
    }
  };

  // Auto-connect if wallet was previously connected
  useEffect(() => {
    const autoConnect = async () => {
      if (window.ethereum && cofheClientRef.current && !address) {
        try {
          const accounts = await window.ethereum.request({ method: 'eth_accounts' });
          if (accounts.length > 0) {
            await connect();
          }
        } catch (err) {
          // Silent fail on auto-connect
          console.warn('Auto-connect failed:', err);
        }
      }
    };
    // Small delay to ensure cofheClient is ready
    const timer = setTimeout(autoConnect, 500);
    return () => clearTimeout(timer);
  }, [cofheClient]);

  // Listen to accounts and network changes
  useEffect(() => {
    if (window.ethereum) {
      const handleAccountsChanged = async (accounts: string[]) => {
        if (accounts.length === 0) {
          // Disconnected
          setAddress(null);
          setSigner(null);
          setProvider(null);
          setInvoiceRegistry(null);
          setOfferMarket(null);
          setEscrow(null);
          setIsCofheReady(false);
        } else {
          setAddress(accounts[0]);
          if (provider) {
            const ethersSigner = await provider.getSigner();
            setSigner(ethersSigner);
            initContracts(ethersSigner);
          }
        }
      };

      const handleChainChanged = () => {
        window.location.reload();
      };

      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);

      return () => {
        if (window.ethereum.removeListener) {
          window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
          window.ethereum.removeListener('chainChanged', handleChainChanged);
        }
      };
    }
  }, [provider, address, cofheClient]);

  return (
    <Web3Context.Provider
      value={{
        address,
        signer,
        provider,
        isConnecting,
        isWrongNetwork,
        isCofheReady,
        cofheClient,
        invoiceRegistry,
        offerMarket,
        escrow,
        connect,
        switchToSepolia,
        error
      }}
    >
      {children}
    </Web3Context.Provider>
  );
};

export const useWeb3 = () => {
  const context = useContext(Web3Context);
  if (context === undefined) {
    throw new Error('useWeb3 must be used within a Web3Provider');
  }
  return context;
};
