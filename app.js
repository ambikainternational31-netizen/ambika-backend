require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const compression = require('compression');
const helmet = require('helmet');

const connectDB = require('./config/db');
const logger = require('./utils/logger');
const { errorHandler } = require('./middleware/errorHandler');

const userRoutes = require('./routes/userRoutes');
const productRoutes = require('./routes/productRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const cartRoutes = require('./routes/cartRoutes');
const orderRoutes = require('./routes/orderRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const upiPaymentRoutes = require('./routes/upiPaymentRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const adminRoutes = require('./routes/adminRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const quotationRoutes = require('./routes/quotationRoutes');

const app = express();

connectDB();

// Enable aggressive compression
app.use(compression({
  level: 6,
  threshold: 0,
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  }
}));

// Enhanced security with Helmet
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      connectSrc: ["'self'", 'https:', 'wss:'],
      imgSrc: ["'self'", 'data:', 'https:'],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      fontSrc: ["'self'", 'data:', 'https:'],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: []
    }
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS configuration for credentials
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      'https://ambika-international.vercel.app',
      'https://ambika-frontend.vercel.app',
      'https://ambika-international.com',        // Add your Hostinger domain
      'https://www.ambika-international.com',    // Add www subdomain
      'https://api.ambika-international.com',    // Add API subdomain
      'http://localhost:5173',
      'http://localhost:3000',
      'http://127.0.0.1:5173'
    ];
    
    // In production, also allow Render's domain
    if (process.env.NODE_ENV === 'production') {
      allowedOrigins.push(
        process.env.RENDER_EXTERNAL_URL,
        'https://*.render.com'
      );
    }
    
    // Only log CORS issues in development
    const isDev = process.env.NODE_ENV === 'development';
    
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) {
      return callback(null, true);
    }
    
    // In production, be more permissive with subdomains
    if (process.env.NODE_ENV === 'production') {
      const isAllowedDomain = allowedOrigins.some(allowed => {
        if (allowed.includes('*')) {
          const pattern = new RegExp('^' + allowed.replace('*', '.*') + '$');
          return pattern.test(origin);
        }
        return allowed === origin;
      });
      
      if (isAllowedDomain) {
        return callback(null, true);
      }
    } else if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    // Only log blocked origins in development
    if (isDev) {
      console.log(`⚠️ CORS blocked origin: ${origin}`);
    }
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  exposedHeaders: ['set-cookie'],
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// Handle preflight requests explicitly
app.options('*', cors(corsOptions));

// Optimize request body size limits
app.use(express.json({ 
  limit: '5mb',
  strict: true,
  type: 'application/json',
  verify: (req, res, buf) => {
    try { JSON.parse(buf); } catch (e) { buf = null; }
  }
}));
app.use(express.urlencoded({ 
  extended: true, 
  limit: '5mb',
  parameterLimit: 1000
}));

app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/upi-payments', upiPaymentRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/quotations', quotationRoutes);

app.get('/', (req, res) => {
    res.json({ message: 'Ambika International API Server', status: 'running' });
});

app.use('*', (req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

app.use(errorHandler);

module.exports = app;
