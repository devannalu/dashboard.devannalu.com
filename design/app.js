/* Annalu Studio OS — protótipo visual (Início + Perfil + pet 3D).
   Dados de tarefas/projetos são ilustrativos. O pet reage a eles como reagiria aos dados reais. */
(function () {
  'use strict';
  var root = document.documentElement;
  function load(k, d) { try { var v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } }
  function save(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function $(id) { return document.getElementById(id); }
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ================= Configuração do avatar ================= */
  var OPTS = {
    bodyShape: [['ampulheta','Ampulheta'],['triangulo','Triângulo (pera)'],['invertido','Triângulo invertido'],['retangulo','Retângulo'],['oval','Oval']],
    bodySize: [['magra','Magra'],['media','Média'],['gordinha','Gordinha']],
    skin: [['#F9DFD0','Clara'],['#F0C4A6','Média clara'],['#D9A07B','Média'],['#A8704B','Morena'],['#6E4630','Escura'],['#4A2E22','Retinta']],
    hair: [['liso','Liso longo'],['ondulado','Ondulado longo'],['cacheado','Cacheado longo'],['blackpower','Black power'],['chanel','Chanel'],['trancas','Tranças'],['coque','Coquinhos'],['rabo','Rabo de cavalo']],
    bangs: [['reta','Franja reta'],['cortininha','Cortininha'],['lateral','Lateral'],['repartido','Repartido'],['semfranja','Sem franja']],
    hairColor: [['#B3121C','Vermelho'],['#1A1214','Preto'],['#3A2219','Castanho escuro'],['#6B3A22','Castanho'],['#E8C77A','Loiro'],['#F2EDE4','Platinado'],['#F08AA2','Rosa'],['#8E6FD8','Lilás']],
    streaks: [['nenhuma','Sem mechas'],['frontal','Mecha frontal'],['pontas','Pontas coloridas'],['espalhadas','Mechas espalhadas']],
    streakColor: [['#F08AA2','Rosa'],['#B3121C','Vermelho'],['#E8C77A','Loiro'],['#F2EDE4','Platinado'],['#5B7FD6','Azul'],['#1A1214','Preto']],
    face: [['blush','Blush'],['sardas','Sardas'],['pinta','Pinta']],
    eyes: [['coracao','Coração'],['gatinho','Gatinho'],['piscadinha','Piscadinha'],['sonolento','Sonolento']],
    eyeColor: [['#C1121F','Vermelho'],['#3B6FD8','Azul'],['#6B3E26','Castanho'],['#2F8F5B','Verde'],['#8E5BD9','Roxo']],
    brows: [['bravinha','Bravinha'],['suave','Suave']],
    mouth: [['biquinho','Biquinho'],['sorriso','Sorriso'],['emburrada','Emburrada']],
    outfit: [['vestido','Vestido gola branca'],['slip','Vestido de cetim'],['xadrez','Saia xadrez + cropped'],['couro','Jaqueta de couro'],['conjunto','Cropped + calça'],['moletom','Moletom'],['macacao','Macacão']],
    outfitColor: [['#141012','Preto'],['#7E1414','Bordô'],['#B3121C','Vermelho'],['#F08AA2','Rosa'],['#F4F1EC','Branco'],['#3E5C8A','Jeans']],
    legs: [['arrastao','Arrastão'],['polainas','Polainas de pelúcia'],['meias','Meias pretas'],['listradas','Meia listrada'],['meiacalca','Meia-calça'],['nada','Sem meia']],
    shoes: [['boneca','Boneca'],['coturno','Coturno'],['plataforma','Tênis plataforma']],
    metal: [['prata','Prata'],['dourado','Dourado']],
    acc: [['presilhas','Presilhas'],['laco','Laço'],['tiara','Tiara'],['chifrinhos','Chifrinhos'],['oculos','Óculos de coração'],['argolas','Argolas'],['cereja','Brinco de cereja'],['perolas','Pérolas'],['septo','Piercing septo'],['nariz','Piercing nariz'],['choker','Choker'],['colar','Colar corrente'],['braceletes','Braceletes']]
  };
  var MULTI = { face: true, acc: true };
  var COLORS = { hairColor: true, streakColor: true, skin: true, eyeColor: true, outfitColor: true };
  var DEFAULT = { bodyShape: 'ampulheta', bodySize: 'media', skin: '#F9DFD0', hair: 'liso', bangs: 'reta', hairColor: '#B3121C', streaks: 'nenhuma', streakColor: '#F08AA2',
    face: ['blush', 'sardas'], eyes: 'coracao', eyeColor: '#C1121F', brows: 'suave', mouth: 'biquinho',
    outfit: 'vestido', outfitColor: '#141012', legs: 'polainas', shoes: 'boneca', metal: 'prata', acc: ['presilhas', 'argolas'] };

  function sanitize(c) {
    var out = {}, MAP = { comprido: 'liso', franja: 'reta', brincos: 'argolas', piercing: 'septo' };
    Object.keys(DEFAULT).forEach(function (k) {
      var valid = OPTS[k].map(function (o) { return o[0]; }), v = c && c[k];
      if (MULTI[k]) out[k] = Array.isArray(v) ? v.map(function (x) { return MAP[x] || x; }).filter(function (x) { return valid.indexOf(x) !== -1; }) : DEFAULT[k].slice();
      else { v = MAP[v] || v; out[k] = valid.indexOf(v) !== -1 ? v : DEFAULT[k]; }
    });
    return out;
  }
  var saved = null; try { saved = JSON.parse(load('avatar-v2', '') || load('avatar-v1', '') || 'null'); } catch (e) {}
  var cfg = sanitize(saved);

  var SHAPES = { ampulheta: { s: .40, b: .42, w: .27, h: .46 }, triangulo: { s: .33, b: .34, w: .30, h: .50 }, invertido: { s: .47, b: .43, w: .34, h: .35 }, retangulo: { s: .38, b: .38, w: .36, h: .39 }, oval: { s: .37, b: .42, w: .45, h: .42 } };
  var SIZES = { magra: .86, media: 1, gordinha: 1.24 };
  var SLEEVE = { vestido: 'curta', slip: 'nenhuma', xadrez: 'curta', couro: 'longa', conjunto: 'longa', moletom: 'longa', macacao: 'curta' };
  function bodyDims(c) { var sh = SHAPES[c.bodyShape], g = SIZES[c.bodySize]; return { s: sh.s * g, b: sh.b * g, w: sh.w * g, h: sh.h * g, g: g }; }
  function metalHex(c) { return c.metal === 'dourado' ? '#E2B65A' : '#D6D7E0'; }

  function shade(hex, f) {
    var n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    function q(v) { return Math.max(0, Math.min(255, Math.round(f < 0 ? v * (1 + f) : v + (255 - v) * f))); }
    return '#' + ((1 << 24) + (q(r) << 16) + (q(g) << 8) + q(b)).toString(16).slice(1);
  }
  function has(list, v) { return list.indexOf(v) !== -1; }

  /* ================= Rosto (SVG) — textura do 3D e avatar 2D ================= */
  function eye(x, style, ec, sk, mood) {
    var s = '', ink = '#1A1012';
    function closed(y1, y2) { return '<path d="M' + (x - 14) + ' ' + y1 + ' Q' + x + ' ' + y2 + ' ' + (x + 14) + ' ' + y1 + '" stroke="' + ink + '" stroke-width="4.5" fill="none" stroke-linecap="round"/>'; }
    if (mood === 'feliz') return closed(114, 100);
    if (mood === 'piscar') return closed(111, 114);
    if (mood === 'comendo') return closed(112, 104);
    if (style === 'piscadinha' && x > 100 && !mood) return closed(112, 102);
    var ry = style === 'gatinho' ? 11 : 14;
    s += '<ellipse cx="' + x + '" cy="110" rx="16" ry="' + ry + '" fill="#FFFFFF"/>';
    s += '<circle cx="' + x + '" cy="112" r="10.5" fill="' + ec + '"/><circle cx="' + x + '" cy="112" r="10.5" fill="none" stroke="' + shade(ec, -.35) + '" stroke-width="1.5"/>';
    if (style === 'coracao') s += '<path d="M' + x + ' 117 C' + (x - 7) + ' 112 ' + (x - 4) + ' 105 ' + x + ' 109 C' + (x + 4) + ' 105 ' + (x + 7) + ' 112 ' + x + ' 117 Z" fill="#FFD5DC"/>';
    else s += '<circle cx="' + x + '" cy="112" r="5" fill="' + ink + '"/><circle cx="' + (x - 3.5) + '" cy="108" r="2.6" fill="#FFFFFF"/>';
    var w = x < 100 ? -1 : 1, wing = style === 'gatinho' ? 10 : 6;
    s += '<path d="M' + (x - 18) + ' 106 Q' + x + ' ' + (style === 'gatinho' ? 96 : 92) + ' ' + (x + 18) + ' 106" stroke="' + ink + '" stroke-width="4.5" fill="none" stroke-linecap="round"/>';
    s += '<path d="M' + (x + 17 * w) + ' 105 L' + (x + (17 + wing) * w) + ' ' + (style === 'gatinho' ? 97 : 100) + '" stroke="' + ink + '" stroke-width="3.5" stroke-linecap="round"/>';
    s += '<path d="M' + (x - 8) + ' 96 l-2 -5 M' + x + ' 94 l0 -5 M' + (x + 8) + ' 96 l2 -5" stroke="' + ink + '" stroke-width="2" stroke-linecap="round"/>';
    s += '<path d="M' + (x - 12) + ' 122 Q' + x + ' 128 ' + (x + 12) + ' 122" stroke="' + ink + '" stroke-width="1.4" fill="none" opacity=".55"/>';
    if (style === 'sonolento' || mood === 'sonolenta') {
      // pálpebra de pele cobrindo a metade de cima do olho (corte reto e levemente curvo)
      s += '<path d="M' + (x - 26) + ' 84 L' + (x + 26) + ' 84 L' + (x + 26) + ' 111 Q' + x + ' 116 ' + (x - 26) + ' 111 Z" fill="' + sk + '"/>';
      s += '<path d="M' + (x - 18) + ' 111.5 Q' + x + ' 116.5 ' + (x + 18) + ' 111.5" stroke="' + ink + '" stroke-width="4" fill="none" stroke-linecap="round"/>';
      s += '<path d="M' + (x + 18 * w) + ' 111 L' + (x + 23 * w) + ' 108" stroke="' + ink + '" stroke-width="3" stroke-linecap="round"/>';
    }
    if ((mood === 'preocupada' || mood === 'faminta') && x > 100) s += '<path d="M' + (x + 12) + ' 122 q3.5 7 0 10 q-3.5 -3 0 -10z" fill="#8EC5FF"/>';
    return s;
  }
  function faceParts(c, mood) {
    var s = '', SK = c.skin, HD = shade(c.hairColor, -.3);
    if (has(c.face, 'blush')) s += '<ellipse cx="62" cy="130" rx="13" ry="7" fill="#FF6B81" opacity=".38"/><ellipse cx="138" cy="130" rx="13" ry="7" fill="#FF6B81" opacity=".38"/>';
    if (has(c.face, 'sardas')) [[56, 124], [62, 128], [68, 124], [60, 120], [132, 124], [138, 128], [144, 124], [140, 120]].forEach(function (p) { s += '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="1.4" fill="#8E4A35" opacity=".75"/>'; });
    if (has(c.face, 'pinta')) s += '<circle cx="146" cy="117" r="1.9" fill="#2A1712"/>';
    s += eye(72, c.eyes, c.eyeColor, SK, mood) + eye(128, c.eyes, c.eyeColor, SK, mood);
    var bw = 'stroke="' + (c.hairColor === '#F2EDE4' || c.hairColor === '#E8C77A' ? '#8A6A4A' : HD) + '" stroke-width="4" fill="none" stroke-linecap="round"';
    if (mood === 'preocupada' || mood === 'faminta') s += '<path d="M60 90 L86 84" ' + bw + '/><path d="M140 90 L114 84" ' + bw + '/>';
    else if (c.brows === 'bravinha') s += '<path d="M58 84 L86 91" ' + bw + '/><path d="M142 84 L114 91" ' + bw + '/>';
    else s += '<path d="M58 88 Q72 81 86 86" ' + bw + '/><path d="M142 88 Q128 81 114 86" ' + bw + '/>';
    s += '<path d="M98 124 Q100 127 102 124" stroke="' + shade(SK, -.3) + '" stroke-width="1.6" fill="none" stroke-linecap="round"/>';
    var m = mood === 'feliz' ? 'feliz' : mood === 'comendo' ? 'comendo' : ((mood === 'preocupada' || mood === 'faminta') ? 'emburrada' : c.mouth);
    if (m === 'feliz') s += '<path d="M88 138 Q100 154 112 138 Z" fill="#8A2A3A"/><path d="M93 143 Q100 150 107 143" fill="#FF8FA3"/>';
    else if (m === 'comendo') s += '<ellipse cx="100" cy="143" rx="7" ry="6" fill="#8A2A3A"/><ellipse cx="100" cy="146" rx="4" ry="2.4" fill="#FF8FA3"/>';
    else if (m === 'sorriso') s += '<path d="M89 139 Q100 150 111 139" stroke="#8A2A3A" stroke-width="3" fill="none" stroke-linecap="round"/>';
    else if (m === 'emburrada') s += '<path d="M90 146 Q100 138 110 146 Q100 142 90 146 Z" fill="#E45A78" stroke="#B83A58" stroke-width="2" stroke-linejoin="round"/>';
    else s += '<path d="M89 141 Q95 135 100 138.5 Q105 135 111 141 Q100 153 89 141 Z" fill="#E45A78"/><ellipse cx="96" cy="144" rx="3" ry="1.4" fill="#fff" opacity=".55"/>';
    if (mood === 'sonolenta') s += '<text x="150" y="62" font-family="Arial Black, sans-serif" font-size="16" fill="' + HD + '">z</text>';
    return s;
  }

  /* ================= Avatar 2D (reserva sem WebGL) ================= */
  var uid = 0;
  function avatarSVG(c, opt) {
    opt = opt || {}; var id = 'av' + (++uid), mood = opt.mood || '';
    var HC = c.hairColor, HD = shade(HC, -.3), SK = c.skin, OC = c.outfitColor, MT = metalHex(c), ST = c.streakColor;
    var d = bodyDims(c), S = d.s * 55, B = d.b * 55, W = d.w * 55, H = d.h * 55, g = d.g;
    var hairFill = c.streaks === 'pontas' ? 'url(#hg' + id + ')' : HC;
    var s = '<svg viewBox="' + (opt.head ? '28 22 144 144' : '-10 0 220 262') + '" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs>' +
      '<pattern id="net' + id + '" width="6" height="6" patternUnits="userSpaceOnUse"><path d="M0 0L6 6M6 0L0 6" stroke="#1A1214" stroke-width="1"/></pattern>' +
      '<pattern id="str' + id + '" width="10" height="8" patternUnits="userSpaceOnUse"><rect width="10" height="4" fill="#FFFFFF"/><rect y="4" width="10" height="4" fill="#1A1214"/></pattern>' +
      '<linearGradient id="hg' + id + '" x1="0" y1="0" x2="0" y2="1"><stop offset=".55" stop-color="' + HC + '"/><stop offset=".85" stop-color="' + ST + '"/></linearGradient></defs>';
    if (opt.head) s += '<rect x="28" y="22" width="144" height="144" fill="#F6D9DD"/>';
    // cabelo de trás
    if (c.hair === 'blackpower') { s += '<circle cx="100" cy="92" r="88" fill="' + hairFill + '"/>'; for (var a = 0; a < 24; a++) { var an = a / 24 * Math.PI * 2; s += '<circle cx="' + (100 + Math.cos(an) * 84).toFixed(1) + '" cy="' + (92 + Math.sin(an) * 84).toFixed(1) + '" r="12" fill="' + HC + '"/>'; } }
    if (c.hair === 'coque') s += '<circle cx="48" cy="40" r="22" fill="' + HC + '"/><circle cx="152" cy="40" r="22" fill="' + HC + '"/>';
    if (c.hair === 'rabo') s += '<path d="M150 50 Q196 60 186 130 Q180 170 196 200 Q166 186 160 140 Q156 100 140 70 Z" fill="' + hairFill + '"/>';
    var long = c.hair === 'liso' || c.hair === 'ondulado' || c.hair === 'cacheado';
    if (long) {
      var wv = c.hair === 'ondulado';
      var vol = c.hair === 'cacheado' ? 18 : c.hair === 'ondulado' ? 8 : 0;
      s += '<path d="M30 96 Q30 26 100 26 Q170 26 170 96 ' + (wv ? 'Q' + (184 + vol) + ' 130 ' + (172 + vol) + ' 160 Q' + (190 + vol) + ' 190 ' + (176 + vol) + ' 222' : 'L' + (174 + vol) + ' 222') + ' Q160 232 144 224 L140 150 L60 150 L56 224 Q40 232 ' + (26 - vol) + ' 222 ' + (wv ? 'Q' + (10 - vol) + ' 190 ' + (28 - vol) + ' 160 Q' + (16 - vol) + ' 130 30 96' : '') + ' Z" fill="' + hairFill + '"/>';
      if (c.hair === 'cacheado') for (var y = 100; y <= 220; y += 14) { s += '<circle cx="' + (24 - vol / 2) + '" cy="' + y + '" r="11" fill="' + HC + '"/><circle cx="' + (176 + vol / 2) + '" cy="' + y + '" r="11" fill="' + HC + '"/>'; }
    } else if (c.hair === 'chanel' || c.hair === 'trancas') s += '<path d="M30 96 Q30 26 100 26 Q170 26 170 96 L172 162 Q160 172 146 164 L54 164 Q40 172 28 162 Z" fill="' + HC + '"/>';
    else s += '<path d="M32 96 Q32 28 100 28 Q168 28 168 96 L168 130 L32 130 Z" fill="' + HC + '"/>';
    // corpo
    var legX = H * 0.42, legW = 10 * Math.pow(g, .9), bottomY = (c.outfit === 'vestido' || c.outfit === 'slip') ? 222 : 212;
    [-1, 1].forEach(function (sd) {
      var x = 100 + sd * legX - legW / 2;
      s += '<rect x="' + x + '" y="206" width="' + legW + '" height="40" rx="' + legW / 2 + '" fill="' + SK + '"/>';
      if (c.legs === 'arrastao') s += '<rect x="' + x + '" y="206" width="' + legW + '" height="38" fill="url(#net' + id + ')"/>';
      if (c.legs === 'meias') s += '<rect x="' + x + '" y="222" width="' + legW + '" height="24" rx="4" fill="#1A1214"/>';
      if (c.legs === 'listradas') s += '<rect x="' + x + '" y="216" width="' + legW + '" height="30" rx="4" fill="url(#str' + id + ')"/>';
      if (c.legs === 'meiacalca') s += '<rect x="' + x + '" y="206" width="' + legW + '" height="40" rx="4" fill="#1A1214" opacity=".6"/>';
      if (c.outfit === 'conjunto' || c.outfit === 'macacao') s += '<rect x="' + (x - 2) + '" y="200" width="' + (legW + 4) + '" height="44" rx="4" fill="' + OC + '"/>';
      var sx = 100 + sd * legX;
      if (c.shoes === 'coturno') s += '<rect x="' + (sx - 8) + '" y="232" width="16" height="14" rx="3" fill="#111"/><rect x="' + (sx - 10) + '" y="244" width="20" height="6" rx="2" fill="#222"/>';
      else if (c.shoes === 'plataforma') s += '<ellipse cx="' + sx + '" cy="244" rx="9" ry="5" fill="#111"/><rect x="' + (sx - 10) + '" y="246" width="20" height="7" rx="3" fill="#FFFFFF" stroke="#DDD"/>';
      else s += '<ellipse cx="' + sx + '" cy="248" rx="9" ry="5.5" fill="#111"/>';
      if (c.legs === 'polainas') s += '<ellipse cx="' + sx + '" cy="234" rx="' + (legW + 1) + '" ry="9" fill="#FFFFFF" stroke="#E2D6D6" stroke-width="1.5"/>';
    });
    var armC = SLEEVE[c.outfit] === 'longa' ? OC : SK;
    s += '<ellipse cx="' + (100 - S - 7) + '" cy="188" rx="' + 7 * g + '" ry="18" fill="' + armC + '" transform="rotate(14 ' + (100 - S - 7) + ' 188)"/><ellipse cx="' + (100 + S + 7) + '" cy="188" rx="' + 7 * g + '" ry="18" fill="' + armC + '" transform="rotate(-14 ' + (100 + S + 7) + ' 188)"/>';
    s += '<circle cx="' + (100 - S - 11) + '" cy="205" r="' + 4.5 * g + '" fill="' + SK + '"/><circle cx="' + (100 + S + 11) + '" cy="205" r="' + 4.5 * g + '" fill="' + SK + '"/>';
    if (has(c.acc, 'braceletes')) s += '<path d="M' + (100 - S - 17) + ' 199 h11 M' + (100 + S + 6) + ' 199 h11" stroke="' + MT + '" stroke-width="2.5" stroke-linecap="round"/>';
    s += '<rect x="93" y="152" width="14" height="18" fill="' + shade(SK, -.12) + '"/>';
    var torso = 'M' + (100 - S) + ' 166 Q' + (100 - B - 2) + ' 178 ' + (100 - W) + ' 192 Q' + (100 - H) + ' 200 ' + (100 - H) + ' 208 L' + (100 + H) + ' 208 Q' + (100 + H) + ' 200 ' + (100 + W) + ' 192 Q' + (100 + B + 2) + ' 178 ' + (100 + S) + ' 166 Z';
    s += '<path d="' + torso + '" fill="' + SK + '"/>';
    if (c.outfit === 'vestido' || c.outfit === 'slip') {
      s += '<path d="M' + (100 - S + (c.outfit === 'slip' ? 6 : 0)) + ' ' + (c.outfit === 'slip' ? 176 : 166) + ' Q' + (100 - B - 3) + ' 180 ' + (100 - W - 2) + ' 192 L' + (100 - H - 12) + ' ' + bottomY + ' L' + (100 + H + 12) + ' ' + bottomY + ' L' + (100 + W + 2) + ' 192 Q' + (100 + B + 3) + ' 180 ' + (100 + S - (c.outfit === 'slip' ? 6 : 0)) + ' ' + (c.outfit === 'slip' ? 176 : 166) + ' Z" fill="' + OC + '"/>';
      if (c.outfit === 'vestido') s += '<path d="M90 166 L110 166 L100 182 Z" fill="#FFFFFF"/><path d="M84 165 L99 166 L91 177 Z M101 166 L116 165 L109 177 Z" fill="#FFFFFF"/><path d="M98.5 170 L101.5 170 L103 184 L100 188 L97 184 Z" fill="#1A1214"/>';
      else s += '<path d="M' + (100 - S + 8) + ' 176 L' + (100 - S + 4) + ' 164 M' + (100 + S - 8) + ' 176 L' + (100 + S - 4) + ' 164" stroke="' + OC + '" stroke-width="2"/>';
    } else if (c.outfit === 'xadrez') {
      s += '<path d="M' + (100 - S) + ' 166 Q' + (100 - B - 2) + ' 178 ' + (100 - W) + ' 188 L' + (100 + W) + ' 188 Q' + (100 + B + 2) + ' 178 ' + (100 + S) + ' 166 Z" fill="' + OC + '"/>';
      s += '<path d="M' + (100 - W - 2) + ' 194 L' + (100 + W + 2) + ' 194 L' + (100 + H + 10) + ' 214 L' + (100 - H - 10) + ' 214 Z" fill="#8E1015"/><path d="M' + (100 - H) + ' 202 H' + (100 + H) + ' M' + (100 - H - 6) + ' 209 H' + (100 + H + 6) + ' M92 194 L88 214 M108 194 L112 214" stroke="#1A1214" stroke-width="2"/>';
    } else if (c.outfit === 'couro') {
      s += '<path d="' + torso + '" fill="#FFFFFF"/><path d="M' + (100 - S - 3) + ' 165 Q' + (100 - B - 5) + ' 180 ' + (100 - W - 4) + ' 196 L94 196 L96 166 Z M' + (100 + S + 3) + ' 165 Q' + (100 + B + 5) + ' 180 ' + (100 + W + 4) + ' 196 L106 196 L104 166 Z" fill="' + OC + '"/><path d="M' + (100 - H - 2) + ' 198 L' + (100 + H + 2) + ' 198 L' + (100 + H + 5) + ' 212 L' + (100 - H - 5) + ' 212 Z" fill="#141012"/>';
    } else if (c.outfit === 'conjunto') {
      s += '<path d="M' + (100 - S - 2) + ' 165 Q' + (100 - B - 4) + ' 178 ' + (100 - W - 2) + ' 188 L' + (100 + W + 2) + ' 188 Q' + (100 + B + 4) + ' 178 ' + (100 + S + 2) + ' 165 Z" fill="' + OC + '"/><path d="M' + (100 - W - 2) + ' 196 L' + (100 + W + 2) + ' 196 L' + (100 + H + 2) + ' 210 L' + (100 - H - 2) + ' 210 Z" fill="' + OC + '"/>';
    } else if (c.outfit === 'moletom') {
      s += '<path d="M' + (100 - S - 5) + ' 166 Q' + (100 - Math.max(B, W) - 8) + ' 190 ' + (100 - H - 6) + ' 212 L' + (100 + H + 6) + ' 212 Q' + (100 + Math.max(B, W) + 8) + ' 190 ' + (100 + S + 5) + ' 166 Z" fill="' + OC + '"/><path d="M86 196 h28 v10 h-28 z" fill="' + shade(OC, -.2) + '"/>';
    } else {
      s += '<path d="M' + (100 - S) + ' 166 Q' + (100 - B - 2) + ' 176 ' + (100 - B) + ' 182 L' + (100 + B) + ' 182 Q' + (100 + B + 2) + ' 176 ' + (100 + S) + ' 166 Z" fill="#FFFFFF"/><path d="M' + (100 - B + 4) + ' 180 L' + (100 + B - 4) + ' 180 L' + (100 + W + 2) + ' 192 L' + (100 + H + 2) + ' 210 L' + (100 - H - 2) + ' 210 L' + (100 - W - 2) + ' 192 Z" fill="' + OC + '"/><path d="M' + (100 - B + 6) + ' 181 L' + (100 - S + 4) + ' 166 M' + (100 + B - 6) + ' 181 L' + (100 + S - 4) + ' 166" stroke="' + OC + '" stroke-width="3"/>';
    }
    if (has(c.acc, 'choker')) s += '<rect x="92" y="160" width="16" height="4" rx="2" fill="#141012"/><circle cx="100" cy="166" r="2" fill="' + MT + '"/>';
    if (has(c.acc, 'colar')) s += '<path d="M90 166 Q100 180 110 166" stroke="' + MT + '" stroke-width="1.5" fill="none"/><circle cx="100" cy="176" r="2.4" fill="' + MT + '"/>';
    if (long) s += '<path d="M36 112 L32 214 Q44 224 56 216 L60 140 Z" fill="' + hairFill + '"/><path d="M164 112 L168 214 Q156 224 144 216 L140 140 Z" fill="' + hairFill + '"/>';
    if (c.hair === 'trancas') [-1, 1].forEach(function (sd) {
      var x0 = 100 + sd * 58;
      for (var i = 0; i < 8; i++) {
        var yy = 128 + i * 12, xx = x0 - sd * i * 1.5 + (i % 2 ? 3 : -3), sc = 1 - i * .05, col = (c.streaks === 'pontas' && i > 4) ? ST : HC;
        s += '<ellipse cx="' + xx + '" cy="' + yy + '" rx="' + 9 * sc + '" ry="' + 8 * sc + '" fill="' + col + '" stroke="' + HD + '" stroke-width="1.5" transform="rotate(' + (i % 2 ? 28 : -28) + ' ' + xx + ' ' + yy + ')"/>';
      }
      s += '<rect x="' + (x0 - sd * 12 - 4) + '" y="222" width="8" height="5" rx="2" fill="#B3121C"/><path d="M' + (x0 - sd * 12 - 5) + ' 227 L' + (x0 - sd * 12) + ' 238 L' + (x0 - sd * 12 + 5) + ' 227 Z" fill="' + HC + '"/>';
    });
    // cabeça
    s += '<circle cx="37" cy="112" r="9" fill="' + SK + '"/><circle cx="163" cy="112" r="9" fill="' + SK + '"/><ellipse cx="100" cy="102" rx="64" ry="60" fill="' + SK + '"/>';
    s += faceParts(c, mood);
    // franja
    if (c.bangs === 'reta') s += '<path d="M32 100 Q30 28 100 28 Q170 28 168 100 L162 100 L162 80 L38 80 L38 100 Z" fill="' + HC + '"/>';
    else if (c.bangs === 'cortininha') s += '<path d="M32 108 Q30 28 100 28 Q170 28 168 108 L160 108 Q156 70 104 54 L100 60 L96 54 Q44 70 40 108 Z" fill="' + HC + '"/><path d="M100 56 Q84 66 66 90 M100 56 Q116 66 134 90" stroke="' + HC + '" stroke-width="8" fill="none" stroke-linecap="round"/>';
    else if (c.bangs === 'lateral') s += '<path d="M32 104 Q30 28 100 28 Q170 28 168 90 L160 66 Q120 64 60 92 L40 104 Z" fill="' + HC + '"/>';
    else if (c.bangs === 'repartido') s += '<path d="M32 104 Q30 28 100 28 Q170 28 168 104 L160 104 Q156 56 104 44 L100 50 L96 44 Q44 56 40 104 Z" fill="' + HC + '"/>';
    else s += '<path d="M34 92 Q32 28 100 28 Q168 28 166 92 Q150 50 100 46 Q50 50 34 92 Z" fill="' + HC + '"/>';
    if (c.streaks === 'frontal') s += '<path d="M46 70 Q40 110 44 150 M154 70 Q160 110 156 150" stroke="' + ST + '" stroke-width="7" fill="none" stroke-linecap="round"/>';
    if (c.streaks === 'espalhadas') s += '<path d="M70 34 Q60 60 62 80 M120 32 Q132 56 134 80 M40 120 L38 200 M160 120 L162 200" stroke="' + ST + '" stroke-width="4" fill="none" stroke-linecap="round"/>';
    // acessórios
    if (has(c.acc, 'tiara')) s += '<path d="M44 58 Q100 8 156 58" stroke="' + MT + '" stroke-width="4" fill="none"/><circle cx="100" cy="30" r="4" fill="#B3121C"/>';
    if (has(c.acc, 'chifrinhos')) s += '<path d="M58 44 Q52 18 66 10 Q62 26 72 40 Z" fill="#C1121F"/><path d="M142 44 Q148 18 134 10 Q138 26 128 40 Z" fill="#C1121F"/>';
    if (has(c.acc, 'presilhas')) s += '<rect x="-4" y="-14" width="8" height="28" rx="4" fill="#C1121F" transform="translate(56 62) rotate(28)"/><rect x="-4" y="-14" width="8" height="28" rx="4" fill="#C1121F" transform="translate(144 62) rotate(-28)"/>';
    if (has(c.acc, 'laco')) s += '<path d="M148 42 L128 30 L131 56 Z M148 42 L168 30 L165 56 Z" fill="#1A1214"/>';
    if (has(c.acc, 'oculos')) s += '<path d="M72 124 C58 114 56 100 66 98 C70 97 72 100 72 102 C72 100 74 97 78 98 C88 100 86 114 72 124 Z M128 124 C114 114 112 100 122 98 C126 97 128 100 128 102 C128 100 130 97 134 98 C144 100 142 114 128 124 Z" fill="#E0284A" opacity=".55" stroke="#B3121C" stroke-width="2"/><path d="M84 104 Q100 98 116 104" stroke="#B3121C" stroke-width="2" fill="none"/>';
    if (has(c.acc, 'septo')) s += '<path d="M96.5 128 Q100 134 103.5 128" stroke="' + MT + '" stroke-width="2" fill="none"/>';
    if (has(c.acc, 'nariz')) s += '<circle cx="104" cy="124" r="1.6" fill="' + MT + '"/>';
    if (has(c.acc, 'argolas')) s += '<circle cx="36" cy="128" r="7" fill="none" stroke="' + MT + '" stroke-width="2"/><circle cx="164" cy="128" r="7" fill="none" stroke="' + MT + '" stroke-width="2"/>';
    if (has(c.acc, 'perolas')) s += '<circle cx="37" cy="122" r="3" fill="#FFFDF8" stroke="#E6DED2"/><circle cx="163" cy="122" r="3" fill="#FFFDF8" stroke="#E6DED2"/>';
    if (has(c.acc, 'cereja')) [37, 163].forEach(function (x) { s += '<path d="M' + x + ' 121 l-3 9 M' + x + ' 121 l3 9" stroke="#3F7A33" stroke-width="1.2"/><circle cx="' + (x - 3) + '" cy="132" r="3.2" fill="#B3121C"/><circle cx="' + (x + 3) + '" cy="132" r="3.2" fill="#9E1018"/>'; });
    return s + '</svg>';
  }

  /* ================= Pet 3D (Three.js) ================= */
  var P3 = (function () {
    if (!window.THREE) return null;
    var T = window.THREE, renderer;
    try { renderer = new T.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true }); } catch (e) { return null; }
    if (!renderer.getContext()) return null;
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.setClearColor(0x000000, 0);
    var scene = new T.Scene();
    var camera = new T.PerspectiveCamera(30, 1, 0.1, 60);
    var headCam = new T.PerspectiveCamera(26, 1, 0.1, 60); headCam.position.set(0, 2.5, 6.6); headCam.lookAt(0, 2.3, 0);
    scene.add(new T.HemisphereLight(0xFFF4F2, 0x5A1A20, 0.85));
    var key = new T.DirectionalLight(0xFFFFFF, 0.85); key.position.set(3, 6, 5); scene.add(key);
    var rim = new T.DirectionalLight(0xFF9AA8, 0.7); rim.position.set(-5, 3, -4); scene.add(rim);
    var fillL = new T.DirectionalLight(0xFFE8E0, 0.35); fillL.position.set(-3, 1, 5); scene.add(fillL);

    function canvasTex(w, h, draw, rx, ry) {
      var cv = document.createElement('canvas'); cv.width = w; cv.height = h; draw(cv.getContext('2d'), w, h);
      var t = new T.CanvasTexture(cv); if (rx) { t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(rx, ry); } return t;
    }
    var shadowTex = canvasTex(128, 128, function (g) { var gr = g.createRadialGradient(64, 64, 4, 64, 64, 62); gr.addColorStop(0, 'rgba(40,10,14,.45)'); gr.addColorStop(1, 'rgba(40,10,14,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); });
    var shadow = new T.Mesh(new T.PlaneGeometry(2.8, 2.8), new T.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false }));
    shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.01; scene.add(shadow);
    var netTex = canvasTex(32, 32, function (g) { g.strokeStyle = '#1A1214'; g.lineWidth = 3; g.beginPath(); g.moveTo(0, 0); g.lineTo(32, 32); g.moveTo(32, 0); g.lineTo(0, 32); g.stroke(); }, 3, 4);
    var stripeTex = canvasTex(8, 16, function (g) { g.fillStyle = '#FFFFFF'; g.fillRect(0, 0, 8, 8); g.fillStyle = '#1A1214'; g.fillRect(0, 8, 8, 8); }, 1, 5);
    var plaidTex = canvasTex(64, 64, function (g) {
      g.fillStyle = '#8E1015'; g.fillRect(0, 0, 64, 64); g.fillStyle = 'rgba(20,16,18,.75)'; g.fillRect(0, 22, 64, 14); g.fillRect(22, 0, 14, 64);
      g.fillStyle = 'rgba(255,255,255,.55)'; g.fillRect(0, 46, 64, 2); g.fillRect(46, 0, 2, 64);
    }, 6, 2);

    var doll = new T.Group(), head = new T.Group(), body = new T.Group();
    doll.add(body); doll.add(head); scene.add(doll);
    var faceMat = null, faceCache = {}, curFace = '', mood = '', container = null, cfgRef = null;
    var onTap = function () {};

    function mat(color, o) {
      o = o || {};
      return new T.MeshPhysicalMaterial({ color: new T.Color(color), roughness: o.r !== undefined ? o.r : 0.4, metalness: o.m || 0, clearcoat: o.cc !== undefined ? o.cc : 0.6, clearcoatRoughness: 0.22,
        side: o.side || T.FrontSide, map: o.map || null, transparent: !!o.map || o.op !== undefined, opacity: o.op !== undefined ? o.op : 1, alphaTest: o.map && o.alpha ? 0.4 : 0, vertexColors: !!o.vc, flatShading: !!o.flat });
    }
    function add(group, geo, material, x, y, z, sx, sy, sz) {
      var m = new T.Mesh(geo, material); m.position.set(x || 0, y || 0, z || 0);
      if (sx) m.scale.set(sx, sy, sz); group.add(m); return m;
    }
    function clear(g) {
      for (var i = g.children.length - 1; i >= 0; i--) {
        var ch = g.children[i]; g.remove(ch);
        ch.traverse(function (o) { if (o.geometry) o.geometry.dispose(); if (o.material && o.material !== faceMat) o.material.dispose(); });
      }
    }
    function lathe(points, segs, phiStart, phiLen) { return new T.LatheGeometry(points.map(function (p) { return new T.Vector2(Math.max(0.001, p[1]), p[0]); }), segs || 48, phiStart || 0, phiLen || Math.PI * 2); }
    function noise(v) { return Math.sin(v.x * 9.1) * Math.sin(v.y * 8.3) * Math.sin(v.z * 9.7); }
    function curlify(geo, amt, cx, cy, cz) {
      var p = geo.attributes.position, v = new T.Vector3(), dir = new T.Vector3();
      for (var i = 0; i < p.count; i++) {
        v.fromBufferAttribute(p, i); dir.set(v.x - (cx || 0), v.y - (cy || v.y), v.z - (cz || 0));
        if (dir.lengthSq() < 1e-6) continue; dir.normalize();
        var f = amt * (0.6 + 0.4 * noise(v)) * Math.abs(Math.sin(v.y * 7 + v.x * 3));
        v.addScaledVector(dir, f); p.setXYZ(i, v.x, v.y, v.z);
      }
      geo.computeVertexNormals();
    }
    function tintDown(geo, yTop, yBottom, base, tip) {
      var p = geo.attributes.position, cols = new Float32Array(p.count * 3), a = new T.Color(base), b = new T.Color(tip), c = new T.Color();
      for (var i = 0; i < p.count; i++) {
        var t = Math.min(1, Math.max(0, (yTop - p.getY(i)) / (yTop - yBottom))); t = t < 0.55 ? 0 : Math.min(1, (t - 0.55) / 0.3);
        c.copy(a).lerp(b, t); cols[i * 3] = c.r; cols[i * 3 + 1] = c.g; cols[i * 3 + 2] = c.b;
      }
      geo.setAttribute('color', new T.BufferAttribute(cols, 3));
    }
    function heartShape(sz) {
      var s = new T.Shape(); s.moveTo(0, -sz * .55);
      s.bezierCurveTo(-sz * .9, -sz * .05, -sz * .7, sz * .55, 0, sz * .25);
      s.bezierCurveTo(sz * .7, sz * .55, sz * .9, -sz * .05, 0, -sz * .55); return s;
    }
    function faceKey(c, md) { return [c.skin, c.hairColor, c.eyeColor, c.eyes, c.brows, c.mouth, c.face.join(), md].join('|'); }
    function faceTexture(c, md) {
      var k = faceKey(c, md);
      if (faceCache[k]) return faceCache[k];
      var cv = document.createElement('canvas'); cv.width = 1152; cv.height = 960;
      var tex = new T.CanvasTexture(cv); tex.anisotropy = 4;
      var svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="42.4 54 115.2 96" width="1152" height="960">' + faceParts(c, md) + '</svg>';
      tex.ready = new Promise(function (res) {
        var img = new Image();
        img.onload = function () { try { cv.getContext('2d').drawImage(img, 0, 0, 1152, 960); tex.needsUpdate = true; } catch (e) {} res(); requestRender(); };
        img.onerror = function () { res(); };
        img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
      });
      faceCache[k] = tex; return tex;
    }
    function setFace(md) { if (!faceMat || curFace === md) return; curFace = md; faceMat.map = faceTexture(cfgRef, md); faceMat.needsUpdate = true; requestRender(); }
    function fluffy(r) {
      var g = new T.IcosahedronGeometry(r, 3), p = g.attributes.position, v = new T.Vector3();
      for (var i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); v.multiplyScalar(1 + 0.13 * Math.sin(v.x * 40) * Math.sin(v.y * 47) * Math.sin(v.z * 43)); p.setXYZ(i, v.x, v.y, v.z); }
      g.computeVertexNormals(); return g;
    }

    function build(c) {
      cfgRef = c; clear(head); clear(body);
      Object.keys(faceCache).forEach(function (k) { faceCache[k].dispose(); }); faceCache = {}; curFace = '';
      var D = bodyDims(c), limb = Math.pow(D.g, 0.9);
      var skin = mat(c.skin, { r: 0.5, cc: 0.35 });
      var pontas = c.streaks === 'pontas';
      var hair = mat(c.hairColor, { r: 0.28, cc: 1, side: T.DoubleSide });
      var hairVC = mat('#FFFFFF', { r: 0.28, cc: 1, side: T.DoubleSide, vc: true });
      var hairDark = mat(shade(c.hairColor, -.25), { r: 0.3, cc: 1 });
      var streak = mat(c.streakColor, { r: 0.28, cc: 1, side: T.DoubleSide });
      var black = mat('#141012', { r: 0.25, cc: 1 }), white = mat('#FFFFFF', { r: 0.45, cc: 0.4 });
      var red = mat('#B3121C', { r: 0.32, cc: 1 }), metal = mat(metalHex(c), { r: 0.2, m: 0.95, cc: 0.6 });
      var OC = c.outfitColor, fabric = mat(OC, { r: 0.45, cc: 0.4 });
      var HS = [1.05, 0.97, 0.97];
      function hs(geo, m, ex) { var x = add(head, geo, m, 0, 0.02, 0, HS[0], HS[1], HS[2]); if (ex) ex(x); return x; }

      /* ---------- cabeça ---------- */
      head.position.set(0, 2.35, 0);
      var hm = add(head, new T.SphereGeometry(1, 64, 48), skin, 0, 0, 0, 1.05, 0.95, 0.95);
      faceMat = new T.MeshPhysicalMaterial({ transparent: true, roughness: 0.5, clearcoat: 0.35, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
      hm.add(new T.Mesh(new T.SphereGeometry(1.004, 64, 48, Math.PI / 2 - 0.9, 1.8, Math.PI / 2 - 0.75, 1.5), faceMat));
      setFace(mood);
      add(head, new T.SphereGeometry(0.17, 24, 16), skin, -1.03, -0.08, 0); add(head, new T.SphereGeometry(0.17, 24, 16), skin, 1.03, -0.08, 0);

      /* ---------- cabelo ---------- */
      var F = Math.PI / 2; // frente
      if (c.hair === 'blackpower') {
        var afro = new T.SphereGeometry(1.5, 72, 54, F + 0.92, Math.PI * 2 - 1.84, 0, 2.25); curlify(afro, 0.1, 0, 0.2, -0.15);
        add(head, afro, pontas ? (tintDown(afro, 1.6, -1.2, c.hairColor, c.streakColor), hairVC) : hair, 0, 0.18, -0.12);
      }
      hs(new T.SphereGeometry(1.075, 64, 40, F + 1.0, Math.PI * 2 - 2.0, 0, 2.0), hair);   // casco de trás
      hs(new T.SphereGeometry(1.08, 48, 24, 0, Math.PI * 2, 0, 0.62), hair);               // topo
      var pulledBack = c.hair === 'coque' || c.hair === 'rabo';
      var bangTheta = 1.3;
      if (c.bangs === 'reta') hs(new T.SphereGeometry(1.088, 64, 32, F - 1.05, 2.1, 0, 1.3), hair);
      else if (c.bangs === 'lateral') hs(new T.SphereGeometry(1.088, 64, 32, F - 1.05, 2.1, 0, 1.22), hair, function (m) { m.rotation.z = 0.32; m.position.x = -0.04; });
      else if (c.bangs === 'cortininha') {
        hs(new T.SphereGeometry(1.088, 48, 24, F - 1.05, 1.0, 0, 1.08), hair, function (m) { m.rotation.z = 0.2; });
        hs(new T.SphereGeometry(1.088, 48, 24, F + 0.05, 1.0, 0, 1.08), hair, function (m) { m.rotation.z = -0.2; });
        bangTheta = 1.08;
      } else if (c.bangs === 'repartido') {
        hs(new T.SphereGeometry(1.088, 48, 24, F - 1.05, 0.98, 0, 0.88), hair); hs(new T.SphereGeometry(1.088, 48, 24, F + 0.07, 0.98, 0, 0.88), hair); bangTheta = 0.88;
      } else { hs(new T.SphereGeometry(1.088, 64, 24, F - 1.05, 2.1, 0, 0.74), hair); bangTheta = 0.74; }
      if (!pulledBack && c.bangs !== 'semfranja') {               // laterais que emolduram o rosto
        hs(new T.SphereGeometry(1.09, 32, 32, F - 1.05, 0.42, 0, 1.85), hair);
        hs(new T.SphereGeometry(1.09, 32, 32, F + 0.63, 0.42, 0, 1.85), hair);
      }
      // comprimento (torno com volume, onda e cachos)
      var LEN = { liso: [2.0, .1, 0, 0], ondulado: [1.9, .16, .035, 0], cacheado: [1.75, .36, 0, .1], chanel: [0.95, .04, 0, 0], trancas: [0.45, .02, 0, 0], coque: [0.3, 0, 0, 0], rabo: [0.3, 0, 0, 0], blackpower: [0, 0, 0, 0] }[c.hair];
      function hairLathe(len, vol, wave, curl, p0, pl, off) {
        var pts = [], N = 24;
        for (var i = 0; i <= N; i++) { var u = i / N; pts.push([0.05 - len * u, 1.09 + (off || 0) + vol * Math.pow(u, 0.7) + wave * Math.sin(u * Math.PI * 4)]); }
        var g = lathe(pts, 72, p0, pl); if (curl) curlify(g, curl, 0, null, 0); return g;
      }
      if (LEN[0] > 0) {
        var lg = hairLathe(LEN[0], LEN[1], LEN[2], LEN[3], 1.0, Math.PI * 2 - 2.0);
        if (pontas && LEN[0] > 0.6) tintDown(lg, 0.05, -LEN[0], c.hairColor, c.streakColor);
        add(head, lg, (pontas && LEN[0] > 0.6) ? hairVC : hair, 0, 0, -0.01, 1.04, 1, 0.95);
        if (c.streaks === 'frontal' && LEN[0] > 0.6) [[1.0, 0.16], [Math.PI * 2 - 1.16, 0.16]].forEach(function (r) { add(head, hairLathe(LEN[0], LEN[1], LEN[2], LEN[3], r[0], r[1], 0.012), streak, 0, 0, -0.01, 1.04, 1, 0.95); });
        if (c.streaks === 'espalhadas' && LEN[0] > 0.6) [1.5, 2.3, 3.1, 3.9, 4.7].forEach(function (p) { add(head, hairLathe(LEN[0], LEN[1], LEN[2], LEN[3], p, 0.08, 0.014), streak, 0, 0, -0.01, 1.04, 1, 0.95); });
      }
      if (c.streaks === 'frontal') { hs(new T.SphereGeometry(1.096, 16, 32, F - 0.66, 0.14, 0, 1.85), streak); hs(new T.SphereGeometry(1.096, 16, 32, F + 0.52, 0.14, 0, 1.85), streak); }
      if (c.streaks === 'espalhadas') [-0.35, 0.2, 0.55].forEach(function (p) { hs(new T.SphereGeometry(1.094, 12, 24, F + p, 0.08, 0, bangTheta), streak); });
      if (c.hair === 'cacheado' || c.hair === 'blackpower') for (var k = 0; k < 9; k++) {        // cachinhos na franja
        var an = F - 0.9 + k * 0.225, th = 0.95 + (k % 2) * 0.12;
        add(head, new T.SphereGeometry(0.14, 14, 10), hair, -Math.cos(an) * Math.sin(th) * 1.13, Math.cos(th) * 1.05 + 0.02, Math.sin(an) * Math.sin(th) * 1.05);
      }
      if (c.hair === 'trancas') [-1, 1].forEach(function (sd) {                // tranças trançadas, presas atrás das orelhas
        var N = 9;
        for (var i = 0; i < N; i++) {
          var u = i / (N - 1), tp = 1 - 0.38 * u;
          var x = sd * (0.94 - 0.2 * u) + (i % 2 ? 0.045 : -0.045) * sd, y = -0.2 - u * 1.85, z = 0.1 + 0.3 * u;
          var seg = add(head, new T.SphereGeometry(0.17, 20, 14), (pontas && u > 0.6) ? streak : (i % 2 ? hairDark : hair), x, y, z, tp, tp * 1.35, tp * 0.9);
          seg.rotation.z = (i % 2 ? 0.5 : -0.5) * sd;
        }
        add(head, new T.CylinderGeometry(0.07, 0.07, 0.08, 16), red, sd * 0.74, -2.18, 0.42);
        add(head, new T.ConeGeometry(0.1, 0.26, 16), pontas ? streak : hair, sd * 0.74, -2.36, 0.42).rotation.x = Math.PI;
      });
      if (c.hair === 'coque') [-1, 1].forEach(function (sd) { var bun = new T.SphereGeometry(0.42, 40, 30); curlify(bun, 0.03, 0, null, 0); add(head, bun, hair, sd * 0.72, 0.85, -0.1); });
      if (c.hair === 'rabo') {
        var curve = new T.CatmullRomCurve3([new T.Vector3(0, 0.55, -0.98), new T.Vector3(0, 0.45, -1.32), new T.Vector3(0, -0.2, -1.36), new T.Vector3(0, -0.95, -1.2), new T.Vector3(0, -1.5, -1.05)]);
        var tube = new T.TubeGeometry(curve, 40, 0.24, 16, false);
        var tr = tube.attributes.position, tv = new T.Vector3();
        for (var ti = 0; ti < tr.count; ti++) { tv.fromBufferAttribute(tr, ti); var taper = 0.55 + 0.45 * Math.min(1, (tv.y + 1.5) / 1.6); var cp = curve.getPoint(Math.min(1, Math.max(0, (0.55 - tv.y) / 2.05))); tv.x = cp.x + (tv.x - cp.x) * taper; tv.z = cp.z + (tv.z - cp.z) * taper; tr.setXYZ(ti, tv.x, tv.y, tv.z); }
        tube.computeVertexNormals();
        if (pontas) tintDown(tube, 0.55, -1.5, c.hairColor, c.streakColor);
        add(head, tube, pontas ? hairVC : hair);
        add(head, new T.TorusGeometry(0.2, 0.06, 12, 24), red, 0, 0.5, -1.06).rotation.x = 0.3;
      }

      /* ---------- acessórios da cabeça ---------- */
      if (has(c.acc, 'presilhas')) [-1, 1].forEach(function (sd) { var clip = add(head, new T.BoxGeometry(0.09, 0.38, 0.05), mat('#C1121F', { r: 0.25, m: 0.5, cc: 1 }), sd * 0.64, 0.55, 0.82); clip.rotation.set(-0.55, sd * 0.45, sd * -0.5); });
      if (has(c.acc, 'laco')) {
        var bow = new T.Group(); bow.position.set(0.62, 0.85, 0.45); bow.rotation.set(-0.3, 0.4, -0.25); head.add(bow);
        add(bow, new T.ConeGeometry(0.2, 0.36, 24), black, -0.18, 0, 0).rotation.z = -Math.PI / 2;
        add(bow, new T.ConeGeometry(0.2, 0.36, 24), black, 0.18, 0, 0).rotation.z = Math.PI / 2;
        add(bow, new T.SphereGeometry(0.08, 16, 12), black, 0, 0, 0.02);
      }
      if (has(c.acc, 'tiara')) {
        var tiara = add(head, new T.TorusGeometry(1.0, 0.035, 12, 64, Math.PI), metal, 0, 0.12, 0.18, 1.1, 1.0, 1); tiara.rotation.x = -0.45;
        [-0.3, 0, 0.3].forEach(function (a) { add(head, new T.OctahedronGeometry(0.06), red, Math.sin(a) * 1.12, 0.12 + Math.cos(a) * 0.95, 0.18 - Math.cos(a) * 0.42); });
      }
      if (has(c.acc, 'chifrinhos')) [-1, 1].forEach(function (sd) { var h = add(head, new T.ConeGeometry(0.12, 0.45, 20), red, sd * 0.45, 1.04, 0.2); h.rotation.z = sd * -0.4; });
      if (has(c.acc, 'oculos')) {
        var lens = mat('#E0284A', { r: 0.1, cc: 1, op: 0.55 });
        [-1, 1].forEach(function (sd) { var hg = new T.ExtrudeGeometry(heartShape(0.34), { depth: 0.03, bevelEnabled: false }); var gl = add(head, hg, lens, sd * 0.42, -0.08, 0.99); gl.rotation.y = sd * 0.32; });
        add(head, new T.BoxGeometry(0.22, 0.03, 0.03), red, 0, -0.02, 1.04);
      }
      if (has(c.acc, 'septo')) add(head, new T.TorusGeometry(0.045, 0.012, 10, 24), metal, 0, -0.32, 0.92);
      if (has(c.acc, 'nariz')) add(head, new T.SphereGeometry(0.022, 10, 8), metal, 0.08, -0.25, 0.94);
      if (has(c.acc, 'argolas')) [-1, 1].forEach(function (sd) { var r = add(head, new T.TorusGeometry(0.1, 0.022, 10, 28), metal, sd * 1.07, -0.3, 0.05); r.rotation.y = Math.PI / 2; });
      if (has(c.acc, 'perolas')) [-1, 1].forEach(function (sd) { add(head, new T.SphereGeometry(0.055, 16, 12), mat('#FFFDF8', { r: 0.15, cc: 1 }), sd * 1.06, -0.2, 0.1); });
      if (has(c.acc, 'cereja')) [-1, 1].forEach(function (sd) {
        add(head, new T.CylinderGeometry(0.008, 0.008, 0.18, 6), mat('#3F7A33'), sd * 1.07, -0.3, 0.06);
        add(head, new T.SphereGeometry(0.055, 16, 12), red, sd * 1.07 - 0.04, -0.42, 0.06); add(head, new T.SphereGeometry(0.055, 16, 12), mat('#9E1018', { cc: 1, r: .3 }), sd * 1.07 + 0.04, -0.43, 0.06);
      });

      /* ---------- corpo (perfil pelo formato) ---------- */
      var s = D.s, b = D.b, w = D.w, h = D.h;
      var torsoPts = [[0.56, 0.05], [0.6, h * 0.82], [0.72, h], [0.93, w], [1.15, b], [1.30, s * 0.95], [1.37, s * 0.66], [1.44, 0.17 * Math.sqrt(D.g)]];
      add(body, lathe(torsoPts, 48), skin, 0, 0, 0, 1, 1, 0.78);
      add(body, new T.CylinderGeometry(0.15 * Math.sqrt(D.g), 0.17 * Math.sqrt(D.g), 0.3, 20), skin, 0, 1.5, 0);
      function garment(pts, m) { return add(body, lathe(pts, 48), m, 0, 0, 0, 1, 1, 0.8); }
      var o = c.outfit, sleeve = SLEEVE[o];
      if (o === 'vestido') {
        garment([[0.42, h + 0.2], [0.72, h + 0.05], [0.93, w + 0.04], [1.15, b + 0.04], [1.32, s * 0.95 + 0.03], [1.39, s * 0.6]], fabric);
        add(body, new T.CylinderGeometry(0.12, 0.2, 0.16, 3), white, 0, 1.35, 0.18 + b * 0.5).rotation.set(0.2, Math.PI, 0);
        [-1, 1].forEach(function (sd) { var col = add(body, new T.BoxGeometry(0.16, 0.08, 0.02), white, sd * 0.11, 1.37, 0.22 + b * 0.5); col.rotation.set(-0.3, 0, sd * -0.5); });
        add(body, new T.BoxGeometry(0.06, 0.22, 0.02), OC === '#141012' ? mat('#2A2226') : black, 0, 1.22, 0.26 + b * 0.55).rotation.x = -0.25;
      } else if (o === 'slip') {
        garment([[0.4, h + 0.14], [0.72, h + 0.04], [0.93, w + 0.035], [1.12, b + 0.045], [1.22, b * 0.86]], mat(OC, { r: 0.12, cc: 1 }));
        [-1, 1].forEach(function (sd) { var st = add(body, new T.CylinderGeometry(0.01, 0.01, 0.24, 6), mat(OC, { r: 0.12, cc: 1 }), sd * s * 0.55, 1.3, 0.12); st.rotation.x = -0.35; });
      } else if (o === 'xadrez') {
        garment([[0.99, w + 0.03], [1.15, b + 0.045], [1.32, s * 0.95 + 0.03], [1.39, s * 0.6]], fabric);
        add(body, new T.CylinderGeometry(w + 0.05, h + 0.2, 0.36, 18, 1, false), mat('#FFFFFF', { map: plaidTex, r: 0.55, cc: 0.2, flat: true }), 0, 0.77, 0, 1, 1, 0.82);
      } else if (o === 'couro') {
        garment([[0.62, h + 0.06], [0.93, w + 0.06], [1.15, b + 0.05], [1.32, s * 0.95 + 0.02], [1.39, s * 0.6]], white);
        var jacket = mat(OC, { r: 0.3, cc: 1 });
        [-1, 1].forEach(function (sd) { garment([[0.8, h + 0.08], [0.93, w + 0.09], [1.15, b + 0.09], [1.33, s + 0.06], [1.41, s * 0.7]], jacket).geometry = lathe([[0.8, h + 0.08], [0.93, w + 0.09], [1.15, b + 0.09], [1.33, s + 0.06], [1.41, s * 0.7]], 24, sd > 0 ? 0.32 : Math.PI, Math.PI - 0.32); });
        add(body, new T.CylinderGeometry(h + 0.03, h + 0.1, 0.22, 32), mat('#141012', { r: 0.3, cc: 1 }), 0, 0.66, 0, 1, 1, 0.8);
      } else if (o === 'conjunto') {
        garment([[1.0, w + 0.045], [1.15, b + 0.05], [1.33, s + 0.04], [1.41, s * 0.7]], fabric);
        garment([[0.52, h * 0.8], [0.62, h + 0.03], [0.86, w + 0.06]], fabric);
      } else if (o === 'moletom') {
        var soft = mat(OC, { r: 0.75, cc: 0.1 });
        garment([[0.6, h + 0.07], [0.93, Math.max(w, b) + 0.08], [1.15, b + 0.09], [1.34, s + 0.07], [1.43, s * 0.7]], soft);
        add(body, new T.TorusGeometry(0.28 * Math.sqrt(D.g), 0.09, 12, 32), soft, 0, 1.4, -0.12).rotation.x = Math.PI / 2.3;
        add(body, new T.BoxGeometry(0.42, 0.16, 0.05), mat(shade(OC, -.2), { r: 0.8, cc: 0 }), 0, 0.82, (Math.max(w, b) + 0.08) * 0.8).rotation.x = -0.15;
      } else {
        garment([[1.1, b + 0.015], [1.32, s * 0.95 + 0.02], [1.39, s * 0.6]], white);
        garment([[0.52, h * 0.8], [0.72, h + 0.04], [0.93, w + 0.04], [1.13, b + 0.035]], fabric);
        [-1, 1].forEach(function (sd) { var st = add(body, new T.BoxGeometry(0.06, 0.32, 0.02), fabric, sd * 0.13, 1.22, b * 0.8 + 0.05); st.rotation.x = -0.2; add(body, new T.SphereGeometry(0.025, 10, 8), metal, sd * 0.13, 1.08, b * 0.8 + 0.08); });
      }
      if (has(c.acc, 'choker')) { add(body, new T.TorusGeometry(0.17 * Math.sqrt(D.g) + 0.012, 0.03, 10, 32), black, 0, 1.52, 0).rotation.x = Math.PI / 2; var hp = add(body, new T.ExtrudeGeometry(heartShape(0.09), { depth: 0.02, bevelEnabled: false }), metal, 0, 1.47, 0.19 * Math.sqrt(D.g)); hp.rotation.z = Math.PI; }
      if (has(c.acc, 'colar')) { var col2 = add(body, new T.TorusGeometry(0.26 * Math.sqrt(D.g), 0.01, 8, 48), metal, 0, 1.36, 0.06); col2.rotation.x = Math.PI / 2 - 0.5; add(body, new T.SphereGeometry(0.035, 12, 10), metal, 0, 1.24, 0.27 * Math.sqrt(D.g) + 0.08); }

      // braços
      var armMat = sleeve === 'longa' ? (o === 'moletom' ? mat(OC, { r: 0.75, cc: 0.1 }) : o === 'couro' ? mat(OC, { r: 0.3, cc: 1 }) : fabric) : skin;
      [-1, 1].forEach(function (sd) {
        var ax = sd * (s + 0.12), a = add(body, new T.SphereGeometry(1, 20, 14), armMat, ax, 1.02, 0, 0.11 * limb, 0.36, 0.11 * limb); a.rotation.z = sd * 0.28;
        var hx = sd * (s + 0.12 + 0.1), hy = 0.69;
        add(body, new T.SphereGeometry(0.075 * limb, 16, 12), skin, hx, hy, 0);
        if (sleeve === 'curta') add(body, new T.SphereGeometry(0.15 * limb, 20, 14), o === 'macacao' ? white : fabric, sd * (s + 0.06), 1.3, 0);
        if (has(c.acc, 'braceletes')) [0, 0.06].forEach(function (dy) { var br = add(body, new T.TorusGeometry(0.085 * limb, 0.014, 8, 24), metal, hx - sd * 0.02, hy + 0.08 + dy, 0); br.rotation.x = Math.PI / 2; br.rotation.y = sd * 0.28; });
      });
      // pernas, meias e sapatos
      var legR = 0.1 * limb, legX = h * 0.42;
      [-1, 1].forEach(function (sd) {
        var x = sd * legX;
        if (o === 'conjunto' || o === 'macacao') add(body, new T.CylinderGeometry(legR + 0.05, legR + 0.06, 0.5, 24), fabric, x, 0.36, 0);
        else {
          add(body, new T.CylinderGeometry(legR, legR * 0.9, 0.52, 20), skin, x, 0.34, 0);
          if (c.legs === 'arrastao') add(body, new T.CylinderGeometry(legR + 0.008, legR * 0.9 + 0.008, 0.5, 20, 1, true), mat('#141012', { map: netTex, alpha: true, r: 0.5, cc: 0 }), x, 0.35, 0);
          if (c.legs === 'meias') add(body, new T.CylinderGeometry(legR + 0.01, legR * 0.9 + 0.01, 0.3, 20), black, x, 0.22, 0);
          if (c.legs === 'listradas') add(body, new T.CylinderGeometry(legR + 0.01, legR * 0.9 + 0.01, 0.34, 20), mat('#FFFFFF', { map: stripeTex, r: 0.6, cc: 0.1 }), x, 0.24, 0);
          if (c.legs === 'meiacalca') add(body, new T.CylinderGeometry(legR + 0.006, legR * 0.9 + 0.006, 0.52, 20), mat('#1A1214', { op: 0.6, r: 0.4, cc: 0.3 }), x, 0.34, 0);
        }
        if (c.legs === 'polainas') add(body, fluffy(0.2 * limb), mat('#FFFFFF', { r: 1, cc: 0 }), x, 0.22, 0, 1, 0.95, 1);
        if (c.shoes === 'coturno') { add(body, new T.CylinderGeometry(0.15 * limb, 0.16 * limb, 0.26, 20), black, x, 0.17, 0.01); add(body, new T.BoxGeometry(0.32 * limb, 0.08, 0.42), mat('#222', { r: 0.6 }), x, 0.04, 0.06); }
        else if (c.shoes === 'plataforma') { add(body, new T.SphereGeometry(1, 24, 16), black, x, 0.16, 0.05, 0.15 * limb, 0.09, 0.23); add(body, new T.BoxGeometry(0.3 * limb, 0.13, 0.44), mat('#FFFFFF', { r: 0.5, cc: 0.3 }), x, 0.065, 0.05); }
        else { add(body, new T.SphereGeometry(1, 24, 16), black, x, 0.07, 0.05, 0.15 * limb, 0.09, 0.23); add(body, new T.BoxGeometry(0.2 * limb, 0.025, 0.04), black, x, 0.14, 0.03); }
      });
      var lift = c.shoes === 'plataforma' ? 0.08 : c.shoes === 'coturno' ? 0.03 : 0;
      body.position.y = lift; head.position.y = 2.35 + lift;
      requestRender();
      return Promise.all(Object.keys(faceCache).map(function (k2) { return faceCache[k2].ready; }));
    }

    /* animação */
    var running = false, t0 = performance.now(), dragging = false, dragX = 0, rotStart = 0, userRot = 0, moved = false, jumpAt = -10, chewUntil = -10;
    function requestRender() { if (!running && container) frame(performance.now()); }
    function frame(now) {
      var t = (now - t0) / 1000;
      var bob = reduced ? 0 : Math.sin(t * 2.2) * 0.035;
      var jt = t - jumpAt, jump = (!reduced && jt < 0.55) ? Math.sin(jt / 0.55 * Math.PI) * 0.45 : 0;
      doll.position.y = bob + jump;
      head.rotation.z = reduced ? 0 : Math.sin(t * 0.9) * 0.05;
      var chewing = t < chewUntil;
      head.rotation.x = chewing && !reduced ? Math.sin(t * 22) * 0.06 : 0;
      if (!dragging) { userRot *= 0.96; doll.rotation.y += ((reduced ? 0 : Math.sin(t * 0.45) * 0.3) + userRot - doll.rotation.y) * 0.08; }
      var f = mood;
      if (chewing) f = (Math.floor(t * 5) % 2) ? 'comendo' : 'feliz';
      else if (!reduced && (mood === '' || mood === 'preocupada' || mood === 'faminta') && (t % 3.8) < 0.13) f = 'piscar';
      setFace(f);
      renderer.render(scene, camera);
    }
    function loop(now) { if (!running) return; frame(now); requestAnimationFrame(loop); }
    function start() { if (running || reduced || !container) return; running = true; requestAnimationFrame(loop); }
    function stop() { running = false; }
    document.addEventListener('visibilitychange', function () { if (document.hidden) stop(); else start(); });
    function resize() {
      if (!container) return;
      var w = container.clientWidth || 300, h = container.clientHeight || 260;
      renderer.setSize(w, h, false); camera.aspect = w / h;
      var dist = Math.max(9.4, 9.4 * (0.85 / camera.aspect));
      camera.position.set(0, 1.75, dist); camera.lookAt(0, 1.62, 0); camera.updateProjectionMatrix();
      requestRender();
    }
    var ro = window.ResizeObserver ? new ResizeObserver(resize) : null, el = renderer.domElement;
    el.addEventListener('pointerdown', function (e) { dragging = true; moved = false; dragX = e.clientX; rotStart = doll.rotation.y; try { el.setPointerCapture(e.pointerId); } catch (x) {} });
    el.addEventListener('pointermove', function (e) { if (!dragging) return; var dx = e.clientX - dragX; if (Math.abs(dx) > 4) moved = true; doll.rotation.y = rotStart + dx * 0.012; userRot = doll.rotation.y; requestRender(); });
    el.addEventListener('pointerup', function () { dragging = false; if (!moved) onTap(); });
    el.addEventListener('pointercancel', function () { dragging = false; });

    return {
      build: build,
      mount: function (c) { if (container && ro) ro.unobserve(container); container = c; if (!c) { stop(); return; } c.insertBefore(el, c.firstChild); if (ro) ro.observe(c); resize(); start(); },
      setMood: function (m) { mood = m || ''; requestRender(); },
      jump: function () { jumpAt = (performance.now() - t0) / 1000; requestRender(); },
      chew: function () { chewUntil = (performance.now() - t0) / 1000 + 1.4; if (reduced) setFace('feliz'); requestRender(); },
      onTap: function (fn) { onTap = fn; },
      snapshot: function () {
        var prev = new T.Vector2(); renderer.getSize(prev);
        var pr = doll.rotation.y, py = doll.position.y; doll.rotation.y = 0; doll.position.y = 0; head.rotation.set(0, 0, 0);
        setFace(''); renderer.setSize(256, 256, false); renderer.setClearColor(0xF6D9DD, 1);
        headCam.position.y = 2.5 + (head.position.y - 2.35); headCam.lookAt(0, head.position.y - 0.05, 0);
        renderer.render(scene, headCam); var url = el.toDataURL('image/png');
        renderer.setClearColor(0x000000, 0); renderer.setSize(prev.x, prev.y, false);
        doll.rotation.y = pr; doll.position.y = py; requestRender();
        return url;
      }
    };
  })();

  /* ================= Comidas e estado do pet ================= */
  var FOODS = {
    cereja: { nome: 'Cereja', fonte: 'tarefa concluída', sac: 10, xp: 1, svg: '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16.5 4 C14.5 9 12 11 9.5 15 M16.5 4 C17 9 19.5 11 22.5 15" stroke="#5B3A1E" stroke-width="1.8" fill="none" stroke-linecap="round"/><path d="M16.5 4 C19.5 1.6 24 2.4 26 4.8 C22.8 6.6 19 6.4 16.5 4 Z" fill="#3F7A33"/><circle cx="9.5" cy="21" r="6.6" fill="#B3121C"/><circle cx="22.5" cy="21.5" r="6.6" fill="#9E1018"/><ellipse cx="7.2" cy="18.6" rx="2" ry="1.3" fill="#fff" opacity=".7"/><ellipse cx="20.2" cy="19.1" rx="2" ry="1.3" fill="#fff" opacity=".7"/></svg>' },
    cupcake: { nome: 'Cupcake', fonte: 'nova ideia', sac: 20, xp: 2, svg: '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M8 17h16l-2.5 12h-11z" fill="#7E1414"/><path d="M11.5 17l1 12M16 17v12M20.5 17l-1 12" stroke="#B3121C" stroke-width="1.6"/><path d="M6 18c-1-4 2-7 5.5-6.5C12.5 8 19.5 8 20.5 11.5 24 11 27 14 26 18z" fill="#F7B3C2"/><circle cx="12" cy="14.5" r=".9" fill="#fff"/><circle cx="19" cy="15" r=".9" fill="#7E1414"/><circle cx="16" cy="7.5" r="3.4" fill="#B3121C"/><path d="M16 4.3c1-2 3-3 4.5-3" stroke="#5B3A1E" stroke-width="1.3" fill="none"/></svg>' },
    torta: { nome: 'Torta de cereja', fonte: 'marco de projeto', sac: 45, xp: 5, svg: '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M3 21 L29 12 L29 19.5 L3 27.5 Z" fill="#D99A4E"/><path d="M3 21 L29 12 L26.5 9.5 L5.5 17.5 Z" fill="#B3121C"/><path d="M8 19.3l15-5.2M6 20.3l3.6-1.3M11 17.5l4-1.4M17 15.4l4-1.4" stroke="#F2C27C" stroke-width="1.7" stroke-linecap="round"/><path d="M3 21v6.5" stroke="#B8793A" stroke-width="1.2"/><circle cx="21" cy="8.5" r="2.8" fill="#9E1018"/><ellipse cx="20.2" cy="7.6" rx=".9" ry=".6" fill="#fff" opacity=".7"/></svg>' },
    bolo: { nome: 'Bolo de cereja', fonte: 'projeto concluído', sac: 100, xp: 15, svg: '<svg viewBox="0 0 32 32" aria-hidden="true"><rect x="5" y="17" width="22" height="11" rx="2.5" fill="#F7B3C2"/><rect x="8.5" y="10.5" width="15" height="7.5" rx="2" fill="#FFF4F2"/><path d="M5 20q5.5 3.5 11 0t11 0" stroke="#B3121C" stroke-width="1.8" fill="none"/><path d="M8.5 13q3.75 2.5 7.5 0t7.5 0" stroke="#F7B3C2" stroke-width="1.5" fill="none"/><rect x="15.2" y="3.5" width="1.6" height="6" rx=".8" fill="#7E1414"/><path d="M16 1.2c1.4 1.4 1 2.6 0 2.8-1-.2-1.4-1.4 0-2.8z" fill="#F2B544"/><circle cx="11" cy="10.2" r="1.8" fill="#B3121C"/><circle cx="21" cy="10.2" r="1.8" fill="#B3121C"/></svg>' },
    milkshake: { nome: 'Milkshake', fonte: '3 dias seguidos', sac: 30, xp: 3, svg: '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M9.5 11h13l-2.2 18h-8.6z" fill="#F7B3C2" stroke="#FFFFFF" stroke-width="1.2"/><path d="M10.5 18h11" stroke="#fff" stroke-width="1" opacity=".6"/><path d="M8.5 11.5c0-3.5 3.3-5 7.5-5s7.5 1.5 7.5 5z" fill="#FFF4F2"/><path d="M18.5 8 L22.5 1.5" stroke="#7E1414" stroke-width="2.2" stroke-linecap="round"/><circle cx="14" cy="5.6" r="2.6" fill="#B3121C"/><ellipse cx="13.2" cy="4.8" rx=".8" ry=".5" fill="#fff" opacity=".7"/></svg>' }
  };
  var ORDER = ['cereja', 'cupcake', 'torta', 'bolo', 'milkshake'];
  var tasks = [
    { t: 'Ajustar layout do checkout', m: 'Loja Ateliê · cliente', p: '⚑ Urgente', u: true, late: false },
    { t: 'Revisar PR de autenticação', m: 'Annalu Studio OS · 14:00', p: 'Alta', late: false },
    { t: 'Escrever estudo de caso do portfólio', m: 'Portfólio 2026', p: 'Média', late: false },
    { t: 'Enviar proposta revisada', m: '<span class="late">venceu há 2 dias</span> · Site institucional', p: 'Alta', late: true },
    { t: 'Exportar ícones do app', m: '<span class="late">venceu ontem</span> · App de hábitos', p: 'Baixa', late: true }
  ];
  // Estado inicial do protótipo: comeu ontem à noite, sequência de 2 dias, uma torta guardada.
  var pet = { sac: 38, xp: Number(load('pet-xp', '12')) || 0, streak: 2, fedToday: false, petted: 0, inv: { cereja: 0, cupcake: 0, torta: 1, bolo: 0, milkshake: 0 } };
  var CHERRY = '<svg viewBox="0 0 24 24" aria-hidden="true"><g class="off"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/></g><g class="on"><path d="M12.5 2.5 C11 6 9 8 7 11 M12.5 2.5 C13 6 15 8 17 11" stroke="#5B3A1E" stroke-width="1.6" fill="none" stroke-linecap="round"/><path d="M12.5 2.5 C15 0.8 18.5 1.4 20 3.2 C17.5 4.6 14.5 4.4 12.5 2.5 Z" fill="#3F7A33"/><circle cx="7" cy="15.5" r="5.2" fill="#B3121C"/><circle cx="17" cy="16" r="5.2" fill="#9E1018"/><ellipse cx="5.2" cy="13.6" rx="1.5" ry="1" fill="#fff" opacity=".7"/><ellipse cx="15.2" cy="14.1" rx="1.5" ry="1" fill="#fff" opacity=".7"/></g></svg>';

  function renderTasks() {
    function li(task, i) {
      return '<li' + (task.done ? ' class="done"' : '') + '><button class="cherry-check" role="checkbox" aria-checked="' + !!task.done + '" data-i="' + i + '" aria-label="Concluir: ' + task.t + '">' + CHERRY + '</button><div><div class="t">' + task.t + '</div><div class="meta">' + task.m + '</div></div><span class="pri' + (task.u ? ' urgente' : '') + '">' + task.p + '</span></li>';
    }
    $('list-today').innerHTML = tasks.map(function (t, i) { return t.late ? '' : li(t, i); }).join('');
    $('list-late').innerHTML = tasks.map(function (t, i) { return t.late ? li(t, i) : ''; }).join('');
    var late = tasks.filter(function (t) { return t.late && !t.done; }).length;
    var left = tasks.filter(function (t) { return !t.late && !t.done; }).length;
    $('late-title').textContent = 'Atrasadas · ' + late;
    $('sum-late').textContent = late + (late === 1 ? ' atrasada' : ' atrasadas');
    $('sum-today').textContent = left + (left === 1 ? ' tarefa' : ' tarefas');
    $('kpi-late').textContent = late;
    $('kpi-done').textContent = 12 + tasks.filter(function (t) { return t.done; }).length;
  }
  function petState() {
    var done = tasks.filter(function (t) { return t.done; }).length;
    var late = tasks.filter(function (t) { return t.late && !t.done; }).length;
    var humor = Math.max(0, Math.min(100, 60 - late * 15 + done * 8 + pet.petted * 3 + (pet.sac >= 60 ? 15 : pet.sac < 30 ? -20 : 0)));
    var h = new Date().getHours(), mood;
    if (pet.sac <= 0) mood = 'fraquinha';            // dias sem comer: dorme fraquinha, nunca morre
    else if (h >= 23 || h < 6) mood = 'sonolenta';
    else if (pet.sac < 30) mood = 'faminta';
    else if (late > 0 && humor < 55) mood = 'preocupada';
    else if (humor >= 80) mood = 'feliz';
    else mood = '';
    return { humor: humor, mood: mood };
  }
  var MOOD_TXT = { '': 'tranquila', feliz: 'radiante', faminta: 'faminta, alimente hoje', preocupada: 'preocupada com os atrasos', sonolenta: 'com sono', fraquinha: 'fraquinha e dormindo, uma refeição resolve' };
  function faceMood(m) { return m === 'fraquinha' ? 'sonolenta' : m; }
  var previewMood = '';
  function renderPet(say) {
    var st = petState();
    var label = pet.sac < 60 && pet.sac >= 30 && st.mood === '' ? 'com fome' : MOOD_TXT[st.mood];
    $('pet-mood').textContent = label;
    $('pet-stage').setAttribute('aria-label', 'Pet ' + ($('in-pet').value || 'Cereja') + ', ' + label + ', saciedade ' + pet.sac + ' de 100');
    var s = $('st-sac'); s.style.width = pet.sac + '%'; s.className = pet.sac < 30 ? 'bad' : pet.sac < 60 ? 'warn' : ''; $('st-sac-v').textContent = pet.sac;
    $('st-humor').style.width = st.humor + '%'; $('st-humor-v').textContent = st.humor;
    $('st-xp').style.width = (pet.xp % 10) * 10 + '%'; $('st-nivel').textContent = 'nv ' + (Math.floor(pet.xp / 10) + 1);
    $('streak').textContent = pet.streak;
    $('tray').innerHTML = ORDER.map(function (k) {
      var f = FOODS[k], q = pet.inv[k];
      return '<button type="button" class="food" data-food="' + k + '"' + (q ? '' : ' disabled') + ' aria-label="' + f.nome + ': ' + q + ' na lancheira. Ganha com ' + f.fonte + '. Recupera ' + f.sac + ' de saciedade.">' + f.svg + '<span class="qty">' + q + '</span><span class="fn">' + f.nome + '</span><span class="fs">' + f.fonte + '</span></button>';
    }).join('');
    if (P3) P3.setMood(location.hash === '#perfil' ? previewMood : faceMood(st.mood)); else drawFallback();
    if (say) speak(say);
  }
  var bubbleT;
  function speak(txt) { var b = $('bubble'); b.textContent = txt; b.hidden = false; clearTimeout(bubbleT); bubbleT = setTimeout(function () { b.hidden = true; }, 2600); }
  function burst(ch, n) {
    for (var i = 0; i < (n || 1); i++) setTimeout(function () {
      var h = document.createElement('span'); h.className = 'heart'; h.textContent = ch;
      h.style.left = (40 + Math.random() * 20) + '%'; h.style.top = '45%'; $('pet-stage').appendChild(h);
      setTimeout(function () { h.remove(); }, 1100);
    }, i * 120);
  }
  function toast(msg) { var t = $('toast'); t.textContent = msg; t.hidden = false; clearTimeout(t._t); t._t = setTimeout(function () { t.hidden = true; }, 2600); }
  function award(k, msg) { pet.inv[k]++; renderPet(msg); toast('Ganhou ' + FOODS[k].nome.toLowerCase() + ' para o pet'); }
  function feed(k, fromEl) {
    var f = FOODS[k]; if (!pet.inv[k]) return;
    if (pet.sac >= 100) { speak('Tô cheinha!'); return; }
    var wasWeak = pet.sac <= 0;
    var lvlBefore = Math.floor(pet.xp / 10);
    pet.inv[k]--; pet.sac = Math.min(100, pet.sac + f.sac); pet.xp += f.xp; save('pet-xp', String(pet.xp));
    var firstToday = !pet.fedToday; pet.fedToday = true;
    $('last-meal').textContent = 'última refeição: hoje, ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    function done() {
      if (P3) { P3.chew(); setTimeout(function () { P3.jump(); }, 1400); }
      burst('♥', 3);
      var msg = pet.sac >= 100 ? 'Cheinha! Obrigada ♥' : (k === 'bolo' ? 'Um bolo inteiro?! Te amo!' : 'Nham nham!');
      if (firstToday) { pet.streak++; if (pet.streak % 3 === 0) { pet.inv.milkshake++; setTimeout(function () { toast(pet.streak + ' dias seguidos! Ganhou um milkshake'); }, 900); } }
      if (wasWeak) msg = 'Acordei! Obrigada por cuidar de mim ♥';
      if (Math.floor(pet.xp / 10) !== lvlBefore) msg = 'Subi para o nível ' + (Math.floor(pet.xp / 10) + 1) + '!';
      renderPet(msg);
    }
    if (reduced || !fromEl) { done(); return; }
    var r = fromEl.getBoundingClientRect(), s = $('pet-stage').getBoundingClientRect();
    var fly = document.createElement('div'); fly.className = 'fly'; fly.innerHTML = f.svg;
    fly.style.left = (r.left + r.width / 2 - 22) + 'px'; fly.style.top = (r.top + 10) + 'px'; document.body.appendChild(fly);
    requestAnimationFrame(function () { requestAnimationFrame(function () {
      fly.style.transform = 'translate(' + (s.left + s.width / 2 - r.left - r.width / 2) + 'px,' + (s.top + s.height * 0.38 - r.top - 10) + 'px) scale(.5)'; fly.style.opacity = '.2';
    }); });
    setTimeout(function () { fly.remove(); done(); }, 680);
  }
  document.addEventListener('click', function (e) {
    var c = e.target.closest('.cherry-check');
    if (c) {
      var t = tasks[+c.dataset.i]; t.done = !t.done; renderTasks();
      if (t.done) { if (P3) P3.jump(); award('cereja', t.late ? 'Ufa, um atraso a menos!' : 'Mais uma! Ganhei cereja?'); }
      else { if (pet.inv.cereja > 0) pet.inv.cereja--; renderPet(); }
      return;
    }
    var fb = e.target.closest('.food'); if (fb && !fb.disabled) { feed(fb.dataset.food, fb); return; }
    var sim = e.target.closest('[data-sim]');
    if (sim) {
      var k = sim.dataset.sim;
      if (k === 'torta') award('torta', 'Marco concluído! Torta!');
      else if (k === 'bolo') { award('bolo', 'Projeto concluído!!'); burst('✦', 5); }
      else { pet.sac = Math.max(0, pet.sac - 24); renderPet(pet.sac <= 0 ? 'zzz… fraquinha…' : pet.sac < 30 ? 'Tô com fome…' : 'Hmm, já tá na hora de comer?'); }
    }
  });
  function petTap() { pet.petted = Math.min(5, pet.petted + 1); burst('♥', 2); if (P3) P3.jump(); renderPet(pet.sac < 30 ? 'Carinho é bom, mas tô com fome…' : ['Hihi!', 'De novo!', 'Te amo ♥'][Math.floor(Math.random() * 3)]); }
  if (P3) P3.onTap(function () { if (location.hash !== '#perfil') petTap(); });
  $('pet-stage').tabIndex = 0;
  $('pet-stage').addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); petTap(); } });

  function drawFallback() {
    var target = location.hash === '#perfil' ? $('prev-stage') : $('pet-stage');
    var other = target.id === 'prev-stage' ? $('pet-stage') : $('prev-stage');
    var o = other.querySelector('.fallback'); if (o) o.remove();
    var fb = target.querySelector('.fallback'); if (!fb) { fb = document.createElement('div'); fb.className = 'fallback'; target.insertBefore(fb, target.firstChild); }
    fb.innerHTML = avatarSVG(cfg, { mood: target.id === 'prev-stage' ? previewMood : faceMood(petState().mood) });
    document.querySelectorAll('.stage-hint').forEach(function (h) { h.hidden = true; });
  }
  var pfpTimer, buildSeq = 0;
  function refreshAvatar() {
    clearTimeout(pfpTimer);
    if (P3) {
      var seq = ++buildSeq;
      P3.build(cfg).then(function () {
        if (seq !== buildSeq) return;
        pfpTimer = setTimeout(function () {
          var url = P3.snapshot();
          document.querySelectorAll('[data-pfp]').forEach(function (el) { el.innerHTML = '<img src="' + url + '" alt="">'; });
          renderPet();
        }, 60);
      });
    } else document.querySelectorAll('[data-pfp]').forEach(function (el) { el.innerHTML = avatarSVG(cfg, { head: true }); });
    renderPet();
  }

  (function () {
    var marks = { 10: 1, 11: 1, 13: 1, 18: 1, 24: 1, 27: 1 }, out = '';
    ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].forEach(function (d) { out += '<span class="dow">' + d + '</span>'; });
    for (var d = 1; d <= 30; d++) out += '<span class="d' + (d === 10 ? ' today' : d < 10 ? ' past' : '') + (marks[d] ? ' has' : '') + '"' + (d === 10 ? ' aria-current="date"' : '') + '>' + d + '</span>';
    $('cal').innerHTML = out;
  })();

  function renderOpts() {
    document.querySelectorAll('.chips[data-key]').forEach(function (box) {
      var k = box.dataset.key; if (!OPTS[k]) return;
      box.innerHTML = OPTS[k].map(function (o) {
        var on = MULTI[k] ? has(cfg[k], o[0]) : cfg[k] === o[0];
        if (COLORS[k]) return '<button type="button" class="sw" style="background:' + o[0] + '" data-v="' + o[0] + '" aria-pressed="' + on + '" aria-label="' + o[1] + '" title="' + o[1] + '"></button>';
        return '<button type="button" class="chip" data-v="' + o[0] + '" aria-pressed="' + on + '">' + o[1] + '</button>';
      }).join('');
    });
    document.querySelectorAll('.moods button').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.mood === previewMood)); });
  }
  document.querySelector('.opts').addEventListener('click', function (e) {
    var b = e.target.closest('.chips button'); if (!b) return;
    var k = b.parentNode.dataset.key, v = b.dataset.v;
    if (MULTI[k]) { var list = cfg[k].slice(), i = list.indexOf(v); if (i === -1) list.push(v); else list.splice(i, 1); cfg[k] = list; }
    else cfg[k] = v;
    renderOpts(); refreshAvatar();
  });
  document.querySelector('.moods').addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b) return; previewMood = b.dataset.mood; renderOpts(); renderPet(); });
  function applyNames() {
    var n = $('in-nome').value.trim() || 'Annalu', p = $('in-pet').value.trim() || 'Cereja';
    document.querySelectorAll('[data-display-name]').forEach(function (el) { el.textContent = n; });
    document.querySelectorAll('[data-pet-name]').forEach(function (el) { el.textContent = p; });
    $('pet-card').hidden = !$('in-showpet').checked;
  }
  $('in-nome').value = load('nome', 'Annalu'); $('in-pet').value = load('pet-nome', 'Cereja'); $('in-showpet').checked = load('pet-show', '1') === '1';
  ['in-nome', 'in-pet'].forEach(function (id) { $(id).addEventListener('input', applyNames); });
  $('in-showpet').addEventListener('change', function () { applyNames(); route(); });
  $('btn-save').addEventListener('click', function () { save('avatar-v2', JSON.stringify(cfg)); save('nome', $('in-nome').value); save('pet-nome', $('in-pet').value); save('pet-show', $('in-showpet').checked ? '1' : '0'); toast('Perfil salvo'); });
  $('btn-random').addEventListener('click', function () {
    Object.keys(OPTS).forEach(function (k) { var vals = OPTS[k].map(function (o) { return o[0]; }); cfg[k] = MULTI[k] ? vals.filter(function () { return Math.random() < .25; }) : vals[Math.floor(Math.random() * vals.length)]; });
    renderOpts(); refreshAvatar();
  });

  var kind = 'nota', notes = 3;
  document.querySelector('.capture .seg').addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return; kind = b.dataset.kind;
    this.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
    $('cap-in').placeholder = kind === 'ideia' ? 'Descreva a ideia em uma frase' : 'Escreva algo e pressione Enter';
  });
  $('capture').addEventListener('submit', function (e) {
    e.preventDefault(); var i = $('cap-in'); if (!i.value.trim()) return; i.value = '';
    if (kind === 'ideia') { $('inbox').textContent = 'Ideia salva no Idea Lab · agora mesmo'; award('cupcake', 'Ideia nova! Cupcake!'); }
    else { notes++; $('inbox').textContent = 'Inbox: ' + notes + ' notas · salva agora'; }
  });

  function setSide(v) { root.setAttribute('data-side', v); save('side', v); var b = $('btn-collapse'); b.setAttribute('aria-expanded', String(v !== 'collapsed')); b.setAttribute('aria-label', v === 'collapsed' ? 'Expandir menu' : 'Recolher menu'); b.title = b.getAttribute('aria-label'); }
  function setDrawer(open) { if (open) root.setAttribute('data-drawer', 'open'); else root.removeAttribute('data-drawer'); $('btn-menu').setAttribute('aria-expanded', String(open)); }
  setSide(load('side', 'open'));
  $('btn-collapse').addEventListener('click', function () { setSide(root.getAttribute('data-side') === 'collapsed' ? 'open' : 'collapsed'); });
  $('btn-menu').addEventListener('click', function () { setDrawer(root.getAttribute('data-drawer') !== 'open'); });
  $('backdrop').addEventListener('click', function () { setDrawer(false); });
  function isDark() { var t = root.getAttribute('data-theme'); return t ? t === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches; }
  function paintThemeBtn() {
    var d = isDark();
    $('ico-tema').innerHTML = d ? '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>' : '<path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z"/>';
    $('btn-tema').setAttribute('aria-label', d ? 'Mudar para modo claro' : 'Mudar para modo escuro');
  }
  var savedTheme = load('tema-v4', ''); if (savedTheme) root.setAttribute('data-theme', savedTheme);
  paintThemeBtn();
  $('btn-tema').addEventListener('click', function () { var next = isDark() ? 'light' : 'dark'; root.setAttribute('data-theme', next); save('tema-v4', next); paintThemeBtn(); });
  function setColagem(v) { root.setAttribute('data-colagem', v); save('colagem-v4', v); document.querySelectorAll('button[data-colagem]').forEach(function (b) { b.setAttribute('aria-checked', String(b.dataset.colagem === v)); }); }
  setColagem(load('colagem-v4', 'presente'));
  var pop = $('pop-colagem'), popBtn = $('btn-colagem');
  function setPop(open) { pop.hidden = !open; popBtn.setAttribute('aria-expanded', String(open)); if (open) (pop.querySelector('[aria-checked="true"]') || pop.querySelector('button')).focus(); }
  popBtn.addEventListener('click', function (e) { e.stopPropagation(); setPop(pop.hidden); });
  pop.addEventListener('click', function (e) { var b = e.target.closest('button'); if (b) { setColagem(b.dataset.colagem); setPop(false); popBtn.focus(); } });
  document.addEventListener('click', function (e) { if (!pop.hidden && !pop.contains(e.target) && e.target !== popBtn) setPop(false); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { if (!pop.hidden) { setPop(false); popBtn.focus(); } setDrawer(false); } });

  function route() {
    var v = location.hash === '#perfil' ? 'perfil' : 'inicio';
    $('view-inicio').hidden = v !== 'inicio'; $('view-perfil').hidden = v !== 'perfil';
    $('crumb').textContent = v === 'perfil' ? 'Perfil' : 'Início';
    document.querySelectorAll('nav a[data-view]').forEach(function (a) { if (a.dataset.view === v) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    if (P3) P3.mount(v === 'perfil' ? $('prev-stage') : ($('in-showpet').checked ? $('pet-stage') : null));
    setDrawer(false); renderPet(); window.scrollTo(0, 0);
  }
  window.addEventListener('hashchange', route);

  renderTasks(); renderOpts(); applyNames(); route(); refreshAvatar();
  if (!P3) toast('Seu navegador não abriu o 3D; mostrando o pet em 2D.');
})();
