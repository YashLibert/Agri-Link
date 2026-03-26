import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import api from '../api/axios.js'

const EVENT_ICONS = {
  LISTED      : '\u{1F331}',
  GRADED      : '\u2B50',
  ORDER_PLACED: '\u{1F91D}',
  DISPATCHED  : '\u{1F69A}',
  RECEIVED    : '\u2705',
}

export default function TraceViewer() {
  const { lotId } = useParams()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await api.get(`/api/trace/${lotId}`)
        setData(res.data)
      } catch {
        setError('Lot not found or invalid QR code.')
      } finally {
        setLoading(false)
      }
    }

    fetch()
  }, [lotId])

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--cream)' }}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
          style={{ width: 40, height: 40, border: '3px solid var(--mint)', borderTopColor: 'var(--forest)', borderRadius: '50%' }}
        />
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--cream)', flexDirection: 'column', gap: 20 }}>
        <div style={{ fontSize: 48 }}>{'\u274C'}</div>
        <h2 style={{ fontFamily: 'var(--font-display)', color: 'var(--forest)', fontSize: 24 }}>{error}</h2>
        <Link to="/" style={{ color: 'var(--forest-light)', fontWeight: 600, fontSize: 15 }}>{'\u2190'} Return home</Link>
      </div>
    )
  }

  const verified = data?.integrity === 'VERIFIED'

  return (
    <div style={{ minHeight: '100vh', background: 'var(--cream)', padding: '0 0 80px' }}>
      <div style={{ background: 'var(--forest)', padding: '24px 48px', marginBottom: 48 }}>
        <div style={{ maxWidth: 720, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, background: 'var(--mint)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--forest)', fontWeight: 800 }}>A</div>
            <span style={{ fontFamily: 'var(--font-display)', color: 'var(--white)', fontSize: 18, fontWeight: 700 }}>AgriLink</span>
          </Link>
          <span style={{ fontSize: 12, color: 'rgba(149,213,178,0.6)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            Supply Chain Trace
          </span>
        </div>
      </div>

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '0 24px' }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            background: verified ? 'var(--forest)' : '#FCEBEB',
            borderRadius: 'var(--radius-lg)',
            padding: '28px 32px',
            marginBottom: 32,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8, color: verified ? 'var(--mint)' : '#A32D2D' }}>
              Chain integrity
            </div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 700, color: verified ? 'var(--white)' : '#791F1F', letterSpacing: '-0.5px' }}>
              {verified ? '\u2713 Verified' : '\u2717 Tampered'}
            </h1>
            <p style={{ fontSize: 14, marginTop: 8, color: verified ? 'rgba(149,213,178,0.7)' : '#A32D2D' }}>
              {data?.total_events} events recorded {'\u00B7'} Lot {lotId}
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 52, opacity: 0.3 }}>{verified ? '\u{1F512}' : '\u26A0\uFE0F'}</div>
          </div>
        </motion.div>

        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--forest)', marginBottom: 24, fontWeight: 700 }}>
          Complete journey
        </h2>

        <div style={{ position: 'relative' }}>
          <div style={{ position: 'absolute', left: 28, top: 20, bottom: 20, width: 2, background: 'rgba(27,67,50,0.1)', zIndex: 0 }} />

          {data?.events?.map((event, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.12 }}
              style={{ display: 'flex', gap: 24, marginBottom: 24, position: 'relative', zIndex: 1 }}
            >
              <div style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                background: 'var(--white)',
                border: '2px solid rgba(27,67,50,0.12)',
                boxShadow: 'var(--shadow-sm)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 22,
                flexShrink: 0
              }}>
                {EVENT_ICONS[event.event] || '\u25C8'}
              </div>

              <div style={{
                flex: 1,
                background: 'var(--white)',
                borderRadius: 'var(--radius-md)',
                padding: '20px 24px',
                border: '1px solid rgba(27,67,50,0.08)',
                boxShadow: 'var(--shadow-sm)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--forest)' }}>
                    {event.event.replace(/_/g, ' ')}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'right' }}>
                    {new Date(event.timestamp).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                  </div>
                </div>

                {event.data && Object.keys(event.data).length > 0 && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '4px 16px', marginBottom: 12 }}>
                    {Object.entries(event.data)
                      .filter(([k, v]) => v && !['_id', '__v'].includes(k))
                      .map(([k, v]) => (
                        <div key={k} style={{ fontSize: 12 }}>
                          <span style={{ color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                            {k.replace(/([A-Z])/g, ' $1').toLowerCase()}:
                          </span>{' '}
                          <span style={{ color: 'var(--text-dark)', fontWeight: 500 }}>
                            {typeof v === 'number' ? v.toLocaleString('en-IN') : String(v)}
                          </span>
                        </div>
                      ))}
                  </div>
                )}

                <div style={{
                  fontSize: 10,
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--text-muted)',
                  background: 'var(--cream)',
                  padding: '4px 8px',
                  borderRadius: 4,
                  wordBreak: 'break-all'
                }}>
                  Hash: {event.hash}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <div style={{ textAlign: 'center', marginTop: 48, padding: '24px', borderTop: '1px solid rgba(27,67,50,0.1)' }}>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
            Powered by SHA-256 blockchain traceability {'\u00B7'} AgriLink Platform
          </p>
          <Link to="/register" style={{
            display: 'inline-block',
            background: 'var(--forest)',
            color: 'var(--white)',
            borderRadius: 100,
            padding: '10px 24px',
            fontSize: 13,
            fontWeight: 600
          }}>
            Join AgriLink as a buyer {'\u2192'}
          </Link>
        </div>
      </div>
    </div>
  )
}
