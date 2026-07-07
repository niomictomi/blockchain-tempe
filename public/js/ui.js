// js/ui.js — Ledger, Block Explorer, Modals, Progress, Nodes
'use strict';

function ts() {
  return new Date().toLocaleTimeString('id-ID', { hour:'2-digit', minute:'2-digit', second:'2-digit' });
}

// ── Ledger log (accumulates — never clears existing entries) ─────────────────

function log(msg, type, step) {
  logRecord(msg, type, step);  // logger.js
  const colors = { info:'#00ffcc', warn:'#ffc107', err:'#ff5555', addr:'#aaddff',
                   hash:'#cc88ff', ok:'#28dd88', sim:'#b57bff', crypto:'#ff9944' };
  const color = colors[type] || '#00ffcc';
  const el = document.getElementById('ledger');
  if (!el) return;
  const ph = el.querySelector('.ledger-placeholder');
  if (ph) ph.remove();
  const div = document.createElement('div');
  div.innerHTML = '<span style="color:#333;">[' + ts() + ']</span>'
    + (step ? ' <span style="color:#444;">[' + step + ']</span>' : '')
    + ' <span style="color:' + color + ';">' + msg + '</span>';
  el.appendChild(div);
  el.scrollTop = el.scrollHeight;
}

// ── Step card helpers ────────────────────────────────────────────────────────

function setStat(id, msg, cls) {
  const el = document.getElementById('s' + id);
  if (!el) return;
  el.textContent = msg;
  el.className = 'status' + (cls ? ' ' + cls : '');
}

function setActive(id) {
  const c = document.getElementById('c' + id); if (c) c.className = 'step-card active';
  const b = document.getElementById('b' + id);
  if (b) { b.textContent = 'AKTIF'; b.className = 'sbadge active'; }
}

function setDone(id) {
  const c = document.getElementById('c' + id); if (c) c.className = 'step-card done';
  const b = document.getElementById('b' + id);
  if (b) { b.textContent = '✓ SELESAI'; b.className = 'sbadge done'; }
  APP.stepsDone = Math.max(APP.stepsDone, id + 1);
  const pct = Math.round((APP.stepsDone / 9) * 100);
  const pf = document.getElementById('progFill'); if (pf) pf.style.width = pct + '%';
  const pl = document.getElementById('progLabel');
  if (pl) pl.textContent = 'Step ' + APP.stepsDone + ' / 9 — ' + pct + '%';
}

// ── Block Explorer ───────────────────────────────────────────────────────────

function addBlock(type, label, extra, meta) {
  APP.blockNum++;
  APP.txTotal++;
  const bc = document.getElementById('blockCount'); if (bc) bc.textContent = APP.blockNum + 1;
  const tc = document.getElementById('txCount');    if (tc) tc.textContent = APP.txTotal;

  const icons = { DEPLOY:'🚀', REGISTER:'📋', TRANSFER:'🔄', VERIFY:'✅', ENCRYPT:'🔐', KEYGEN:'🔑' };
  const idx   = APP.blockRegistry.length;
  const prev  = APP.blockRegistry[idx - 1];
  const bHash = fakeTxHash();

  const entry = Object.assign({
    idx, num: APP.blockNum, type, icon: icons[type] || '📦',
    blockHash: bHash,
    prevHash:  prev ? prev.blockHash : '0x' + '0'.repeat(64),
    timestamp: new Date().toLocaleString('id-ID'),
    blockNum:  APP.simFakeBlockNum + APP.blockNum,
    gasUsed:   '0', gasLimit: '30,000,000',
    nonce:     '0x' + Math.floor(Math.random() * 0xffffffff).toString(16).padStart(16, '0'),
    difficulty: APP.SIM_MODE ? '0 (' + APP.currentPolicy + ')' : 'N/A',
    size:      Math.floor(Math.random() * 800 + 400) + ' bytes',
    txCount:   1, contractAddr: null, docName: null, docHash: null,
    from: null, to: null, owner: null, txHash: null, extra,
  }, meta || {});

  APP.blockRegistry.push(entry);

  const chain = document.getElementById('chain');
  if (!chain) return;
  const arr = document.createElement('span'); arr.className = 'arrow'; arr.textContent = '→';
  chain.appendChild(arr);
  const b = document.createElement('div');
  b.className = 'block ' + type.toLowerCase();
  b.title = 'Klik untuk detail Block #' + APP.blockNum;
  b.innerHTML =
    '<div style="font-size:1.3rem;">' + (icons[type] || '📦') + '</div>' +
    '<b>Block #' + APP.blockNum + '</b><br>' +
    '<span style="color:#aaddff;">' + type + '</span><br>' +
    '<small style="color:#888;">' + label.substring(0, 14) + '</small><br>' +
    '<small style="color:#555;">' + extra + '</small>';
  b.onclick = () => openBlockModal(idx);
  chain.appendChild(b);
  chain.scrollLeft = chain.scrollWidth;
}

