/* Jarvis Finance — tela Hábitos e saúde e o card "Hábitos de hoje" no Hoje (PC e iPhone).
   No PC também lembra, com uma notificação, do hábito que tem horário e ainda não foi feito. */
(function () {
  'use strict';
  const F = window.Finn, H = window.Habitos, V = window.Vida;
  const EXT = window.FinnExt = window.FinnExt || {};
  for (const k of ['telas', 'folhas', 'acoes', 'titulos', 'icones']) EXT[k] = EXT[k] || {};
  for (const k of ['aoIniciar', 'antesDeSalvar', 'alertas', 'aoMudar', 'ajustes', 'cartoesHoje', 'prioridades']) EXT[k] = EXT[k] || [];
  const U = () => window.__ui;
  const $ = (s, r = document) => r.querySelector(s);
  const esc = s => F.esc(s);

  Object.assign(EXT.icones, {
    copo: '<path d="M6 4h12l-1.6 15.2a1.5 1.5 0 0 1-1.5 1.3H9.1a1.5 1.5 0 0 1-1.5-1.3z"/><path d="M6.6 9.5c2.2-1 3.7 1 5.4 0s3.3-1 5.4 0"/>',
    haltere: '<path d="M6.5 7.5v9M17.5 7.5v9M3.5 10v4M20.5 10v4M6.5 12h11"/>',
    tenis: '<path d="M3.5 16.5c0-3 1-6.5 2-9l3 1.2c.4 1.8 1.6 2.8 3.4 3.1l5.6 1A3.5 3.5 0 0 1 20.5 16v.5a1.5 1.5 0 0 1-1.5 1.5H5a1.5 1.5 0 0 1-1.5-1.5z"/><path d="M3.8 14.5h16.5M9.5 11l1.3-1.6M12 12l1.2-1.6"/>',
    respirar: '<path d="M4 9.5h10.5a2.5 2.5 0 1 0-2.5-2.5M4 14h14.5a2.5 2.5 0 1 1-2.5 2.5M4 11.8h7"/>',
    pilula: '<rect x="3" y="8.5" width="18" height="7" rx="3.5" transform="rotate(-35 12 12)"/><path d="m9.2 8 5.6 8"/>',
    fogo: '<path d="M12 21a6 6 0 0 0 6-6c0-3.4-2.3-5.4-3.5-8.1-.4 1.8-1.2 3-2.5 3.6.3-2.9-.6-5.3-2.7-7.5.2 3.4-1.9 5.4-3.3 7.5A7.3 7.3 0 0 0 6 15a6 6 0 0 0 6 6z"/><path d="M12 21a2.5 2.5 0 0 1-2.5-2.5c0-1.5 1.3-2.4 2.5-3.9 1.2 1.5 2.5 2.4 2.5 3.9A2.5 2.5 0 0 1 12 21z"/>',
  });
  EXT.titulos.habitos = 'Hábitos e saúde';

  const naTela = () => U() && U().M.tela === 'habitos' && !U().M.folha;
  const redesenhar = () => { const ui = U(); if (!ui || ui.M.folha) return; if (ui.M.tela === 'habitos') { const t = $('#tela'), y = t ? t.scrollTop : 0; telaHabitos(); if (t) t.scrollTop = y; } else if (ui.M.tela === 'hoje') { const c = $('.habitos-card'); if (c) c.outerHTML = cardHoje(); } };
  const DS = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'];
  const diaSem = iso => DS[(new Date(iso + 'T12:00:00').getDay() + 6) % 7];
  const vtxt = v => String(Math.round(v * 10) / 10).replace('.', ',');

  /* ---------- pedaços ---------- */
  function controle(h, compacto = false) {
    const ui = U(), p = H.progresso(ui.D, h), v = p.v;
    if (h.tipo === 'sim') return `<button class="hb-feito ${p.ok ? 'on' : ''}" data-acao="hb-marcar" data-v="${h.id}" aria-pressed="${p.ok}" aria-label="${p.ok ? 'Desmarcar' : 'Marcar como feito hoje'}">${ui.ic(p.ok ? 'tarefa' : 'caixa')}${compacto ? '' : `<span>${p.ok ? 'Feito hoje' : 'Marcar hoje'}</span>`}</button>`;
    if (h.tipo === 'contagem') return `<div class="hb-cont"><button class="redondo peq" data-acao="hb-somar" data-v="${h.id}" data-n="-1" aria-label="Menos um" ${v ? '' : 'disabled'}>−</button><b>${vtxt(v)}<small>/${vtxt(h.meta)}</small></b><button class="redondo peq hb-mais" data-acao="hb-somar" data-v="${h.id}" data-n="1" aria-label="Mais um">${ui.ic('mais')}</button></div>`;
    if (h.tipo === 'horas') return `<button class="hb-valor" data-acao="hb-sono" data-v="${h.id}">${v ? `<b>${vtxt(v)} h</b>` : '<span>Registrar</span>'}</button>`;
    return `<div class="hb-cont"><b>${vtxt(v)}<small> ${esc(h.unidade)}</small></b><button class="redondo peq hb-mais" data-acao="hb-somar" data-v="${h.id}" data-n="${h.meta >= 30 ? 15 : 10}" aria-label="Mais ${h.meta >= 30 ? 15 : 10} ${esc(h.unidade)}">+${h.meta >= 30 ? 15 : 10}</button><button class="redondo peq" data-acao="hb-valor" data-v="${h.id}" aria-label="Escrever o valor">${ui.ic('lapis')}</button></div>`;
  }
  function seqChip(h) { const s = H.sequencia(U().D, h); return s.n ? `<span class="hb-seq" title="${s.n} ${s.un} seguidos">${U().ic('fogo')}${s.n}</span>` : ''; }
  function cardHabito(h) {
    const ui = U(), D = ui.D, p = H.progresso(D, h), ds = H.dias(D, h, 7);
    const barra = h.freq === 'semanal' ? `<div class="barra-uso meta-b"><i style="width:${p.pct}%"></i></div><small class="muted">${p.semana} de ${h.vezes} nesta semana</small>` : h.tipo !== 'sim' ? `<div class="barra-uso ${p.ok ? 'meta-b' : ''}"><i style="width:${p.pct}%"></i></div>` : '';
    return `<section class="card hb-card ${p.ok || p.feitoSemana ? 'ok' : ''}">
      <div class="hb-cab"><span class="hb-ic">${ui.ic(h.ic || 'check')}</span><div class="hb-nome"><b>${esc(h.nome)}</b><small>${esc(H.metaTxt(h))}${h.lembrete ? ' · lembrete ' + esc(h.lembrete) : ''}</small></div>${seqChip(h)}<button class="redondo peq" data-acao="hb-editar" data-v="${h.id}" aria-label="Editar ${esc(h.nome)}">${ui.ic('pontos')}</button></div>
      <div class="hb-hoje">${controle(h)}</div>${barra}
      <div class="hb-semana">${ds.map(d => `<span class="${d.ok ? 'ok' : d.v ? 'meio' : ''} ${d.dia === F.hoje() ? 'hj' : ''}" title="${esc(F.dataBR(d.dia))}: ${esc(H.fmtV(h, d.v))}"><i></i>${diaSem(d.dia)}</span>`).join('')}</div>
      <button class="btn link" data-acao="hb-hist" data-v="${h.id}">Histórico</button></section>`;
  }
  function telaHabitos() {
    const ui = U(), D = ui.D, l = H.ativos(D);
    const feitos = l.filter(h => { const p = H.progresso(D, h); return h.freq === 'semanal' ? p.ok || p.feitoSemana : p.ok; }).length;
    const topo = l.length ? `<section class="card largo hb-topo"><div class="rot">${ui.ic('fogo')} ${esc(V ? V.dataExtenso(F.hoje()).replace(/ de \d{4}$/, '') : F.dataBR(F.hoje()))}</div><div class="hb-resumo"><b>${feitos} de ${l.length}</b> ${l.length === 1 ? 'hábito' : 'hábitos'} em dia hoje</div>
      ${(() => { const faltam = H.PRESETS.map((p, k) => [p, k]).filter(([p]) => !l.some(h => h.chave === p.chave)).slice(0, 5); return faltam.length ? `<div class="chips hb-presets">${faltam.map(([p, k]) => `<button class="chip" data-acao="hb-preset" data-v="${k}">${ui.ic('mais')} ${esc(p.nome)}</button>`).join('')}</div>` : ''; })()}
      <div class="linha-btn"><button class="btn" data-acao="hb-novo">${ui.ic('mais')} Novo hábito</button></div></section>`
      : `<section class="card largo hb-topo"><div class="rot">${ui.ic('fogo')} Hábitos e saúde</div><p>Escolha o que quer acompanhar. Cada dia que você cumpre a meta aumenta a sequência.</p>
      <div class="chips">${H.PRESETS.map((p, k) => `<button class="chip" data-acao="hb-preset" data-v="${k}">${ui.ic('mais')} ${esc(p.nome)}${p.freq === 'semanal' ? ` <em>${p.vezes}×/sem</em>` : p.tipo !== 'sim' ? ` <em>${p.meta} ${p.unidade}</em>` : ''}</button>`).join('')}</div>
      <div class="linha-btn"><button class="btn" data-acao="hb-novo">Criar outro</button></div></section>`;
    $('#tela').innerHTML = `<div class="habitos"><div class="grade habitos-grade">${topo}${l.map(cardHabito).join('')}</div>${l.length ? '<p class="muted pequeno hb-rodape">O Jarvis também registra pela conversa: “bebi 2 copos de água”, “treinei hoje”, “dormi 6 horas”.</p>' : ''}</div>`;
  }
  function cardHoje() {
    const ui = U(), D = ui.D, l = H.ativos(D);
    if (!l.length) return `<section class="card habitos-card"><div class="rot">${ui.ic('fogo')} Hábitos de hoje</div><p class="muted pequeno">Água, sono, treino… acompanhe o que quiser, com dias seguidos.</p><button class="btn" data-ir="habitos">${ui.ic('mais')} Começar</button></section>`;
    return `<section class="card habitos-card"><div class="rot">${ui.ic('fogo')} Hábitos de hoje<span class="rot-acoes"><button class="btn link" data-ir="habitos">Ver tudo</button></span></div>
      <div class="hb-lista">${l.slice(0, 6).map(h => { const p = H.progresso(D, h); return `<div class="hb-linha ${p.ok || p.feitoSemana ? 'ok' : ''}"><span class="hb-ic">${ui.ic(h.ic || 'check')}</span><div class="hb-nome"><b>${esc(h.nome)}</b><small>${h.freq === 'semanal' ? `${p.semana} de ${h.vezes} na semana` : h.tipo === 'sim' ? (p.ok ? 'feito' : 'falta hoje') : `${esc(H.fmtV(h, p.v))} de ${vtxt(h.meta)}${h.tipo === 'horas' ? ' h' : ' ' + esc(h.unidade)}`}</small></div>${seqChip(h)}${controle(h, true)}</div>`; }).join('')}</div></section>`;
  }

  /* ---------- folhas ---------- */
  const cab = t => `<div class="folha-cab"><h3>${esc(t)}</h3><button class="redondo" data-acao="fechar" aria-label="Fechar">${U().ic('fechar')}</button></div>`;
  const form = (h = {}) => {
    const tipo = h.tipo || 'sim', freq = h.freq || 'diario';
    return `<label class="campo-rot">Nome<input id="hb-nome" value="${esc(h.nome || '')}" placeholder="Ex.: Beber água" autocomplete="off"></label>
      <label class="campo-rot">Como medir<select id="hb-tipo">${Object.entries(H.TIPOS).map(([k, n]) => `<option value="${k}" ${tipo === k ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
      <div class="dois-campos"><label class="campo-rot">Meta por dia<input id="hb-meta" inputmode="decimal" value="${esc(h.meta && tipo !== 'sim' ? vtxt(h.meta) : '')}" placeholder="8"></label><label class="campo-rot">Unidade<input id="hb-un" value="${esc(h.unidade || '')}" placeholder="copos, min, páginas" autocomplete="off"></label></div>
      <div class="dois-campos"><label class="campo-rot">Frequência<select id="hb-freq"><option value="diario" ${freq === 'diario' ? 'selected' : ''}>Todo dia</option><option value="semanal" ${freq === 'semanal' ? 'selected' : ''}>Vezes por semana</option></select></label><label class="campo-rot">Vezes por semana<input id="hb-vezes" inputmode="numeric" value="${esc(h.vezes || 3)}"></label></div>
      <label class="campo-rot">Lembrete no computador (opcional)<input id="hb-lembrete" type="time" value="${esc(h.lembrete || '')}"></label>`;
  };
  const lerForm = () => ({ nome: $('#hb-nome').value.trim(), tipo: $('#hb-tipo').value, meta: parseFloat(String($('#hb-meta').value).replace(',', '.')) || null, unidade: $('#hb-un').value.trim(), freq: $('#hb-freq').value, vezes: parseInt($('#hb-vezes').value, 10) || 3, lembrete: $('#hb-lembrete').value || null });
  EXT.folhas['hb-novo'] = () => `${cab('Novo hábito')}<div class="chips hb-presets">${H.PRESETS.map((p, k) => `<button class="chip" data-acao="hb-preset" data-v="${k}">${esc(p.nome)}</button>`).join('')}</div>${form()}<button class="btn pri largo" data-acao="hb-criar">Criar</button><small id="hb-msg" class="erro-msg"></small>`;
  EXT.folhas['hb-editar'] = f => { const h = (U().D.habitos || []).find(x => x.id === f.id); if (!h) return null; return `${cab(h.nome)}${form(h)}<div class="linha-btn"><button class="btn pri" data-acao="hb-salvar" data-v="${h.id}">Salvar</button><button class="btn perigo" data-acao="hb-arquivar" data-v="${h.id}">${U().ic('lixo')} Parar de acompanhar</button></div>`; };
  EXT.folhas['hb-sono'] = f => {
    const h = (U().D.habitos || []).find(x => x.id === f.id); if (!h) return null;
    return `${cab(h.nome)}<p class="muted pequeno">A noite de ontem para hoje conta para hoje.</p>
      <div class="dois-campos"><label class="campo-rot">Dormi às<input id="sn-dormiu" type="time" value="23:00"></label><label class="campo-rot">Acordei às<input id="sn-acordou" type="time" value="06:30"></label></div>
      <label class="campo-rot">Ou as horas direto<input id="sn-horas" inputmode="decimal" placeholder="Ex.: 7,5"></label>
      <div class="seg largo" id="sn-dia"><button class="on" data-acao="hb-sn-dia" data-v="hoje">Esta noite</button><button data-acao="hb-sn-dia" data-v="ontem">Noite anterior</button></div>
      <button class="btn pri largo" data-acao="hb-sono-salvar" data-v="${h.id}">Registrar</button><small id="sn-msg" class="erro-msg"></small>`;
  };
  EXT.folhas['hb-valor'] = f => { const ui = U(), h = (ui.D.habitos || []).find(x => x.id === f.id); if (!h) return null; return `${cab(h.nome)}<label class="campo-rot">Quanto hoje (${esc(h.unidade)})<input id="hv-valor" inputmode="decimal" value="${esc(vtxt(H.valor(ui.D, h.id, F.hoje())))}"></label><button class="btn pri largo" data-acao="hb-valor-salvar" data-v="${h.id}">Salvar</button>`; };
  EXT.folhas['hb-hist'] = f => {
    const ui = U(), D = ui.D, h = (D.habitos || []).find(x => x.id === f.id); if (!h) return null;
    const g = H.grade(D, h, 8), s = H.sequencia(D, h), m = H.melhorSequencia(D, h), med = h.tipo !== 'sim' ? H.media(D, h, 7) : null;
    return `${cab(h.nome)}<div class="tres"><div><small>Sequência</small><b>${s.n} ${s.un}</b></div>${m != null ? `<div><small>Melhor</small><b>${m} dia${m === 1 ? '' : 's'}</b></div>` : '<div></div>'}${med != null ? `<div><small>Média 7 dias</small><b>${esc(H.fmtV(h, med))}</b></div>` : '<div></div>'}</div>
      <div class="hb-grade" aria-label="Últimas 8 semanas"><div class="hb-grade-cab">${DS.map(d => `<span>${d}</span>`).join('')}</div>${g.map(l => `<div>${l.map(x => `<i class="${x.futuro ? 'fut' : x.ok ? 'ok' : x.v ? 'meio' : ''}" title="${esc(F.dataBR(x.dia))}${x.futuro ? '' : ': ' + esc(H.fmtV(h, x.v))}"></i>`).join('')}</div>`).join('')}</div>
      <p class="muted pequeno">Verde: meta cumprida. Claro: começou mas não completou.</p>`;
  };

  /* ---------- ações ---------- */
  const A = EXT.acoes;
  const salvarE = () => { U().salvar(); redesenhar(); };
  A['hb-marcar'] = v => { H.registrar(U().D, v, {}); salvarE(); const h = (U().D.habitos || []).find(x => x.id === v); if (h && H.progresso(U().D, h).ok) { const s = H.sequencia(U().D, h); if (s.n >= 2) U().aviso(`${h.nome}: ${s.n} ${s.un} seguidos`); } };
  A['hb-somar'] = (v, b) => { const ui = U(), h = (ui.D.habitos || []).find(x => x.id === v); if (!h) return; const antes = H.progresso(ui.D, h).ok; H.registrar(ui.D, v, { somar: +b.dataset.n || 1 }); salvarE(); if (!antes && H.progresso(ui.D, h).ok) ui.aviso(`Meta de hoje cumprida: ${h.nome}`); };
  A['hb-sono'] = v => U().abrirFolha({ tipo: 'hb-sono', id: v });
  A['hb-sn-dia'] = (v, b) => { [...b.parentNode.children].forEach(x => x.classList.toggle('on', x === b)); };
  A['hb-sono-salvar'] = v => {
    const ui = U(), dia = ($('#sn-dia .on') || {}).dataset && $('#sn-dia .on').dataset.v === 'ontem' ? F.addDias(F.hoje(), -1) : F.hoje();
    const direto = parseFloat(String($('#sn-horas').value).replace(',', '.'));
    const horas = direto > 0 ? direto : H.horasDeSono($('#sn-dormiu').value, $('#sn-acordou').value);
    if (!(horas > 0) || horas > 16) { $('#sn-msg').textContent = 'Confira os horários.'; return; }
    H.registrar(ui.D, v, { v: horas, dia, nota: direto > 0 ? '' : `${$('#sn-dormiu').value}–${$('#sn-acordou').value}` });
    ui.salvar(); ui.fecharFolha(); redesenhar(); ui.aviso(`${String(horas).replace('.', ',')} h de sono registradas`);
  };
  A['hb-valor'] = v => U().abrirFolha({ tipo: 'hb-valor', id: v });
  A['hb-valor-salvar'] = v => { const ui = U(); H.registrar(ui.D, v, { v: parseFloat(String($('#hv-valor').value).replace(',', '.')) || 0 }); ui.salvar(); ui.fecharFolha(); redesenhar(); };
  A['hb-hist'] = v => U().abrirFolha({ tipo: 'hb-hist', id: v });
  A['hb-novo'] = () => U().abrirFolha({ tipo: 'hb-novo' });
  A['hb-preset'] = v => {
    const ui = U(), p = H.PRESETS[+v]; if (!p) return;
    if (ui.M.folha && $('#hb-nome')) { $('#hb-nome').value = p.nome; $('#hb-tipo').value = p.tipo; $('#hb-meta').value = p.tipo === 'sim' ? '' : p.meta; $('#hb-un').value = p.unidade || ''; $('#hb-freq').value = p.freq || 'diario'; $('#hb-vezes').value = p.vezes || 3; $('#hb-nome').dataset.preset = v; return; }
    if (H.ativos(ui.D).some(h => h.chave === p.chave)) { ui.aviso('Você já acompanha esse'); return; }
    (ui.D.habitos = ui.D.habitos || []).push(H.novoHabito({ ...p, ordem: (ui.D.habitos || []).length })); salvarE();
  };
  A['hb-criar'] = () => {
    const ui = U(), o = lerForm(); if (!o.nome) { $('#hb-msg').textContent = 'Dê um nome ao hábito.'; return; }
    const p = H.PRESETS[+($('#hb-nome').dataset.preset ?? -1)];
    (ui.D.habitos = ui.D.habitos || []).push(H.novoHabito({ ...o, ic: p && p.nome === o.nome ? p.ic : undefined, chave: p && p.nome === o.nome ? p.chave : '', ordem: ui.D.habitos.length }));
    ui.salvar(); ui.fecharFolha(); if (ui.M.tela !== 'habitos') ui.irPara('habitos'); else redesenhar();
  };
  A['hb-editar'] = v => U().abrirFolha({ tipo: 'hb-editar', id: v });
  A['hb-salvar'] = v => {
    const ui = U(), h = (ui.D.habitos || []).find(x => x.id === v); if (!h) return;
    const o = lerForm(), n = H.novoHabito({ ...h, ...o, ic: h.ic, chave: h.chave });
    Object.assign(h, { nome: n.nome || h.nome, tipo: n.tipo, meta: n.meta, unidade: n.unidade, freq: n.freq, vezes: n.vezes, lembrete: n.lembrete });
    ui.salvar(); ui.fecharFolha(); redesenhar();
  };
  A['hb-arquivar'] = v => { const ui = U(), h = (ui.D.habitos || []).find(x => x.id === v); if (!h || !ui.certeza(`Parar de acompanhar "${h.nome}"? O histórico fica guardado.`)) return; h.arquivado = true; ui.salvar(); ui.fecharFolha(); redesenhar(); };

  /* ---------- lembretes no PC ---------- */
  function lembrar() {
    const ui = U(); if (!ui || !ui.PC) return;
    const agora = new Date(), hh = agora.toTimeString().slice(0, 5), hj = F.hoje();
    for (const h of H.ativos(ui.D)) {
      if (!h.lembrete || hh < h.lembrete) continue;
      const [a, b] = h.lembrete.split(':').map(Number); if ((agora.getHours() * 60 + agora.getMinutes()) - (a * 60 + b) > 90) continue;
      const p = H.progresso(ui.D, h); if (p.ok || p.feitoSemana) continue;
      const k = `jarvis-hb-${h.id}-${hj}`; if (localStorage.getItem(k)) continue; localStorage.setItem(k, '1');
      const s = H.sequencia(ui.D, h);
      window.api.notificar(h.nome, s.n ? `Você está com ${s.n} ${s.un} seguidos. Não deixe passar hoje.` : h.tipo === 'contagem' ? `Hoje: ${vtxt(p.v)} de ${vtxt(h.meta)} ${h.unidade}.` : 'Ainda não marcado hoje.', 'habitos');
    }
  }

  /* ---------- registro ---------- */
  EXT.telas.habitos = telaHabitos;
  EXT.cartoesHoje.unshift(cardHoje);
  EXT.prioridades.push((D, hoje) => {
    if (new Date().getHours() < 20 || hoje !== F.hoje()) return [];
    const falta = H.ativos(D).filter(h => h.freq !== 'semanal' && !H.progresso(D, h).ok);
    if (!falta.length) return [];
    return [{ nivel: 'baixo', id: 'hb-falta', ic: 'fogo', ir: 'habitos', titulo: falta.length === 1 ? `Falta hoje: ${falta[0].nome}` : `Faltam ${falta.length} hábitos hoje`, texto: falta.slice(0, 3).map(h => h.nome + (h.tipo === 'contagem' ? ` (${vtxt(H.valor(D, h.id, F.hoje()))}/${vtxt(h.meta)})` : '')).join(', ') }];
  });
  EXT.antesDeSalvar.push(D => { H.podar(D); return 0; });
  EXT.aoIniciar.push(() => { const ui = U(); if (!ui.PC) return; setTimeout(lembrar, window.api.teste ? 800 : 30000); setInterval(lembrar, window.api.teste ? 1500 : 60e3); });
  window.__habitos = { telaHabitos, cardHoje, lembrar };
})();
