/**
 * MARKETPLACE LISTINGS - Mock & Real Data System
 * Gerçek + Fake veri sistemi - Mock/API toggle
 */

// ============ KONFIGÜRASYON ============
const USE_MOCK = true;  // true = mock veri göster, false = API'den çek
const API_ENDPOINT = 'http://http://epinhesabim.com/api/products';

// ============ MOCK VERİLERİ ============
const MOCK_LISTINGS = [
  {
    id: 1,
    title: "Premium Valorant Hesabı",
    price: 4500,
    image: "assets/img/hesapilani-157-538.jpg",
    sellerName: "TrustSeller",
    category: "Valorant",
    status: "active"
  },
  {
    id: 2,
    title: "PUBG Mobile 50K+ BP Hesabı",
    price: 12000,
    image: "assets/uploads/listings/listing_392_1778261611_69fe1e6b80649.webp",
    sellerName: "GameHub",
    category: "PUBG",
    status: "active"
  },
  {
    id: 3,
    title: "League of Legends 250BE Hesabı",
    price: 3200,
    image: "assets/img/placeholder.jpg",
    sellerName: "LegendsStore",
    category: "League of Legends",
    status: "active"
  },
  {
    id: 4,
    title: "CS2 Prime Account",
    price: 1500,
    image: "assets/img/hesapilani-157-538.jpg",
    sellerName: "CSPlayer",
    category: "CS2",
    status: "active"
  },
  {
    id: 5,
    title: "Fortnite Battle Pass Hesabı",
    price: 2800,
    image: "assets/img/placeholder.jpg",
    sellerName: "FortnitePro",
    category: "Fortnite",
    status: "active"
  },
  {
    id: 6,
    title: "Steam Hesabı 250+ Oyun",
    price: 8900,
    image: "assets/img/hesapilani-157-538.jpg",
    sellerName: "SteamVault",
    category: "Steam",
    status: "active"
  },
  {
    id: 7,
    title: "Mobile Legends Rank 1 Hesabı",
    price: 6500,
    image: "assets/uploads/listings/listing_392_1778261611_69fe1e6b80649.webp",
    sellerName: "MLegendary",
    category: "Mobile Legends",
    status: "sold"
  },
  {
    id: 8,
    title: "Discord Nitro 1 Yıl",
    price: 580,
    image: "assets/img/placeholder.jpg",
    sellerName: "DiscordHub",
    category: "Discord",
    status: "active"
  },
  {
    id: 9,
    title: "Netflix Premium 3 Aylık",
    price: 450,
    image: "assets/img/hesapilani-157-538.jpg",
    sellerName: "StreamingPro",
    category: "Netflix",
    status: "active"
  },
  {
    id: 10,
    title: "Brawl Stars 50K+ Trophies",
    price: 2100,
    image: "assets/img/placeholder.jpg",
    sellerName: "BrawlMaster",
    category: "Brawl Stars",
    status: "active"
  },
  {
    id: 11,
    title: "Clash of Clans TH14 Hesabı",
    price: 7500,
    image: "assets/uploads/listings/listing_392_1778261611_69fe1e6b80649.webp",
    sellerName: "ClashKing",
    category: "Clash of Clans",
    status: "active"
  },
  {
    id: 12,
    title: "Dota 2 Divine Rank Hesabı",
    price: 9200,
    image: "assets/img/placeholder.jpg",
    sellerName: "DotaPro",
    category: "Dota 2",
    status: "active"
  }
];

// ============ DOM RENDER FONKSIYONLARI ============

/**
 * Loading skeleton HTML'i (yükleniyor durumu)
 */
function createLoadingSkeleton() {
  const skeleton = document.createElement('div');
  skeleton.className = 'listings-skeleton';
  skeleton.innerHTML = `
    <div class="skeleton-item">
      <div class="skeleton-image"></div>
      <div class="skeleton-title"></div>
      <div class="skeleton-price"></div>
    </div>
    <div class="skeleton-item">
      <div class="skeleton-image"></div>
      <div class="skeleton-title"></div>
      <div class="skeleton-price"></div>
    </div>
    <div class="skeleton-item">
      <div class="skeleton-image"></div>
      <div class="skeleton-title"></div>
      <div class="skeleton-price"></div>
    </div>
    <div class="skeleton-item">
      <div class="skeleton-image"></div>
      <div class="skeleton-title"></div>
      <div class="skeleton-price"></div>
    </div>
  `;
  return skeleton;
}

/**
 * Empty state HTML'i (veri yoksa)
 */
function createEmptyState() {
  const empty = document.createElement('div');
  empty.className = 'listings-empty';
  empty.innerHTML = `
    <div class="empty-icon">📭</div>
    <div class="empty-title">İlan Bulunamadı</div>
    <div class="empty-description">Şu anda gösterilecek ilan yok. Daha sonra tekrar deneyin.</div>
  `;
  return empty;
}

/**
 * Error state HTML'i
 */
function createErrorState(errorMessage) {
  const error = document.createElement('div');
  error.className = 'listings-error';
  error.innerHTML = `
    <div class="error-icon">⚠️</div>
    <div class="error-title">Hata Oluştu</div>
    <div class="error-description">${errorMessage || 'İlanlar yüklenirken bir hata oluştu.'}</div>
    <button class="error-retry-btn" onclick="loadListings()">Tekrar Dene</button>
  `;
  return error;
}

