import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { QRCodeSVG } from 'qrcode.react'
import { useAuth } from '../context/AuthContext.jsx'
import { useSocket } from '../hooks/useSocket.js'
import api from '../api/axios.js'
import ExportReadiness from '../components/ExportReadiness.jsx'

const CROPS = ['Onion', 'Potato', 'Tomato', 'Wheat']

function normalizePriceData(data) {
    if (!data) return null

    const rawCities = Array.isArray(data.cities) && data.cities.length
        ? data.cities
        : Array.isArray(data.predictions)
            ? data.predictions.map((item) => ({
                city: item.city,
                price: item.price ?? item.predicted_price,
                predicted_price: item.predicted_price ?? item.price,
            }))
            : []

    const cities = rawCities.map((city) => ({
        ...city,
        price: city.price ?? city.predicted_price ?? 0,
    }))

    const sortedCities = [...cities].sort((a, b) => (b.price ?? 0) - (a.price ?? 0))
    const bestCity = data.best_city || data.recommended_city || sortedCities[0]?.city || ''
    const bestPrice = data.best_price ?? data.recommended_price ?? sortedCities[0]?.price ?? 0

    return {
        ...data,
        cities: cities.map((city) => ({
            ...city,
            recommended: city.recommended ?? city.city === bestCity,
        })),
        best_city: bestCity,
        best_price: bestPrice,
    }
}

