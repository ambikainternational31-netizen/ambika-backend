const NodeCache = require('node-cache');

// Create cache instance with optimized settings
const cache = new NodeCache({
  stdTTL: 300, // 5 minutes standard TTL
  checkperiod: 600, // Check for expired keys every 10 minutes
  useClones: false, // Don't clone objects for better performance
  deleteOnExpire: true, // Automatically delete expired items
  maxKeys: 1000 // Limit maximum cache size
});

const cacheMiddleware = (duration = 300) => (req, res, next) => {
  // Skip caching for non-GET requests or when user is logged in
  if (req.method !== 'GET' || req.user) {
    return next();
  }

  const key = `__express__${req.originalUrl || req.url}`;
  const cachedResponse = cache.get(key);

  if (cachedResponse) {
    return res.json(cachedResponse);
  }

  // Store original send
  const originalSend = res.json;

  // Override res.send
  res.json = function(body) {
    // Only cache successful responses
    if (res.statusCode === 200) {
      cache.set(key, body, duration);
    }
    originalSend.call(this, body);
  };

  next();
};

// Function to invalidate cache by pattern
const invalidateCache = (pattern) => {
  const keys = cache.keys();
  const invalidKeys = keys.filter(key => key.includes(pattern));
  cache.del(invalidKeys);
};

module.exports = {
  cache,
  cacheMiddleware,
  invalidateCache
};