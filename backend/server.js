require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');

const User = require('./models/User');
const Product = require('./models/Product');
const Message = require('./models/Message');
const Notification = require('./models/Notification');
const Order = require('./models/Order');
const Withdrawal = require('./models/Withdrawal');

const upload = require('./config/multer');

// NEW MODULAR AUTH SYSTEM
const authService = require('./services/authService');
const authRoutes = require('./routes/auth');
const globalErrorHandler = require('./middleware/errorHandler');

const app = express();
const JWT_SECRET = process.env.JWT_SECRET || 'itemci_secret_123_gizli_anahtar';

// --- GÜNCELLENMİŞ YETKİ KONTROLÜ ---
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token gerekli.' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Geçersiz token.' });
  }
};

// Bu fonksiyon artık hem 'admin'i hem de 'super_admin'i kabul ediyor
const verifyAdmin = (req, res, next) => {
  verifyToken(req, res, () => {
    // Eğer rol admin VEYA super_admin ise izin ver
    if (req.user && (req.user.role === 'admin' || req.user.role === 'super_admin')) {
      next();
    } else {
      return res.status(403).json({ error: 'Admin yetkisi yok.' });
    }
  });
};

// Sadece super_admin erişebilir
const verifySuperAdmin = (req, res, next) => {
  verifyToken(req, res, () => {
    if (req.user && req.user.role === 'super_admin') {
      next();
    } else {
      return res.status(403).json({ error: 'Sadece super_admin erişebilir.' });
    }
  });
};
// ------------------------------------

