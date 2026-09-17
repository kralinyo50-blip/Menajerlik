import { Device, PCComponent } from '../types/game';

export const DEVICE_CATALOG: Device[] = [
  // Telefonlar
  { id: 'phone_mini', name: 'Akıllı Mini 12', brand: 'Meyve', category: 'phone', price: 18000, quality: 42, camera: 45, performance: 40, icon: '📱', desc: 'Giriş seviye — idare eder video, düşük ışıkta grenli' },
  { id: 'phone_mid', name: 'Galaksi S24', brand: 'Semsun', category: 'phone', price: 42000, quality: 68, camera: 72, performance: 65, icon: '📱', desc: 'Orta-üst — 4K 30fps, OIS, gece modu iyi' },
  { id: 'phone_pro', name: 'Meyve 15 Pro Max', brand: 'Meyve', category: 'phone', price: 78000, quality: 88, camera: 90, performance: 88, icon: '📱', desc: 'Amiral — 4K 60fps, sinematik, ProRes' },
  { id: 'phone_fold', name: 'Z Kat 5', brand: 'Semsun', category: 'phone', price: 65000, quality: 75, camera: 70, performance: 78, icon: '📱', desc: 'Katlanabilir — vlog için geniş ekran' },
  // Bilgisayarlar
  { id: 'pc_air', name: 'HafifBook Air M2', brand: 'Meyve', category: 'computer', price: 38000, quality: 62, camera: 50, performance: 60, icon: '💻', desc: 'Taşınabilir — montajda ısınır' },
  { id: 'pc_gaming_mid', name: 'Canavar T7 V21', brand: 'Canavar', category: 'computer', price: 55000, quality: 74, camera: 55, performance: 78, icon: '💻', desc: 'Oyuncu laptop — RTX 4060, render iyi' },
  { id: 'pc_desktop', name: 'Toplama Masaüstü', brand: 'Özel', category: 'computer', price: 0, quality: 85, camera: 60, performance: 92, icon: '🖥️', desc: 'PC toplama ile özelleşir — en yüksek kalite buradan' },
  // Kameralar
  { id: 'cam_vlog', name: 'VlogCam ZV-1', brand: 'Sonyx', category: 'camera', price: 28000, quality: 80, camera: 85, performance: 55, icon: '📷', desc: 'Vlog canavarı — bulanık arka plan, net ses' },
  { id: 'cam_pro', name: 'A7S III', brand: 'Sonyx', category: 'camera', price: 95000, quality: 95, camera: 96, performance: 70, icon: '📷', desc: 'Sinema — düşük ışık kralı, 4K 120fps' },
  // Tablet/Konsol (ekstra)
  { id: 'tablet_pro', name: 'Tab Pro 12.9', brand: 'Meyve', category: 'tablet', price: 35000, quality: 60, camera: 65, performance: 62, icon: '📲', desc: 'Çizim & kurgu — Apple kalem destek' },
  { id: 'console_x', name: 'Kutu X', brand: 'MikroYum', category: 'console', price: 15000, quality: 45, camera: 40, performance: 50, icon: '🎮', desc: 'Oyun yayını — webcam zayıf' },
];

