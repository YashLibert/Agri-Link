import mongoose from 'mongoose';

const traceChainSchema = new mongoose.Schema({
  lotId: {
    type    : String,
    required: true,
    index   : true
  },
  blockIndex: {
    type    : Number,
    required: true
  },
  eventType: {
    type    : String,
    enum    : ['LISTED', 'GRADED', 'ORDER_PLACED', 'DISPATCHED', 'RECEIVED'],
    required: true
  },
  eventData: {
    type    : mongoose.Schema.Types.Mixed,
    default : {},
    required: true
  },
  previousHash: { type: String, required: true },
  currentHash : { type: String, required: true },
  timestamp   : { type: Date,   default: Date.now }
});

traceChainSchema.index({ lotId: 1, blockIndex: 1 });

export default mongoose.model('TraceChain', traceChainSchema);