app.use(cors({
  origin: function (origin, callback) {
    callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ── CATEGORY NORMALIZATION HELPERS ──
function normalizeCategorySlug(name) {
  if (!name) return 'genel';
  const trMap = { ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u', Ç: 'C', Ğ: 'G', İ: 'I', Ö: 'O', Ş: 'S', Ü: 'U' };
  return name
    .replace(/[çğıöşüÇĞİÖŞÜ]/g, ch => trMap[ch] || ch)
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function normalizeCategoryName(name) {
  if (!name) return 'Genel';
  return name.trim().replace(/^\w/, c => c.toUpperCase());
}

async function normalizeExistingProducts() {
  try {
    if (mongoConnected) {
      const products = await Product.find({ $or: [{ categorySlug: { $exists: false } }, { categorySlug: '' }] }).lean();
      for (const p of products) {
        const slug = normalizeCategorySlug(p.category);
        const name = normalizeCategoryName(p.category);
        await Product.updateOne({ _id: p._id }, { $set: { categorySlug: slug, categoryName: name } });
      }
      console.log(`Normalized ${products.length} products.`);
    }
    // in-memory fallback
    inMemoryStorage.products.forEach(p => {
      if (!p.categorySlug) {
        p.categorySlug = normalizeCategorySlug(p.category);
        p.categoryName = normalizeCategoryName(p.category);
      }
    });
  } catch (err) {
    console.error('Normalize error:', err);
  }
}

// MEMORY DATABASE
let users = [];
users.push({

  _id: '1',

  fullName: 'Kurucu Admin',

  email: 'admin@test.com',

  phone: '05001234567',

  username: 'admin',

  passwordHash: '$2a$10$N9qo8uLOickgx2ZMRZoMy.Mrq5uOfV7lH7W6MZ8JrIoVNewc19h7K',

  role: 'admin',

  createdAt: new Date()

});

// PRODUCTS
let inMemoryStorage = {
products: []
};

// MONGODB
let mongoConnected = false;


try {

const mongoose = require('mongoose');

const MONGO_URI =
process.env.MONGO_URI ||
'mongodb://127.0.0.1:27017/itemci';



mongoose.connect(MONGO_URI)
.then(async () => {

  console.log('✓ MongoDB connected');

  mongoConnected = true;

  // Normalize existing products without categorySlug
  await normalizeExistingProducts();

  const dbUsers =
    await User.find();

  users = dbUsers;

  // Ensure hardcoded admin user exists
  const adminExists = users.find(u => u.username === 'admin');
  if (!adminExists) {
    users.push({
      _id: '1',
      fullName: 'Kurucu Admin',
      email: 'admin@test.com',
      phone: '05001234567',
      username: 'admin',
      passwordHash: '$2a$10$N9qo8uLOickgx2ZMRZoMy.Mrq5uOfV7lH7W6MZ8JrIoVNewc19h7K',
      role: 'admin',
      createdAt: new Date()
    });
  }

  // Initialize new modular auth service
  authService.setUsers(users);
  authService.setMongoStatus(true);
  authService.setUserModel(User);
  console.log('✓ Auth service initialized');

  console.log(`✓ ${users.length} kullanıcı yüklendi`);

})
.catch((err) => {

  console.log('⚠ MongoDB bağlantı hatası');

  mongoConnected = false;

  // Initialize auth service with memory-only users
  authService.setUsers(users);
  authService.setMongoStatus(false);
  authService.setUserModel(User);

});

} catch (e) {

console.log('⚠ MongoDB module bulunamadı');

}

// STATUS
app.get('/api/status', (req, res) => {

res.json({

status: 'ok',

mongo: mongoConnected,

users: users.length

});

});

// REGISTER
app.post('/api/auth/register', async (req, res) => {

try {

console.log("REGISTER BODY:", req.body);

const {
  full_name,
  email,
  phone,
  username,
  password
} = req.body;

if (
  !full_name ||
  !email ||
  !phone ||
  !username ||
  !password
) {

  return res.status(400).json({
    error: 'Tüm alanları doldurun.'
  });

}

const normalizedEmail =
  String(email).toLowerCase().trim();

const normalizedUsername =
  String(username).toLowerCase().trim();

// EMAIL CHECK

const emailExists =
  users.find(
    u => u.email === normalizedEmail
  );

if (emailExists) {

  return res.status(409).json({
    error: 'Bu e-posta zaten kayıtlı.'
  });

}

// USERNAME CHECK

const usernameExists =
  users.find(
    u => u.username === normalizedUsername
  );

if (usernameExists) {

  return res.status(409).json({
    error: 'Bu kullanıcı adı kullanımda.'
  });

}

// HASH PASSWORD

const passwordHash =
  await bcrypt.hash(password, 10);

// CREATE USER

let userObj = {
  role: 'user',
  status: 'active',
  _id: String(Date.now()),

  fullName: full_name,

  email: normalizedEmail,

  phone: phone,

  username: normalizedUsername,

  passwordHash: passwordHash,

  createdAt: new Date()

};

// MEMORY SAVE

users.push(userObj);

// MONGO SAVE

if (mongoConnected && User) {

  try {

    const mongoUser = new User({

      fullName: full_name,

      email: normalizedEmail,

      phone: phone,

      username: normalizedUsername,

      passwordHash: passwordHash,

      role: 'user',

      status: 'active'

    });

    await mongoUser.save();

    userObj._id = mongoUser._id;

    console.log("✓ MongoDB user saved");

  } catch (mongoErr) {

    console.log("⚠ Mongo save failed");

  }

}

// TOKEN

const token = jwt.sign(

  {

    id: userObj._id,

    email: userObj.email,

    username: userObj.username

  },

  JWT_SECRET,

  {

    expiresIn: '30d'

  }

);

// SEND WELCOME MESSAGE AND NOTIFICATION
if (mongoConnected && Message && Notification) {
  try {
    const welcomeMsg = "🎉 Hoşgeldin! Platforma başarıyla kayıt oldunuz.";
    
    const message = new Message({
      senderId: "system",
      receiverId: userObj._id,
      message: welcomeMsg,
      type: "system",
      read: false
    });
    await message.save();

    const notification = new Notification({
      userId: userObj._id,
      message: welcomeMsg,
      type: "system",
      read: false
    });
    await notification.save();

    console.log("✓ Welcome message sent to user");
  } catch (err) {
    console.log("⚠ Welcome message error:", err.message);
  }
}

res.json({

  message: 'Kayıt başarılı.',

  user: {

    id: userObj._id,

    fullName: userObj.fullName,

    email: userObj.email,

    username: userObj.username

  },

  token

});

} catch (error) {

console.error("REGISTER ERROR:", error);

res.status(500).json({

  error: 'Sunucu hatası.'

});

}

});

// LOGIN
app.post('/api/auth/login', async (req, res) => {

try {

console.log("LOGIN BODY:", req.body);

const {
  identifier,
  password
} = req.body;

if (!identifier || !password) {

  return res.status(400).json({

    error: 'Kullanıcı adı/e-posta ve şifre gerekli.'

  });

}

const normalizedIdentifier =
  String(identifier)
    .toLowerCase()
    .trim();

// FIND USER

const user =
  users.find(

    u =>
      u.email === normalizedIdentifier ||
      u.username === normalizedIdentifier

  );

if (!user) {

  return res.status(401).json({

    error: 'Kullanıcı bulunamadı.'

  });

}

if (user.status === 'banned') {
  return res.status(403).json({
    error: 'Hesabınız engellenmiştir.'
  });
}

// CHECK PASSWORD

const passwordMatch =
  await bcrypt.compare(
    password,
    user.passwordHash
  );

if (!passwordMatch) {

  return res.status(401).json({

    error: 'Şifre yanlış.'

  });

}

// TOKEN

const token = jwt.sign(

  {

    id: user._id,

    email: user.email,

    username: user.username

  },

  JWT_SECRET,

  {

    expiresIn: '30d'

  }

);

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

  error: 'Sunucu hatası.'

});

}

});
app.post('/api/admin/login', async (req, res) => {
if (!mongoConnected) {

  return res.status(500).json({
    error: 'MongoDB bağlantısı yok.'
  });

}
  try {

    const { identifier, password } = req.body;

    if (!identifier || !password) {

      return res.status(400).json({
        error: 'Bilgiler gerekli.'
      });

    }

    const normalizedIdentifier =
    String(identifier).toLowerCase().trim();

    const user = await User.findOne({

  $or: [

    { email: normalizedIdentifier },
    { username: normalizedIdentifier }

  ]

});

    if (!user) {

      return res.status(401).json({
        error: 'Admin bulunamadı.'
      });

    }

    // ADMIN CONTROL (admin veya super_admin)
    if (user.role !== 'admin' && user.role !== 'super_admin') {

      return res.status(403).json({
        error: 'Admin yetkisi yok.'
      });

    }

    const passwordMatch =
    await bcrypt.compare(
      password,
      user.passwordHash
    );

    if (!passwordMatch) {

      return res.status(401).json({
        error: 'Şifre yanlış.'
      });

    }

    const token = jwt.sign({

      id: user._id,
      email: user.email,
      username: user.username,
      role: user.role

    },
    JWT_SECRET,
    {
      expiresIn: '30d'
    });

    res.json({

      success: true,

      token,

      user: {

        id: user._id,
        username: user.username,
        role: user.role

      }

    });

  } catch (error) {

    res.status(500).json({
      error: error.message
    });

  }

});
app.get('/api/admin/pending-products', verifyAdmin, async(req,res)=>{

try{

const products=
await Product.find({

status:'pending'

});

res.json(products);

}catch(err){

res.status(500).json({

error:'İlanlar alınamadı'

});

}

});

app.get('/api/admin/products', verifyAdmin, async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    res.json(products);
  } catch (err) {
    console.error('Admin products load error:', err);
    res.status(500).json({ error: 'İlanlar alınamadı.' });
  }
});

app.get('/api/admin/product/:id', verifyAdmin, async (req, res) => {
  try {
    let product = null;
    if (mongoose.Types.ObjectId.isValid(req.params.id)) {
      product = await Product.findById(req.params.id);
    }

    if (!product) {
      return res.status(404).json({ error: 'İlan bulunamadı.' });
    }

    res.json(product);
  } catch (err) {
    res.status(500).json({ error: 'İlan alınamadı.' });
  }
});

app.put('/api/admin/approve-product/:id', verifyAdmin, async(req,res)=>{

try{

const product = await Product.findByIdAndUpdate(

req.params.id,

{

status:'approved',
saleStatus:'available'

},

{ new: true }

);

if (!product) {
  return res.status(404).json({ error: 'İlan bulunamadı.' });
}

res.json({

success:true,
product

});

}catch(err){

res.status(500).json({

error:'Onay başarısız'

});

}

});

app.put('/api/admin/reject-product/:id', verifyAdmin, async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, { status: 'rejected' }, { new: true });
    if (!product) {
      return res.status(404).json({ error: 'İlan bulunamadı.' });
    }
    res.json({ success: true, product });
  } catch (err) {
    res.status(500).json({ error: 'Reddetme işlemi başarısız.' });
  }
});

