import crypto from 'crypto'
import TraceChain from '../models/TraceChain.js'

function normalizeValue(value) {
  if (value instanceof Date) return value.toISOString()

  if (Array.isArray(value)) {
    return value.map(normalizeValue)
  }

  if (value && typeof value === 'object') {
    return Object.keys(value)
      .sort()
      .reduce((acc, key) => {
        const normalized = normalizeValue(value[key])
        if (normalized !== undefined) {
          acc[key] = normalized
        }
        return acc
      }, {})
  }

  return value
}

function computeHash(blockIndex, previousHash, eventType, eventData, timestamp) {
  const payload = JSON.stringify({
    blockIndex,
    previousHash,
    eventType,
    eventData: normalizeValue(eventData || {}),
    timestamp
  })

  return crypto.createHash('sha256').update(payload).digest('hex')
}

export async function addTraceEvent(lotId, eventType, eventData) {
  const existing = await TraceChain.find({ lotId }).sort({ blockIndex: 1 })
  const blockIndex = existing.length
  const previousHash = blockIndex === 0
    ? '0000000000000000'
    : existing[existing.length - 1].currentHash

  const timestamp = new Date().toISOString()
  const currentHash = computeHash(
    blockIndex,
    previousHash,
    eventType,
    eventData,
    timestamp
  )

  return TraceChain.create({
    lotId,
    blockIndex,
    eventType,
    eventData: normalizeValue(eventData || {}),
    previousHash,
    currentHash,
    timestamp: new Date(timestamp)
  })
}

export async function getChain(lotId) {
  return TraceChain.find({ lotId }).sort({ blockIndex: 1 })
}

export async function repairChain(lotId) {
  const chain = await TraceChain.find({ lotId }).sort({ blockIndex: 1 })

  if (chain.length === 0) {
    return { repaired: false, total_blocks: 0 }
  }

  let previousHash = '0000000000000000'

  for (let i = 0; i < chain.length; i++) {
    const block = chain[i]
    const timestampISO = new Date(block.timestamp).toISOString()
    const currentHash = computeHash(
      i,
      previousHash,
      block.eventType,
      block.eventData,
      timestampISO
    )

    block.blockIndex = i
    block.previousHash = previousHash
    block.currentHash = currentHash
    previousHash = currentHash

    await block.save()
  }

  return {
    repaired: true,
    total_blocks: chain.length,
    latest_event: chain[chain.length - 1].eventType
  }
}

export async function verifyChain(lotId) {
  const chain = await TraceChain.find({ lotId }).sort({ blockIndex: 1 })

  if (chain.length === 0) return { valid: false, total_blocks: 0 }

  for (let i = 0; i < chain.length; i++) {
    const block = chain[i]
    const timestampISO = new Date(block.timestamp).toISOString()

    const expectedPreviousHash = i === 0
      ? '0000000000000000'
      : chain[i - 1].currentHash

    const recomputed = computeHash(
      i,
      expectedPreviousHash,
      block.eventType,
      block.eventData,
      timestampISO
    )

    if (block.previousHash !== expectedPreviousHash) {
      return {
        valid: false,
        total_blocks: chain.length,
        failed_block: i,
        reason: 'Chain linkage broken'
      }
    }

    if (block.blockIndex !== i || recomputed !== block.currentHash) {
      return {
        valid: false,
        total_blocks: chain.length,
        failed_block: i,
        latest_event: block.eventType,
        stored_hash: block.currentHash,
        recomputed
      }
    }
  }

  return {
    valid: true,
    total_blocks: chain.length,
    latest_event: chain[chain.length - 1].eventType,
    chain_start: chain[0].timestamp,
    chain_end: chain[chain.length - 1].timestamp
  }
}
