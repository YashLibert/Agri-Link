import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

export default function AuthPage({ mode }) {
  const navigate = useNavigate()
  const { login, register } = useAuth()
  const [isLogin, setIsLogin] = useState(mode === 'login')
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'farmer', location: '', phone: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const update = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const user = isLogin
        ? await login(form.email, form.password)
        : await register(form)
      navigate(user.role === 'farmer' ? '/farmer' : '/buyer')
    } catch (err) {
      setError(
        err.response?.data?.error ||
        err.message ||
        'Something went wrong'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      background: 'var(--cream)'
    }}>
      <div style={{
        background: 'var(--forest)',
        display: 'flex', flexDirection: 'column',
        justifyContent: 'space-between',
        padding: 48, position: 'relative', overflow: 'hidden'
      }}>
        {[...Array(4)].map((_, i) => (
          <motion.div key={i}
            animate={{ scale: [1, 1.05, 1], opacity: [0.08, 0.14, 0.08] }}
            transition={{ duration: 5 + i, repeat: Infinity, delay: i * 1.2 }}
            style={{
              position: 'absolute',
              width: 200 + i * 80, height: 200 + i * 80,
              borderRadius: '60% 40% 70% 30% / 50% 60% 40% 70%',
              border: '1px solid rgba(82,183,136,0.3)',
              top: `${[-10, 30, 60, 80][i]}%`,
              left: `${[-20, 50, -10, 40][i]}%`,
            }}
          />
        ))}

        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, position: 'relative' }}>
          <div style={{
            width: 40, height: 40, background: 'var(--mint)',
            borderRadius: 12, display: 'flex', alignItems: 'center',
            justifyContent: 'center', color: 'var(--forest)',
            fontSize: 20, fontWeight: 800
          }}>A</div>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 24, color: 'var(--white)', fontWeight: 700 }}>
            AgriLink
          </span>
        </Link>

        <div style={{ position: 'relative' }}>
          <p style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(28px,3vw,42px)',
            color: 'var(--white)', fontWeight: 600,
            lineHeight: 1.2, letterSpacing: '-0.5px',
            marginBottom: 20
          }}>
            "The farmer produces the food that feeds the world."
          </p>
          <p style={{ color: 'rgba(149,213,178,0.7)', fontSize: 15, lineHeight: 1.6 }}>
            AgriLink gives that farmer a fair price, a traceable supply chain,
            and direct access to global markets.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', position: 'relative' }}>
          {['AI Price Prediction', 'Demand Forecasting', 'Export Premium', 'Blockchain QR'].map(badge => (
            <span key={badge} style={{
              fontSize: 11, fontWeight: 600,
              color: 'var(--mint)', letterSpacing: '0.05em',
              background: 'rgba(82,183,136,0.12)',
              border: '1px solid rgba(82,183,136,0.2)',
              borderRadius: 100, padding: '5px 12px'
            }}>{badge}</span>
          ))}
        </div>
      </div>

      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '48px 64px'
      }}>
        <div style={{ width: '100%', maxWidth: 420 }}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 style={{
              fontFamily: 'var(--font-display)',
              fontSize: 36, fontWeight: 700,
              color: 'var(--forest)', letterSpacing: '-0.5px',
              marginBottom: 8
            }}>
              {isLogin ? 'Welcome back' : 'Create account'}
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: 15, marginBottom: 36 }}>
              {isLogin
                ? 'Sign in to access your AgriLink dashboard'
                : 'Join thousands of farmers and buyers on AgriLink'}
            </p>

            <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {!isLogin && (
                <Field label="Full name" type="text" value={form.name}
                  onChange={v => update('name', v)} placeholder="Sunita Patil" />
              )}

              <Field label="Email address" type="email" value={form.email}
                onChange={v => update('email', v)} placeholder="you@example.com" />

              <Field label="Password" type="password" value={form.password}
                onChange={v => update('password', v)} placeholder={'\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022'} />

              {!isLogin && (
                <>
                  <div>
                    <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-mid)', display: 'block', marginBottom: 8 }}>
                      I am a
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      {['farmer', 'buyer'].map(role => (
                        <motion.button key={role} type="button"
                          whileTap={{ scale: 0.97 }}
                          onClick={() => update('role', role)}
                          style={{
                            padding: '12px', borderRadius: 'var(--radius-md)',
                            border: `2px solid ${form.role === role ? 'var(--forest)' : 'rgba(27,67,50,0.15)'}`,
                            background: form.role === role ? 'rgba(27,67,50,0.05)' : 'transparent',
                            color: form.role === role ? 'var(--forest)' : 'var(--text-muted)',
                            fontWeight: form.role === role ? 600 : 400,
                            fontSize: 14, cursor: 'pointer',
                            fontFamily: 'var(--font-body)',
                            transition: 'all 0.2s',
                            textTransform: 'capitalize'
                          }}
                        >
                          {role === 'farmer' ? '\u{1F33E}' : '\u{1F3EA}'} {role}
                        </motion.button>
                      ))}
                    </div>
                  </div>

                  <Field label="Location / District" type="text" value={form.location}
                    onChange={v => update('location', v)} placeholder="Nashik" />
                </>
              )}

              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    style={{
                      background: 'rgba(192,57,43,0.08)',
                      border: '1px solid rgba(192,57,43,0.2)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '10px 14px',
                      fontSize: 13, color: 'var(--red)'
                    }}
                  >{error}</motion.div>
                )}
              </AnimatePresence>

              <motion.button
                type="submit"
                disabled={loading}
                whileHover={{ scale: loading ? 1 : 1.02 }}
                whileTap={{ scale: loading ? 1 : 0.98 }}
                style={{
                  background: loading ? 'var(--forest-light)' : 'var(--forest)',
                  color: 'var(--white)', border: 'none',
                  borderRadius: 100, padding: '14px',
                  fontSize: 15, fontWeight: 600,
                  cursor: loading ? 'wait' : 'pointer',
                  fontFamily: 'var(--font-body)',
                  marginTop: 4,
                  transition: 'background 0.2s',
                  boxShadow: 'var(--shadow-md)'
                }}
              >
                {loading
                  ? 'Please wait...'
                  : isLogin ? 'Sign in' : 'Create account'}
              </motion.button>
            </form>

            <p style={{ textAlign: 'center', marginTop: 24, fontSize: 14, color: 'var(--text-muted)' }}>
              {isLogin ? "Don't have an account? " : 'Already have an account? '}
              <button
                onClick={() => { setIsLogin(!isLogin); setError('') }}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--forest-light)', fontWeight: 600,
                  fontSize: 14, fontFamily: 'var(--font-body)'
                }}
              >
                {isLogin ? 'Register' : 'Sign in'}
              </button>
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  )
}

function Field({ label, type, value, onChange, placeholder }) {
  const [focused, setFocused] = useState(false)
  return (
    <div>
      <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-mid)', display: 'block', marginBottom: 6 }}>
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        required
        style={{
          width: '100%', padding: '12px 16px',
          borderRadius: 'var(--radius-md)',
          border: `1.5px solid ${focused ? 'var(--forest)' : 'rgba(27,67,50,0.15)'}`,
          background: focused ? 'rgba(27,67,50,0.02)' : 'var(--white)',
          fontSize: 15, color: 'var(--text-dark)',
          fontFamily: 'var(--font-body)',
          transition: 'all 0.2s',
          outline: 'none'
        }}
      />
    </div>
  )
}