app.put('/api/admin/product-status/:id', verifyAdmin, async (req, res) => {
  try {
    const { status, saleStatus } = req.body;
    const update = {};

    if (typeof status !== 'undefined') {
      const allowedStatuses = ['pending', 'approved', 'rejected'];
      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({ error: 'Geçersiz ilan onay durumu.' });
      }
      update.status = status;
    }

    if (typeof saleStatus !== 'undefined') {
      const allowedSaleStatuses = ['available', 'reserved', 'sold'];
      if (!allowedSaleStatuses.includes(saleStatus)) {
        return res.status(400).json({ error: 'Geçersiz ilan satış durumu.' });
      }
      update.saleStatus = saleStatus;
    }

    const product = await Product.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!product) {
      return res.status(404).json({ error: 'İlan bulunamadı.' });
    }

    res.json({ success: true, product });
  } catch (err) {
    console.error('Product status update error:', err);
    res.status(500).json({ error: 'İlan durumu güncellenemedi.' });
  }
});

app.get('/api/admin/users', verifyAdmin, async (req, res) => {
  try {
    const allUsers = await User.find()
      .select('_id fullName username email role status balance createdAt')
      .sort({ createdAt: -1 });
    res.json(allUsers);
  } catch (err) {
    console.error('Admin users load error:', err);
    res.status(500).json({ error: 'Kullanıcılar alınamadı.' });
  }
});

app.put('/api/admin/ban-user/:id', verifyAdmin, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.params.id, { status: 'banned' });
    res.json({ success: true });
  } catch (err) {
    console.error('Ban user error:', err);
    res.status(500).json({ error: 'Kullanıcı banlanamadı.' });
  }
});

app.put('/api/admin/user/:id', verifyAdmin, async (req, res) => {
  try {
    console.log('ADMIN PUT /user/:id - params:', req.params.id, 'body:', req.body);
    const update = {};
    if (typeof req.body.balance !== 'undefined') {
      const balance = Number(req.body.balance);
      if (!Number.isNaN(balance)) update.balance = balance;
    }
    if (typeof req.body.status !== 'undefined') {
      const allowedStatuses = ['active', 'pending', 'banned'];
      if (allowedStatuses.includes(req.body.status)) update.status = req.body.status;
    }

    const user = await User.findByIdAndUpdate(req.params.id, update, { returnDocument: 'after' })
      .select('_id fullName username email role status balance createdAt');

    if (!user) {
      return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
    }

    console.log('ADMIN PUT /user/:id - updated user balance:', user.balance);
    res.json({ success: true, user });
  } catch (err) {
    console.error('Update user error:', err);
    res.status(500).json({ error: 'Kullanıcı güncellenemedi.' });
  }
});

app.delete('/api/admin/user/:id', verifyAdmin, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error('Delete user error:', err);
    res.status(500).json({ error: 'Kullanıcı silinemedi.' });
  }
});

app.get('/api/admin/verifications', verifyAdmin, async (req, res) => {
  try {
    const verificationUsers = await User.find({ verificationStatus: 'pending' })
      .select('_id fullName username email phone verificationStatus verificationImage verificationSubmittedAt')
      .sort({ verificationSubmittedAt: -1 });
    res.json(verificationUsers);
  } catch (err) {
    console.error('Admin verifications load error:', err);
    res.status(500).json({ error: 'Hesap onay talepleri alınamadı.' });
  }
});

app.put('/api/admin/verifications/:id', verifyAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Geçerli bir onay durumu gönderin.' });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      {
        verificationStatus: status,
        verificationReviewedAt: new Date()
      },
      { returnDocument: 'after' }
    ).select('_id fullName username email phone verificationStatus verificationImage verificationSubmittedAt verificationReviewedAt');

    if (!user) return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
    res.json({ success: true, user });
  } catch (err) {
    console.error('Admin verification update error:', err);
    res.status(500).json({ error: 'Hesap onay durumu güncellenemedi.' });
  }
});

app.get('/api/admin/orders', verifyAdmin, async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 }).limit(20);
    const totalRevenue = orders.reduce((sum, order) => sum + (order.price || 0), 0);
    const completedCount = orders.filter(order => order.status === 'completed').length;
    const pendingCount = orders.filter(order => order.status === 'pending').length;

    res.json({
      orders,
      summary: {
        totalOrders: orders.length,
        completedCount,
        pendingCount,
        totalRevenue
      }
    });
  } catch (err) {
    console.error('Admin orders error:', err);
    res.status(500).json({ error: 'Siparişler alınamadı.' });
  }
});

app.get('/api/admin/dashboard-summary', verifyAdmin, async (req, res) => {
  try {
    const usersCount = await User.countDocuments();
    const pendingProductsCount = await Product.countDocuments({ status: 'pending' });
    const approvedProductsCount = await Product.countDocuments({ status: 'approved' });
    const totalOrders = await Order.countDocuments();
    const pendingOrders = await Order.countDocuments({ status: 'pending' });
    const unreadNotifications = await Notification.countDocuments({ read: false });
    const ticketCount = await Message.countDocuments({ type: 'user', read: false });
    const categoryCount = (await Product.distinct('category')).length;

    const recentUsers = await User.find()
      .select('_id username email role status createdAt')
      .sort({ createdAt: -1 })
      .limit(4);

    const recentLogs = await Notification.find()
      .sort({ createdAt: -1 })
      .limit(4);

    res.json({
      usersCount,
      pendingProductsCount,
      approvedProductsCount,
      totalOrders,
      pendingOrders,
      unreadNotifications,
      ticketCount,
      categoryCount,
      recentUsers,
      recentLogs
    });
  } catch (err) {
    console.error('Dashboard summary error:', err);
    res.status(500).json({ error: 'Özet verileri alınamadı.' });
  }
});

app.get('/api/admin/system-summary', verifyAdmin, async (req, res) => {
  try {
    const ticketCount = await Message.countDocuments({ type: 'user', read: false });
    const reportCount = await Message.countDocuments({ type: 'system', read: false });
    const categoryCount = (await Product.distinct('category')).length;
    const pendingProductsCount = await Product.countDocuments({ status: 'pending' });

    res.json({
      ticketCount,
      reportCount,
      drawCount: 0,
      boxCount: 0,
      categoryCount,
      couponCount: 0,
      commissionRate: 15,
      pendingProductsCount
    });
  } catch (err) {
    console.error('System summary error:', err);
    res.status(500).json({ error: 'Sistem verileri alınamadı.' });
  }
});

