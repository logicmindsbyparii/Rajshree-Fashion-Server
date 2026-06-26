const express = require('express');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const path = require('path');
const { queryAll, queryOne, run, saveDB } = require('../models/db');
const { verifyToken, requireAdmin } = require('../middleware/auth');
const appEmitter = require('../events');

const router = express.Router();

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '..', 'uploads'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, uniqueSuffix + ext);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPEG, PNG, WebP, and GIF images are allowed.'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// GET /api/products - Get all products (with optional filters)
router.get('/', (req, res) => {
  try {
    const { fabric_type, collection, availability } = req.query;

    let sql = 'SELECT * FROM products WHERE 1=1';
    const params = [];

    if (fabric_type) {
      sql += ' AND fabric_type LIKE ?';
      params.push(`%${fabric_type}%`);
    }

    if (collection) {
      sql += ' AND collection_name LIKE ?';
      params.push(`%${collection}%`);
    }

    if (availability === 'available') {
      sql += ' AND is_available = 1 AND stock_quantity > 0';
    } else if (availability === 'unavailable') {
      sql += ' AND (is_available = 0 OR stock_quantity = 0)';
    }

    sql += ' ORDER BY created_at DESC';

    const products = queryAll(sql, params);
    res.json({ products });
  } catch (err) {
    console.error('Get products error:', err.message);
    res.status(500).json({ error: 'Failed to fetch products.' });
  }
});

// GET /api/products/:id - Get single product
router.get('/:id', (req, res) => {
  try {
    const product = queryOne('SELECT * FROM products WHERE id = ?', [req.params.id]);

    if (!product) {
      return res.status(404).json({ error: 'Product not found.' });
    }

    res.json({ product });
  } catch (err) {
    console.error('Get product error:', err.message);
    res.status(500).json({ error: 'Failed to fetch product.' });
  }
});

// POST /api/products - Create product (Admin only)
router.post('/', verifyToken, requireAdmin, upload.single('image'), (req, res) => {
  try {
    const { title, fabric_type, collection_name, stock_quantity, price, description, is_available } = req.body;

    // Validate required fields
    if (!title || !fabric_type || !price) {
      return res.status(400).json({ error: 'Title, fabric type, and price are required.' });
    }

    const id = uuidv4();

    // Handle image URL
    let image_url = '';
    if (req.file) {
      image_url = `/uploads/${req.file.filename}`;
    }

    const available = is_available !== undefined ? (is_available === 'true' || is_available === true ? 1 : 0) : 1;
    const qty = stock_quantity !== undefined ? parseInt(stock_quantity) || 0 : 0;

    run(
      'INSERT INTO products (id, title, fabric_type, collection_name, stock_quantity, price, description, image_url, is_available) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, title, fabric_type, collection_name || '', qty, parseFloat(price), description || '', image_url, available]
    );

    const product = queryOne('SELECT * FROM products WHERE id = ?', [id]);
    saveDB();
    appEmitter.emit('products_updated');

    res.status(201).json({
      message: 'Product created successfully',
      product
    });
  } catch (err) {
    console.error('Create product error:', err.message);
    res.status(500).json({ error: 'Failed to create product.' });
  }
});

// PUT /api/products/:id - Update product (Admin only)
router.put('/:id', verifyToken, requireAdmin, upload.single('image'), (req, res) => {
  try {
    const existing = queryOne('SELECT * FROM products WHERE id = ?', [req.params.id]);

    if (!existing) {
      return res.status(404).json({ error: 'Product not found.' });
    }

    const { title, fabric_type, collection_name, stock_quantity, price, description, is_available } = req.body;

    let image_url = existing.image_url;
    if (req.file) {
      image_url = `/uploads/${req.file.filename}`;
    }

    const available = is_available !== undefined ? (is_available === 'true' || is_available === true ? 1 : 0) : existing.is_available;

    run(
      'UPDATE products SET title = ?, fabric_type = ?, collection_name = ?, stock_quantity = ?, price = ?, description = ?, image_url = ?, is_available = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [
        title || existing.title,
        fabric_type || existing.fabric_type,
        collection_name !== undefined ? collection_name : existing.collection_name,
        stock_quantity !== undefined ? parseInt(stock_quantity) : existing.stock_quantity,
        price !== undefined ? parseFloat(price) : existing.price,
        description !== undefined ? description : existing.description,
        image_url,
        available,
        req.params.id
      ]
    );

    const updated = queryOne('SELECT * FROM products WHERE id = ?', [req.params.id]);
    saveDB();
    appEmitter.emit('products_updated');

    res.json({
      message: 'Product updated successfully',
      product: updated
    });
  } catch (err) {
    console.error('Update product error:', err.message);
    res.status(500).json({ error: 'Failed to update product.' });
  }
});

// DELETE /api/products/:id - Delete product (Admin only)
router.delete('/:id', verifyToken, requireAdmin, (req, res) => {
  try {
    const existing = queryOne('SELECT * FROM products WHERE id = ?', [req.params.id]);

    if (!existing) {
      return res.status(404).json({ error: 'Product not found.' });
    }

    run('DELETE FROM products WHERE id = ?', [req.params.id]);
    saveDB();
    appEmitter.emit('products_updated');

    res.json({ message: 'Product deleted successfully' });
  } catch (err) {
    console.error('Delete product error:', err.message);
    res.status(500).json({ error: 'Failed to delete product.' });
  }
});

module.exports = router;
