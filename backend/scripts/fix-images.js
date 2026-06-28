require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Product = require('../models/Product');

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI || process.env.DATABASE_URL;

if (!MONGO_URI) {
  console.error('MONGODB_URI bulunamadı!');
  process.exit(1);
}

const PLACEHOLDER = 'https://placehold.co/400x300/1e293b/94a3b8?text=Gorsel+Yok';

async function fixImages() {
  await mongoose.connect(MONGO_URI);
  console.log('MongoDB bağlandı.');

  const products = await Product.find({}).lean();
  console.log('Toplam ilan:', products.length);

  let fixed = 0;
  for (const p of products) {
    const img = p.image || '';
    const isBroken =
      !img ||
      img.startsWith('data:') ||
      img.startsWith('blob:') ||
      img === 'assets/img/placeholder.png' ||
      img === '/assets/img/placeholder.png' ||
      (!img.startsWith('http') && !img.startsWith('/'));

    if (isBroken) {
      await Product.updateOne({ _id: p._id }, { $set: { image: PLACEHOLDER } });
      console.log(`  Düzeltildi: ${p.title} (${p._id})`);
      fixed++;
    }
  }

  console.log(`\nTamamlandı: ${fixed}/${products.length} ilan görseli düzeltildi.`);
  await mongoose.disconnect();
  process.exit(0);
}

fixImages().catch(err => {
  console.error('Hata:', err);
  process.exit(1);
});