app.get('/api/admin/security-events', verifyAdmin, async (req, res) => {
  try {
    const recentNotifications = await Notification.find()
      .sort({ createdAt: -1 })
      .limit(6);

    const eventRows = recentNotifications.map(n => ({
      title: n.message,
      time: n.createdAt,
      type: n.type
    }));

    const adminCount = await User.countDocuments({ role: 'admin' });
    const bannedCount = await User.countDocuments({ status: 'banned' });
    const securityAlerts = await Notification.countDocuments({ type: 'system', read: false });

    res.json({
      adminCount,
      bannedCount,
      securityAlerts,
      events: eventRows
    });
  } catch (err) {
    console.error('Security events error:', err);
    res.status(500).json({ error: 'Güvenlik olayları alınamadı.' });
  }
});

// In-memory settings store (replace with DB collection for persistence)
let adminSettings = {
  maintenanceMode: false,
  emailNotifications: true,
  announcementVisible: true,
  promotionsEnabled: false,
  commissionRate: 5,
  siteTitle: 'ITEMCI',
  contactEmail: 'destek@itemci.com'
};

app.get('/api/admin/settings', verifyAdmin, async (req, res) => {
  res.json(adminSettings);
});

app.put('/api/admin/settings', verifyAdmin, async (req, res) => {
  try {
    const updates = req.body;
    adminSettings = { ...adminSettings, ...updates };
    res.json({ success: true, settings: adminSettings });
  } catch (err) {
    res.status(500).json({ error: 'Ayarlar güncellenemedi.' });
  }
});

// PRODUCTS
app.get('/api/products', async (req, res) => {
  try {
    if (mongoConnected) {
      const products = await Product.find({ status: 'approved' }).sort({ createdAt: -1 }).lean();
      const mappedProducts = products.map((product) => ({
        ...product,
        id: product._id
      }));
      return res.json(mappedProducts);
    }

    return res.json(inMemoryStorage.products);
  } catch (err) {
    console.error('Ürünler alınırken hata:', err);
    res.status(500).json({ error: 'Ürünler alınamadı.' });
  }
});

app.get('/api/listings', async (req, res) => {
  try {
    const { category, sort = 'createdAt', order = 'desc', page = 1, limit = 20 } = req.query;
    const query = { status: 'approved' };
    if (category) {
      query.categorySlug = normalizeCategorySlug(category);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortObj = {};
    sortObj[sort] = order === 'asc' ? 1 : -1;

    if (mongoConnected) {
      const [products, total] = await Promise.all([
        Product.find(query).sort(sortObj).skip(skip).limit(parseInt(limit)).lean(),
        Product.countDocuments(query)
      ]);
      return res.json({
        listings: products.map(p => ({ ...p, id: p._id })),
        pagination: { page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / parseInt(limit)) }
      });
    }

    let filtered = inMemoryStorage.products.filter(p => p.status === 'approved');
    if (category) filtered = filtered.filter(p => p.categorySlug === normalizeCategorySlug(category));
    return res.json({ listings: filtered, pagination: { page: 1, limit: filtered.length, total: filtered.length, totalPages: 1 } });
  } catch (err) {
    console.error('Listings error:', err);
    res.status(500).json({ error: 'İlanlar alınamadı.' });
  }
});

app.get('/api/my-products/:sellerId', async (req, res) => {
  try {
    const { sellerId } = req.params;
    if (!sellerId) {
      return res.status(400).json({ error: 'Satıcı bilgisi gerekli.' });
    }

    if (mongoConnected) {
      const products = await Product.find({ sellerId }).sort({ createdAt: -1 }).lean();
      return res.json(products.map((product) => ({
        ...product,
        id: product._id
      })));
    }

    return res.json(inMemoryStorage.products.filter((item) => String(item.sellerId) === String(sellerId)));
  } catch (err) {
    console.error('Kullanıcı ilanları alınırken hata:', err);
    res.status(500).json({ error: 'Kullanıcı ilanları alınamadı.' });
  }
});

app.get('/api/products/:productId', async (req, res) => {
  try {
    const { productId } = req.params;

    if (mongoConnected) {
      let product = null;
      if (mongoose.Types.ObjectId.isValid(productId)) {
        product = await Product.findById(productId).lean();
      }

      if (!product) {
        const slugParts = productId
          .toLowerCase()
          .split(/[-_]/)
          .filter((part) => /[a-zA-Z]/.test(part));
        if (slugParts.length > 0) {
          const slugSearch = slugParts.map(escapeRegex).join('.*');
          product = await Product.findOne({
            title: { $regex: slugSearch, $options: 'i' }
          }).lean();
        }
      }

      if (!product) {
        return res.status(404).json({ error: 'İlan bulunamadı.' });
      }

      return res.json({
        ...product,
        id: product._id
      });
    }

    const product = inMemoryStorage.products.find((item) => String(item.id) === String(productId));
    if (!product) {
      return res.status(404).json({ error: 'İlan bulunamadı.' });
    }

    res.json(product);
  } catch (err) {
    console.error('Ürün detayı alınırken hata:', err);
    res.status(500).json({ error: 'Ürün detayı alınamadı.' });
  }
});

