const { expect } = require("chai");
const hre = require("hardhat");
const { Encryptable } = require("@cofhe/sdk");

describe("InvoiceRegistry Contract", function () {
  let registry;
  let merchant;
  let client;

  before(async function () {
    const signers = await hre.ethers.getSigners();
    merchant = signers[0];

    // Deploy InvoiceRegistry
    const Registry = await hre.ethers.getContractFactory("InvoiceRegistry");
    registry = await Registry.deploy();
    await registry.waitForDeployment();

    // Create client with batteries for merchant
    client = await hre.cofhe.createClientWithBatteries(merchant);
  });

  it("should create invoice, list on marketplace, get metadata, and decrypt private data correctly", async function () {
    const amountToEncrypt = 500000n;
    const buyerAddress = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"; // Account 1
    const dueDateTimestamp = 1783021196n;

    // Encrypt inputs
    const encrypted = await client.encryptInputs([
      Encryptable.uint64(amountToEncrypt),
      Encryptable.address(buyerAddress),
      Encryptable.uint32(dueDateTimestamp)
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

    // createInvoice
    const tx = await registry.createInvoice(
      encryptedAmountStruct,
      encryptedBuyerStruct,
      encryptedDueDateStruct
    );
    await tx.wait();

    // Assert status and id in metadata
    let metadata = await registry.getInvoiceMetadata(1);
    expect(metadata.id).to.equal(1n);
    expect(metadata.status).to.equal(0); // 0 = Created
    expect(metadata.merchant).to.equal(merchant.address);
    expect(metadata.listedAt).to.equal(0n);

    // listOnMarketplace
    const listTx = await registry.listOnMarketplace(1);
    await listTx.wait();

    // Assert status is now Listed (1 = Listed)
    metadata = await registry.getInvoiceMetadata(1);
    expect(metadata.status).to.equal(1);
    expect(metadata.listedAt).to.be.greaterThan(0n);

    // getEncryptedInvoiceData
    const encryptedData = await registry.getEncryptedInvoiceData(1);
    
    // Decrypt amount using the merchant's client (utype 5 is EUINT64_TFHE)
    const decryptedAmount = await client.decryptForView(encryptedData.amount, 5).execute();
    expect(decryptedAmount).to.equal(amountToEncrypt);
  });
});
