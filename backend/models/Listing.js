import mongoose from 'mongoose';
import { User } from '../models/User.js';

const listingSchema = new mongoose.Schema({
  farmerId  : { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  farmerName: String,
  crop      : { type: String, required: true },
  variety   : String,
  grade     : { type: String, enum: ['Grade A', 'Grade B', 'Grade C'], required: true },
  quantity  : { type: Number, required: true },
  askingPrice: { type: Number, required: true },
  location  : { type: String, required: true },
  city      : String,
  photoUrl  : String,
  apedaCertified: { type: Boolean, default: false },
  status    : {
    type   : String,
    enum   : ['available', 'sold', 'expired'],
    default: 'available'
  },
  lotId     : String,
  qrCode    : String,
}, { timestamps: true });

export default mongoose.model('Listing', listingSchema);