app.get('/api/seller/:sellerId', async (req, res) => {
  try {
    const { sellerId } = req.params;
    if (!sellerId) return res.status(400).json({ error: 'Satıcı ID gerekli.' });

    if (mongoConnected) {
      const user = await User.findById(sellerId)
        .select('_id fullName username avatar createdAt')
        .lean();
      if (!user) return res.status(404).json({ error: 'Satıcı bulunamadı.' });

      const productCount = await Product.countDocuments({ sellerId });

      return res.json({
        _id: user._id,
        fullName: user.fullName,
        username: user.username,
        avatar: user.avatar || '',
        createdAt: user.createdAt,
        productCount
      });
    }

    const seller = users.find(u => String(u._id) === String(sellerId));
    if (!seller) return res.status(404).json({ error: 'Satıcı bulunamadı.' });

    const productCount = inMemoryStorage.products.filter(p => String(p.sellerId) === String(sellerId)).length;

    res.json({
      _id: seller._id,
      fullName: seller.fullName,
      username: seller.username,
      avatar: seller.avatar || '',
      createdAt: seller.createdAt,
      productCount
    });
  } catch (err) {
    console.error('Satıcı bilgisi alınırken hata:', err);
    res.status(500).json({ error: 'Satıcı bilgisi alınamadı.' });
  }
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

app.get('/uyelik', (req, res) => {

res.sendFile(
path.join(__dirname, '../frodent/register.html')
);

});
app.get('/ilan-olustur', (req,res)=>{

res.sendFile(
path.join(__dirname,'../frodent/ilan-olustur.html')
);

});

app.get('/ilan/:id', (req, res) => {
  res.sendFile(
    path.join(__dirname, '../frodent/ilan-detay.html')
  );
});

app.get('/', (req, res) => {

res.sendFile(
path.join(__dirname, '../frodent/index.html')
);

});
app.get('/admin-dashboard.html', (req,res)=>{

res.sendFile(
path.join(__dirname,'../frodent/admin-dashboard.html')
);

});

app.get('/giris', (req, res) => {

res.sendFile(
path.join(__dirname, '../frodent/login.html')
);

});

app.get('/kayit-ol', (req, res) => {

res.sendFile(
path.join(__dirname, '../frodent/register.html')
);

});

app.get('/admin', (req, res) => {

res.sendFile(
path.join(__dirname, '../frodent/admin-login.html')
);

});

app.get('/dashboard', (req, res) => {

res.sendFile(
path.join(__dirname, '../frodent/admin-dashboard2.html')
);

});

app.post('/api/user/verification', verifyToken, upload.single('image'), async (req, res) => {
  try {
    const imageUrl = req.file?.path || req.file?.secure_url || req.file?.url;
    if (!imageUrl) {
      return res.status(400).json({ error: 'Kimlik görseli yüklenemedi.' });
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      {
        verificationStatus: 'pending',
        verificationImage: imageUrl,
        verificationSubmittedAt: new Date(),
        verificationReviewedAt: null
      },
      { returnDocument: 'after' }
    ).select('_id fullName username email phone balance role status verificationStatus verificationImage verificationSubmittedAt');

    if (!user) return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
    res.json({ success: true, message: 'Hesap onay talebiniz alındı.', user });
  } catch (err) {
    console.error('Verification submit error:', err);
    res.status(500).json({ error: 'Hesap onay talebi gönderilemedi.' });
  }
});

app.post(
'/api/products/create',
upload.single('image'),
async(req,res)=>{

try{

const {

title,
price,
description,
sellerId,
sellerName

}=req.body;

const categories=[

'Valorant',
'CS2',
'PUBG',
'Steam',
'Fortnite',
'League of Legends',
'Metin2',
'Knight Online',
'Mobile Legends',
'Instagram',
'Netflix',
'Discord'

];

const text=
(title+" "+description)
.toLowerCase();

let category='Genel';

for(const cat of categories){

if(text.includes(cat.toLowerCase())){

category=cat;
break;

}

}

const categorySlug = normalizeCategorySlug(category);
const categoryName = normalizeCategoryName(category);

const imagePath = req.file ? req.file.path : req.body.imageUrl;

if (!imagePath) {
    return res.status(400).json({
        error: 'Lütfen bir resim sağlayın.'
    });
}

const product=
new Product({

title,
price,
description,

image: imagePath,

sellerId,
sellerName,

category,
categorySlug,
categoryName,

status:'pending',

saleStatus: 'available'

});

await product.save();

res.json({

success:true,
message:'İlan onaya gönderildi.'

});

}catch(err){

console.log(err);

res.status(500).json({

error:'İlan oluşturulamadı'

});

}

});

// ========== MESSAGE ENDPOINTS ==========


// GET ALL USERS (for messaging system)
app.get('/api/users', verifyToken, async (req, res) => {
  try {
    const currentUserId = req.user.id;
    
    // Fetch all users except current user
    const users = await User.find({ _id: { $ne: currentUserId } })
      .select('_id fullName username email')
      .limit(100);

    res.json(users);
  } catch (err) {
    console.error('Kullanıcılar alınırken hata:', err);
    res.status(500).json({ error: 'Kullanıcılar alınamadı.' });
  }
});

// GET MESSAGES FOR USER
app.get('/api/messages/:userId', verifyToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const messages = await Message.find({
      $or: [
        { receiverId: userId },
        { senderId: userId }
      ]
    }).sort({ createdAt: -1 });

    res.json(messages);
  } catch (err) {
    console.error('Mesajlar alınırken hata:', err);
    res.status(500).json({ error: 'Mesajlar alınamadı.' });
  }
});

// SEND MESSAGE
app.post('/api/messages/send', verifyToken, async (req, res) => {
  try {
    const { receiverId, message, type } = req.body;
    const senderId = req.user.id;

    if (!receiverId || !message) {
      return res.status(400).json({ error: 'Alıcı ve mesaj gerekli.' });
    }

    if (type && !['user', 'system'].includes(type)) {
      return res.status(400).json({ error: 'Geçersiz mesaj tipi.' });
    }

    const newMessage = new Message({
      senderId,
      receiverId,
      message,
      type: type || 'user',
      read: false
    });

    await newMessage.save();

    res.status(201).json({
      success: true,
      message: newMessage
    });
  } catch (err) {
    console.error('Mesaj gönderirken hata:', err);
    res.status(500).json({ error: 'Mesaj gönderilemedi.' });
  }
});

// MARK MESSAGE AS READ
app.patch('/api/messages/:messageId/read', verifyToken, async (req, res) => {
  try {
    const { messageId } = req.params;
    const message = await Message.findByIdAndUpdate(
      messageId,
      { read: true },
      { new: true }
    );

    if (!message) {
      return res.status(404).json({ error: 'Mesaj bulunamadı.' });
    }

    res.json({ success: true, message });
  } catch (err) {
    console.error('Mesaj güncellenirken hata:', err);
    res.status(500).json({ error: 'İşlem başarısız.' });
  }
});

