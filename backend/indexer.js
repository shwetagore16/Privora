const { ethers } = require('ethers');
const OfferEvent = require('./models/OfferEvent');
const OfferMarketAbi = require('./abi/OfferMarket.json');

async function startIndexer() {
  const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
  const contractAddress = process.env.OFFER_MARKET_ADDRESS;
  const contract = new ethers.Contract(contractAddress, OfferMarketAbi, provider);

  console.log(`[Indexer] Starting event indexer for OfferMarket at ${contractAddress}...`);

  try {
    const currentBlock = await provider.getBlockNumber();
    const fromBlock = Math.max(0, currentBlock - 500); // Scan last 500 blocks for recent updates
    console.log(`[Indexer] Syncing historical events from block ${fromBlock} to ${currentBlock}...`);

    const submittedFilter = contract.filters.OfferSubmitted();
    const acceptedFilter = contract.filters.OfferAccepted();

    // Query historical logs safely
    let submittedLogs = [];
    let acceptedLogs = [];
    try {
      submittedLogs = await contract.queryFilter(submittedFilter, fromBlock, 'latest');
      acceptedLogs = await contract.queryFilter(acceptedFilter, fromBlock, 'latest');
    } catch (queryErr) {
      console.warn(`[Indexer] Initial historical log query failed. Proceeding with block polling. Error:`, queryErr.message);
    }

    // Helper to index OfferSubmitted
    const indexSubmission = async (offerId, invoiceId, lender, log) => {
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
        console.log(`[Indexer] Indexed Offer #${offerId} (Submitted)`);
      } catch (e) {
        if (e.code !== 11000) console.error('[Indexer] Error indexing Submission:', e);
      }
    };

    // Helper to index OfferAccepted
    const indexAcceptance = async (offerId, invoiceId, log) => {
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
              txHash: log.transactionHash,
              blockNumber: log.blockNumber,
              createdAt: new Date()
            });
          } catch (err) {}
        }
        console.log(`[Indexer] Indexed Offer #${offerId} (Accepted, others rejected)`);
      } catch (e) {
        if (e.code !== 11000) console.error('[Indexer] Error indexing Acceptance:', e);
      }
    };

    // Index historical items
    for (const log of submittedLogs) {
      if (log.args) indexSubmission(log.args.offerId, log.args.invoiceId, log.args.lender, log);
    }
    for (const log of acceptedLogs) {
      if (log.args) indexAcceptance(log.args.offerId, log.args.invoiceId, log);
    }

    console.log(`[Indexer] Historical sync completed.`);

    // Polling parameters
    let lastPolledBlock = currentBlock;
    console.log(`[Indexer] Starting log polling loop from block ${lastPolledBlock}...`);

    // Poll for new events every 15 seconds
    setInterval(async () => {
      try {
        const latestBlock = await provider.getBlockNumber();
        const safeLatestBlock = latestBlock - 2; // 2-block safety margin for node sync lag
        if (safeLatestBlock <= lastPolledBlock) return;

        const from = lastPolledBlock + 1;
        const to = safeLatestBlock;

        const newSubmissions = await contract.queryFilter(submittedFilter, from, to);
        for (const log of newSubmissions) {
          if (log.args) await indexSubmission(log.args.offerId, log.args.invoiceId, log.args.lender, log);
        }

        const newAcceptances = await contract.queryFilter(acceptedFilter, from, to);
        for (const log of newAcceptances) {
          if (log.args) await indexAcceptance(log.args.offerId, log.args.invoiceId, log);
        }

        lastPolledBlock = to;
      } catch (pollErr) {
        console.warn(`[Indexer] Event polling cycle failed:`, pollErr.message);
      }
    }, 15000);

  } catch (err) {
    console.error('[Indexer] Failed to initialize indexer:', err);
  }
}

module.exports = { startIndexer };
