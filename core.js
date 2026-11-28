/* Jarvis Finance — núcleo compartilhado (PC e iPhone): dados, categorias e análises.
   Nada aqui fala com a internet. */
(function (G) {
  'use strict';

  /* ---------- utilidades ---------- */
  const pad = n => String(n).padStart(2, '0');
  const isoDe = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const hoje = () => isoDe(new Date());
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const norm = s => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/\s+/g, ' ').trim();
  const cents = v => Math.round(Number(v || 0) * 100);
  const soma = (arr, f = t => t.valor) => arr.reduce((s, t) => s + cents(f(t)), 0) / 100;
  const r2 = v => Math.round(Number(v || 0) * 100) / 100;
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  function dinheiro(v, { sinal = false, centavos = true } = {}) {
    const n = Number(v) || 0;
    const t = Math.abs(n).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: centavos ? 2 : 0, maximumFractionDigits: centavos ? 2 : 0 });
    if (!sinal) return n < 0 ? '−' + t : t;
    return (n > 0 ? '+' : n < 0 ? '−' : '') + t;
  }
  const addDias = (iso, n) => { const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + n); return isoDe(d); };
  const difDias = (a, b) => Math.round((new Date(b + 'T12:00:00') - new Date(a + 'T12:00:00')) / 864e5);
  const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  const nomeMes = ym => { const [a, m] = ym.split('-').map(Number); return `${MESES[m - 1]} de ${a}`; };
  const nomeMesCurto = ym => { const [a, m] = ym.split('-').map(Number); return MESES[m - 1].slice(0, 3) + '/' + String(a).slice(2); };
  const dataBR = iso => iso ? iso.slice(0, 10).split('-').reverse().join('/') : '';
  const fimDoMes = ym => { const [a, m] = ym.split('-').map(Number); return `${ym}-${pad(new Date(a, m, 0).getDate())}`; };
  const mesAnterior = ym => { const [a, m] = ym.split('-').map(Number); const d = new Date(a, m - 2, 1); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`; };
  const mesSeguinte = ym => { const [a, m] = ym.split('-').map(Number); const d = new Date(a, m, 1); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`; };

  /* ---------- grupos e categorias ---------- */
  const GRUPOS = {
    receita: { nome: 'Entradas', cor: '#34c759' },
    fixo: { nome: 'Contas fixas', cor: '#5e5ce6', desc: 'Chegam todo mês: casa, celular, assinaturas, parcelas' },
    essencial: { nome: 'Essenciais', cor: '#0a84ff', desc: 'Mercado, transporte, saúde' },
    estilo: { nome: 'Estilo de vida', cor: '#ff9f0a', desc: 'Os gastos supérfluos: app de transporte, comer fora, lazer, compras' },
    pessoas: { nome: 'Pix para pessoas', cor: '#bf5af2', desc: 'Dinheiro mandado para pessoas físicas' },
    outros: { nome: 'Outros', cor: '#8e8e93', desc: 'O que não se encaixou nos outros grupos' },
    interna: { nome: 'Entre suas contas', cor: '#aeaeb2', desc: 'Transferências entre contas suas: não contam como gasto nem como renda' },
  };
  const ORDEM_GRUPOS = ['fixo', 'essencial', 'estilo', 'pessoas', 'outros'];
  const CATS = [
    { id: 'salario', nome: 'Salário', grupo: 'receita', ic: 'pasta' },
    { id: 'vendas', nome: 'Vendas', grupo: 'receita', ic: 'etiqueta' },
    { id: 'pix_recebido', nome: 'Pix recebidos', grupo: 'receita', ic: 'entra' },
    { id: 'beneficios', nome: 'Benefícios', grupo: 'receita', ic: 'presente' },
    { id: 'cashback', nome: 'Cashback e rendimentos', grupo: 'receita', ic: 'moeda' },
    { id: 'reembolso', nome: 'Estornos e reembolsos', grupo: 'receita', ic: 'volta' },
    { id: 'outras_receitas', nome: 'Outras entradas', grupo: 'receita', ic: 'entra' },
    { id: 'moradia', nome: 'Moradia', grupo: 'fixo', ic: 'casa' },
    { id: 'casa', nome: 'Água, luz e gás', grupo: 'fixo', ic: 'raio' },
    { id: 'celular', nome: 'Celular e internet', grupo: 'fixo', ic: 'celular' },
    { id: 'assinaturas', nome: 'Assinaturas e apps', grupo: 'fixo', ic: 'play' },
    { id: 'parcelas', nome: 'Empréstimos e parcelas', grupo: 'fixo', ic: 'calendario' },
    { id: 'educacao', nome: 'Educação', grupo: 'fixo', ic: 'livro' },
    { id: 'mercado', nome: 'Mercado', grupo: 'essencial', ic: 'carrinho' },
    { id: 'transporte', nome: 'Transporte e combustível', grupo: 'essencial', ic: 'onibus' },
    { id: 'saude', nome: 'Saúde e farmácia', grupo: 'essencial', ic: 'cruz' },
    { id: 'pets', nome: 'Pets', grupo: 'essencial', ic: 'pata' },
    { id: 'uber', nome: 'Uber e 99', grupo: 'estilo', ic: 'carro' },
    { id: 'comer_fora', nome: 'Restaurantes e cafés', grupo: 'estilo', ic: 'talher' },
    { id: 'delivery', nome: 'Delivery', grupo: 'estilo', ic: 'moto' },
    { id: 'bares', nome: 'Bares, festas e eventos', grupo: 'estilo', ic: 'taca' },
    { id: 'lazer', nome: 'Lazer e passeios', grupo: 'estilo', ic: 'ticket' },
    { id: 'compras', nome: 'Compras', grupo: 'estilo', ic: 'sacola' },
    { id: 'viagem', nome: 'Viagens', grupo: 'estilo', ic: 'aviao' },
    { id: 'jogos', nome: 'Jogos e apostas', grupo: 'estilo', ic: 'dado' },
    { id: 'pix_pessoas', nome: 'Pix para pessoas', grupo: 'pessoas', ic: 'pessoa' },
    { id: 'tarifas', nome: 'Tarifas e juros', grupo: 'outros', ic: 'alerta' },
    { id: 'outros', nome: 'Outros gastos', grupo: 'outros', ic: 'pontos' },
    { id: 'entre_contas', nome: 'Entre suas contas', grupo: 'interna', ic: 'troca' },
  ];
  const CAT = Object.fromEntries(CATS.map(c => [c.id, c]));
  const grupoDe = (catId, D) => {
    const p = D && perfil(D);
    return (p && p.grupos && p.grupos[catId]) || (CAT[catId] || CAT.outros).grupo;
  };

  /* ---------- perfil (um registro só) ---------- */
  function perfil(D) {
    let p = (D.perfil || []).find(x => x.id === 'perfil');
    if (!p) { p = { id: 'perfil', nome: '', nomePix: '', grupos: {} }; (D.perfil = D.perfil || []).push(p); }
    p.grupos = p.grupos || {};
    return p;
  }

  /* ---------- categorização automática ---------- */
  const AUTO = [
    // [categoria, regex, tipo ('IN' | 'OUT' | null = ambos)]
    ['reembolso', /\bESTORNO\b|\bREEMBOLSO\b|\bDEVOLUCAO\b|CHARGEBACK/, 'IN'],
    ['salario', /\bSALARIO\b|FOLHA DE PAG|PROVENTOS|PAGTO SALARIO|ADIANTAMENTO SALARIAL|\b13O SALARIO\b|FERIAS/, 'IN'],
    ['vendas', /^VENDAS\b|RECEBIMENTO DE VENDAS|ANTECIPACAO DE RECEB|\bLIQUIDACAO\b.*VENDA/, 'IN'],
    ['cashback', /CASHBACK|RENDIMENTO|JUROS SOBRE SALDO|REMUNERACAO DA CONTA|RENDA FIXA/, 'IN'],
    ['beneficios', /\bFLASH\b|\bALELO\b|SODEXO|PLUXEE|\bCAJU\b|SWILE|VALE ALIMENTACAO|VALE REFEICAO/, 'IN'],
    ['uber', /\bUBER\b|UBERRIDES|UBER ?\*|\b99 ?(APP|TAXI|TECNOLOGIA|POP|PAY)\b|CABIFY|INDRIVE/, 'OUT'],
    ['delivery', /IFOOD|RAPPI|ZE DELIVERY|AIQFOME|JAMES DELIVERY|DELIVERY MUCH/, 'OUT'],
    ['casa', /COPASA|CEMIG|SABESP|\bENEL\b|LIGHT SERV|COMGAS|GASMIG|SANEAGO|CEDAE|EQUATORIAL|ENERGISA|NEOENERGIA|COELBA|CPFL|ELEKTRO|ULTRAGAZ|LIQUIGAS|SUPERGASBRAS|COPASA/, 'OUT'],
    ['celular', /\bCLARO\b|\bVIVO\b|\bTIM\b|\bOI\b|RECARGA|TELEFONICA|NET SERVICOS|INTERNET|FIBRA|ALGAR|DESKTOP SA/, 'OUT'],
    ['assinaturas', /APPLE\.COM|APPLE COM|ITUNES|NETFLIX|SPOTIFY|DISNEY|HBO|\bMAX\.COM\b|PRIME VIDEO|AMAZON PRIME|YOUTUBE|GOOGLE ?\*|ANTHROPIC|\bCLAUDE\b|OPENAI|CHATGPT|CANVA|DEEZER|GLOBOPLAY|PARAMOUNT|CRUNCHYROLL|DUNECO|MICROSOFT|ADOBE|DROPBOX|ICLOUD/, 'OUT'],
    ['moradia', /ALUGUEL|CONDOMINIO|IMOBILIARIA|QUINTOANDAR|QUINTO ANDAR/, 'OUT'],
    ['parcelas', /EMPRESTIMO|FINANCIAMENTO|CONSIGNADO|\bPARCELA\b|CREDITO PESSOAL/, 'OUT'],
    ['educacao', /ESCOLA|COLEGIO|FACULDADE|UNIVERSIDADE|\bCURSO\b|UDEMY|ALURA|MENSALIDADE ESCOLAR/, 'OUT'],
    ['mercado', /CARREFOUR|SUPERMERC|ATACAD|ASSAI|\bEPA\b|VERDEMAR|MART MINAS|\bDIA\b|BAHAMAS|MERCADINHO|HORTIFRUTI|SACOLAO|PADARIA|PAO DE ACUCAR|EXTRA HIPER/, 'OUT'],
    ['saude', /DROGARIA|\bARAUJO\b|FARMACIA|DROGASIL|\bRAIA\b|PACHECO|PAGUE MENOS|HOSPITAL|CLINICA|LABORATORIO|UNIMED|HAPVIDA|ODONTO|HERMES PARDINI/, 'OUT'],
    ['transporte', /\bPOSTO\b|COMBUST|\bSHELL\b|IPIRANGA|PETROBRAS|\bMETRO\b|BHTRANS|BILHETAGEM|ONIBUS|ESTACIONAMENTO|SEM PARAR|CONECTCAR|PEDAGIO|VELOE/, 'OUT'],
    ['comer_fora', /STARBUCKS|SBUX|MADERO|OUTBACK|BURGER|MCDONALD|\bBK\b|SUBWAY|RESTAURANTE|GRILL|PIZZ|LANCHONETE|ESPETO|ESPETAO|\bCAFE\b|CAFETERIA|HABIB|SPOLETO|COCO BAMBU|CHURRASC|SORVET|\bACAI\b|DOCERIA|LANCHES/, 'OUT'],
    ['bares', /BEER|CERVEJ|\bBAR\b|BOTECO|CHOPP|ZIGPAY|\bZIG\b|BALADA|SYMPLA|EVENTIM|INGRESSE|TICKETMASTER|BILHETERIA|BEBIDAS|ADEGA|TABACARIA/, 'OUT'],
    ['lazer', /HOPI HARI|CINEMA|CINEMARK|KINOPLEX|\bPARQUE\b|TEATRO|MUSEU|BEACH PARK|BETO CARRERO|STEAM|PLAYSTATION|XBOX|NINTENDO|BOLICHE/, 'OUT'],
    ['compras', /AMAZON|MERCADO ?LIVRE|SHOPEE|MAGALU|MAGAZINE LUIZA|AMERICANAS|SHEIN|ALIEXPRESS|RENNER|\bC&A\b|RIACHUELO|\bZARA\b|CENTAURO|NETSHOES|KABUM|CASAS BAHIA|DECATHLON/, 'OUT'],
    ['pets', /\bPET\b|PETZ|COBASI|\bCAES\b|CACHORRO|VETERIN/, 'OUT'],
    ['viagem', /LATAM|\bGOL LINHAS\b|AZUL LINHAS|BOOKING|AIRBNB|HOTEL|POUSADA|DECOLAR|RODOVIARIA|BUSER|CLICKBUS/, 'OUT'],
    ['tarifas', /TARIFA|\bIOF\b|ENCARGO|\bJUROS\b|ANUIDADE|\bMULTA\b|ADIANTAMENTO A DEPOSITANTE/, 'OUT'],
  ];
  const BELVO_SUB = {
    'Taxis & Rideshares': 'uber', 'Public Transit': 'transporte', 'Gas': 'transporte', 'Parking': 'transporte', 'Tolls': 'transporte',
    'Groceries': 'mercado', 'Restaurants': 'comer_fora', 'Fast Food': 'comer_fora', 'Coffee Shops': 'comer_fora', 'Delivery': 'delivery',
    'Bars & Nightclubs': 'bares', 'Alcohol & Tobacco': 'bares', 'Gambling': 'jogos', 'Events, Parks and Museums': 'lazer',
    'Apps, Software and Cloud Services': 'assinaturas', 'Streaming': 'assinaturas', 'Telecommunications': 'celular',
    'Water': 'casa', 'Electricity & Energy': 'casa', 'Gas & Heating': 'casa', 'Rent': 'moradia', 'E-commerce': 'compras',
    'Department Store': 'compras', 'Clothing & Accessories': 'compras', 'Pharmacy': 'saude', 'Flights': 'viagem', 'Hotels': 'viagem',
  };
  const BELVO_CAT = {
    'Bills & Utilities': 'casa', 'Food & Groceries': 'mercado', 'Transport & Travel': 'transporte', 'Online Platforms & Leisure': 'lazer',
    'Personal Shopping': 'compras', 'Health & Wellness': 'saude', 'Education': 'educacao', 'Housing': 'moradia', 'Loans & Investments': 'parcelas',
    'Fees & Charges': 'tarifas', 'Pets': 'pets', 'Travel': 'viagem',
  };

  function categorizar(t, D) {
    const p = perfil(D);
    const d = norm(t.descricao);
    for (const r of (D.regras || [])) {
      if (r.padrao && d.includes(norm(r.padrao)) && (!r.tipo || r.tipo === t.tipo)) return r.categoria;
    }
    const nomes = String(p.nomePix || '').split(/[;,]/).map(norm).filter(n => n.length >= 6);
    if (nomes.some(n => d.includes(n))) return 'entre_contas';
    const tipo = t.tipo === 'entrada' ? 'IN' : 'OUT';
    for (const [cat, re, tp] of AUTO) if ((!tp || tp === tipo) && re.test(d)) return cat;
    if (tipo === 'IN') {
      if (t.op === 'FOLHA_PAGAMENTO' || t.belvoSub === 'Salary') return 'salario';
      if (t.op === 'PIX' || /^PIX/.test(d)) return 'pix_recebido';
      return 'outras_receitas';
    }
    if ((t.op === 'PIX' || /^PIX/.test(d)) && (!t.belvoCat || ['Personal Shopping', 'Transfers'].includes(t.belvoCat))) return 'pix_pessoas';
    if (t.belvoSub && BELVO_SUB[t.belvoSub]) return BELVO_SUB[t.belvoSub];
    if (t.belvoCat && BELVO_CAT[t.belvoCat]) return BELVO_CAT[t.belvoCat];
    if (t.belvoCat === 'Transfers') return 'pix_pessoas';
    return 'outros';
  }
  // aplica categorias automáticas nas que você não mexeu (para regras novas valerem no histórico)
  function recategorizar(D) {
    let n = 0;
    for (const t of D.transacoes) {
      if (t.catManual) continue;
      const c = categorizar(t, D);
      if (c !== t.categoria) { t.categoria = c; n++; }
    }
    return n;
  }

  /* ---------- nome curto do estabelecimento ---------- */
  const CONHECIDOS = [
    [/UBER/, 'Uber'], [/\b99 ?(APP|POP|TAXI)/, '99'], [/IFOOD/, 'iFood'], [/SBUX|STARBUCKS/, 'Starbucks'], [/APPLE\.COM|APPLE COM|ITUNES/, 'Apple'],
    [/ANTHROPIC|\bCLAUDE\b/, 'Claude (Anthropic)'], [/CARREFOUR/, 'Carrefour'], [/HOPI HARI/, 'Hopi Hari'], [/CEMIG/, 'Cemig'], [/COPASA/, 'Copasa'],
    [/RECARGA.*CLARO|CLARO.*RECARGA/, 'Claro (recarga)'], [/\bCLARO\b/, 'Claro'], [/AMAZON/, 'Amazon'], [/ZIGPAY|\bZIG\b/, 'Zig (evento)'],
    [/SUPERMERCADOS BH/, 'Supermercados BH'], [/MADERO/, 'Madero'], [/METRO BH|BILHETAGEM/, 'Metrô BH'], [/BEAGA ?BEER/, 'Beagá Beer'],
    [/\bARAUJO\b/, 'Drogaria Araujo'], [/NETFLIX/, 'Netflix'], [/SPOTIFY/, 'Spotify'], [/MERCADO ?LIVRE/, 'Mercado Livre'], [/SHOPEE/, 'Shopee'],
    [/DUNECO/, 'Duneco (app)'], [/^CASHBACK$/, 'Cashback'], [/^VENDAS$/, 'Vendas na maquininha'],
  ];
  function titulo(s) {
    return s.toLowerCase().replace(/(^|[\s\-\/.(*])([a-zà-ÿ])/g, (_, a, b) => a + b.toUpperCase())
      .replace(/\b(De|Da|Do|Das|Dos|E|Em)\b/g, m => m.toLowerCase());
  }
  function nomeCurto(desc) {
    const d = norm(desc);
    for (const [re, nome] of CONHECIDOS) if (re.test(d)) return nome;
    let s = String(desc || '').trim();
    s = s.replace(/^(Compra no d[eé]bito|Compra no cr[eé]dito|Compra - cr[eé]dito debitado|Pix enviado|Pix recebido|Pix|Pagamento de boleto|Pagamento|Transfer[eê]ncia (enviada|recebida)|TED|DOC|Recarga)\s*[-:]?\s*/i, '');
    s = s.replace(/^No Estabelecimento\s*/i, '');
    s = s.replace(/\s{2,}.*$/, '');
    s = s.replace(/\b(Ltda|Eireli|S\.?\s?A\.?|Me|Epp)\.?\s*$/i, '').replace(/[*]+/g, ' ').trim();
    s = s.replace(/(Belo Horizont\w*|Sao Paulo|Franco Da Roc\w*|Caieiras|Vinhedo|Osasco)\s*(bra)?$/i, '').replace(/\s+bra$/i, '').trim();
    s = s.replace(/^Sal[aá]rio\s+/i, '').replace(/^\d{5,}\s*/, '');
    if (!s) s = String(desc || '').trim();
    const letras = s.replace(/[^A-Za-zÀ-ÿ]/g, ''), maius = s.replace(/[^A-ZÀ-Þ]/g, '');
    return (letras.length > 3 && maius.length / letras.length > 0.6) || s === s.toLowerCase() ? titulo(s) : s;
  }
  const chaveLoja = t => norm(nomeCurto(t.descricao));

  /* ---------- preparação: estornos, contas internas ---------- */
  // Marca pares compra/estorno (mesmo valor, mesmo banco, até 10 dias) e calcula índices.
  function preparar(D) {
    const saidas = D.transacoes.filter(t => t.tipo === 'saida');
    const usados = new Set();
    const porValor = new Map();
    for (const t of saidas) { delete t._estornada; const k = t.banco + '|' + cents(t.valor); (porValor.get(k) || porValor.set(k, []).get(k)).push(t); }
    for (const t of D.transacoes) delete t._estornoDe;
    const estornos = D.transacoes.filter(t => t.tipo === 'entrada' && t.categoria === 'reembolso').sort((a, b) => a.data.localeCompare(b.data));
    for (const e of estornos) {
      const cands = (porValor.get(e.banco + '|' + cents(e.valor)) || [])
        .filter(s => !usados.has(s.id) && s.data <= e.data && difDias(s.data, e.data) <= 10)
        .sort((a, b) => b.data.localeCompare(a.data));
      const s = cands[0];
      if (s) { usados.add(s.id); s._estornada = e.id; e._estornoDe = s.id; }
    }
  }
  const conta = t => !t.ignorar && t.categoria !== 'entre_contas' && !t._estornada && !t._estornoDe;

  /* ---------- períodos e resumos ---------- */
  function noPeriodo(D, de, ate) { return D.transacoes.filter(t => t.data >= de && t.data <= ate); }
  function datasDisponiveis(D) {
    const ds = D.transacoes.map(t => t.data).sort();
    return ds.length ? { primeira: ds[0], ultima: ds[ds.length - 1] } : null;
  }
  function mesesDisponiveis(D) {
    const s = new Set(D.transacoes.map(t => t.data.slice(0, 7)));
    s.add(hoje().slice(0, 7));
    return [...s].sort();
  }

  function resumo(D, de, ate) {
    const ts = noPeriodo(D, de, ate);
    const val = ts.filter(conta);
    const ent = val.filter(t => t.tipo === 'entrada'), sai = val.filter(t => t.tipo === 'saida');
    const porGrupo = {}, porCat = {}, porCatEnt = {}, lojas = new Map();
    for (const t of sai) {
      const g = grupoDe(t.categoria, D);
      porGrupo[g] = (porGrupo[g] || 0) + cents(t.valor);
      porCat[t.categoria] = (porCat[t.categoria] || 0) + cents(t.valor);
      const k = chaveLoja(t);
      const l = lojas.get(k) || { nome: nomeCurto(t.descricao), categoria: t.categoria, total: 0, n: 0 };
      l.total += cents(t.valor); l.n++; lojas.set(k, l);
    }
    for (const t of ent) porCatEnt[t.categoria] = (porCatEnt[t.categoria] || 0) + cents(t.valor);
    const fix = o => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, v / 100]));
    const entradas = soma(ent), saidas = soma(sai);
    const estornadas = ts.filter(t => t._estornada);
    const entreContas = ts.filter(t => t.categoria === 'entre_contas' && !t.ignorar);
    return {
      de, ate, dias: difDias(de, ate) + 1,
      entradas, saidas, resultado: r2(entradas - saidas),
      porGrupo: fix(porGrupo), porCategoria: fix(porCat), entradasPorCategoria: fix(porCatEnt),
      lojas: [...lojas.values()].map(l => ({ ...l, total: l.total / 100 })).sort((a, b) => b.total - a.total),
      nEntradas: ent.length, nSaidas: sai.length,
      estornos: { n: estornadas.length, valor: soma(estornadas) },
      entreContas: { n: entreContas.length, entrou: soma(entreContas.filter(t => t.tipo === 'entrada')), saiu: soma(entreContas.filter(t => t.tipo === 'saida')) },
    };
  }
  const resumoMes = (D, ym) => resumo(D, ym + '-01', fimDoMes(ym));
  const resumo30 = (D, ate = hoje()) => resumo(D, addDias(ate, -29), ate);

  /* ---------- contas fixas e recorrências ---------- */
  function contasFixas(D, ate = hoje()) {
    const de = addDias(ate, -120);
    const ts = D.transacoes.filter(t => t.tipo === 'saida' && conta(t) && t.data >= de && t.data <= ate);
    const grupos = new Map();
    for (const t of ts) {
      const k = chaveLoja(t);
      const g = grupos.get(k) || { nome: nomeCurto(t.descricao), categoria: t.categoria, itens: [] };
      g.itens.push(t); grupos.set(k, g);
    }
    const out = [];
    for (const [k, g] of grupos) {
      const meses = new Set(g.itens.map(t => t.data.slice(0, 7)));
      const ehFixa = grupoDe(g.categoria, D) === 'fixo';
      // recorrente: aparece em 2+ meses com valores parecidos e no máximo 3 vezes por mês
      const porMes = g.itens.length / meses.size;
      const vals = g.itens.map(t => t.valor).sort((a, b) => a - b), med = vals[Math.floor(vals.length / 2)];
      const parecidos = vals.every(v => Math.abs(v - med) <= Math.max(5, med * 0.35));
      const recorrente = meses.size >= 2 && porMes <= 3 && parecidos;
      if (!ehFixa && !recorrente) continue;
      const ult = g.itens.reduce((a, b) => (a.data > b.data ? a : b));
      const totalMes = soma(g.itens) / Math.max(1, meses.size);
      out.push({ chave: k, nome: g.nome, categoria: g.categoria, porMes: r2(totalMes), ultimo: ult.valor, ultimaData: ult.data, dia: Number(ult.data.slice(8)), vezes: g.itens.length, meses: meses.size, recorrente, ehFixa });
    }
    return out.sort((a, b) => b.porMes - a.porMes);
  }

  /* ---------- renda ---------- */
  const fatorMensal = { mensal: 1, quinzenal: 2, semanal: 4.33, anual: 1 / 12 };
  function rendaMensal(D) {
    return r2((D.renda || []).filter(r => r.ativa !== false).reduce((s, r) => s + (Number(r.valor) || 0) * (fatorMensal[r.frequencia || 'mensal'] || 1), 0));
  }
  function rendaDetectada(D, ate = hoje()) {
    const r = resumo30(D, ate);
    const c = r.entradasPorCategoria;
    return { total: r.entradas, salario: c.salario || 0, vendas: c.vendas || 0, pix: c.pix_recebido || 0, beneficios: c.beneficios || 0, outros: r2(r.entradas - (c.salario || 0) - (c.vendas || 0) - (c.pix_recebido || 0) - (c.beneficios || 0)) };
  }

  /* ---------- saldos ---------- */
  function saldos(D) {
    const contas = (D.contas || []).filter(c => c.tipo === 'corrente' || c.tipo === 'poupanca');
    return { total: soma(contas, c => c.saldo), contas, atualizado: contas.map(c => c.atualizadoEm).filter(Boolean).sort().pop() || null };
  }

  /* ---------- orçamentos ---------- */
  function orcamentos(D, ym = hoje().slice(0, 7)) {
    const r = resumoMes(D, ym);
    return (D.orcamentos || []).map(o => {
      const gasto = o.categoria.startsWith('grupo:') ? (r.porGrupo[o.categoria.slice(6)] || 0) : (r.porCategoria[o.categoria] || 0);
      const nome = o.categoria.startsWith('grupo:') ? (GRUPOS[o.categoria.slice(6)] || {}).nome : (CAT[o.categoria] || {}).nome;
      return { ...o, nome: nome || o.categoria, gasto: r2(gasto), resta: r2(o.limite - gasto), pct: o.limite > 0 ? gasto / o.limite : 0 };
    });
  }

  /* ---------- alertas ---------- */
  function alertas(D, ym = hoje().slice(0, 7)) {
    const out = [];
    const contas = D.contas || [];
    for (const ad of contas.filter(c => c.tipo === 'adiantamento')) {
      const cc = contas.find(c => c.banco === ad.banco && c.tipo === 'corrente');
      if (!cc || cc.saldo < 50) {
        const tx = ad.jurosMes ? `${(ad.jurosMes * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}% ao mês` : 'juros altos';
        out.push({ nivel: 'alto', id: 'ad-' + ad.banco, titulo: `Conta do ${ad.banco} zerada com adiantamento ativo`, texto: `Se cair qualquer débito nessa conta, o ${ad.banco} cobre com "adiantamento a depositante": ${ad.tarifa ? 'tarifa de ' + dinheiro(ad.tarifa) + ' + ' : ''}${tx}. Confira se não tem débito automático ou tarifa marcada pra cair lá.` });
      }
    }
    const r = resumoMes(D, ym);
    if (r.nSaidas && r.resultado < 0) out.push({ nivel: 'medio', id: 'neg-' + ym, titulo: `Saiu ${dinheiro(-r.resultado)} a mais do que entrou`, texto: `Em ${nomeMes(ym)} entraram ${dinheiro(r.entradas)} e saíram ${dinheiro(r.saidas)}.` });
    for (const o of orcamentos(D, ym)) {
      if (o.pct >= 1) out.push({ nivel: 'medio', id: 'orc-' + o.id, titulo: `${o.nome}: limite estourado`, texto: `Gastou ${dinheiro(o.gasto)} de ${dinheiro(o.limite)} este mês.` });
      else if (o.pct >= 0.8) out.push({ nivel: 'baixo', id: 'orc-' + o.id, titulo: `${o.nome}: ${Math.round(o.pct * 100)}% do limite`, texto: `Restam ${dinheiro(o.resta)} até o fim do mês.` });
    }
    const s = saldos(D), r30 = tipico30(D);
    const gastoDia = r30.saidas / 30;
    if (s.contas.length && gastoDia > 0) {
      const dias = s.total / gastoDia;
      if (dias < 15) out.push({ nivel: 'medio', id: 'colchao', titulo: `Seu saldo cobre ${dias < 1 ? 'menos de 1 dia' : Math.floor(dias) === 1 ? '1 dia' : Math.floor(dias) + ' dias'} de gastos`, texto: `Somando as contas há ${dinheiro(s.total)}; no dia a dia dos últimos 30 dias você gastou em média ${dinheiro(gastoDia)} por dia${r30.grandes.length ? ' (sem contar compras grandes avulsas)' : ''}.` });
    }
    return out;
  }

  /* ---------- gasto típico: tira compras grandes que não se repetem ---------- */
  function avulsasGrandes(D, de, ate) {
    const renda = rendaMensalSimples(D, ate);
    const lim = Math.max(400, renda * 0.15);
    const sai = noPeriodo(D, de, ate).filter(t => t.tipo === 'saida' && conta(t));
    const vezes = new Map(); sai.forEach(t => { const k = chaveLoja(t); vezes.set(k, (vezes.get(k) || 0) + 1); });
    return sai.filter(t => t.valor >= lim && vezes.get(chaveLoja(t)) === 1 && !['fixo', 'pessoas'].includes(grupoDe(t.categoria, D)));
  }
  function rendaMensalSimples(D, ate) {
    const inf = rendaMensal(D); if (inf > 0) return inf;
    const c = resumo(D, addDias(ate, -29), ate).entradasPorCategoria;
    return (c.salario || 0) + (c.vendas || 0) + (c.beneficios || 0);
  }
  function tipico30(D, ate = hoje()) {
    const de = addDias(ate, -29), r = resumo(D, de, ate);
    const grandes = avulsasGrandes(D, de, ate);
    const porCategoria = { ...r.porCategoria }, porGrupo = { ...r.porGrupo };
    for (const t of grandes) { porCategoria[t.categoria] = r2(porCategoria[t.categoria] - t.valor); const g = grupoDe(t.categoria, D); porGrupo[g] = r2(porGrupo[g] - t.valor); }
    return { ...r, porCategoria, porGrupo, saidas: r2(r.saidas - soma(grandes)), grandes: grandes.map(t => ({ id: t.id, nome: nomeCurto(t.descricao), valor: t.valor, data: t.data, categoria: t.categoria })) };
  }

  /* ---------- médias e projeção ---------- */
  // renda usada nos planos: a que você informou; se não informou, salário + vendas + benefícios dos últimos 30 dias
  function rendaBase(D, ate = hoje()) {
    const inf = rendaMensal(D);
    if (inf > 0) return { valor: inf, fonte: 'informada' };
    const c = resumo30(D, ate).entradasPorCategoria;
    return { valor: r2((c.salario || 0) + (c.vendas || 0) + (c.beneficios || 0) + (c.cashback || 0)), fonte: 'detectada' };
  }
  function medias(D, ate = hoje()) {
    const r = tipico30(D, ate);
    const g = r.porGrupo;
    return { renda: rendaBase(D, ate).valor, fixo: g.fixo || 0, essencial: g.essencial || 0, estilo: g.estilo || 0, pessoas: g.pessoas || 0, outros: g.outros || 0, saidas: r.saidas, entradas: r.entradas };
  }
  function projecao(D, meses = 6) {
    const m = medias(D);
    const limites = new Map((D.orcamentos || []).map(o => [o.categoria, o.limite]));
    const r30 = tipico30(D);
    // gasto previsto por mês: o típico dos últimos 30 dias (sem compras grandes avulsas), trocando pelo limite onde há orçamento
    let previsto = 0;
    const usados = new Set();
    for (const [cat, v] of Object.entries(r30.porCategoria)) {
      const g = grupoDe(cat, D);
      if (limites.has('grupo:' + g)) { usados.add('grupo:' + g); continue; }
      previsto += cents(limites.has(cat) ? Math.min(v, limites.get(cat)) : v);
    }
    for (const k of usados) previsto += cents(limites.get(k));
    previsto /= 100;
    const metaMensal = (D.metas || []).reduce((s, x) => s + (Number(x.mensal) || 0), 0);
    const saldo0 = saldos(D).total;
    const linhas = [];
    let acumulado = saldo0;
    let mes = hoje().slice(0, 7);
    for (let i = 1; i <= meses; i++) {
      mes = mesSeguinte(mes);
      const sobra = m.renda - previsto;
      acumulado += sobra;
      linhas.push({ mes, renda: r2(m.renda), gastos: r2(previsto), sobra: r2(sobra), acumulado: r2(acumulado) });
    }
    return { renda: r2(m.renda), gastoPrevisto: r2(previsto), sobraMensal: r2(m.renda - previsto), metaMensal: r2(metaMensal), saldoAtual: r2(saldo0), linhas, grandesFora: r30.grandes };
  }

  /* ---------- plano sugerido (princípios dos 3 livros) ---------- */
  function planoSugerido(D) {
    const m = medias(D);
    const renda = m.renda;
    const essenciais = r2(m.fixo + m.essencial);
    const reservaMin = r2(essenciais * 3), reservaIdeal = r2(essenciais * 6);
    const r30 = tipico30(D);
    const cortes = Object.entries(r30.porCategoria)
      .filter(([c]) => grupoDe(c, D) === 'estilo')
      .sort((a, b) => b[1] - a[1])
      .map(([c, v]) => ({ categoria: c, nome: CAT[c].nome, atual: r2(v), limite: Math.max(0, Math.round(v * 0.6 / 10) * 10) }));
    const economia = r2(cortes.reduce((s, c) => s + c.atual - c.limite, 0));
    const pagueSePrimeiro = renda > 0 ? Math.max(Math.round(renda * 0.1 / 10) * 10, Math.round((renda - essenciais - (m.estilo - economia) - m.pessoas - m.outros) / 10) * 10) : 0;
    return { renda: r2(renda), essenciais, reservaMin, reservaIdeal, cortes: cortes.filter(c => c.atual > 0), economia, pagueSePrimeiro: Math.max(0, pagueSePrimeiro), mesesAteReserva: pagueSePrimeiro > 0 ? Math.ceil(reservaMin / pagueSePrimeiro) : null, grandesFora: r30.grandes };
  }

  /* ---------- incorporar dados de fora (Belvo, importação, semente) ---------- */
  const digital = t => `${t.data}|${t.banco}|${t.tipo}|${cents(t.valor)}`;
  function incorporar(D, pacote, origem) {
    const res = { novas: 0, atualizadas: 0, contas: 0 };
    const porBelvo = new Map(D.transacoes.filter(t => t.belvoId).map(t => [t.belvoId, t]));
    const soltos = new Map(); // transações sem id da Belvo (semente/importação), para não duplicar
    for (const t of D.transacoes) if (!t.belvoId) { const k = digital(t); (soltos.get(k) || soltos.set(k, []).get(k)).push(t); }
    const agora = new Date().toISOString();
    for (const n of pacote.transacoes || []) {
      const base = { data: n.data, valor: r2(n.valor), tipo: n.tipo, descricao: n.descricao, banco: n.banco, op: n.op || '', belvoCat: n.belvoCat || '', belvoSub: n.belvoSub || '' };
      let t = n.belvoId && porBelvo.get(n.belvoId);
      if (!t) {
        const lista = soltos.get(digital(base));
        if (lista && lista.length) t = lista.shift();
      }
      if (t) {
        let mudou = false;
        if (n.belvoId && t.belvoId !== n.belvoId) { t.belvoId = n.belvoId; mudou = true; }
        for (const k of ['valor', 'data', 'op', 'belvoCat', 'belvoSub']) if (base[k] && t[k] !== base[k]) { t[k] = base[k]; mudou = true; }
        if (origem === 'belvo' && t.origem !== 'belvo') { t.origem = 'belvo'; mudou = true; }
        if (!t.catManual) { const c = categorizar(t, D); if (c !== t.categoria) { t.categoria = c; mudou = true; } }
        if (mudou) res.atualizadas++;
      } else {
        const novo = { id: uid(), ...base, origem, criadoEm: agora };
        if (n.belvoId) novo.belvoId = n.belvoId;
        novo.categoria = n.categoria && CAT[n.categoria] ? n.categoria : categorizar(novo, D);
        if (n.categoria && CAT[n.categoria]) novo.catManual = !!n.catManual;
        D.transacoes.push(novo); res.novas++;
        if (n.belvoId) porBelvo.set(n.belvoId, novo);
      }
    }
    for (const c of pacote.contas || []) {
      const k = c.chave;
      let ex = (D.contas || []).find(x => x.chave === k);
      if (!ex) { ex = { id: uid(), chave: k }; (D.contas = D.contas || []).push(ex); }
      Object.assign(ex, c); res.contas++;
    }
    preparar(D);
    return res;
  }

  /* ---------- dados vazios ---------- */
  const COLECOES = ['contas', 'transacoes', 'renda', 'orcamentos', 'metas', 'planos', 'regras', 'chat', 'perfil', 'fixas', 'faturas',
    'tarefas', 'agenda', 'emails', 'briefings', 'atalhos', 'notas', 'biblioteca',
    'compras', 'mercados', 'idas', 'encartes', 'notasFiscais', 'precosSite', 'precos', 'pedidosMercado', 'habitos', 'checkins'];
  function vazio() { const D = { apagados: {} }; COLECOES.forEach(c => D[c] = []); perfil(D); return D; }
  function normaliza(D) {
    D = D || {};
    COLECOES.forEach(c => { if (!Array.isArray(D[c])) D[c] = []; });
    D.apagados = D.apagados || {};
    perfil(D);
    preparar(D);
    return D;
  }

  /* ---------- exportar CSV ---------- */
  function csv(D) {
    const linhas = [['data', 'banco', 'tipo', 'valor', 'descricao', 'categoria', 'grupo', 'conta_nos_totais', 'nota']];
    for (const t of [...D.transacoes].sort((a, b) => a.data.localeCompare(b.data))) {
      linhas.push([t.data, t.banco, t.tipo, String(t.valor).replace('.', ','), t.descricao, (CAT[t.categoria] || {}).nome || t.categoria, (GRUPOS[grupoDe(t.categoria, D)] || {}).nome || '', conta(t) ? 'sim' : 'não', t.nota || '']);
    }
    return '﻿' + linhas.map(l => l.map(v => /[;"\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : v).join(';')).join('\r\n');
  }

  const API = {
    pad, isoDe, hoje, uid, norm, cents, soma, r2, esc, dinheiro, addDias, difDias, MESES, nomeMes, nomeMesCurto, dataBR, fimDoMes, mesAnterior, mesSeguinte,
    GRUPOS, ORDEM_GRUPOS, CATS, CAT, grupoDe, perfil, categorizar, recategorizar, nomeCurto, chaveLoja, preparar, conta,
    noPeriodo, datasDisponiveis, mesesDisponiveis, resumo, resumoMes, resumo30, contasFixas, rendaMensal, rendaDetectada, saldos,
    orcamentos, alertas, rendaBase, tipico30, avulsasGrandes, medias, projecao, planoSugerido, incorporar, digital, COLECOES, vazio, normaliza, csv,
  };
  G.Finn = API;
  if (typeof module !== 'undefined') module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
