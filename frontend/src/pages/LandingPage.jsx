import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion'
import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

const stats = [
  { value: '₹90,000 Cr', label: 'Lost annually to post-harvest waste' },
  { value: '86%',         label: 'Farmers are small & marginal' },
  { value: '20–30%',      label: 'Price share reaching the farmer' },
  { value: '3×',          label: 'Premium on APEDA-certified exports' },
]

const features = [
  {
    icon: '◈',
    title: 'AI Price Intelligence',
    desc: 'XGBoost model trained on 36 years of AGMARKNET data predicts prices across 5 Maharashtra cities — 7 days in advance.',
    tag: 'R² 0.898'
  },
  {
    icon: '◉',
    title: 'Demand Forecasting',
    desc: 'Know if the market will be oversupplied before you harvest. Protect your income with data-backed selling decisions.',
    tag: '76% accuracy'
  },
  {
    icon: '◎',
    title: 'Export Premium Advisor',
    desc: 'Discover how much more you earn via APEDA export vs domestic sale. Real premium data from 1987–2023.',
    tag: 'Unique feature'
  },
  {
    icon: '◫',
    title: 'Blockchain Traceability',
    desc: 'SHA-256 hash chain records every step farm to buyer. QR code per lot. APEDA-compliant audit trail.',
    tag: 'Tamper-proof'
  },
]

const crops = ['Onion', 'Potato', 'Tomato', 'Wheat', 'Grapes', 'Mango']

