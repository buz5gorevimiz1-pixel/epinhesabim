/**
 * PUBG Portalı — gerçek ilanları API'den yükler ve filtreler
 */
(function () {
  const LISTING_CONTAINER_ID = 'pubg-portal-listings';
  const PAGE_SIZE = 8;

  let allListings = [];
  let filteredListings = [];
  let visibleCount = PAGE_SIZE;

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function imageUrl(path) {
    if (!path) return 'assets/img/placeholder.jpg';
    if (path.startsWith('http')) return path;
    return path.startsWith('/') ? path.slice(1) : path;
  }

  function isPubgListing(item) {
    const blob = (
      (item.categorySlug || '') +
      ' ' +
      (item.category || '') +
      ' ' +
      (item.categoryName || '') +
      ' ' +
      (item.title || '') +
      ' ' +
      (item.description || '')
    ).toLowerCase();
    return blob.includes('pubg');
  }

  function classifyListing(item) {
    const text = ((item.title || '') + ' ' + (item.description || '')).toLowerCase();
    if (/\buc\b|unknown\s*cash|\d+\s*uc/.test(text)) return 'uc';
    if (/hesap|account|random/.test(text)) return 'hesaplar';
    if (/araç|arac|vehicle|buggy|uaz|motor|dacia|kart/.test(text)) return 'arac';
    return 'diger';
  }

  function applyFilter(filter) {
    if (filter === 'all') {
      filteredListings = [...allListings];
    } else {
      filteredListings = allListings.filter((item) => classifyListing(item) === filter);
    }
    visibleCount = PAGE_SIZE;
    document.querySelectorAll('.pubg-portal-cat[data-filter]').forEach((el) => {
      el.classList.toggle('active', el.getAttribute('data-filter') === filter);
    });
    renderListings();
  }

  function renderProducts(products, container) {
    if (!products.length) {
      container.innerHTML =
        '<p class="pubg-portal-empty">Henüz PUBG ilanı bulunmuyor. İlan eklemek için <a href="/ilan-olustur" style="color:#a78bfa">buraya tıklayın</a>.</p>';
      updateLoadMoreButton();
      return;
    }

    const slice = products.slice(0, visibleCount);
    container.innerHTML = slice
      .map((product) => {
        const id = product.id || product._id;
        const price = Number(product.price || 0);
        const img = escapeHtml(imageUrl(product.image));
        const title = escapeHtml(product.title);
        const category = escapeHtml(product.categoryName || product.category || 'PUBG Mobile');
        const seller = escapeHtml(product.sellerName || 'Anonim');

        return `
        <a class="ipcard" href="/ilan/${id}">
            <div class="ipthumb">
                <img src="${img}" alt="${title}" loading="lazy" decoding="async" onerror="this.src='assets/img/placeholder.jpg'">
                <div class="ipprice">${price.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL</div>
            </div>
            <div class="ipbody">
                <p class="iptitle">${title}</p>
                <p class="ipsub">${category}</p>
                <div class="ipmeta">
                    <div class="ipdel">⚡ Manuel Teslimat</div>
                    <div></div>
                </div>
            </div>
            <div class="ipfoot">
                <div class="ipstore">
                    <span class="ipav"><img src="assets/img/avatar-1.png" alt="Satıcı"></span>
                    <span class="ipname">${seller}</span>
                </div>
            </div>
        </a>`;
      })
      .join('');

    updateLoadMoreButton();
  }

  function renderListings() {
    const container = document.getElementById(LISTING_CONTAINER_ID);
    if (!container) return;
    renderProducts(filteredListings, container);
  }

  function updateLoadMoreButton() {
    const btn = document.getElementById('pubg-portal-load-more');
    if (!btn) return;
    btn.disabled = visibleCount >= filteredListings.length;
    btn.style.display = filteredListings.length > PAGE_SIZE ? 'inline-flex' : 'none';
  }

  async function fetchJson(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return res.json();
  }

  async function fetchPubgListings() {
    const container = document.getElementById(LISTING_CONTAINER_ID);
    if (!container) return;

    container.innerHTML =
      '<p class="pubg-portal-loading"><i class="fas fa-spinner fa-spin"></i> İlanlar yükleniyor...</p>';

    try {
      const data = await fetchJson('/api/listings?game=pubg');
      allListings = (data.listings || []).filter(isPubgListing);
    } catch (e) {
      console.warn('game=pubg fetch failed', e);
      allListings = [];
    }

    if (!allListings.length) {
      const slugs = ['pubg-mobile', 'pubg'];
      for (const slug of slugs) {
        try {
          const data = await fetchJson('/api/listings?category=' + encodeURIComponent(slug));
          const list = (data.listings || []).filter(isPubgListing);
          if (list.length) {
            allListings = list;
            break;
          }
        } catch (e) {
          console.warn('category fetch failed', slug, e);
        }
      }
    }

    if (!allListings.length) {
      try {
        const products = await fetchJson('/api/products');
        allListings = (Array.isArray(products) ? products : []).filter(isPubgListing);
      } catch (e) {
        console.error('products fallback failed', e);
      }
    }

    filteredListings = [...allListings];
    visibleCount = PAGE_SIZE;
    renderListings();
  }

  function initCategoryFilters() {
    document.querySelectorAll('.pubg-portal-cat[data-filter]').forEach((card) => {
      card.addEventListener('click', (e) => {
        e.preventDefault();
        applyFilter(card.getAttribute('data-filter'));
        const section = document.getElementById('pubg-portal-listings-section');
        if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  }

  function initLoadMore() {
    const btn = document.getElementById('pubg-portal-load-more');
    if (!btn) return;
    btn.addEventListener('click', () => {
      visibleCount += PAGE_SIZE;
      renderListings();
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    initCategoryFilters();
    initLoadMore();
    fetchPubgListings();
  });
})();
