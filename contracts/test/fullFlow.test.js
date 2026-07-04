const { expect } = require("chai");
const hre = require("hardhat");
const { Encryptable } = require("@cofhe/sdk");

describe("Privora Platform Full End-to-End Flow", function () {
  let registry;
  let market;
  let escrow;

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

    // 1. Deploy Contracts
    const Registry = await hre.ethers.getContractFactory("InvoiceRegistry");
    registry = await Registry.deploy();
    await registry.waitForDeployment();

    const Market = await hre.ethers.getContractFactory("OfferMarket");
    market = await Market.deploy(await registry.getAddress());
    await market.waitForDeployment();

    const Escrow = await hre.ethers.getContractFactory("Escrow");
    escrow = await Escrow.deploy(await registry.getAddress(), await market.getAddress());
    await escrow.waitForDeployment();

    // 2. Wire contracts together in Registry
    await registry.setOfferMarket(await market.getAddress());
    await registry.setEscrow(await escrow.getAddress());

    // 3. Setup FHE Clients
    merchantClient = await hre.cofhe.createClientWithBatteries(merchant);
    lenderAClient = await hre.cofhe.createClientWithBatteries(lenderA);
    lenderBClient = await hre.cofhe.createClientWithBatteries(lenderB);
  });

  it("should execute the full Privora invoice lifecycle seamlessly", async function () {
    // --- Phase 1: Merchant registers and lists an invoice ---
    const invoiceAmount = 500000n;
    const buyerAddress = lenderA.address; // Buyer mock address
    const dueDate = 1783021196n;

    const encryptedInv = await merchantClient.encryptInputs([
      Encryptable.uint64(invoiceAmount),
      Encryptable.address(buyerAddress),
      Encryptable.uint32(dueDate)
    ]).execute();

    const structAmount = {
      ctHash: encryptedInv[0].ctHash,
      securityZone: encryptedInv[0].securityZone,
      utype: encryptedInv[0].utype,
      signature: encryptedInv[0].signature
    };
    const structBuyer = {
      ctHash: encryptedInv[1].ctHash,
      securityZone: encryptedInv[1].securityZone,
      utype: encryptedInv[1].utype,
      signature: encryptedInv[1].signature
    };
    const structDueDate = {
      ctHash: encryptedInv[2].ctHash,
      securityZone: encryptedInv[2].securityZone,
      utype: encryptedInv[2].utype,
      signature: encryptedInv[2].signature
    };

    const createTx = await registry.connect(merchant).createInvoice(
      structAmount,
      structBuyer,
      structDueDate
    );
    await createTx.wait();

    const listTx = await registry.connect(merchant).listOnMarketplace(1);
    await listTx.wait();

    let metadata = await registry.getInvoiceMetadata(1);
    expect(metadata.status).to.equal(1); // 1 = Listed

    // --- Phase 2: Lenders submit encrypted bids ---
    // Lender A bid: 5.5% (550 bp), 470,000 principal
    const encryptedA = await lenderAClient.encryptInputs([
      Encryptable.uint64(550n),
      Encryptable.uint64(470000n)
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

    // Lender B bid: 4.8% (480 bp), 475,000 principal (Lender B wins)
    const encryptedB = await lenderBClient.encryptInputs([
      Encryptable.uint64(480n),
      Encryptable.uint64(475000n)
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

    // --- Phase 3: Merchant compares offers homomorphically ---
    const compareTx = await market.connect(merchant).compareOffers(1);
    await compareTx.wait();

    const winningOfferIdHandle = await market.getBestOffer(1);
    
    // Decrypt winning offer ID handle (utype 5 is EUINT64_TFHE)
    const decryptedWinnerId = await merchantClient.decryptForView(winningOfferIdHandle, 5).execute();
    expect(decryptedWinnerId).to.equal(2n); // Lender B (offerId 2) is the winner

    // --- Phase 4: Merchant accepts Lender B's offer ---
    const acceptTx = await market.connect(merchant).acceptOffer(1, 2);
    await acceptTx.wait();

    metadata = await registry.getInvoiceMetadata(1);
    expect(metadata.status).to.equal(2); // 2 = Funded

    // --- Phase 5: Winning Lender locks funding amount in Escrow ---
    const fundingAmount = hre.ethers.parseEther("4.75");
    const lockTx = await escrow.connect(lenderB).lockFunds(1, 2, { value: fundingAmount });
    await lockTx.wait();

    const vaultAfterLock = await escrow.getVault(1);
    expect(vaultAfterLock.amount).to.equal(fundingAmount);
    expect(vaultAfterLock.fundsReleased).to.equal(false);

    // --- Phase 6: Merchant releases funds ---
    const merchantBalanceBefore = await hre.ethers.provider.getBalance(merchant.address);
    
    const releaseTx = await escrow.connect(merchant).releaseFunds(1);
    const releaseReceipt = await releaseTx.wait();
    const releaseGas = releaseReceipt.gasUsed * releaseReceipt.gasPrice;

    const merchantBalanceAfterRelease = await hre.ethers.provider.getBalance(merchant.address);
    expect(merchantBalanceAfterRelease).to.equal(merchantBalanceBefore + fundingAmount - releaseGas);

    metadata = await registry.getInvoiceMetadata(1);
    expect(metadata.status).to.equal(3); // 3 = Financed

    // --- Phase 7: Merchant repays the invoice ---
    const repaymentAmount = hre.ethers.parseEther("5.00");
    const merchantBalanceBeforeRepay = await hre.ethers.provider.getBalance(merchant.address);

    const repayTx = await escrow.connect(merchant).repay(1, { value: repaymentAmount });
    const repayReceipt = await repayTx.wait();
    const repayGas = repayReceipt.gasUsed * repayReceipt.gasPrice;

    const merchantBalanceAfterRepay = await hre.ethers.provider.getBalance(merchant.address);
    expect(merchantBalanceAfterRepay).to.equal(merchantBalanceBeforeRepay - repaymentAmount - repayGas);

    metadata = await registry.getInvoiceMetadata(1);
    expect(metadata.status).to.equal(4); // 4 = Repaid

    // --- Phase 8: Settle invoice (transfer to Lender) ---
    const lenderBalanceBeforeSettle = await hre.ethers.provider.getBalance(lenderB.address);

    const settleTx = await escrow.connect(lenderB).settleInvoice(1);
    const settleReceipt = await settleTx.wait();
    const settleGas = settleReceipt.gasUsed * settleReceipt.gasPrice;

    const lenderBalanceAfterSettle = await hre.ethers.provider.getBalance(lenderB.address);
    expect(lenderBalanceAfterSettle).to.equal(lenderBalanceBeforeSettle + repaymentAmount - settleGas);

    // Verify final Settled status (5 = Settled)
    metadata = await registry.getInvoiceMetadata(1);
    expect(metadata.status).to.equal(5); // 5 = Settled

    const vaultAfterSettle = await escrow.getVault(1);
    expect(vaultAfterSettle.settled).to.equal(true);
  });
});