// ── Node animations ──────────────────────────────────────────────────────────

function syncNodes(ms) {
  ['n0','n1','n2','n3'].forEach(id => {
    const n = document.getElementById(id); if (!n) return;
    n.classList.add('syncing');
    n.querySelector('small').textContent = 'Syncing...';
  });
  setTimeout(() => {
    ['n0','n1','n2','n3'].forEach(id => {
      const n = document.getElementById(id); if (!n) return;
      n.classList.remove('syncing');
      if (n.classList.contains('online') || n.classList.contains('sender') || n.classList.contains('receiver'))
        n.querySelector('small').textContent = 'Online ✓';
    });
  }, ms || 3000);
}

function bringNodesOnline() {
  ['n0','n1','n2','n3'].forEach(id => {
    const n = document.getElementById(id); if (!n) return;
    n.classList.add('online');
    n.querySelector('small').textContent = 'Online ✓';
  });
  const nA = document.getElementById('n0'); if (!nA) return;
  nA.classList.remove('online'); nA.classList.add('sender');
  nA.innerHTML = '<span class="icon">👩</span>Alice<br><small>Online ✓</small>';
}

// ── Ledger Fullscreen Modal ──────────────────────────────────────────────────

function openLedgerModal() {
  const lf = document.getElementById('ledgerFull');
  if (lf) lf.innerHTML = document.getElementById('ledger').innerHTML;
  document.getElementById('ledgerModal').classList.add('open');
  showTab('log');
  setTimeout(() => { if (lf) lf.scrollTop = 9999; }, 50);
}

function closeLedgerModal() {
  document.getElementById('ledgerModal').classList.remove('open');
}

function showTab(tab) {
  ['Log','Flow'].forEach(t => {
    const btn = document.getElementById('tabBtn' + t); if (btn) btn.classList.toggle('active', t.toLowerCase() === tab);
    const panel = document.getElementById('tab' + t);  if (panel) panel.classList.toggle('active', t.toLowerCase() === tab);
  });
  if (tab === 'flow') buildFlowAnalysis();
}

// ── Block Detail Modal ───────────────────────────────────────────────────────

function openBlockModal(idx) {
  const e = APP.blockRegistry[idx]; if (!e) return;
  const icons = { GENESIS:'🏛️', DEPLOY:'🚀', REGISTER:'📋', TRANSFER:'🔄', VERIFY:'✅', ENCRYPT:'🔐', KEYGEN:'🔑' };
  document.getElementById('blockModalIcon').textContent  = icons[e.type] || '📦';
  document.getElementById('blockModalTitle').textContent = 'Block #' + e.num + ' — ' + e.type;

  const row  = (k, v, cls) => '<tr><td>' + k + '</td><td><span class="' + (cls||'hl') + '">' + v + '</span></td></tr>';
  const rowP = (k, v) => '<tr><td>' + k + '</td><td>' + v + '</td></tr>';
  const sec  = t => '<tr><td colspan="2" class="blk-section">' + t + '</td></tr>';

  let h = '<span class="block-badge ' + e.type.toLowerCase() + '">' + e.type + '</span>';
  h += '<table class="blk-table">';
  h += sec('⛓️ Chain Attributes');
  h += row('Block Number', '#' + e.num);
  h += row('Block Hash', e.blockHash, 'hl-hash');
  h += row('Previous Hash', e.prevHash, 'hl-hash');
  h += rowP('Timestamp', e.timestamp);
  h += rowP('Nonce', e.nonce);
  h += rowP('Difficulty', e.difficulty);
  h += rowP('Block Size', e.size);
  h += rowP('Tx Count', e.txCount);
  h += sec('⚡ Execution');
  h += rowP('Gas Used', Number(e.gasUsed).toLocaleString());
  h += rowP('Gas Limit', e.gasLimit);
  h += row('Validator / Miner', e.miner || APP.aliceAddress || '0x000...', 'hl-addr');
  if (e.txHash) {
    h += sec('📝 Transaction');
    h += row('Tx Hash', e.txHash, 'hl-hash');
    if (e.from) h += row('From', e.from, 'hl-addr');
    if (e.to)   h += row('To',   e.to,   'hl-addr');
    if (e.contractAddr) h += row('Contract Address', e.contractAddr, 'hl');
  }
  if (e.docHash || e.docName) {
    h += sec('📄 Document Metadata (On-Chain)');
    if (e.docName) h += rowP('Document Name', e.docName);
    if (e.docHash) h += row('SHA-256 (Original File)', e.docHash, 'hl-hash');
    if (e.encryptedFileHash) h += row('SHA-256 (Encrypted File)', e.encryptedFileHash, 'hl-hash');
    if (e.encryptedKeyHash)  h += row('SHA-256 (Wrapped AES Key)', e.encryptedKeyHash, 'hl-hash');
    if (e.ivHash)            h += row('SHA-256 (IV)', e.ivHash, 'hl-hash');
    if (e.algorithm)         h += rowP('Algorithm', e.algorithm);
    if (e.type === 'TRANSFER' && e.to)    h += row('New Owner (Bob)', e.to, 'hl-ok');
    if (e.type === 'VERIFY'   && e.owner) h += row('Verified Owner', e.owner, 'hl-ok');
  }
  h += sec('🔒 Privacy Guarantee');
  h += rowP('File bytes on-chain?', '❌ No — stored locally only');
  h += rowP('AES key on-chain?', '❌ No — only SHA-256(wrappedKey)');
  h += rowP('RSA key on-chain?', '❌ No — generated client-side');
  h += rowP('IV on-chain?', '❌ No — only SHA-256(IV)');
  h += '</table>';

  document.getElementById('blockModalBody').innerHTML = h;
  document.getElementById('blockModal').classList.add('open');
}

