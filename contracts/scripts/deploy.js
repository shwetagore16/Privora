const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("Starting Privora deployment...");

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(balance), "ETH");

  // 1. Deploy InvoiceRegistry
  console.log("\nDeploying InvoiceRegistry...");
  const Registry = await hre.ethers.getContractFactory("InvoiceRegistry");
  const registry = await Registry.deploy();
  await registry.waitForDeployment();
  const registryAddress = await registry.getAddress();
  console.log("InvoiceRegistry deployed to:", registryAddress);

  // 2. Deploy OfferMarket
  console.log("\nDeploying OfferMarket...");
  const Market = await hre.ethers.getContractFactory("OfferMarket");
  const market = await Market.deploy(registryAddress);
  await market.waitForDeployment();
  const marketAddress = await market.getAddress();
  console.log("OfferMarket deployed to:", marketAddress);

  // 3. Deploy Escrow
  console.log("\nDeploying Escrow...");
  const Escrow = await hre.ethers.getContractFactory("Escrow");
  const escrow = await Escrow.deploy(registryAddress, marketAddress);
  await escrow.waitForDeployment();
  const escrowAddress = await escrow.getAddress();
  console.log("Escrow deployed to:", escrowAddress);

  // 4. Wire contracts together in InvoiceRegistry
  console.log("\nLinking contracts in InvoiceRegistry...");
  
  console.log("Setting OfferMarket address in InvoiceRegistry...");
  const setMarketTx = await registry.setOfferMarket(marketAddress);
  await setMarketTx.wait();
  console.log("OfferMarket set.");

  console.log("Setting Escrow address in InvoiceRegistry...");
  const setEscrowTx = await registry.setEscrow(escrowAddress);
  await setEscrowTx.wait();
  console.log("Escrow set.");

  // Print Clean Summary Block
  console.log("\n==========================================");
  console.log("Deployment Summary:");
  console.log(`InvoiceRegistry: ${registryAddress}`);
  console.log(`OfferMarket: ${marketAddress}`);
  console.log(`Escrow: ${escrowAddress}`);
  console.log("==========================================");

  // Write addresses to file
  const deployedInfo = {
    InvoiceRegistry: registryAddress,
    OfferMarket: marketAddress,
    Escrow: escrowAddress
  };

  const outputFilePath = path.join(__dirname, "../deployed-addresses.json");
  fs.writeFileSync(outputFilePath, JSON.stringify(deployedInfo, null, 2));
  console.log(`\nDeployed addresses saved to: ${outputFilePath}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
