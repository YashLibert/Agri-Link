import express  from 'express';
import mongoose from 'mongoose';
import Order    from '../models/Order.js';
import Listing  from '../models/Listing.js';
import { addTraceEvent } from '../utils/hashChain.js';
import authenticate      from '../middleware/authenticate.js';
import roleCheck         from '../middleware/roleCheck.js';
import { getIO }         from '../config/socket.js';

const router = express.Router();

// POST /api/orders — buyer places an order
router.post('/', authenticate, roleCheck('buyer'), async (req, res) => {
  try {
    const { listingId, quantity, agreedPrice } = req.body;
    const requestedQty = Number(quantity);

    if (!mongoose.Types.ObjectId.isValid(listingId)) {
      return res.status(400).json({ error: 'Invalid listing ID' });
    }

    const listing = await Listing.findById(listingId);

    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    if (listing.status !== 'available') {
      return res.status(400).json({ error: 'Listing no longer available' });
    }

    if (!Number.isFinite(requestedQty) || requestedQty <= 0) {
      return res.status(400).json({ error: 'Quantity must be greater than 0' });
    }

    if (requestedQty > listing.quantity) {
      return res.status(400).json({
        error    : 'Requested quantity exceeds available stock',
        available: listing.quantity
      });
    }

    const agreedUnitPrice = Number.isFinite(Number(agreedPrice))
      ? Number(agreedPrice)
      : listing.askingPrice;

    // Create order
    const order = await Order.create({
      listingId,
      buyerId    : req.user._id,
      farmerId   : listing.farmerId,
      crop       : listing.crop,
      quantity   : requestedQty,
      agreedPrice: agreedUnitPrice,
    });

    // Reduce available stock; only mark sold when the lot is fully bought
    const remainingQty = listing.quantity - requestedQty;
    await Listing.findByIdAndUpdate(listingId, {
      quantity: remainingQty,
      status  : remainingQty === 0 ? 'sold' : 'available'
    });

    // Add ORDER_PLACED event to hash chain
    await addTraceEvent(listing.lotId, 'ORDER_PLACED', {
      buyerId  : req.user._id.toString(),
      buyerName: req.user.name,
      quantity : requestedQty,
      agreedPrice: agreedUnitPrice,
      remainingQuantity: remainingQty,
    });

    const io = getIO();

    // Notify farmer — their produce was ordered
    io.to(`farmer:${listing.farmerId.toString()}`).emit('order_received', {
      orderId  : order._id,
      crop     : listing.crop,
      quantity : requestedQty,
      agreedPrice: agreedUnitPrice,
      buyerName: req.user.name,
      lotId    : listing.lotId,
    });

    // Confirm to buyer
    io.to(`buyer:${req.user._id.toString()}`).emit('order_confirmed', {
      orderId  : order._id,
      listingId,
      status   : 'confirmed',
      remainingQuantity: remainingQty,
    });

    res.status(201).json({
      order,
      lotId  : listing.lotId,
      message: 'Order placed successfully'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/orders/my — get my orders (buyer or farmer)
router.get('/my', authenticate, async (req, res) => {
  try {
    const query = req.user.role === 'buyer'
      ? { buyerId  : req.user._id }
      : { farmerId : req.user._id };

    const orders = await Order
      .find(query)
      .sort({ createdAt: -1 })
      .populate('listingId', 'crop grade location lotId qrCode')
      .populate('buyerId',   'name email phone')
      .populate('farmerId',  'name location');

    res.json({ orders });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/orders/:id — single order detail
router.get('/:id', authenticate, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid order ID' });
    }

    const order = await Order
      .findById(req.params.id)
      .populate('listingId', 'crop grade location lotId qrCode')
      .populate('buyerId',   'name email phone')
      .populate('farmerId',  'name location phone');

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Only buyer or farmer of this order can see it
    const isOwner =
      order.buyerId._id.toString()  === req.user._id.toString() ||
      order.farmerId._id.toString() === req.user._id.toString();

    if (!isOwner) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({ order });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/orders/:id/status — update order status
router.patch('/:id/status', authenticate, async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['in_transit', 'delivered', 'cancelled'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `Status must be one of: ${validStatuses.join(', ')}` });
    }

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const isOwner =
      order.buyerId.toString()  === req.user._id.toString() ||
      order.farmerId.toString() === req.user._id.toString();

    if (!isOwner) {
      return res.status(403).json({ error: 'Access denied' });
    }

    order.status = status;
    await order.save();

    // Map order status to trace event
    const listing = await Listing.findById(order.listingId);
    if (listing?.lotId) {
      const eventMap = {
        in_transit: 'DISPATCHED',
        delivered : 'RECEIVED',
      };
      if (eventMap[status]) {
        await addTraceEvent(listing.lotId, eventMap[status], {
          updatedBy: req.user.name,
          status,
          notes: req.body.notes || '',
        });
      }
    }

    res.json({ order, message: `Order marked as ${status}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