// GET UNREAD MESSAGE COUNT
app.get('/api/messages/unread-count', verifyToken, async (req, res) => {
  try {
    const count = await Message.countDocuments({ receiverId: req.user.id, read: false });
    res.json({ success: true, unread_count: count });
  } catch (err) {
    console.error('Okunmamış mesaj sayısı hatası:', err);
    res.status(500).json({ error: 'Mesaj sayısı alınamadı.' });
  }
});

// ========== NOTIFICATION ENDPOINTS ==========

// GET NOTIFICATIONS FOR USER
app.get('/api/notifications/:userId', verifyToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const notifications = await Notification.find({ userId }).sort({ createdAt: -1 });

    res.json(notifications);
  } catch (err) {
    console.error('Bildirimler alınırken hata:', err);
    res.status(500).json({ error: 'Bildirimler alınamadı.' });
  }
});

// GET UNREAD NOTIFICATION COUNT
app.get('/api/notifications/:userId/unread-count', verifyToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const count = await Notification.countDocuments({ userId, read: false });

    res.json({ unreadCount: count });
  } catch (err) {
    console.error('Bildirim sayısı alınırken hata:', err);
    res.status(500).json({ error: 'İşlem başarısız.' });
  }
});

// MARK NOTIFICATION AS READ
app.patch('/api/notifications/:notificationId/read', verifyToken, async (req, res) => {
  try {
    const { notificationId } = req.params;
    const notification = await Notification.findByIdAndUpdate(
      notificationId,
      { read: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ error: 'Bildirim bulunamadı.' });
    }

    res.json({ success: true, notification });
  } catch (err) {
    console.error('Bildirim güncellenirken hata:', err);
    res.status(500).json({ error: 'İşlem başarısız.' });
  }
});

// CREATE NOTIFICATION (Internal use)
const createNotification = async (userId, message, type = 'system') => {
  try {
    const notification = new Notification({
      userId,
      message,
      type,
      read: false
    });
    await notification.save();
    return notification;
  } catch (err) {
    console.error('Bildirim oluşturulurken hata:', err);
  }
};

// GET CURRENT USER
app.get('/api/auth/me', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    let user;
    if (mongoConnected) {
      user = await User.findById(userId).select('_id fullName username email phone bio avatar balance role status verificationStatus verificationImage verificationSubmittedAt verificationReviewedAt');
    }
    if (!user) {
      return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
    }
    res.json(user);
  } catch (err) {
    console.error('Auth me error:', err);
    res.status(500).json({ error: 'Kullanıcı bilgisi alınamadı.' });
  }
});

// UPDATE CURRENT USER PROFILE
app.put('/api/user/profile', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const update = {};
    if (typeof req.body.username !== 'undefined') update.username = req.body.username.trim();
    if (typeof req.body.fullName !== 'undefined') update.fullName = req.body.fullName.trim();
    if (typeof req.body.email !== 'undefined') update.email = req.body.email.trim();
    if (typeof req.body.phone !== 'undefined') update.phone = req.body.phone.trim();
    if (typeof req.body.bio !== 'undefined') update.bio = req.body.bio.trim();

    const user = await User.findByIdAndUpdate(userId, update, { returnDocument: 'after' })
      .select('_id fullName username email phone bio avatar status');

    if (!user) {
      return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
    }
    res.json({ success: true, user });
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ error: 'Profil güncellenemedi.' });
  }
});

// ========== ORDER ENDPOINTS ==========

// CREATE ORDER
app.post('/api/orders/create', verifyToken, async (req, res) => {
  try {
    const { productId, sellerId, productName, price } = req.body;
    const buyerId = req.user.id;

    if (!productId || !sellerId || !productName || !price) {
      return res.status(400).json({ error: 'Tüm alanlar gerekli.' });
    }

    let product;
    if (mongoConnected) {
      product = await Product.findById(productId);
    } else {
      product = inMemoryStorage.products.find((item) => String(item.id) === String(productId));
    }

    if (!product) {
      return res.status(404).json({ error: 'İlan bulunamadı.' });
    }

    if (product.sellerId === buyerId) {
      return res.status(400).json({ error: 'Kendi ilanınızı satın alamazsınız.' });
    }

    const saleStatus = product.saleStatus || 'available';
    if (product.status !== 'approved') {
      return res.status(400).json({ error: 'Bu ilan satışa açık değil.' });
    }

    if (saleStatus === 'reserved') {
      return res.status(400).json({ error: 'Bu ilan şu anda başka bir sipariş için beklemede.' });
    }

    if (saleStatus === 'sold') {
      return res.status(400).json({ error: 'Bu ilan zaten satıldı.' });
    }

    // BAKIYE KONTROLU
    let buyerUser;
    if (mongoConnected) {
      buyerUser = await User.findById(buyerId);
    }
    if (!buyerUser) {
      return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
    }

    const currentBalance = Number(buyerUser.balance || 0);
    const productPrice = Number(price);

    if (currentBalance < productPrice) {
      return res.status(400).json({ error: 'Mevcut bakiyeniz yetersiz.' });
    }

    // Bakiyeyi düsür
    if (mongoConnected) {
      buyerUser.balance = currentBalance - productPrice;
      await buyerUser.save();
    }

    const order = new Order({
      buyerId,
      sellerId,
      productId,
      productName,
      price,
      status: 'pending'
    });

    if (mongoConnected) {
      product.saleStatus = 'reserved';
      await product.save();
    } else {
      product.saleStatus = 'reserved';
    }

    await order.save();

    // SEND SALE NOTIFICATION TO SELLER
    try {
      const saleMessage = `✅ "${productName}" adlı ilanınız için sipariş oluşturuldu. Lütfen siparişi tamamlayın.`;
      
      const saleNotification = new Message({
        senderId: 'system',
        receiverId: sellerId,
        message: saleMessage,
        type: 'system',
        read: false
      });
      await saleNotification.save();

      const notification = new Notification({
        userId: sellerId,
        message: saleMessage,
        type: 'sale',
        read: false
      });
      await notification.save();

      console.log('✓ Sale notification sent to seller');
    } catch (err) {
      console.log('⚠ Sale notification error:', err.message);
    }

    res.status(201).json({
      success: true,
      message: 'Satın alma talebi gönderildi. Satın alma beklemede.',
      order
    });
  } catch (err) {
    console.error('Sipariş oluşturulurken hata:', err);
    res.status(500).json({ error: 'Sipariş oluşturulamadı.' });
  }
});