export const PC_COMPONENTS: Record<string, PCComponent[]> = {
  cpu: [
    { id: 'cpu_i3', name: 'i3-13100F', brand: 'Intel', type: 'cpu', price: 3800, tier: 'giriş', specs: '4C/8T • 4.5GHz', performance: 42, icon: '🧠', power: 65 },
    { id: 'cpu_i5', name: 'i5-14400F', brand: 'Intel', type: 'cpu', price: 7200, tier: 'orta', specs: '10C/16T • 4.7GHz', performance: 68, icon: '🧠', power: 95 },
    { id: 'cpu_i7', name: 'i7-14700K', brand: 'Intel', type: 'cpu', price: 14500, tier: 'üst', specs: '20C/28T • 5.6GHz', performance: 88, icon: '🧠', power: 125 },
    { id: 'cpu_r5', name: 'Ryzen 5 7600', brand: 'AMD', type: 'cpu', price: 6800, tier: 'orta', specs: '6C/12T • 5.1GHz', performance: 66, icon: '🧠', power: 65 },
    { id: 'cpu_r7', name: 'Ryzen 7 7800X3D', brand: 'AMD', type: 'cpu', price: 12800, tier: 'efsane', specs: '8C/16T • 5.0GHz 3D', performance: 92, icon: '🧠', power: 80 },
    { id: 'cpu_r9', name: 'Ryzen 9 7950X', brand: 'AMD', type: 'cpu', price: 18500, tier: 'efsane', specs: '16C/32T • 5.7GHz', performance: 95, icon: '🧠', power: 120 },
  ],
  gpu: [
    { id: 'gpu_4060', name: 'RTX 4060 8GB', brand: 'NVIDIA', type: 'gpu', price: 11500, tier: 'orta', specs: 'DLSS 3 • 1080p kralı', performance: 62, icon: '🎮', power: 115 },
    { id: 'gpu_4070', name: 'RTX 4070 12GB', brand: 'NVIDIA', type: 'gpu', price: 19800, tier: 'üst', specs: 'DLSS 3 • 1440p', performance: 78, icon: '🎮', power: 200 },
    { id: 'gpu_4080', name: 'RTX 4080 16GB', brand: 'NVIDIA', type: 'gpu', price: 38000, tier: 'efsane', specs: '4K • AV1', performance: 92, icon: '🎮', power: 320 },
    { id: 'gpu_4090', name: 'RTX 4090 24GB', brand: 'NVIDIA', type: 'gpu', price: 62000, tier: 'efsane', specs: '4K canavar • 450W', performance: 100, icon: '🎮', power: 450 },
    { id: 'gpu_7600', name: 'RX 7600 8GB', brand: 'AMD', type: 'gpu', price: 8500, tier: 'giriş', specs: '1080p • FSR', performance: 55, icon: '🎮', power: 165 },
    { id: 'gpu_7800', name: 'RX 7800 XT 16GB', brand: 'AMD', type: 'gpu', price: 16500, tier: 'orta', specs: '1440p • 16GB', performance: 72, icon: '🎮', power: 263 },
  ],
  ram: [
    { id: 'ram_16', name: '16GB DDR5 5600', brand: 'Corsair', type: 'ram', price: 2200, tier: 'orta', specs: '2x8GB CL36', performance: 60, icon: '💾', power: 10 },
    { id: 'ram_32', name: '32GB DDR5 6000', brand: 'G.Skill', type: 'ram', price: 4200, tier: 'üst', specs: '2x16GB CL30 Expo', performance: 78, icon: '💾', power: 12 },
    { id: 'ram_64', name: '64GB DDR5 6000', brand: 'Kingston', type: 'ram', price: 7800, tier: 'efsane', specs: '2x32GB CL32', performance: 90, icon: '💾', power: 15 },
  ],
  motherboard: [
    { id: 'mb_b660', name: 'B660M-HDV', brand: 'ASRock', type: 'motherboard', price: 2800, tier: 'giriş', specs: 'mATX • DDR5', performance: 45, icon: '🔌', power: 20 },
    { id: 'mb_b760', name: 'B760 Gaming X', brand: 'Gigabyte', type: 'motherboard', price: 4800, tier: 'orta', specs: 'ATX • WiFi', performance: 68, icon: '🔌', power: 25 },
    { id: 'mb_z790', name: 'Z790-E ROG', brand: 'ASUS', type: 'motherboard', price: 9500, tier: 'efsane', specs: 'ATX • WiFi 6E • OC', performance: 92, icon: '🔌', power: 30 },
  ],
  storage: [
    { id: 'ssd_1tb', name: '1TB NVMe Gen4', brand: 'Samsung 990', type: 'storage', price: 2800, tier: 'orta', specs: '7450 MB/s', performance: 70, icon: '💿', power: 6 },
    { id: 'ssd_2tb', name: '2TB NVMe Gen4', brand: 'WD Black', type: 'storage', price: 5200, tier: 'üst', specs: '7300 MB/s', performance: 85, icon: '💿', power: 7 },
    { id: 'ssd_4tb', name: '4TB NVMe Gen4', brand: 'Seagate', type: 'storage', price: 9800, tier: 'efsane', specs: '7250 MB/s • 4TB', performance: 95, icon: '💿', power: 8 },
  ],
  psu: [
    { id: 'psu_650', name: '650W 80+ Bronze', brand: 'FSP', type: 'psu', price: 1800, tier: 'giriş', specs: 'Bronze • 650W', performance: 50, icon: '🔋', power: 650 },
    { id: 'psu_750g', name: '750W 80+ Gold', brand: 'Corsair RM750', type: 'psu', price: 3200, tier: 'orta', specs: 'Gold • Full Mod', performance: 75, icon: '🔋', power: 750 },
    { id: 'psu_1000', name: '1000W 80+ Gold', brand: 'MSI MPG', type: 'psu', price: 5200, tier: 'efsane', specs: 'ATX 3.0 • PCIe5', performance: 95, icon: '🔋', power: 1000 },
  ],
  case: [
    { id: 'case_mini', name: 'Matrexx 40', brand: 'DeepCool', type: 'case', price: 1200, tier: 'giriş', specs: 'mATX • Mesh', performance: 40, icon: '🖥️', power: 0 },
    { id: 'case_mid', name: 'H7 Flow', brand: 'NZXT', type: 'case', price: 3400, tier: 'orta', specs: 'ATX • AirFlow', performance: 72, icon: '🖥️', power: 0 },
    { id: 'case_prem', name: 'O11 Dynamic EVO', brand: 'Lian Li', type: 'case', price: 6200, tier: 'efsane', specs: 'Premium • Cam', performance: 92, icon: '🖥️', power: 0 },
  ],
  cooling: [
    { id: 'cool_air', name: 'AK400', brand: 'DeepCool', type: 'cooling', price: 900, tier: 'giriş', specs: 'Hava • 4 heatpipe', performance: 45, icon: '❄️', power: 5 },
    { id: 'cool_aio240', name: '240mm AIO', brand: 'Corsair H100', type: 'cooling', price: 2800, tier: 'orta', specs: '240mm Sıvı', performance: 75, icon: '❄️', power: 12 },
    { id: 'cool_aio360', name: '360mm AIO', brand: 'NZXT Kraken', type: 'cooling', price: 5200, tier: 'efsane', specs: '360mm • LCD', performance: 95, icon: '❄️', power: 18 },
  ],
  monitor: [
    { id: 'mon_1080', name: '24" 1080p 144Hz', brand: 'AOC', type: 'monitor', price: 3200, tier: 'giriş', specs: 'IPS 144Hz', performance: 45, icon: '🖥️', power: 25 },
    { id: 'mon_1440', name: '27" 1440p 165Hz', brand: 'LG UltraGear', type: 'monitor', price: 6800, tier: 'orta', specs: 'IPS 165Hz', performance: 72, icon: '🖥️', power: 35 },
    { id: 'mon_4k', name: '32" 4K 144Hz', brand: 'Samsung Odyssey', type: 'monitor', price: 14500, tier: 'efsane', specs: '4K 144Hz HDR', performance: 95, icon: '🖥️', power: 55 },
  ],
};

export const AVM_STORES = [
  { id: 'teknosa', name: 'TeknoSA', icon: '🏬', desc: 'Telefon & aksesuar cenneti', categories: ['phone','tablet'] as const, color: 'from-orange-500 to-red-500' },
  { id: 'vatan', name: 'Vatan', icon: '💻', desc: 'Bilgisayar & bileşen', categories: ['computer','camera'] as const, color: 'from-blue-500 to-cyan-500' },
  { id: 'itopya', name: 'İtopya', icon: '🛠️', desc: 'PC toplama üssü — parça parça', categories: ['computer'] as const, color: 'from-violet-500 to-fuchsia-500' },
  { id: 'media', name: 'MediaMarkt', icon: '📺', desc: 'Kamera & monitör & konsol', categories: ['camera','monitor','console'] as const, color: 'from-emerald-500 to-teal-500' },
];
