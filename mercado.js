/* Jarvis Finance — Mercado inteligente.
   Lista de compras, preços por mercado (encartes, lojas online, notas fiscais e preços anotados) e a comparação
   que diz onde comprar no dia: em quantos itens cada mercado ganha, o total nos itens em comum e se vale dividir. */
(function (G) {
  'use strict';
  const F = G.Finn;
  const Mm = () => G.Memoria;
  const tirar = s => String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '');
  const r2 = n => Math.round((+n || 0) * 100) / 100;
  const hoje = () => F.hoje();
  const dia = iso => String(iso || '').slice(0, 10);
  const idade = (iso, ref = hoje()) => F.difDias(dia(iso), ref); // dias entre a observação e a data de referência

  /* ---------- redes de Belo Horizonte e região ---------- */
  const REDES = [
    { id: 'bh', nome: 'Supermercados BH', curto: 'BH', cor: '#d6202a', re: /supermercados?\s*bh\b|\bsuper\s*bh\b|\brede bh\b/i, razao: /SUPERMERCADOS BH/i, encarte: 'https://www.supermercadosbh.com.br/' },
    { id: 'epa', nome: 'Epa', curto: 'Epa', cor: '#c2185b', re: /\bepa\b/i, razao: /DMA DISTRIBUIDORA|\bEPA\b/i },
    { id: 'supernosso', nome: 'Supernosso', curto: 'Supernosso', cor: '#e4572e', re: /super\s*nosso/i, razao: /SUPER ?NOSSO/i },
    { id: 'verdemar', nome: 'Verdemar', curto: 'Verdemar', cor: '#2e7d32', re: /verde\s*mar/i, razao: /VERDEMAR/i },
    { id: 'apoio', nome: 'Apoio Mineiro', curto: 'Apoio', cor: '#ef7d00', re: /apoio\s*mineiro/i, razao: /APOIO MINEIRO/i },
    { id: 'mart', nome: 'Mart Minas', curto: 'Mart Minas', cor: '#c99700', re: /mart\s*minas/i, razao: /MART MINAS/i },
    { id: 'carrefour', nome: 'Carrefour', curto: 'Carrefour', cor: '#1d4fa0', re: /carrefour/i, razao: /CARREFOUR/i, site: 'https://mercado.carrefour.com.br' },
    { id: 'assai', nome: 'Assaí', curto: 'Assaí', cor: '#b71c1c', re: /assa[ií]/i, razao: /SENDAS|ASSAI/i },
    { id: 'atacadao', nome: 'Atacadão', curto: 'Atacadão', cor: '#e65100', re: /atacad[aã]o/i, razao: /ATACADAO/i },
    { id: 'abc', nome: 'Supermercados ABC', curto: 'ABC', cor: '#8e24aa', re: /supermercados?\s*abc\b/i, razao: /SUPERMERCADOS ABC|\bABC\b.*SUPERMERC/i },
    { id: 'mineirao', nome: 'Mineirão Atacarejo', curto: 'Mineirão', cor: '#00796b', re: /mineir[aã]o\s*atacarejo|\bmineir[aã]o\b/i, razao: /MINEIRAO/i },
    { id: 'dom', nome: 'DOM Atacadista', curto: 'DOM', cor: '#5e35b1', re: /\bdom\s*atacad/i, razao: /DOM ATACAD/i },
  ];
  const REDE = Object.fromEntries(REDES.map(r => [r.id, r]));
  function redeDe(txt) {
    const t = tirar(txt);
    if (!t.trim()) return null;
    const r = REDES.find(x => x.re.test(t) || x.re.test(String(txt)));
    return r ? r.id : null;
  }
  function redeDaRazao(txt) { const t = tirar(txt).toUpperCase(); const r = REDES.find(x => x.razao.test(t)); return r ? r.id : redeDe(txt); }
  const slug = s => tirar(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30) || 'mercado';

  /* ---------- configuração: meus mercados e perfil ---------- */
  const PADRAO = { cep: '', bairro: '', cidade: '', lat: null, lon: null, raio: 3000, orcamento: null, dividirMin: 10, modo: 'loja', avisar: true, hora: '08:00', vespera: true, ultimaAtualizacao: null };
  // só lê: no iPhone, mexer no perfil antes da primeira sincronização apagaria o que veio do PC
  function cfg(D) { const p = (D.perfil || []).find(x => x.id === 'perfil') || {}; return Object.assign({}, PADRAO, p.mercado || {}); }
  function salvarCfg(D, mud) { const p = F.perfil(D); p.mercado = Object.assign({}, p.mercado || {}, mud); return cfg(D); }
  function meusMercados(D) { return (D.mercados || []).filter(m => m.ativo !== false).sort((a, b) => (a.ordem ?? 99) - (b.ordem ?? 99) || (a.dist ?? 9e9) - (b.dist ?? 9e9)); }
  function info(D, rede) {
    const m = (D.mercados || []).find(x => x.rede === rede) || {};
    const r = REDE[rede] || {};
    const nome = m.nome || r.nome || rede;
    return { id: rede, nome, curto: m.curto || r.curto || nome.split(/\s+/)[0], cor: m.cor || r.cor || '#6e6e73', encarte: m.encarte !== undefined ? m.encarte : (r.encarte || ''), site: m.site !== undefined ? m.site : (r.site || ''), busca: m.busca || '', lojas: m.lojas || [], dist: m.dist ?? null, cfg: m };
  }
  function adicionarMercado(D, { rede, nome, lojas, dist } = {}) {
    D.mercados = D.mercados || [];
    if (!rede && nome) rede = redeDe(nome) || 'x-' + slug(nome);
    if (!rede) return null;
    let m = D.mercados.find(x => x.rede === rede);
    const r = REDE[rede] || {};
    if (!m) { m = { id: 'mk-' + rede, rede, nome: nome && !REDE[rede] ? nome : (r.nome || nome || rede), ativo: true, ordem: D.mercados.length, criado: new Date().toISOString() }; D.mercados.push(m); }
    m.ativo = true;
    if (lojas && lojas.length) m.lojas = lojas.slice(0, 5);
    if (dist != null) m.dist = dist;
    if (m.encarte === undefined && r.encarte) m.encarte = r.encarte;
    if (m.site === undefined && r.site) m.site = r.site;
    return m;
  }

  /* ---------- texto de produto: tokens, tamanho e preço por unidade ---------- */
  const STOP = new Set('de da do das dos e com sem em para p c o a os as ao tipo tp un und unid unidade unidades pct pacote pacotes cx caixa lata latas garrafa pet frasco pote sache saco kg g gr grs grama gramas ml l lt lts litro litros x leve pague oferta ofertas promocao promo cada so apenas novo nova kit emb embalagem refil bandeja'.split(' '));
  const SINON = { refri: 'refrigerante', refrig: 'refrigerante', hig: 'higienico', higien: 'higienico', choc: 'chocolate', marg: 'margarina', bisc: 'biscoito', choco: 'chocolate', achoc: 'achocolatado', deterg: 'detergente', amac: 'amaciante', sab: 'sabao', papel_hig: 'higienico', mac: 'macarrao', macarr: 'macarrao', feij: 'feijao', refin: 'refinado', integr: 'integral', desnat: 'desnatado', 'ph': 'higienico' };
  function raiz(w) {
    if (/oes$|aes$/.test(w) && w.length > 4) return w.slice(0, -3) + 'ao';
    if (/ns$/.test(w) && w.length > 4) return w.slice(0, -2) + 'm';
    if (w.length > 3 && /s$/.test(w) && !/(ss|us|is)$/.test(w)) return w.slice(0, -1);
    return w;
  }
  function toks(s) {
    return tirar(s).toLowerCase().replace(/(\d)[,.](\d)/g, '$1_$2').replace(/[^a-z0-9_]+/g, ' ').split(' ')
      .filter(w => w && !/^\d/.test(w) && !/^\d+_\d+/.test(w)).map(w => SINON[w] || w).map(raiz).filter(w => w.length > 1 && !STOP.has(w));
  }
  // palavras que mudam o produto: "doce de leite" não é leite, "detergente limão" não é limão
  const TRANSF = new Set('biscoito bolacha farinha doce molho extrato suco refresco tempero caldo iogurte sorvete bolo salgadinho chocolate bebida composto achocolatado gelatina mistura condensado creme integral essencia aroma sabor racao capsula cereal barra zero diet light polpa geleia pudim mousse pasta vinagre sabonete shampoo condicionador detergente amaciante desinfetante limpador sabao lava alvejante queijo pao macarrao tablete chiclete bala pirulito cobertura recheio recheado wafer cookie torrada snack chip pipoca petisco'.split(' '));
  const TRANSF_POR = { leite: ['po', 'coco', 'soja', 'aveia', 'fermentado', 'vegetal', 'amendoa', 'castanha', 'arroz'], cafe: ['soluvel', 'capsula', 'cappuccino', 'descafeinado', 'gelado'], ovo: ['pascoa', 'codorna'], arroz: ['parboilizado', 'arboreo', 'japones', 'cateto'], acucar: ['mascavo', 'demerara', 'confeiteiro'], oleo: ['coco', 'gergelim'], carne: ['seca', 'enlatada'], frango: ['empanado', 'nugget'] };
  const MEMO = new Map();
  function toksM(s) { let t = MEMO.get(s); if (!t) { t = toks(s); if (MEMO.size > 30000) MEMO.clear(); MEMO.set(s, t); } return t; }
  function chaveProduto(nome) { return toksM(nome).join(' '); }

  const re2 = (rx, s) => { const m = s.match(rx); return m; };
  function base(v, u) {
    u = String(u || '').toLowerCase();
    if (/^(kg|k|quilo)/.test(u)) return { qtd: r2(v * 1000), un: 'g' };
    if (/^(g|gr|grama)/.test(u)) return { qtd: r2(v), un: 'g' };
    if (/^ml/.test(u)) return { qtd: r2(v), un: 'ml' };
    if (/^(l|lt|litro)/.test(u)) return { qtd: r2(v * 1000), un: 'ml' };
    return { qtd: v, un: 'un' };
  }
  function tamanho(txt) {
    const t = ' ' + tirar(txt).toLowerCase().replace(/(\d),(\d)/g, '$1.$2') + ' ';
    const U = '(kg|quilos?|g|gr|grs|gramas?|ml|l|lt|lts|litros?)';
    let m = re2(new RegExp('(\\d+)\\s*x\\s*(\\d+(?:\\.\\d+)?)\\s*' + U + '(?![a-z])'), t);
    if (m) { const b = base(+m[2], m[3]); return { qtd: r2(b.qtd * +m[1]), un: b.un }; }
    m = re2(new RegExp('(\\d+(?:\\.\\d+)?)\\s*' + U + '(?![a-z])'), t);
    let q = m ? base(+m[1], m[2]) : null;
    if (!q && /(^|\s)(o\s+)?kg(?![a-z])|\bpor\s+kg\b|\/\s*kg\b/.test(t)) q = { qtd: 1000, un: 'g' };
    let n = null;
    let p = re2(/(?:c\/|com|leve|pack|fardo|cx|caixa|kit|bandeja)\s*(\d{1,3})(?:\s*(?:un|und|unid|unidades|rolos?|latas?|garrafas?|saches?|pacotes?|ovos?|caixas?|barras?))?(?![a-z0-9])/, t)
      || re2(/(?:^|\s)(\d{1,3})\s*(?:un|und|unid|unidades|rolos?|latas?|ovos?|saches?|pacotes?|caixinhas?|barras?|garrafas?)(?![a-z])/, t);
    if (p) n = +p[1];
    else if (/\bduzia\b/.test(t)) n = 12;
    if (q && q.un === 'g' && m && n && new RegExp('(\\d+)\\s*x').test(t)) n = null;
    if (n && n > 1) q = q ? { qtd: r2(q.qtd * n), un: q.un } : { qtd: n, un: 'un' };
    return q;
  }
  function fmtTam(t) {
    if (!t) return '';
    if (t.un === 'g') return t.qtd >= 1000 ? `${String(r2(t.qtd / 1000)).replace('.', ',')} kg` : `${Math.round(t.qtd)} g`;
    if (t.un === 'ml') return t.qtd >= 1000 ? `${String(r2(t.qtd / 1000)).replace('.', ',')} L` : `${Math.round(t.qtd)} ml`;
    return `${t.qtd} un`;
  }
  function unitario(preco, t) {
    if (!t || !t.qtd || !(preco > 0)) return null;
    if (t.un === 'un') return { v: r2(preco / t.qtd), por: 'un' };
    return { v: r2(preco / (t.qtd / 1000)), por: t.un === 'g' ? 'kg' : 'L' };
  }
  const fmtUnit = u => u ? `${F.dinheiro(u.v)}/${u.por}` : '';

  /* ---------- lista de compras ---------- */
  const cap = s => { s = String(s || '').trim(); return s ? s[0].toUpperCase() + s.slice(1) : s; };
  function lerItem(txt) {
    let s = String(txt || '').trim().replace(/\s+/g, ' ');
    if (!s) return null;
    let qtd = 1;
    const q = s.match(/^(\d{1,2})\s*(?:x\s+|un\s+|unidades?\s+)?(?=\D)/i);
    if (q && !/^\d+\s*(kg|g|gr|ml|l|lt|litros?|un\b|rolos?)\b/i.test(s)) { qtd = Math.max(1, Math.min(99, +q[1])); s = s.slice(q[0].length).trim(); }
    let tam = tamanho(s);
    if (!tam && qtd >= 6 && /^ovos?\b/i.test(s)) { tam = { qtd, un: 'un' }; qtd = 1; }
    let nome = s.replace(/(\d+\s*x\s*)?\d+(?:[.,]\d+)?\s*(kg|quilos?|g|gr|grs|gramas?|ml|l|lt|lts|litros?)(?![a-z])/gi, ' ')
      .replace(/\b(c\/|com|pack|fardo)\s*\d{1,3}\s*(un|und|unidades|rolos?|latas?)?\b/gi, ' ').replace(/\b\d{1,3}\s*(un|und|unid|unidades|rolos?|latas?|ovos?)\b/gi, m => /ovos?/i.test(m) ? 'ovos' : ' ')
      .replace(/\s{2,}/g, ' ').replace(/[\s,;-]+$/, '').trim();
    if (!nome) nome = s;
    return { nome: cap(nome), tam, qtd };
  }
  function novoItem({ nome, tam = null, qtd = 1, marca = '', fixo = true, cat = '' } = {}) {
    return { id: 'cp-' + F.uid(), nome: cap(String(nome || '').slice(0, 80)), tam: tam || null, qtd: Math.max(1, +qtd || 1), marca: String(marca || '').slice(0, 40), fixo: !!fixo, pular: false, cat, criado: new Date().toISOString() };
  }
  const itensAtivos = D => (D.compras || []).filter(i => !i.pular && !i.arquivado);
  const descItem = i => `${i.qtd > 1 ? i.qtd + '× ' : ''}${i.nome}${i.tam ? ' ' + fmtTam(i.tam) : ''}${i.marca ? ' (' + i.marca + ')' : ''}`;

  /* ---------- casamento item ↔ produto ---------- */
  function casar(item, produto, marcaProduto = '') {
    const ti = toks(item.nome);
    if (!ti.length) return 0;
    const tp = toksM(produto + ' ' + (marcaProduto || ''));
    const tn = toksM(produto);
    if (!tn.length) return 0;
    const chave = chaveProduto(produto);
    if ((item.rejeitados || []).includes(chave)) return 0;
    const main = ti[0];
    const pos = tn.indexOf(main);
    if (pos < 0) return 0;
    const mt = item.marca ? toks(item.marca) : [];
    const marcaOk = mt.length > 0 && mt.every(t => tp.includes(t));
    const folga = 1 + (marcaOk ? mt.length : 0) + (marcaProduto ? Math.min(2, toks(marcaProduto).length) : 0);
    if (pos > folga) return 0;
    for (const t of ti) if (!tp.includes(t)) return 0;
    const trans = TRANSF_POR[main] || [];
    for (const t of tn) if ((TRANSF.has(t) || trans.includes(t)) && !ti.includes(t) && !mt.includes(t)) return 0;
    let s = 0.6 + 0.4 * Math.min(1, ti.length / Math.min(tn.length, 4));
    if (mt.length) s += marcaOk ? 0.3 : -0.25;
    if ((item.aceitos || []).includes(chave)) s += 0.5;
    return Math.max(0.05, r2(s));
  }

  /* ---------- observações de preço ---------- */
  const FONTES = { encarte: 'Encarte', online: 'Site', nota: 'Sua nota', manual: 'Visto na loja', web: 'Web', pesquisa: 'Pesquisa' };
  function novaObs(o) {
    const produto = String(o.produto || '').replace(/\s+/g, ' ').trim().slice(0, 120);
    const preco = r2(o.preco);
    if (!produto || !(preco > 0) || preco > 5000) return null;
    let tam = o.tam || null;
    if (!tam) tam = o.porKg ? { qtd: 1000, un: 'g' } : tamanho(produto + ' ' + (o.tamanho || ''));
    const x = {
      id: 'pr-' + F.uid(), rede: o.rede, produto, marca: String(o.marca || '').slice(0, 40), chave: chaveProduto(produto), tam, preco,
      de: o.de > preco ? r2(o.de) : null, fonte: o.fonte || 'manual', data: o.data || new Date().toISOString(),
      validoDe: o.validoDe || null, validoAte: o.validoAte || null, condicao: String(o.condicao || '').slice(0, 60), ref: o.ref || null, loja: String(o.loja || '').slice(0, 80),
    };
    if (o.qtdComprada) x.qtdComprada = +o.qtdComprada;
    if (o.url && /^https:\/\//.test(o.url)) x.url = String(o.url).slice(0, 300);
    return x;
  }
  // preços avulsos (anotados por você ou achados na web); encartes, notas e sites guardam os seus dentro do próprio registro
  function addObs(D, lista) {
    D.precos = D.precos || [];
    let n = 0;
    for (const o of lista) {
      if (!o) continue;
      const dup = D.precos.find(p => p.fonte === o.fonte && p.rede === o.rede && p.chave === o.chave && p.preco === o.preco && (p.validoAte || '') === (o.validoAte || ''));
      if (dup) { dup.data = o.data; continue; }
      D.precos.push(o); n++;
    }
    return n;
  }
  const enxuto = o => { const x = { produto: o.produto, chave: o.chave, tam: o.tam, preco: o.preco }; if (o.marca) x.marca = o.marca; if (o.de) x.de = o.de; if (o.condicao) x.condicao = o.condicao; if (o.url) x.url = o.url; return x; };
  function aplicarSite(D, rede, lista) {
    D.precosSite = D.precosSite || [];
    let r = D.precosSite.find(x => x.rede === rede);
    if (!r) { r = { id: 'ps-' + rede, rede }; D.precosSite.push(r); }
    r.lidoEm = new Date().toISOString();
    const vistos = new Set();
    r.itens = lista.filter(Boolean).filter(o => { const k = o.chave + '|' + fmtTam(o.tam) + '|' + o.preco; if (vistos.has(k)) return false; vistos.add(k); return true; }).slice(0, 400).map(enxuto);
    return r.itens.length;
  }
  // todas as observações de preço, de todas as fontes, num formato só
  function obsDe(D) {
    const out = [];
    for (const e of D.encartes || []) (e.ofertas || []).forEach((o, k) => out.push({ ...o, id: e.id + ':' + k, rede: e.rede, fonte: e.fonte || 'encarte', data: e.lidoEm, validoDe: e.validoDe || null, validoAte: e.validoAte || null, ref: e.id }));
    for (const n of D.notasFiscais || []) if (n.rede) (n.itens || []).forEach((i, k) => out.push({ id: n.id + ':' + k, rede: n.rede, produto: i.nome, chave: i.chave || chaveProduto(i.nome), tam: i.tam !== undefined ? i.tam : (/^kg/i.test(i.un) ? { qtd: 1000, un: 'g' } : tamanho(i.nome)), preco: i.preco, fonte: 'nota', data: n.data, ref: n.id, qtdComprada: i.qtd, loja: n.emitente }));
    for (const s of D.precosSite || []) (s.itens || []).forEach((p, k) => out.push({ ...p, id: s.id + ':' + k, rede: s.rede, fonte: 'online', data: s.lidoEm, ref: s.id }));
    for (const p of D.precos || []) out.push(p);
    return out;
  }
  function podar(D, ref = hoje()) {
    let n = 0;
    const corta = (c, f) => { const l = D[c] || []; const novo = l.filter(f); if (novo.length !== l.length) { n += l.length - novo.length; D[c] = novo; } };
    corta('precos', p => (p.validoAte && F.difDias(p.validoAte, ref) <= 15) || idade(p.data, ref) <= 60);
    corta('encartes', e => !e.validoAte || F.difDias(e.validoAte, ref) <= 30);
    corta('precosSite', s => idade(s.lidoEm, ref) <= 30);
    corta('notasFiscais', x => idade(x.data, ref) <= 200);
    if ((D.notasFiscais || []).length > 80) { D.notasFiscais = D.notasFiscais.sort((a, b) => String(b.data).localeCompare(String(a.data))).slice(0, 80); n++; }
    if ((D.encartes || []).length > 40) { D.encartes = D.encartes.sort((a, b) => String(b.lidoEm).localeCompare(String(a.lidoEm))).slice(0, 40); n++; }
    corta('pedidosMercado', p => p.status === 'novo' || idade(p.criado, ref) <= 7);
    corta('idas', i => i.status === 'feita' ? idade(i.feitaEm || i.data, ref) <= 60 : i.data >= F.addDias(ref, -7));
    return n;
  }

  // vale para a data da compra? nível 0 = mais confiável para quem vai na loja
  function situacao(o, data, modo = 'loja') {
    const d = dia(o.data), hj = hoje();
    if (o.fonte === 'encarte' || o.fonte === 'web') {
      if (o.validoAte && data > o.validoAte) return null;
      if (o.validoDe && data < o.validoDe) return null;
      if (!o.validoAte && F.difDias(d, data) > 7) return null;
      return { nivel: modo === 'online' ? 1 : 0, conf: o.fonte === 'web' ? 'media' : 'alta', quando: o.validoAte ? `até ${F.dataBR(o.validoAte).slice(0, 5)}` : 'esta semana' };
    }
    if (o.fonte === 'online') {
      const a = F.difDias(d, hj);
      if (a > 10) return null;
      return { nivel: a <= 3 ? (modo === 'online' ? 0 : 1) : 2, conf: a <= 1 ? 'alta' : 'media', quando: a === 0 ? 'site hoje' : `site há ${a} dia${a > 1 ? 's' : ''}` };
    }
    if (o.fonte === 'nota' || o.fonte === 'manual') {
      const a = F.difDias(d, hj); const lim = o.fonte === 'nota' ? 60 : 45;
      if (a > lim) return null;
      return { nivel: a <= 14 ? 0 : 2, conf: a <= 7 ? 'alta' : a <= 30 ? 'media' : 'baixa', quando: a === 0 ? 'hoje' : a === 1 ? 'ontem' : `há ${a} dias` };
    }
    if (o.fonte === 'pesquisa') { const a = F.difDias(d, hj); return a <= 45 ? { nivel: 3, conf: 'baixa', quando: `pesquisa de ${F.dataBR(d).slice(0, 5)}` } : null; }
    return null;
  }
  function custoPara(item, o, tamRef) {
    const it = item.tam || tamRef || null, ot = o.tam, q = item.qtd || 1;
    if (it && ot) {
      if (it.un !== ot.un) return null;
      const razao = ot.qtd / it.qtd;
      return { custo: r2(o.preco / ot.qtd * it.qtd * q), unit: unitario(o.preco, ot), difTam: razao < 0.8 || razao > 1.25, leve: razao < 0.8 ? Math.ceil(it.qtd / ot.qtd) * q : null };
    }
    if (item.tam && !ot) return { custo: r2(o.preco * q), unit: null, difTam: false, semTam: true };
    return { custo: r2(o.preco * q), unit: ot ? unitario(o.preco, ot) : null, difTam: false };
  }
  function porRedeDe(D) { const g = new Map(); for (const o of obsDe(D)) { if (!g.has(o.rede)) g.set(o.rede, []); g.get(o.rede).push(o); } return g; }
  function candidatos(D, item, rede, { data = hoje(), modo = 'loja', tamRef = null, grupos = null } = {}) {
    const out = [];
    for (const o of (grupos || porRedeDe(D)).get(rede) || []) {
      const s = casar(item, o.produto, o.marca); if (!s) continue;
      const st = situacao(o, data, modo); if (!st) continue;
      const c = custoPara(item, o, tamRef); if (!c) continue;
      out.push({ o, s, ...st, ...c });
    }
    const mt = item.marca ? 1 : 0;
    out.sort((a, b) => a.nivel - b.nivel || (mt ? (b.s >= 0.9) - (a.s >= 0.9) : 0) || a.custo - b.custo || b.s - a.s);
    return out;
  }

  /* ---------- comparação ---------- */
  function comparar(D, { data = hoje(), redes = null, itens = null, modo = null } = {}) {
    const c = cfg(D); modo = modo || c.modo || 'loja';
    const lista = itens || itensAtivos(D);
    redes = (redes && redes.length ? redes : meusMercados(D).map(m => m.rede)).filter((r, i, a) => a.indexOf(r) === i);
    const grupos = porRedeDe(D);
    const linhas = lista.map(item => {
      let por = {}, alt = {};
      const pegar = tamRef => { por = {}; alt = {}; for (const r of redes) { const cs = candidatos(D, item, r, { data, modo, tamRef, grupos }); if (cs.length) { por[r] = cs[0]; alt[r] = cs.slice(1, 4); } } };
      pegar(null);
      let tamRef = null;
      if (!item.tam) { // sem tamanho na lista: compara pelo tamanho mais comum entre os mercados
        const ts = Object.values(por).map(x => x.o.tam).filter(Boolean);
        if (ts.length >= 2) { const cont = {}; for (const t of ts) { const k = t.un + ':' + t.qtd; cont[k] = (cont[k] || 0) + 1; } const k = Object.entries(cont).sort((a, b) => b[1] - a[1])[0][0]; const [un, q] = k.split(':'); tamRef = { un, qtd: +q }; pegar(tamRef); }
      }
      const vals = Object.entries(por).map(([r, x]) => [r, x.custo]).sort((a, b) => a[1] - b[1]);
      const melhor = vals.length >= 2 ? vals[0][0] : null;
      const empate = vals.length >= 2 && vals[1][1] - vals[0][1] < 0.01;
      const dif = vals.length >= 2 ? r2(vals[vals.length - 1][1] - vals[0][1]) : 0;
      return { item, por, alt, melhor, empate, dif, tamRef };
    });
    const porRede = redes.map(r => {
      const ls = linhas.filter(l => l.por[r]);
      return { rede: r, cobertos: ls.length, total: r2(ls.reduce((s, l) => s + l.por[r].custo, 0)), vence: linhas.filter(l => l.melhor === r && !l.empate).length };
    });
    const ativas = porRede.filter(p => p.cobertos > 0).map(p => p.rede);
    const cob = r => porRede.find(p => p.rede === r).cobertos;
    // mercados com poucos preços não podem puxar a comparação para baixo: compara os que cobrem boa parte da lista
    const maxCob = Math.max(0, ...porRede.map(p => p.cobertos));
    const principais = ativas.filter(r => cob(r) >= Math.max(3, Math.ceil(maxCob * 0.5)));
    const grupo = principais.length >= 2 ? principais : ativas;
    const comunsL = grupo.length >= 2 ? linhas.filter(l => grupo.every(r => l.por[r])) : [];
    const totaisComuns = Object.fromEntries(grupo.map(r => [r, r2(comunsL.reduce((s, l) => s + l.por[r].custo, 0))]));
    const venceComuns = Object.fromEntries(grupo.map(r => [r, comunsL.filter(l => { const vs = grupo.map(x => l.por[x].custo), mn = Math.min(...vs); return l.por[r].custo - mn < 0.01 && vs.filter(v => v - mn < 0.01).length === 1; }).length]));
    const poucos = ativas.filter(r => !grupo.includes(r));
    // pares (quando são 3 ou mais mercados, cada par tem seus itens em comum)
    const pares = [];
    for (let i = 0; i < ativas.length; i++) for (let j = i + 1; j < ativas.length; j++) {
      const a = ativas[i], b = ativas[j], ls = linhas.filter(l => l.por[a] && l.por[b]);
      if (!ls.length) continue;
      const ta = r2(ls.reduce((s, l) => s + l.por[a].custo, 0)), tb = r2(ls.reduce((s, l) => s + l.por[b].custo, 0));
      pares.push({ a, b, itens: ls.length, ta, tb, melhor: ta <= tb ? a : b, dif: r2(Math.abs(ta - tb)) });
    }
    // o melhor mercado para ir
    let melhor = null, base = 'nenhum';
    if (ativas.length === 1) { melhor = ativas[0]; base = 'unico'; }
    else if (principais.length === 1) { melhor = principais[0]; base = 'cobertura'; }
    else if (ativas.length >= 2) {
      if (comunsL.length >= 3) { melhor = grupo.slice().sort((a, b) => totaisComuns[a] - totaisComuns[b])[0]; base = 'comuns'; }
      else {
        // poucos itens em comum: quem ganha mais confrontos diretos, depois quem vence mais itens e cobre mais
        const pontos = Object.fromEntries(ativas.map(r => [r, 0]));
        for (const p of pares) if (p.dif >= 0.01) pontos[p.melhor] += p.itens;
        const pr = r => porRede.find(x => x.rede === r);
        melhor = ativas.slice().sort((a, b) => pontos[b] - pontos[a] || pr(b).vence - pr(a).vence || pr(b).cobertos - pr(a).cobertos)[0];
        base = 'pares';
      }
    }
    const segundo = base === 'comuns' ? grupo.filter(r => r !== melhor).sort((a, b) => totaisComuns[a] - totaisComuns[b])[0] : null;
    const economia = segundo ? r2(totaisComuns[segundo] - totaisComuns[melhor]) : 0;
    const dividir = melhor ? melhorDivisao(linhas, ativas, melhor, c.dividirMin ?? 10) : null;
    const semPreco = linhas.filter(l => !Object.keys(l.por).length).map(l => l.item);
    const res = { data, modo, redes, linhas, porRede, ativas, grupo, poucos, comuns: comunsL.length, totaisComuns, venceComuns, pares, melhor, segundo, base, economia, dividir, semPreco, calculadoEm: new Date().toISOString() };
    res.avisos = avisosDe(res);
    res.texto = textoDe(D, res);
    return res;
  }
  function melhorDivisao(linhas, ativas, base, minimo) {
    let melhor = null;
    for (const b of ativas) {
      if (b === base) continue;
      const mover = linhas.filter(l => l.por[base] && l.por[b] && l.por[b].custo < l.por[base].custo - 0.01).map(l => ({ item: l.item, de: l.por[base].custo, para: l.por[b].custo, economia: r2(l.por[base].custo - l.por[b].custo) }));
      const economia = r2(mover.reduce((s, m) => s + m.economia, 0));
      const soLa = linhas.filter(l => !l.por[base] && l.por[b]).map(l => l.item);
      if (!melhor || economia > melhor.economia) melhor = { base, outra: b, economia, mover: mover.sort((x, y) => y.economia - x.economia), soLa };
    }
    return melhor && melhor.economia >= minimo && melhor.mover.length ? melhor : null;
  }
  function avisosDe(res) {
    const av = [];
    const esc = res.linhas.flatMap(l => Object.values(l.por));
    if (esc.some(x => x.o.fonte === 'online') && res.modo !== 'online') av.push('Preços de site podem ser diferentes na loja física.');
    const cond = esc.filter(x => x.o.condicao); if (cond.length) av.push(`${cond.length} oferta${cond.length > 1 ? 's pedem' : ' pede'} condição (app, clube ou quantidade mínima).`);
    const velhos = esc.filter(x => x.conf === 'baixa'); if (velhos.length) av.push(`${velhos.length} preço${velhos.length > 1 ? 's são' : ' é'} de mais de um mês e pode${velhos.length > 1 ? 'm' : ''} ter mudado.`);
    const dt = esc.filter(x => x.difTam); if (dt.length) av.push(`Em ${dt.length} ite${dt.length > 1 ? 'ns' : 'm'} o tamanho é diferente; comparei pelo preço por kg/L/unidade.`);
    return av;
  }
  const lista3 = arr => arr.length <= 1 ? arr.join('') : arr.slice(0, -1).join(', ') + ' e ' + arr[arr.length - 1];
  function quandoTxt(data) {
    const d = F.difDias(hoje(), data);
    if (d === 0) return 'hoje'; if (d === 1) return 'amanhã';
    if (d > 1 && d < 7) return new Date(data + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long' });
    return F.dataBR(data).slice(0, 5);
  }
  function textoDe(D, r) {
    const nome = id => info(D, id).nome, n = r.linhas.length;
    const partes = [];
    if (!r.ativas.length) return n ? 'Ainda não tenho preços desses mercados. Leia o encarte da semana, escaneie uma nota fiscal ou anote um preço.' : 'Sua lista está vazia.';
    const pr = id => r.porRede.find(p => p.rede === id);
    const q = quandoTxt(r.data), Q = q[0].toUpperCase() + q.slice(1);
    if (r.base === 'unico') {
      const p = pr(r.ativas[0]);
      partes.push(`Só tenho preços do **${nome(p.rede)}** (${p.cobertos} de ${n} itens, ${F.dinheiro(p.total)}). Leia o encarte de outro mercado para comparar.`);
    } else if (r.base === 'cobertura') {
      const p = pr(r.melhor);
      partes.push(`Só o **${nome(r.melhor)}** tem preço para boa parte da lista (${p.cobertos} de ${n} itens, ${F.dinheiro(p.total)}). Leia o encarte dos outros para comparar de verdade.`);
    } else if (r.base === 'comuns') {
      const dois = r.grupo.length === 2;
      partes.push(`${Q === 'Hoje' || Q === 'Amanhã' ? 'Para ' + q : 'Para ' + q}, o **${nome(r.melhor)}** sai melhor: mais barato em ${r.venceComuns[r.melhor]} dos ${r.comuns} itens que ${dois ? 'os dois têm' : 'todos têm'} e **${F.dinheiro(r.economia)} a menos** que o ${nome(r.segundo)} no total desses itens.`);
    } else {
      const p = r.pares.filter(x => x.a === r.melhor || x.b === r.melhor).sort((a, b) => b.itens - a.itens)[0];
      partes.push(`Para ${q}, o **${nome(r.melhor)}** parece melhor: mais barato em ${pr(r.melhor).vence} de ${n} itens${p ? `; nos ${p.itens} ite${p.itens > 1 ? 'ns' : 'm'} que ele e o ${nome(p.a === r.melhor ? p.b : p.a)} têm, sai ${F.dinheiro(p.dif)} ${p.melhor === r.melhor ? 'mais barato' : 'mais caro'}` : ''}. Eles têm poucos itens em comum; leia mais encartes para ter certeza.`);
    }
    if (r.poucos && r.poucos.length) partes.push(`${r.poucos.length === 1 ? 'Do ' + nome(r.poucos[0]) : 'Do ' + lista3(r.poucos.map(nome))} tenho poucos preços (${lista3(r.poucos.map(x => String(pr(x).cobertos)))}); leia o encarte para comparar melhor.`);
    if (r.dividir) {
      const nomes = r.dividir.mover.slice(0, 4).map(x => x.item.nome.toLowerCase());
      partes.push(`Se der para passar também no **${nome(r.dividir.outra)}**, leve lá ${lista3(nomes)}${r.dividir.mover.length > 4 ? ' e mais ' + (r.dividir.mover.length - 4) : ''} e economize mais **${F.dinheiro(r.dividir.economia)}**.`);
    }
    if (r.semPreco.length) partes.push(`Sem preço em nenhum mercado: ${lista3(r.semPreco.slice(0, 5).map(i => i.nome.toLowerCase()))}${r.semPreco.length > 5 ? ' e mais ' + (r.semPreco.length - 5) : ''}.`);
    return partes.join('\n\n');
  }
  // resumo curto (para o Hoje, a notificação e o agente)
  function frase(D, r) {
    if (!r || !r.ativas || !r.ativas.length) return 'Ainda sem preços para comparar.';
    const nome = id => info(D, id).nome;
    if (r.ativas.length === 1) return `Só há preços do ${nome(r.ativas[0])} por enquanto.`;
    if (r.base === 'cobertura') return `Só o ${nome(r.melhor)} tem preço para boa parte da lista.`;
    const m = r.porRede.find(p => p.rede === r.melhor);
    if (r.base === 'comuns') return `${nome(r.melhor)}: mais barato em ${r.venceComuns[r.melhor]} de ${r.comuns} itens, ${F.dinheiro(r.economia)} a menos que o ${nome(r.segundo)}${r.dividir ? `; dividindo com o ${nome(r.dividir.outra)}, mais ${F.dinheiro(r.dividir.economia)}` : ''}.`;
    return `${nome(r.melhor)}: mais barato em ${m.vence} de ${r.linhas.length} itens${r.dividir ? `; dividindo com o ${nome(r.dividir.outra)}, mais ${F.dinheiro(r.dividir.economia)}` : ''}.`;
  }
  // versão enxuta para guardar na ida (sincroniza com o iPhone)
  function resumoGuardado(D, r) {
    return {
      data: r.data, calculadoEm: r.calculadoEm, melhor: r.melhor, segundo: r.segundo, base: r.base, economia: r.economia, comuns: r.comuns, venceComuns: r.venceComuns, texto: r.texto, frase: frase(D, r), avisos: r.avisos,
      porRede: r.porRede, totaisComuns: r.totaisComuns, dividir: r.dividir ? { outra: r.dividir.outra, economia: r.dividir.economia, mover: r.dividir.mover.map(m => ({ item: m.item.nome, economia: m.economia })) } : null,
      semPreco: r.semPreco.map(i => i.nome), itens: r.linhas.length,
    };
  }

  /* ---------- compras planejadas (idas ao mercado) ---------- */
  function novaIda({ data = hoje(), redes = [] } = {}) { return { id: 'ida-' + F.uid(), data, redes: redes.slice(0, 6), status: 'planejada', criado: new Date().toISOString() }; }
  function proximaIda(D, ref = hoje()) { return (D.idas || []).filter(i => i.status !== 'feita' && i.data >= ref).sort((a, b) => a.data.localeCompare(b.data))[0] || null; }
  function concluirIda(D, id) {
    const ida = (D.idas || []).find(i => i.id === id); if (!ida) return false;
    ida.status = 'feita'; ida.feitaEm = new Date().toISOString();
    D.compras = (D.compras || []).filter(i => i.fixo);
    for (const i of D.compras) i.pular = false;
    return true;
  }

  /* ---------- gasto do mês, ritmo e alertas ---------- */
  function gastoMes(D, ym = hoje().slice(0, 7)) {
    const ts = (D.transacoes || []).filter(t => t.tipo === 'saida' && t.categoria === 'mercado' && String(t.data).startsWith(ym) && (!F.conta || F.conta(t)));
    const porRede = {};
    for (const t of ts) { const r = redeDe(t.descricao) || 'outros'; porRede[r] = r2((porRede[r] || 0) + Math.abs(t.valor)); }
    const gasto = r2(ts.reduce((s, t) => s + Math.abs(t.valor), 0));
    const o = (D.orcamentos || []).find(x => x.categoria === 'mercado');
    const orc = o ? +o.valor || +o.limite || null : (cfg(D).orcamento || null);
    return { gasto, orcamento: orc, porRede: Object.entries(porRede).sort((a, b) => b[1] - a[1]).map(([rede, valor]) => ({ rede, valor })), compras: ts.length };
  }
  function ritmo(D, item) { // de quanto em quanto tempo ele compra este item (pelas notas)
    const ds = [...new Set(obsDe(D).filter(o => o.fonte === 'nota' && casar(item, o.produto, o.marca)).map(o => dia(o.data)))].sort();
    if (!ds.length) return null;
    const ult = ds[ds.length - 1];
    if (ds.length < 2) return { ultima: ult, vezes: 1 };
    const difs = ds.slice(1).map((d, i) => F.difDias(ds[i], d)).filter(x => x > 0);
    const intervalo = difs.length ? Math.round(difs.reduce((s, x) => s + x, 0) / difs.length) : null;
    const desde = F.difDias(ult, hoje());
    return { ultima: ult, vezes: ds.length, intervalo, desde, acabando: intervalo ? desde >= intervalo - 1 : false };
  }
  function sugestoes(D, ref = hoje()) {
    const ativos = itensAtivos(D).concat((D.compras || []).filter(i => i.pular));
    const g = {};
    for (const o of obsDe(D)) {
      if (o.fonte !== 'nota' || idade(o.data, ref) > 120) continue;
      const k = toks(o.produto).slice(0, 2).join(' '); if (!k) continue;
      (g[k] = g[k] || { k, nomes: {}, dias: new Set(), tam: o.tam }).dias.add(dia(o.data));
      g[k].nomes[o.produto] = (g[k].nomes[o.produto] || 0) + 1;
    }
    return Object.values(g).filter(x => x.dias.size >= 2).map(x => {
      const ds = [...x.dias].sort(); const difs = ds.slice(1).map((d, i) => F.difDias(ds[i], d));
      const nome = cap(x.k.split(' ').join(' '));
      return { nome, exemplo: Object.entries(x.nomes).sort((a, b) => b[1] - a[1])[0][0], vezes: ds.length, intervalo: difs.length ? Math.round(difs.reduce((s, v) => s + v, 0) / difs.length) : null, tam: x.tam };
    }).filter(s => !ativos.some(i => casar(i, s.exemplo))).sort((a, b) => b.vezes - a.vezes).slice(0, 6);
  }
  function alertas(D, { ref = hoje() } = {}) {
    const out = [], todas = obsDe(D);
    // subiu desde a última vez que você comprou (mesma rede, mesmo produto)
    const g = {};
    for (const o of todas) if (o.fonte === 'nota') (g[o.rede + '|' + o.chave + '|' + fmtTam(o.tam)] = g[o.rede + '|' + o.chave + '|' + fmtTam(o.tam)] || []).push(o);
    for (const l of Object.values(g)) {
      if (l.length < 2) continue;
      l.sort((a, b) => String(a.data).localeCompare(String(b.data)));
      const a = l[l.length - 2], b = l[l.length - 1];
      if (idade(b.data, ref) > 45 || dia(a.data) === dia(b.data)) continue;
      const pct = (b.preco - a.preco) / a.preco;
      if (pct >= 0.08) out.push({ id: 'sb-' + b.ref + '-' + b.chave, tipo: 'subiu', nivel: pct >= 0.2 ? 'medio' : 'baixo', rede: b.rede, titulo: `${cap(b.produto.toLowerCase())} subiu ${Math.round(pct * 100)}%`, texto: `${info(D, b.rede).nome}: de ${F.dinheiro(a.preco)} para ${F.dinheiro(b.preco)} (${F.dataBR(dia(a.data)).slice(0, 5)} → ${F.dataBR(dia(b.data)).slice(0, 5)})` });
    }
    // oferta valendo mais barata do que você pagou
    for (const item of itensAtivos(D)) {
      const pagos = todas.filter(o => o.fonte === 'nota' && idade(o.data, ref) <= 120 && casar(item, o.produto, o.marca)).sort((a, b) => String(b.data).localeCompare(String(a.data)));
      if (!pagos.length) continue;
      const pago = pagos[0], cp = custoPara(item, pago); if (!cp) continue;
      let best = null;
      for (const o of todas) {
        if (!['encarte', 'online', 'web'].includes(o.fonte)) continue;
        if (!casar(item, o.produto, o.marca)) continue;
        if (!situacao(o, ref)) continue;
        const c = custoPara(item, o); if (!c) continue;
        if (c.custo <= cp.custo * 0.9 && (!best || c.custo < best.c.custo)) best = { o, c };
      }
      if (best) out.push({ id: 'of-' + item.id + '-' + best.o.id, tipo: 'oferta', nivel: 'baixo', rede: best.o.rede, item: item.id, titulo: `${item.nome}: ${F.dinheiro(best.c.custo)} no ${info(D, best.o.rede).curto}`, texto: `${best.o.fonte === 'encarte' ? 'Encarte' : FONTES[best.o.fonte]}${best.o.validoAte ? ' até ' + F.dataBR(best.o.validoAte).slice(0, 5) : ''}. Você pagou ${F.dinheiro(cp.custo)} no ${info(D, pago.rede).curto} em ${F.dataBR(dia(pago.data)).slice(0, 5)}.` });
    }
    return out.slice(0, 12);
  }

  /* ---------- notas fiscais (NFC-e) ---------- */
  const semCPF = s => String(s || '').replace(/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g, '').trim();
  function chaveNota(txt) { const m = String(txt || '').replace(/\s/g, '').match(/(?:^|[^\d])(\d{44})(?!\d)/); return m ? m[1] : null; }
  function ehLinkNota(u) { return /^https?:\/\/[^\s]*(nfce|nfc-e|portalsped|sefaz|fazenda)[^\s]*/i.test(String(u || '')) || !!chaveNota(u); }
  function aplicarNota(D, n, { origem = 'qr', rede = null } = {}) {
    D.notasFiscais = D.notasFiscais || [];
    const chave = n.chave || chaveNota(n.url) || null;
    if (chave && D.notasFiscais.some(x => x.chave === chave)) return { repetida: true, nota: D.notasFiscais.find(x => x.chave === chave) };
    const itens = (n.itens || []).map(i => { const nome = String(i.descricao || i.nome || '').trim().slice(0, 120), un = String(i.unidade || i.un || '').slice(0, 6); return { nome, qtd: +i.qtd || 1, un, preco: r2(i.valor_unitario ?? i.preco ?? (i.valor_total && i.qtd ? i.valor_total / i.qtd : 0)), total: r2(i.valor_total ?? i.total ?? 0), chave: chaveProduto(nome), tam: /^kg/i.test(un) ? { qtd: 1000, un: 'g' } : tamanho(nome) }; }).filter(i => i.nome && i.preco > 0);
    if (!itens.length) throw new Error('Não achei os itens dessa nota.');
    const emitente = semCPF(n.emitente || '').slice(0, 90);
    rede = rede || redeDaRazao(emitente + ' ' + (n.fantasia || '')) || null;
    const data = /^\d{4}-\d{2}-\d{2}/.test(n.data || '') ? n.data : new Date().toISOString();
    const nota = { id: 'nf-' + F.uid(), chave, rede, emitente, cnpj: String(n.cnpj || '').replace(/[^\d./-]/g, '').slice(0, 20), data, total: r2(n.total || itens.reduce((s, i) => s + (i.total || i.preco * i.qtd), 0)), n: itens.length, origem, lidaEm: new Date().toISOString(), itens: itens.slice(0, 120) };
    D.notasFiscais.push(nota);
    return { nota, rede };
  }
  function definirRedeNota(D, id, rede) {
    const n = (D.notasFiscais || []).find(x => x.id === id); if (!n) return false;
    n.rede = rede;
    return true;
  }

  /* ---------- IA: encartes, notas por foto, análise e conferência ---------- */
  const pedirJSON = (A, partes, o) => Mm().pedirJSON(A, partes, o);
  function promptEncarte({ rede, data }) {
    return `TAREFA: ler_encarte
Você lê encartes (folhetos de ofertas) de supermercado do Brasil. Extraia TODAS as ofertas legíveis.
Hoje é ${data}. Mercado informado: ${rede || 'não informado'}.
Responda só com JSON:
{"rede": "nome do mercado que aparece no encarte ou vazio", "validade_inicio": "AAAA-MM-DD ou null", "validade_fim": "AAAA-MM-DD ou null",
 "ofertas": [{"produto": "nome do produto como no encarte, com a marca", "marca": "marca ou vazio", "tamanho": "ex.: 5kg, 900ml, 12 rolos, ou vazio", "preco": 21.9, "preco_antigo": null, "por_kg": false, "condicao": "vazio, ou ex.: leve 3 pague 2, no app, clube, a partir de 2 unidades"}]}
Regras: preço em reais com ponto decimal (21.9). Se a oferta é preço do quilo (hortifrúti, carnes), "por_kg": true. Se o encarte diz "válido de 21 a 24/11", use o ano de hoje. Não invente produtos nem preços; ignore o que não dá para ler.`;
  }
  function ofertasDoEncarte(D, j, { rede, data = hoje(), origem = 'foto', url = '', ref } = {}) {
    rede = rede || redeDe(j.rede) || null;
    if (!rede) throw new Error('Não consegui saber de qual mercado é o encarte. Escolha o mercado e tente de novo.');
    const vIni = /^\d{4}-\d{2}-\d{2}$/.test(j.validade_inicio || '') ? j.validade_inicio : null;
    let vFim = /^\d{4}-\d{2}-\d{2}$/.test(j.validade_fim || '') ? j.validade_fim : null;
    if (vFim && vFim < data && F.difDias(vFim, data) > 200) vFim = null; // ano errado
    const id = ref || 'ec-' + F.uid();
    const obs = (j.ofertas || []).slice(0, 400).map(o => novaObs({ rede, produto: o.produto, marca: o.marca, tamanho: o.tamanho, preco: +String(o.preco).replace(',', '.'), de: o.preco_antigo ? +String(o.preco_antigo).replace(',', '.') : null, porKg: !!o.por_kg, condicao: o.condicao, fonte: 'encarte', data: new Date().toISOString(), validoDe: vIni, validoAte: vFim || F.addDias(data, 7), ref: id })).filter(Boolean);
    if (!obs.length) throw new Error('Não achei ofertas com preço legível nesse encarte.');
    D.encartes = D.encartes || [];
    let enc = D.encartes.find(e => e.id === id);
    if (!enc) { enc = { id }; D.encartes.push(enc); }
    Object.assign(enc, { rede, validoDe: vIni, validoAte: vFim || F.addDias(data, 7), semValidade: !vFim, lidoEm: new Date().toISOString(), origem, url: /^https?:\/\//.test(url) ? String(url).slice(0, 300) : '', n: obs.length, ofertas: obs.map(enxuto) });
    return { encarte: enc, ofertas: obs };
  }
  async function lerEncarte(D, { A, partes, rede, origem, url, data = hoje() }) {
    if (!A) throw new Error('Configure a IA em Ajustes para ler encartes.');
    const nomeRede = rede ? info(D, rede).nome : '';
    const ref = url ? 'ec-' + slug(rede || 'x') + '-' + Math.abs(hash(url)) : null;
    const j = await pedirJSON(A, [{ text: promptEncarte({ rede: nomeRede, data }) }, ...partes], { temperatura: 0.1, max: 16384 });
    return ofertasDoEncarte(D, j, { rede, data, origem, url, ref });
  }
  function hash(s) { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) | 0; return h; }
  async function lerNotaIA({ A, partes }) {
    if (!A) throw new Error('Configure a IA em Ajustes para ler a nota pela foto.');
    const j = await pedirJSON(A, [{ text: `TAREFA: ler_nota
Leia este cupom/nota fiscal de supermercado (NFC-e). Responda só com JSON:
{"emitente": "nome da loja (razão social ou fantasia)", "cnpj": "CNPJ da loja", "data": "AAAA-MM-DDTHH:MM", "total": 0.0, "chave": "chave de acesso de 44 números, se aparecer, ou vazio",
 "itens": [{"descricao": "como está na nota", "qtd": 1, "unidade": "UN ou KG", "valor_unitario": 0.0, "valor_total": 0.0}]}
Nunca inclua dados do consumidor (nome ou CPF). Valores com ponto decimal.` }, ...partes], { temperatura: 0, max: 16384 });
    return j;
  }
  async function analisar({ A, D, res }) {
    if (!A) return null;
    const nome = id => info(D, id).nome;
    const dados = {
      data: res.data, modo: res.modo, mercados: res.porRede.map(p => ({ mercado: nome(p.rede), itens_com_preco: p.cobertos, total: p.total, mais_barato_em: p.vence })),
      itens_em_comum: res.comuns, totais_nos_itens_em_comum: Object.fromEntries(Object.entries(res.totaisComuns).map(([k, v]) => [nome(k), v])),
      melhor: res.melhor ? nome(res.melhor) : null, dividir: res.dividir ? { outro: nome(res.dividir.outra), economia: res.dividir.economia, itens: res.dividir.mover.map(m => m.item.nome) } : null,
      itens: res.linhas.map(l => ({ item: descItem(l.item), precos: Object.fromEntries(Object.entries(l.por).map(([r, x]) => [nome(r), { custo: x.custo, produto: x.o.produto, fonte: FONTES[x.o.fonte], quando: x.quando, condicao: x.o.condicao || undefined, tamanho_diferente: x.difTam || undefined }])) })),
      sem_preco: res.semPreco.map(i => i.nome), avisos: res.avisos,
    };
    const j = await pedirJSON(A, [{ text: `TAREFA: analise_compra
Você é o Jarvis, assistente pessoal do Breno em Belo Horizonte. Analise a comparação de preços de supermercado abaixo (já calculada pelo app; não refaça as contas nem invente preços).
Escreva em português do Brasil, direto, de 3 a 6 frases curtas em markdown: onde comprar e por quê, os 2 ou 3 itens que mais pesam na diferença, se vale dividir a compra (considere o tempo de ir em dois mercados), e um cuidado importante (oferta que pede app/clube, preço de site, item sem preço).
Responda só com JSON: {"texto": "..."}
DADOS (JSON): ${JSON.stringify(dados)}` }], { temperatura: 0.4, max: 4096 });
    return String(j.texto || '').trim() || null;
  }
  async function conferir({ A, D, res }) { // a IA confere se o produto escolhido é mesmo o item da lista
    if (!A) return 0;
    const pares = [];
    for (const l of res.linhas) for (const [r, x] of Object.entries(l.por)) {
      const k = x.o.chave; if ((l.item.aceitos || []).includes(k)) continue;
      if (x.s >= 0.95) continue;
      pares.push({ n: pares.length, item: descItem(l.item), produto: x.o.produto + (x.o.tam ? ' (' + fmtTam(x.o.tam) + ')' : ''), _i: l.item, _k: k });
      if (pares.length >= 40) break;
    }
    if (!pares.length) return 0;
    const j = await pedirJSON(A, [{ text: `TAREFA: conferir_produtos
Para cada par, diga se o produto do mercado serve como o item da lista de compras (mesmo tipo de produto; marca diferente serve, a não ser que o item peça marca; tamanho diferente serve). Exemplo: "Leite integral" × "Leite Condensado Moça" = não serve.
Responda só com JSON: {"pares": [{"n": 0, "serve": true}]}
PARES: ${JSON.stringify(pares.map(({ n, item, produto }) => ({ n, item, produto })))}` }], { temperatura: 0, max: 4096 });
    let mudou = 0;
    for (const d of j.pares || []) {
      const p = pares[d.n]; if (!p) continue;
      const it = (D.compras || []).find(i => i.id === p._i.id); if (!it) continue;
      if (d.serve === false) { it.rejeitados = [...new Set([...(it.rejeitados || []), p._k])].slice(-40); mudou++; }
      else if (d.serve === true) it.aceitos = [...new Set([...(it.aceitos || []), p._k])].slice(-40);
    }
    return mudou;
  }
  async function ofertasWeb({ A, D, itens, redes, data = hoje() }) {
    if (!A) throw new Error('Configure a IA em Ajustes.');
    const c = cfg(D);
    const nomes = redes.map(r => info(D, r).nome);
    const j = await pedirJSON(A, [{ text: `TAREFA: ofertas_web
Procure na web ofertas de supermercado válidas em ${F.dataBR(data)} em ${c.cidade || 'Belo Horizonte'}${c.bairro ? ' (bairro ' + c.bairro + ')' : ''}, nas redes: ${nomes.join(', ')}.
Itens: ${itens.map(descItem).join('; ')}.
Use só ofertas com preço e mercado claros (encartes publicados, site do mercado). Não invente.
Responda só com JSON: {"ofertas": [{"rede": "nome do mercado", "produto": "nome com marca", "tamanho": "", "preco": 0.0, "validade_fim": "AAAA-MM-DD ou null", "link": "endereço da fonte"}]}` }], { temperatura: 0.2, ferramentas: [{ googleSearch: {} }], max: 8192 });
    const obs = (j.ofertas || []).map(o => { const rede = redeDe(o.rede); if (!rede || !redes.includes(rede)) return null; return novaObs({ rede, produto: o.produto, tamanho: o.tamanho, preco: +o.preco, fonte: 'web', validoAte: /^\d{4}-\d{2}-\d{2}$/.test(o.validade_fim || '') && o.validade_fim >= data ? o.validade_fim : F.addDias(data, 3), url: o.link }); }).filter(Boolean);
    addObs(D, obs);
    return obs.length;
  }

  /* ---------- mercados perto de casa (CEP → mapa aberto) ---------- */
  const GEO = { cep: () => G.GEO_CEP || 'https://brasilapi.com.br', nomi: () => G.GEO_NOMI || 'https://nominatim.openstreetmap.org', over: () => G.GEO_OVERPASS || 'https://overpass-api.de' };
  const r3 = n => Math.round(n * 1000) / 1000;
  async function localDoCep(cep) {
    const c = String(cep || '').replace(/\D/g, '');
    if (c.length !== 8) throw new Error('O CEP tem 8 números.');
    let j;
    try { const r = await fetch(`${GEO.cep()}/api/cep/v2/${c}`); if (r.status === 404) throw new Error('404'); if (!r.ok) throw new Error('x'); j = await r.json(); }
    catch (e) { throw new Error(e.message === '404' ? 'Não achei esse CEP.' : 'Não consegui consultar o CEP agora. Tente de novo.'); }
    const co = (j.location && j.location.coordinates) || {};
    let lat = parseFloat(co.latitude), lon = parseFloat(co.longitude);
    if (!isFinite(lat) || !isFinite(lon) || (!lat && !lon)) {
      for (const q of [[j.street, j.neighborhood, j.city, j.state], [j.neighborhood, j.city, j.state]]) {
        const txt = q.filter(Boolean).join(', '); if (!txt) continue;
        try { const n = await (await fetch(`${GEO.nomi()}/search?format=json&limit=1&countrycodes=br&q=${encodeURIComponent(txt + ', Brasil')}`)).json(); if (n && n[0]) { lat = +n[0].lat; lon = +n[0].lon; break; } } catch {}
      }
    }
    if (!isFinite(lat) || !isFinite(lon)) throw new Error('Achei o CEP, mas não a localização dele no mapa.');
    return { cep: c, rua: j.street || '', bairro: j.neighborhood || '', cidade: j.city || '', uf: j.state || '', lat: r3(lat), lon: r3(lon) };
  }
  function distancia(a, b, c, d) { const R = 6371e3, t = x => x * Math.PI / 180; const dl = t(c - a), dg = t(d - b); const h = Math.sin(dl / 2) ** 2 + Math.cos(t(a)) * Math.cos(t(c)) * Math.sin(dg / 2) ** 2; return Math.round(2 * R * Math.asin(Math.sqrt(h))); }
  async function mercadosPerto({ lat, lon, raio = 3000 }) {
    const q = `[out:json][timeout:25];(nwr["shop"~"^(supermarket|wholesale)$"](around:${raio},${lat},${lon}););out center 80;`;
    let j;
    try { const r = await fetch(`${GEO.over()}/api/interpreter`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'data=' + encodeURIComponent(q) }); if (!r.ok) throw new Error(); j = await r.json(); }
    catch { throw new Error('O mapa não respondeu agora. Tente de novo em alguns minutos.'); }
    const vistos = new Set(), out = [];
    for (const e of j.elements || []) {
      const t = e.tags || {}; const nome = t.name || t.brand || ''; if (!nome) continue;
      const la = e.lat ?? (e.center && e.center.lat), lo = e.lon ?? (e.center && e.center.lon); if (la == null) continue;
      const k = tirar(nome).toLowerCase() + '|' + r3(la) + '|' + r3(lo); if (vistos.has(k)) continue; vistos.add(k);
      const end = [[t['addr:street'], t['addr:housenumber']].filter(Boolean).join(', '), t['addr:suburb']].filter(Boolean).join(' · ');
      out.push({ nome, rede: redeDe(`${t.brand || ''} ${nome} ${t.operator || ''}`), endereco: end, dist: distancia(lat, lon, la, lo), atacado: t.shop === 'wholesale' });
    }
    return out.sort((a, b) => a.dist - b.dist).slice(0, 50);
  }
  function agruparPorRede(lista) {
    const g = {};
    for (const s of lista) { const k = s.rede || 'x-' + slug(s.nome); (g[k] = g[k] || { rede: k, nome: s.rede ? REDE[s.rede].nome : s.nome, lojas: [], conhecida: !!s.rede }).lojas.push(s); }
    return Object.values(g).map(x => ({ ...x, dist: Math.min(...x.lojas.map(l => l.dist)) })).sort((a, b) => (b.conhecida - a.conhecida) || a.dist - b.dist);
  }
  const fmtDist = m => m < 1000 ? `${Math.round(m / 10) * 10} m` : `${String((m / 1000).toFixed(1)).replace('.', ',')} km`;

  /* ---------- pedidos do iPhone para o PC ---------- */
  function pedir(D, tipo, dados = {}) {
    D.pedidosMercado = D.pedidosMercado || [];
    const p = { id: 'pm-' + F.uid(), tipo, status: 'novo', criado: new Date().toISOString(), ...dados };
    D.pedidosMercado.push(p);
    return p;
  }

  const API = {
    REDES, REDE, FONTES, redeDe, redeDaRazao, cfg, salvarCfg, meusMercados, info, adicionarMercado, slug,
    toks, chaveProduto, tamanho, fmtTam, unitario, fmtUnit, lerItem, novoItem, itensAtivos, descItem, casar,
    novaObs, addObs, aplicarSite, obsDe, podar, situacao, custoPara, candidatos, comparar, frase, resumoGuardado, quandoTxt,
    novaIda, proximaIda, concluirIda, gastoMes, ritmo, sugestoes, alertas,
    chaveNota, ehLinkNota, aplicarNota, definirRedeNota, semCPF,
    promptEncarte, ofertasDoEncarte, lerEncarte, lerNotaIA, analisar, conferir, ofertasWeb,
    localDoCep, mercadosPerto, agruparPorRede, distancia, fmtDist, pedir,
  };
  G.Mercado = API;
  if (typeof module !== 'undefined') module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
