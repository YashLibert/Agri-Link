import express from 'express';
import { User } from '../models/User.js';
import authenticate from '../middleware/authenticate.js';
import jwt from 'jsonwebtoken';

const router = express.Router();

function setRefreshCookie(res, refreshToken) {
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure  : process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge  : 7 * 24 * 60 * 60 * 1000
  });
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role, phone, location, fpoName } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'Name, email, password and role are required' });
    }

    if (!['farmer', 'buyer'].includes(role)) {
      return res.status(400).json({ error: 'Role must be farmer or buyer' });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const user = await User.create({
      name, email, password, role, phone, location, fpoName
    });

    const accessToken  = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();
    setRefreshCookie(res, refreshToken);

    res.status(201).json({
      accessToken,
      user: {
        id      : user._id,
        name    : user.name,
        email   : user.email,
        role    : user.role,
        location: user.location,
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    // Must use .select('+password') because password has select: false
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const match = await user.isPasswordCorrect(password);
    if (!match) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const accessToken  = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();
    setRefreshCookie(res, refreshToken);

    res.json({
      accessToken,
      user: {
        id      : user._id,
        name    : user.name,
        email   : user.email,
        role    : user.role,
        location: user.location,
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/refresh
router.post('/refresh', (req, res) => {
  try {
    const token = req.cookies?.refreshToken;
    if (!token) {
      return res.status(401).json({ error: 'No refresh token' });
    }

    const decoded     = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);
    const accessToken = jwt.sign(
      { _id: decoded._id },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: process.env.ACCESS_TOKEN_EXPIRY }
    );

    res.json({ accessToken });
  } catch {
    res.status(401).json({ error: 'Invalid or expired refresh token' });
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  res.clearCookie('refreshToken');
  res.json({ message: 'Logged out successfully' });
});

// GET /api/auth/me
router.get('/me', authenticate, (req, res) => {
  res.json({
    id      : req.user._id,
    name    : req.user.name,
    email   : req.user.email,
    role    : req.user.role,
    location: req.user.location,
    fpoName : req.user.fpoName,
  });
});

export default router;