export default function LandingPage() {
  const navigate    = useNavigate()
  const heroRef     = useRef(null)
  const [hoveredFeature, setHoveredFeature] = useState(null)

  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start']
  })
  const heroY     = useTransform(scrollYProgress, [0,1], ['0%', '30%'])
  const heroOpacity = useTransform(scrollYProgress, [0,0.8], [1, 0])

  return (
    <div style={{ background: 'var(--cream)', overflow: 'hidden' }}>

      {/* ── Navigation ── */}
      <motion.nav
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        style={{
          position: 'fixed', top: 0, left: 0, right: 0,
          zIndex: 100,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 48px',
          background: 'rgba(248,249,240,0.85)',
          backdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(82,183,136,0.15)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <motion.div
            animate={{ rotate: [0,5,-5,0] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            style={{
              width: 36, height: 36,
              background: 'var(--forest)',
              borderRadius: 10,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--mint)', fontSize: 18, fontWeight: 700
            }}
          >A</motion.div>
          <span style={{
            fontFamily: 'var(--font-display)', fontSize: 22,
            fontWeight: 700, color: 'var(--forest)', letterSpacing: '-0.5px'
          }}>AgriLink</span>
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <NavBtn onClick={() => navigate('/login')}  outline>Sign in</NavBtn>
          <NavBtn onClick={() => navigate('/register')} filled>Get started</NavBtn>
        </div>
      </motion.nav>

      {/* ── Hero ── */}
      <section ref={heroRef} style={{ minHeight: '100vh', position: 'relative', display: 'flex', alignItems: 'center' }}>

        {/* Background geometric pattern */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: `
            radial-gradient(circle at 20% 50%, rgba(82,183,136,0.08) 0%, transparent 60%),
            radial-gradient(circle at 80% 20%, rgba(27,67,50,0.06) 0%, transparent 50%)
          `,
          zIndex: 0
        }} />

        {/* Animated leaf shapes */}
        {[...Array(6)].map((_, i) => (
          <motion.div key={i}
            animate={{
              y: [0, -20, 0],
              rotate: [0, 10, -10, 0],
              opacity: [0.15, 0.25, 0.15],
            }}
            transition={{
              duration: 4 + i,
              delay: i * 0.7,
              repeat: Infinity,
              ease: 'easeInOut'
            }}
            style={{
              position: 'absolute',
              width: 60 + i * 20,
              height: 60 + i * 20,
              borderRadius: '60% 40% 70% 30% / 50% 60% 40% 70%',
              background: `rgba(82,183,136,${0.06 + i * 0.01})`,
              border: '1px solid rgba(82,183,136,0.12)',
              left: `${[10, 75, 85, 5, 60, 40][i]}%`,
              top: `${[15, 10, 60, 70, 80, 35][i]}%`,
              zIndex: 0
            }}
          />
        ))}

        <motion.div style={{ y: heroY, opacity: heroOpacity, width: '100%', position: 'relative', zIndex: 1 }}>
          <div style={{ maxWidth: 1200, margin: '0 auto', padding: '120px 48px 80px' }}>

            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                background: 'rgba(27,67,50,0.06)',
                border: '1px solid rgba(27,67,50,0.12)',
                borderRadius: 100, padding: '6px 16px',
                marginBottom: 32
              }}
            >
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--leaf)', display: 'inline-block' }} />
              <span style={{ fontSize: 13, color: 'var(--forest-mid)', fontWeight: 500, letterSpacing: '0.04em' }}>
                Pune Agri Hackathon 2026 · Theme 4
              </span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45, duration: 0.8, ease: [0.22,1,0.36,1] }}
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(48px, 7vw, 88px)',
                fontWeight: 700,
                lineHeight: 1.05,
                letterSpacing: '-2px',
                color: 'var(--forest)',
                maxWidth: 900,
                marginBottom: 28,
              }}
            >
              Bridging India's{' '}
              <span style={{
                position: 'relative', display: 'inline-block',
                color: 'var(--forest-light)'
              }}>
                fields
                <motion.svg
                  viewBox="0 0 200 12" fill="none"
                  style={{ position: 'absolute', bottom: -4, left: 0, width: '100%' }}
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ delay: 1.2, duration: 0.8 }}
                >
                  <motion.path
                    d="M2 6 Q100 2 198 6"
                    stroke="var(--leaf)" strokeWidth="3"
                    strokeLinecap="round" fill="none"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ delay: 1.2, duration: 0.8 }}
                  />
                </motion.svg>
              </span>
              {' '}to the world
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.65, duration: 0.7 }}
              style={{
                fontSize: 19, color: 'var(--text-mid)', lineHeight: 1.7,
                maxWidth: 560, marginBottom: 44, fontWeight: 300
              }}
            >
              AI-powered price prediction, demand forecasting, export premium advisory
              and blockchain traceability — built for Maharashtra's 146 million farmers.
            </motion.p>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.6 }}
              style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}
            >
              <HeroBtn primary onClick={() => navigate('/register')}>
                Start for free →
              </HeroBtn>
              <HeroBtn onClick={() => navigate('/login')}>
                Sign in
              </HeroBtn>
            </motion.div>

            {/* Crop tags */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.1, duration: 0.8 }}
              style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 48 }}
            >
              <span style={{ fontSize: 12, color: 'var(--text-muted)', alignSelf: 'center', marginRight: 4 }}>
                Covering:
              </span>
              {crops.map((c, i) => (
                <motion.span key={c}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 1.2 + i * 0.08 }}
                  style={{
                    fontSize: 12, fontWeight: 500,
                    color: 'var(--forest-mid)',
                    background: 'rgba(82,183,136,0.1)',
                    border: '1px solid rgba(82,183,136,0.2)',
                    borderRadius: 100, padding: '4px 12px'
                  }}
                >{c}</motion.span>
              ))}
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* ── Stats bar ── */}
      <section style={{
        background: 'var(--forest)',
        padding: '48px 0',
        position: 'relative', overflow: 'hidden'
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(82,183,136,0.1) 0%, transparent 70%)'
        }} />
        <div style={{
          maxWidth: 1200, margin: '0 auto', padding: '0 48px',
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 32,
          position: 'relative'
        }}>
          {stats.map((s, i) => (
            <motion.div key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.6 }}
              style={{ textAlign: 'center' }}
            >
              <div style={{
                fontFamily: 'var(--font-display)',
                fontSize: 40, fontWeight: 700,
                color: 'var(--mint)', marginBottom: 8,
                letterSpacing: '-1px'
              }}>{s.value}</div>
              <div style={{ fontSize: 13, color: 'rgba(149,213,178,0.7)', lineHeight: 1.4 }}>{s.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section style={{ maxWidth: 1200, margin: '0 auto', padding: '100px 48px' }}>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          style={{ marginBottom: 64 }}
        >
          <p style={{ fontSize: 13, letterSpacing: '0.1em', color: 'var(--leaf)', fontWeight: 600, marginBottom: 12, textTransform: 'uppercase' }}>
            AI-Powered Features
          </p>
          <h2 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(36px, 4vw, 56px)',
            fontWeight: 700, letterSpacing: '-1px',
            color: 'var(--forest)', lineHeight: 1.1
          }}>
            Four superpowers.<br />Zero middlemen.
          </h2>
        </motion.div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 24 }}>
          {features.map((f, i) => (
            <motion.div key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.12, duration: 0.6 }}
              onHoverStart={() => setHoveredFeature(i)}
              onHoverEnd={() => setHoveredFeature(null)}
              style={{
                background: hoveredFeature === i ? 'var(--forest)' : 'var(--white)',
                border: `1px solid ${hoveredFeature === i ? 'var(--forest)' : 'rgba(27,67,50,0.1)'}`,
                borderRadius: 'var(--radius-lg)',
                padding: '36px',
                cursor: 'default',
                transition: 'all 0.35s cubic-bezier(0.22,1,0.36,1)',
                boxShadow: hoveredFeature === i ? 'var(--shadow-lg)' : 'var(--shadow-sm)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                <span style={{
                  fontSize: 28,
                  color: hoveredFeature === i ? 'var(--mint)' : 'var(--leaf)',
                  transition: 'color 0.35s'
                }}>{f.icon}</span>
                <span style={{
                  fontSize: 11, fontWeight: 600, letterSpacing: '0.06em',
                  padding: '4px 10px', borderRadius: 100,
                  background: hoveredFeature === i ? 'rgba(82,183,136,0.15)' : 'rgba(27,67,50,0.06)',
                  color: hoveredFeature === i ? 'var(--mint)' : 'var(--forest-mid)',
                  transition: 'all 0.35s'
                }}>{f.tag}</span>
              </div>
              <h3 style={{
                fontFamily: 'var(--font-display)',
                fontSize: 24, fontWeight: 600,
                color: hoveredFeature === i ? 'var(--white)' : 'var(--forest)',
                marginBottom: 12, letterSpacing: '-0.3px',
                transition: 'color 0.35s'
              }}>{f.title}</h3>
              <p style={{
                fontSize: 15, lineHeight: 1.7,
                color: hoveredFeature === i ? 'rgba(149,213,178,0.85)' : 'var(--text-muted)',
                transition: 'color 0.35s'
              }}>{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── CTA Section ── */}
      <section style={{
        background: 'var(--forest)',
        margin: '0 48px 100px',
        borderRadius: 'var(--radius-xl)',
        padding: '80px 64px',
        position: 'relative', overflow: 'hidden',
        maxWidth: 1104, marginLeft: 'auto', marginRight: 'auto'
      }}>
        <div style={{
          position: 'absolute', top: -60, right: -60,
          width: 300, height: 300,
          borderRadius: '50%',
          background: 'rgba(82,183,136,0.08)',
          border: '1px solid rgba(82,183,136,0.15)'
        }} />
        <div style={{
          position: 'absolute', bottom: -40, left: -40,
          width: 200, height: 200,
          borderRadius: '50%',
          background: 'rgba(82,183,136,0.06)'
        }} />

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          style={{ position: 'relative', textAlign: 'center' }}
        >
          <p style={{ fontSize: 13, color: 'var(--mint)', letterSpacing: '0.1em', fontWeight: 600, marginBottom: 20, textTransform: 'uppercase' }}>
            For farmers and buyers
          </p>
          <h2 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(36px,5vw,60px)',
            fontWeight: 700, letterSpacing: '-1.5px',
            color: 'var(--white)', lineHeight: 1.1, marginBottom: 20
          }}>
            Every farmer deserves<br />a fair price.
          </h2>
          <p style={{
            fontSize: 18, color: 'rgba(149,213,178,0.8)',
            maxWidth: 500, margin: '0 auto 40px', lineHeight: 1.7
          }}>
            Join AgriLink — connect directly to buyers, eliminate middlemen, and access
            AI-powered market intelligence built for Maharashtra's agricultural ecosystem.
          </p>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate('/register')}
              style={{
                background: 'var(--mint)', color: 'var(--forest)',
                border: 'none', borderRadius: 100,
                padding: '14px 32px', fontSize: 15, fontWeight: 600,
                cursor: 'pointer', fontFamily: 'var(--font-body)'
              }}
            >Register as farmer</motion.button>
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate('/register')}
              style={{
                background: 'transparent',
                color: 'var(--mint)',
                border: '1.5px solid rgba(82,183,136,0.4)',
                borderRadius: 100,
                padding: '14px 32px', fontSize: 15, fontWeight: 600,
                cursor: 'pointer', fontFamily: 'var(--font-body)'
              }}
            >Register as buyer</motion.button>
          </div>
        </motion.div>
      </section>

      {/* ── Footer ── */}
      <footer style={{
        borderTop: '1px solid rgba(27,67,50,0.1)',
        padding: '32px 48px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        maxWidth: 1200, margin: '0 auto'
      }}>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--forest)', fontSize: 18 }}>AgriLink</span>
        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
          Pune Agri Hackathon 2026 · Team AeroNexis · 
        </span>
      </footer>
    </div>
  )
}

