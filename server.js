// Load environment variables at the absolute top of the file
require('dotenv').config(); 
const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDB, saveDB } = require('./models/db');
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');

const app = express();

// Dynamically use process.env.PORT from your .env file, fallback to 5001 if 5000 is blocked
const PORT = process.env.PORT || 5000; 

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173', // Uses Vercel frontend URL in production
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const appEmitter = require('./events');

// Routes 
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);

// Server-Sent Events endpoint
app.get('/api/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  
  // Checking if flushHeaders exists to prevent old runtime engine crashes
  if (typeof res.flushHeaders === 'function') {
    res.flushHeaders();
  }

  const sendEvent = () => {
    res.write('data: {"type": "products_updated"}\n\n');
  };

  appEmitter.on('products_updated', sendEvent);

  req.on('close', () => {
    appEmitter.off('products_updated', sendEvent);
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Rajshree Fashion API is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server Error:', err.message);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error'
  });
});

// Initialize database then start server
async function start() {
  try {
    await initDB();
    app.listen(PORT, () => {
      console.log(`Rajshree Fashion Server running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  }
}

// Save database on graceful shutdown
process.on('SIGINT', () => {
  console.log('Saving database before shutdown...');
  saveDB();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('Saving database before shutdown...');
  saveDB();
  process.exit(0);
});

start();
