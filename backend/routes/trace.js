import express from 'express'
import { getChain, repairChain, verifyChain } from '../utils/hashChain.js'
import authenticate from '../middleware/authenticate.js'
import Listing from '../models/Listing.js'
import Order from '../models/Order.js'

const router = express.Router()

// GET /api/trace/:lotId — public, no auth needed
router.get('/:lotId', async (req, res) => {
  try {
    const { lotId } = req.params
    let chain = await getChain(lotId)

    if (chain.length === 0) {
      return res.status(404).json({ error: 'Lot not found' })
    }

    const verification = await verifyChain(lotId)

    res.json({
      lotId,
      integrity   : verification.valid ? 'VERIFIED' : 'TAMPERED',
      total_events: chain.length,
      verification,
      events      : chain.map(block => ({
        step     : block.blockIndex,
        event    : block.eventType,
        data     : block.eventData,
        hash     : block.currentHash.substring(0, 16) + '...',
        timestamp: block.timestamp
      }))
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/trace/:lotId/verify
router.get('/:lotId/verify', async (req, res) => {
  try {
    const result = await verifyChain(req.params.lotId)
    res.json(result)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.post('/:lotId/repair', authenticate, async (req, res) => {
  try {
    const { lotId } = req.params
    const listing = await Listing.findOne({ lotId })

    if (!listing) {
      return res.status(404).json({ error: 'Lot not found' })
    }

    const isFarmerOwner =
      listing.farmerId.toString() === req.user._id.toString()

    const linkedOrder = await Order.findOne({
      listingId: listing._id,
      $or: [
        { buyerId: req.user._id },
        { farmerId: req.user._id }
      ]
    })

    if (!isFarmerOwner && !linkedOrder) {
      return res.status(403).json({ error: 'Access denied for repair' })
    }

    const result = await repairChain(lotId)
    res.json(result)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
