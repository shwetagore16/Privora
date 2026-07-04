/**
 * Mock helper simulating Fully Homomorphic Encryption (FHE) operations
 * on the Fhenix network. In production, these would be handled by fhenix.js
 * and Solidity FHEVM.
 */

export type CiphertextHandle = string;

// Helper to generate a dummy 256-bit FHE ciphertext
const generateMockCiphertext = (seed: string): CiphertextHandle => {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  const hex = Math.abs(hash).toString(16).padStart(8, '0') + 
              Math.abs(hash * 13).toString(16).padStart(8, '0') +
              Math.abs(hash * 37).toString(16).padStart(8, '0');
  return `0x${hex.padEnd(64, 'f')}`;
};

/**
 * Synchronously encrypts a value to a FHE ciphertext handle.
 * Matches standard Fhenix client-side SDK signatures for direct integration.
 */
export const mockEncrypt = (value: string | number): CiphertextHandle => {
  return generateMockCiphertext(value.toString());
};

export const mockEncryptString = async (value: string): Promise<string> => {
  // Simulate encryption latency
  await new Promise((resolve) => setTimeout(resolve, 600));
  return generateMockCiphertext(value);
};

export const mockDecryptString = async (ciphertext: string, originalValue: string): Promise<string> => {
  // Simulate decryption latency (re-encryption/view key signature validation)
  console.log(`Decrypting ciphertext: ${ciphertext.substring(0, 10)}...`);
  await new Promise((resolve) => setTimeout(resolve, 800));
  return originalValue;
};

export const mockEncryptAmount = async (amount: number): Promise<string> => {
  await new Promise((resolve) => setTimeout(resolve, 600));
  return generateMockCiphertext(amount.toString());
};

export const mockDecryptAmount = async (ciphertext: string, originalAmount: number): Promise<number> => {
  console.log(`Decrypting ciphertext: ${ciphertext.substring(0, 10)}...`);
  await new Promise((resolve) => setTimeout(resolve, 800));
  return originalAmount;
};
