/* Jarvis Finance — "Hoje", o painel da sua vida: briefing da manhã, agenda, tarefas, contas,
   dinheiro, e-mails, clima e a lição do dia, tudo num lugar só. */
(function (G) {
  'use strict';
  const F = G.Finn;
  const C = () => G.Contas, Cb = () => G.Cerebro, B = () => G.Biblioteca, M = () => G.Memoria;
  const { dinheiro } = F;
  const agoraIso = () => new Date().toISOString();
  const lista = (D, c) => D[c] || (D[c] = []);
  const hhmm = iso => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  /* ---------- tarefas ---------- */
  function novaTarefa(d = {}) {
    return { id: 'tf-' + F.uid(), titulo: String(d.titulo || '').trim().slice(0, 240), quando: /^\d{4}-\d{2}-\d{2}$/.test(d.quando || '') ? d.quando : null, hora: /^\d{2}:\d{2}$/.test(d.hora || '') ? d.hora : null, prioridade: d.prioridade === 'alta' ? 'alta' : 'normal', feita: false, criadoEm: agoraIso() };
  }
  function tarefas(D, hoje = F.hoje()) {
    const abertas = lista(D, 'tarefas').filter(t => !t.feita);
    const ord = (a, b) => (a.prioridade === 'alta' ? 0 : 1) - (b.prioridade === 'alta' ? 0 : 1) || (a.quando || '9999').localeCompare(b.quando || '9999') || (a.hora || '99').localeCompare(b.hora || '99') || a.criadoEm.localeCompare(b.criadoEm);
    return {
      atrasadas: abertas.filter(t => t.quando && t.quando < hoje).sort(ord),
      hoje: abertas.filter(t => t.quando === hoje).sort(ord),
      semData: abertas.filter(t => !t.quando).sort(ord),
      proximas: abertas.filter(t => t.quando && t.quando > hoje).sort(ord),
      feitasHoje: lista(D, 'tarefas').filter(t => t.feita && (t.feitaEm || '').slice(0, 10) === hoje),
    };
  }
  function concluir(D, id, feita = true) { const t = lista(D, 'tarefas').find(x => x.id === id); if (!t) return null; t.feita = feita; t.feitaEm = feita ? agoraIso() : null; return t; }
  // tarefas feitas há mais de 30 dias saem da lista (o histórico não precisa viajar para sempre)
  function limpar(D, hoje = F.hoje()) {
    const lim = F.addDias(hoje, -30), antes = lista(D, 'tarefas').length;
    D.tarefas = D.tarefas.filter(t => !(t.feita && (t.feitaEm || '').slice(0, 10) < lim));
    const limB = F.addDias(hoje, -14);
    D.briefings = lista(D, 'briefings').filter(b => b.data >= limB);
    return antes - D.tarefas.length;
  }

  /* ---------- agenda ---------- */
  function eventosDoDia(D, data) {
    return lista(D, 'agenda').filter(e => e.diaInteiro ? (e.inicio <= data && data < e.fim) : (e.data <= data && data <= (e.dataFim || e.data)))
      .sort((a, b) => (a.diaInteiro ? 0 : 1) - (b.diaInteiro ? 0 : 1) || String(a.inicio).localeCompare(String(b.inicio)));
  }
  function novoCompromisso(d = {}) {
    const data = /^\d{4}-\d{2}-\d{2}$/.test(d.data || '') ? d.data : F.hoje();
    if (!d.hora) return { id: 'ev-m-' + F.uid(), origem: 'manual', titulo: String(d.titulo || '').slice(0, 200), local: String(d.local || '').slice(0, 160), diaInteiro: true, inicio: data, fim: F.addDias(data, 1), data };
    const [h, mi] = String(d.hora).split(':').map(Number);
    const ini = new Date(+data.slice(0, 4), +data.slice(5, 7) - 1, +data.slice(8, 10), h || 0, mi || 0);
    const fim = new Date(ini.getTime() + (Number(d.duracao) > 0 ? Number(d.duracao) : 60) * 60000);
    const dl = x => F.isoDe(x);
    return { id: 'ev-m-' + F.uid(), origem: 'manual', titulo: String(d.titulo || '').slice(0, 200), local: String(d.local || '').slice(0, 160), diaInteiro: false, inicio: ini.toISOString(), fim: fim.toISOString(), data: dl(ini), dataFim: dl(new Date(fim.getTime() - 1)) };
  }
  // troca os eventos que vieram dos calendários (os criados no Jarvis ficam)
  function aplicarAgenda(D, eventos) {
    const manuais = lista(D, 'agenda').filter(e => e.origem === 'manual');
    const atuais = new Map(lista(D, 'agenda').filter(e => e.origem !== 'manual').map(e => [e.id, e]));
    let mudou = false;
    const novos = eventos.map(e => {
      const a = atuais.get(e.id); const n = { ...e, origem: 'ical' };
      const sem = x => { const o = {}; for (const k of Object.keys(x).sort()) if (k !== 'mod' && k[0] !== '_') o[k] = x[k]; return JSON.stringify(o); };
      if (a && sem(a) === sem(n)) return a;
      mudou = true; return n;
    });
    if (atuais.size !== novos.length || novos.some(e => !atuais.has(e.id))) mudou = true;
    if (mudou) D.agenda = [...manuais, ...novos];
    return mudou;
  }
  // tira compromissos manuais antigos (mais de 30 dias)
  function limparAgenda(D, hoje = F.hoje()) { const lim = F.addDias(hoje, -30); D.agenda = lista(D, 'agenda').filter(e => e.origem !== 'manual' || (e.dataFim || e.fim || e.data) >= lim); }

  /* ---------- e-mails ---------- */
  function aplicarEmails(D, r) {
    const p = F.perfil(D);
    const antes = JSON.stringify(lista(D, 'emails').map(e => e.id));
    D.emails = (r.itens || []).slice(0, 15).map(e => ({ id: e.id, de: e.de, email: e.email, assunto: e.assunto, data: e.data }));
    p.emailInfo = { total: r.total || 0, caixa: r.caixa || 'Caixa de entrada', em: agoraIso() };
    return antes !== JSON.stringify(D.emails.map(e => e.id));
  }

  /* ---------- o que pede atenção hoje ---------- */
  function prioridades(D, { hoje = F.hoje(), agora = new Date() } = {}) {
    const out = [];
    try { for (const a of (C() ? C().alertas(D, hoje) : [])) out.push({ ...a, ic: a.ic || 'recibo' }); } catch (e) { console.error(e); }
    const t = tarefas(D, hoje);
    if (t.atrasadas.length) out.push({ nivel: t.atrasadas.some(x => x.prioridade === 'alta') ? 'alto' : 'medio', id: 'tf-atr', ic: 'check', ir: 'hoje', alvo: 'tarefas', titulo: `${t.atrasadas.length} tarefa${t.atrasadas.length > 1 ? 's' : ''} atrasada${t.atrasadas.length > 1 ? 's' : ''}`, texto: t.atrasadas.slice(0, 3).map(x => x.titulo).join(' · ') });
    const altas = t.hoje.filter(x => x.prioridade === 'alta');
    if (altas.length) out.push({ nivel: 'medio', id: 'tf-alta', ic: 'check', ir: 'hoje', alvo: 'tarefas', titulo: altas.length === 1 ? `Prioridade de hoje: ${altas[0].titulo}` : `${altas.length} prioridades para hoje`, texto: altas.length === 1 ? (altas[0].hora ? 'Às ' + altas[0].hora : 'Marcada como importante') : altas.map(x => x.titulo).join(' · ') });
    if (Cb()) {
      for (const v of Cb().vencimentos(D, { hoje })) {
        const n = v.nota, tipo = (Cb().TIPOS[n.tipo] || {}).nome || 'Item';
        const quando = v.falta < 0 ? `venceu há ${-v.falta} dia${v.falta < -1 ? 's' : ''}` : v.falta === 0 ? 'vence hoje' : v.falta === 1 ? 'vence amanhã' : `vence em ${v.falta} dias`;
        out.push({ nivel: v.falta <= 7 ? 'alto' : 'baixo', id: 'vc-' + n.id, ic: Cb().TIPOS[n.tipo] ? Cb().TIPOS[n.tipo].ic : 'nota', ir: 'cerebro', nota: n.id, titulo: `${n.titulo} ${quando}`, texto: `${tipo}${n.vence ? ' · ' + F.dataBR(n.vence) : ''}` });
      }
      for (const a of Cb().aniversarios(D, { hoje, dias: 1 })) out.push({ nivel: 'baixo', id: 'an-' + a.nota.id, ic: 'presente', ir: 'cerebro', nota: a.nota.id, titulo: a.falta === 0 ? `Hoje é aniversário de ${a.nota.titulo}` : `Amanhã é aniversário de ${a.nota.titulo}`, texto: a.nota.campos && a.nota.campos.telefone ? 'Que tal mandar uma mensagem?' : 'Não esqueça de dar os parabéns.' });
    }
    const prox = eventosDoDia(D, hoje).filter(e => !e.diaInteiro && new Date(e.inicio) > agora && new Date(e.inicio) - agora < 3 * 36e5)[0];
    if (prox) out.push({ nivel: 'baixo', id: 'ag-' + prox.id, ic: 'calendario', ir: 'hoje', alvo: 'agenda', titulo: `${hhmm(prox.inicio)} · ${prox.titulo}`, texto: prox.local || 'Seu próximo compromisso de hoje' });
    for (const f of ((G.FinnExt || {}).prioridades || [])) { try { out.push(...(f(D, hoje) || [])); } catch (e) { console.error(e); } }
    const NIVEL = { alto: 0, medio: 1, baixo: 2 };
    return out.sort((a, b) => (NIVEL[a.nivel] ?? 3) - (NIVEL[b.nivel] ?? 3));
  }

  /* ---------- clima (Open-Meteo, grátis e sem chave) ---------- */
  const CLIMA = {
    0: ['Céu limpo', 'sol'], 1: ['Quase sem nuvens', 'sol'], 2: ['Parcialmente nublado', 'solnuvem'], 3: ['Nublado', 'nuvem'], 45: ['Neblina', 'neblina'], 48: ['Neblina', 'neblina'],
    51: ['Garoa fraca', 'chuva'], 53: ['Garoa', 'chuva'], 55: ['Garoa forte', 'chuva'], 56: ['Garoa gelada', 'chuva'], 57: ['Garoa gelada', 'chuva'], 61: ['Chuva fraca', 'chuva'], 63: ['Chuva', 'chuva'], 65: ['Chuva forte', 'chuva'],
    66: ['Chuva gelada', 'chuva'], 67: ['Chuva gelada', 'chuva'], 71: ['Neve fraca', 'neve'], 73: ['Neve', 'neve'], 75: ['Neve forte', 'neve'], 77: ['Neve', 'neve'],
    80: ['Pancadas de chuva', 'chuva'], 81: ['Pancadas de chuva', 'chuva'], 82: ['Pancadas fortes', 'chuva'], 85: ['Neve', 'neve'], 86: ['Neve', 'neve'], 95: ['Trovoadas', 'raio'], 96: ['Trovoadas com granizo', 'raio'], 99: ['Trovoadas com granizo', 'raio'],
  };
  const CIDADE_PADRAO = { cidade: 'Belo Horizonte', lat: -19.92, lon: -43.94 };
  const base = () => G.CLIMA_BASE || 'https://api.open-meteo.com';
  const baseGeo = () => G.CLIMA_GEO || 'https://geocoding-api.open-meteo.com';
  function cidadeDe(D) { const c = F.perfil(D).clima; return c && Number.isFinite(c.lat) ? c : CIDADE_PADRAO; }
  async function clima(D, { forcar = false } = {}) {
    const c = cidadeDe(D), chave = 'jarvis-clima', id = `${c.lat},${c.lon}`;
    if (!forcar) { try { const x = JSON.parse(localStorage.getItem(chave) || 'null'); if (x && x.id === id && Date.now() - x.em < 40 * 60e3) return x.dados; } catch {} }
    const u = `${base()}/v1/forecast?latitude=${c.lat}&longitude=${c.lon}&current=temperature_2m,weather_code,is_day&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code&timezone=America%2FSao_Paulo&forecast_days=2`;
    const r = await fetch(u); if (!r.ok) throw new Error('clima indisponível');
    const j = await r.json();
    const cod = n => CLIMA[n] || ['—', 'nuvem'];
    const d = j.daily || {}, cur = j.current || {};
    const dados = {
      cidade: c.cidade, temp: Math.round(cur.temperature_2m), desc: cod(cur.weather_code)[0], ic: cur.is_day === 0 && cod(cur.weather_code)[1] === 'sol' ? 'lua' : cod(cur.weather_code)[1],
      max: Math.round((d.temperature_2m_max || [])[0]), min: Math.round((d.temperature_2m_min || [])[0]), chuva: (d.precipitation_probability_max || [])[0] ?? null,
      amanha: d.time && d.time[1] ? { max: Math.round(d.temperature_2m_max[1]), min: Math.round(d.temperature_2m_min[1]), chuva: (d.precipitation_probability_max || [])[1] ?? null, desc: cod(d.weather_code[1])[0], ic: cod(d.weather_code[1])[1] } : null,
    };
    try { localStorage.setItem(chave, JSON.stringify({ id, em: Date.now(), dados })); } catch {}
    return dados;
  }
  async function acharCidade(nome) {
    const r = await fetch(`${baseGeo()}/v1/search?name=${encodeURIComponent(nome)}&count=1&language=pt&format=json`);
    const j = await r.json().catch(() => ({}));
    const x = (j.results || [])[0]; if (!x) return null;
    return { cidade: x.name + (x.admin1 ? ' (' + x.admin1 + ')' : ''), lat: +x.latitude.toFixed(3), lon: +x.longitude.toFixed(3) };
  }

  /* ---------- briefing da manhã ---------- */
  function dataExtenso(iso) { const d = new Date(iso + 'T12:00:00'); return d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }); }
  function evTxt(e) { return e.diaInteiro ? `(dia todo) ${e.titulo}` : `${hhmm(e.inicio)}–${hhmm(e.fim)} ${e.titulo}${e.local ? ' (' + e.local + ')' : ''}`; }
  function dadosDoDia(D, { hoje = F.hoje(), climaDados = null, comEmails = true, agora = new Date() } = {}) {
    const amanha = F.addDias(hoje, 1);
    const t = tarefas(D, hoje);
    const out = { data: hoje, dataExtenso: dataExtenso(hoje), nome: F.perfil(D).nome || '' };
    if (climaDados) out.clima = `${climaDados.cidade}: agora ${climaDados.temp}°C, ${climaDados.desc.toLowerCase()}; máx ${climaDados.max}°, mín ${climaDados.min}°${climaDados.chuva != null ? `, ${climaDados.chuva}% de chance de chuva` : ''}`;
    out.agendaHoje = eventosDoDia(D, hoje).filter(e => e.diaInteiro || new Date(e.fim) > agora).map(evTxt);
    out.agendaAmanha = eventosDoDia(D, amanha).slice(0, 3).map(evTxt);
    out.tarefas = { atrasadas: t.atrasadas.map(x => x.titulo + (x.prioridade === 'alta' ? ' (importante)' : '')), hoje: t.hoje.map(x => (x.hora ? x.hora + ' ' : '') + x.titulo + (x.prioridade === 'alta' ? ' (importante)' : '')), semData: t.semData.filter(x => x.prioridade === 'alta').map(x => x.titulo) };
    if (C() && (D.fixas || []).length) {
      try {
        const p = C().painel(D, hoje);
        const fmt = i => `${C().nomeFixa(i.fixa)} ${i.estimado ? '~' : ''}${dinheiro(i.valor)} (${i.sit.txt.toLowerCase()}; ${C().FORMAS[i.fixa.forma] || ''})`;
        out.contas = { atrasadas: p.atrasadas.map(fmt), proximos7dias: p.aPagar.filter(i => i.vencimento <= F.addDias(hoje, 7)).map(fmt) };
      } catch {}
    }
    try {
      const s = F.saldos(D), mes = hoje.slice(0, 7), rm = F.resumoMes(D, mes);
      out.dinheiro = { saldoContas: dinheiro(s.total), mes: `entrou ${dinheiro(rm.entradas)}, saiu ${dinheiro(rm.saidas)}`, limitesEstourados: F.orcamentos(D, mes).filter(o => o.pct >= 1).map(o => o.nome) };
    } catch {}
    if (comEmails) { const ei = F.perfil(D).emailInfo; if (ei) out.emails = { naoLidos: ei.total, caixa: ei.caixa, recentes: lista(D, 'emails').slice(0, 8).map(e => `${e.de}: ${e.assunto}`) }; }
    if (Cb()) {
      out.vencimentos = Cb().vencimentos(D, { hoje }).map(v => `${v.nota.titulo} (${v.falta < 0 ? 'venceu' : 'vence'} ${F.dataBR(v.nota.vence)})`);
      out.aniversarios = Cb().aniversarios(D, { hoje, dias: 1 }).map(a => `${a.nota.titulo} (${a.falta === 0 ? 'hoje' : 'amanhã'})`);
    }
    if (B()) { const l = B().licaoDoDia(D, hoje); if (l) out.licao = `"${l.texto}" — ${l.item.titulo}${l.item.autor ? ', ' + l.item.autor : ''}`; }
    return out;
  }
  function promptBriefing(d) {
    return `TAREFA: briefing_diario
Você é o Jarvis, assistente pessoal${d.nome ? ' de ' + d.nome : ''}. Escreva o briefing da manhã dele para hoje (${d.dataExtenso}), em português do Brasil.
- Entre 90 e 170 palavras. Comece com uma frase que resume o dia. Depois, até 5 tópicos curtos, do mais importante para o menos: compromissos com hora, contas vencidas ou vencendo, tarefas importantes, prazos, aniversários.
- E-mails: cite no máximo 2 que pareçam importantes (banco, cobrança, trabalho, entrevista, governo). Ignore propaganda.
- Feche com uma frase curta de foco, podendo usar a lição do dia.
- Não invente nada além dos dados. Se o dia estiver tranquilo, diga isso. Sem emojis. Use **negrito** só em horários e valores.
DADOS (JSON):
${JSON.stringify(d, null, 1)}`;
  }
  function briefingSemIA(d) {
    const linhas = [];
    const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
    linhas.push(`**${cap(d.dataExtenso.replace(/ de \d{4}$/, ''))}.** ${d.clima ? d.clima.replace(/^[^:]+: agora /, 'Agora ') + '.' : ''}`.trim());
    const itens = [];
    for (const e of d.agendaHoje || []) itens.push(e);
    for (const c of (d.contas && d.contas.atrasadas) || []) itens.push('Conta atrasada: ' + c);
    for (const c of ((d.contas && d.contas.proximos7dias) || []).slice(0, 2)) itens.push('Conta: ' + c);
    if (d.tarefas.atrasadas.length) itens.push(`${d.tarefas.atrasadas.length} tarefa(s) atrasada(s): ${d.tarefas.atrasadas.slice(0, 2).join(', ')}`);
    if (d.tarefas.hoje.length) itens.push(`Para hoje: ${d.tarefas.hoje.slice(0, 3).join(', ')}`);
    for (const v of (d.vencimentos || []).slice(0, 2)) itens.push('Prazo: ' + v);
    for (const a of d.aniversarios || []) itens.push('Aniversário: ' + a);
    if (d.emails && d.emails.naoLidos) itens.push(`${d.emails.naoLidos} e-mail(s) não lido(s) na ${d.emails.caixa.toLowerCase()}`);
    if (!itens.length) itens.push('Nenhum compromisso, conta ou tarefa marcada para hoje.');
    linhas.push(...itens.slice(0, 6).map(x => '- ' + x));
    if (d.licao) linhas.push('', 'Lição do dia: ' + d.licao);
    return linhas.join('\n');
  }
  async function gerarBriefing(D, { A, hoje = F.hoje(), climaDados = null, comEmails = true } = {}) {
    const d = dadosDoDia(D, { hoje, climaDados, comEmails });
    let texto = '', origem = 'resumo';
    if (A && A.chamada) {
      try {
        const r = await A.pedir(A.modelo || 'gemini-2.5-flash', { contents: [{ role: 'user', parts: [{ text: promptBriefing(d) }] }], generationConfig: { temperature: 0.6, maxOutputTokens: 4096 } });
        texto = M().textoDaResposta(r); if (texto) origem = 'ia';
      } catch (e) { console.warn('briefing sem IA:', e.message); }
    }
    if (!texto) texto = briefingSemIA(d);
    return { id: 'br-' + hoje, data: hoje, texto: texto.slice(0, 4000), origem, geradoEm: agoraIso() };
  }
  const briefingDe = (D, data = F.hoje()) => lista(D, 'briefings').find(b => b.data === data) || null;
  function guardarBriefing(D, br) {
    const l = lista(D, 'briefings'); const i = l.findIndex(b => b.id === br.id);
    if (i >= 0) Object.assign(l[i], br); else l.push(br);
  }
  const paraFala = md => String(md || '').replace(/\*\*|__|`|#+\s/g, '').replace(/^\s*[-•]\s+/gm, '').replace(/\[(\d+)\]/g, '').replace(/\n{2,}/g, '. ').replace(/\n/g, '. ').replace(/\.\s*\./g, '.').trim();

  /* ---------- atalhos e primeiros itens ---------- */
  const ATALHOS = [
    { id: 'at-gmail', nome: 'Gmail', url: 'https://mail.google.com', ic: 'envelope' },
    { id: 'at-agenda', nome: 'Google Agenda', url: 'https://calendar.google.com', ic: 'calendario' },
    { id: 'at-whatsapp', nome: 'WhatsApp', url: 'https://web.whatsapp.com', ic: 'conversa' },
  ];
  // primeiros itens (só no computador, que é a fonte principal: assim o celular nunca sobrescreve o perfil antes de sincronizar)
  function semear(D) {
    const p = F.perfil(D); p.semeou = p.semeou || {}; let n = 0;
    const apagado = id => D.apagados && D.apagados[id];
    if (!p.semeou.atalhos) { for (const a of ATALHOS) if (!lista(D, 'atalhos').some(x => x.id === a.id) && !apagado(a.id)) { D.atalhos.push({ ...a }); n++; } p.semeou.atalhos = true; }
    if (!p.semeou.biblioteca && B()) { for (const it of B().semente()) if (!lista(D, 'biblioteca').some(x => x.id === it.id) && !apagado(it.id)) { D.biblioteca.push(it); n++; } p.semeou.biblioteca = true; }
    return n;
  }

  G.Vida = { novaTarefa, tarefas, concluir, limpar, eventosDoDia, novoCompromisso, aplicarAgenda, limparAgenda, aplicarEmails, prioridades, CLIMA, clima, acharCidade, cidadeDe, dataExtenso, dadosDoDia, promptBriefing, briefingSemIA, gerarBriefing, briefingDe, guardarBriefing, paraFala, ATALHOS, semear, hhmm };
})(typeof window !== 'undefined' ? window : globalThis);
