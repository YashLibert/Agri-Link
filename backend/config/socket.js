import { Server } from 'socket.io'

let io = null

export function initSocket(server) {
  io = new Server(server, {
    cors: {
      origin     : 'http://localhost:5173',
      credentials: true,
      methods    : ['GET', 'POST']
    },
    transports       : ['websocket', 'polling'],
    allowEIO3        : true,
    pingTimeout      : 60000,
    pingInterval     : 25000,
    upgradeTimeout   : 10000,
  })

  io.on('connection', (socket) => {
    console.log('Socket connected:', socket.id)

    socket.on('subscribe_crops', (crops) => {
      crops.forEach(crop => socket.join(`crop:${crop}`))
    })

    socket.on('register_farmer', (farmerId) => {
      socket.join(`farmer:${farmerId}`)
    })

    socket.on('register_buyer', (buyerId) => {
      socket.join(`buyer:${buyerId}`)
    })

    socket.on('disconnect', () => {
      console.log('Socket disconnected:', socket.id)
    })
  })

  return io
}

export function getIO() {
  if (!io) throw new Error('Socket.io not initialized')
  return io
}