/**
 * İlan kartı HTML render
 * Mevcut tasarım korunuyor (.ipcard yapısı)
 */
function createListingCard(item) {
  const card = document.createElement('a');
  card.className = 'ipcard';
  card.href = `/ilan/${item.id}`;
  
  // Durum kontrolü
  const statusClass = item.status === 'sold' ? 'vitrin' : item.status === 'reserved' ? 'beklemede' : '';
  const statusText = item.status === 'sold' ? '❌ SATILDI' : item.status === 'reserved' ? '⏳ BEKLEMEDE' : '✅ AKTİF';
  
  card.innerHTML = `
    <div class="ipthumb">
      <img src="${item.image}" alt="${item.title}" onerror="this.src='assets/img/placeholder.jpg'">
      <div class="ipprice">${formatPrice(item.price)}</div>
    </div>
    
    <div class="ipbody">
      <p class="iptitle">${item.title}</p>
      <p class="ipsub">${item.category}</p>
      <div class="ipmeta">
        <div class="ipdel">⚡ Manuel Teslimat</div>
        <div class="ipstatus">${statusText}</div>
      </div>
    </div>
    
    <div class="ipfoot">
      <div class="ipstore">
        <div class="ipstoreavatar" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);"></div>
        <div class="ipstoredetail">
          <p class="ipstorename">${item.sellerName}</p>
          <p class="ipstorerating">⭐ 4.8</p>
        </div>
      </div>
    </div>
  `;
  
  return card;
}

/**
 * Fiyatı Türkçe formatında göster
 */
function formatPrice(price) {
  return price.toLocaleString('tr-TR') + ' TL';
}

/**
 * Container'ı temizle ve kartları render et
 */
function renderListings(listings) {
  const container = document.getElementById('listings-container');
  
  if (!container) {
    console.error('listings-container div bulunamadı');
    return;
  }
  
  // Container'ı temizle
  container.innerHTML = '';
  
  // Veri yoksa
  if (!listings || listings.length === 0) {
    container.appendChild(createEmptyState());
    return;
  }
  
  // Grid div'i oluştur
  const grid = document.createElement('div');
  grid.className = 'listings-grid';
  
  // Her kartı render et
  listings.forEach(item => {
    grid.appendChild(createListingCard(item));
  });
  
  container.appendChild(grid);
}

// ============ VERİ YÜKLEME FONKSIYONLARI ============

/**
 * Mock veriye döndür
 */
async function loadMockListings() {
  console.log('📦 Mock veri yükleniyor...');
  return new Promise(resolve => {
    setTimeout(() => {
      resolve(MOCK_LISTINGS);
    }, 500); // İşlem hissi için 500ms gecikme
  });
}

/**
 * API'den veri çek
 */
async function loadApiListings() {
  console.log('🌐 API\'den veri çekiliyor...');
  try {
    const response = await fetch(API_ENDPOINT);
    
    if (!response.ok) {
      throw new Error(`API Hatası: ${response.status}`);
    }
    
    const data = await response.json();
    
    // API'den dönen veri formatını uyumlu hale getir
    if (Array.isArray(data)) {
      return data.map(item => ({
        id: item._id || item.id,
        title: item.title,
        price: item.price,
        image: item.image || 'assets/img/placeholder.jpg',
        sellerName: item.sellerName || 'Satıcı',
        category: item.category || 'Genel',
        status: item.status === 'sold' ? 'sold' : item.status === 'reserved' ? 'reserved' : 'active'
      }));
    }
    
    return [];
  } catch (error) {
    console.error('API Hatası:', error.message);
    throw error;
  }
}

/**
 * ANA FONKSIYON: İlanları yükle ve render et
 */
async function loadListings() {
  const container = document.getElementById('listings-container');
  
  if (!container) {
    console.error('listings-container div bulunamadı');
    return;
  }
  
  // Loading state göster
  container.innerHTML = '';
  container.appendChild(createLoadingSkeleton());
  
  try {
    // Mock veya API'den veri çek
    let listings;
    
    if (USE_MOCK) {
      listings = await loadMockListings();
    } else {
      listings = await loadApiListings();
    }
    
    // Listeyi render et
    renderListings(listings);
    
    console.log(`✅ ${listings.length} ilan yüklendi (${USE_MOCK ? 'Mock' : 'API'})`);
    
  } catch (error) {
    console.error('Veri yükleme hatası:', error);
    container.innerHTML = '';
    container.appendChild(createErrorState(error.message));
  }
}

// ============ BAŞLATMA ============

// Sayfa yüklendiğinde ilanları yükle
document.addEventListener('DOMContentLoaded', () => {
  loadListings();
});

// Dış dünyaya export et (UI toggle için)
window.toggleListingMode = function() {
  // Konsolda USE_MOCK'ı toggle et
  if (typeof USE_MOCK !== 'undefined') {
    console.log(`${USE_MOCK ? 'Mock' : 'API'} modundan ${!USE_MOCK ? 'Mock' : 'API'} moduna geçiş yapıldı.`);
  }
};
