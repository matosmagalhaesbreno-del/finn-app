/* Jarvis Finance — Deck do celular (só no PC).
   Liga um servidor na rede de casa para o celular virar um painel de botões deste PC: música e volume,
   atalhos, apps, sites, pastas, microfone, OBS e Discord. Aqui ficam o QR para parear, os aparelhos
   e a conexão com o OBS; os botões em si se editam no próprio celular (eles ficam guardados neste PC). */
(function () {
  'use strict';
  if (!window.api || !window.api.deckStatus) return; // no celular não existe: o deck é servido pelo PC
  const F = window.Finn;
  const EXT = window.FinnExt = window.FinnExt || {};
  for (const k of ['telas', 'folhas', 'acoes', 'titulos', 'icones']) EXT[k] = EXT[k] || {};
  for (const k of ['aoIniciar', 'antesDeSalvar', 'alertas', 'aoMudar', 'ajustes', 'cartoesHoje', 'prioridades']) EXT[k] = EXT[k] || [];
  const U = () => window.__ui;
  const $ = (s, r = document) => r.querySelector(s);
  const esc = s => F.esc(s);
  const A = EXT.acoes;
  const TESTE = !!window.api.teste;

  const IC_DECK = '<rect x="3.5" y="3.5" width="7" height="7" rx="2"/><rect x="13.5" y="3.5" width="7" height="7" rx="2"/><rect x="3.5" y="13.5" width="7" height="7" rx="2"/><rect x="13.5" y="13.5" width="7" height="7" rx="2"/>';
  Object.assign(EXT.icones, {
    deck: IC_DECK,
    gravar: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="3.5" fill="currentColor"/>',
    escudo: '<path d="M12 3.5 19.5 6v5.5c0 4.5-3.2 8-7.5 9-4.3-1-7.5-4.5-7.5-9V6z"/><path d="m9 12 2.2 2.2L15.5 10"/>',
    fone: '<path d="M4 15v-3a8 8 0 0 1 16 0v3"/><rect x="3" y="14" width="4.5" height="6" rx="1.5"/><rect x="16.5" y="14" width="4.5" height="6" rx="1.5"/>',
    wifi: '<path d="M2.5 9a14 14 0 0 1 19 0M5.5 12.5a9.5 9.5 0 0 1 13 0M8.5 16a5 5 0 0 1 7 0"/><path d="M12 19.2v.1"/>',
  });
  EXT.titulos.deck = 'Deck do celular';

  // botão na barra lateral (antes de Ajustes)
  const sep = document.querySelector('.nav-lateral .nav-sep');
  if (sep && !document.querySelector('.nav-lateral [data-tela="deck"]')) {
    sep.insertAdjacentHTML('beforebegin', `<div class="nav-secao">Este PC</div><button data-tela="deck"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IC_DECK}</svg>Deck do celular</button>`);
  }

  const ST = { st: null, cod: null, ocupado: '', tPoll: null, gerando: false, falhou: 0 };
  const naTela = () => { const ui = U(); return !!ui && ui.M.tela === 'deck'; };
  const semRede = u => String(u || '').replace(/^https?:\/\//, '');
  const horario = iso => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  function quando(iso) {
    if (!iso) return '';
    const d = new Date(iso); if (isNaN(d)) return '';
    const h = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    return d.toDateString() === new Date().toDateString() ? 'hoje às ' + h : d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) + ' às ' + h;
  }
  const amigavel = e => {
    const m = String(e && e.message || e || '');
    if (/EADDRINUSE/.test(m)) return 'As portas do deck (8790 a 8800) estão ocupadas por outro programa. Feche-o e tente de novo.';
    if (/EACCES/.test(m)) return 'O Windows não deixou o deck usar a rede. Veja a dica do Firewall abaixo.';
    return m || 'Algo deu errado.';
  };

  async function atualizar(redesenha = true) {
    try { ST.st = await window.api.deckStatus(); }
    catch (e) { ST.st = ST.st || { ligado: false, erro: amigavel(e), dispositivos: [], links: [], obs: {}, obsCfg: {} }; }
    if (redesenha) redesenharTela();
  }
  function redesenharTela() {
    const ui = U(); if (!naTela() || ui.M.folha) return;
    const a = document.activeElement;
    if (a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) && a.closest('#tela')) return; // não atrapalha quem está digitando
    const t = $('#tela'), y = t ? t.scrollTop : 0; telaDeck(); if (t) t.scrollTop = y;
  }
  async function garantirCodigo(forcar) {
    const st = ST.st; if (!st || !st.ligado || ST.gerando) return;
    const vencido = !ST.cod || Date.parse(ST.cod.expira) - Date.now() < 20000 || !st.codigoAtivo;
    if (!forcar && (!vencido || Date.now() - ST.falhou < 10000)) return;
    ST.gerando = true;
    try { ST.cod = await window.api.deckCodigo(); st.codigoAtivo = true; }
    catch (e) { ST.cod = null; ST.falhou = Date.now(); U().aviso(amigavel(e), 'erro'); }
    ST.gerando = false;
    redesenharTela();
  }

  /* ---------- pedaços da tela ---------- */
  const MINI = [['#30d158', '<path d="M7 6v12l10-6z"/>'], ['#0a84ff', '<path d="M4 9.5v5h3.5L12 18V6L7.5 9.5z"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/>'], ['#ff9f0a', '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"/>'], ['#ff453a', '<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="3" fill="currentColor"/>'],
    ['#5e5ce6', '<path d="M4 15v-3a8 8 0 0 1 16 0v3"/><rect x="3" y="14" width="4.5" height="6" rx="1.5"/><rect x="16.5" y="14" width="4.5" height="6" rx="1.5"/>'], ['#64d2ff', '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5a13 13 0 0 1 0 17M12 3.5a13 13 0 0 0 0 17"/>'], ['#bf5af2', '<rect x="2.5" y="6" width="19" height="12" rx="2"/><path d="M6.5 10h.01M10 10h.01M13.5 10h.01M17 10h.01M7.5 14h9"/>'], ['#8e8e93', '<rect x="5" y="11" width="14" height="10" rx="2.5"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>']];
  const miniDeck = () => `<div class="dk-mini" aria-hidden="true">${MINI.map(([c, p], i) => `<span style="--c:${c}"${i === 3 ? ' class="on"' : ''}><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${p}</svg></span>`).join('')}</div>`;

  function cardPrincipal(st) {
    const ui = U();
    if (!st.ligado) return `<section class="card largo dk-hero"><div class="rot">${ui.ic('deck')} Deck do celular</div>
      <div class="dk-intro">${miniDeck()}<div><h2>Seu celular vira um painel de botões deste PC</h2>
        <p class="muted">Um toque no celular para tocar ou pausar a música, mudar o volume, mutar o microfone, abrir apps e sites, rodar atalhos, gravar ou entrar ao vivo no OBS e mutar no Discord.</p>
        ${st.erro ? `<p class="dk-erro">${esc(amigavel(st.erro))}</p>` : ''}
        <div class="linha-btn"><button class="btn pri" data-acao="dk-ligar" ${ST.ocupado ? 'disabled' : ''}>${ST.ocupado === 'ligar' ? '<span class="giro"></span> Ligando…' : 'Ligar o deck'}</button></div>
        <p class="muted pequeno">Funciona só dentro da sua casa: o celular precisa estar no mesmo Wi-Fi do PC, e nada passa pela internet.</p></div></div></section>`;
    const links = st.links || [], principal = links.find(l => !l.virtual) || links[0], c = ST.cod;
    const on = (st.dispositivos || []).filter(d => d.online).length;
    return `<section class="card largo dk-hero"><div class="rot">${ui.ic('deck')} Deck do celular<span class="rot-acoes"><button class="btn link perigo" data-acao="dk-desligar">Desligar</button></span></div>
      <div class="belvo-status"><span class="ponto-verde"></span><div><b>Ligado · ${on ? `${on} ${on > 1 ? 'aparelhos conectados' : 'aparelho conectado'}` : 'esperando o celular'}</b><small>${principal ? 'Endereço na rede de casa: ' + esc(semRede(principal.url)) : 'Não achei a rede Wi-Fi deste PC.'}</small></div></div>
      ${principal ? `<div class="qr-grade"><div class="dk-qr"><img class="qr" id="dk-qr" alt="QR code para parear o celular" src="${c && c.qr ? c.qr : ''}">${c ? `<b class="dk-codigo" aria-label="Código de pareamento ${esc(c.codigo.split('').join(' '))}">${esc(c.codigo.replace(/(\d{3})(\d{3})/, '$1 $2'))}</b><small class="muted">código vale até ${horario(c.expira)}</small>` : ''}</div>
        <ol class="passos"><li><b>Deixe o celular no mesmo Wi-Fi</b> deste PC.</li>
          <li><b>Abra a Câmera do iPhone</b> e aponte para o QR code. Toque no link que aparecer.<small>Ou digite <b>${esc(semRede(principal.url))}</b> no Safari e use o código de 6 números.</small></li>
          <li>No Safari, toque em <b>Compartilhar</b> → <b>Adicionar à Tela de Início</b>. O deck vira um app no iPhone.</li>
          <li>Para trocar os botões, toque no <b>lápis</b> no próprio celular (ou segure um botão).</li></ol></div>`
        : '<p class="dk-erro">Conecte este PC no Wi-Fi de casa (ou no cabo do mesmo roteador do celular). O endereço aparece aqui sozinho.</p>'}
      <div class="linha-btn"><button class="btn" data-acao="dk-abrir">${ui.ic('deck')} Abrir o deck aqui no PC</button>${principal ? `<button class="btn" data-acao="dk-codigo">${ui.ic('atualizar')} Novo código</button><button class="btn link" data-acao="dk-copiar" data-v="${esc(principal.url)}">Copiar endereço</button>` : ''}</div>
      ${links.length > 1 ? `<details class="dk-redes"><summary>Outros endereços deste PC</summary><div class="lista-simples">${links.map(l => `<div class="ls-linha"><div class="ls-txt"><b>${esc(semRede(l.url))}</b><small>${esc(l.rede)}${l.virtual ? ' · rede virtual, o celular não alcança' : ''}</small></div></div>`).join('')}</div></details>` : ''}</section>`;
  }
  function cardAparelhos(st) {
    const ui = U(), l = st.dispositivos || [];
    return `<section class="card dk-aparelhos"><div class="rot">${ui.ic('celular')} Aparelhos pareados</div>
      ${l.length ? `<div class="lista-simples">${l.map(d => `<div class="ls-linha dk-ap"><span class="ponto-verde ${d.online ? '' : 'offline'}"></span><div class="ls-txt"><b>${esc(d.nome)}</b><small>${d.online ? 'Conectado agora' : d.ultimo ? 'Usado ' + quando(d.ultimo) : 'Pareado ' + quando(d.criado)}</small></div><button class="btn link perigo" data-acao="dk-remover" data-v="${esc(d.id)}">Remover</button></div>`).join('')}</div>`
        : '<p class="muted">Nenhum celular pareado ainda. Use o QR code ao lado.</p>'}
      <p class="muted pequeno">Removeu um aparelho? Ele para de controlar o PC na hora e precisa parear de novo.</p></section>`;
  }
  function cardObs(st) {
    const ui = U(), o = st.obs || {}, c = st.obsCfg || {};
    const ok = st.ligado && o.conectado;
    const det = !st.ligado ? 'Conecta sozinho quando o deck está ligado e o OBS aberto.'
      : ok ? [o.cena ? 'cena ' + o.cena : '', o.gravando ? 'gravando' : '', o.aoVivo ? 'ao vivo' : '', o.replay ? 'replay ligado' : ''].filter(Boolean).join(' · ') || 'pronto'
        : o.erro || 'Procurando o OBS…';
    return `<section class="card dk-obs"><div class="rot">${ui.ic('gravar')} OBS Studio</div>
      <div class="belvo-status"><span class="ponto-verde ${ok ? '' : st.ligado && o.erro ? 'erro' : 'offline'}"></span><div><b>${ok ? 'Conectado' : 'Não conectado'}</b><small>${esc(det)}</small></div></div>
      <div class="dois-campos"><label class="campo-rot">Endereço<input id="dk-obs-host" value="${esc(c.host || '127.0.0.1')}" spellcheck="false" autocomplete="off"></label><label class="campo-rot">Porta<input id="dk-obs-porta" inputmode="numeric" value="${esc(String(c.porta || 4455))}"></label></div>
      <label class="campo-rot">Senha do servidor WebSocket<input id="dk-obs-senha" type="password" autocomplete="off" spellcheck="false" placeholder="${c.temSenha ? '•••••••• (guardada neste PC)' : 'a senha que o OBS mostra'}"><small>Fica guardada só neste PC, criptografada.</small></label>
      <div class="linha-btn"><button class="btn" data-acao="dk-obs">Salvar e conectar</button>${c.temSenha ? '<button class="btn link perigo" data-acao="dk-obs-semsenha">Apagar a senha</button>' : ''}</div>
      <p class="muted pequeno">No OBS 28 ou mais novo: <b>Ferramentas → Configurações do servidor WebSocket</b> → marque <b>Ativar servidor WebSocket</b>. A senha aparece em <b>Mostrar informações de conexão</b>. Na primeira conexão, suas cenas viram botões na página Live do celular.</p></section>`;
  }
  function cardDiscord(st) {
    const ui = U(), d = st.discord || {}, c = st.discordCfg || {};
    const pronto = !!d.autenticado;
    const etapa = { procurando: 'Abra o Discord no PC (o aplicativo, não o site).', conectando: 'Conectando ao Discord…', aguardando: 'Olhe o Discord: clique em Autorizar na janelinha que abriu.', autorizar: 'Falta autorizar no Discord.', 'sem-config': '' }[d.etapa] || '';
    const det = pronto ? `microfone ${d.mudo ? 'mudo' : 'ligado'}${d.surdo ? ' · surdo' : ''} · as teclas mostram o estado real`
      : d.erro || etapa || (c.clientId ? 'Configurado. Ligue o deck para conectar.' : 'As teclas do Discord usam os atalhos Ctrl+Shift+M e Ctrl+Shift+D.');
    const passos = `<ol class="passos dk-passos"><li>Abra <a href="https://discord.com/developers/applications" target="_blank" rel="noopener"><b>discord.com/developers/applications</b></a> e clique em <b>New Application</b> (nome: Jarvis Deck).</li>
        <li>Em <b>OAuth2</b>, copie o <b>Client ID</b>. Clique em <b>Reset Secret</b> e copie o <b>Client Secret</b>.</li>
        <li>Ainda em OAuth2, em <b>Redirects</b>, adicione <b>http://localhost</b> e clique em Save.</li>
        <li>Cole os dois aqui e clique em Conectar. O Discord abre uma janelinha: clique em <b>Autorizar</b>.</li></ol>`;
    return `<section class="card dk-discord"><div class="rot">${ui.ic('fone')} Discord</div>
      <div class="belvo-status"><span class="ponto-verde ${pronto ? '' : d.erro ? 'erro' : 'offline'}"></span><div><b>${pronto ? 'Conectado' + (d.usuario ? ' como ' + esc(d.usuario) : '') : 'Não conectado'}</b><small>${esc(det)}</small></div></div>
      ${pronto ? `<p class="muted pequeno">As teclas Discord: mudo e Discord: surdo do celular agora mutam pelo próprio Discord e ficam vermelhas quando você está mudo — mesmo se mutar pelo Discord.</p>
        <div class="linha-btn"><button class="btn link perigo" data-acao="dk-discord-sair">Desconectar o Discord</button></div>`
        : `<details class="dk-redes"${c.clientId ? '' : ' open'}><summary>Conectar o Discord (uma vez só, 2 minutos)</summary>${passos}
        <div class="dois-campos"><label class="campo-rot">Client ID<input id="dk-dc-id" inputmode="numeric" value="${esc(c.clientId || '')}" spellcheck="false" autocomplete="off" placeholder="1234567890123456789"></label>
        <label class="campo-rot">Client Secret<input id="dk-dc-sec" type="password" spellcheck="false" autocomplete="off" placeholder="${c.temSecret ? '•••••••• (guardado)' : 'cole aqui'}"></label></div>
        <div class="linha-btn"><button class="btn pri" data-acao="dk-discord">${c.clientId ? 'Conectar de novo' : 'Conectar ao Discord'}</button>${c.clientId ? '<button class="btn link perigo" data-acao="dk-discord-sair">Apagar</button>' : ''}</div>
        <p class="muted pequeno">O Client Secret fica só neste PC, criptografado. Se não quiser conectar, configure no Discord os atalhos <b>Ctrl+Shift+M</b> (Toggle Mute) e <b>Ctrl+Shift+D</b> (Toggle Deafen) em Configurações → Atalhos de teclado.</p></details>`}</section>`;
  }
  function cardVerificar() {
    const ui = U(), r = ST.diag;
    const linhas = r && r.length ? `<ul class="dk-verif">${r.map(x => `<li class="${x.ok ? 'ok' : x.opcional ? 'opc' : 'falha'}"><span class="dk-marca">${x.ok ? '✓' : x.opcional ? '–' : '✕'}</span><div><b>${esc(x.nome)}</b><small>${esc(x.det)}${x.ms != null && x.ms > 300 ? ` · ${(x.ms / 1000).toFixed(1)} s` : ''}</small></div></li>`).join('')}</ul>` : '';
    const falhas = r ? r.filter(x => !x.ok && !x.opcional).length : 0;
    return `<section class="card dk-verifica"><div class="rot">${ui.ic('escudo')} Verificar o Windows</div>
      <p class="muted">Testa de verdade cada parte que o deck usa neste PC: o ajudante, o volume, o microfone, o mixer, a lista de apps, os ícones e o teclado.</p>
      ${r ? `<p class="dk-resumo ${falhas ? 'ruim' : 'bom'}">${falhas ? `${falhas} ${falhas > 1 ? 'partes precisam' : 'parte precisa'} de atenção` : 'Tudo funcionando'}</p>` : ''}${linhas}
      <div class="linha-btn"><button class="btn${r ? '' : ' pri'}" data-acao="dk-verificar"${ST.verificando ? ' disabled' : ''}>${ST.verificando ? '<span class="giro"></span> Verificando…' : r ? 'Verificar de novo' : 'Verificar agora'}</button></div></section>`;
  }
  function cardDicas() {
    const ui = U();
    const item = (i, t, s) => `<li>${ui.ic(i)}<div><b>${t}</b><small>${s}</small></div></li>`;
    return `<section class="card dk-dicas"><div class="rot">${ui.ic('escudo')} Para tudo funcionar</div><ul class="dk-lista">
      ${item('escudo', 'Firewall do Windows', 'Na primeira vez, o Windows pergunta se o Jarvis Finance pode usar a rede: marque <b>Redes privadas</b> e clique em Permitir. Se negou sem querer: Segurança do Windows → Firewall e proteção de rede → Permitir um aplicativo pelo firewall.')}
      ${item('wifi', 'Mesmo Wi-Fi', 'Se o roteador reiniciar e o endereço do PC mudar, escaneie o QR de novo. Para não mudar mais, reserve o IP do PC nas configurações do roteador.')}
      ${item('celular', 'Tela acesa', 'O deck pede para a tela do celular não apagar enquanto está aberto. Se apagar mesmo assim: Ajustes do iPhone → Tela e Brilho → Bloqueio Automático.')}
    </ul></section>`;
  }
  function telaDeck() {
    const st = ST.st;
    if (!st) { $('#tela').innerHTML = '<div class="grade deck-pc"><section class="card largo"><p class="muted">Carregando…</p></section></div>'; atualizar(); return; }
    $('#tela').innerHTML = `<div class="grade deck-pc">${cardPrincipal(st)}${st.ligado ? cardAparelhos(st) : ''}${cardObs(st)}${cardDiscord(st)}${cardVerificar()}${cardDicas()}</div>`;
    if (st.ligado) garantirCodigo();
  }

  /* ---------- ações ---------- */
  A['dk-ligar'] = async () => {
    ST.ocupado = 'ligar'; redesenharTela();
    try { ST.st = await window.api.deckLigar(true); ST.cod = null; U().aviso('Deck ligado'); }
    catch (e) { await atualizar(false); ST.st.erro = amigavel(e); U().aviso(amigavel(e), 'erro'); }
    ST.ocupado = ''; redesenharTela();
  };
  A['dk-desligar'] = async () => { ST.st = await window.api.deckLigar(false); ST.cod = null; U().aviso('Deck desligado'); redesenharTela(); };
  A['dk-codigo'] = () => garantirCodigo(true);
  A['dk-abrir'] = () => window.api.deckAbrir();
  A['dk-copiar'] = async v => { await window.api.copiar(v); U().aviso('Endereço copiado'); };
  A['dk-remover'] = async v => {
    const d = ((ST.st && ST.st.dispositivos) || []).find(x => x.id === v);
    if (!U().certeza(`Remover ${d ? d.nome : 'este aparelho'}? Ele para de controlar o PC na hora.`)) return;
    ST.st = await window.api.deckRevogar(v); U().aviso('Aparelho removido'); redesenharTela();
  };
  async function salvarObs(senha) {
    const host = ($('#dk-obs-host') || {}).value, porta = ($('#dk-obs-porta') || {}).value;
    ST.st = await window.api.deckObs({ host, porta, senha });
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    U().aviso(ST.st.ligado ? 'Salvo. Conectando ao OBS…' : 'Salvo. O deck conecta ao OBS quando estiver ligado.');
    redesenharTela(); setTimeout(() => atualizar(), TESTE ? 600 : 2000);
  }
  A['dk-obs'] = () => { const s = ($('#dk-obs-senha') || {}).value; return salvarObs(s ? s : undefined); };
  A['dk-discord'] = async () => {
    const clientId = ($('#dk-dc-id') || {}).value, sec = ($('#dk-dc-sec') || {}).value;
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    try { ST.st = await window.api.deckDiscord({ clientId, clientSecret: sec || undefined }); U().aviso(ST.st.ligado ? 'Conectando ao Discord…' : 'Salvo. Ligue o deck para conectar ao Discord.'); }
    catch (e) { U().aviso(amigavel(e), 'erro'); }
    redesenharTela(); setTimeout(() => atualizar(), TESTE ? 500 : 2000);
  };
  A['dk-discord-sair'] = async () => {
    if (!U().certeza('Desconectar o Discord do Jarvis? As teclas voltam a usar os atalhos de teclado.')) return;
    ST.st = await window.api.deckDiscordSair(); U().aviso('Discord desconectado'); redesenharTela();
  };
  A['dk-verificar'] = async () => {
    ST.verificando = true; redesenharTela();
    try { ST.diag = await window.api.deckDiagnostico(); } catch (e) { ST.diag = [{ nome: 'Verificação', ok: false, det: amigavel(e) }]; }
    ST.verificando = false; redesenharTela();
  };
  A['dk-obs-semsenha'] = () => salvarObs('');

  /* ---------- registro ---------- */
  EXT.telas.deck = telaDeck;
  EXT.aoMudar.push(tela => {
    clearInterval(ST.tPoll); ST.tPoll = null;
    if (tela === 'deck') ST.tPoll = setInterval(() => atualizar(), TESTE ? 700 : 3000);
  });
  EXT.ajustes.push(() => {
    const ui = U(), st = ST.st;
    return `<section class="card"><div class="rot">${ui.ic('deck')} Deck do celular</div><p class="muted">Use o celular como um painel de botões deste PC: música, volume, atalhos, apps, OBS e Discord.</p>
      <div class="linha-btn"><button class="btn" data-ir="deck">${st && st.ligado ? 'Ligado · ver' : 'Configurar'}</button></div></section>`;
  });
  EXT.aoIniciar.push(() => { atualizar(false); });
  window.__deckPC = { ST, atualizar, garantirCodigo };
})();