function closeBlockModal() {
  document.getElementById('blockModal').classList.remove('open');
}

// ── Flow Analysis ────────────────────────────────────────────────────────────

function buildFlowAnalysis() {
  const c = document.getElementById('flowAnalysis'); if (!c) return;
  const s = APP.session;

  const steps = [
    { label:'Koneksi',   sub:APP.SIM_MODE?'Sim':'MetaMask', done: APP.stepsDone >= 1 },
    { label:'Jaringan',  sub: APP.currentPolicy,              done: APP.stepsDone >= 2 },
    { label:'Deploy',    sub:'Smart Contract',                 done: APP.stepsDone >= 3 },
    { label:'Key Gen',   sub:'RSA-4096',                      done: APP.stepsDone >= 4 },
    { label:'Upload',    sub:'SHA-256',                        done: APP.stepsDone >= 5 },
    { label:'Enkripsi',  sub:'AES-256-GCM',                   done: APP.stepsDone >= 6 },
    { label:'Simpan',    sub:'.enc File',                      done: APP.stepsDone >= 7 },
    { label:'Register',  sub:'On-Chain',                       done: APP.stepsDone >= 8 },
    { label:'Transfer',  sub:'Alice→Bob',                      done: APP.stepsDone >= 9 },
  ];
  const icons = ['👛','⚙️','🚀','🔑','📂','🔐','💾','📋','🔄'];

  let pipe = '<div class="fa-section"><div class="fa-section-title">🔄 Alur Pipeline</div><div class="pipeline">';
  steps.forEach((s, i) => {
    const cls = s.done ? 'done' : 'pending';
    pipe += '<div class="pipe-node"><div class="pipe-icon ' + cls + '">' + icons[i] + '</div>'
          + '<div class="pipe-label"><strong>' + s.label + '</strong>' + s.sub + '</div></div>';
    if (i < steps.length - 1)
      pipe += '<div class="pipe-connector' + (s.done && steps[i+1].done ? ' done' : '') + '"><span>→</span></div>';
  });
  pipe += '</div></div>';

  // Hash chain
  let chain = '<div class="fa-section"><div class="fa-section-title">⛓️ Rantai Hash Blok</div><div class="hash-chain">';
  APP.blockRegistry.forEach(e => {
    chain += '<div class="hash-block"><div class="hash-block-hdr">'
           + '<span class="hash-block-badge ' + e.type.toLowerCase() + '">' + e.type + '</span>'
           + '<b style="font-size:12px;">Block #' + e.num + '</b>'
           + '<span style="font-size:10px;color:#555;margin-left:auto;">' + e.timestamp + '</span></div>'
           + '<div class="hash-formula">'
           + '<span class="kw">blockHash</span> = keccak256(<span class="val">prevHash ∥ txData ∥ nonce</span>)<br>'
           + '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;= <span class="res">' + (e.blockHash || '—') + '</span><br>'
           + '<span class="kw">prevHash</span>  = <span class="res">' + (e.prevHash || '—') + '</span>'
           + (e.txHash ? '<br><span class="kw">txHash</span>    = <span class="val">' + e.txHash + '</span>' : '')
           + (e.gasUsed && e.gasUsed !== '0' ? '<br><span class="kw">gasUsed</span>   = <span class="res">' + Number(e.gasUsed).toLocaleString() + ' gas</span>' : '')
           + '</div></div>';
  });
  chain += '</div></div>';

  // Crypto math
  let crypto_ = '<div class="fa-section"><div class="fa-section-title">🔐 Kalkulasi Kriptografi</div>'
    + '<div class="hash-formula" style="background:#0e0e18;border-radius:6px;padding:14px;line-height:2.1;">';
  crypto_ += '<span class="kw">AES Key Size</span>     = <span class="res">256 bit (32 byte)</span><br>';
  crypto_ += '<span class="kw">AES Mode</span>         = <span class="res">GCM (Galois/Counter Mode) — authenticated encryption</span><br>';
  crypto_ += '<span class="kw">AES IV Size</span>       = <span class="res">96 bit (12 byte) — unique per encryption</span><br>';
  crypto_ += '<span class="kw">RSA Key Size</span>      = <span class="res">4096 bit — OAEP padding, SHA-256 hash</span><br>';
  crypto_ += '<span class="kw">RSA Public Exp.</span>   = <span class="res">65537 (0x010001)</span><br>';
  crypto_ += '<span class="kw">Wrap Algorithm</span>    = <span class="res">RSA-OAEP(SHA-256): Encrypt(AES_raw, Bob.pubKey)</span><br>';
  if (s.docHash)      crypto_ += '<span class="kw">SHA256(original)</span>  = <span class="val">' + s.docHash + '</span><br>';
  if (s.encFileHash)  crypto_ += '<span class="kw">SHA256(enc file)</span>  = <span class="val">' + s.encFileHash + '</span><br>';
  if (s.encKeyHash)   crypto_ += '<span class="kw">SHA256(AES wrap)</span>  = <span class="val">' + s.encKeyHash + '</span><br>';
  if (s.ivHash)       crypto_ += '<span class="kw">SHA256(IV)</span>        = <span class="val">' + s.ivHash + '</span><br>';
  crypto_ += '<span class="ok">✓ File & key bytes TIDAK disimpan on-chain — hanya SHA-256-nya</span>';
  crypto_ += '</div></div>';

  // Gas
  const txBlocks = APP.blockRegistry.filter(e => e.txHash);
  let gasHtml = '<div class="fa-section"><div class="fa-section-title">⚡ Akuntansi Gas</div>';
  if (txBlocks.length) {
    let total = 0;
    gasHtml += '<table class="math-table"><thead><tr><th>Operasi</th><th style="text-align:right;">Gas</th><th style="text-align:right;">Biaya (1 Gwei)</th></tr></thead><tbody>';
    txBlocks.forEach(e => {
      const g = parseInt(e.gasUsed) || 0; total += g;
      gasHtml += '<tr><td class="c1">' + (e.icon||'') + ' ' + e.type + '</td>'
               + '<td class="c2">' + g.toLocaleString() + '</td>'
               + '<td class="c4">' + (g/1e9).toFixed(8) + ' ETH</td></tr>';
    });
    gasHtml += '<tr><td>Total</td><td class="c2">' + total.toLocaleString() + '</td><td class="c4">' + (total/1e9).toFixed(8) + ' ETH</td></tr>';
    gasHtml += '</tbody></table>';
    if (APP.SIM_MODE) gasHtml += '<div style="font-size:10px;color:#555;margin-top:6px;">* Gas adalah simulasi — tidak ada ETH nyata terpakai.</div>';
  } else {
    gasHtml += '<div style="color:#555;font-size:12px;padding:12px;background:#0e0e18;border-radius:6px;">Belum ada transaksi.</div>';
  }
  gasHtml += '</div>';

  c.innerHTML = pipe + chain + crypto_ + gasHtml;
}

// Close on backdrop / Escape
document.addEventListener('click', e => {
  if (e.target.id === 'ledgerModal') closeLedgerModal();
  if (e.target.id === 'blockModal')  closeBlockModal();
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { closeLedgerModal(); closeBlockModal(); }
});
