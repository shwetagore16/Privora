import { useState, useCallback, useEffect } from 'react';
import { BrowserProvider, Contract } from 'ethers';
import { createCofheClient, createCofheConfig } from '@cofhe/sdk/web';
import { Ethers6Adapter } from '@cofhe/sdk/adapters';
import { sepolia, hardhat, localcofhe } from '@cofhe/sdk/chains';
import { CONTRACT_ABIS, CONTRACT_ADDRESSES } from './index';

export const useWeb3 = () => {
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [account, setAccount] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [cofheClient, setCofheClient] = useState<any>(null);

  useEffect(() => {
    const ethereum = (window as any).ethereum;
    if (ethereum) {
      const web3Provider = new BrowserProvider(ethereum);
      setProvider(web3Provider);

      const config = createCofheConfig({
        environment: "web",
        useWorkers: false,
        supportedChains: [sepolia, hardhat, localcofhe]
      });
      const client = createCofheClient(config);
      setCofheClient(client);
    }
  }, []);

  const connectWallet = useCallback(async () => {
    const ethereum = (window as any).ethereum;
    if (!ethereum) {
      alert("Please install MetaMask to use this feature");
      return;
    }
    
    try {
      setIsConnecting(true);
      const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
      
      // Auto-switch to Sepolia Testnet (chainId: 11155111 / 0xaa36a7)
      try {
        await ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0xaa36a7' }],
        });
      } catch (switchError: any) {
        // If the network is not added to MetaMask, add it
        if (switchError.code === 4902) {
          try {
            await ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [
                {
                  chainId: '0xaa36a7',
                  chainName: 'Sepolia test network',
                  nativeCurrency: {
                    name: 'SepoliaETH',
                    symbol: 'SEP',
                    decimals: 18,
                  },
                  rpcUrls: ['https://rpc.sepolia.org'],
                  blockExplorerUrls: ['https://sepolia.etherscan.io'],
                },
              ],
            });
          } catch (addError) {
            console.error('Failed to add Sepolia network', addError);
          }
        } else {
          console.error('Failed to switch to Sepolia network', switchError);
        }
      }
      
      const web3Provider = new BrowserProvider(ethereum);
      setProvider(web3Provider);
      
      if (cofheClient) {
        const signer = await web3Provider.getSigner();
        const { publicClient, walletClient } = await Ethers6Adapter(web3Provider, signer);
        await cofheClient.connect(publicClient, walletClient);
        
        // Fhenix / CoFHE requires a permit to perform cryptographic operations
        try {
          await cofheClient.permits.createSelf({
            issuer: accounts[0]
          });
        } catch (permitErr) {
          console.warn("Failed to create permit automatically:", permitErr);
        }
      }
      
      // Set account only after successful connection
      setAccount(accounts[0]);
    } catch (error) {
      console.error("Failed to connect wallet", error);
    } finally {
      setIsConnecting(false);
    }
  }, [cofheClient]);

  const getContract = useCallback(async (contractName: keyof typeof CONTRACT_ABIS) => {
    if (!provider) throw new Error("Provider not initialized");
    const signer = await provider.getSigner();
    return new Contract(
      CONTRACT_ADDRESSES[contractName],
      CONTRACT_ABIS[contractName],
      signer
    );
  }, [provider]);

  return {
    provider,
    account,
    isConnecting,
    cofheClient,
    connectWallet,
    getContract
  };
};
