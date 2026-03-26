import express    from 'express';
import mongoose   from 'mongoose';
import Listing    from '../models/Listing.js';
import { addTraceEvent } from '../utils/hashChain.js';
import { generateQR }    from '../utils/qrCode.js';
import authenticate      from '../middleware/authenticate.js';
import roleCheck         from '../middleware/roleCheck.js';
import { getIO }         from '../config/socket.js';

const router = express.Router();

// POST /api/listings — farmer creates a listing
router.post('/', authenticate, roleCheck('farmer'), async (req, res) => {
  try {
    const {
      crop, variety, grade, quantity,
      askingPrice, location, city, photoUrl, apedaCertified
    } = req.body;

    // Generate unique lot ID
    const lotId = `LOT-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

    // Create listing in DB
    const listing = await Listing.create({
      farmerId  : req.user._id,
      farmerName: req.user.name,
      crop, variety, grade, quantity,
      askingPrice, location, city,
      photoUrl, apedaCertified,
      lotId
    });

    // Add first block to hash chain
    await addTraceEvent(lotId, 'LISTED', {
      farmerId  : req.user._id.toString(),
      farmerName: req.user.name,
      crop, grade, quantity,
      location, city,
    });

    // Generate QR code
    const { qrDataUrl, traceUrl } = await generateQR(lotId);
    await Listing.findByIdAndUpdate(listing._id, { qrCode: qrDataUrl });

    // Notify buyers watching this crop via Socket.io
    const io = getIO();
    io.to(`crop:${crop.toLowerCase()}`).emit('new_listing', {
      _id           : listing._id,
      listingId     : listing._id,
      lotId,
      crop, grade, quantity,
      askingPrice,
      location, city,
      farmerName    : req.user.name,
      apedaCertified: apedaCertified || false,
      traceUrl,
      createdAt     : listing.createdAt,
    });

    res.status(201).json({
      listing,
      lotId,
      qrCode  : qrDataUrl,
      traceUrl,
      message : 'Listing created and traceability chain started'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/listings — browse listings with filters
router.get('/', authenticate, async (req, res) => {
  try {
    const { crop, grade, city, exportReady, page = 1, limit = 20 } = req.query;

    const query = { status: 'available' };

    if (crop       && crop  !== 'all') query.crop  = crop;
    if (grade      && grade !== 'all') query.grade = grade;
    if (city       && city  !== 'all') query.city  = city;
    if (exportReady === 'true')        query.apedaCertified = true;

    const skip     = (parseInt(page) - 1) * parseInt(limit);
    const total    = await Listing.countDocuments(query);
    const listings = await Listing
      .find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('farmerId', 'name location fpoName');

    res.json({
      listings,
      pagination: {
        total,
        page    : parseInt(page),
        pages   : Math.ceil(total / parseInt(limit)),
        limit   : parseInt(limit)
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/listings/my — farmer sees their own listings
router.get('/my', authenticate, roleCheck('farmer'), async (req, res) => {
  try {
    const listings = await Listing
      .find({ farmerId: req.user._id })
      .sort({ createdAt: -1 });

    res.json({ listings });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/listings/:id — single listing detail
router.get('/:id', authenticate, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid listing ID' });
    }

    const listing = await Listing
      .findById(req.params.id)
      .populate('farmerId', 'name location fpoName phone');

    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    res.json({ listing });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/listings/:id — farmer updates their listing
router.patch('/:id', authenticate, roleCheck('farmer'), async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id);

    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    if (listing.farmerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Not your listing' });
    }

    if (listing.status !== 'available') {
      return res.status(400).json({ error: 'Cannot edit a sold or expired listing' });
    }

    const allowed = ['askingPrice', 'quantity', 'variety', 'photoUrl'];
    allowed.forEach(field => {
      if (req.body[field] !== undefined) listing[field] = req.body[field];
    });

    await listing.save();
    res.json({ listing });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/listings/:id — farmer removes their listing
router.delete('/:id', authenticate, roleCheck('farmer'), async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id);

    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    if (listing.farmerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Not your listing' });
    }

    if (listing.status === 'sold') {
      return res.status(400).json({ error: 'Cannot delete a sold listing' });
    }

    await listing.deleteOne();
    res.json({ message: 'Listing deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
