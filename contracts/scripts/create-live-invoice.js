const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("Loading deployed contract addresses...");
  const addressesPath = path.join(__dirname, "../deployed-addresses.json");
  if (!fs.existsSync(addressesPath)) {
    throw new Error(`deployed-addresses.json not found at ${addressesPath}. Please deploy first.`);
  }
  const addresses = JSON.parse(fs.readFileSync(addressesPath, "utf8"));
  const registryAddress = addresses.InvoiceRegistry;
  console.log("Loaded InvoiceRegistry address:", registryAddress);

  const [deployer] = await hre.ethers.getSigners();
  console.log("Using deployer signer:", deployer.address);

  // Initialize CoFHE client based on network
  let client;
  if (hre.network.name === "sepolia" || hre.network.name === "eth-sepolia") {
    console.log("Configuring CoFHE client for Sepolia network...");
    const { createCofheClient, createCofheConfig } = require("@cofhe/sdk/node");
    const { sepolia } = require("@cofhe/sdk/chains");
    const config = createCofheConfig({
      environment: "node",
      useWorkers: false,
      supportedChains: [sepolia]
    });
    client = createCofheClient(config);
    await hre.cofhe.connectWithHardhatSigner(client, deployer);
    await client.permits.createSelf({
      issuer: deployer.address
    });
  } else {
    console.log("Configuring CoFHE client for Hardhat network...");
    client = await hre.cofhe.createClientWithBatteries(deployer);
  }
  console.log("CoFHE client initialized and permit created.");

  const { Encryptable } = require("@cofhe/sdk");

  // Sample values
  const sampleAmount = 500000n;
  const sampleBuyer = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"; // Sample buyer/lender
  const sampleDueDate = BigInt(Math.floor(Date.now() / 1000) + 60 * 24 * 60 * 60); // 60 days from now

  console.log(`Encrypting parameters: amount=${sampleAmount}, buyer=${sampleBuyer}, dueDate=${sampleDueDate}...`);
  const encrypted = await client.encryptInputs([
    Encryptable.uint64(sampleAmount),
    Encryptable.address(sampleBuyer),
    Encryptable.uint32(Number(sampleDueDate))
  ]).execute();

  const encryptedAmountStruct = {
    ctHash: encrypted[0].ctHash,
    securityZone: encrypted[0].securityZone,
    utype: encrypted[0].utype,
    signature: encrypted[0].signature
  };
  const encryptedBuyerStruct = {
    ctHash: encrypted[1].ctHash,
    securityZone: encrypted[1].securityZone,
    utype: encrypted[1].utype,
    signature: encrypted[1].signature
  };
  const encryptedDueDateStruct = {
    ctHash: encrypted[2].ctHash,
    securityZone: encrypted[2].securityZone,
    utype: encrypted[2].utype,
    signature: encrypted[2].signature
  };

  console.log("Calling createInvoice on Registry...");
  const registry = await hre.ethers.getContractAt("InvoiceRegistry", registryAddress);
  const tx = await registry.createInvoice(
    encryptedAmountStruct,
    encryptedBuyerStruct,
    encryptedDueDateStruct
  );

  console.log("Transaction sent! Hash:", tx.hash);
  console.log(`Sepolia Etherscan Link: https://sepolia.etherscan.io/tx/${tx.hash}`);
  
  console.log("Waiting for confirmation...");
  const receipt = await tx.wait();
  console.log(`Confirmed in block: ${receipt.blockNumber}`);

  // Parse invoiceId from logs
  const iface = new hre.ethers.Interface([
    "event InvoiceCreated(uint256 indexed invoiceId, uint8 status, address indexed merchant)"
  ]);
  let invoiceId;
  for (const log of receipt.logs) {
    try {
      const parsed = iface.parseLog(log);
      if (parsed.name === "InvoiceCreated") {
        invoiceId = parsed.args.invoiceId;
        break;
      }
    } catch (e) {
      // Ignored
    }
  }

  if (!invoiceId) {
    throw new Error("Could not parse InvoiceCreated event from logs");
  }

  console.log(`\nInvoice successfully created! invoiceId: ${invoiceId}`);

  // Call getInvoiceMetadata()
  console.log("Reading invoice metadata from registry...");
  const metadata = await registry.getInvoiceMetadata(invoiceId);
  console.log("Invoice Metadata:");
  console.log(`  ID: ${metadata.id.toString()}`);
  console.log(`  Status: ${metadata.status.toString()} (0 = Created)`);
  console.log(`  Merchant: ${metadata.merchant}`);
  console.log(`  ListedAt: ${metadata.listedAt.toString()}`);

  // Decrypt amount to verify round-trip
  console.log("Fetching encrypted data handles...");
  const encryptedData = await registry.getEncryptedInvoiceData(invoiceId);
  console.log(`  Amount handle: ${encryptedData.amount}`);
  
  console.log("Decrypting amount handle off-chain...");
  // utype 5 is EUINT64_TFHE
  const decryptedAmount = await client.decryptForView(encryptedData.amount, 5).execute();
  console.log(`  Decrypted Amount: ${decryptedAmount.toString()}`);

  if (decryptedAmount === sampleAmount) {
    console.log("SUCCESS: Plaintext successfully decrypted and matches 500000!");
  } else {
    console.log(`WARNING: Decrypted amount ${decryptedAmount} does not match ${sampleAmount}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