export default function FarmerDashboard() {
    const { user, logout } = useAuth()
    const [tab, setTab] = useState('overview')
    const [listings, setListings] = useState([])
    const [orders, setOrders] = useState([])
    const [priceData, setPriceData] = useState(null)
    const [demandData, setDemandData] = useState(null)
    const [selectedCrop, setSelectedCrop] = useState('Onion')
    const [selectedDate, setSelectedDate] = useState('')
    const [daysAhead, setDaysAhead] = useState(7)
    const [forecastLabel, setForecastLabel] = useState('7 days from today')
    const [notification, setNotification] = useState(null)
    const [loadingPrice, setLoadingPrice] = useState(false)
    const [showListingForm, setShowListingForm] = useState(false)
    const [selectedQR, setSelectedQR] = useState(null)

    const [form, setForm] = useState({
        crop: 'Onion', variety: '', grade: 'Grade A',
        quantity: '', askingPrice: '', location: '',
        city: 'Nashik', apedaCertified: false
    })

    useSocket(user, {
        onOrderReceived: (data) => {
            showNotif(`New order received for ${data.crop}!`)
            fetchOrders()
        }
    })

    const fetchListings = useCallback(async () => {
        try {
            const res = await api.get('/api/listings/my')
            setListings(res.data.listings || [])
        } catch (error) {
            console.error('Failed to fetch farmer listings:', error)
        }
    }, [])

    const fetchOrders = useCallback(async () => {
        try {
            const res = await api.get('/api/orders/my')
            setOrders(res.data.orders || [])
        } catch (error) {
            console.error('Failed to fetch farmer orders:', error)
        }
    }, [])

    const fetchPriceData = useCallback(async (days = daysAhead, crop = selectedCrop) => {
        setLoadingPrice(true)
        try {
            const [price, demand] = await Promise.all([
                api.get(`/api/ml/predict-price?crop=${crop}&days_ahead=${days}`),
                api.get(`/api/ml/demand-forecast?crop=${crop}&days_ahead=${days}`)
                    .catch(() => ({ data: null })),
            ])
            setPriceData(normalizePriceData(price.data))
            setDemandData(demand.data)
        } catch (error) {
            console.error('Failed to fetch price intelligence:', error)
        } finally {
            setLoadingPrice(false)
        }
    }, [daysAhead, selectedCrop])

    useEffect(() => {
        fetchListings()
        fetchOrders()
    }, [fetchListings, fetchOrders])

    useEffect(() => {
        fetchPriceData(daysAhead, selectedCrop)
    }, [daysAhead, selectedCrop, fetchPriceData])

    const handleDateChange = (dateStr) => {
        setSelectedDate(dateStr)
        if (!dateStr) {
            setDaysAhead(7)
            setForecastLabel('7 days from today')
            fetchPriceData(7)
            return
        }
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const picked = new Date(dateStr)
        const diffMs = picked - today
        const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))

        if (diffDays < 0) {
            setForecastLabel('Select a future date')
            return
        }
        if (diffDays > 30) {
            setForecastLabel('Max 30 days ahead')
            fetchPriceData(30)
            setDaysAhead(30)
            return
        }

        setDaysAhead(diffDays)
        setForecastLabel(
            diffDays === 0
                ? 'Today'
                : diffDays === 1
                    ? 'Tomorrow'
                    : `${diffDays} days from today`
        )
        fetchPriceData(diffDays)
    }

    const handleSliderChange = (val) => {
        const days = parseInt(val)
        setDaysAhead(days)
        setSelectedDate('')  // clear date picker when slider used
        setForecastLabel(
            days === 0 ? 'Today' :
                days === 1 ? 'Tomorrow' :
                    days === 7 ? '7 days from today' :
                        `${days} days from today`
        )
        fetchPriceData(days)
    }

    const createListing = async (e) => {
        e.preventDefault()
        try {
            await api.post('/api/listings', form)
            setShowListingForm(false)
            showNotif('Listing created! QR code generated.')
            fetchListings()
        } catch (err) {
            showNotif(err.response?.data?.error || 'Failed to create listing', true)
        }
    }

    const showNotif = (msg, error = false) => {
        setNotification({ msg, error })
        setTimeout(() => setNotification(null), 4000)
    }

    const demandColor = (d) => d === 'HIGH' ? '#27500A' : d === 'LOW' ? '#791F1F' : '#633806'
    const demandBg = (d) => d === 'HIGH' ? '#EAF3DE' : d === 'LOW' ? '#FCEBEB' : '#FAEEDA'

    return (
        <div style={{ minHeight: '100vh', background: 'var(--cream)', display: 'grid', gridTemplateColumns: '240px 1fr' }}>

            {/* ── Sidebar ── */}
            <aside style={{
                background: 'var(--forest)', padding: '28px 0',
                display: 'flex', flexDirection: 'column',
                position: 'sticky', top: 0, height: '100vh'
            }}>
                <div style={{ padding: '0 24px 32px', borderBottom: '1px solid rgba(82,183,136,0.15)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                            width: 36, height: 36, background: 'var(--mint)',
                            borderRadius: 10, display: 'flex', alignItems: 'center',
                            justifyContent: 'center', color: 'var(--forest)', fontWeight: 800, fontSize: 18
                        }}>A</div>
                        <span style={{ fontFamily: 'var(--font-display)', color: 'var(--white)', fontSize: 20, fontWeight: 700 }}>
                            AgriLink
                        </span>
                    </div>
                    <div style={{ marginTop: 16 }}>
                        <p style={{ color: 'var(--mint)', fontSize: 13, fontWeight: 600 }}>{user?.name}</p>
                        <p style={{ color: 'rgba(149,213,178,0.6)', fontSize: 12 }}>{user?.location} · Farmer</p>
                    </div>
                </div>

                <nav style={{ padding: '20px 0', flex: 1 }}>
                    {[
                        { id: 'overview', label: 'Overview', icon: '◈' },
                        { id: 'prices', label: 'AI Prices', icon: '◉' },
                        { id: 'listings', label: 'My Listings', icon: '◎' },
                        { id: 'orders', label: 'Orders', icon: '◫' },
                        { id: 'export', label: 'Export Advisor', icon: '◬' },
                    ].map(item => (
                        <SidebarItem key={item.id} {...item} active={tab === item.id} onClick={() => setTab(item.id)} />
                    ))}
                </nav>

                <button onClick={logout} style={{
                    margin: '0 16px', padding: '10px 16px',
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 'var(--radius-md)',
                    color: 'rgba(149,213,178,0.7)', fontSize: 13,
                    cursor: 'pointer', fontFamily: 'var(--font-body)', textAlign: 'left'
                }}>← Sign out</button>
            </aside>

            {/* ── Main ── */}
            <main style={{ padding: '32px 40px', minHeight: '100vh' }}>

                <AnimatePresence>
                    {notification && (
                        <motion.div
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            style={{
                                position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)',
                                background: notification.error ? '#FCEBEB' : 'var(--forest)',
                                color: notification.error ? 'var(--red)' : 'var(--white)',
                                padding: '12px 24px', borderRadius: 100,
                                fontSize: 14, fontWeight: 500,
                                boxShadow: 'var(--shadow-lg)', zIndex: 1000
                            }}
                        >{notification.msg}</motion.div>
                    )}
                </AnimatePresence>

                {/* ── Overview ── */}
                {tab === 'overview' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 32, color: 'var(--forest)', marginBottom: 6, fontWeight: 700 }}>
                            Good morning, {user?.name?.split(' ')[0]} 🌾
                        </h1>
                        <p style={{ color: 'var(--text-muted)', marginBottom: 32, fontSize: 15 }}>
                            Here's your farm dashboard for today.
                        </p>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 32 }}>
                            {[
                                { label: 'Active listings', value: listings.filter(l => l.status === 'available').length },
                                { label: 'Total orders', value: orders.length },
                                { label: 'Confirmed orders', value: orders.filter(o => o.status === 'confirmed').length },
                            ].map((s, i) => (
                                <motion.div key={i}
                                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.1 }}
                                    style={{
                                        background: 'var(--white)', borderRadius: 'var(--radius-md)',
                                        padding: '24px', border: '1px solid rgba(27,67,50,0.08)',
                                        boxShadow: 'var(--shadow-sm)'
                                    }}
                                >
                                    <div style={{ fontSize: 40, fontWeight: 700, color: 'var(--forest)', fontFamily: 'var(--font-display)' }}>
                                        {s.value}
                                    </div>
                                    <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>{s.label}</div>
                                </motion.div>
                            ))}
                        </div>

                        <div style={{
                            background: 'var(--forest)', borderRadius: 'var(--radius-lg)',
                            padding: '28px', color: 'var(--white)', marginBottom: 24
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                                <div>
                                    <p style={{ fontSize: 12, color: 'var(--mint)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 4 }}>
                                        AI Price Intelligence
                                    </p>
                                    <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700 }}>
                                        7-Day Forecast — Onion
                                    </h3>
                                </div>
                                <button onClick={() => setTab('prices')} style={{
                                    background: 'rgba(82,183,136,0.15)', color: 'var(--mint)',
                                    border: '1px solid rgba(82,183,136,0.3)', borderRadius: 100,
                                    padding: '6px 16px', fontSize: 13, cursor: 'pointer',
                                    fontFamily: 'var(--font-body)'
                                }}>View all crops →</button>
                            </div>

                            {priceData ? (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
                                    {priceData.cities?.map((c, i) => (
                                        <div key={i} style={{
                                            background: c.recommended ? 'rgba(82,183,136,0.15)' : 'rgba(255,255,255,0.06)',
                                            border: `1px solid ${c.recommended ? 'rgba(82,183,136,0.4)' : 'rgba(255,255,255,0.08)'}`,
                                            borderRadius: 'var(--radius-md)', padding: '14px', textAlign: 'center'
                                        }}>
                                            <div style={{ fontSize: 11, color: c.recommended ? 'var(--mint)' : 'rgba(149,213,178,0.6)', marginBottom: 6, fontWeight: 600 }}>
                                                {c.city}
                                            </div>
                                            <div style={{ fontSize: 20, fontWeight: 700, color: c.recommended ? 'var(--mint)' : 'var(--white)', fontFamily: 'var(--font-mono)' }}>
                                                ₹{c.price?.toLocaleString('en-IN')}
                                            </div>
                                            {c.recommended && <div style={{ fontSize: 10, color: 'var(--mint)', marginTop: 4 }}>Best price ↑</div>}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div style={{ color: 'rgba(149,213,178,0.5)', fontSize: 14 }}>Loading price data…</div>
                            )}
                        </div>

                        <motion.button
                            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                            onClick={() => setShowListingForm(true)}
                            style={{
                                width: '100%', padding: '18px', background: 'transparent',
                                border: '2px dashed rgba(27,67,50,0.2)', borderRadius: 'var(--radius-lg)',
                                fontSize: 15, color: 'var(--forest-light)', fontWeight: 600,
                                cursor: 'pointer', fontFamily: 'var(--font-body)'
                            }}
                        >+ Create new produce listing</motion.button>
                    </motion.div>
                )}

                {/* ── AI Prices ── */}
                {tab === 'prices' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 30, color: 'var(--forest)', marginBottom: 6, fontWeight: 700 }}>
                            AI Price Intelligence
                        </h2>
                        <p style={{ color: 'var(--text-muted)', marginBottom: 28, fontSize: 15 }}>
                            Predict prices for any future date. XGBoost trained on 737,392 AGMARKNET rows.
                        </p>

                        {/* Crop selector */}
                        <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
                            {CROPS.map(c => (
                                <CropPill key={c} label={c} active={selectedCrop === c} onClick={() => setSelectedCrop(c)} />
                            ))}
                        </div>

                        {/* Date picker + slider — the new feature */}
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            style={{
                                background: 'var(--white)',
                                border: '1px solid rgba(27,67,50,0.1)',
                                borderRadius: 'var(--radius-lg)',
                                padding: '24px 28px',
                                marginBottom: 24,
                                boxShadow: 'var(--shadow-sm)'
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                                <div>
                                    <p style={{ fontSize: 12, color: 'var(--leaf)', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 4 }}>
                                        Forecast date
                                    </p>
                                    <p style={{ fontSize: 22, fontWeight: 700, color: 'var(--forest)', fontFamily: 'var(--font-display)' }}>
                                        {forecastLabel}
                                    </p>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>Pick a date</span>
                                    <input
                                        type="date"
                                        value={selectedDate}
                                        min={new Date().toISOString().split('T')[0]}
                                        max={new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                                        onChange={e => handleDateChange(e.target.value)}
                                        style={{
                                            padding: '8px 12px',
                                            borderRadius: 'var(--radius-md)',
                                            border: '1.5px solid rgba(27,67,50,0.2)',
                                            fontSize: 14, color: 'var(--forest)',
                                            background: 'var(--cream)',
                                            fontFamily: 'var(--font-body)',
                                            cursor: 'pointer', outline: 'none'
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Slider */}
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Today</span>
                                    <span style={{ fontSize: 12, color: 'var(--forest)', fontWeight: 600 }}>{daysAhead} days ahead</span>
                                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>30 days</span>
                                </div>
                                <input
                                    type="range"
                                    min="0"
                                    max="30"
                                    step="1"
                                    value={daysAhead}
                                    onChange={e => handleSliderChange(e.target.value)}
                                    style={{
                                        width: '100%',
                                        appearance: 'none', WebkitAppearance: 'none',
                                        height: 4, borderRadius: 2,
                                        background: `linear-gradient(to right, #1B4332 0%, #1B4332 ${(daysAhead / 30) * 100}%, #D3D1C7 ${(daysAhead / 30) * 100}%, #D3D1C7 100%)`,
                                        outline: 'none', cursor: 'pointer', border: 'none'
                                    }}
                                />
                                {/* Quick preset buttons */}
                                <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                                    {[
                                        { label: 'Today', days: 0 },
                                        { label: '1 week', days: 7 },
                                        { label: '2 weeks', days: 14 },
                                        { label: '1 month', days: 30 },
                                    ].map(p => (
                                        <motion.button
                                            key={p.label}
                                            whileTap={{ scale: 0.95 }}
                                            onClick={() => handleSliderChange(p.days)}
                                            style={{
                                                padding: '5px 14px', borderRadius: 100, fontSize: 12, fontWeight: 500,
                                                border: `1.5px solid ${daysAhead === p.days ? 'var(--forest)' : 'rgba(27,67,50,0.15)'}`,
                                                background: daysAhead === p.days ? 'var(--forest)' : 'transparent',
                                                color: daysAhead === p.days ? 'var(--white)' : 'var(--text-muted)',
                                                cursor: 'pointer', fontFamily: 'var(--font-body)', transition: 'all 0.15s'
                                            }}
                                        >{p.label}</motion.button>
                                    ))}
                                </div>
                            </div>
                        </motion.div>

                        {loadingPrice ? <LoadingCard /> : priceData && (
                            <>
                                {/* Best city highlight */}
                                <motion.div
                                    key={`${selectedCrop}-${daysAhead}`}
                                    initial={{ opacity: 0, y: 12 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.35 }}
                                    style={{
                                        background: 'var(--forest)', borderRadius: 'var(--radius-lg)',
                                        padding: '32px', marginBottom: 20,
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                                    }}
                                >
                                    <div>
                                        <p style={{ fontSize: 12, color: 'var(--mint)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8 }}>
                                            Best market — {forecastLabel}
                                        </p>
                                        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 40, color: 'var(--white)', fontWeight: 700, letterSpacing: '-1px' }}>
                                            {priceData.best_city}
                                        </h3>
                                        <p style={{ color: 'rgba(149,213,178,0.7)', marginTop: 4, fontSize: 15 }}>
                                            {priceData.date} · {selectedCrop}
                                        </p>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: 52, fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--mint)', letterSpacing: '-2px' }}>
                                            ₹{priceData.best_price?.toLocaleString('en-IN')}
                                        </div>
                                        <div style={{ color: 'rgba(149,213,178,0.6)', fontSize: 14 }}>per quintal</div>
                                    </div>
                                </motion.div>

                                {/* All 5 cities */}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14, marginBottom: 28 }}>
                                    {priceData.cities?.map((c, i) => (
                                        <motion.div key={`${c.city}-${daysAhead}`}
                                            initial={{ opacity: 0, y: 16 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: i * 0.06 }}
                                            style={{
                                                background: c.recommended ? 'rgba(27,67,50,0.05)' : 'var(--white)',
                                                border: `1.5px solid ${c.recommended ? 'var(--forest-light)' : 'rgba(27,67,50,0.08)'}`,
                                                borderRadius: 'var(--radius-md)', padding: '20px',
                                                textAlign: 'center', boxShadow: 'var(--shadow-sm)'
                                            }}
                                        >
                                            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>{c.city}</div>
                                            <div style={{ fontSize: 26, fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--forest)' }}>
                                                ₹{c.price?.toLocaleString('en-IN')}
                                            </div>
                                            {c.recommended && (
                                                <div style={{ fontSize: 11, color: 'var(--leaf)', fontWeight: 600, marginTop: 8 }}>✓ Recommended</div>
                                            )}
                                        </motion.div>
                                    ))}
                                </div>

                                {/* Demand section */}
                                {demandData && (
                                    <>
                                        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--forest)', marginBottom: 16 }}>
                                            Demand forecast — {forecastLabel}
                                        </h3>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14 }}>
                                            {demandData.cities?.map((c, i) => (
                                                <motion.div key={`demand-${c.city}-${daysAhead}`}
                                                    initial={{ opacity: 0, y: 12 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ delay: i * 0.06 }}
                                                    style={{
                                                        background: 'var(--white)', border: '1px solid rgba(27,67,50,0.08)',
                                                        borderRadius: 'var(--radius-md)', padding: '16px', textAlign: 'center'
                                                    }}
                                                >
                                                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8, fontWeight: 600 }}>{c.city}</div>
                                                    <span style={{
                                                        fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 100,
                                                        background: demandBg(c.demand), color: demandColor(c.demand)
                                                    }}>{c.demand}</span>
                                                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>{c.confidence}% conf.</div>
                                                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4, lineHeight: 1.3 }}>{c.advice}</div>
                                                </motion.div>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </>
                        )}
                    </motion.div>
                )}
                {/* ── Listings ── */}
                {tab === 'listings' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
                            <div>
                                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 30, color: 'var(--forest)', fontWeight: 700 }}>
                                    My Listings
                                </h2>
                                <p style={{ color: 'var(--text-muted)', fontSize: 15, marginTop: 4 }}>{listings.length} total</p>
                            </div>
                            <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                                onClick={() => setShowListingForm(true)}
                                style={{
                                    background: 'var(--forest)', color: 'var(--white)',
                                    border: 'none', borderRadius: 100, padding: '12px 24px',
                                    fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)'
                                }}>+ New listing</motion.button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                            {listings.length === 0 ? (
                                <EmptyState message="No listings yet. Create your first listing." />
                            ) : listings.map((l, i) => (
                                <motion.div key={l._id}
                                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.06 }}
                                    style={{
                                        background: 'var(--white)', borderRadius: 'var(--radius-md)',
                                        padding: '20px 24px', border: '1px solid rgba(27,67,50,0.08)',
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                        boxShadow: 'var(--shadow-sm)'
                                    }}
                                >
                                    <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
                                        <div style={{ width: 48, height: 48, borderRadius: 'var(--radius-md)', background: 'rgba(27,67,50,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>
                                            {l.crop === 'Onion' ? '🧅' : l.crop === 'Tomato' ? '🍅' : l.crop === 'Wheat' ? '🌾' : '🥔'}
                                        </div>
                                        <div>
                                            <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--forest)' }}>
                                                {l.crop} — {l.quantity} quintals
                                            </div>
                                            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
                                                {l.grade} · {l.location} · {l.city}
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--forest)', fontFamily: 'var(--font-mono)' }}>
                                                ₹{l.askingPrice?.toLocaleString('en-IN')}/q
                                            </div>
                                            <StatusPill status={l.status} />
                                        </div>
                                        {l.lotId && (
                                            <motion.button whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.95 }}
                                                onClick={() => setSelectedQR(l)}
                                                style={{
                                                    background: 'rgba(27,67,50,0.06)', border: '1px solid rgba(27,67,50,0.12)',
                                                    borderRadius: 'var(--radius-sm)', padding: '8px 14px',
                                                    fontSize: 12, fontWeight: 600, color: 'var(--forest)',
                                                    cursor: 'pointer', fontFamily: 'var(--font-body)'
                                                }}>QR</motion.button>
                                        )}
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                )}

                {/* ── Orders ── */}
                {tab === 'orders' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 30, color: 'var(--forest)', marginBottom: 6, fontWeight: 700 }}>
                            Orders Received
                        </h2>
                        <p style={{ color: 'var(--text-muted)', marginBottom: 28, fontSize: 15 }}>{orders.length} total orders</p>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                            {orders.length === 0 ? (
                                <EmptyState message="No orders yet. Create listings to receive orders." />
                            ) : orders.map((o, i) => (
                                <motion.div key={o._id}
                                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.06 }}
                                    style={{
                                        background: 'var(--white)', borderRadius: 'var(--radius-md)',
                                        padding: '20px 24px', border: '1px solid rgba(27,67,50,0.08)',
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                        boxShadow: 'var(--shadow-sm)'
                                    }}
                                >
                                    <div>
                                        <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--forest)', marginBottom: 4 }}>
                                            {o.crop} — {o.quantity} quintals
                                        </div>
                                        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                                            Buyer: {o.buyerId?.name || 'Buyer'} · ₹{o.agreedPrice?.toLocaleString('en-IN')}/q
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                                        <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--forest)', fontFamily: 'var(--font-mono)' }}>
                                            ₹{(o.quantity * o.agreedPrice)?.toLocaleString('en-IN')}
                                        </div>
                                        <StatusPill status={o.status} />
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                )}

                {/* ── Export Readiness Check ── */}
                {tab === 'export' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        <ExportReadiness />
                    </motion.div>
                )}
            </main>

            {/* ── New Listing Modal ── */}
            <AnimatePresence>
                {showListingForm && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        style={{
                            position: 'fixed', inset: 0, background: 'rgba(27,67,50,0.5)',
                            backdropFilter: 'blur(4px)', zIndex: 200,
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}
                        onClick={() => setShowListingForm(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={e => e.stopPropagation()}
                            style={{
                                background: 'var(--white)', borderRadius: 'var(--radius-lg)',
                                padding: '36px', width: '100%', maxWidth: 540,
                                boxShadow: 'var(--shadow-lg)', maxHeight: '90vh', overflowY: 'auto'
                            }}
                        >
                            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 26, color: 'var(--forest)', marginBottom: 6, fontWeight: 700 }}>
                                Create listing
                            </h2>
                            <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 28 }}>
                                List your produce directly. Buyers will connect with you.
                            </p>
                            <form onSubmit={createListing} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                <div>
                                    <label style={labelStyle}>Crop</label>
                                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                        {CROPS.map(c => (
                                            <motion.button key={c} type="button" whileTap={{ scale: 0.95 }}
                                                onClick={() => setForm(f => ({ ...f, crop: c }))}
                                                style={{
                                                    padding: '7px 16px', borderRadius: 100, fontSize: 13, fontWeight: 500,
                                                    border: `1.5px solid ${form.crop === c ? 'var(--forest)' : 'rgba(27,67,50,0.15)'}`,
                                                    background: form.crop === c ? 'rgba(27,67,50,0.06)' : 'transparent',
                                                    color: form.crop === c ? 'var(--forest)' : 'var(--text-muted)',
                                                    cursor: 'pointer', fontFamily: 'var(--font-body)', transition: 'all 0.2s'
                                                }}
                                            >{c}</motion.button>
                                        ))}
                                    </div>
                                </div>

                                <ModalField label="Quantity (quintals)" type="number"
                                    value={form.quantity} onChange={v => setForm(f => ({ ...f, quantity: v }))} placeholder="20" />
                                <ModalField label="Asking price (₹/quintal)" type="number"
                                    value={form.askingPrice} onChange={v => setForm(f => ({ ...f, askingPrice: v }))} placeholder="2100" />
                                <ModalField label="Location / village" type="text"
                                    value={form.location} onChange={v => setForm(f => ({ ...f, location: v }))} placeholder="Lasalgaon, Nashik" />

                                <div>
                                    <label style={labelStyle}>Grade</label>
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        {['Grade A', 'Grade B', 'Grade C'].map(g => (
                                            <motion.button key={g} type="button" whileTap={{ scale: 0.95 }}
                                                onClick={() => setForm(f => ({ ...f, grade: g }))}
                                                style={{
                                                    padding: '7px 16px', borderRadius: 100, fontSize: 13, fontWeight: 500,
                                                    border: `1.5px solid ${form.grade === g ? 'var(--forest)' : 'rgba(27,67,50,0.15)'}`,
                                                    background: form.grade === g ? 'rgba(27,67,50,0.06)' : 'transparent',
                                                    color: form.grade === g ? 'var(--forest)' : 'var(--text-muted)',
                                                    cursor: 'pointer', fontFamily: 'var(--font-body)', transition: 'all 0.2s'
                                                }}
                                            >{g}</motion.button>
                                        ))}
                                    </div>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 8 }}>
                                    <button type="button" onClick={() => setShowListingForm(false)}
                                        style={{ padding: '11px 24px', border: '1.5px solid rgba(27,67,50,0.2)', borderRadius: 100, background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: 14 }}>
                                        Cancel
                                    </button>
                                    <motion.button type="submit" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                                        style={{ padding: '11px 28px', background: 'var(--forest)', border: 'none', borderRadius: 100, color: 'var(--white)', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                                        Create listing
                                    </motion.button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── QR Modal ── */}
            <AnimatePresence>
                {selectedQR && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        style={{ position: 'fixed', inset: 0, background: 'rgba(27,67,50,0.5)', backdropFilter: 'blur(4px)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        onClick={() => setSelectedQR(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                            onClick={e => e.stopPropagation()}
                            style={{ background: 'var(--white)', borderRadius: 'var(--radius-lg)', padding: '36px', textAlign: 'center', boxShadow: 'var(--shadow-lg)' }}
                        >
                            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--forest)', marginBottom: 4 }}>
                                Traceability QR
                            </h3>
                            <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 24 }}>Lot: {selectedQR.lotId}</p>
                            <QRCodeSVG
                                value={`${window.location.origin}/trace/${selectedQR.lotId}`}
                                size={220}
                                fgColor="#1B4332"
                                bgColor="transparent"
                            />
                            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 16 }}>
                                Scan to view complete farm-to-buyer journey
                            </p>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

