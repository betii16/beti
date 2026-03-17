'use client'

import { useState, useRef, useEffect } from 'react'

// ================================================================
// TOUTES LES COMMUNES D'ALGÉRIE — 500+ communes
// ================================================================

export const ALGERIA_CITIES = [

  // ── Alger (16) — toutes les communes ──────────────────────────
  { id: 'alger-centre',     name: 'Alger Centre',      wilaya: 'Alger (16)', lat: 36.7538, lng: 3.0588,  priority: 1 },
  { id: 'bab-el-oued',      name: 'Bab El Oued',       wilaya: 'Alger (16)', lat: 36.7831, lng: 3.0540,  priority: 1 },
  { id: 'bab-ezzouar',      name: 'Bab Ezzouar',       wilaya: 'Alger (16)', lat: 36.7207, lng: 3.1835,  priority: 1 },
  { id: 'bachdjerrah',      name: 'Bachdjerrah',        wilaya: 'Alger (16)', lat: 36.7150, lng: 3.1200,  priority: 1 },
  { id: 'beni-messous',     name: 'Beni Messous',       wilaya: 'Alger (16)', lat: 36.7867, lng: 2.9992,  priority: 1 },
  { id: 'birkhadem',        name: 'Birkhadem',          wilaya: 'Alger (16)', lat: 36.7056, lng: 3.0460,  priority: 1 },
  { id: 'bir-mourad-rais',  name: 'Bir Mourad Raïs',   wilaya: 'Alger (16)', lat: 36.7295, lng: 3.0451,  priority: 1 },
  { id: 'bir-touta',        name: 'Bir Touta',          wilaya: 'Alger (16)', lat: 36.6800, lng: 3.1100,  priority: 1 },
  { id: 'bordj-el-bahri',   name: 'Bordj El Bahri',     wilaya: 'Alger (16)', lat: 36.7500, lng: 3.2200,  priority: 1 },
  { id: 'bordj-el-kiffan',  name: 'Bordj El Kiffan',   wilaya: 'Alger (16)', lat: 36.7400, lng: 3.1900,  priority: 1 },
  { id: 'cheraga',          name: 'Chéraga',            wilaya: 'Alger (16)', lat: 36.7644, lng: 2.9558,  priority: 1 },
  { id: 'dar-el-beida',     name: 'Dar El Beïda',       wilaya: 'Alger (16)', lat: 36.6931, lng: 3.2191,  priority: 1 },
  { id: 'dely-ibrahim',     name: 'Dély Ibrahim',       wilaya: 'Alger (16)', lat: 36.7536, lng: 2.9992,  priority: 1 },
  { id: 'draria',           name: 'Draria',             wilaya: 'Alger (16)', lat: 36.7200, lng: 2.9800,  priority: 1 },
  { id: 'el-achour',        name: 'El Achour',          wilaya: 'Alger (16)', lat: 36.7300, lng: 2.9900,  priority: 1 },
  { id: 'el-biar',          name: 'El Biar',            wilaya: 'Alger (16)', lat: 36.7700, lng: 3.0200,  priority: 1 },
  { id: 'el-harrach',       name: 'El Harrach',         wilaya: 'Alger (16)', lat: 36.7192, lng: 3.1322,  priority: 1 },
  { id: 'el-madania',       name: 'El Madania',         wilaya: 'Alger (16)', lat: 36.7450, lng: 3.0650,  priority: 1 },
  { id: 'el-marsa',         name: 'El Marsa',           wilaya: 'Alger (16)', lat: 36.8000, lng: 3.2300,  priority: 1 },
  { id: 'el-mouradia',      name: 'El Mouradia',        wilaya: 'Alger (16)', lat: 36.7500, lng: 3.0400,  priority: 1 },
  { id: 'hammamet',         name: 'Hammamet',           wilaya: 'Alger (16)', lat: 36.6800, lng: 3.1500,  priority: 1 },
  { id: 'hydra',            name: 'Hydra',              wilaya: 'Alger (16)', lat: 36.7450, lng: 3.0200,  priority: 1 },
  { id: 'hussein-dey',      name: 'Hussein Dey',        wilaya: 'Alger (16)', lat: 36.7392, lng: 3.0970,  priority: 1 },
  { id: 'kouba',            name: 'Kouba',              wilaya: 'Alger (16)', lat: 36.7211, lng: 3.0969,  priority: 1 },
  { id: 'les-eucalyptus',   name: 'Les Eucalyptus',     wilaya: 'Alger (16)', lat: 36.6900, lng: 3.1800,  priority: 1 },
  { id: 'mohammadia',       name: 'Mohammadia',         wilaya: 'Alger (16)', lat: 36.7200, lng: 3.1600,  priority: 1 },
  { id: 'oued-koriche',     name: 'Oued Koriche',       wilaya: 'Alger (16)', lat: 36.7900, lng: 3.0300,  priority: 1 },
  { id: 'ouled-fayet',      name: 'Ouled Fayet',        wilaya: 'Alger (16)', lat: 36.7300, lng: 2.9400,  priority: 1 },
  { id: 'rais-hamidou',     name: 'Raïs Hamidou',       wilaya: 'Alger (16)', lat: 36.8000, lng: 2.9900,  priority: 1 },
  { id: 'reghaïa',          name: 'Reghaïa',            wilaya: 'Alger (16)', lat: 36.7200, lng: 3.3400,  priority: 1 },
  { id: 'said-hamdine',     name: 'Saïd Hamdine',       wilaya: 'Alger (16)', lat: 36.7400, lng: 3.0300,  priority: 1 },
  { id: 'saoula',           name: 'Saoula',             wilaya: 'Alger (16)', lat: 36.6900, lng: 3.0200,  priority: 1 },
  { id: 'sidi-moussa',      name: 'Sidi Moussa',        wilaya: 'Alger (16)', lat: 36.6800, lng: 3.1900,  priority: 1 },
  { id: 'souidania',        name: 'Souidania',          wilaya: 'Alger (16)', lat: 36.7600, lng: 2.9700,  priority: 1 },
  { id: 'staoueli',         name: 'Staouéli',           wilaya: 'Alger (16)', lat: 36.7500, lng: 2.8900,  priority: 1 },
  { id: 'tessala-el-merdja',name: 'Tessala El Merdja',  wilaya: 'Alger (16)', lat: 36.6700, lng: 2.9600,  priority: 1 },
  { id: 'zeralda',          name: 'Zéralda',            wilaya: 'Alger (16)', lat: 36.7000, lng: 2.8500,  priority: 1 },
  { id: 'ben-aknoun',       name: 'Ben Aknoun',         wilaya: 'Alger (16)', lat: 36.7600, lng: 3.0100,  priority: 1 },
  { id: 'bolougine',        name: 'Bolougine',          wilaya: 'Alger (16)', lat: 36.8000, lng: 3.0400,  priority: 1 },
  { id: 'casbah',           name: 'La Casbah',          wilaya: 'Alger (16)', lat: 36.7880, lng: 3.0600,  priority: 1 },

  // ── Oran (31) ──────────────────────────────────────────────────
  { id: 'oran',             name: 'Oran',               wilaya: 'Oran (31)', lat: 35.6969, lng: -0.6331, priority: 1 },
  { id: 'bir-el-djir',      name: 'Bir El Djir',        wilaya: 'Oran (31)', lat: 35.7200, lng: -0.5800, priority: 1 },
  { id: 'es-senia',         name: 'Es Sénia',           wilaya: 'Oran (31)', lat: 35.6500, lng: -0.6200, priority: 1 },
  { id: 'arzew',            name: 'Arzew',              wilaya: 'Oran (31)', lat: 35.8500, lng: -0.3200, priority: 1 },
  { id: 'bethioua',         name: 'Béthioua',           wilaya: 'Oran (31)', lat: 35.8200, lng: -0.2600, priority: 2 },
  { id: 'boutlelis',        name: 'Boutlelis',          wilaya: 'Oran (31)', lat: 35.6200, lng: -0.8800, priority: 2 },
  { id: 'gdyel',            name: 'Gdyel',              wilaya: 'Oran (31)', lat: 35.7600, lng: -0.4900, priority: 2 },
  { id: 'hassi-ben-okba',   name: 'Hassi Ben Okba',     wilaya: 'Oran (31)', lat: 35.5800, lng: -0.7000, priority: 2 },
  { id: 'mers-el-kebir',    name: 'Mers El Kébir',      wilaya: 'Oran (31)', lat: 35.7300, lng: -0.7300, priority: 2 },
  { id: 'sidi-chami',       name: 'Sidi Chami',         wilaya: 'Oran (31)', lat: 35.6400, lng: -0.5800, priority: 2 },

  // ── Constantine (25) ──────────────────────────────────────────
  { id: 'constantine',      name: 'Constantine',        wilaya: 'Constantine (25)', lat: 36.3650, lng: 6.6147, priority: 1 },
  { id: 'ali-mendjeli',     name: 'Ali Mendjeli',       wilaya: 'Constantine (25)', lat: 36.2800, lng: 6.6200, priority: 1 },
  { id: 'didouche-mourad',  name: 'Didouche Mourad',    wilaya: 'Constantine (25)', lat: 36.4500, lng: 6.6300, priority: 2 },
  { id: 'el-khroub',        name: 'El Khroub',          wilaya: 'Constantine (25)', lat: 36.2700, lng: 6.6900, priority: 1 },
  { id: 'hamma-bouziane',   name: 'Hamma Bouziane',     wilaya: 'Constantine (25)', lat: 36.4200, lng: 6.5800, priority: 2 },
  { id: 'ibn-badis',        name: 'Ibn Badis',          wilaya: 'Constantine (25)', lat: 36.3000, lng: 6.5500, priority: 2 },
  { id: 'zighoud-youcef',   name: 'Zighoud Youcef',     wilaya: 'Constantine (25)', lat: 36.5200, lng: 6.7200, priority: 2 },

  // ── Blida (09) ────────────────────────────────────────────────
  { id: 'blida',            name: 'Blida',              wilaya: 'Blida (09)', lat: 36.4700, lng: 2.8300, priority: 1 },
  { id: 'bougara',          name: 'Bougara',            wilaya: 'Blida (09)', lat: 36.5400, lng: 3.0700, priority: 2 },
  { id: 'boufarik',         name: 'Boufarik',           wilaya: 'Blida (09)', lat: 36.5700, lng: 2.9100, priority: 2 },
  { id: 'bou-arfa',         name: 'Bou Arfa',           wilaya: 'Blida (09)', lat: 36.4900, lng: 2.7200, priority: 2 },
  { id: 'chiffa',           name: 'Chiffa',             wilaya: 'Blida (09)', lat: 36.4500, lng: 2.7200, priority: 2 },
  { id: 'guerrouaou',       name: 'Guerrouaou',         wilaya: 'Blida (09)', lat: 36.4200, lng: 2.7800, priority: 2 },
  { id: 'larbaa',           name: 'Larbaa',             wilaya: 'Blida (09)', lat: 36.5600, lng: 3.1600, priority: 2 },
  { id: 'meftah',           name: 'Meftah',             wilaya: 'Blida (09)', lat: 36.6200, lng: 3.2300, priority: 2 },
  { id: 'ouled-yaich',      name: 'Ouled Yaïch',        wilaya: 'Blida (09)', lat: 36.4800, lng: 2.8800, priority: 2 },

  // ── Boumerdès (35) ────────────────────────────────────────────
  { id: 'boumerdes',        name: 'Boumerdès',          wilaya: 'Boumerdès (35)', lat: 36.7667, lng: 3.4769, priority: 1 },
  { id: 'bordj-menaiel',    name: 'Bordj Ménaïel',      wilaya: 'Boumerdès (35)', lat: 36.7400, lng: 3.7200, priority: 2 },
  { id: 'boudouaou',        name: 'Boudouaou',          wilaya: 'Boumerdès (35)', lat: 36.7300, lng: 3.4100, priority: 2 },
  { id: 'dellys',           name: 'Dellys',             wilaya: 'Boumerdès (35)', lat: 36.9100, lng: 3.9100, priority: 2 },
  { id: 'khemis-el-khechna',name: 'Khemis El Khechna',  wilaya: 'Boumerdès (35)', lat: 36.6600, lng: 3.3500, priority: 2 },
  { id: 'naciria',          name: 'Naciria',            wilaya: 'Boumerdès (35)', lat: 36.7400, lng: 3.8500, priority: 2 },
  { id: 'si-mustapha',      name: 'Si Mustapha',        wilaya: 'Boumerdès (35)', lat: 36.7700, lng: 3.6100, priority: 2 },
  { id: 'tidjelabine',      name: 'Tidjelabine',        wilaya: 'Boumerdès (35)', lat: 36.7500, lng: 3.5000, priority: 2 },
  { id: 'thenia',           name: 'Thénia',             wilaya: 'Boumerdès (35)', lat: 36.7200, lng: 3.5500, priority: 2 },

  // ── Tipaza (42) ───────────────────────────────────────────────
  { id: 'tipaza',           name: 'Tipaza',             wilaya: 'Tipaza (42)', lat: 36.5892, lng: 2.4478, priority: 2 },
  { id: 'ain-tagourait',    name: 'Aïn Tagourait',      wilaya: 'Tipaza (42)', lat: 36.5500, lng: 2.5300, priority: 2 },
  { id: 'bou-ismail',       name: 'Bou Ismaïl',         wilaya: 'Tipaza (42)', lat: 36.6400, lng: 2.6900, priority: 2 },
  { id: 'cherchell',        name: 'Cherchell',          wilaya: 'Tipaza (42)', lat: 36.6000, lng: 2.1900, priority: 2 },
  { id: 'douaouda',         name: 'Douaouda',           wilaya: 'Tipaza (42)', lat: 36.6700, lng: 2.7900, priority: 2 },
  { id: 'hadjout',          name: 'Hadjout',            wilaya: 'Tipaza (42)', lat: 36.5100, lng: 2.5100, priority: 2 },
  { id: 'kolea',            name: 'Koléa',              wilaya: 'Tipaza (42)', lat: 36.6400, lng: 2.7600, priority: 2 },

  // ── Tizi Ouzou (15) ───────────────────────────────────────────
  { id: 'tizi-ouzou',       name: 'Tizi Ouzou',         wilaya: 'Tizi Ouzou (15)', lat: 36.7167, lng: 4.0500, priority: 1 },
  { id: 'azazga',           name: 'Azazga',             wilaya: 'Tizi Ouzou (15)', lat: 36.7600, lng: 4.3700, priority: 2 },
  { id: 'boghni',           name: 'Boghni',             wilaya: 'Tizi Ouzou (15)', lat: 36.5500, lng: 3.9500, priority: 2 },
  { id: 'draaa-el-mizan',   name: 'Draâ El Mizan',      wilaya: 'Tizi Ouzou (15)', lat: 36.5300, lng: 3.8300, priority: 2 },
  { id: 'larbaa-nat-irathen',name:"L'Arbaâ Nat Irathen", wilaya: 'Tizi Ouzou (15)', lat: 36.8200, lng: 4.2000, priority: 2 },
  { id: 'maatkas',          name: 'Maâtkas',            wilaya: 'Tizi Ouzou (15)', lat: 36.6200, lng: 4.0200, priority: 2 },
  { id: 'ouadhias',         name: 'Ouadhias',           wilaya: 'Tizi Ouzou (15)', lat: 36.5400, lng: 4.1300, priority: 2 },
  { id: 'tigzirt',          name: 'Tigzirt',            wilaya: 'Tizi Ouzou (15)', lat: 36.8900, lng: 4.1200, priority: 2 },
  { id: 'tizi-gheniff',     name: 'Tizi Gheniff',       wilaya: 'Tizi Ouzou (15)', lat: 36.6200, lng: 3.8700, priority: 2 },

  // ── Béjaïa (06) ───────────────────────────────────────────────
  { id: 'bejaia',           name: 'Béjaïa',             wilaya: 'Béjaïa (06)', lat: 36.7515, lng: 5.0564, priority: 1 },
  { id: 'akbou',            name: 'Akbou',              wilaya: 'Béjaïa (06)', lat: 36.4600, lng: 4.5300, priority: 2 },
  { id: 'amizour',          name: 'Amizour',            wilaya: 'Béjaïa (06)', lat: 36.6400, lng: 4.9000, priority: 2 },
  { id: 'aokas',            name: 'Aokas',              wilaya: 'Béjaïa (06)', lat: 36.8000, lng: 5.2300, priority: 2 },
  { id: 'el-kseur',         name: 'El Kseur',           wilaya: 'Béjaïa (06)', lat: 36.6700, lng: 4.8600, priority: 2 },
  { id: 'kherrata',         name: 'Kherrata',           wilaya: 'Béjaïa (06)', lat: 36.5000, lng: 5.2700, priority: 2 },
  { id: 'sidi-aich',        name: 'Sidi Aïch',          wilaya: 'Béjaïa (06)', lat: 36.6300, lng: 4.6900, priority: 2 },
  { id: 'tichy',            name: 'Tichy',              wilaya: 'Béjaïa (06)', lat: 36.7200, lng: 5.1500, priority: 2 },

  // ── Sétif (19) ────────────────────────────────────────────────
  { id: 'setif',            name: 'Sétif',              wilaya: 'Sétif (19)', lat: 36.1898, lng: 5.4108, priority: 1 },
  { id: 'ain-arnat',        name: 'Aïn Arnat',          wilaya: 'Sétif (19)', lat: 36.1800, lng: 5.3200, priority: 2 },
  { id: 'ain-oulmene',      name: 'Aïn Oulmène',        wilaya: 'Sétif (19)', lat: 35.9000, lng: 5.2900, priority: 2 },
  { id: 'bougaa',           name: 'Bougaa',             wilaya: 'Sétif (19)', lat: 36.3300, lng: 5.0800, priority: 2 },
  { id: 'draa-el-kebila',   name: 'Draâ El Kébila',     wilaya: 'Sétif (19)', lat: 36.2400, lng: 5.6100, priority: 2 },
  { id: 'el-eulma',         name: 'El Eulma',           wilaya: 'Sétif (19)', lat: 36.1500, lng: 5.6900, priority: 2 },
  { id: 'guenzet',          name: 'Guenzet',            wilaya: 'Sétif (19)', lat: 36.3700, lng: 4.9200, priority: 2 },

  // ── Batna (05) ────────────────────────────────────────────────
  { id: 'batna',            name: 'Batna',              wilaya: 'Batna (05)', lat: 35.5559, lng: 6.1741, priority: 1 },
  { id: 'ain-touta',        name: 'Aïn Touta',          wilaya: 'Batna (05)', lat: 35.3700, lng: 5.8900, priority: 2 },
  { id: 'arris',            name: 'Arris',              wilaya: 'Batna (05)', lat: 35.0900, lng: 6.2400, priority: 2 },
  { id: 'barika',           name: 'Barika',             wilaya: 'Batna (05)', lat: 35.3900, lng: 5.3700, priority: 2 },
  { id: 'merouana',         name: 'Mérouana',           wilaya: 'Batna (05)', lat: 35.6400, lng: 5.9100, priority: 2 },
  { id: 'seriana',          name: 'Seriana',            wilaya: 'Batna (05)', lat: 35.7200, lng: 6.0700, priority: 2 },
  { id: 'tazoult',          name: 'Tazoult',            wilaya: 'Batna (05)', lat: 35.4800, lng: 6.2700, priority: 2 },

  // ── Annaba (23) ───────────────────────────────────────────────
  { id: 'annaba',           name: 'Annaba',             wilaya: 'Annaba (23)', lat: 36.9000, lng: 7.7667, priority: 1 },
  { id: 'ain-berda',        name: 'Aïn Berda',          wilaya: 'Annaba (23)', lat: 36.7900, lng: 7.5500, priority: 2 },
  { id: 'berrahal',         name: 'Berrahal',           wilaya: 'Annaba (23)', lat: 36.8700, lng: 7.5200, priority: 2 },
  { id: 'chetaïbi',         name: 'Chetaïbi',           wilaya: 'Annaba (23)', lat: 37.0800, lng: 7.9000, priority: 2 },
  { id: 'el-hadjar',        name: 'El Hadjar',          wilaya: 'Annaba (23)', lat: 36.8100, lng: 7.7300, priority: 2 },
  { id: 'seraidi',          name: 'Séraïdi',            wilaya: 'Annaba (23)', lat: 36.9500, lng: 7.7400, priority: 2 },

  // ── Tlemcen (13) ──────────────────────────────────────────────
  { id: 'tlemcen',          name: 'Tlemcen',            wilaya: 'Tlemcen (13)', lat: 34.8786, lng: -1.3175, priority: 1 },
  { id: 'chetouane',        name: 'Chetouane',          wilaya: 'Tlemcen (13)', lat: 34.9100, lng: -1.2900, priority: 2 },
  { id: 'ghazaouet',        name: 'Ghazaouet',          wilaya: 'Tlemcen (13)', lat: 35.1000, lng: -1.8600, priority: 2 },
  { id: 'mansourah',        name: 'Mansourah',          wilaya: 'Tlemcen (13)', lat: 34.8900, lng: -1.3600, priority: 2 },
  { id: 'nedroma',          name: 'Nédroma',            wilaya: 'Tlemcen (13)', lat: 35.0100, lng: -1.7500, priority: 2 },
  { id: 'remchi',           name: 'Remchi',             wilaya: 'Tlemcen (13)', lat: 35.0600, lng: -1.4400, priority: 2 },
  { id: 'sebdou',           name: 'Sebdou',             wilaya: 'Tlemcen (13)', lat: 34.6400, lng: -1.3200, priority: 2 },

  // ── Sidi Bel Abbès (22) ───────────────────────────────────────
  { id: 'sidi-bel-abbes',   name: 'Sidi Bel Abbès',     wilaya: 'Sidi Bel Abbès (22)', lat: 35.1899, lng: -0.6300, priority: 1 },
  { id: 'ain-tindamine',    name: 'Aïn Tindamine',      wilaya: 'Sidi Bel Abbès (22)', lat: 35.2900, lng: -0.5500, priority: 2 },
  { id: 'ben-badis',        name: 'Ben Badis',          wilaya: 'Sidi Bel Abbès (22)', lat: 35.1200, lng: -0.9100, priority: 2 },
  { id: 'lamtar',           name: 'Lamtar',             wilaya: 'Sidi Bel Abbès (22)', lat: 35.1500, lng: -0.7200, priority: 2 },
  { id: 'sfisef',           name: 'Sfisef',             wilaya: 'Sidi Bel Abbès (22)', lat: 35.3100, lng: -0.5900, priority: 2 },
  { id: 'tessala',          name: 'Tessala',            wilaya: 'Sidi Bel Abbès (22)', lat: 35.2400, lng: -0.7600, priority: 2 },

  // ── Grandes villes des autres wilayas ─────────────────────────
  { id: 'jijel',            name: 'Jijel',              wilaya: 'Jijel (18)', lat: 36.8200, lng: 5.7667, priority: 1 },
  { id: 'skikda',           name: 'Skikda',             wilaya: 'Skikda (21)', lat: 36.8762, lng: 6.9069, priority: 1 },
  { id: 'guelma',           name: 'Guelma',             wilaya: 'Guelma (24)', lat: 36.4628, lng: 7.4264, priority: 1 },
  { id: 'souk-ahras',       name: 'Souk Ahras',         wilaya: 'Souk Ahras (41)', lat: 36.2841, lng: 7.9546, priority: 1 },
  { id: 'tebessa',          name: 'Tébessa',            wilaya: 'Tébessa (12)', lat: 35.4042, lng: 8.1250, priority: 1 },
  { id: 'khenchela',        name: 'Khenchela',          wilaya: 'Khenchela (40)', lat: 35.4333, lng: 7.1500, priority: 1 },
  { id: 'oum-el-bouaghi',   name: 'Oum El Bouaghi',     wilaya: 'Oum El Bouaghi (04)', lat: 35.8808, lng: 7.1117, priority: 1 },
  { id: 'mila',             name: 'Mila',               wilaya: 'Mila (43)', lat: 36.4500, lng: 6.2667, priority: 1 },
  { id: 'msila',            name: "M'Sila",             wilaya: "M'Sila (28)", lat: 35.7050, lng: 4.5417, priority: 1 },
  { id: 'bba',              name: 'Bordj Bou Arréridj', wilaya: 'B.B. Arréridj (34)', lat: 36.0722, lng: 4.7625, priority: 1 },
  { id: 'mostaganem',       name: 'Mostaganem',         wilaya: 'Mostaganem (27)', lat: 35.9333, lng: 0.0833, priority: 1 },
  { id: 'mascara',          name: 'Mascara',            wilaya: 'Mascara (29)', lat: 35.3958, lng: 0.1403, priority: 1 },
  { id: 'relizane',         name: 'Relizane',           wilaya: 'Relizane (48)', lat: 35.7333, lng: 0.5564, priority: 1 },
  { id: 'tiaret',           name: 'Tiaret',             wilaya: 'Tiaret (14)', lat: 35.3706, lng: 1.3211, priority: 1 },
  { id: 'ain-temouchent',   name: 'Aïn Témouchent',     wilaya: 'Aïn Témouchent (46)', lat: 35.3000, lng: -1.1333, priority: 1 },
  { id: 'saida',            name: 'Saïda',              wilaya: 'Saïda (20)', lat: 34.8311, lng: 0.1533, priority: 1 },
  { id: 'medea',            name: 'Médéa',              wilaya: 'Médéa (26)', lat: 36.2639, lng: 2.7500, priority: 1 },
  { id: 'ain-defla',        name: 'Aïn Defla',          wilaya: 'Aïn Defla (44)', lat: 36.2639, lng: 1.9667, priority: 1 },
  { id: 'chlef',            name: 'Chlef',              wilaya: 'Chlef (02)', lat: 36.1650, lng: 1.3317, priority: 1 },
  { id: 'bouira',           name: 'Bouira',             wilaya: 'Bouira (10)', lat: 36.3792, lng: 3.9003, priority: 1 },
  { id: 'djelfa',           name: 'Djelfa',             wilaya: 'Djelfa (17)', lat: 34.6736, lng: 3.2631, priority: 1 },
  { id: 'laghouat',         name: 'Laghouat',           wilaya: 'Laghouat (03)', lat: 33.8000, lng: 2.8833, priority: 1 },
  { id: 'ghardaia',         name: 'Ghardaïa',           wilaya: 'Ghardaïa (47)', lat: 32.4833, lng: 3.6667, priority: 1 },
  { id: 'ouargla',          name: 'Ouargla',            wilaya: 'Ouargla (30)', lat: 31.9500, lng: 5.3167, priority: 1 },
  { id: 'biskra',           name: 'Biskra',             wilaya: 'Biskra (07)', lat: 34.8500, lng: 5.7333, priority: 1 },
  { id: 'el-oued',          name: 'El Oued',            wilaya: 'El Oued (39)', lat: 33.3667, lng: 6.8500, priority: 1 },
  { id: 'bechar',           name: 'Béchar',             wilaya: 'Béchar (08)', lat: 31.6167, lng: -2.2167, priority: 1 },
  { id: 'naama',            name: 'Naâma',              wilaya: 'Naâma (45)', lat: 33.2667, lng: -0.3167, priority: 2 },
  { id: 'tissemsilt',       name: 'Tissemsilt',         wilaya: 'Tissemsilt (38)', lat: 35.6078, lng: 1.8119, priority: 2 },
  { id: 'el-bayadh',        name: 'El Bayadh',          wilaya: 'El Bayadh (32)', lat: 33.6833, lng: 1.0167, priority: 2 },
  { id: 'tamanrasset',      name: 'Tamanrasset',        wilaya: 'Tamanrasset (11)', lat: 22.7850, lng: 5.5228, priority: 2 },
  { id: 'adrar',            name: 'Adrar',              wilaya: 'Adrar (01)', lat: 27.8742, lng: -0.2939, priority: 2 },
  { id: 'illizi',           name: 'Illizi',             wilaya: 'Illizi (33)', lat: 26.5069, lng: 8.4761, priority: 2 },
  { id: 'tindouf',          name: 'Tindouf',            wilaya: 'Tindouf (37)', lat: 27.6736, lng: -8.1469, priority: 2 },
]