app.put('/api/orders/:orderId/status', verifyToken, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;
    const allowedStatuses = ['completed', 'cancelled'];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ error: 'Geçersiz sipariş durumu.' });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ error: 'Sipariş bulunamadı.' });
    }

    if (req.user.role !== 'admin' && req.user.id !== order.sellerId) {
      return res.status(403).json({ error: 'Bu işlemi gerçekleştirmeye yetkiniz yok.' });
    }

    if (order.status !== 'pending') {
      return res.status(400).json({ error: 'Sipariş durumu zaten güncellenmiş.' });
    }

    order.status = status;
    await order.save();

    if (mongoConnected) {
      const product = await Product.findById(order.productId);
      if (product) {
        product.saleStatus = status === 'completed' ? 'sold' : 'available';
        await product.save();
      }
    }

    res.json({ success: true, order });
  } catch (err) {
    console.error('Sipariş durumu güncellenirken hata:', err);
    res.status(500).json({ error: 'Sipariş durumu güncellenemedi.' });
  }
});

// GET ORDERS FOR USER
app.get('/api/orders/user/:userId', verifyToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const orders = await Order.find({
      $or: [
        { buyerId: userId },
        { sellerId: userId }
      ]
    }).sort({ createdAt: -1 });

    res.json(orders);
  } catch (err) {
    console.error('Siparişler alınırken hata:', err);
    res.status(500).json({ error: 'Siparişler alınamadı.' });
  }
});

// GET ORDER DETAILS
app.get('/api/orders/:orderId', verifyToken, async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({ error: 'Sipariş bulunamadı.' });
    }

    res.json(order);
  } catch (err) {
    console.error('Sipariş detayları alınırken hata:', err);
    res.status(500).json({ error: 'İşlem başarısız.' });
  }
});

// ========== WITHDRAWAL ENDPOINTS ==========

// CREATE WITHDRAWAL REQUEST
app.post('/api/withdrawals', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { amount, method, accountInfo } = req.body;
    const withdrawAmount = parseFloat(amount);

    if (isNaN(withdrawAmount) || withdrawAmount <= 0) {
      return res.status(400).json({ error: 'Geçerli bir tutar girin.' });
    }
    if (withdrawAmount < 50) {
      return res.status(400).json({ error: 'Minimum çekim tutarı 50 TL dir.' });
    }

    // Check user balance
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
    if ((user.balance || 0) < withdrawAmount) {
      return res.status(400).json({ error: 'Yetersiz bakiye.' });
    }

    // Deduct balance
    user.balance = (user.balance || 0) - withdrawAmount;
    await user.save();

    // Create withdrawal record
    const withdrawal = new Withdrawal({
      userId,
      amount: withdrawAmount,
      method: method || 'bank',
      accountInfo: accountInfo || '',
      status: 'pending'
    });
    await withdrawal.save();

    res.json({ success: true, withdrawal, newBalance: user.balance });
  } catch (err) {
    console.error('Withdrawal error:', err);
    res.status(500).json({ error: 'Çekim talebi oluşturulamadı.' });
  }
});

// GET USER WITHDRAWAL STATS
app.get('/api/withdrawals/stats', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const pendingTotal = await Withdrawal.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId), status: 'pending' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    const totalWithdrawn = await Withdrawal.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId), status: { $in: ['approved', 'pending'] } } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    // Also get completed (approved only) for "Çekilen Tutar"
    const completedWithdrawn = await Withdrawal.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId), status: 'approved' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    res.json({
      pendingTotal: pendingTotal[0]?.total || 0,
      totalWithdrawn: totalWithdrawn[0]?.total || 0,
      completedWithdrawn: completedWithdrawn[0]?.total || 0
    });
  } catch (err) {
    console.error('Withdrawal stats error:', err);
    res.status(500).json({ error: 'Çekim istatistikleri alınamadı.' });
  }
});

// GET USER WITHDRAWALS LIST
app.get('/api/withdrawals/me', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const withdrawals = await Withdrawal.find({ userId })
      .sort({ createdAt: -1 })
      .limit(50);
    res.json(withdrawals);
  } catch (err) {
    console.error('Withdrawals list error:', err);
    res.status(500).json({ error: 'Çekim geçmişi alınamadı.' });
  }
});

// ADD BALANCE / PAYMENT SIMULATION
app.post('/api/balance/top-up', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { amount, method } = req.body;
    const topUpAmount = parseFloat(amount);
    const allowedMethods = ['cc', 'eft', 'papara'];

    if (isNaN(topUpAmount) || topUpAmount <= 0) {
      return res.status(400).json({ error: 'Geçerli bir tutar girin.' });
    }
    if (topUpAmount < 1) {
      return res.status(400).json({ error: 'Minimum yükleme tutarı 1 TL dir.' });
    }
    if (!allowedMethods.includes(method)) {
      return res.status(400).json({ error: 'Geçerli bir ödeme yöntemi seçin.' });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });

    user.balance = (user.balance || 0) + topUpAmount;
    await user.save();

    res.json({
      success: true,
      message: 'Bakiye başarıyla yüklendi.',
      newBalance: user.balance,
      payment: {
        amount: topUpAmount,
        method,
        status: 'completed'
      },
      user: {
        _id: user._id,
        fullName: user.fullName,
        username: user.username,
        email: user.email,
        phone: user.phone,
        bio: user.bio,
        avatar: user.avatar,
        balance: user.balance,
        role: user.role,
        status: user.status
      }
    });
  } catch (err) {
    console.error('Balance top-up error:', err);
    res.status(500).json({ error: 'Bakiye yüklenemedi.' });
  }
});

// ADMIN MANAGEMENT (Sadece super_admin)
app.get('/api/admin/admins', verifySuperAdmin, async (req, res) => {
  try {
    if (mongoConnected) {
      const admins = await User.find({ role: { $in: ['admin', 'super_admin'] } })
        .select('_id fullName username email role status balance createdAt')
        .sort({ createdAt: -1 });
      return res.json(admins);
    }
    const admins = users.filter(u => u.role === 'admin' || u.role === 'super_admin');
    res.json(admins);
  } catch (err) {
    console.error('Admin list error:', err);
    res.status(500).json({ error: 'Adminler alınamadı.' });
  }
});

