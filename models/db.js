const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, '..', 'rajshree_fashion.db');
let db = null;
let SQL = null;

function getDB() {
  return db;
}

async function initDB() {
  // Load sql.js WASM module
  SQL = await initSqlJs();

  // Load existing database or create new one
  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  // Enable WAL mode and foreign keys
  db.run('PRAGMA journal_mode=WAL');
  db.run('PRAGMA foreign_keys=ON');

  // Create tables
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'customer' CHECK(role IN ('customer', 'admin')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      fabric_type TEXT NOT NULL,
      collection_name TEXT DEFAULT '',
      stock_quantity INTEGER DEFAULT 0,
      price REAL NOT NULL,
      description TEXT DEFAULT '',
      image_url TEXT DEFAULT '',
      is_available INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Seed data if products table is empty
  const count = db.exec('SELECT COUNT(*) as count FROM products');
  const productCount = count.length > 0 ? count[0].values[0][0] : 0;

  if (productCount === 0) {
    seedData(db);
  }

  // Seed admin user if not exists
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@rajshreefashion.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
  const adminResult = db.exec(`SELECT id FROM users WHERE email = '${adminEmail}'`);
  if (adminResult.length === 0 || adminResult[0].values.length === 0) {
    const { v4: uuidv4 } = require('uuid');
    const hashedPassword = bcrypt.hashSync(adminPassword, 10);
    db.run('INSERT INTO users (id, name, email, password, role) VALUES (?, ?, ?, ?, ?)', 
      [uuidv4(), 'Admin', adminEmail, hashedPassword, 'admin']);
    console.log(`Admin user seeded: ${adminEmail}`);
  }

  // Save the database to disk
  saveDB();

  console.log('Database initialized successfully');
  return db;
}

function saveDB() {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
  }
}

function seedData(db) {
  const { v4: uuidv4 } = require('uuid');
  const products = [
    {
      id: uuidv4(),
      title: 'Embroidered Silk Suit',
      fabric_type: 'Silk Blend',
      collection_name: 'Festive Collection',
      stock_quantity: 15,
      price: 2899,
      description: 'Handcrafted semi-stitched suit in deep royal blue. Made from premium silk blend with intricate zari embroidery. Perfect for weddings and festive occasions.',
      image_url: 'https://images.unsplash.com/photo-1583391733958-d25e07fac661?w=800&q=80',
      is_available: 1
    },
    {
      id: uuidv4(),
      title: 'Pastel Cotton Summer Suit',
      fabric_type: 'Pure Cotton',
      collection_name: 'Summer Essentials',
      stock_quantity: 20,
      price: 1999,
      description: 'Lightweight pastel cotton suit with a relaxed fit. Features natural breathable fabric perfect for summer and daily wear.',
      image_url: 'https://images.unsplash.com/photo-1617260551069-45f899e32a67?w=800&q=80',
      is_available: 1
    },
    {
      id: uuidv4(),
      title: 'Navy Floral Print Suit',
      fabric_type: 'Georgette',
      collection_name: 'Everyday Elegance',
      stock_quantity: 12,
      price: 1499,
      description: 'Classic navy floral suit crafted from soft georgette. Features delicate prints and a modern A-line silhouette.',
      image_url: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=800&q=80',
      is_available: 1
    },
    {
      id: uuidv4(),
      title: 'Charcoal Anarkali Suit',
      fabric_type: 'Chanderi Silk',
      collection_name: 'Premium Collection',
      stock_quantity: 8,
      price: 4599,
      description: 'Luxurious charcoal Anarkali suit in chanderi silk. Signature Rajshree design with beautiful flare and hand-finished borders.',
      image_url: 'https://images.unsplash.com/photo-1509631179647-0c114cbab000?w=800&q=80',
      is_available: 1
    },
    {
      id: uuidv4(),
      title: 'Burgundy Velvet Suit',
      fabric_type: 'Premium Velvet',
      collection_name: 'Evening Wear',
      stock_quantity: 10,
      price: 3299,
      description: 'Sumptuous burgundy velvet suit with golden sequin work. A statement piece for evening events and winter celebrations.',
      image_url: 'https://images.unsplash.com/photo-1539008835657-9e8e9680c956?w=800&q=80',
      is_available: 1
    },
    {
      id: uuidv4(),
      title: 'Beige Casual Suit',
      fabric_type: 'Cotton Twill',
      collection_name: 'Casual Luxury',
      stock_quantity: 18,
      price: 1599,
      description: 'Versatile beige suit in premium cotton. Features a simple yet elegant neck design for a refined casual look.',
      image_url: 'https://images.unsplash.com/photo-1502716115624-b565e0990d9b?w=800&q=80',
      is_available: 1
    },
    {
      id: uuidv4(),
      title: 'Black Partywear Suit',
      fabric_type: 'Crepe Silk',
      collection_name: 'Heritage Collection',
      stock_quantity: 25,
      price: 3999,
      description: 'The quintessential black suit in crepe silk. Minimalist yet striking, a timeless masterpiece of traditional tailoring.',
      image_url: 'https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=800&q=80',
      is_available: 1
    },
    {
      id: uuidv4(),
      title: 'Dusty Rose Designer Suit',
      fabric_type: 'Silk Blend',
      collection_name: 'Wedding Collection',
      stock_quantity: 6,
      price: 3799,
      description: 'Romantic dusty rose suit with heavy neck embroidery. Designed for the modern woman who values both tradition and contemporary style.',
      image_url: 'https://images.unsplash.com/photo-1515347619252-c8e62243d5bb?w=800&q=80',
      is_available: 1
    }
  ];

  const insertStmt = db.prepare(`
    INSERT INTO products (id, title, fabric_type, collection_name, stock_quantity, price, description, image_url, is_available)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const p of products) {
    insertStmt.run([p.id, p.title, p.fabric_type, p.collection_name, p.stock_quantity, p.price, p.description, p.image_url, p.is_available]);
  }
  insertStmt.free();

  console.log(`Seed data inserted: ${products.length} luxury products`);
}

// Helper: Run a query that returns all rows as objects
function queryAll(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const results = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

// Helper: Run a query that returns a single row as object
function queryOne(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const result = stmt.step() ? stmt.getAsObject() : null;
  stmt.free();
  return result;
}

// Helper: Run a statement (does NOT auto-save — call saveDB() explicitly after a batch of writes)
function run(sql, params = []) {
  db.run(sql, params);
}

module.exports = { getDB, initDB, saveDB, queryAll, queryOne, run };
