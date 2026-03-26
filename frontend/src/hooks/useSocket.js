import { useEffect, useRef } from 'react'
import { io } from 'socket.io-client'

let socket = null

export function useSocket(user, handlers = {}) {
  const handlersRef = useRef(handlers)

  useEffect(() => {
    handlersRef.current = handlers
  }, [handlers])

  useEffect(() => {
    if (!user) return

    // Small delay to let the page fully mount before connecting
    const timer = setTimeout(() => {
      socket = io(import.meta.env.VITE_API_URL || 'http://localhost:5000', {
        withCredentials: true,
        transports     : ['polling', 'websocket'],  // polling first — more reliable
        reconnection      : true,
        reconnectionAttempts: 5,
        reconnectionDelay   : 1000,
      })

      socket.on('connect', () => {
        console.log('Socket connected')
        if (user.role === 'buyer') {
          socket.emit('subscribe_crops', ['onion', 'tomato', 'potato', 'wheat'])
          socket.emit('register_buyer', user.id)
        }
        if (user.role === 'farmer') {
          socket.emit('register_farmer', user.id)
        }
      })

      socket.on('connect_error', (err) => {
        console.log('Socket connect error:', err.message)
      })

      socket.on('new_listing',     (d) => handlersRef.current.onNewListing?.(d))
      socket.on('price_update',    (d) => handlersRef.current.onPriceUpdate?.(d))
      socket.on('order_received',  (d) => handlersRef.current.onOrderReceived?.(d))
      socket.on('order_confirmed', (d) => handlersRef.current.onOrderConfirmed?.(d))
    }, 500)

    return () => {
      clearTimeout(timer)
      socket?.disconnect()
      socket = null
    }
  }, [user])
}
