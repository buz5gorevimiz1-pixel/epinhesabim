const fs = require('fs');

const file = 'c:\\Users\\Zımbacı\\Desktop\\epinhesabim2-project\\frodent\\katagoriler2.html';
let html = fs.readFileSync(file, 'utf8');

const map = {
  'Brawl Stars': 'assets/uploads/servers/epinfybrawl1-min32703.png',
  'Cabal Online': 'assets/uploads/servers/alexander-shatov-mr4jg4syof8-unsplash-1757935346.webp',
  'Counter-Strike': 'assets/uploads/servers/epinfycs1-min55885.png',
  'Discord': 'assets/uploads/servers/epinfydc1-min78460.png',
  'Fortnite': 'assets/uploads/servers/epinfyfort150571.png',
  'Google Play': 'assets/uploads/servers/epinfygplay-min43170.png',
  'Instagram': 'assets/uploads/servers/epinfyig1-min19126.png',
  'League of Legends': 'assets/uploads/servers/epinfylol1-min1373.png',
  'Mobile Legends': 'assets/uploads/servers/epinfymlbb1-min75095.png',
  'PUBG': 'assets/uploads/servers/epinfypubg1-min56374-1769604580.png',
  'Steam': 'assets/uploads/servers/epinfysteam1-min49514.png',
  'TikTok': 'assets/uploads/servers/epinfytt1-min83558.png',
  'Twitter': 'assets/uploads/servers/epinfytwitter-min88116.png',
  'Valorant': 'assets/uploads/servers/epinfyvalo-1-250292.png',
  'YouTube': 'assets/uploads/servers/epinfyyt-min20069.png',
  'CD KEY': 'assets/uploads/servers/key3513e6cd-fe5f-4fc3-8084-.png',
  'Cabal Online Alz': 'assets/uploads/servers/alexander-shatov-mr4jg4syof8-unsplash-1757935346.webp',
  'Call of Dragons': 'assets/uploads/servers/epinfyvalo-12-250292.png',
  'Call of Duty Mobile': 'assets/uploads/servers/pbg1769626062_67ce0372.png',
  'Call of Duty Warzone': 'assets/uploads/servers/pbgks954fd9ee-0e9d-c.png',
  'Call of Duty Boost': 'assets/uploads/servers/pbguc3dca31a6-c1de-.png',
  'Canva Hesap': 'assets/uploads/servers/logod1ef6502-ec0d-.png',
  'CapCut': 'assets/uploads/servers/logod1ef6502-ec0d-.png',
  'CarX Street': 'assets/uploads/servers/epn1770758722_61eecfa1.png',
  'Clash Royale Boost': 'assets/uploads/servers/epinfybrawl1-min32703.png',
  'Clash of Clans Boost': 'assets/uploads/servers/epinfybrawl1-min32703.png',
  'Combat Arms': 'assets/uploads/servers/epinfycs1-min55885.png',
  'Conquer Online': 'assets/uploads/servers/alexander-shatov-mr4jg4syof8-unsplash-1757935346.webp',
  'Candy Crush Saga': 'assets/uploads/servers/epinfyyt-min20069.png',
  'Captain Tsubasa: Dream Team': 'assets/uploads/servers/epinfymlbb1-min75095.png',
  'Car Parking Multiplayer': 'assets/uploads/servers/epn1770758722_61eecfa1.png',
  'CarrefourSA': 'assets/uploads/servers/epinfygplay-min43170.png',
  'Castle Clash': 'assets/uploads/servers/epinfydc1-min78460.png',
  'Chess': 'assets/uploads/servers/epinfytt1-min83558.png',
  'Chronal Nexus': 'assets/uploads/servers/epinfyvalo-1-250292.png',
  'City of Crime': 'assets/uploads/servers/pbg1769626062_67ce0372.png',
  'Clash of Clans Random Hesap': 'assets/uploads/servers/epinfybrawl1-min32703.png',
  'Clash of Kings': 'assets/uploads/servers/epinfydc1-min78460.png',
  'Clash Royale Random Hesap': 'assets/uploads/servers/epinfybrawl1-min32703.png',
  'Conquerors Blade': 'assets/uploads/servers/epn1770758722_61eecfa1.png',
  'Counter-Strike 2': 'assets/uploads/servers/epinfycs1-min55885.png',
  'Craft Aura': 'assets/uploads/servers/epinfyvalo-1-250292.png',
  'Critical Ops': 'assets/uploads/servers/epinfycs1-min55885.png',
  'Critical Strike': 'assets/uploads/servers/epinfycs1-min55885.png',
  'CrossFire': 'assets/uploads/servers/epinfycs1-min55885.png',
  'Crunchyroll': 'assets/uploads/servers/epinfyyt-min20069.png',
  'Crunchyroll Hesap': 'assets/uploads/servers/epinfyyt-min20069.png',
  'Crystal of Atlan': 'assets/uploads/servers/epinfyvalo-12-250292.png',
  'CS2 Boost': 'assets/uploads/servers/epinfycs1-min55885.png',
  'CS2 Hesap Satışı': 'assets/uploads/servers/epinfycs1-min55885.png',
  'CS2 Topluluk Sunucuları': 'assets/uploads/servers/epinfycs1-min55885.png',
  'Cubic Castles': 'assets/uploads/servers/epinfyfort150571.png',
  'eFootball Mobile': 'assets/uploads/servers/epn1770758722_61eecfa1.png',
  'Pubg Mobile': 'assets/uploads/servers/epinfypubg1-min56374-1769604580.png',
  'Sosyal Medya': 'assets/uploads/servers/sns2f74e87a-842a-.png',
};

let changed = 0;
let missing = [];

// Her alt için tüm eşleşen img etiketlerini değiştir
Object.entries(map).forEach(([alt, src]) => {
  const regex = new RegExp(`<img src="" alt="${alt.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}">`, 'g');
  const before = html;
  html = html.replace(regex, `<img src="${src}" alt="${alt}">`);
  const count = (before.match(regex) || []).length;
  changed += count;
});

// Eşleşmeyen boş src'leri bul
const missingMatches = html.matchAll(/<img src="" alt="([^"]+)">/g);
for (const match of missingMatches) {
  missing.push(match[1]);
}

fs.writeFileSync(file, html);
console.log(`Toplam ${changed} gorsel guncellendi.`);
if (missing.length > 0) {
  console.log('Eşleşmeyen görseller:', [...new Set(missing)]);
}