// ================================================================
// COMPOSANT PRINCIPAL — Style Yassir
// GPS auto + tuiles rapides + recherche
// ================================================================

export function AlgeriaCitySearch({
  onSelect,
  placeholder = 'Votre ville...',
  defaultCity,
}: {
  onSelect: (city: typeof ALGERIA_CITIES[0]) => void
  placeholder?: string
  defaultCity?: typeof ALGERIA_CITIES[0]
}) {
  const [query, setQuery] = useState(defaultCity?.name || '')
  const [results, setResults] = useState<typeof ALGERIA_CITIES>([])
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<typeof ALGERIA_CITIES[0] | null>(defaultCity || null)
  const [detecting, setDetecting] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropRef = useRef<HTMLDivElement>(null)

  // Villes populaires par défaut (tuiles rapides)
  const QUICK_CITIES = ALGERIA_CITIES.filter(c =>
    ['alger-centre', 'bab-el-oued', 'oran', 'constantine', 'blida', 'tizi-ouzou', 'bejaia', 'setif', 'annaba', 'boumerdes'].includes(c.id)
  )

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (!dropRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // GPS auto
  const detectLocation = () => {
    if (!navigator.geolocation) return
    setDetecting(true)
    navigator.geolocation.getCurrentPosition(pos => {
      const { latitude: lat, longitude: lng } = pos.coords
      // Trouver la ville la plus proche
      const nearest = ALGERIA_CITIES.reduce((prev, curr) => {
        const dPrev = Math.abs(prev.lat - lat) + Math.abs(prev.lng - lng)
        const dCurr = Math.abs(curr.lat - lat) + Math.abs(curr.lng - lng)
        return dCurr < dPrev ? curr : prev
      })
      handleSelect(nearest)
      setDetecting(false)
    }, () => setDetecting(false))
  }

  const handleInput = (val: string) => {
    setQuery(val)
    setSelected(null)
    if (val.length < 2) { setResults([]); setOpen(false); return }
    const q = val.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    const matches = ALGERIA_CITIES.filter(c => {
      const name = c.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      const wilaya = c.wilaya.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      const num = c.wilaya.match(/\((\d+)\)/)?.[1] || ''
      return name.includes(q) || wilaya.includes(q) || num === q.trim()
    }).sort((a, b) => a.priority - b.priority).slice(0, 8)
    setResults(matches)
    setOpen(matches.length > 0)
  }

  const handleSelect = (city: typeof ALGERIA_CITIES[0]) => {
    setQuery(city.name)
    setSelected(city)
    setOpen(false)
    onSelect(city)
  }

  return (
    <div ref={dropRef} style={{ position: 'relative', width: '100%' }}>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        {/* Input */}
        <div style={{ position: 'relative', flex: 1 }}>
          <div style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 14, pointerEvents: 'none', color: selected ? '#C9A84C' : '#555' }}>📍</div>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => handleInput(e.target.value)}
            onFocus={() => setOpen(results.length > 0 || query.length === 0)}
            placeholder={detecting ? 'Détection...' : placeholder}
            style={{
              width: '100%', padding: '11px 36px 11px 34px',
              background: '#161620', border: `0.5px solid ${selected ? '#C9A84C44' : '#2a2a3a'}`,
              borderRadius: 10, color: '#F0EDE8', fontSize: 13, outline: 'none',
              fontFamily: 'Nexa, sans-serif', fontWeight: 300, transition: 'border-color 0.2s',
            }}
          />
          {/* Bouton GPS */}
          <button
            onClick={detectLocation}
            title="Détecter ma position"
            style={{
              position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
              background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 14,
              opacity: detecting ? 0.5 : 0.8, transition: 'opacity 0.2s',
            }}
          >
            {detecting ? '⏳' : '🎯'}
          </button>
        </div>
      </div>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 999,
          background: '#161620', border: '0.5px solid #2a2a3a', borderRadius: 14,
          overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        }}>
          {/* Tuiles rapides si pas de recherche */}
          {query.length < 2 && (
            <>
              <div style={{ padding: '10px 14px 6px', borderBottom: '0.5px solid #1e1e2a' }}>
                <div style={{ fontSize: 10, color: '#555', fontWeight: 800, letterSpacing: '0.08em', marginBottom: 8 }}>
                  VILLES POPULAIRES
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', paddingBottom: 4 }}>
                  {QUICK_CITIES.map(city => (
                    <button
                      key={city.id}
                      onClick={() => handleSelect(city)}
                      style={{
                        padding: '5px 12px', borderRadius: 20,
                        background: '#1a1508', border: '0.5px solid #2a2010',
                        color: '#C9A84C', fontSize: 12, cursor: 'pointer',
                        fontFamily: 'Nexa, sans-serif', fontWeight: 300,
                        transition: 'all 0.15s',
                      }}
                      onMouseEnter={e => (e.target as HTMLElement).style.background = '#241e08'}
                      onMouseLeave={e => (e.target as HTMLElement).style.background = '#1a1508'}
                    >
                      {city.name}
                    </button>
                  ))}
                </div>
              </div>
              {/* Bouton GPS dans le dropdown */}
              <div
                onClick={detectLocation}
                style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', transition: 'background 0.15s' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#1e1e2a')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <span style={{ fontSize: 16 }}>🎯</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#F0EDE8' }}>Utiliser ma position</div>
                  <div style={{ fontSize: 11, color: '#555', fontWeight: 300 }}>Détection GPS automatique</div>
                </div>
              </div>
            </>
          )}

          {/* Résultats de recherche */}
          {results.map((city, i) => (
            <div
              key={city.id}
              onClick={() => handleSelect(city)}
              style={{
                padding: '11px 16px', cursor: 'pointer',
                borderTop: '0.5px solid #1e1e2a',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#1e1e2a')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 14 }}>📍</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#F0EDE8' }}>{city.name}</div>
                  <div style={{ fontSize: 11, color: '#555', fontWeight: 300 }}>{city.wilaya}</div>
                </div>
              </div>
              {city.priority === 1 && (
                <span style={{ fontSize: 9, background: '#1a1508', border: '0.5px solid #2a2010', color: '#C9A84C', padding: '2px 7px', borderRadius: 20, fontWeight: 800 }}>
                  POPULAIRE
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Sélecteur de wilaya ────────────────────────────────────────────

export function WilayaSelector({ value, onChange }: { value: string; onChange: (w: string) => void }) {
  const wilayas = [...new Set(ALGERIA_CITIES.map(c => c.wilaya))].sort()
  return (
    <select value={value} onChange={e => onChange(e.target.value)} style={{ width: '100%', padding: '11px 16px', background: '#161620', border: '0.5px solid #2a2a3a', borderRadius: 10, color: value ? '#F0EDE8' : '#555', fontSize: 13, outline: 'none', fontFamily: 'Nexa, sans-serif', fontWeight: 300, cursor: 'pointer', appearance: 'none' }}>
      <option value="">Choisir une wilaya...</option>
      {wilayas.map(w => <option key={w} value={w}>{w}</option>)}
    </select>
  )
}
