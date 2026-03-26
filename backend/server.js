import dotenv     from 'dotenv';
import express    from 'express';
import http       from 'http';
import cors       from 'cors';
import connectDB  from './config/db.js';
import { initSocket } from './config/socket.js';
import cookieParser from 'cookie-parser';
import { fileURLToPath } from 'url';
import path from 'path';

import authRoutes     from './routes/auth.js';
import listingRoutes  from './routes/listings.js';
import orderRoutes    from './routes/orders.js';
import traceRoutes    from './routes/trace.js';
import mlRoutes       from './routes/ml.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const app    = express();
const server = http.createServer(app);

initSocket(server);

app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

app.use('/api/auth',     authRoutes);
app.use('/api/listings', listingRoutes);
app.use('/api/orders',   orderRoutes);
app.use('/api/trace',    traceRoutes);
app.use('/api/ml',       mlRoutes);

app.get('/health', (_, res) => res.json({ status: 'ok', service: 'AgriLink API' }));

app.use((err, req, res, next) => {
  console.error('Unhandled backend error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error'
  });
});

connectDB();
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`AgriLink backend running on port ${PORT}`));
