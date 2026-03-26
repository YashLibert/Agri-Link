const roleCheck = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ error: `Access denied — requires role: ${roles.join(' or ')}` });
  }
  next();
};

export default roleCheck;