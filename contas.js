/* Jarvis Finance — contas fixas (PC e iPhone): cadastro, ciclo do mês, leitura do PDF da conta
   (valor, vencimento, código de barras, Pix) e baixa automática quando o pagamento
   aparece no extrato. Nada aqui fala com a internet. */
(function (G) {
  'use strict';
  const F = G.Finn;
  const { pad, hoje, uid, norm, cents, r2, addDias, difDias, fimDoMes, mesAnterior, mesSeguinte, dinheiro, dataBR } = F;

  /* ---------- quem é quem ---------- */
  const FORNECEDORES = {
    cemig: { id: 'cemig', nome: 'Cemig', conta: 'Conta de luz', categoria: 'casa', ic: 'raio', cor: '#ff9f0a', re: /\bCEMIG\b/, segmento: '3', site: 'atende.cemig.com.br' },
    copasa: { id: 'copasa', nome: 'Copasa', conta: 'Conta de água', categoria: 'casa', ic: 'gota', cor: '#0a84ff', re: /\bCOPASA\b/, segmento: '2', site: 'copasa' },
    claro: { id: 'claro', nome: 'Claro', conta: 'Internet', categoria: 'celular', ic: 'wifi', cor: '#e3262e', re: /\bCLARO\b|\bNET SERVICOS\b/, segmento: '4', site: 'minhaclaro.claro.com.br' },
  };
  const ORDEM_FORN = ['cemig', 'copasa', 'claro'];
  const FORMAS = { debito: 'Débito automático', boleto: 'Boleto', pix: 'Pix', cartao: 'Cartão de crédito', outro: 'Outro' };
  const FORMAS_CURTAS = { debito: 'Débito automático', boleto: 'Boleto', pix: 'Pix', cartao: 'Cartão', outro: 'Outro' };

  /* =====================================================================
     CÓDIGO DE BARRAS (padrão FEBRABAN)
     ===================================================================== */
  const so = s => String(s || '').replace(/\D/g, '');
  function mod10(s) { let t = 0, p = 2; for (let i = s.length - 1; i >= 0; i--) { const x = +s[i] * p; t += x > 9 ? x - 9 : x; p = p === 2 ? 1 : 2; } const r = t % 10; return r ? 10 - r : 0; }
  function mod11a(s) { let t = 0, p = 2; for (let i = s.length - 1; i >= 0; i--) { t += +s[i] * p; p = p === 9 ? 2 : p + 1; } const r = t % 11; return r < 2 ? 0 : 11 - r; }
  function mod11b(s) { let t = 0, p = 2; for (let i = s.length - 1; i >= 0; i--) { t += +s[i] * p; p = p === 9 ? 2 : p + 1; } const d = 11 - (t % 11); return d > 9 ? 1 : d; }

  // contas de consumo (luz, água, telefone): 44 dígitos no código, 48 na linha digitável, começa com 8
  function arrecDeBarras(b) {
    if (b.length !== 44 || b[0] !== '8' || !'6789'.includes(b[2])) return null;
    const md = '67'.includes(b[2]) ? mod10 : mod11a;
    if (md(b.slice(0, 3) + b.slice(4)) !== +b[3]) return null;
    const linha = [0, 11, 22, 33].map(i => b.slice(i, i + 11)).map(x => x + md(x)).join('');
    const valor = '68'.includes(b[2]) ? Number(b.slice(4, 15)) / 100 : null;
    return { tipo: 'arrecadacao', barras: b, linha, valor: valor || null, vencimento: null, segmento: b[1] };
  }
  function arrecDeLinha(l) {
    if (l.length !== 48 || l[0] !== '8' || !'6789'.includes(l[2])) return null;
    const md = '67'.includes(l[2]) ? mod10 : mod11a;
    for (let k = 0; k < 4; k++) if (md(l.slice(k * 12, k * 12 + 11)) !== +l[k * 12 + 11]) return null;
    return arrecDeBarras([0, 1, 2, 3].map(k => l.slice(k * 12, k * 12 + 11)).join(''));
  }
  // boleto bancário: 44 no código, 47 na linha digitável
  function vencFator(f) {
    if (!f) return null;
    const d1 = addDias('1997-10-07', f), d2 = f >= 1000 ? addDias('2025-02-22', f - 1000) : null; // o fator recomeçou em 22/02/2025
    if (!d2) return d1;
    const h = hoje(); return Math.abs(difDias(h, d1)) <= Math.abs(difDias(h, d2)) ? d1 : d2;
  }
  function boletoDeBarras(b) {
    if (b.length !== 44 || b[0] === '8') return null;
    if (mod11b(b.slice(0, 4) + b.slice(5)) !== +b[4]) return null;
    const c1 = b.slice(0, 4) + b.slice(19, 24), c2 = b.slice(24, 34), c3 = b.slice(34, 44);
    const linha = c1 + mod10(c1) + c2 + mod10(c2) + c3 + mod10(c3) + b[4] + b.slice(5, 19);
    return { tipo: 'boleto', barras: b, linha, valor: Number(b.slice(9, 19)) / 100 || null, vencimento: vencFator(Number(b.slice(5, 9))), banco: b.slice(0, 3) };
  }
  function boletoDeLinha(l) {
    if (l.length !== 47) return null;
    if (mod10(l.slice(0, 9)) !== +l[9] || mod10(l.slice(10, 20)) !== +l[20] || mod10(l.slice(21, 31)) !== +l[31]) return null;
    return boletoDeBarras(l.slice(0, 4) + l[32] + l.slice(33, 47) + l.slice(4, 9) + l.slice(10, 20) + l.slice(21, 31));
  }
  function lerCodigo(txt) {
    const d = so(txt);
    if (d.length === 48) return arrecDeLinha(d);
    if (d.length === 47) return boletoDeLinha(d);
    if (d.length === 44) return d[0] === '8' ? arrecDeBarras(d) : boletoDeBarras(d);
    return null;
  }
  function formatarLinha(l) {
    l = so(l);
    if (l.length === 48) return [0, 1, 2, 3].map(k => l.slice(k * 12, k * 12 + 11) + '-' + l[k * 12 + 11]).join(' ');
    if (l.length === 47) return `${l.slice(0, 5)}.${l.slice(5, 10)} ${l.slice(10, 15)}.${l.slice(15, 21)} ${l.slice(21, 26)}.${l.slice(26, 32)} ${l[32]} ${l.slice(33)}`;
    return l;
  }
  // procura linhas digitáveis em texto solto (grupos de números separados só por espaço)
  function acharCodigos(texto) {
    const t = String(texto || ''), toks = [], re = /\d[\d.\-]*\d|\d/g; let m;
    while ((m = re.exec(t))) toks.push({ d: so(m[0]), i: m.index, f: m.index + m[0].length });
    const achados = new Map();
    for (let i = 0; i < toks.length; i++) {
      let acc = '';
      for (let j = i; j < toks.length && j < i + 16; j++) {
        if (j > i && !/^\s*$/.test(t.slice(toks[j - 1].f, toks[j].i))) break;
        acc += toks[j].d; if (acc.length > 48) break;
        if (acc.length === 44 || acc.length === 47 || acc.length === 48) { const c = lerCodigo(acc); if (c && !achados.has(c.barras)) achados.set(c.barras, c); }
      }
    }
    return [...achados.values()];
  }

  /* =====================================================================
     PIX COPIA E COLA (BR Code)
     ===================================================================== */
  function crc16(s) {
    let c = 0xFFFF;
    for (let i = 0; i < s.length; i++) { c ^= s.charCodeAt(i) << 8; for (let k = 0; k < 8; k++) c = c & 0x8000 ? ((c << 1) ^ 0x1021) & 0xFFFF : (c << 1) & 0xFFFF; }
    return c.toString(16).toUpperCase().padStart(4, '0');
  }
  function tlv(s) { const o = {}; let p = 0; while (p + 4 <= s.length) { const id = s.slice(p, p + 2), n = parseInt(s.slice(p + 2, p + 4), 10); if (isNaN(n)) break; o[id] = s.slice(p + 4, p + 4 + n); p += 4 + n; } return o; }
  function lerPix(txt) {
    const s = String(txt || '').trim();
    if (!s.startsWith('000201')) return null;
    for (let i = s.indexOf('6304'); i >= 0 && s.length >= i + 8; i = s.indexOf('6304', i + 1)) {
      const corpo = s.slice(0, i + 4);
      if (crc16(corpo) !== s.slice(i + 4, i + 8).toUpperCase()) continue;
      const top = tlv(corpo.slice(0, -4)), mai = top['26'] ? tlv(top['26']) : {};
      if (!/br\.gov\.bcb\.pix/i.test(mai['00'] || '')) return null;
      const v = top['54'] ? Number(top['54']) : null;
      return { payload: s.slice(0, i + 8), valor: v > 0 ? v : null, nome: top['59'] || '', cidade: top['60'] || '', chave: mai['01'] || '', url: mai['25'] || '' };
    }
    return null;
  }
  function acharPix(texto) {
    const t = String(texto || '');
    for (const v of [t.replace(/\r?\n/g, ''), t.replace(/\s+/g, ''), t]) {
      for (let i = v.indexOf('000201'); i >= 0; i = v.indexOf('000201', i + 1)) { const p = lerPix(v.slice(i, i + 700)); if (p) return p; }
    }
    return null;
  }

  /* =====================================================================
     LEITURA DO TEXTO DA CONTA
     ===================================================================== */
  const MES_ABR = { JAN: 1, FEV: 2, MAR: 3, ABR: 4, MAI: 5, JUN: 6, JUL: 7, AGO: 8, SET: 9, OUT: 10, NOV: 11, DEZ: 12 };
  const MES_EXT = ['JANEIRO', 'FEVEREIRO', 'MARCO', 'ABRIL', 'MAIO', 'JUNHO', 'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'];
  const VAL = '(\\d{1,3}(?:\\.\\d{3})*,\\d{2})';
  const numBR = s => Number(String(s).replace(/\./g, '').replace(',', '.'));
  function dataISO(s) {
    const m = /(\d{2})\/(\d{2})\/(\d{4}|\d{2})/.exec(s || ''); if (!m) return null;
    const a = m[3].length === 2 ? '20' + m[3] : m[3], mm = +m[2], dd = +m[1];
    if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return null;
    return `${a}-${m[2]}-${m[1]}`;
  }
  const ROTULOS_VALOR = ['TOTAL A PAGAR', 'VALOR A PAGAR', 'VALOR TOTAL A PAGAR', 'TOTAL DA FATURA', 'VALOR DA FATURA', 'TOTAL DA CONTA', 'VALOR DO DOCUMENTO', 'VALOR COBRADO', 'VALOR TOTAL'];

  function analisarTexto(texto) {
    const T = norm(texto);
    const r = { fornecedor: null, valor: null, vencimento: null, competencia: null, linha: null, tipoCodigo: null, pix: null, confianca: 'baixa' };
    // empresa: a que mais aparece
    let melhor = 0;
    for (const f of Object.values(FORNECEDORES)) { const n = (T.match(new RegExp(f.re.source, 'g')) || []).length; if (n > melhor) { melhor = n; r.fornecedor = f.id; } }
    // código de barras: a fonte mais confiável do valor
    const cods = acharCodigos(texto);
    const cod = cods.find(c => c.tipo === 'arrecadacao' && c.valor) || cods.find(c => c.valor) || cods[0];
    if (cod) {
      r.linha = cod.linha; r.tipoCodigo = cod.tipo; if (cod.valor) r.valor = cod.valor;
      if (!r.fornecedor && cod.tipo === 'arrecadacao') r.fornecedor = cod.segmento === '3' ? 'cemig' : cod.segmento === '2' ? 'copasa' : null;
    }
    // valor pelos rótulos
    if (r.valor == null) {
      for (const rot of ROTULOS_VALOR) { const m = new RegExp(rot.replace(/ /g, '\\s*') + '[^,]{0,45}?' + VAL).exec(T); if (m) { r.valor = numBR(m[1]); break; } }
    }
    // vencimento
    let m = /VENCIMENTO[\s\S]{0,70}?(\d{2}\/\d{2}\/\d{4})/.exec(T) || /VENCE(?:R)?\s*EM[\s\S]{0,20}?(\d{2}\/\d{2}\/\d{4})/.exec(T) || /PAGAVEL\s*ATE[\s\S]{0,20}?(\d{2}\/\d{2}\/\d{4})/.exec(T);
    if (m) r.vencimento = dataISO(m[1]);
    if (!r.vencimento && cod && cod.vencimento) r.vencimento = cod.vencimento;
    // mês de referência
    if ((m = /REFERENTE\s*A[\s\S]{0,40}?\b(JAN|FEV|MAR|ABR|MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ)\s*\/\s*(\d{4})\b/.exec(T)) || (m = /\b(JAN|FEV|MAR|ABR|MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ)\s*\/\s*(\d{4})\b/.exec(T))) r.competencia = `${m[2]}-${pad(MES_ABR[m[1]])}`;
    else if ((m = /(?:MES\s*\/?\s*ANO|MES DE REFERENCIA|REFERENCIA|COMPETENCIA)[\s\S]{0,30}?\b(\d{2})\/(\d{4})\b/.exec(T)) && +m[1] >= 1 && +m[1] <= 12) r.competencia = `${m[2]}-${m[1]}`;
    else if ((m = new RegExp(`\\b(${MES_EXT.join('|')})\\s*(?:DE\\s*|\\/\\s*)?(\\d{4})\\b`).exec(T))) r.competencia = `${m[2]}-${pad(MES_EXT.indexOf(m[1]) + 1)}`;
    // pix escrito no PDF
    const px = acharPix(texto);
    if (px) { r.pix = px.payload; if (r.valor == null && px.valor) r.valor = px.valor; }
    r.confianca = r.valor != null && r.vencimento && (r.linha || r.pix) ? 'alta' : r.valor != null && r.vencimento ? 'media' : 'baixa';
    return r;
  }

  /* =====================================================================
     PDF (pdf.js; QR do Pix com jsQR) — só no navegador
     ===================================================================== */
  const promessas = {};
  function carregar(url, pronto) {
    if (pronto()) return Promise.resolve();
    return promessas[url] || (promessas[url] = new Promise((ok, erro) => {
      const fim = () => (pronto() ? ok() : erro(new Error('Não consegui carregar ' + url)));
      const ja = document.querySelector(`script[src="${url}"]`);
      if (ja) { ja.addEventListener('load', fim); ja.addEventListener('error', fim); setTimeout(fim, 8000); return; }
      const s = document.createElement('script'); s.src = url; s.onload = fim; s.onerror = () => { s.remove(); delete promessas[url]; erro(new Error('Não consegui carregar o leitor de PDF.')); };
      document.head.append(s);
    }));
  }
  async function pdfjs() {
    await carregar('pdf.min.js', () => !!G.pdfjsLib);
    G.pdfjsLib.GlobalWorkerOptions.workerSrc = 'pdf.worker.min.js';
    return G.pdfjsLib;
  }
  const copia = b => (b instanceof Uint8Array ? b : new Uint8Array(b)).slice();
  async function abrirPdf(bytes, senhas = []) {
    const lib = await pdfjs();
    for (const senha of [undefined, ...senhas.filter(Boolean)]) {
      try { return await lib.getDocument({ data: copia(bytes), password: senha, isEvalSupported: false }).promise; }
      catch (e) { if (e && e.name === 'PasswordException') continue; throw new Error('Esse arquivo não parece um PDF válido.'); }
    }
    const e = new Error('Esse PDF tem senha.'); e.senha = true; throw e;
  }
  async function textoDoPdf(doc, maxPag = 6) {
    const linhas = [];
    for (let p = 1; p <= Math.min(doc.numPages, maxPag); p++) {
      const pg = await doc.getPage(p), tc = await pg.getTextContent();
      const its = tc.items.filter(i => typeof i.str === 'string' && i.str.length).map(i => ({ s: i.str, x: i.transform[4], y: i.transform[5], w: i.width || 0, h: Math.abs(i.transform[3]) || 8 }));
      its.sort((a, b) => b.y - a.y || a.x - b.x);
      let atual = [], y = null;
      const fecha = () => {
        if (!atual.length) return;
        atual.sort((a, b) => a.x - b.x);
        let s = '', ant = null;
        for (const it of atual) { if (ant) s += it.x - (ant.x + ant.w) > Math.max(1.2, ant.h * 0.18) ? ' ' : ''; s += it.s; ant = it; }
        linhas.push(s.replace(/\s+/g, ' ').trim()); atual = [];
      };
      for (const it of its) { if (y === null || Math.abs(it.y - y) > Math.max(2, it.h * 0.45)) { fecha(); y = it.y; } atual.push(it); }
      fecha(); linhas.push('');
    }
    return linhas.join('\n');
  }
  async function qrDoPdf(doc, maxPag = 2) {
    if (typeof document === 'undefined') return null;
    try { await carregar('jsQR.js', () => !!G.jsQR); } catch { return null; }
    const tenta = (img, x, y, w, h) => {
      const d = new Uint8ClampedArray(w * h * 4);
      for (let r = 0; r < h; r++) d.set(img.data.subarray(((y + r) * img.width + x) * 4, ((y + r) * img.width + x + w) * 4), r * w * 4);
      const q = G.jsQR(d, w, h, { inversionAttempts: 'dontInvert' });
      return q && q.data ? lerPix(q.data) : null;
    };
    for (let p = 1; p <= Math.min(doc.numPages, maxPag); p++) {
      const pg = await doc.getPage(p);
      for (const escala of [2, 3]) {
        const vp = pg.getViewport({ scale: escala });
        const cv = document.createElement('canvas'); cv.width = Math.ceil(vp.width); cv.height = Math.ceil(vp.height);
        const cx = cv.getContext('2d', { willReadFrequently: true });
        cx.fillStyle = '#fff'; cx.fillRect(0, 0, cv.width, cv.height);
        await pg.render({ canvasContext: cx, viewport: vp }).promise;
        const img = cx.getImageData(0, 0, cv.width, cv.height), W = img.width, H = img.height;
        cv.width = cv.height = 0;
        // a página inteira e depois pedaços (quando há mais de um QR na conta)
        const areas = [[0, 0, W, H], [0, H / 2, W, H / 2], [0, 0, W, H / 2], [0, 0, W / 2, H / 2], [W / 2, 0, W / 2, H / 2], [0, H / 2, W / 2, H / 2], [W / 2, H / 2, W / 2, H / 2], [0, H / 3, W, H / 3]];
        for (const [x, y, w, h] of areas) { const px = tenta(img, Math.floor(x), Math.floor(y), Math.floor(w), Math.floor(h)); if (px) return px; }
      }
    }
    return null;
  }
  async function lerPdf(bytes, { senhas = [], qr = true } = {}) {
    const doc = await abrirPdf(bytes, senhas);
    try {
      const texto = await textoDoPdf(doc);
      const r = analisarTexto(texto);
      if (!r.pix && qr) { const p = await qrDoPdf(doc).catch(() => null); if (p) { r.pix = p.payload; if (r.valor == null && p.valor) r.valor = p.valor; } }
      if (r.valor != null && r.vencimento && (r.linha || r.pix)) r.confianca = 'alta';
      r.paginas = doc.numPages; r.texto = texto;
      return r;
    } finally { try { doc.destroy(); } catch {} }
  }
  // desenha as páginas como imagens (visualizador do app)
  async function renderizar(bytes, alvo, { senhas = [], largura = 900 } = {}) {
    const doc = await abrirPdf(bytes, senhas);
    try {
      for (let p = 1; p <= doc.numPages; p++) {
        const pg = await doc.getPage(p), base = pg.getViewport({ scale: 1 });
        const vp = pg.getViewport({ scale: Math.min(3, (largura * Math.min(2, G.devicePixelRatio || 1)) / base.width) });
        const cv = document.createElement('canvas'); cv.width = Math.ceil(vp.width); cv.height = Math.ceil(vp.height);
        const cx = cv.getContext('2d'); cx.fillStyle = '#fff'; cx.fillRect(0, 0, cv.width, cv.height);
        await pg.render({ canvasContext: cx, viewport: vp }).promise;
        const blob = await new Promise(ok => cv.toBlob(ok, 'image/png'));
        const img = document.createElement('img'); img.alt = 'Página ' + p; img.src = URL.createObjectURL(blob); img.className = 'pdf-pag';
        alvo.append(img); cv.width = cv.height = 0;
      }
      return doc.numPages;
    } finally { try { doc.destroy(); } catch {} }
  }

  /* =====================================================================
     CADASTRO E CICLO DO MÊS
     ===================================================================== */
  const lista = (D, c) => (Array.isArray(D[c]) ? D[c] : (D[c] = []));
  const fixaDe = (D, id) => lista(D, 'fixas').find(x => x.id === id);
  const idFixaForn = f => 'fx-' + f;
  const idFatura = (fixaId, ciclo) => `fa-${fixaId}-${ciclo}`;
  const diaNoMes = (ym, dia) => `${ym}-${pad(Math.min(Math.max(1, Number(dia) || 1), Number(fimDoMes(ym).slice(8))))}`;
  const nomeFixa = fx => fx ? fx.nome || (fx.fornecedor ? FORNECEDORES[fx.fornecedor].conta : 'Conta') : 'Conta';
  const icFixa = fx => fx && fx.fornecedor ? FORNECEDORES[fx.fornecedor].ic : ((F.CAT[fx && fx.categoria] || F.CAT.outros).ic);

  function novaFixa(dados = {}) {
    return { id: uid(), nome: 'Conta', categoria: 'outros', valor: 0, variavel: false, dia: 10, forma: 'boleto', frequencia: 'mensal', ativa: true, criadaEm: new Date().toISOString(), ...dados };
  }
  function garantirFixa(D, forn) {
    const id = idFixaForn(forn); let fx = fixaDe(D, id);
    if (!fx) {
      const P = FORNECEDORES[forn];
      fx = { id, nome: P.conta, fornecedor: forn, categoria: P.categoria, valor: 0, variavel: true, dia: 0, forma: 'boleto', frequencia: 'mensal', ativa: true, criadaEm: new Date().toISOString(), busca: { ligada: true, estado: 'novo' } };
      lista(D, 'fixas').push(fx);
    } else if (fx.ativa === false) fx.ativa = true;
    return fx;
  }
  function vale(fx, ym) {
    if (!fx || fx.ativa === false) return false;
    if (fx.inicio && ym < fx.inicio) return false;
    if (fx.fim && ym > fx.fim) return false;
    if (fx.frequencia === 'anual') return Number(ym.slice(5)) === Number(fx.mesAnual || 1);
    return true;
  }
  function situacao(inst, h = hoje()) {
    if (inst.status === 'paga') return { s: 'paga', txt: `Paga em ${dataBR(inst.pagaEm || inst.vencimento).slice(0, 5)}${inst.pagaComo === 'extrato' ? ' · vi no extrato' : inst.pagaComo === 'site' ? ' · baixada no site' : ''}` };
    if (inst.aguardando) return { s: 'aguardando', txt: `Ainda não saiu · costuma vencer dia ${Number(inst.vencimento.slice(8))}` };
    const d = difDias(h, inst.vencimento);
    const deb = inst.fixa && inst.fixa.forma === 'debito';
    if (d < 0) return { s: 'vencida', d, txt: deb ? `Débito de ${dataBR(inst.vencimento).slice(0, 5)} não apareceu no extrato` : `Venceu ${d === -1 ? 'ontem' : 'há ' + (-d) + ' dias'}` };
    if (d === 0) return { s: 'hoje', d, txt: deb ? 'Cai hoje no débito automático' : 'Vence hoje' };
    if (d <= 5) return { s: 'proxima', d, txt: `${deb ? 'Cai' : 'Vence'} ${d === 1 ? 'amanhã' : 'em ' + d + ' dias'}` };
    return { s: 'futura', d, txt: `${deb ? 'Cai' : 'Vence'} dia ${dataBR(inst.vencimento).slice(0, 5)}` };
  }
  function montar(fa, fx) {
    const i = { id: fa.id, fixaId: fa.fixaId, fixa: fx || null, fatura: fa, virtual: false, ciclo: fa.ciclo || (fa.vencimento || '').slice(0, 7), vencimento: fa.vencimento, valor: Number(fa.valor) || 0, status: fa.status === 'paga' ? 'paga' : 'aberta', pagaEm: fa.pagaEm, pagaComo: fa.pagaComo, transacaoId: fa.transacaoId, linha: fa.linha || '', pix: fa.pix || '', pdf: fa.pdf || null, competencia: fa.competencia || '', estimado: false };
    i.sit = situacao(i); return i;
  }
  function virtual(fx, ym, D) {
    if (fx.fornecedor && !(fx.dia > 0)) return null; // conta da Cemig/Copasa/Claro ainda sem histórico: espera a primeira
    if (fx.fornecedor && D) { // só prevê as próximas, depois da última conta que chegou
      const ult = lista(D, 'faturas').filter(fa => fa.fixaId === fx.id).map(fa => fa.ciclo || '').sort().pop();
      if (!ult || ym <= ult) return null;
    }
    const i = { id: idFatura(fx.id, ym), fixaId: fx.id, fixa: fx, fatura: null, virtual: true, ciclo: ym, vencimento: diaNoMes(ym, fx.dia || 10), valor: Number(fx.valor) || 0, status: 'aberta', linha: '', pix: '', pdf: null, estimado: !!(fx.variavel || fx.fornecedor), aguardando: !!fx.fornecedor };
    i.sit = situacao(i); return i;
  }
  // tudo que vence no mês (contas que chegaram + previstas das contas cadastradas)
  function instancias(D, ym = hoje().slice(0, 7), { todas = false } = {}) {
    const fixas = lista(D, 'fixas'), out = [];
    const reais = lista(D, 'faturas').filter(fa => (fa.vencimento || '').slice(0, 7) === ym);
    for (const fa of reais) { const fx = fixaDe(D, fa.fixaId); if (fx || fa.status === 'paga') out.push(montar(fa, fx)); }
    for (const fx of fixas) {
      if (!vale(fx, ym) || reais.some(fa => fa.fixaId === fx.id)) continue;
      const v = virtual(fx, ym, D); if (!v) continue;
      // prevista para antes do dia em que a conta foi cadastrada: só aparece se o pagamento for achado
      if (!todas && fx.criadaEm && v.vencimento < fx.criadaEm.slice(0, 10)) continue;
      out.push(v);
    }
    return out.sort((a, b) => (a.vencimento || '').localeCompare(b.vencimento || '') || nomeFixa(a.fixa).localeCompare(nomeFixa(b.fixa)));
  }
  // em aberto de meses anteriores (reais) e previstas do mês passado que venceram há pouco
  function atrasadas(D, ym = hoje().slice(0, 7)) {
    const h = hoje(), out = [];
    for (const fa of lista(D, 'faturas')) if (fa.status !== 'paga' && fa.vencimento && fa.vencimento < ym + '-01') { const fx = fixaDe(D, fa.fixaId); if (fx && fx.ativa !== false) out.push(montar(fa, fx)); }
    const ant = mesAnterior(ym);
    for (const i of instancias(D, ant)) if (i.virtual && !i.aguardando && i.status !== 'paga' && ['boleto', 'pix', 'outro'].includes(i.fixa.forma) && difDias(i.vencimento, h) <= 10 && !out.some(o => o.id === i.id)) out.push(i);
    return out.sort((a, b) => a.vencimento.localeCompare(b.vencimento));
  }

  /* ---------- pagar / desfazer ---------- */
  function materializar(D, inst) {
    let fa = lista(D, 'faturas').find(x => x.id === inst.id);
    if (!fa) { fa = { id: inst.id, fixaId: inst.fixaId, ciclo: inst.ciclo, vencimento: inst.vencimento, valor: r2(inst.valor), status: 'aberta', origem: 'manual', achadaEm: new Date().toISOString() }; D.faturas.push(fa); }
    return fa;
  }
  function marcarPaga(D, inst, { data = hoje(), transacaoId = null, como = 'manual', valor = null } = {}) {
    const fa = materializar(D, inst);
    fa.status = 'paga'; fa.pagaEm = data; fa.pagaComo = como;
    if (transacaoId) fa.transacaoId = transacaoId; else delete fa.transacaoId;
    if (valor != null && valor > 0) fa.valor = r2(valor);
    if (como === 'manual') fa.travada = true; else delete fa.travada;
    return fa;
  }
  function desmarcar(D, inst) {
    const fa = materializar(D, inst);
    if (fa.transacaoId) fa.ignorarTx = [...new Set([...(fa.ignorarTx || []), fa.transacaoId])];
    fa.status = 'aberta'; delete fa.pagaEm; delete fa.pagaComo; delete fa.transacaoId; fa.travada = true;
    return fa;
  }

  /* ---------- reconhecer o pagamento no extrato ---------- */
  const PARADAS = new Set(['CONTA', 'CONTAS', 'PLANO', 'MENSAL', 'MENSALIDADE', 'PAGAMENTO', 'ASSINATURA', 'SERVICO', 'SERVICOS', 'FATURA', 'BOLETO', 'TAXA', 'CASA', 'APTO', 'MINHA', 'MEU', 'PARA', 'COM', 'DEBITO', 'AUTOMATICO', 'CARTAO']);
  function chavesFixa(fx) {
    if (fx.palavra) return norm(fx.palavra).split(/[,;/]+/).map(s => s.trim()).filter(s => s.length >= 3);
    return norm(fx.nome).split(/[^A-Z0-9]+/).filter(w => w.length >= 4 && !PARADAS.has(w));
  }
  function casaNome(fx, desc) {
    const d = norm(desc), dj = d.replace(/[^A-Z0-9]/g, '');
    if (fx.fornecedor && FORNECEDORES[fx.fornecedor].re.test(d)) return true;
    return chavesFixa(fx).some(k => d.includes(k) || dj.includes(k.replace(/[^A-Z0-9]/g, '')));
  }
  const PAREC_PAGTO = /PAGAMENTO|PAGTO|BOLETO|CONVENIO|CONCESSIONARIA|CONTA DE|FATURA|DEBITO AUT|DEB AUT|DEB\.? AUTOM/;
  function casarPagamentos(D, h = hoje()) {
    const ym = h.slice(0, 7), mudou = [];
    const usados = new Set(lista(D, 'faturas').map(f => f.transacaoId).filter(Boolean));
    // contas que chegaram (qualquer vencimento: muita gente paga assim que a conta sai) + previstas por perto
    const reais = lista(D, 'faturas').filter(fa => fa.status !== 'paga' && !fa.travada && fa.vencimento).map(fa => montar(fa, fixaDe(D, fa.fixaId))).filter(i => i.fixa && i.fixa.ativa !== false);
    const previstas = [mesAnterior(ym), ym, mesSeguinte(ym)].flatMap(m => instancias(D, m, { todas: true })).filter(i => i.virtual && i.vencimento <= addDias(h, 10));
    const alvos = [...reais, ...previstas]
      .filter((i, k, arr) => i.status !== 'paga' && !(i.fatura && i.fatura.travada) && i.fixa && arr.findIndex(o => o.id === i.id) === k)
      .sort((a, b) => a.vencimento.localeCompare(b.vencimento));
    const saidas = (D.transacoes || []).filter(t => t.tipo === 'saida' && !t._estornada && !t.ignorar);
    for (const a of alvos) {
      const fx = a.fixa, real = !a.virtual;
      const de = addDias(a.vencimento, real ? -25 : -12), ate = addDias(a.vencimento, real ? 20 : 12);
      const ign = new Set((a.fatura && a.fatura.ignorarTx) || []);
      let melhor = null, nota = 0;
      for (const t of saidas) {
        if (t.data < de || t.data > ate || usados.has(t.id) || ign.has(t.id)) continue;
        const nome = casaNome(fx, t.descricao), d = norm(t.descricao);
        const exato = a.valor > 0 && Math.abs(cents(t.valor) - cents(a.valor)) <= Math.max(5, Math.round(cents(a.valor) * 0.005));
        const perto = a.valor > 0 && Math.abs(t.valor - a.valor) <= a.valor * 0.4;
        let n = 0;
        if (nome && exato) n = 3;
        else if (nome && (fx.variavel || !a.valor) && (perto || !a.valor) && !a.aguardando) n = 2;
        else if (nome && a.aguardando && a.virtual) n = 0; // conta automática que ainda nem chegou: espera a conta de verdade
        else if (!nome && exato && real && PAREC_PAGTO.test(d)) n = 1;
        if (n && (n > nota || (n === nota && Math.abs(difDias(t.data, a.vencimento)) < Math.abs(difDias(melhor.data, a.vencimento))))) { melhor = t; nota = n; }
      }
      if (melhor) {
        marcarPaga(D, a, { data: melhor.data, transacaoId: melhor.id, como: 'extrato', valor: fx.variavel && a.virtual ? melhor.valor : null });
        usados.add(melhor.id); mudou.push(a.id);
      }
    }
    return mudou;
  }

  /* ---------- conta que chegou (site da empresa ou PDF) ---------- */
  function registrar(D, d) {
    const fx = d.fixaId ? fixaDe(D, d.fixaId) : d.fornecedor ? garantirFixa(D, d.fornecedor) : null;
    if (!fx) return { erro: 'Não sei de qual conta é esse PDF.' };
    let venc = d.vencimento && /^\d{4}-\d{2}-\d{2}$/.test(d.vencimento) ? d.vencimento : null;
    if (!venc && d.competencia) venc = diaNoMes(mesSeguinte(d.competencia), fx.dia || 10);
    if (!venc) return { erro: 'Não achei o vencimento nesse PDF.', fixa: fx };
    const ciclo = venc.slice(0, 7), fs = lista(D, 'faturas');
    let fa = (d.linha && fs.find(x => x.fixaId === fx.id && x.linha === d.linha))
      || fs.find(x => x.fixaId === fx.id && x.vencimento === venc)
      || fs.find(x => x.fixaId === fx.id && x.ciclo === ciclo && (!d.competencia || !x.competencia || x.competencia === d.competencia) && (!d.linha || !x.linha));
    const nova = !fa;
    if (!fa) {
      let id = idFatura(fx.id, ciclo), n = 2; while (fs.some(x => x.id === id)) id = `${idFatura(fx.id, ciclo)}-${n++}`;
      fa = { id, fixaId: fx.id, ciclo, status: 'aberta', achadaEm: new Date().toISOString() }; fs.push(fa);
    }
    fa.vencimento = venc; fa.ciclo = ciclo; fa.origem = d.origem || fa.origem || 'pdf';
    if (d.valor != null && d.valor > 0) fa.valor = r2(d.valor);
    if (d.competencia) fa.competencia = d.competencia;
    if (d.linha) fa.linha = so(d.linha);
    if (d.pix) fa.pix = d.pix;
    if (d.pdf) fa.pdf = d.pdf;
    if (d.status === 'paga' && fa.status !== 'paga') { fa.status = 'paga'; fa.pagaEm = d.pagaEm || hoje(); fa.pagaComo = 'site'; }
    if (fa.valor && (fx.fornecedor || fx.variavel)) fx.valor = fa.valor;
    if (fx.fornecedor || !fx.dia) fx.dia = Number(venc.slice(8));
    return { fatura: fa, fixa: fx, nova };
  }
  // a empresa mostrou a lista completa de contas em aberto: as que sumiram de lá foram pagas
  function baixarAusentes(D, forn, presentes, h = hoje()) {
    const fx = fixaDe(D, idFixaForn(forn)); if (!fx) return [];
    const ok = new Set(presentes.map(p => p.linha ? so(p.linha) : p.vencimento));
    const out = [];
    for (const fa of lista(D, 'faturas')) {
      if (fa.fixaId !== fx.id || fa.status === 'paga' || fa.travada) continue;
      if (ok.has(fa.linha) || ok.has(fa.vencimento)) continue;
      if (fa.achadaEm && difDias(fa.achadaEm.slice(0, 10), h) < 1 && !presentes.length) continue;
      fa.status = 'paga'; fa.pagaEm = fa.pagaEm || h; fa.pagaComo = 'site'; out.push(fa.id);
    }
    return out;
  }
  function apagarFixa(D, id) {
    const fas = lista(D, 'faturas').filter(f => f.fixaId === id);
    D.fixas = lista(D, 'fixas').filter(f => f.id !== id);
    D.faturas = lista(D, 'faturas').filter(f => f.fixaId !== id);
    return fas.filter(f => f.pdf).map(f => f.pdf.arq);
  }

  /* ---------- resumo, alertas e sugestões ---------- */
  function resumo(D, ym = hoje().slice(0, 7)) {
    const its = instancias(D, ym), atr = atrasadas(D, ym);
    const total = r2(its.reduce((s, i) => s + i.valor, 0)), pago = r2(its.filter(i => i.status === 'paga').reduce((s, i) => s + i.valor, 0));
    const abertas = its.filter(i => i.status !== 'paga');
    const proxima = abertas.filter(i => !i.aguardando && i.sit.s !== 'vencida').sort((a, b) => a.vencimento.localeCompare(b.vencimento))[0] || null;
    const estimado = its.some(i => i.estimado && i.status !== 'paga');
    return { its, atrasadas: atr, total, pago, falta: r2(total - pago), abertas, proxima, estimado, nVencidas: atr.length + abertas.filter(i => i.sit.s === 'vencida').length };
  }
  function alertas(D, h = hoje()) {
    const ym = h.slice(0, 7), out = [];
    const its = [...atrasadas(D, ym), ...instancias(D, ym), ...instancias(D, mesSeguinte(ym)).filter(i => i.vencimento <= addDias(h, 5))];
    const vistos = new Set();
    for (const i of its) {
      if (vistos.has(i.id) || i.status === 'paga' || i.aguardando || !i.fixa) continue; vistos.add(i.id);
      const nome = nomeFixa(i.fixa), d = difDias(h, i.vencimento), forma = i.fixa.forma;
      if (d < 0) {
        out.push({ nivel: forma === 'debito' || forma === 'cartao' ? 'medio' : 'alto', id: 'cv-' + i.id, ir: 'contas', titulo: `${nome}: ${forma === 'debito' ? 'débito não apareceu' : 'venceu ' + (d === -1 ? 'ontem' : 'há ' + (-d) + ' dias')}`, texto: forma === 'debito' ? `Era para cair ${dinheiro(i.valor)} em ${dataBR(i.vencimento)}. Confira no banco se o débito automático passou.` : `${dinheiro(i.valor)}. Se você já pagou, marque como paga na aba Contas.` });
      } else if (d <= 3 && forma !== 'debito' && forma !== 'cartao') {
        out.push({ nivel: 'medio', id: 'cp-' + i.id, ir: 'contas', titulo: `${nome} vence ${d === 0 ? 'hoje' : d === 1 ? 'amanhã' : 'em ' + d + ' dias'}`, texto: `${dinheiro(i.valor)}${i.linha || i.pix ? '. O código de barras e o Pix estão na aba Contas, prontos pra copiar.' : '.'}` });
      } else if (d <= 3 && forma === 'debito' && i.fixa.banco) {
        const cc = (D.contas || []).find(c => c.banco === i.fixa.banco && c.tipo === 'corrente');
        if (cc && cc.saldo < i.valor) out.push({ nivel: 'alto', id: 'cs-' + i.id, ir: 'contas', titulo: `Saldo do ${cc.banco} não cobre o débito de ${nome}`, texto: `Cai ${dinheiro(i.valor)} ${d === 0 ? 'hoje' : d === 1 ? 'amanhã' : 'em ' + d + ' dias'} no débito automático e hoje tem ${dinheiro(cc.saldo)} lá.` });
      }
    }
    for (const fx of lista(D, 'fixas')) {
      if (!fx.fornecedor || fx.ativa === false || !fx.busca || !fx.busca.ligada) continue;
      if (fx.busca.estado === 'entrar') out.push({ nivel: 'baixo', id: 'ce-' + fx.fornecedor, ir: 'contas', titulo: `${FORNECEDORES[fx.fornecedor].nome} pediu para você entrar de novo`, texto: 'Sem isso o Jarvis não consegue buscar a próxima conta. Abra a aba Contas no computador e toque em Entrar.' });
    }
    return out;
  }
  function sugestoes(D) {
    const fixas = lista(D, 'fixas'), ign = new Set(F.perfil(D).sugestoesIgnoradas || []);
    return F.contasFixas(D).filter(s => F.grupoDe(s.categoria, D) === 'fixo' && !ign.has(s.chave) && !fixas.some(fx => casaNome(fx, s.chave)))
      .map(s => {
        const forn = Object.values(FORNECEDORES).find(p => p.re.test(s.chave));
        return { chave: s.chave, nome: s.nome, valor: s.ultimo, dia: s.dia, categoria: s.categoria, forma: s.categoria === 'assinaturas' ? 'cartao' : 'boleto', fornecedor: forn ? forn.id : null, porMes: s.porMes };
      }).slice(0, 8);
  }
  // visão "agora": o que está para pagar nos próximos ~30 dias (mesmo que vença no mês que vem) e o que já foi pago neste mês
  function painel(D, h = hoje(), dias = 35) {
    const ym = h.slice(0, 7), lim = addDias(h, dias), ini = ym + '-01';
    const vistos = new Set(), todas = [];
    for (const m of [mesAnterior(ym), ym, mesSeguinte(ym), mesSeguinte(mesSeguinte(ym))]) for (const i of instancias(D, m)) if (!vistos.has(i.id)) { vistos.add(i.id); todas.push(i); }
    const atr = atrasadas(D, ym).filter(i => !vistos.has(i.id) || true);
    const atrIds = new Set(atr.map(i => i.id));
    const aPagar = todas.filter(i => i.status !== 'paga' && !atrIds.has(i.id) && i.vencimento >= ini && i.vencimento <= lim);
    const pagas = todas.filter(i => i.status === 'paga' && ((i.pagaEm || '').slice(0, 7) === ym || (i.vencimento || '').slice(0, 7) === ym));
    const soma = l => r2(l.reduce((s, i) => s + (i.valor || 0), 0));
    const abertasTodas = [...atr, ...aPagar];
    const proxima = abertasTodas.filter(i => !i.aguardando && i.sit.s !== 'vencida').sort((a, b) => a.vencimento.localeCompare(b.vencimento))[0] || null;
    return { atrasadas: atr, aPagar, pagas, falta: soma(abertasTodas.filter(i => !i.aguardando)), previsto: soma(aPagar.filter(i => i.aguardando)), pago: soma(pagas), proxima, estimado: aPagar.some(i => i.estimado), limite: lim, nVencidas: abertasTodas.filter(i => i.sit.s === 'vencida').length };
  }

  const API = {
    FORNECEDORES, ORDEM_FORN, FORMAS, FORMAS_CURTAS,
    mod10, mod11a, mod11b, lerCodigo, formatarLinha, acharCodigos, crc16, lerPix, acharPix, analisarTexto,
    carregar, pdfjs, abrirPdf, textoDoPdf, lerPdf, renderizar,
    fixaDe, idFixaForn, idFatura, diaNoMes, nomeFixa, icFixa, novaFixa, garantirFixa, vale, situacao, instancias, atrasadas,
    materializar, marcarPaga, desmarcar, chavesFixa, casaNome, casarPagamentos, registrar, baixarAusentes, apagarFixa,
    resumo, painel, alertas, sugestoes,
  };
  G.Contas = API;
  if (typeof module !== 'undefined') module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
