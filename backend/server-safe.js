const path = require('path');
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

require('dotenv').config();

const app = express();

const JWT_SECRET =
  process.env.JWT_SECRET ||
  'itemci_secret_123_gizli_anahtar';

// MIDDLEWARE
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// IN-MEMORY USER DATABASE (MongoDB yerine geçici olarak)
let users = [];

// TEST DATA
users.push({
  _id: '1',
  fullName: 'Kurucu Admin',
  email: 'admin@test.com',
  phone: '05001234567',
  username: 'admin',
  passwordHash: '$2a$10$YourHashedPasswordHere',
  role: 'admin'
});

// MongoDB kontrol et ama gerekli değil
let mongoConnected = false;
try {
  const mongoose = require('mongoose');
  const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/itemci';
  
  mongoose.connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  }).then(() => {
    console.log('✓ MongoDB connected');
    mongoConnected = true;
    // MongoDB'den users yükle
    const User = require('./models/User');
    User.find().then(dbUsers => {
      users = dbUsers;
      console.log(`✓ ${users.length} user MongoDB'den yüklendi`);
    });
  }).catch((err) => {
    console.log('⚠ MongoDB Error - In-memory database kullanılacak:', err.message);
    mongoConnected = false;
  });
} catch (e) {
  console.log('⚠ MongoDB Module Error - In-memory database kullanılacak');
}

// PORT
const PORT = 3000;

// STATUS ENDPOINT
app.get('/api/status', (req, res) => {
  res.json({
    status: 'ok',
    mongo: mongoConnected ? 'connected' : 'using memory',
    users: users.length
  });
});

// REGISTER
app.post('/api/auth/register', async (req, res) => {
  try {
    console.log("REGISTER REQUEST:", req.body);

    const {
      full_name,
      email,
      phone,
      username,
      password
    } = req.body;

    // Validation
    if (!full_name || !email || !phone || !username || !password) {
      return res.status(400).json({
        error: 'Tüm alanları doldurun.'
      });
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    const normalizedUsername = String(username).toLowerCase().trim();

    // Email control
    const emailExists = users.find(u => u.email === normalizedEmail);
    if (emailExists) {
      return res.status(409).json({
        error: 'Bu e-posta zaten kayıtlı.'
      });
    }

    // Username control
    const usernameExists = users.find(u => u.username === normalizedUsername);
    if (usernameExists) {
      return res.status(409).json({
        error: 'Bu kullanıcı adı kullanımda.'
      });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const user = {
      _id: String(Date.now()),
      fullName: full_name,
      email: normalizedEmail,
      phone: phone,
      username: normalizedUsername,
      passwordHash: passwordHash,
      createdAt: new Date()
    };

    // Save user
    users.push(user);
    console.log("USER SAVED:", user);

    // Generate token
    const token = jwt.sign(
      {
        id: user._id,
        email: user.email,
        username: user.username
      },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      message: 'Kayıt başarılı.',
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        username: user.username
      },
      token
    });

  } catch (error) {
    console.error("REGISTER ERROR:", error);
    res.status(500).json({
      error: 'Sunucu hatası: ' + error.message
    });
  }
});

// LOGIN
app.post('/api/auth/login', async (req, res) => {
  try {
    console.log("LOGIN REQUEST:", req.body);

    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({
        error: 'Kullanıcı adı/e-posta ve şifre gerekli.'
      });
    }

    const normalizedIdentifier = String(identifier).toLowerCase().trim();

    // Find user
    const user = users.find(u =>
      u.email === normalizedIdentifier || u.username === normalizedIdentifier
    );

    console.log("FOUND USER:", user ? user.username : "NOT FOUND");

    if (!user) {
      return res.status(401).json({
        error: 'Kullanıcı bulunamadı.'
      });
    }

    // Check password
    const passwordMatch = await bcrypt.compare(password, user.passwordHash);

    console.log("PASSWORD MATCH:", passwordMatch);

    if (!passwordMatch) {
      return res.status(401).json({
        error: 'Şifre yanlış.'
      });
    }

    // Generate token
    const token = jwt.sign(
      {
        id: user._id,
        email: user.email,
        username: user.username
      },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    console.log("LOGIN SUCCESS:", user.username);

    res.json({
      message: 'Giriş başarılı.',
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        username: user.username
      },
      token
    });

  } catch (error) {
    console.error("LOGIN ERROR:", error);
    res.status(500).json({
      error: 'Sunucu hatası: ' + error.message
    });
  }
});

// PRODUCTS
let inMemoryStorage = {
  products: []
};

app.get('/api/products', (req, res) => {
  res.json(inMemoryStorage.products);
});

app.post('/api/products', (req, res) => {
  inMemoryStorage.products.push(req.body);
  res.json({
    message: 'Product added'
  });
});

// STATIC FILES
app.use(
  express.static(
    path.join(__dirname, '../frodent')
  )
);

// ROUTES
app.get('/giris-yap', (req, res) => {
  res.sendFile(
    path.join(__dirname, '../frodent/login.html')
  );
});

app.get('/admin', (req, res) => {
  res.sendFile(
    path.join(__dirname, '../frodent/login.html')
  );
});

app.post('/admin', (req, res) => {
  res.status(405).json({ error: 'Method not allowed' });
});

app.get('/uyelik', (req, res) => {
  res.sendFile(
    path.join(__dirname, '../frodent/register.html')
  );
});

app.get('/', (req, res) => {
  res.sendFile(
    path.join(__dirname, '../frodent/index.html')
  );
});

// ERROR HANDLER
app.use((err, req, res, next) => {
  console.error('ERROR:', err);
  res.status(500).json({
    error: 'Server error',
    message: err.message
  });
});

// START SERVER
app.listen(PORT, () => {
  console.log(`\n╔════════════════════════════════════════╗`);
  console.log(`║   ItemCI Backend Server                ║`);
  console.log(`╚════════════════════════════════════════╝\n`);
  console.log(`✓ Backend çalışıyor: http://localhost:${PORT}`);
  console.log(`✓ Login: http://localhost:${PORT}/giris-yap`);
  console.log(`✓ Register: http://localhost:${PORT}/uyelik`);
  console.log(`✓ Status: http://localhost:${PORT}/api/status`);
  console.log(`\n✓ Şimdi tarayıcıda http://http://epinhesabim.com açabilirsin\n`);
});
