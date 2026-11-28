/* Jarvis Finance — leitor de agenda no formato iCal (.ics): Google Agenda, iCloud, Outlook.
   Entende eventos de dia inteiro, fusos horários, repetições (RRULE), exceções (EXDATE) e
   ocorrências alteradas (RECURRENCE-ID). Roda igual no app do computador e no navegador. */
(function (G) {
  'use strict';
  const FUSO_PADRAO = 'America/Sao_Paulo';
  // nomes de fuso do Windows/Outlook que aparecem em alguns .ics
  const WINDOWS = {
    'E. South America Standard Time': 'America/Sao_Paulo', 'SA Western Standard Time': 'America/Manaus', 'SA Eastern Standard Time': 'America/Fortaleza',
    'Bahia Standard Time': 'America/Bahia', 'Central Brazilian Standard Time': 'America/Cuiaba', 'Tocantins Standard Time': 'America/Araguaina',
    'UTC': 'UTC', 'GMT Standard Time': 'Europe/London', 'W. Europe Standard Time': 'Europe/Berlin', 'Romance Standard Time': 'Europe/Paris',
    'Eastern Standard Time': 'America/New_York', 'Central Standard Time': 'America/Chicago', 'Mountain Standard Time': 'America/Denver', 'Pacific Standard Time': 'America/Los_Angeles',
    'Argentina Standard Time': 'America/Argentina/Buenos_Aires', 'Pacific SA Standard Time': 'America/Santiago', 'Tokyo Standard Time': 'Asia/Tokyo',
  };
  const pad = n => String(n).padStart(2, '0');

  /* ---------- fusos ---------- */
  const fmtCache = new Map();
  function fusoValido(tz) {
    if (!tz) return null;
    tz = WINDOWS[tz] || String(tz).replace(/^\/[^/]*\/[^/]*\//, ''); // alguns geradores usam "/mozilla.org/20050126_1/America/Sao_Paulo"
    try { new Intl.DateTimeFormat('en-US', { timeZone: tz }); return tz; } catch { return null; }
  }
  function partes(tz, ms) {
    let f = fmtCache.get(tz);
    if (!f) { f = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' }); fmtCache.set(tz, f); }
    const o = {}; for (const p of f.formatToParts(new Date(ms))) o[p.type] = p.value;
    return { a: +o.year, m: +o.month, d: +o.day, h: +o.hour % 24, mi: +o.minute, s: +o.second };
  }
  const deslocamento = (tz, ms) => { const p = partes(tz, ms); return (Date.UTC(p.a, p.m - 1, p.d, p.h, p.mi, p.s) - Math.floor(ms / 1000) * 1000) / 60000; };
  function localParaUtc(a, m, d, h, mi, s, tz) {
    if (tz === 'UTC') return Date.UTC(a, m - 1, d, h, mi, s);
    const chute = Date.UTC(a, m - 1, d, h, mi, s);
    const o1 = deslocamento(tz, chute); let t = chute - o1 * 60000;
    const o2 = deslocamento(tz, t); if (o2 !== o1) t = chute - o2 * 60000;
    return t;
  }
  const dataLocal = (ms, tz) => { const p = partes(tz, ms); return `${p.a}-${pad(p.m)}-${pad(p.d)}`; };

  /* ---------- leitura do texto ---------- */
  const desescapar = v => String(v).replace(/\\n/gi, '\n').replace(/\\([,;\\])/g, '$1');
  function propriedade(linha) {
    // NOME;PARAM=VAL;PARAM="a:b":valor (os dois-pontos dentro de aspas não contam)
    let i = 0, aspas = false;
    for (; i < linha.length; i++) { const c = linha[i]; if (c === '"') aspas = !aspas; else if (c === ':' && !aspas) break; }
    const cab = linha.slice(0, i), valor = linha.slice(i + 1);
    const pedacos = []; let atual = ''; aspas = false;
    for (const c of cab) { if (c === '"') { aspas = !aspas; continue; } if (c === ';' && !aspas) { pedacos.push(atual); atual = ''; } else atual += c; }
    pedacos.push(atual);
    const params = {};
    for (const p of pedacos.slice(1)) { const k = p.indexOf('='); if (k > 0) params[p.slice(0, k).toUpperCase()] = p.slice(k + 1); }
    return { nome: pedacos[0].toUpperCase(), params, valor };
  }
  function blocos(txt) {
    const linhas = String(txt || '').replace(/\r\n?/g, '\n').replace(/\n[ \t]/g, '').split('\n');
    const cal = { tz: null, nome: '', eventos: [] };
    let ev = null, profundidade = 0;
    for (const l of linhas) {
      if (!l.trim()) continue;
      const p = propriedade(l);
      if (p.nome === 'BEGIN') { if (p.valor.toUpperCase() === 'VEVENT' && !ev) { ev = { props: {}, multi: {} }; profundidade = 0; } else if (ev) profundidade++; continue; }
      if (p.nome === 'END') { if (ev && p.valor.toUpperCase() === 'VEVENT' && profundidade === 0) { cal.eventos.push(ev); ev = null; } else if (ev) profundidade--; continue; }
      if (ev) { if (profundidade > 0) continue; if (p.nome === 'EXDATE' || p.nome === 'RDATE') (ev.multi[p.nome] = ev.multi[p.nome] || []).push(p); else ev.props[p.nome] = p; }
      else if (p.nome === 'X-WR-TIMEZONE') cal.tz = p.valor.trim();
      else if (p.nome === 'X-WR-CALNAME') cal.nome = desescapar(p.valor).trim();
    }
    return cal;
  }

  /* data/hora de uma propriedade -> { ms, diaInteiro, a, m, d, h, mi, s, tz } */
  function lerData(p, tzCal) {
    if (!p) return null;
    const v = String(p.valor).trim();
    const md = v.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?$/);
    if (!md) return null;
    const [, a, m, d, h, mi, s, z] = md;
    if (!h || (p.params.VALUE || '').toUpperCase() === 'DATE') return { diaInteiro: true, a: +a, m: +m, d: +d, h: 0, mi: 0, s: 0, ms: Date.UTC(+a, +m - 1, +d), tz: 'UTC' };
    const tz = z ? 'UTC' : (fusoValido(p.params.TZID) || fusoValido(tzCal) || FUSO_PADRAO);
    return { diaInteiro: false, a: +a, m: +m, d: +d, h: +h, mi: +mi, s: +(s || 0), ms: localParaUtc(+a, +m, +d, +h, +mi, +(s || 0), tz), tz };
  }
  function duracaoMs(v) {
    const m = String(v || '').match(/^([+-])?P(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/);
    if (!m) return null;
    const ms = ((+m[2] || 0) * 7 * 864e5) + ((+m[3] || 0) * 864e5) + ((+m[4] || 0) * 36e5) + ((+m[5] || 0) * 6e4) + ((+m[6] || 0) * 1e3);
    return m[1] === '-' ? -ms : ms;
  }

  /* ---------- repetições (RRULE) ---------- */
  const DIAS = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 };
  function regra(txt) {
    const r = {};
    for (const par of String(txt || '').split(';')) { const [k, v] = par.split('='); if (k && v != null) r[k.toUpperCase()] = v; }
    if (!r.FREQ) return null;
    return {
      freq: r.FREQ.toUpperCase(), intervalo: Math.max(1, parseInt(r.INTERVAL, 10) || 1), count: r.COUNT ? parseInt(r.COUNT, 10) : null, until: r.UNTIL || null,
      byday: r.BYDAY ? r.BYDAY.split(',').map(x => { const m = x.trim().toUpperCase().match(/^([+-]?\d+)?(SU|MO|TU|WE|TH|FR|SA)$/); return m ? { n: m[1] ? parseInt(m[1], 10) : 0, dia: DIAS[m[2]] } : null; }).filter(Boolean) : null,
      bymonthday: r.BYMONTHDAY ? r.BYMONTHDAY.split(',').map(x => parseInt(x, 10)).filter(x => x) : null,
      bymonth: r.BYMONTH ? r.BYMONTH.split(',').map(x => parseInt(x, 10)).filter(x => x >= 1 && x <= 12) : null,
      wkst: DIAS[(r.WKST || 'MO').toUpperCase()] ?? 1,
    };
  }
  const diasNoMes = (a, m) => new Date(Date.UTC(a, m, 0)).getUTCDate();
  const diaSemana = (a, m, d) => new Date(Date.UTC(a, m - 1, d)).getUTCDay();
  const somaDias = (a, m, d, n) => { const t = new Date(Date.UTC(a, m - 1, d + n)); return [t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate()]; };
  const chaveDia = (a, m, d) => a * 10000 + m * 100 + d;
  // dias do mês que batem com BYDAY (com ordinal: 2MO = segunda segunda; -1FR = última sexta)
  function diasPorByday(a, m, byday) {
    const n = diasNoMes(a, m), out = [];
    for (const b of byday) {
      const todos = []; for (let d = 1; d <= n; d++) if (diaSemana(a, m, d) === b.dia) todos.push(d);
      if (!b.n) out.push(...todos); else { const x = b.n > 0 ? todos[b.n - 1] : todos[todos.length + b.n]; if (x) out.push(x); }
    }
    return [...new Set(out)].sort((x, y) => x - y);
  }
  function diasPorMonthday(a, m, lista) {
    const n = diasNoMes(a, m);
    return [...new Set(lista.map(x => x > 0 ? x : n + x + 1).filter(x => x >= 1 && x <= n))].sort((x, y) => x - y);
  }
  /* datas locais (a, m, d) de cada ocorrência, em ordem, até passar do fim */
  function* datasDaRegra(ini, r, fimChave) {
    const [a0, m0, d0] = [ini.a, ini.m, ini.d];
    const LIM = 3000;
    if (r.freq === 'DAILY') {
      let [a, m, d] = [a0, m0, d0];
      for (let i = 0; i < LIM * 10; i++) {
        if (chaveDia(a, m, d) > fimChave) return;
        if ((!r.bymonth || r.bymonth.includes(m)) && (!r.byday || r.byday.some(b => b.dia === diaSemana(a, m, d))) && (!r.bymonthday || diasPorMonthday(a, m, r.bymonthday).includes(d))) yield [a, m, d];
        [a, m, d] = somaDias(a, m, d, r.intervalo);
      }
    } else if (r.freq === 'WEEKLY') {
      const dias = r.byday ? r.byday.map(b => b.dia) : [diaSemana(a0, m0, d0)];
      const recuo = (diaSemana(a0, m0, d0) - r.wkst + 7) % 7;
      let [a, m, d] = somaDias(a0, m0, d0, -recuo); // começo da semana
      for (let i = 0; i < LIM; i++) {
        const semana = [];
        for (let k = 0; k < 7; k++) { const x = somaDias(a, m, d, k); if (dias.includes(diaSemana(...x)) && (!r.bymonth || r.bymonth.includes(x[1]))) semana.push(x); }
        for (const x of semana) { if (chaveDia(...x) < chaveDia(a0, m0, d0)) continue; if (chaveDia(...x) > fimChave) return; yield x; }
        [a, m, d] = somaDias(a, m, d, 7 * r.intervalo);
        if (chaveDia(a, m, d) > fimChave) return;
      }
    } else if (r.freq === 'MONTHLY') {
      let a = a0, m = m0;
      for (let i = 0; i < LIM; i++) {
        let lista;
        if (r.bymonthday) lista = diasPorMonthday(a, m, r.bymonthday);
        else if (r.byday) lista = diasPorByday(a, m, r.byday);
        else lista = d0 <= diasNoMes(a, m) ? [d0] : [];
        if (r.bymonthday && r.byday) lista = lista.filter(d => r.byday.some(b => b.dia === diaSemana(a, m, d)));
        if (!r.bymonth || r.bymonth.includes(m)) for (const d of lista) { if (chaveDia(a, m, d) < chaveDia(a0, m0, d0)) continue; if (chaveDia(a, m, d) > fimChave) return; yield [a, m, d]; }
        m += r.intervalo; while (m > 12) { m -= 12; a++; }
        if (chaveDia(a, m, 1) > fimChave) return;
      }
    } else if (r.freq === 'YEARLY') {
      let a = a0;
      for (let i = 0; i < 400; i++) {
        const meses = r.bymonth || [m0];
        for (const m of meses) {
          let lista;
          if (r.bymonthday) lista = diasPorMonthday(a, m, r.bymonthday);
          else if (r.byday) lista = diasPorByday(a, m, r.byday);
          else lista = d0 <= diasNoMes(a, m) ? [d0] : [];
          for (const d of lista) { if (chaveDia(a, m, d) < chaveDia(a0, m0, d0)) continue; if (chaveDia(a, m, d) > fimChave) return; yield [a, m, d]; }
        }
        a += r.intervalo;
        if (chaveDia(a, 1, 1) > fimChave) return;
      }
    }
  }

  function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); }

  /* ---------- API ---------- */
  /* eventos(txt, { de: 'AAAA-MM-DD', ate: 'AAAA-MM-DD', tz }) -> lista de ocorrências dentro do período */
  function eventos(txt, { de, ate, tz = FUSO_PADRAO, calendario = '' } = {}) {
    const cal = blocos(txt);
    const tzSaida = fusoValido(tz) || FUSO_PADRAO;
    const iniJanela = localParaUtc(+de.slice(0, 4), +de.slice(5, 7), +de.slice(8, 10), 0, 0, 0, tzSaida);
    const fimJanela = localParaUtc(+ate.slice(0, 4), +ate.slice(5, 7), +ate.slice(8, 10), 23, 59, 59, tzSaida);
    const fimChave = +ate.replace(/-/g, '') + 1; // folga de um dia por causa dos fusos
    const nomeCal = calendario || cal.nome || '';
    // ocorrências alteradas (RECURRENCE-ID) substituem a original
    const alteradas = new Map();
    for (const e of cal.eventos) if (e.props['RECURRENCE-ID'] && e.props.UID) { const r = lerData(e.props['RECURRENCE-ID'], cal.tz); if (r) alteradas.set(e.props.UID.valor + '|' + r.ms, e); }
    const out = [], usadas = new Set();
    const montar = (e, ini, fimMs, uid) => {
      const st = (e.props.STATUS && e.props.STATUS.valor || '').toUpperCase();
      if (st === 'CANCELLED') return;
      const titulo = desescapar(e.props.SUMMARY ? e.props.SUMMARY.valor : '').trim() || '(sem título)';
      const base = { uid, titulo: titulo.slice(0, 200), local: desescapar(e.props.LOCATION ? e.props.LOCATION.valor : '').trim().slice(0, 160), calendario: nomeCal.slice(0, 60) };
      if (ini.diaInteiro) {
        const dIni = `${ini.a}-${pad(ini.m)}-${pad(ini.d)}`;
        const fimD = new Date(fimMs); const dFim = `${fimD.getUTCFullYear()}-${pad(fimD.getUTCMonth() + 1)}-${pad(fimD.getUTCDate())}`; // exclusivo
        if (dFim <= de || dIni > ate) return;
        out.push({ ...base, id: 'ev-' + hash(uid + '|' + dIni), diaInteiro: true, inicio: dIni, fim: dFim, data: dIni });
      } else {
        if (fimMs < iniJanela || ini.ms > fimJanela) return;
        const ultimoMs = Math.max(ini.ms, fimMs - 1); // um evento que acaba à meia-noite termina no dia anterior
        out.push({ ...base, id: 'ev-' + hash(uid + '|' + ini.ms), diaInteiro: false, inicio: new Date(ini.ms).toISOString(), fim: new Date(fimMs).toISOString(), data: dataLocal(ini.ms, tzSaida), dataFim: dataLocal(ultimoMs, tzSaida) });
      }
    };
    for (const e of cal.eventos) {
      if (e.props['RECURRENCE-ID']) continue;
      const ini = lerData(e.props.DTSTART, cal.tz); if (!ini) continue;
      const uid = e.props.UID ? e.props.UID.valor : hash(JSON.stringify(e.props.SUMMARY || '') + ini.ms);
      const fimP = lerData(e.props.DTEND, cal.tz);
      const dur = fimP ? fimP.ms - ini.ms : (duracaoMs(e.props.DURATION && e.props.DURATION.valor) ?? (ini.diaInteiro ? 864e5 : 0));
      const r = e.props.RRULE ? regra(e.props.RRULE.valor) : null;
      if (!r) { montar(e, ini, ini.ms + Math.max(0, dur), uid); continue; }
      const exc = new Set();
      for (const p of e.multi.EXDATE || []) for (const v of p.valor.split(',')) { const x = lerData({ valor: v, params: p.params }, cal.tz); if (x) exc.add(x.diaInteiro || ini.diaInteiro ? chaveDia(x.a, x.m, x.d) : x.ms); }
      let untilMs = null;
      if (r.until) { const u = lerData({ valor: r.until, params: {} }, cal.tz); if (u) untilMs = u.diaInteiro ? Date.UTC(u.a, u.m - 1, u.d, 23, 59, 59) : u.ms; }
      let n = 0;
      for (const [a, m, d] of datasDaRegra(ini, r, fimChave)) {
        const ms = ini.diaInteiro ? Date.UTC(a, m - 1, d) : localParaUtc(a, m, d, ini.h, ini.mi, ini.s, ini.tz);
        if (untilMs != null && ms > untilMs) break;
        n++;
        if (r.count && n > r.count) break;
        if (exc.has(ini.diaInteiro ? chaveDia(a, m, d) : ms)) continue;
        const alt = alteradas.get(uid + '|' + ms);
        if (alt) {
          usadas.add(uid + '|' + ms);
          const ai = lerData(alt.props.DTSTART, cal.tz) || { ...ini, a, m, d, ms };
          const af = lerData(alt.props.DTEND, cal.tz);
          montar(alt, ai, af ? af.ms : ai.ms + dur, uid);
        } else montar(e, { ...ini, a, m, d, ms }, ms + dur, uid);
      }
    }
    // ocorrências alteradas que não passaram pela regra (sem evento principal, ou movidas de uma data fora do período)
    for (const [k, alt] of alteradas) {
      if (usadas.has(k)) continue;
      const uid = k.slice(0, k.lastIndexOf('|'));
      const ai = lerData(alt.props.DTSTART, cal.tz); if (!ai) continue;
      const af = lerData(alt.props.DTEND, cal.tz);
      montar(alt, ai, af ? af.ms : ai.ms, uid);
    }
    const vistos = new Set();
    return out.filter(e => !vistos.has(e.id) && vistos.add(e.id)).sort((x, y) => (x.diaInteiro ? x.inicio + 'T00' : x.inicio).localeCompare(y.diaInteiro ? y.inicio + 'T00' : y.inicio) || x.titulo.localeCompare(y.titulo));
  }

  const API = { eventos, nomeCalendario: txt => blocos(txt).nome, ehIcal: txt => /BEGIN:VCALENDAR/i.test(String(txt || '').slice(0, 2000)), FUSO_PADRAO, localParaUtc, dataLocal };
  G.Ical = API;
  if (typeof module !== 'undefined') module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
