const { expect } = require("chai");
const hre = require("hardhat");
const { Encryptable } = require("@cofhe/sdk");

describe("OfferMarket Contract Integration", function () {
  let registry;
  let market;
  let merchant;
  let lenderA;
  let lenderB;
  
  let merchantClient;
  let lenderAClient;
  let lenderBClient;

  before(async function () {
    const signers = await hre.ethers.getSigners();
    merchant = signers[0];
    lenderA = signers[1];
    lenderB = signers[2];

    // 1. Deploy InvoiceRegistry
    const Registry = await hre.ethers.getContractFactory("InvoiceRegistry");
    registry = await Registry.deploy();
    await registry.waitForDeployment();

    // 2. Deploy OfferMarket
    const Market = await hre.ethers.getContractFactory("OfferMarket");
    market = await Market.deploy(await registry.getAddress());
    await market.waitForDeployment();

    // 3. Link registry with market authorized address
    const setMarketTx = await registry.setOfferMarket(await market.getAddress());
    await setMarketTx.wait();

    // 4. Create clients for each actor
    merchantClient = await hre.cofhe.createClientWithBatteries(merchant);
    lenderAClient = await hre.cofhe.createClientWithBatteries(lenderA);
    lenderBClient = await hre.cofhe.createClientWithBatteries(lenderB);
  });

  it("should support end-to-end invoice registration, offer bidding, homomorphic comparison, and acceptance", async function () {
    // --- Step 2: Merchant creates and lists an invoice ---
    const invoiceAmount = 500000n;
    const buyerAddress = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"; // Lender A address
    const dueDate = 1783021196n;

    // Merchant encrypts parameters
    const encryptedInv = await merchantClient.encryptInputs([
      Encryptable.uint64(invoiceAmount),
      Encryptable.address(buyerAddress),
      Encryptable.uint32(dueDate)
    ]).execute();

    const encryptedAmountStruct = {
      ctHash: encryptedInv[0].ctHash,
      securityZone: encryptedInv[0].securityZone,
      utype: encryptedInv[0].utype,
      signature: encryptedInv[0].signature
    };
    const encryptedBuyerStruct = {
      ctHash: encryptedInv[1].ctHash,
      securityZone: encryptedInv[1].securityZone,
      utype: encryptedInv[1].utype,
      signature: encryptedInv[1].signature
    };
    const encryptedDueDateStruct = {
      ctHash: encryptedInv[2].ctHash,
      securityZone: encryptedInv[2].securityZone,
      utype: encryptedInv[2].utype,
      signature: encryptedInv[2].signature
    };

    // Create and list the invoice
    const createTx = await registry.connect(merchant).createInvoice(
      encryptedAmountStruct,
      encryptedBuyerStruct,
      encryptedDueDateStruct
    );
    await createTx.wait();

    const listTx = await registry.connect(merchant).listOnMarketplace(1);
    await listTx.wait();

    const metadataAfterList = await registry.getInvoiceMetadata(1);
    expect(metadataAfterList.status).to.equal(1); // 1 = Listed

    // --- Step 3: Lender A submits offer with rate 5.5% (550 bp) ---
    const rateA = 550n;
    const offerAmountA = 470000n;

    const encryptedA = await lenderAClient.encryptInputs([
      Encryptable.uint64(rateA),
      Encryptable.uint64(offerAmountA)
    ]).execute();

    const structRateA = {
      ctHash: encryptedA[0].ctHash,
      securityZone: encryptedA[0].securityZone,
      utype: encryptedA[0].utype,
      signature: encryptedA[0].signature
    };
    const structAmountA = {
      ctHash: encryptedA[1].ctHash,
      securityZone: encryptedA[1].securityZone,
      utype: encryptedA[1].utype,
      signature: encryptedA[1].signature
    };

    const submitATx = await market.connect(lenderA).submitOffer(1, structRateA, structAmountA);
    await submitATx.wait();

    // --- Step 4: Lender B submits offer with rate 4.8% (480 bp) ---
    const rateB = 480n;
    const offerAmountB = 475000n;

    const encryptedB = await lenderBClient.encryptInputs([
      Encryptable.uint64(rateB),
      Encryptable.uint64(offerAmountB)
    ]).execute();

    const structRateB = {
      ctHash: encryptedB[0].ctHash,
      securityZone: encryptedB[0].securityZone,
      utype: encryptedB[0].utype,
      signature: encryptedB[0].signature
    };
    const structAmountB = {
      ctHash: encryptedB[1].ctHash,
      securityZone: encryptedB[1].securityZone,
      utype: encryptedB[1].utype,
      signature: encryptedB[1].signature
    };

    const submitBTx = await market.connect(lenderB).submitOffer(1, structRateB, structAmountB);
    await submitBTx.wait();

    // --- Step 5: Call compareOffers and assert Lender B's offer wins ---
    // compareOffers updates permissions so msg.sender (merchant) can decrypt result
    const compareTx = await market.connect(merchant).compareOffers(1);
    const compareReceipt = await compareTx.wait();

    // The transaction returns the bestOfferId FHE handle.
    // Fetch the best offer FHE handle from the view function:
    const winningOfferIdHandle = await market.getBestOffer(1);
    
    // Decrypt the winning offer ID handle using the merchant client (utype 5 is EUINT64_TFHE)
    const decryptedWinnerId = await merchantClient.decryptForView(winningOfferIdHandle, 5).execute();
    expect(decryptedWinnerId).to.equal(2n); // Lender B's offerId is 2

    // --- Step 6: Merchant accepts Lender B's offer ---
    const acceptTx = await market.connect(merchant).acceptOffer(1, 2);
    await acceptTx.wait();

    // Assert invoice status is now Funded (2 = Funded)
    const finalInvoiceMetadata = await registry.getInvoiceMetadata(1);
    expect(finalInvoiceMetadata.status).to.equal(2); // 2 = Funded

    // Assert Lender A's offer is marked Rejected (2 = Rejected)
    const statusA = await market.getOfferStatus(1);
    expect(statusA).to.equal(2); // 2 = Rejected

    // Assert Lender B's offer is marked Accepted (1 = Accepted)
    const statusB = await market.getOfferStatus(2);
    expect(statusB).to.equal(1); // 1 = Accepted
  });
});
