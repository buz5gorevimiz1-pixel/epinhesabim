const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');

// GET /api/v2/orders - Get user orders
router.get('/', authenticate, async (req, res) => {
    try {
        const userId = req.user.id;

        // Kullanıcının satın aldığı siparişleri getir (buyerId = userId)
        const purchases = await Order.find({ buyerId: userId })
            .sort({ createdAt: -1 })
            .lean();

        // Kullanıcının sattığı siparişleri getir (sellerId = userId)
        const sales = await Order.find({ sellerId: userId })
            .sort({ createdAt: -1 })
            .lean();

        // Satın alma siparişlerini formatla
        const formattedPurchases = await Promise.all(purchases.map(async (order) => {
            const product = await Product.findById(order.productId).lean();
            const seller = await User.findById(order.sellerId).lean();

            return {
                id: order._id,
                title: order.productName,
                image: product?.image || 'assets/img/placeholder.png',
                price: order.price,
                status: order.status,
                statusText: getStatusText(order.status),
                date: formatDate(order.createdAt),
                seller: seller?.username || 'Bilinmiyor'
            };
        }));

        // Satış siparişlerini formatla
        const formattedSales = await Promise.all(sales.map(async (order) => {
            const product = await Product.findById(order.productId).lean();
            const buyer = await User.findById(order.buyerId).lean();

            return {
                id: order._id,
                title: order.productName,
                image: product?.image || 'assets/img/placeholder.png',
                price: order.price,
                status: order.status,
                statusText: getStatusText(order.status),
                date: formatDate(order.createdAt),
                buyer: buyer?.username || 'Bilinmiyor'
            };
        }));

        res.json({
            success: true,
            purchases: formattedPurchases,
            sales: formattedSales
        });
    } catch (error) {
        console.error('Orders fetch error:', error);
        res.status(500).json({
            success: false,
            message: 'Siparişler alınamadı'
        });
    }
});

// POST /api/v2/orders/:id/deliver - Seller marks order as delivered
router.post('/:id/deliver', authenticate, async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) {
            return res.status(404).json({ success: false, error: 'Sipariş bulunamadı.' });
        }

        const userId = req.user.id || req.user._id;
        if (String(order.sellerId) !== String(userId)) {
            return res.status(403).json({ success: false, error: 'Bu işlem için yetkiniz yok.' });
        }

        if (order.status !== 'pending') {
            return res.status(400).json({ success: false, error: 'Bu sipariş zaten işleme alındı.' });
        }

        order.status = 'awaiting';
        order.deliveredAt = new Date();
        await order.save();

        res.json({ success: true, message: 'Teslimat bildirimi alındı. Alıcı onayı bekleniyor.' });
    } catch (error) {
        console.error('Deliver error:', error);
        res.status(500).json({ success: false, error: 'Sunucu hatası oluştu.' });
    }
});

// POST /api/v2/orders/:id/confirm - Buyer confirms delivery
router.post('/:id/confirm', authenticate, async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) {
            return res.status(404).json({ success: false, error: 'Sipariş bulunamadı.' });
        }

        const userId = req.user.id || req.user._id;
        if (String(order.buyerId) !== String(userId)) {
            return res.status(403).json({ success: false, error: 'Bu işlem için yetkiniz yok.' });
        }

        if (order.status !== 'awaiting') {
            return res.status(400).json({ success: false, error: 'Onaylanacak bir teslimat yok.' });
        }

        order.status = 'completed';
        order.completedAt = new Date();
        await order.save();

        res.json({ success: true, message: 'Sipariş tamamlandı.' });
    } catch (error) {
        console.error('Confirm error:', error);
        res.status(500).json({ success: false, error: 'Sunucu hatası oluştu.' });
    }
});

// Helper functions
function getStatusText(status) {
    switch(status) {
        case 'pending':
            return 'Teslimat Bekleniyor';
        case 'awaiting':
            return 'Teslim Edilecek';
        case 'completed':
            return 'Tamamlandı';
        case 'cancelled':
            return 'İptal Edildi';
        default:
            return 'Bilinmiyor';
    }
}

function formatDate(date) {
    if (!date) return '';
    const d = new Date(date);
    const day = d.getDate();
    const months = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    const hours = d.getHours().toString().padStart(2, '0');
    const minutes = d.getMinutes().toString().padStart(2, '0');
    return `${day} ${month} ${year}, ${hours}:${minutes}`;
}

module.exports = router;