const labelStyle = { fontSize: 13, fontWeight: 500, color: 'var(--text-mid)', display: 'block', marginBottom: 8 }

function SidebarItem({ icon, label, active, onClick }) {
    return (
        <motion.button
            whileHover={{ x: active ? 0 : 4 }}
            onClick={onClick}
            style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '11px 24px', width: '100%', textAlign: 'left',
                background: active ? 'rgba(82,183,136,0.12)' : 'transparent',
                borderTop: 'none', borderRight: 'none', borderBottom: 'none',
                borderLeft: active ? '3px solid var(--mint)' : '3px solid transparent',
                cursor: 'pointer', fontFamily: 'var(--font-body)',
                color: active ? 'var(--mint)' : 'rgba(149,213,178,0.6)',
                fontSize: 14, fontWeight: active ? 600 : 400, transition: 'all 0.2s'
            }}
        >
            <span style={{ fontSize: 16 }}>{icon}</span>
            {label}
        </motion.button>
    )
}

function CropPill({ label, active, onClick }) {
    return (
        <motion.button whileTap={{ scale: 0.95 }} onClick={onClick}
            style={{
                padding: '8px 20px', borderRadius: 100, fontSize: 14, fontWeight: 500,
                border: `1.5px solid ${active ? 'var(--forest)' : 'rgba(27,67,50,0.15)'}`,
                background: active ? 'var(--forest)' : 'transparent',
                color: active ? 'var(--white)' : 'var(--text-muted)',
                cursor: 'pointer', fontFamily: 'var(--font-body)', transition: 'all 0.2s'
            }}
        >{label}</motion.button>
    )
}