app.post('/api/admin/create-admin', verifySuperAdmin, async (req, res) => {
  try {
    const { full_name, email, phone, username, password, role } = req.body;
    if (!full_name || !email || !phone || !username || !password) {
      return res.status(400).json({ error: 'Tüm alanları doldurun.' });
    }
    const normalizedEmail = String(email).toLowerCase().trim();
    const normalizedUsername = String(username).toLowerCase().trim();
    const newRole = role === 'super_admin' ? 'super_admin' : 'admin';

    if (mongoConnected) {
      const emailExists = await User.findOne({ email: normalizedEmail });
      if (emailExists) return res.status(409).json({ error: 'Bu e-posta zaten kayıtlı.' });
      const usernameExists = await User.findOne({ username: normalizedUsername });
      if (usernameExists) return res.status(409).json({ error: 'Bu kullanıcı adı kullanımda.' });

      const passwordHash = await bcrypt.hash(password, 10);
      const newUser = new User({
        fullName: full_name,
        email: normalizedEmail,
        phone: phone,
        username: normalizedUsername,
        passwordHash: passwordHash,
        role: newRole,
        status: 'active',
        balance: 0
      });
      await newUser.save();
      return res.json({ success: true, user: newUser });
    }

    // In-memory fallback
    if (users.find(u => u.email === normalizedEmail)) {
      return res.status(409).json({ error: 'Bu e-posta zaten kayıtlı.' });
    }
    if (users.find(u => u.username === normalizedUsername)) {
      return res.status(409).json({ error: 'Bu kullanıcı adı kullanımda.' });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const userObj = {
      _id: String(Date.now()),
      fullName: full_name,
      email: normalizedEmail,
      phone: phone,
      username: normalizedUsername,
      passwordHash: passwordHash,
      role: newRole,
      status: 'active',
      balance: 0,
      createdAt: new Date()
    };
    users.push(userObj);
    res.json({ success: true, user: userObj });
  } catch (err) {
    console.error('Create admin error:', err);
    res.status(500).json({ error: 'Admin oluşturulamadı.' });
  }
});

app.delete('/api/admin/delete-admin/:id', verifySuperAdmin, async (req, res) => {
  try {
    if (mongoConnected) {
      const user = await User.findByIdAndDelete(req.params.id);
      if (!user) return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
      return res.json({ success: true });
    }
    const idx = users.findIndex(u => u._id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
    users.splice(idx, 1);
    res.json({ success: true });
  } catch (err) {
    console.error('Delete admin error:', err);
    res.status(500).json({ error: 'Admin silinemedi.' });
  }
});

app.put('/api/admin/update-role/:id', verifySuperAdmin, async (req, res) => {
  try {
    const { role } = req.body;
    if (!['user', 'admin', 'super_admin'].includes(role)) {
      return res.status(400).json({ error: 'Geçersiz rol.' });
    }
    if (mongoConnected) {
      const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true })
        .select('_id fullName username email role status balance createdAt');
      if (!user) return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
      return res.json({ success: true, user });
    }
    const user = users.find(u => u._id === req.params.id);
    if (!user) return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
    user.role = role;
    res.json({ success: true, user });
  } catch (err) {
    console.error('Update role error:', err);
    res.status(500).json({ error: 'Rol güncellenemedi.' });
  }
});

// NEW MODULAR AUTH ROUTES (Admin Panel)
const userRoutes = require('./routes/users');
const listingRoutes = require('./routes/listings');
const financeRoutes = require('./routes/finance');
const auditRoutes = require('./routes/audit');
const dashboardRoutes = require('./routes/dashboard');

app.use('/api/v2/auth', authRoutes);
app.use('/api/v2/users', userRoutes);
app.use('/api/v2/listings', listingRoutes);
app.use('/api/v2/finance', financeRoutes);
app.use('/api/v2/audit-logs', auditRoutes);
app.use('/api/v2/dashboard', dashboardRoutes);
app.use('/api/v2/sliders', require('./routes/sliders'));

// ── UPLOAD ENDPOINTS ──
app.post('/api/upload/images', verifyToken, upload.array('images', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, error: 'Dosya bulunamadı.' });
    }
    const urls = req.files.map(f => ({
      url: f.path || f.secure_url || f.url,
      publicId: f.filename || f.public_id,
      originalName: f.originalname,
      size: f.size,
    }));
    res.json({ success: true, images: urls, count: urls.length });
  } catch (err) {
    console.error('[UPLOAD] Error:', err);
    res.status(500).json({ success: false, error: 'Yükleme başarısız.' });
  }
});

app.post('/api/upload/single', verifyToken, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Dosya bulunamadı.' });
    }
    res.json({
      success: true,
      image: {
        url: req.file.path || req.file.secure_url || req.file.url,
        publicId: req.file.filename || req.file.public_id,
        originalName: req.file.originalname,
        size: req.file.size,
      }
    });
  } catch (err) {
    console.error('[UPLOAD] Error:', err);
    res.status(500).json({ success: false, error: 'Yükleme başarısız.' });
  }
});

// Multer error handler
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ success: false, error: 'Dosya çok büyük. Maksimum 50MB.' });
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({ success: false, error: 'Çok fazla dosya yüklendi. Maksimum 10 adet.' });
    }
    return res.status(400).json({ success: false, error: err.message });
  }
  if (err.message && err.message.includes('Sadece görsel')) {
    return res.status(400).json({ success: false, error: err.message });
  }
  next(err);
});

// Global error handler
app.use(globalErrorHandler);

// SOCKET.IO
const http = require('http');
const { initSocketIO } = require('./services/socketService');

const server = http.createServer(app);
initSocketIO(server);

// START SERVER
const PORT = 3000;

server.listen(PORT, () => {

console.log(); console.log(`╔══════════════════════════════════════╗`); console.log(`║ ITEMCI BACKEND ║`); console.log(`╚══════════════════════════════════════╝`); console.log();
console.log(`✓ Backend: http://localhost:${PORT}`);
console.log(`✓ Login:   http://localhost:${PORT}/giris-yap`);
console.log(`✓ Register:http://localhost:${PORT}/uyelik`);
console.log(`✓ Admin API: http://localhost:${PORT}/api/v2/auth`);
console.log(`✓ Socket.IO: ws://localhost:${PORT}`);

console.log(``);

});