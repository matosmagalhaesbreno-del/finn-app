/* Jarvis Finance — Hábitos e saúde: água, sono, treino e o que mais você quiser acompanhar,
   com meta por dia (ou vezes por semana), registro rápido e contagem de dias seguidos. */
(function (G) {
  'use strict';
  const F = G.Finn;
  const r1 = n => Math.round((+n || 0) * 10) / 10;

  const PRESETS = [
    { chave: 'agua', nome: 'Beber água', ic: 'copo', tipo: 'contagem', meta: 8, unidade: 'copos' },
    { chave: 'sono', nome: 'Dormir bem', ic: 'lua', tipo: 'horas', meta: 7, unidade: 'h' },
    { chave: 'treino', nome: 'Treinar', ic: 'haltere', tipo: 'sim', freq: 'semanal', vezes: 3 },
    { chave: 'caminhada', nome: 'Caminhar', ic: 'tenis', tipo: 'minutos', meta: 30, unidade: 'min' },
    { chave: 'leitura', nome: 'Ler', ic: 'livro', tipo: 'minutos', meta: 20, unidade: 'min' },
    { chave: 'meditar', nome: 'Meditar', ic: 'respirar', tipo: 'minutos', meta: 10, unidade: 'min' },
    { chave: 'vitamina', nome: 'Tomar vitamina', ic: 'pilula', tipo: 'sim', freq: 'diario' },
    { chave: 'semrefri', nome: 'Sem refrigerante', ic: 'copo', tipo: 'sim', freq: 'diario' },
  ];
  const TIPOS = { sim: 'Feito ou não', contagem: 'Contagem', minutos: 'Minutos', horas: 'Horas' };

  function novoHabito(o = {}) {
    const tipo = TIPOS[o.tipo] ? o.tipo : 'sim';
    const freq = o.freq === 'semanal' ? 'semanal' : 'diario';
    return {
      id: 'hb-' + F.uid(), nome: String(o.nome || 'Hábito').trim().slice(0, 50), ic: o.ic || 'check', tipo, chave: o.chave || '',
      meta: tipo === 'sim' ? 1 : Math.max(0.5, +o.meta || (tipo === 'horas' ? 7 : tipo === 'minutos' ? 20 : 8)),
      unidade: tipo === 'sim' ? '' : String(o.unidade || (tipo === 'horas' ? 'h' : tipo === 'minutos' ? 'min' : 'vezes')).slice(0, 12),
      freq, vezes: freq === 'semanal' ? Math.max(1, Math.min(7, +o.vezes || 3)) : null,
      lembrete: /^\d{2}:\d{2}$/.test(o.lembrete || '') ? o.lembrete : null, ordem: o.ordem ?? 99, criado: new Date().toISOString(),
    };
  }
  const ativos = D => (D.habitos || []).filter(h => !h.arquivado).sort((a, b) => (a.ordem ?? 99) - (b.ordem ?? 99) || String(a.criado).localeCompare(String(b.criado)));
  const nrm = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
  const SIN = { agua: ['agua', 'copo', 'bebi', 'hidrat'], sono: ['dormi', 'sono', 'dorm', 'acordei'], treino: ['trein', 'academia', 'malhei', 'malhar', 'exercic', 'musculac'], leitura: ['li', 'ler', 'leitura', 'livro', 'pagina'], caminhada: ['caminh', 'andei', 'corri', 'corrid', 'passos'], meditar: ['medit', 'respira'], vitamina: ['vitamin', 'remedio', 'suplement'], semrefri: ['refri', 'refrigerante'] };
  function achar(D, txt) {
    const n = nrm(txt); if (!n) return null;
    const l = ativos(D), pal = n.split(' ').filter(w => w.length > 2);
    const pre = w => w.slice(0, 5);
    return l.find(h => nrm(h.nome) === n || h.chave === n)
      || l.find(h => h.chave && (SIN[h.chave] || []).some(s => s.length <= 3 ? n.split(' ').includes(s) : n.includes(s)))
      || l.find(h => nrm(h.nome).includes(n) || n.includes(nrm(h.nome)))
      || l.find(h => nrm(h.nome).split(' ').some(w => w.length > 3 && pal.some(p => pre(p) === pre(w)))) || null;
  }

  /* ---------- registros ---------- */
  const reg = (D, hid, dia) => (D.checkins || []).find(c => c.h === hid && c.d === dia) || null;
  const valor = (D, hid, dia) => { const c = reg(D, hid, dia); return c ? +c.v || 0 : 0; };
  function registrar(D, hid, { v = null, somar = null, dia = F.hoje(), nota } = {}) {
    const h = (D.habitos || []).find(x => x.id === hid); if (!h) return null;
    D.checkins = D.checkins || [];
    let c = reg(D, hid, dia);
    if (!c) { c = { id: 'ck-' + F.uid(), h: hid, d: dia, v: 0 }; D.checkins.push(c); }
    if (h.tipo === 'sim') c.v = v == null ? (c.v ? 0 : 1) : (+v ? 1 : 0);
    else if (somar != null) c.v = r1(Math.max(0, (+c.v || 0) + +somar));
    else c.v = r1(Math.max(0, +v || 0));
    if (nota !== undefined) c.nota = String(nota || '').slice(0, 80);
    if (!c.v && !c.nota) D.checkins = D.checkins.filter(x => x !== c);
    return c;
  }
  const ok = (h, v) => h.tipo === 'sim' ? v >= 1 : v >= h.meta;
  const segunda = dia => { const d = new Date(dia + 'T12:00:00'); const k = (d.getDay() + 6) % 7; return F.addDias(dia, -k); };
  function semanaDe(D, h, dia) { const ini = segunda(dia); let n = 0; for (let i = 0; i < 7; i++) { const d = F.addDias(ini, i); if (d > dia) break; if (ok(h, valor(D, h.id, d))) n++; } return n; }
  function progresso(D, h, dia = F.hoje()) {
    const v = valor(D, h.id, dia);
    if (h.freq === 'semanal') { const n = semanaDe(D, h, dia); return { v, ok: ok(h, v), semana: n, metaSemana: h.vezes, pct: Math.min(100, Math.round(n / h.vezes * 100)), feitoSemana: n >= h.vezes }; }
    return { v, ok: ok(h, v), pct: h.tipo === 'sim' ? (v ? 100 : 0) : Math.min(100, Math.round(v / h.meta * 100)) };
  }
  // dias (ou semanas) seguidos cumprindo a meta; o dia de hoje só conta quando já foi cumprido
  function sequencia(D, h, ref = F.hoje()) {
    if (h.freq === 'semanal') {
      let n = 0, sem = segunda(ref);
      if (semanaDe(D, h, ref) >= h.vezes) n++;
      for (let i = 0; i < 104; i++) { sem = F.addDias(sem, -7); if (semanaDe(D, h, F.addDias(sem, 6)) >= h.vezes) n++; else break; }
      return { n, un: n === 1 ? 'semana' : 'semanas' };
    }
    let n = ok(h, valor(D, h.id, ref)) ? 1 : 0, d = ref;
    for (let i = 0; i < 400; i++) { d = F.addDias(d, -1); if (ok(h, valor(D, h.id, d))) n++; else break; }
    return { n, un: n === 1 ? 'dia' : 'dias' };
  }
  function melhorSequencia(D, h, ref = F.hoje()) {
    if (h.freq === 'semanal') return null;
    let melhor = 0, atual = 0;
    for (let i = 365; i >= 0; i--) { const d = F.addDias(ref, -i); if (ok(h, valor(D, h.id, d))) { atual++; melhor = Math.max(melhor, atual); } else atual = 0; }
    return melhor;
  }
  function dias(D, h, n = 7, ref = F.hoje()) { const out = []; for (let i = n - 1; i >= 0; i--) { const d = F.addDias(ref, -i); const v = valor(D, h.id, d); out.push({ dia: d, v, ok: ok(h, v) }); } return out; }
  function grade(D, h, semanas = 6, ref = F.hoje()) { // semanas de segunda a domingo, a última é a atual
    const ini = F.addDias(segunda(ref), -7 * (semanas - 1)); const out = [];
    for (let s = 0; s < semanas; s++) { const linha = []; for (let k = 0; k < 7; k++) { const d = F.addDias(ini, s * 7 + k); const v = d > ref ? null : valor(D, h.id, d); linha.push({ dia: d, v, ok: v != null && ok(h, v), futuro: d > ref }); } out.push(linha); }
    return out;
  }
  function media(D, h, n = 7, ref = F.hoje()) { const vs = dias(D, h, n, F.addDias(ref, 0)).map(x => x.v).filter(v => v > 0); return vs.length ? r1(vs.reduce((s, v) => s + v, 0) / vs.length) : null; }
  const fmtV = (h, v) => h.tipo === 'sim' ? (v ? 'feito' : 'não') : h.tipo === 'horas' ? `${String(r1(v)).replace('.', ',')} h` : `${String(r1(v)).replace('.', ',')} ${h.unidade}`;
  const metaTxt = h => h.freq === 'semanal' ? `${h.vezes}× por semana` : h.tipo === 'sim' ? 'todo dia' : `${String(h.meta).replace('.', ',')} ${h.tipo === 'horas' ? 'h' : h.unidade} por dia`;
  function horasDeSono(dormiu, acordou) {
    const m = s => { const [a, b] = String(s || '').split(':').map(Number); return a * 60 + (b || 0); };
    if (!/^\d{1,2}:\d{2}$/.test(dormiu || '') || !/^\d{1,2}:\d{2}$/.test(acordou || '')) return null;
    let d = m(acordou) - m(dormiu); if (d <= 0) d += 1440;
    return r1(d / 60);
  }
  function resumoHoje(D, ref = F.hoje()) {
    return ativos(D).map(h => { const p = progresso(D, h, ref), s = sequencia(D, h, ref); return { id: h.id, nome: h.nome, tipo: h.tipo, feito: h.freq === 'semanal' ? p.feitoSemana : p.ok, hoje: fmtV(h, p.v), meta: metaTxt(h), semana: h.freq === 'semanal' ? `${p.semana} de ${h.vezes}` : undefined, sequencia: `${s.n} ${s.un}` }; });
  }
  function podar(D, ref = F.hoje()) {
    const lim = F.addDias(ref, -400), ids = new Set((D.habitos || []).map(h => h.id));
    const antes = (D.checkins || []).length;
    D.checkins = (D.checkins || []).filter(c => c.d >= lim && ids.has(c.h));
    return antes - D.checkins.length;
  }

  /* ---------- ferramentas do Jarvis ---------- */
  const A = G.Agente;
  if (A && A.EXTRAS) {
    const S = (type, description, extra) => ({ type, ...(description ? { description } : {}), ...extra });
    const FERR = [
      { name: 'habitos_hoje', description: 'Como estão os hábitos e a saúde dele: o que já fez hoje, as metas, a semana do treino, dias seguidos e média de sono. Use para "bebi água suficiente?", "como estão meus hábitos?".' },
      { name: 'registrar_habito', description: 'Registra um hábito: "bebi 2 copos de água" (valor 2, soma), "treinei hoje", "dormi 6 horas", "li 30 minutos". Use a data de ontem se ele disser "ontem".',
        parameters: S('OBJECT', '', { properties: { habito: S('STRING', 'Nome do hábito (ex.: água, sono, treino, leitura)'), valor: S('NUMBER', 'Quantidade: copos, horas ou minutos. Para "feito" use 1.'), data: S('STRING', 'AAAA-MM-DD (padrão hoje)'), definir: S('BOOLEAN', 'true para trocar o valor do dia em vez de somar (ex.: sono)') }, required: ['habito'] }) },
      { name: 'criar_habito', description: 'Cria um hábito para acompanhar no app (com meta por dia ou vezes por semana).',
        parameters: S('OBJECT', '', { properties: { nome: S('STRING', 'Nome curto'), tipo: S('STRING', 'sim (feito/não), contagem, minutos ou horas', { enum: ['sim', 'contagem', 'minutos', 'horas'] }), meta: S('NUMBER', 'Meta por dia (contagem, minutos ou horas)'), unidade: S('STRING', 'Ex.: copos, páginas'), vezes_por_semana: S('INTEGER', 'Se a meta for semanal (ex.: treinar 3 vezes por semana)') }, required: ['nome', 'tipo'] }) },
    ];
    const dataOk = v => /^\d{4}-\d{2}-\d{2}$/.test(String(v || '')) ? String(v) : F.hoje();
    async function executar(nome, a, D) {
      if (nome === 'habitos_hoje') {
        const l = ativos(D); if (!l.length) return { habitos: [], dica: 'Nenhum hábito criado ainda. Ofereça criar (água, sono, treino).' };
        const sono = l.find(h => h.tipo === 'horas');
        return { hoje: F.hoje(), habitos: resumoHoje(D), media_sono_7_dias: sono ? media(D, sono, 7) : undefined };
      }
      if (nome === 'registrar_habito') {
        let h = achar(D, a.habito);
        if (!h) { const n = nrm(a.habito); const p = PRESETS.find(x => (SIN[x.chave] || []).some(s => s.length <= 3 ? n.split(' ').includes(s) : n.includes(s)) || nrm(x.nome).includes(n)); if (p) { h = novoHabito({ ...p, ordem: (D.habitos || []).length }); (D.habitos = D.habitos || []).push(h); } }
        if (!h) return { ok: false, erro: 'Não achei esse hábito. Pergunte se ele quer criar.' };
        const dia = dataOk(a.data);
        const definir = a.definir || h.tipo === 'horas';
        const c = registrar(D, h.id, h.tipo === 'sim' ? { v: a.valor == null ? 1 : a.valor, dia } : definir ? { v: a.valor ?? 0, dia } : { somar: a.valor ?? 1, dia });
        const p = progresso(D, h, dia), s = sequencia(D, h, dia);
        return { ok: true, habito: h.nome, dia, valor_do_dia: fmtV(h, c ? c.v : 0), meta: metaTxt(h), cumpriu: h.freq === 'semanal' ? p.feitoSemana : p.ok, semana: h.freq === 'semanal' ? `${p.semana} de ${h.vezes}` : undefined, sequencia: `${s.n} ${s.un}` };
      }
      if (nome === 'criar_habito') {
        const ja = achar(D, a.nome); if (ja && nrm(ja.nome) === nrm(a.nome)) return { ok: false, erro: 'Esse hábito já existe.' };
        const p = PRESETS.find(x => (SIN[x.chave] || []).some(s => nrm(a.nome).includes(s))) || {};
        const h = novoHabito({ ic: p.ic, chave: p.chave, nome: a.nome, tipo: a.tipo, meta: a.meta, unidade: a.unidade, freq: a.vezes_por_semana ? 'semanal' : 'diario', vezes: a.vezes_por_semana, ordem: (D.habitos || []).length });
        (D.habitos = D.habitos || []).push(h);
        return { ok: true, habito: h.nome, meta: metaTxt(h) };
      }
      return { erro: 'Ferramenta desconhecida' };
    }
    function contexto(D) {
      const l = resumoHoje(D); if (!l.length) return '';
      return `HÁBITOS E SAÚDE (hoje)\n${l.map(x => `- ${x.nome}: ${x.semana ? x.semana + ' nesta semana' : x.hoje} (meta ${x.meta}; ${x.sequencia} seguidos)`).join('\n')}\n- "Bebi/treinei/dormi/li…" → registrar_habito. Comemore sequências, sem exagero. Não dê conselho médico; para dor ou sintoma, sugira procurar um profissional.`;
    }
    A.EXTRAS.push({ ferramentas: FERR, executar, contexto });
  }

  const API = { PRESETS, TIPOS, novoHabito, ativos, achar, registrar, valor, ok, progresso, sequencia, melhorSequencia, dias, grade, media, fmtV, metaTxt, horasDeSono, resumoHoje, podar, segunda };
  G.Habitos = API;
  if (typeof module !== 'undefined') module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