function NavBtn({ children, onClick, filled }) {
  const [hovered, setHovered] = useState(false)
  return (
    <motion.button
      whileTap={{ scale: 0.96 }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      onClick={onClick}
      style={{
        padding: '9px 22px', borderRadius: 100, fontSize: 14, fontWeight: 500,
        cursor: 'pointer', fontFamily: 'var(--font-body)',
        border: filled ? 'none' : '1.5px solid rgba(27,67,50,0.2)',
        background: filled
          ? (hovered ? 'var(--forest-mid)' : 'var(--forest)')
          : (hovered ? 'rgba(27,67,50,0.05)' : 'transparent'),
        color: filled ? 'var(--white)' : 'var(--forest)',
        transition: 'all 0.2s'
      }}
    >{children}</motion.button>
  )
}

function HeroBtn({ children, onClick, primary }) {
  const [hovered, setHovered] = useState(false)
  return (
    <motion.button
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      onClick={onClick}
      style={{
        padding: '14px 32px', borderRadius: 100,
        fontSize: 15, fontWeight: 600,
        cursor: 'pointer', fontFamily: 'var(--font-body)',
        border: primary ? 'none' : '1.5px solid rgba(27,67,50,0.2)',
        background: primary
          ? (hovered ? 'var(--forest-mid)' : 'var(--forest)')
          : (hovered ? 'rgba(27,67,50,0.05)' : 'transparent'),
        color: primary ? 'var(--white)' : 'var(--forest)',
        transition: 'background 0.2s',
        boxShadow: primary ? 'var(--shadow-md)' : 'none'
      }}
    >{children}</motion.button>
  )
}
