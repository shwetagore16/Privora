import EscrowABI from './abis/Escrow.json';
import OfferMarketABI from './abis/OfferMarket.json';
import InvoiceRegistryABI from './abis/InvoiceRegistry.json';
import DeployedAddresses from './deployed-addresses.json';

export const CONTRACT_ABIS = {
  Escrow: EscrowABI.abi,
  OfferMarket: OfferMarketABI.abi,
  InvoiceRegistry: InvoiceRegistryABI.abi,
};

export const CONTRACT_ADDRESSES = DeployedAddresses;
