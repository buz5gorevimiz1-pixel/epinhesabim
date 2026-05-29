require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/itemci';

const SEED_ADMIN = {
  fullName: 'Super Admin',
  email: 'admin@epinhesabim.com',
  phone: '05001234567',
  username: 'admin',
  password: 'admin123',
  role: 'super_admin',
  status: 'active',
  balance: 0,
};

async function seed() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('MongoDB connected');

    const passwordHash = await bcrypt.hash(SEED_ADMIN.password, 10);

    const existing = await User.findOne({
      $or: [{ email: SEED_ADMIN.email }, { username: SEED_ADMIN.username }]
    });

    if (existing) {
      existing.fullName = SEED_ADMIN.fullName;
      existing.email = SEED_ADMIN.email;
      existing.username = SEED_ADMIN.username;
      existing.passwordHash = passwordHash;
      existing.role = SEED_ADMIN.role;
      existing.status = SEED_ADMIN.status;
      existing.phone = SEED_ADMIN.phone;
      await existing.save();
      console.log('');
      console.log('Seed admin UPDATED:');
    } else {
      await User.create({
        fullName: SEED_ADMIN.fullName,
        email: SEED_ADMIN.email,
        phone: SEED_ADMIN.phone,
        username: SEED_ADMIN.username,
        passwordHash: passwordHash,
        role: SEED_ADMIN.role,
        status: SEED_ADMIN.status,
        balance: SEED_ADMIN.balance,
      });
      console.log('');
      console.log('Seed admin CREATED:');
    }

    console.log(`  Username: ${SEED_ADMIN.username}`);
    console.log(`  Email:    ${SEED_ADMIN.email}`);
    console.log(`  Password: ${SEED_ADMIN.password}`);
    console.log(`  Role:     ${SEED_ADMIN.role}`);
    console.log(`  Status:   ${SEED_ADMIN.status}`);
    console.log('');
    console.log('Login: http://localhost:3001/login');
    console.log('');

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

seed();
