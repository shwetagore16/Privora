const { ethers } = require('ethers');
const OfferEvent = require('./models/OfferEvent');
const OfferMarketAbi = require('./abi/OfferMarket.json');

async function startIndexer() {
  const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
  const contractAddress = process.env.OFFER_MARKET_ADDRESS;
  const contract = new ethers.Contract(contractAddress, OfferMarketAbi, provider);

  console.log(`[Indexer] Starting event indexer for OfferMarket at ${contractAddress}...`);

  try {
    // 1. Sync historical events first
    const currentBlock = await provider.getBlockNumber();
    const fromBlock = Math.max(0, currentBlock - 5000); // Sync last 5,000 blocks (~16 hours of events)
    console.log(`[Indexer] Syncing historical events from block ${fromBlock} to ${currentBlock}...`);

    const submittedFilter = contract.filters.OfferSubmitted();
    const acceptedFilter = contract.filters.OfferAccepted();

    // Query historical OfferSubmitted logs
    const submittedLogs = await contract.queryFilter(submittedFilter, fromBlock, 'latest');
    let subCount = 0;
    for (const log of submittedLogs) {
      if (!log.args) continue;
      const { offerId, invoiceId, lender } = log.args;
      try {
        await OfferEvent.create({
          invoiceId: Number(invoiceId),
          offerId: Number(offerId),
          lenderAddress: lender,
          eventType: 'Submitted',
          status: 'Pending',
          txHash: log.transactionHash,
          blockNumber: log.blockNumber,
          createdAt: new Date()
        });
        subCount++;
      } catch (e) {
        // Ignore duplicate key error (already synced)
      }
    }

    // Query historical OfferAccepted logs
    const acceptedLogs = await contract.queryFilter(acceptedFilter, fromBlock, 'latest');
    let accCount = 0;
    for (const log of acceptedLogs) {
      if (!log.args) continue;
      const { offerId, invoiceId } = log.args;
      try {
        const originalSubmit = await OfferEvent.findOne({ offerId: Number(offerId), eventType: 'Submitted' });
        const lender = originalSubmit ? originalSubmit.lenderAddress : '0x0000000000000000000000000000000000000000';
        
        await OfferEvent.create({
          invoiceId: Number(invoiceId),
          offerId: Number(offerId),
          lenderAddress: lender,
          eventType: 'Accepted',
          status: 'Accepted',
          txHash: log.transactionHash,
          blockNumber: log.blockNumber,
          createdAt: new Date()
        });

        // Create rejections for other offers of this invoice
        const otherOffers = await OfferEvent.find({
          invoiceId: Number(invoiceId),
          offerId: { $ne: Number(offerId) },
          eventType: 'Submitted'
        });

        for (const off of otherOffers) {
          try {
            await OfferEvent.create({
              invoiceId: Number(invoiceId),
              offerId: off.offerId,
              lenderAddress: off.lenderAddress,
              eventType: 'Rejected',
              status: 'Rejected',
              txHash: log.transactionHash,
              blockNumber: log.blockNumber,
              createdAt: new Date()
            });
          } catch (err) {}
        }
        accCount++;
      } catch (e) {
        // Ignore duplicates
      }
    }

    console.log(`[Indexer] Historical sync completed: indexed ${subCount} submissions and ${accCount} acceptances.`);

    // 2. Setup real-time event listeners
    contract.on('OfferSubmitted', async (offerId, invoiceId, lender, event) => {
      try {
        console.log(`[Indexer] OfferSubmitted event: Offer #${offerId} on Invoice #${invoiceId} from ${lender}`);
        await OfferEvent.create({
          invoiceId: Number(invoiceId),
          offerId: Number(offerId),
          lenderAddress: lender,
          eventType: 'Submitted',
          status: 'Pending',
          txHash: event.log.transactionHash,
          blockNumber: event.log.blockNumber
        });
      } catch (err) {
        if (err.code !== 11000) {
          console.error('[Indexer] Error indexing OfferSubmitted:', err);
        }
      }
    });

    contract.on('OfferAccepted', async (offerId, invoiceId, event) => {
      try {
        console.log(`[Indexer] OfferAccepted event: Offer #${offerId} on Invoice #${invoiceId}`);
        const originalSubmit = await OfferEvent.findOne({ offerId: Number(offerId), eventType: 'Submitted' });
        const lender = originalSubmit ? originalSubmit.lenderAddress : '0x0000000000000000000000000000000000000000';

        await OfferEvent.create({
          invoiceId: Number(invoiceId),
          offerId: Number(offerId),
          lenderAddress: lender,
          eventType: 'Accepted',
          status: 'Accepted',
          txHash: event.log.transactionHash,
          blockNumber: event.log.blockNumber
        });

        // Mark other offers as Rejected
        const otherOffers = await OfferEvent.find({
          invoiceId: Number(invoiceId),
          offerId: { $ne: Number(offerId) },
          eventType: 'Submitted'
        });

        for (const off of otherOffers) {
          try {
            await OfferEvent.create({
              invoiceId: Number(invoiceId),
              offerId: off.offerId,
              lenderAddress: off.lenderAddress,
              eventType: 'Rejected',
              status: 'Rejected',
              txHash: event.log.transactionHash,
              blockNumber: event.log.blockNumber
            });
          } catch (err) {}
        }
      } catch (err) {
        if (err.code !== 11000) {
          console.error('[Indexer] Error indexing OfferAccepted:', err);
        }
      }
    });

  } catch (err) {
    console.error('[Indexer] Failed to initialize indexer. Continuous syncing disabled:', err);
  }
}

module.exports = { startIndexer };
