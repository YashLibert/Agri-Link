import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
  listingId  : { type: mongoose.Schema.Types.ObjectId, ref: 'Listing', required: true },
  buyerId    : { type: mongoose.Schema.Types.ObjectId, ref: 'User',    required: true },
  farmerId   : { type: mongoose.Schema.Types.ObjectId, ref: 'User',    required: true },
  crop       : String,
  quantity   : Number,
  agreedPrice: Number,
  status     : {
    type   : String,
    enum   : ['confirmed', 'in_transit', 'delivered', 'cancelled'],
    default: 'confirmed'
  },
  paymentStatus: {
    type   : String,
    enum   : ['pending', 'paid'],
    default: 'pending'
  },
}, { timestamps: true });

export default mongoose.model('Order', orderSchema);