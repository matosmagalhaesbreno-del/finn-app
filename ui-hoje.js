/* Jarvis Finance — tela Hoje: o painel da sua vida (PC e iPhone).
   Briefing da manhã, o que pede atenção, agenda, tarefas, dinheiro, e-mails, clima, lição do dia e suas ferramentas.
   No PC também busca a agenda (iCal) e os e-mails (IMAP) e avisa o briefing com uma notificação. */
(function () {
  'use strict';
  const F = window.Finn, V = window.Vida, B = window.Biblioteca;
  const EXT = window.FinnExt = window.FinnExt || {};
  for (const k of ['telas', 'folhas', 'acoes', 'titulos', 'icones']) EXT[k] = EXT[k] || {};
  for (const k of ['aoIniciar', 'antesDeSalvar', 'alertas', 'aoMudar', 'ajustes']) EXT[k] = EXT[k] || [];
  const U = () => window.__ui;
  const $ = (s, r = document) => r.querySelector(s);
  const esc = s => F.esc(s);
  const { dinheiro } = F;

  Object.assign(EXT.icones, {
    sol: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4"/>',
    lua: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
    solnuvem: '<path d="M8 8.2a3.6 3.6 0 0 1 6.6-1.3"/><path d="M6.8 2.8v1.1M2.6 7h1.1M3.9 4l.8.8M10.6 4l-.8.8"/><path d="M7.5 19.5h9.8a3.4 3.4 0 0 0 .4-6.8 5 5 0 0 0-9.6 1.1 2.9 2.9 0 0 0-.6 5.7z"/>',
    chuva: '<path d="M7 15h10.5a3.7 3.7 0 0 0 .5-7.4 5.7 5.7 0 0 0-11 1.4A3 3 0 0 0 7 15z"/><path d="M8.5 18l-1 2.5M12.5 18l-1 2.5M16.5 18l-1 2.5"/>',
    neblina: '<path d="M4 8.5h16M3 12.5h18M5 16.5h14"/>', neve: '<path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9"/>',
    carteira: '<path d="M19.5 8V6a1.5 1.5 0 0 0-1.5-1.5H5.5A2 2 0 0 0 3.5 6.5v11a2 2 0 0 0 2 2h14a1 1 0 0 0 1-1V9a1 1 0 0 0-1-1H5.5a2 2 0 0 1-2-1.5"/><circle cx="16.5" cy="13.5" r="1.1"/>',
    envelope: '<rect x="3" y="5.5" width="18" height="13" rx="2"/><path d="m3.5 6.5 8.5 6.5 8.5-6.5"/>',
    conversa: '<path d="M20.5 12a8.5 8.5 0 0 1-12.4 7.5L3.5 20.5l1.1-4.3A8.5 8.5 0 1 1 20.5 12z"/>',
    som: '<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M15.5 9a4.5 4.5 0 0 1 0 6M18 6.5a8 8 0 0 1 0 11"/>',
    parar: '<rect x="6.5" y="6.5" width="11" height="11" rx="2.5"/>',
    caixa: '<rect x="4" y="4" width="16" height="16" rx="5"/>', tarefa: '<rect x="4" y="4" width="16" height="16" rx="5"/><path d="M8.5 12l2.5 2.5 4.5-5"/>',
    relogio: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    grade: '<rect x="4" y="4" width="6.5" height="6.5" rx="1.8"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.8"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.8"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.8"/>',
    externo: '<path d="M14 4.5h5.5V10M19.5 4.5 11 13M18 14v4.5a1 1 0 0 1-1 1H5.5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1H10"/>',
    globo: '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.5 2.6 3.5 5.4 3.5 8.5s-1 5.9-3.5 8.5c-2.5-2.6-3.5-5.4-3.5-8.5s1-5.9 3.5-8.5z"/>',
    exclamacao: '<path d="M12 5v9M12 18.5v.5"/>',
  });
  EXT.titulos.hoje = 'Hoje';

  const ST = { gerando: false, falando: false, clima: null, climaErro: false, todasTarefas: false, quando: 'hoje', alta: false, agenda: null, agendaOcupada: false, email: null, emailOcupado: false, tentouBriefing: '', licaoExtra: 0 };
  const pad = n => String(n).padStart(2, '0');
  // no celular, mexer no perfil antes da primeira sincronização apagaria o que veio do PC
  const perfilPronto = () => { const ui = U(); if (ui.PC || !ui.N.ligada() || ui.N.ultima) return true; ui.aviso('Espere o Jarvis terminar de sincronizar e tente de novo.'); return false; };
  const cfgBriefing = () => ({ hora: '07:00', notificar: true, emails: true, ...(F.perfil(U().D).briefing || {}) });
  const naTela = () => U() && U().M.tela === 'hoje' && !U().M.folha;
  const redesenhar = () => { if (naTela()) { const t = $('#tela'), y = t ? t.scrollTop : 0; telaHoje(); if (t) t.scrollTop = y; } };

  /* ---------- pedaços ---------- */
  function cabecalho() {
    const ui = U(), p = F.perfil(ui.D), c = ST.clima;
    const data = V.dataExtenso(F.hoje()).replace(/ de \d{4}$/, '');
    const climaH = c ? `<button class="clima-chip" data-acao="hj-clima" title="${esc(c.cidade)}: ${esc(c.desc)}, máx ${c.max}° e mín ${c.min}°" aria-label="Clima em ${esc(c.cidade)}: ${c.temp} graus, ${esc(c.desc)}">${ui.ic(c.ic)}<b>${c.temp}°</b><span>${esc(c.desc)}<small>máx ${c.max}° · mín ${c.min}°${c.chuva != null ? ` · chuva ${c.chuva}%` : ''}</small></span></button>`
      : `<button class="clima-chip vazio" data-acao="hj-clima">${ui.ic('solnuvem')}<span>${ST.climaErro ? 'Clima indisponível' : 'Clima…'}</span></button>`;
    return `<div class="hoje-cab"><div class="hoje-ola"><small>${esc(data)}</small><h2>${ui.saudacao()}${p.nome ? ', ' + esc(p.nome) : ''}</h2></div>${climaH}</div>
      <form class="pergunte" id="hj-perg"><span class="avatar">${ui.ic('finn')}</span><input id="hj-perg-txt" placeholder="Pergunte ao Jarvis…" enterkeyhint="send" autocomplete="off" aria-label="Pergunte ao Jarvis"><button class="enviar" type="submit" aria-label="Perguntar">${ui.ic('enviar')}</button></form>`;
  }
  function cardBriefing() {
    const ui = U(), br = V.briefingDe(ui.D);
    const cab = `<div class="rot">${ui.ic('sol')} Briefing do dia${br ? `<span class="dica">${br.origem === 'ia' ? 'pelo Jarvis' : 'automático'} · ${ui.quando(br.geradoEm).split(' ')[1] || ''}</span>` : ''}
      <span class="rot-acoes">${br ? `<button class="redondo peq ${ST.falando ? 'on' : ''}" data-acao="hj-ouvir" aria-label="${ST.falando ? 'Parar' : 'Ouvir o briefing'}" title="${ST.falando ? 'Parar' : 'Ouvir'}">${ui.ic(ST.falando ? 'parar' : 'som')}</button>` : ''}<button class="redondo peq" data-acao="hj-briefing" aria-label="Gerar de novo" title="Gerar de novo" ${ST.gerando ? 'disabled' : ''}>${ui.ic('atualizar')}</button></span></div>`;
    if (ST.gerando) return `<section class="card briefing largo">${cab}<div class="progresso"><span class="giro"></span>O Jarvis está preparando o seu dia…</div></section>`;
    if (!br) return `<section class="card briefing largo">${cab}<p class="muted">O briefing sai todo dia às ${esc(cfgBriefing().hora)}${ui.PC ? ', com um aviso no computador' : ''}.</p><button class="btn pri" data-acao="hj-briefing">${ui.ic('finn')} Gerar o briefing de hoje</button></section>`;
    return `<section class="card briefing largo">${cab}<div class="briefing-txt">${ui.markdown(br.texto)}</div></section>`;
  }
  function cardAtencao() {
    const ui = U();
    const ps = V.prioridades(ui.D);
    if (!ps.length) return `<section class="card atencao"><div class="rot">${ui.ic('alerta')} Atenção hoje</div><p class="muted">Nada pedindo atenção agora. Bom dia para adiantar alguma coisa.</p></section>`;
    return `<section class="card atencao alertas"><div class="rot">${ui.ic('alerta')} Atenção hoje<span class="dica">${ps.length}</span></div><div class="alertas-grade">${ps.slice(0, 6).map(a => `<div class="alerta n-${a.nivel} toca" data-acao="hj-ir" data-v="${esc(a.ir || '')}" data-nota="${esc(a.nota || '')}" data-alvo="${esc(a.alvo || '')}" role="button" tabindex="0">${ui.ic(a.ic || 'alerta')}<div><b>${esc(a.titulo)}</b><p>${esc(a.texto || '')}</p></div>${ui.ic('dir', 'seta')}</div>`).join('')}</div></section>`;
  }
  function linhaEvento(e, agora) {
    const passou = !e.diaInteiro && new Date(e.fim) < agora;
    const hora = e.diaInteiro ? '<span class="ag-hora">dia todo</span>' : `<span class="ag-hora">${V.hhmm(e.inicio)}<small>${V.hhmm(e.fim)}</small></span>`;
    return `<div class="ag-linha ${passou ? 'passou' : ''} ${e.origem === 'manual' ? 'manual' : ''}">${hora}<span class="ag-barra"></span><div class="ls-txt"><b>${esc(e.titulo)}</b>${e.local || e.calendario ? `<small>${esc(e.local || e.calendario)}</small>` : ''}</div>${e.origem === 'manual' ? `<button class="redondo peq" data-acao="hj-ev-apagar" data-v="${esc(e.id)}" aria-label="Apagar compromisso">${U().ic('lixo')}</button>` : ''}</div>`;
  }
  function cardAgenda() {
    const ui = U(), D = ui.D, hoje = F.hoje(), agora = new Date();
    const evHoje = V.eventosDoDia(D, hoje), evAmanha = V.eventosDoDia(D, F.addDias(hoje, 1));
    const temCal = (D.agenda || []).some(e => e.origem !== 'manual') || (ST.agenda && ST.agenda.length);
    let h = `<section class="card agenda-card"><div class="rot">${ui.ic('calendario')} Agenda<span class="dica">hoje</span><span class="rot-acoes"><button class="redondo peq" data-acao="hj-compromisso" aria-label="Novo compromisso" title="Novo compromisso">${ui.ic('mais')}</button></span></div>`;
    h += evHoje.length ? evHoje.map(e => linhaEvento(e, agora)).join('') : '<p class="muted">Nada marcado para hoje.</p>';
    if (evAmanha.length) h += `<div class="rot sub">Amanhã</div>${evAmanha.slice(0, 3).map(e => linhaEvento(e, agora)).join('')}${evAmanha.length > 3 ? `<p class="muted pequeno">e mais ${evAmanha.length - 3}</p>` : ''}`;
    if (ui.PC) {
      if (ST.agenda && ST.agenda.length) h += `<div class="rodape-card linha-rodape"><span>${esc(ST.agenda.map(c => c.nome).join(', '))}${ST.agendaInfo ? ' · ' + esc(ST.agendaInfo) : ''}</span><button class="btn link" data-acao="hj-agenda">Calendários</button></div>`;
      else h += `<button class="btn" data-acao="hj-agenda">${ui.ic('calendario')} Conectar o Google Agenda</button>`;
    } else if (!temCal) h += `<p class="muted pequeno">Para ver o Google Agenda aqui, conecte no Jarvis do computador (Hoje → Agenda).</p>`;
    return h + '</section>';
  }
  function linhaTarefa(t, hoje) {
    const ui = U();
    const quando = t.feita ? 'feita' : !t.quando ? '' : t.quando < hoje ? (F.difDias(t.quando, hoje) === 1 ? 'ontem' : F.dataBR(t.quando).slice(0, 5)) : t.quando === hoje ? (t.hora || 'hoje') : t.quando === F.addDias(hoje, 1) ? 'amanhã' : F.dataBR(t.quando).slice(0, 5);
    return `<div class="tf-linha ${t.feita ? 'feita' : ''}"><button class="tf-check" data-acao="hj-tf-feita" data-v="${t.id}" aria-label="${t.feita ? 'Desmarcar' : 'Concluir'} ${esc(t.titulo)}">${ui.ic(t.feita ? 'tarefa' : 'caixa')}</button>
      <button class="tf-txt" data-acao="hj-tf-abrir" data-v="${t.id}"><b>${esc(t.titulo)}</b>${quando ? `<small class="${!t.feita && t.quando && t.quando < hoje ? 'vermelho' : ''}">${esc(quando)}</small>` : ''}</button>${t.prioridade === 'alta' && !t.feita ? `<span class="tf-alta" title="Importante">${ui.ic('exclamacao')}</span>` : ''}</div>`;
  }
  function cardTarefas() {
    const ui = U(), hoje = F.hoje(), t = V.tarefas(ui.D, hoje);
    const principais = [...t.atrasadas, ...t.hoje];
    const resto = [...t.semData, ...t.proximas];
    const mostrar = ST.todasTarefas ? [...principais, ...resto, ...t.feitasHoje] : [...principais, ...t.semData.filter(x => x.prioridade === 'alta')].slice(0, 7);
    const ocultas = principais.length + resto.length + t.feitasHoje.length - mostrar.length;
    return `<section class="card tarefas-card"><div class="rot">${ui.ic('tarefa')} Tarefas<span class="dica">${t.hoje.length + t.atrasadas.length ? `${t.hoje.length + t.atrasadas.length} para hoje` : 'nada para hoje'}</span></div>
      <form class="tf-add" id="hj-tf"><input id="hj-tf-txt" placeholder="Adicionar tarefa…" enterkeyhint="done" autocomplete="off" aria-label="Nova tarefa"><button class="redondo peq pri" type="submit" aria-label="Adicionar">${ui.ic('mais')}</button></form>
      <div class="tf-opcoes"><div class="seg">${[['hoje', 'Hoje'], ['amanha', 'Amanhã'], ['sem', 'Sem data']].map(([v, n]) => `<button type="button" class="${ST.quando === v ? 'on' : ''}" data-acao="hj-tf-quando" data-v="${v}">${n}</button>`).join('')}</div><button type="button" class="chip-alta ${ST.alta ? 'on' : ''}" data-acao="hj-tf-alta" aria-pressed="${ST.alta}">${ui.ic('exclamacao')} Importante</button></div>
      <div class="tf-lista">${mostrar.length ? mostrar.map(x => linhaTarefa(x, hoje)).join('') : '<p class="muted">Sem tarefas para hoje.</p>'}</div>
      ${ocultas > 0 || ST.todasTarefas ? `<button class="btn link" data-acao="hj-tf-todas">${ST.todasTarefas ? 'Mostrar menos' : `Ver todas (${ocultas} a mais)`}</button>` : ''}</section>`;
  }
  function cardDinheiro() {
    const ui = U(), D = ui.D, s = F.saldos(D), mes = F.hoje().slice(0, 7), rm = F.resumoMes(D, mes);
    let prox = '';
    if (window.Contas && (D.fixas || []).length) {
      try { const p = window.Contas.painel(D); const i = p.atrasadas[0] || p.proxima; if (i) { const d = F.difDias(F.hoje(), i.vencimento); prox = `<button class="cf-proxima" data-ir="contas">${ui.ic('recibo')}<span><b>${esc(window.Contas.nomeFixa(i.fixa))}</b> ${d < 0 ? 'venceu' : d === 0 ? 'vence hoje' : d === 1 ? 'vence amanhã' : 'vence em ' + d + ' dias'} · ${dinheiro(i.valor)}</span>${ui.ic('dir')}</button>`; } } catch {}
    }
    return `<section class="card dinheiro-card"><div class="rot">${ui.ic('carteira')} Dinheiro</div>
      <div class="grande menor">${dinheiro(s.total)}<small>nas contas</small></div>
      <div class="linha-valor"><span>${esc(F.nomeMes(mes).replace(/ de \d{4}/, ''))}</span><b class="pequeno-val"><span class="verde">+${dinheiro(rm.entradas)}</span> · −${dinheiro(rm.saidas)}</b></div>
      ${prox}<div class="linha-btn"><button class="btn" data-tela="inicio">Ver finanças</button></div></section>`;
  }
  function cardEmails() {
    const ui = U(), D = ui.D, ei = F.perfil(D).emailInfo;
    let h = `<section class="card emails-card"><div class="rot">${ui.ic('envelope')} E-mails${ei ? `<span class="dica">${ei.total} não lido${ei.total === 1 ? '' : 's'} · ${esc(ei.caixa)}</span>` : ''}${ui.PC && ei ? `<span class="rot-acoes"><button class="redondo peq" data-acao="hj-email-atualizar" aria-label="Conferir agora" ${ST.emailOcupado ? 'disabled' : ''}>${ui.ic('atualizar')}</button></span>` : ''}</div>`;
    if (!ei) return h + (ui.PC ? `<p class="muted">Veja aqui os não lidos da caixa principal, sem abrir o Gmail.</p><button class="btn" data-acao="hj-email">${ui.ic('envelope')} Conectar e-mail</button>` : '<p class="muted pequeno">Para ver os e-mails aqui, conecte no Jarvis do computador (Hoje → E-mails).</p>') + '</section>';
    const ems = D.emails || [];
    h += ems.length ? `<div class="em-lista">${ems.slice(0, 6).map(e => `<a class="em-linha" href="https://mail.google.com/mail/u/0/#inbox" target="_blank" rel="noopener"><div class="ls-txt"><b>${esc(e.de)}</b><small>${esc(e.assunto)}</small></div><span class="em-hora">${esc(F.difDias(e.data.slice(0, 10), F.hoje()) === 0 ? ui.quando(e.data).split(' ')[1] : ui.quando(e.data).split(' ')[0].slice(0, 5))}</span></a>`).join('')}</div>` : '<p class="muted">Nenhum e-mail novo. Caixa em dia.</p>';
    return h + `<div class="rodape-card">${ei.em ? 'Conferido ' + esc(ui.quando(ei.em)) : ''}${ui.PC ? '' : ' pelo computador'}</div></section>`;
  }
  function cardLicao() {
    const ui = U(), ls = B.licoes(ui.D);
    if (!ls.length) return `<section class="card licao-card"><div class="rot">${ui.ic('livro')} Da sua biblioteca</div><p class="muted">Guarde livros, vídeos e artigos na Biblioteca: o Jarvis traz uma lição por dia.</p><button class="btn" data-tela="biblioteca">Abrir a biblioteca</button></section>`;
    let l = B.licaoDoDia(ui.D);
    if (ST.licaoExtra) l = ls[(ls.indexOf(ls.find(x => x.texto === l.texto)) + ST.licaoExtra) % ls.length];
    return `<section class="card licao-card"><div class="rot">${ui.ic('livro')} Lição do dia<span class="rot-acoes"><button class="redondo peq" data-acao="hj-licao" aria-label="Outra lição" title="Outra">${ui.ic('atualizar')}</button></span></div>
      <blockquote>${esc(l.texto)}</blockquote><button class="btn link licao-fonte" data-acao="bb-abrir" data-v="${esc(l.item.id)}">— ${esc(l.item.titulo)}${l.item.autor ? ', ' + esc(l.item.autor) : ''}${l.grifo ? ' (seu grifo)' : ''}</button></section>`;
  }
  function conexoes() {
    const ui = U(), D = ui.D, M = ui.M, out = [];
    const belvo = ui.PC ? (M.belvo && M.belvo.conectado ? { ok: true, txt: `${(M.belvo.conexoes || []).length || ''} banco${(M.belvo.conexoes || []).length === 1 ? '' : 's'} pela Belvo`.trim() } : { ok: false, txt: 'Não conectado' }) : ((D.contas || []).some(c => c.origem === 'belvo') ? { ok: true, txt: 'Pelo computador' } : { ok: false, txt: 'Conecte no computador' });
    out.push({ nome: 'Bancos', ic: 'banco', ...belvo, ir: 'ajustes' });
    const forn = (D.fixas || []).filter(f => f.fornecedor && f.busca && f.busca.ligada);
    out.push({ nome: 'Contas da casa', ic: 'recibo', ok: forn.length > 0 && !forn.some(f => f.busca.estado === 'entrar'), txt: forn.length ? forn.map(f => window.Contas ? window.Contas.FORNECEDORES[f.fornecedor].nome : f.fornecedor).join(', ') : 'Busca automática desligada', ir: 'contas' });
    const cal = (D.agenda || []).some(e => e.origem !== 'manual') || (ST.agenda && ST.agenda.length);
    out.push({ nome: 'Agenda', ic: 'calendario', ok: !!cal, txt: cal ? (ST.agenda && ST.agenda.length ? ST.agenda.map(c => c.nome).join(', ') : 'Google Agenda') : 'Não conectada', acao: ui.PC ? 'hj-agenda' : null });
    const ei = F.perfil(D).emailInfo;
    out.push({ nome: 'E-mail', ic: 'envelope', ok: !!ei, txt: ei ? `${ST.email && ST.email.usuario ? ST.email.usuario : esc(ei.caixa)}` : 'Não conectado', acao: ui.PC ? 'hj-email' : null });
    out.push({ nome: 'IA do Jarvis', ic: 'finn', ok: !!M.iaOk, txt: M.iaOk ? 'Conectada' : 'Sem chave', ir: 'ajustes' });
    out.push({ nome: ui.PC ? 'iPhone e cofre (GitHub)' : 'Sincronização', ic: 'nuvem', ok: ui.N.ligada() && ui.N.estado !== 'erro', txt: ui.N.ligada() ? ({ ok: 'Sincronizado', sync: 'Sincronizando…', erro: 'Com erro', offline: 'Sem internet' }[ui.N.estado] || 'Ligado') : 'Desligado', ir: 'ajustes' });
    return out;
  }
  function cardFerramentas() {
    const ui = U(), D = ui.D;
    const at = D.atalhos || [];
    const href = a => (!ui.PC && /web\.whatsapp\.com/.test(a.url)) ? 'whatsapp://' : a.url;
    return `<section class="card ferramentas-card largo"><div class="rot">${ui.ic('grade')} Suas ferramentas</div>
      <div class="atalhos">${at.map(a => `<a class="atalho" href="${esc(href(a))}" target="_blank" rel="noopener"><span class="atalho-ic">${ui.ic(a.ic || 'globo')}</span><span>${esc(a.nome)}</span></a>`).join('')}<button class="atalho novo" data-acao="hj-atalho"><span class="atalho-ic">${ui.ic('mais')}</span><span>Atalho</span></button></div>
      <div class="conexoes">${conexoes().map(c => `<button class="cx-linha" ${c.acao ? `data-acao="${c.acao}"` : `data-tela="${c.ir}"`}><span class="ponto-verde ${c.ok ? '' : 'offline'}"></span>${ui.ic(c.ic)}<div class="ls-txt"><b>${esc(c.nome)}</b><small>${esc(c.txt)}</small></div>${ui.ic('dir', 'seta')}</button>`).join('')}</div>
      ${at.length ? '<button class="btn link" data-acao="hj-atalhos-editar">Editar atalhos</button>' : ''}</section>`;
  }

  function telaHoje() {
    const extras = (EXT.cartoesHoje || []).map(f => { try { return f() || ''; } catch (e) { console.error(e); return ''; } }).join('');
    const h = `<div class="hoje">${cabecalho()}<div class="grade hoje-grade">${cardBriefing()}${cardAtencao()}${cardAgenda()}${cardTarefas()}${extras}${cardDinheiro()}${cardEmails()}${cardLicao()}${cardFerramentas()}</div></div>`;
    $('#tela').innerHTML = h;
    if (!ST.clima && !ST.buscandoClima) buscarClima();
    briefingAutomatico();
  }

  /* ---------- clima ---------- */
  async function buscarClima(forcar = false) {
    ST.buscandoClima = true;
    try { ST.clima = await V.clima(U().D, { forcar }); ST.climaErro = false; } catch (e) { ST.climaErro = true; }
    finally { ST.buscandoClima = false; }
    const chip = $('.clima-chip'); if (chip && naTela()) chip.outerHTML = (cabecalho().match(/<button class="clima-chip[\s\S]*?<\/button>/) || [''])[0];
  }

  /* ---------- briefing ---------- */
  async function gerarBriefing() {
    if (ST.gerando) return;
    ST.gerando = true; redesenhar();
    try {
      const ui = U(); let clima = ST.clima; if (!clima) { try { clima = ST.clima = await V.clima(ui.D); } catch {} }
      const br = await V.gerarBriefing(ui.D, { A: ui.M.iaOk ? ui.A : null, climaDados: clima, comEmails: cfgBriefing().emails });
      V.guardarBriefing(ui.D, br); ui.salvar();
      return br;
    } finally { ST.gerando = false; redesenhar(); }
  }
  // abre o Hoje de manhã e ainda não tem briefing: o Jarvis já prepara
  function briefingAutomatico() {
    const ui = U(), hoje = F.hoje();
    if (ST.gerando || ST.tentouBriefing === hoje || V.briefingDe(ui.D, hoje) || new Date().getHours() < 5) return;
    // no celular, espera a primeira sincronização: o briefing do PC pode já estar a caminho
    if (!ui.PC && ui.N.ligada() && !ui.N.ultima) { clearTimeout(ST.tBr); ST.tBr = setTimeout(() => { if (naTela()) briefingAutomatico(); }, 3000); return; }
    ST.tentouBriefing = hoje;
    setTimeout(() => { if (!V.briefingDe(U().D, hoje)) gerarBriefing().catch(e => console.warn(e)); }, ui.PC ? 4000 : 2500);
  }
  // no PC, na hora marcada: garante o briefing e avisa com uma notificação
  async function checarHorario() {
    const ui = U(); if (!ui || !ui.PC) return;
    const cfg = cfgBriefing(), agora = new Date(), hh = `${pad(agora.getHours())}:${pad(agora.getMinutes())}`, hoje = F.hoje();
    if (hh < cfg.hora) return;
    if (!V.briefingDe(ui.D, hoje)) { if (ST.gerando) return; ST.tentouBriefing = hoje; await gerarBriefing().catch(() => null); }
    const br = V.briefingDe(ui.D, hoje);
    if (br && cfg.notificar && localStorage.getItem('jarvis-avisou-briefing') !== hoje) {
      localStorage.setItem('jarvis-avisou-briefing', hoje);
      const primeira = V.paraFala(br.texto).split(/(?<=[.!?])\s/)[0] || 'Seu briefing de hoje está pronto.';
      window.api.notificar(`Bom dia${F.perfil(ui.D).nome ? ', ' + F.perfil(ui.D).nome : ''}`, primeira.slice(0, 220), 'hoje');
    }
  }
  function ouvir() {
    const s = window.speechSynthesis, br = V.briefingDe(U().D);
    if (!s || !br) { U().aviso('Este aparelho não tem leitura em voz alta.'); return; }
    if (ST.falando || s.speaking) { s.cancel(); ST.falando = false; redesenhar(); return; }
    const u = new SpeechSynthesisUtterance(V.paraFala(br.texto)); u.lang = 'pt-BR'; u.rate = 1.03;
    const vozes = s.getVoices();
    const v = vozes.find(x => /pt[-_]BR/i.test(x.lang) && /Francisca|Thalita|Luciana|Maria|Natural|Google/i.test(x.name)) || vozes.find(x => /pt[-_]BR/i.test(x.lang)) || vozes.find(x => /^pt/i.test(x.lang));
    if (v) u.voice = v;
    u.onend = u.onerror = () => { ST.falando = false; redesenhar(); };
    ST.falando = true; s.speak(u); redesenhar();
  }

  /* ---------- agenda e e-mail (só no PC) ---------- */
  async function agendaAtualizar({ manual = false } = {}) {
    const ui = U(); if (!ui.PC || ST.agendaOcupada) return;
    ST.agendaOcupada = true;
    try {
      ST.agenda = await window.api.agendaConfig({});
      if (!ST.agenda.length) return;
      const r = await window.api.agendaBuscar();
      if (r.calendarios.some(c => c.ok)) { if (V.aplicarAgenda(ui.D, r.eventos)) ui.salvar(); ST.agendaInfo = 'atualizada ' + (ui.quando(r.em).split(' ')[1] || ''); }
      if (r.erros.length && manual) ui.aviso(r.erros[0], 'erro');
      else if (manual) ui.aviso('Agenda atualizada');
    } catch (e) { if (manual) ui.aviso(e.message, 'erro'); }
    finally { ST.agendaOcupada = false; redesenhar(); }
  }
  async function emailAtualizar({ manual = false } = {}) {
    const ui = U(); if (!ui.PC || ST.emailOcupado) return;
    ST.emailOcupado = true; if (manual) redesenhar();
    try {
      ST.email = await window.api.emailConfig({});
      if (!ST.email) return;
      const r = await window.api.emailBuscar();
      if (r) { V.aplicarEmails(ui.D, r); ui.salvar(); if (manual) ui.aviso(r.total ? `${r.total} não lido${r.total > 1 ? 's' : ''}` : 'Nenhum e-mail novo'); }
    } catch (e) { if (manual) ui.aviso(e.message, 'erro'); else console.warn('e-mail:', e.message); }
    finally { ST.emailOcupado = false; redesenhar(); }
  }

  /* ---------- folhas ---------- */
  const cab = (t) => `<div class="folha-cab"><h3>${esc(t)}</h3><button class="redondo" data-acao="fechar" aria-label="Fechar">${U().ic('fechar')}</button></div>`;
  EXT.folhas['hj-tarefa'] = f => {
    const t = (U().D.tarefas || []).find(x => x.id === f.id); if (!t) return null;
    return `${cab('Tarefa')}<label class="campo-rot">O que fazer<input id="tf-titulo" value="${esc(t.titulo)}" autocomplete="off"></label>
      <div class="dois-campos"><label class="campo-rot">Dia<input id="tf-quando" type="date" value="${esc(t.quando || '')}"></label><label class="campo-rot">Hora<input id="tf-hora" type="time" value="${esc(t.hora || '')}"></label></div>
      <label class="chk-linha"><input type="checkbox" id="tf-alta" ${t.prioridade === 'alta' ? 'checked' : ''}> Importante</label>
      <div class="linha-btn"><button class="btn pri" data-acao="hj-tf-salvar" data-v="${t.id}">Salvar</button><button class="btn perigo" data-acao="hj-tf-apagar" data-v="${t.id}">${U().ic('lixo')} Apagar</button></div>`;
  };
  EXT.folhas['hj-compromisso'] = () => `${cab('Novo compromisso')}
    <label class="campo-rot">O que é<input id="ev-titulo" placeholder="Ex.: Entrevista na TIM" autocomplete="off"></label>
    <div class="dois-campos"><label class="campo-rot">Dia<input id="ev-data" type="date" value="${F.hoje()}"></label><label class="campo-rot">Hora<input id="ev-hora" type="time"></label></div>
    <div class="dois-campos"><label class="campo-rot">Duração (min)<input id="ev-dur" inputmode="numeric" value="60"></label><label class="campo-rot">Onde<input id="ev-local" autocomplete="off"></label></div>
    <p class="muted pequeno">Fica na agenda do Jarvis (aparece no PC e no iPhone). Ele não muda o seu Google Agenda.</p>
    <button class="btn pri largo" data-acao="hj-ev-salvar">Adicionar</button>`;
  EXT.folhas['hj-agenda'] = () => {
    const ui = U(), l = ST.agenda || [];
    return `${cab('Agenda')}
      ${l.length ? `<div class="lista-simples">${l.map((c, i) => `<div class="ls-linha">${ui.ic('calendario')}<div class="ls-txt"><b>${esc(c.nome)}</b><small>${esc(c.endereco)}</small></div><button class="redondo peq" data-acao="hj-agenda-tirar" data-v="${i}" aria-label="Remover">${ui.ic('lixo')}</button></div>`).join('')}</div><div class="linha-btn"><button class="btn" data-acao="hj-agenda-atualizar" ${ST.agendaOcupada ? 'disabled' : ''}>${ui.ic('atualizar')} Atualizar agora</button></div><div class="rot sub">Adicionar outra agenda</div>` : `<p>O Jarvis lê a sua agenda pelo <b>endereço secreto no formato iCal</b>. É só leitura: ele não muda nada lá.</p>`}
      <ol class="passos">
        <li>No computador, abra o <a href="https://calendar.google.com/calendar/r/settings" target="_blank" rel="noopener">Google Agenda → Configurações</a>.</li>
        <li>Na esquerda, em <b>Configurações das minhas agendas</b>, clique no seu nome e desça até <b>Integrar agenda</b>.</li>
        <li>Copie o <b>Endereço secreto no formato iCal</b> (termina em <b>.ics</b>) e cole aqui.</li>
      </ol>
      <div class="linha-campo"><input id="ag-url" placeholder="https://calendar.google.com/calendar/ical/…/basic.ics" autocomplete="off" spellcheck="false" autocapitalize="none"><button class="btn pri" data-acao="hj-agenda-add">Conectar</button></div>
      <small id="ag-msg" class="erro-msg"></small>
      <p class="muted pequeno">Também funciona com iCloud (agenda pública) e Outlook (Publicar agenda → link ICS). Esse endereço fica só neste computador, criptografado; os compromissos dos próximos dias vão para o seu cofre privado para aparecer no iPhone.</p>`;
  };
  EXT.folhas['hj-email'] = () => {
    const ui = U(), c = ST.email;
    if (c) return `${cab('E-mail')}<div class="belvo-status"><span class="ponto-verde"></span><div><b>${esc(c.usuario)}</b><small>${esc(c.host)}</small></div></div>
      <p class="muted pequeno">O Jarvis confere a cada 15 minutos os não lidos da caixa ${/gmail/.test(c.host) ? '<b>Principal</b>' : 'de entrada'} — só remetente e assunto. Não lê o conteúdo e não marca nada como lido.</p>
      <div class="linha-btn"><button class="btn" data-acao="hj-email-atualizar">${ui.ic('atualizar')} Conferir agora</button><button class="btn link perigo" data-acao="hj-email-sair">Desconectar</button></div>`;
    return `${cab('Conectar e-mail')}
      <p>O Jarvis mostra os e-mails não lidos da caixa principal, só remetente e assunto. Ele não lê o conteúdo e não marca nada como lido.</p>
      <ol class="passos"><li>No Gmail, a conta precisa ter a <b>verificação em duas etapas</b> ligada.</li>
        <li>Abra <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener">Senhas de app do Google</a>, crie uma com o nome <b>Jarvis</b> e copie as 16 letras.</li><li>Preencha aqui embaixo.</li></ol>
      <label class="campo-rot">Seu e-mail<input id="em-usuario" type="email" placeholder="voce@gmail.com" autocomplete="off" autocapitalize="none" spellcheck="false"></label>
      <label class="campo-rot">Senha de app<input id="em-senha" type="password" placeholder="xxxx xxxx xxxx xxxx" autocomplete="off" spellcheck="false"></label>
      <details class="cf-mais"><summary>Outro provedor (servidor IMAP)</summary><div class="dois-campos"><label class="campo-rot">Servidor<input id="em-host" placeholder="imap.seuprovedor.com.br" autocomplete="off" autocapitalize="none"></label><label class="campo-rot">Porta<input id="em-porta" inputmode="numeric" value="993"></label></div></details>
      <button class="btn pri largo" data-acao="hj-email-salvar">Conectar</button><small id="em-msg" class="erro-msg"></small>
      <p class="muted pequeno">A senha fica só neste computador, criptografada. Remetente e assunto dos não lidos vão para o seu cofre privado (para aparecer no iPhone) e, se você deixar ligado em Ajustes, para o briefing da IA.</p>`;
  };
  EXT.folhas['hj-atalho'] = () => `${cab('Novo atalho')}
    <label class="campo-rot">Nome<input id="at-nome" placeholder="Ex.: Instagram" autocomplete="off"></label>
    <label class="campo-rot">Endereço<input id="at-url" placeholder="https://…" autocomplete="off" autocapitalize="none" spellcheck="false"></label>
    <button class="btn pri largo" data-acao="hj-atalho-salvar">Adicionar</button>`;
  EXT.folhas['hj-atalhos'] = () => { const ui = U(); return `${cab('Atalhos')}<div class="lista-simples">${(ui.D.atalhos || []).map(a => `<div class="ls-linha">${ui.ic(a.ic || 'globo')}<div class="ls-txt"><b>${esc(a.nome)}</b><small>${esc(a.url)}</small></div><button class="redondo peq" data-acao="hj-atalho-tirar" data-v="${esc(a.id)}" aria-label="Remover">${ui.ic('lixo')}</button></div>`).join('') || '<p class="muted">Nenhum atalho.</p>'}</div><button class="btn largo" data-acao="hj-atalho">${ui.ic('mais')} Novo atalho</button>`; };
  EXT.folhas['hj-clima'] = () => {
    const ui = U(), c = V.cidadeDe(ui.D), k = ST.clima;
    const prev = k ? `<div class="clima-folha"><div class="clima-agora">${ui.ic(k.ic)}<b>${k.temp}°</b><span>${esc(k.desc)}<small>máx ${k.max}° · mín ${k.min}°${k.chuva != null ? ` · chuva ${k.chuva}%` : ''}</small></span></div>
      ${k.amanha ? `<div class="linha-valor"><span>Amanhã</span><b>${esc(k.amanha.desc)} · ${k.amanha.min}° a ${k.amanha.max}°${k.amanha.chuva != null ? ` · chuva ${k.amanha.chuva}%` : ''}</b></div>` : ''}</div>` : '';
    return `${cab('Clima')}${prev}<p>Cidade do clima: <b>${esc(c.cidade)}</b></p><div class="linha-campo"><input id="cl-cidade" placeholder="Outra cidade" autocomplete="off"><button class="btn pri" data-acao="hj-clima-salvar">Trocar</button></div><small id="cl-msg" class="erro-msg"></small><p class="muted pequeno">Previsão do Open-Meteo (gratuita, sem cadastro).</p>`;
  };

  /* ---------- ações ---------- */
  const A = EXT.acoes;
  A['hj-briefing'] = () => gerarBriefing();
  A['hj-ouvir'] = () => ouvir();
  A['hj-licao'] = () => { ST.licaoExtra++; redesenhar(); };
  A['hj-clima'] = () => U().abrirFolha({ tipo: 'hj-clima' });
  A['hj-clima-salvar'] = async () => {
    const n = $('#cl-cidade').value.trim(); if (!n) return;
    const c = await V.acharCidade(n).catch(() => null);
    if (!c) { $('#cl-msg').textContent = 'Não achei essa cidade.'; return; }
    if (!perfilPronto()) return;
    F.perfil(U().D).clima = c; U().salvar(); ST.clima = null; U().fecharFolha(); U().desenhar(); U().aviso('Clima de ' + c.cidade);
  };
  A['hj-ir'] = (v, b) => {
    const ui = U();
    if (b.dataset.nota && EXT.acoes['cb-abrir']) return EXT.acoes['cb-abrir'](b.dataset.nota);
    if (b.dataset.alvo) { const el = $('.' + (b.dataset.alvo === 'tarefas' ? 'tarefas-card' : 'agenda-card')); if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); el.classList.add('pisca'); setTimeout(() => el.classList.remove('pisca'), 1200); } return; }
    if (v) ui.irPara(v);
  };
  A['hj-tf-quando'] = v => { ST.quando = v; const s = $('.tf-opcoes .seg'); if (s) [...s.children].forEach(x => x.classList.toggle('on', x.dataset.v === v)); };
  A['hj-tf-alta'] = (v, b) => { ST.alta = !ST.alta; b.classList.toggle('on', ST.alta); b.setAttribute('aria-pressed', ST.alta); };
  A['hj-tf-feita'] = v => { const ui = U(); const t = (ui.D.tarefas || []).find(x => x.id === v); if (!t) return; V.concluir(ui.D, v, !t.feita); ui.salvar(); redesenhar(); if (t.feita) ui.aviso('Feita: ' + t.titulo); };
  A['hj-tf-abrir'] = v => U().abrirFolha({ tipo: 'hj-tarefa', id: v });
  A['hj-tf-todas'] = () => { ST.todasTarefas = !ST.todasTarefas; redesenhar(); };
  A['hj-tf-salvar'] = v => {
    const ui = U(), t = (ui.D.tarefas || []).find(x => x.id === v); if (!t) return;
    t.titulo = $('#tf-titulo').value.trim() || t.titulo; t.quando = $('#tf-quando').value || null; t.hora = $('#tf-hora').value || null; t.prioridade = $('#tf-alta').checked ? 'alta' : 'normal';
    ui.salvar(); ui.fecharFolha(); ui.desenhar();
  };
  A['hj-tf-apagar'] = v => { const ui = U(); const l = ui.D.tarefas || []; const i = l.findIndex(x => x.id === v); if (i >= 0) l.splice(i, 1); ui.salvar(); ui.fecharFolha(); ui.desenhar(); };
  A['hj-compromisso'] = () => U().abrirFolha({ tipo: 'hj-compromisso' });
  A['hj-ev-salvar'] = () => {
    const ui = U(), titulo = $('#ev-titulo').value.trim(); if (!titulo) { ui.aviso('Diga o que é'); return; }
    const ev = V.novoCompromisso({ titulo, data: $('#ev-data').value, hora: $('#ev-hora').value || null, duracao: +$('#ev-dur').value || 60, local: $('#ev-local').value.trim() });
    (ui.D.agenda = ui.D.agenda || []).push(ev); ui.salvar(); ui.fecharFolha(); ui.desenhar(); ui.aviso('Compromisso anotado');
  };
  A['hj-ev-apagar'] = v => { const ui = U(); const l = ui.D.agenda || []; const i = l.findIndex(x => x.id === v && x.origem === 'manual'); if (i >= 0 && ui.certeza('Apagar este compromisso?')) { l.splice(i, 1); ui.salvar(); redesenhar(); } };
  A['hj-agenda'] = async () => { ST.agenda = await window.api.agendaConfig({}).catch(() => []); U().abrirFolha({ tipo: 'hj-agenda' }); };
  A['hj-agenda-add'] = async () => {
    const url = $('#ag-url').value.trim(), msg = $('#ag-msg'); if (!url) return;
    msg.className = 'muted pequeno'; msg.textContent = 'Lendo a agenda…';
    try { ST.agenda = await window.api.agendaConfig({ adicionar: url }); U().fecharFolha(); await agendaAtualizar(); U().aviso('Agenda conectada'); }
    catch (e) { msg.className = 'erro-msg'; msg.textContent = e.message; }
  };
  A['hj-agenda-tirar'] = async v => { if (!U().certeza('Remover esta agenda do Jarvis?')) return; ST.agenda = await window.api.agendaConfig({ remover: +v }); if (!ST.agenda.length) { const ui = U(); ui.D.agenda = (ui.D.agenda || []).filter(e => e.origem === 'manual'); ui.salvar(); } else await agendaAtualizar(); U().abrirFolha({ tipo: 'hj-agenda' }); };
  A['hj-agenda-atualizar'] = async () => { await agendaAtualizar({ manual: true }); if (U().M.folha) U().abrirFolha({ tipo: 'hj-agenda' }, true); };
  A['hj-email'] = async () => { ST.email = await window.api.emailConfig({}).catch(() => null); U().abrirFolha({ tipo: 'hj-email' }); };
  A['hj-email-salvar'] = async (v, b) => {
    const msg = $('#em-msg'); b.disabled = true; msg.className = 'muted pequeno'; msg.textContent = 'Entrando no e-mail…';
    try {
      const r = await window.api.emailConfig({ salvar: { usuario: $('#em-usuario').value, senha: $('#em-senha').value, host: $('#em-host').value.trim() || undefined, porta: $('#em-porta').value } });
      ST.email = { usuario: r.usuario, host: r.host };
      V.aplicarEmails(U().D, r.resultado); U().salvar(); U().fecharFolha(); U().desenhar(); U().aviso('E-mail conectado');
    } catch (e) { msg.className = 'erro-msg'; msg.textContent = e.message; b.disabled = false; }
  };
  A['hj-email-atualizar'] = () => emailAtualizar({ manual: true });
  A['hj-email-sair'] = async () => { if (!U().certeza('Desconectar o e-mail?')) return; await window.api.emailConfig({ remover: true }); ST.email = null; const ui = U(); ui.D.emails = []; delete F.perfil(ui.D).emailInfo; ui.salvar(); ui.fecharFolha(); ui.desenhar(); };
  A['hj-atalho'] = () => U().abrirFolha({ tipo: 'hj-atalho' });
  A['hj-atalhos-editar'] = () => U().abrirFolha({ tipo: 'hj-atalhos' });
  A['hj-atalho-salvar'] = () => {
    const ui = U(); const nome = $('#at-nome').value.trim(); let url = $('#at-url').value.trim();
    if (!nome || !url) { ui.aviso('Preencha nome e endereço'); return; }
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
    (ui.D.atalhos = ui.D.atalhos || []).push({ id: 'at-' + F.uid(), nome: nome.slice(0, 40), url: url.slice(0, 400), ic: 'globo' });
    ui.salvar(); ui.fecharFolha(); ui.desenhar();
  };
  A['hj-atalho-tirar'] = v => { const ui = U(); const l = ui.D.atalhos || []; const i = l.findIndex(x => x.id === v); if (i >= 0) l.splice(i, 1); ui.salvar(); ui.abrirFolha({ tipo: 'hj-atalhos' }, true); };
  A['hj-cfg'] = () => {
    if (!perfilPronto()) return;
    const ui = U(), p = F.perfil(ui.D);
    p.briefing = { hora: ($('#cfg-hora') || {}).value || '07:00', notificar: !!($('#cfg-notificar') || {}).checked, emails: !!($('#cfg-emails') || {}).checked };
    ui.salvar(); ui.aviso('Salvo');
  };

  /* ---------- formulários (enter) ---------- */
  document.addEventListener('submit', ev => {
    if (ev.target.id === 'hj-perg') { ev.preventDefault(); const t = $('#hj-perg-txt').value.trim(); if (t) U().enviarMensagem(t); }
    if (ev.target.id === 'hj-tf') {
      ev.preventDefault(); const ui = U(), inp = $('#hj-tf-txt'); let titulo = inp.value.trim(); if (!titulo) return;
      let quando = ST.quando === 'hoje' ? F.hoje() : ST.quando === 'amanha' ? F.addDias(F.hoje(), 1) : null;
      const reAmanha = /(^|\s)amanh[ãa](?=$|[\s.,!?])/i, reHoje = /(^|\s)hoje(?=$|[\s.,!?])/i;
      if (reAmanha.test(titulo)) { quando = F.addDias(F.hoje(), 1); titulo = titulo.replace(reAmanha, ' ').replace(/\s{2,}/g, ' ').trim(); }
      else if (reHoje.test(titulo)) { quando = F.hoje(); titulo = titulo.replace(reHoje, ' ').replace(/\s{2,}/g, ' ').trim(); }
      let alta = ST.alta; if (/^!|!$/.test(titulo)) { alta = true; titulo = titulo.replace(/^!+\s*|\s*!+$/g, ''); }
      (ui.D.tarefas = ui.D.tarefas || []).push(V.novaTarefa({ titulo, quando, prioridade: alta ? 'alta' : 'normal' }));
      ST.alta = false; ui.salvar(); redesenhar();
      const n = $('#hj-tf-txt'); if (n) n.focus();
    }
  });

  /* ---------- Ajustes ---------- */
  EXT.ajustes.push(() => {
    const ui = U(), cfg = cfgBriefing(), c = V.cidadeDe(ui.D);
    return `<section class="card"><div class="rot">Hoje e briefing</div>
      <label class="campo-rot">Horário do briefing da manhã<input id="cfg-hora" type="time" value="${esc(cfg.hora)}"></label>
      ${ui.PC ? `<label class="chk-linha"><input type="checkbox" id="cfg-notificar" ${cfg.notificar ? 'checked' : ''}> Avisar no computador quando o briefing ficar pronto</label>` : `<input type="checkbox" id="cfg-notificar" hidden ${cfg.notificar ? 'checked' : ''}>`}
      <label class="chk-linha"><input type="checkbox" id="cfg-emails" ${cfg.emails ? 'checked' : ''}> Usar remetente e assunto dos e-mails no briefing</label>
      <div class="linha-btn"><button class="btn" data-acao="hj-cfg">Salvar</button><button class="btn link" data-acao="hj-clima">Clima: ${esc(c.cidade)}</button></div>
      ${ui.PC ? `<div class="linha-btn"><button class="btn" data-acao="hj-agenda">${ui.ic('calendario')} Agenda</button><button class="btn" data-acao="hj-email">${ui.ic('envelope')} E-mail</button></div>` : ''}</section>`;
  });

  /* ---------- registro ---------- */
  EXT.telas.hoje = telaHoje;
  EXT.antesDeSalvar.push(D => { V.limpar(D); V.limparAgenda(D); return 0; });
  EXT.aoMudar.push(tela => { if (tela !== 'hoje' && ST.falando && window.speechSynthesis) { window.speechSynthesis.cancel(); ST.falando = false; } });
  EXT.aoIniciar.push(async () => {
    const ui = U();
    if (!ui.PC) return;
    if (V.semear(ui.D)) { ui.salvar(); if (ui.M.tela === 'hoje') redesenhar(); }
    window.api.aoIrTela && window.api.aoIrTela(d => { if (d && d.tela) ui.irPara(d.tela); });
    setTimeout(() => agendaAtualizar(), window.api.teste ? 300 : 5000);
    setTimeout(() => emailAtualizar(), window.api.teste ? 600 : 9000);
    setInterval(() => agendaAtualizar(), 30 * 60e3);
    setInterval(() => emailAtualizar(), 15 * 60e3);
    setTimeout(checarHorario, window.api.teste ? 1500 : 20000);
    setInterval(checarHorario, 60e3);
  });
  window.__hoje = { ST, gerarBriefing, agendaAtualizar, emailAtualizar, checarHorario, buscarClima };
})();
