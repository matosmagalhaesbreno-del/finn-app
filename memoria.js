/* Jarvis Finance — memória: busca no segundo cérebro e na biblioteca, e respostas da IA citando as fontes.
   A busca é local (funciona sem internet). Só o que for preciso para responder vai para a IA,
   e nada marcado como "sensível" sai do aparelho. */
(function (G) {
  'use strict';
  const tirarAcento = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const PARADAS = new Set(('a o e as os um uma uns umas de da do das dos em no na nos nas por pela pelo pelas pelos para pra pro com sem sob sobre que se ao aos à às ' +
    'é ser ter foi era são estar está estou tem tinha mais menos muito muita muitos muitas meu minha meus minhas seu sua seus suas teu tua isso isto esse essa este esta ' +
    'aquele aquela eu tu ele ela nós vós eles elas me te lhe nos vos lhes já não sim também como quando onde qual quais quem porque porquê então mas ou nem até ' +
    'há houve vai vou ir foi fui the of and to in is it for on with what which how why who are was be this that das quanto quantos quanta quais sobre coisa coisas ' +
    'principais principal falar fala diz dizer quero saber sei aprendi aprender lições lição licoes licao você vocês voce voces').split(/\s+/).map(tirarAcento));
  // palavras que andam juntas (amplia a busca sem precisar de IA)
  const PARENTES = [
    ['foco', 'concentracao', 'atencao', 'distracao', 'focado', 'focar', 'profundo', 'deep', 'focus', 'flow', 'fluxo'],
    ['habito', 'rotina', 'disciplina', 'constancia', 'habit', 'habits', 'ritual'],
    ['dinheiro', 'financa', 'financeiro', 'riqueza', 'investimento', 'investir', 'poupar', 'guardar', 'money', 'wealth', 'renda'],
    ['produtividade', 'tempo', 'prioridade', 'agenda', 'produtivo', 'eficiencia'],
    ['saude', 'sono', 'exercicio', 'treino', 'alimentacao', 'energia'],
    ['venda', 'vender', 'cliente', 'negociacao', 'comercial', 'persuasao', 'sales'],
    ['lideranca', 'lider', 'equipe', 'time', 'gestao', 'leadership'],
    ['felicidade', 'proposito', 'sentido', 'satisfacao', 'bem-estar'],
    ['divida', 'emprestimo', 'juros', 'credito', 'cartao'],
    ['contrato', 'aluguel', 'locacao', 'vigencia', 'clausula'],
  ];
  function raiz(p) {
    if (p.length <= 3) return p;
    return p.replace(/(coes|cao|soes|sao)$/, 'cao').replace(/(mente)$/, '').replace(/(idades|idade)$/, 'idade').replace(/(ais)$/, 'al').replace(/(eis)$/, 'el').replace(/(oes|aes)$/, 'ao').replace(/(ns)$/, 'm').replace(/([^s])s$/, '$1').replace(/(ando|endo|indo)$/, 'ar').replace(/(ado|ada|ido|ida)$/, '');
  }
  const MAPA_PARENTES = new Map();
  PARENTES.forEach((g, i) => g.forEach(p => MAPA_PARENTES.set(raiz(p), i)));
  function tokens(texto, { comParadas = false } = {}) {
    return tirarAcento(texto).toLowerCase().split(/[^a-z0-9]+/).filter(t => t.length > 1 && (comParadas || !PARADAS.has(t))).map(raiz);
  }
  function expandir(ts) {
    const out = new Map(); // termo -> peso
    for (const t of ts) {
      out.set(t, Math.max(out.get(t) || 0, 1));
      const g = MAPA_PARENTES.get(t);
      if (g != null) for (const p of PARENTES[g]) { const r = raiz(p); if (!out.has(r)) out.set(r, 0.45); }
    }
    return out;
  }

  /* doc = { id, origem: 'cerebro'|'biblioteca', tipo, titulo, subtitulo, texto (o que entra na busca), sensivel, data } */
  function buscar(consulta, docs, { limite = 20, minimo = 0.01 } = {}) {
    const termos = expandir(tokens(consulta));
    if (!termos.size || !docs.length) return [];
    const N = docs.length;
    const tf = docs.map(d => {
      const m = new Map(); let n = 0;
      const pesoTitulo = 3;
      for (const t of tokens(d.titulo)) { m.set(t, (m.get(t) || 0) + pesoTitulo); n += pesoTitulo; }
      for (const t of tokens((d.subtitulo || '') + ' ' + (d.tags || []).join(' '))) { m.set(t, (m.get(t) || 0) + 2); n += 2; }
      for (const t of tokens(d.texto)) { m.set(t, (m.get(t) || 0) + 1); n++; }
      return { m, n: Math.max(1, n) };
    });
    const media = tf.reduce((s, x) => s + x.n, 0) / N;
    const df = new Map();
    for (const [t] of termos) df.set(t, tf.filter(x => x.m.has(t)).length);
    const k1 = 1.4, b = 0.7;
    const res = docs.map((d, i) => {
      let p = 0;
      for (const [t, w] of termos) {
        const f = tf[i].m.get(t); if (!f) continue;
        const idf = Math.log(1 + (N - df.get(t) + 0.5) / (df.get(t) + 0.5));
        p += w * idf * (f * (k1 + 1)) / (f + k1 * (1 - b + b * tf[i].n / media));
      }
      // frase exata vale mais
      const q = tirarAcento(consulta).toLowerCase().trim();
      if (q.length > 3 && tirarAcento(d.titulo + ' ' + d.texto).toLowerCase().includes(q)) p += 2;
      return { doc: d, pontos: p };
    }).filter(r => r.pontos > minimo).sort((x, y) => y.pontos - x.pontos).slice(0, limite);
    for (const r of res) r.trecho = trecho(r.doc.texto, termos);
    return res;
  }
  function trecho(texto, termos, tam = 220) {
    const t = String(texto || '').replace(/\s+/g, ' ').trim();
    if (!t) return '';
    const frases = t.split(/(?<=[.!?…])\s+|\s•\s/);
    let melhor = frases[0] || '', pm = -1;
    for (const f of frases) {
      const ts = tokens(f); let p = 0;
      for (const x of ts) p += termos.get(x) || 0;
      if (p > pm) { pm = p; melhor = f; }
    }
    return melhor.length > tam ? melhor.slice(0, tam - 1) + '…' : melhor;
  }

  /* ---------- perguntas para a IA, com as fontes numeradas ---------- */
  // pega as fontes mais relevantes até caber no orçamento de texto (as pequenas entram inteiras)
  function fontesPara(consulta, docs, { orcamento = 90000, maxFontes = 40, porFonte = 9000 } = {}) {
    const seguros = docs.filter(d => !d.sensivel);
    const rank = buscar(consulta, seguros, { limite: seguros.length, minimo: -1 });
    const ordem = new Map(rank.map((r, i) => [r.doc.id, { i, p: r.pontos }]));
    const lista = [...seguros].sort((a, b) => ((ordem.get(b.id) || { p: 0 }).p - (ordem.get(a.id) || { p: 0 }).p));
    const fontes = []; let usado = 0;
    for (const d of lista) {
      if (fontes.length >= maxFontes) break;
      const relevante = (ordem.get(d.id) || { p: 0 }).p > 0;
      let corpo = String(d.textoIA || d.texto || '');
      if (corpo.length > porFonte) corpo = relevante ? recorte(corpo, consulta, porFonte) : corpo.slice(0, 1200) + '…';
      const bloco = `${d.titulo}${d.subtitulo ? ' — ' + d.subtitulo : ''}\n${corpo}`;
      if (usado + bloco.length > orcamento && fontes.length) { if (!relevante) break; continue; }
      fontes.push({ n: fontes.length + 1, doc: d, bloco }); usado += bloco.length;
    }
    return fontes;
  }
  // pedaços de um texto longo que mais têm a ver com a pergunta
  function recorte(texto, consulta, tam) {
    const termos = expandir(tokens(consulta));
    const pedacos = []; for (let i = 0; i < texto.length; i += 1400) pedacos.push({ i, t: texto.slice(i, i + 1600) });
    pedacos.forEach(p => { p.s = tokens(p.t).reduce((s, x) => s + (termos.get(x) || 0), 0); });
    const escolhidos = [...pedacos].sort((a, b) => b.s - a.s).slice(0, Math.max(1, Math.floor(tam / 1600))).sort((a, b) => a.i - b.i);
    return (escolhidos[0].i > 0 ? '… ' : '') + escolhidos.map(p => p.t).join(' … ');
  }
  function jsonDe(txt) {
    const s = String(txt || '').replace(/^```(?:json)?/i, '').replace(/```\s*$/, '').trim();
    try { return JSON.parse(s); } catch {}
    const i = s.indexOf('{'), j = s.lastIndexOf('}');
    if (i >= 0 && j > i) { try { return JSON.parse(s.slice(i, j + 1)); } catch {} }
    return null;
  }
  const textoDaResposta = r => { const c = r && r.candidates && r.candidates[0]; return c && c.content ? (c.content.parts || []).filter(p => p.text && !p.thought).map(p => p.text).join('').trim() : ''; };

  /* perguntar(consulta, docs, { A, nome, onde }) -> { resposta, fontes: [{n, doc}], usadas: [n] } */
  async function perguntar(consulta, docs, { A, nome = '', onde = 'cerebro e biblioteca' } = {}) {
    if (!A || !A.chamada) throw new Error('Configure a IA em Ajustes para fazer perguntas. A busca por palavras funciona sem ela.');
    const fontes = fontesPara(consulta, docs);
    if (!fontes.length) return { resposta: 'Ainda não tem nada guardado que eu possa usar para responder isso.', fontes: [], usadas: [] };
    const prompt = `TAREFA: pergunta_memoria
Você é o Jarvis, assistente pessoal${nome ? ' de ' + nome : ''}. Responda à pergunta usando SOMENTE as fontes abaixo (do ${onde} dele).
- Português do Brasil, direto, em tópicos curtos quando couber. Cite as fontes com o número entre colchetes, ex.: [2], logo depois de cada ideia.
- Quando várias fontes falam da mesma ideia, junte e cite todas.
- Se as fontes não respondem, diga isso com honestidade e sugira o que ele poderia guardar.
- Nunca invente dados pessoais, datas ou números que não estão nas fontes.
Responda em JSON: {"resposta": "texto em markdown com [n]", "fontes_usadas": [números]}

PERGUNTA: ${consulta}

FONTES:
${fontes.map(f => `[${f.n}] ${f.bloco}`).join('\n\n')}`;
    const corpo = { contents: [{ role: 'user', parts: [{ text: prompt }] }], generationConfig: { temperature: 0.3, maxOutputTokens: 8192, responseMimeType: 'application/json' } };
    const r = await A.pedir(A.modelo || 'gemini-2.5-flash', corpo);
    const txt = textoDaResposta(r);
    const j = jsonDe(txt) || { resposta: txt };
    const usadas = [...new Set([...(Array.isArray(j.fontes_usadas) ? j.fontes_usadas : []), ...[...String(j.resposta || '').matchAll(/\[(\d+)\]/g)].map(m => +m[1])])].filter(n => n >= 1 && n <= fontes.length).sort((a, b) => a - b);
    return { resposta: String(j.resposta || 'Não consegui montar a resposta.').trim(), fontes, usadas };
  }

  /* chamada genérica que devolve JSON (resumos, leitura de documentos) */
  async function pedirJSON(A, partes, { temperatura = 0.3, ferramentas = null, max = 8192 } = {}) {
    if (!A || !A.chamada) throw new Error('Configure a IA em Ajustes.');
    const corpo = { contents: [{ role: 'user', parts: partes }], generationConfig: { temperature: temperatura, maxOutputTokens: max, ...(ferramentas ? {} : { responseMimeType: 'application/json' }) }, ...(ferramentas ? { tools: ferramentas } : {}) };
    const r = await A.pedir(A.modelo || 'gemini-2.5-flash', corpo);
    const txt = textoDaResposta(r);
    const j = jsonDe(txt);
    if (!j) throw new Error('A IA não devolveu o resultado no formato esperado. Tente de novo.');
    return j;
  }

  const API = { tokens, raiz, buscar, trecho, fontesPara, perguntar, pedirJSON, jsonDe, textoDaResposta, tirarAcento };
  G.Memoria = API;
  if (typeof module !== 'undefined') module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