function StatusPill({ status }) {
    const map = {
        available: ['#EAF3DE', '#27500A', 'Available'],
        sold: ['#FAEEDA', '#633806', 'Sold'],
        confirmed: ['#E6F1FB', '#0C447C', 'Confirmed'],
        in_transit: ['#FAEEDA', '#633806', 'In transit'],
        delivered: ['#EAF3DE', '#27500A', 'Delivered'],
        expired: ['#F1EFE8', '#444441', 'Expired'],
    }
    const [bg, color, label] = map[status] || ['#F1EFE8', '#444441', status]
    return (
        <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 100, background: bg, color, display: 'inline-block', marginTop: 4 }}>
            {label}
        </span>
    )
}

function LoadingCard() {
    return (
        <div style={{ background: 'var(--white)', borderRadius: 'var(--radius-md)', padding: '40px', textAlign: 'center', border: '1px solid rgba(27,67,50,0.08)' }}>
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                style={{ width: 32, height: 32, border: '3px solid var(--mint)', borderTopColor: 'var(--forest)', borderRadius: '50%', margin: '0 auto 16px' }} />
            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Loading AI predictions…</p>
        </div>
    )
}

function EmptyState({ message }) {
    return (
        <div style={{ background: 'var(--white)', borderRadius: 'var(--radius-md)', padding: '48px', textAlign: 'center', border: '1px dashed rgba(27,67,50,0.15)' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🌱</div>
            <p style={{ color: 'var(--text-muted)', fontSize: 15 }}>{message}</p>
        </div>
    )
}

function ModalField({ label, type, value, onChange, placeholder }) {
    const [focused, setFocused] = useState(false)
    return (
        <div>
            <label style={labelStyle}>{label}</label>
            <input type={type} value={value} onChange={e => onChange(e.target.value)}
                placeholder={placeholder} required
                onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
                style={{
                    width: '100%', padding: '11px 16px', borderRadius: 'var(--radius-md)',
                    border: `1.5px solid ${focused ? 'var(--forest)' : 'rgba(27,67,50,0.15)'}`,
                    background: 'var(--white)', fontSize: 15, color: 'var(--text-dark)',
                    fontFamily: 'var(--font-body)', transition: 'border 0.2s', outline: 'none'
                }}
            />
        </div>
    )
} 
