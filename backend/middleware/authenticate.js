import jwt  from 'jsonwebtoken';
import { User } from '../models/User.js';

const authenticate = async (req, res, next) => {
  const header = req.headers.authorization;

  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const token   = header.split(' ')[1];

    // Use ACCESS_TOKEN_SECRET — not JWT_SECRET anymore
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    req.user = await User.findById(decoded._id).select('-password');

    if (!req.user) {
      return res.status(401).json({ error: 'User no longer exists' });
    }

    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Access token expired', code: 'TOKEN_EXPIRED' });
    }
    res.status(401).json({ error: 'Invalid access token' });
  }
};

export default authenticate;