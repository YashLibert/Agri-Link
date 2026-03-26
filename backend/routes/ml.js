import express  from 'express'
import multer   from 'multer'
import axios    from 'axios'
import authenticate from '../middleware/authenticate.js'
import {
  predictPrice,
  gradeImage,
  checkCompliance,
  checkMLHealth,
  getExportReadiness,
} from '../utils/mlProxy.js'

const router   = express.Router()
const ML_URL   = process.env.ML_SERVICE_URL || 'http://localhost:8000'

const mlClient = axios.create({
  baseURL: ML_URL,
  timeout: 15000,
})

const upload = multer({
  storage: multer.memoryStorage(),
  limits : { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files allowed'))
    }
    cb(null, true)
  }
})

// GET /api/ml/health
router.get('/health', async (req, res) => {
  try {
    const result = await checkMLHealth()
    res.json(result)
  } catch {
    res.json({ online: false })
  }
})

// GET /api/ml/predict-price?crop=Onion&days_ahead=7
router.get('/predict-price', async (req, res) => {
  try {
    const { crop, days_ahead = 0 } = req.query
    if (!crop) return res.status(400).json({ error: 'crop is required' })

    const result = await predictPrice(crop, parseInt(days_ahead))
    res.json(result)
  } catch (err) {
    res.status(err.response?.status || 500).json({
      error : 'Price prediction failed',
      detail: err.message
    })
  }
})

// GET /api/ml/demand-forecast?crop=Onion&days_ahead=7
router.get('/demand-forecast', async (req, res) => {
  try {
    const { crop, days_ahead = 7 } = req.query
    if (!crop) return res.status(400).json({ error: 'crop is required' })

    const { data } = await mlClient.get('/demand-forecast', {
      params: { crop, days_ahead: parseInt(days_ahead) }
    })
    res.json(data)
  } catch (err) {
    res.status(err.response?.status || 500).json({
      error : 'Demand forecast failed',
      detail: err.message
    })
  }
})

// GET /api/ml/export-premium
router.get('/export-premium', authenticate, async (req, res) => {
  try {
    const {
      crop,
      domestic_price,
      qty_qt      = 100,
      grade       = 'Grade A',
      year        = 2026,
      destination = 'UAE'
    } = req.query

    if (!crop || !domestic_price) {
      return res.status(400).json({
        error: 'crop and domestic_price are required'
      })
    }

    const { data } = await mlClient.get('/export-premium', {
      params: {
        crop,
        domestic_price: parseFloat(domestic_price),
        qty_qt        : parseInt(qty_qt),
        grade,
        year          : parseInt(year),
        destination
      }
    })
    res.json(data)
  } catch (err) {
    res.status(err.response?.status || 500).json({
      error : 'Export premium prediction failed',
      detail: err.message
    })
  }
})

// GET /api/ml/compliance-check
router.get('/compliance-check', authenticate, async (req, res) => {
  try {
    const { crop, grade = 'Grade A', destination = 'domestic' } = req.query
    if (!crop) return res.status(400).json({ error: 'crop is required' })

    const result = await checkCompliance(crop, grade, destination)
    res.json(result)
  } catch (err) {
    res.status(err.response?.status || 500).json({
      error : 'Compliance check failed',
      detail: err.message
    })
  }
})

// POST /api/ml/grade
router.post('/grade', authenticate, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Image file required' })

    const result = await gradeImage(req.file.buffer, req.file.mimetype)
    res.json(result)
  } catch (err) {
    res.status(500).json({
      error : 'Grading failed',
      detail: err.message
    })
  }
})

// POST /api/ml/export-readiness
router.post('/export-readiness', async (req, res) => {
  try {
    const {
      crop,
      country,
      origin_district,
      quantity_quintals,
      pesticides_used       = null,
      days_since_last_spray = 14,
      demanded_price_per_quintal = null,
    } = req.body

    if (!crop || !country || !origin_district || !quantity_quintals) {
      return res.status(400).json({
        error: 'crop, country, origin_district and quantity_quintals are required'
      })
    }

    const result = await getExportReadiness({
      crop,
      country,
      origin_district,
      quantity_quintals    : parseInt(quantity_quintals),
      pesticides_used,
      days_since_last_spray: parseInt(days_since_last_spray),
      demanded_price_per_quintal: demanded_price_per_quintal ? parseFloat(demanded_price_per_quintal) : null,
    })
    res.json(result)
  } catch (err) {
    res.status(err.response?.status || 500).json({
      error : 'Export readiness check failed',
      detail: err.message
    })
  }
})

export default router