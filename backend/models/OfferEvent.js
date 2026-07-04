const mongoose = require('mongoose');

const OfferEventSchema = new mongoose.Schema({
  invoiceId: {
    type: Number,
    required: true,
    index: true
  },
  offerId: {
    type: Number,
    required: true,
    index: true
  },
  lenderAddress: {
    type: String,
    required: true
  },
  eventType: {
    type: String,
    enum: ['Submitted', 'Compared', 'Accepted', 'Rejected'],
    required: true
  },
  status: {
    type: String,
    required: true
  },
  txHash: {
    type: String,
    required: true
  },
  blockNumber: {
    type: Number,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Compound index to prevent duplicate event processing
OfferEventSchema.index({ txHash: 1, eventType: 1, offerId: 1 }, { unique: true });

module.exports = mongoose.model('OfferEvent', OfferEventSchema);
