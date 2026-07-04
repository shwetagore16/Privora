require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const OfferEvent = require('./models/OfferEvent');
const { startIndexer } = require('./indexer');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/privora';
console.log(`[Server] Connecting to MongoDB at ${MONGODB_URI}...`);
mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('[Server] Successfully connected to MongoDB.');
    // Start indexer after successful DB connection
    startIndexer();
  })
  .catch(err => {
    console.error('[Server] MongoDB connection error:', err);
    process.exit(1);
  });

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    timestamp: new Date()
  });
});

// GET /api/invoices/:invoiceId/offers/activity
// Returns all OfferEvent docs for an invoiceId, sorted by createdAt descending
app.get('/api/invoices/:invoiceId/offers/activity', async (req, res) => {
  const { invoiceId } = req.params;
  try {
    const events = await OfferEvent.find({ invoiceId: Number(invoiceId) })
      .sort({ createdAt: -1 });
    res.json(events);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/invoices/:invoiceId/offers/status
// Returns latest status summary derived from OfferEvent collection
app.get('/api/invoices/:invoiceId/offers/status', async (req, res) => {
  const { invoiceId } = req.params;
  try {
    const events = await OfferEvent.find({ invoiceId: Number(invoiceId) });
    
    const submissions = events.filter(e => e.eventType === 'Submitted');
    const hasCompared = events.some(e => e.eventType === 'Compared');
    const acceptedEvent = events.find(e => e.eventType === 'Accepted');
    
    res.json({
      invoiceId: Number(invoiceId),
      offersCount: submissions.length,
      hasCompared,
      isAccepted: !!acceptedEvent,
      winningOfferId: acceptedEvent ? acceptedEvent.offerId : null,
      lenderAddress: acceptedEvent ? acceptedEvent.lenderAddress : null
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/invoices/:invoiceId/compare
// Manually index a comparison event from the frontend (since FHEVM doesn't emit comparison events)
app.post('/api/invoices/:invoiceId/compare', async (req, res) => {
  const { invoiceId } = req.params;
  const { txHash, blockNumber, senderAddress } = req.body;

  if (!txHash || !blockNumber) {
    return res.status(400).json({ error: 'txHash and blockNumber are required' });
  }

  try {
    const event = await OfferEvent.create({
      invoiceId: Number(invoiceId),
      offerId: 0, // 0 represents the comparison itself
      lenderAddress: senderAddress || '0x0000000000000000000000000000000000000000',
      eventType: 'Compared',
      status: 'Compared',
      txHash,
      blockNumber: Number(blockNumber)
    });
    console.log(`[Server] Manually indexed compared event for invoice #${invoiceId}`);
    res.status(201).json(event);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(200).json({ message: 'Comparison event already recorded' });
    }
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`[Server] API listening on port ${PORT}`);
});
