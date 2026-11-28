/* Jarvis Finance — interface (a mesma no PC e no iPhone; o layout muda pelo tamanho da tela). */
(function () {
  'use strict';
  const F = window.Finn, A = window.Agente, N = window.Nuvem, S = window.Sinc, I = window.Importa;
  const { dinheiro, esc, CAT, GRUPOS, ORDEM_GRUPOS } = F;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const PC = !!window.api;
  const VERSAO = '1.7.0';
  // módulos extras (ex.: a aba Contas) se registram aqui antes do ui.js rodar
  const EXT = window.FinnExt = window.FinnExt || {};
  for (const k of ['telas', 'folhas', 'acoes', 'titulos', 'icones']) EXT[k] = EXT[k] || {};
  for (const k of ['aoIniciar', 'antesDeSalvar', 'alertas', 'aoMudar', 'ajustes']) EXT[k] = EXT[k] || [];

  /* ---------- ícones ---------- */
  const P = {
    inicio: '<path d="M3.5 10.5 12 3.5l8.5 7V20a1 1 0 0 1-1 1H15v-6.5H9V21H4.5a1 1 0 0 1-1-1z"/>',
    lista: '<path d="M9 6.5h11M9 12h11M9 17.5h11"/><circle cx="4.6" cy="6.5" r="1.1"/><circle cx="4.6" cy="12" r="1.1"/><circle cx="4.6" cy="17.5" r="1.1"/>',
    finn: '<path d="M11 3.5l1.8 4.9 4.9 1.8-4.9 1.8L11 16.9l-1.8-4.9-4.9-1.8 4.9-1.8z"/><path d="M18.5 14.5l.8 2.1 2.1.8-2.1.8-.8 2.1-.8-2.1-2.1-.8 2.1-.8z"/>',
    planos: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.8"/><circle cx="12" cy="12" r="1.2"/>',
    ajustes: '<path d="M4 20.5v-6M4 10V3.5M12 20.5V12M12 8V3.5M20 20.5v-4M20 12.5v-9M1.5 14h5M9.5 8.5h5M17.5 16.5h5"/>',
    esq: '<path d="M15 18.5 8.5 12 15 5.5"/>', dir: '<path d="M9 5.5l6.5 6.5L9 18.5"/>',
    mais: '<path d="M12 5v14M5 12h14"/>', enviar: '<path d="M12 19V5.5M5.5 12 12 5.5l6.5 6.5"/>',
    busca: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>', fechar: '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>', banco: '<path d="M3 10h18M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 20.5h18M12 3.5 21 8H3z"/>',
    nuvem: '<path d="M7 18.5h10.5a4 4 0 0 0 .6-8 6 6 0 0 0-11.6 1.5A3.3 3.3 0 0 0 7 18.5z"/>',
    lixo: '<path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13"/>', filtro: '<path d="M4 6h16M7 12h10M10 18h4"/>',
    importar: '<path d="M12 3.5v11M7.5 10l4.5 4.5 4.5-4.5M4.5 15.5V20h15v-4.5"/>', exportar: '<path d="M12 14.5v-11M7.5 8 12 3.5 16.5 8M4.5 15.5V20h15v-4.5"/>',
    chave: '<circle cx="8" cy="15" r="4"/><path d="M11 12l8.5-8.5M16 7l2.5 2.5M14 9l2 2"/>', raio: '<path d="M13 2.5 4.5 13.5h6.5l-1 8 8.5-11h-6.5z"/>',
    atualizar: '<path d="M20 12a8 8 0 1 1-2.3-5.7M20 4v4.5h-4.5"/>', pessoa: '<circle cx="12" cy="8" r="3.8"/><path d="M4.5 20.5c1-4 4-5.8 7.5-5.8s6.5 1.8 7.5 5.8"/>',
    // categorias
    pasta: '<rect x="3.5" y="7.5" width="17" height="12" rx="2"/><path d="M8.5 7.5V5.5a1 1 0 0 1 1-1h5a1 1 0 0 1 1 1v2M3.5 12.5h17"/>',
    etiqueta: '<path d="M3.5 12.5V4.5a1 1 0 0 1 1-1h8l8 8-9 9z"/><circle cx="8" cy="8" r="1.3"/>',
    entra: '<path d="M12 4.5v12M6.5 11 12 16.5l5.5-5.5M5 20h14"/>', presente: '<rect x="3.5" y="8.5" width="17" height="4" rx="1"/><path d="M5 12.5v8h14v-8M12 8.5v12M12 8.5c-2-4-6-4-6-1.5S10 8.5 12 8.5c2 0 6 1 6-1.5s-4-2.5-6 1.5"/>',
    moeda: '<circle cx="12" cy="12" r="8.5"/><path d="M14.8 9.2c-.6-1-1.6-1.4-2.8-1.4-1.6 0-2.8.8-2.8 2.1 0 3 5.8 1.4 5.8 4.3 0 1.3-1.3 2.1-3 2.1-1.3 0-2.4-.5-3-1.5M12 6v12"/>',
    volta: '<path d="M9 14.5 4.5 10 9 5.5"/><path d="M4.5 10h10a5 5 0 0 1 0 10h-3"/>', casa: '<path d="M3.5 10.5 12 3.5l8.5 7V20a1 1 0 0 1-1 1h-15a1 1 0 0 1-1-1z"/><path d="M9.5 21v-6h5v6"/>',
    celular: '<rect x="6.5" y="2.5" width="11" height="19" rx="2.5"/><path d="M10.5 18.5h3"/>', play: '<rect x="2.5" y="5" width="19" height="14" rx="3"/><path d="M10 9.2v5.6l4.8-2.8z"/>',
    calendario: '<rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>', livro: '<path d="M4 19.5V5a1.5 1.5 0 0 1 1.5-1.5H20v14H5.5A1.5 1.5 0 0 0 4 19.5zM4 19.5A1.5 1.5 0 0 0 5.5 21H20"/>',
    carrinho: '<path d="M2.5 4h2.6l2.3 11h11l2-7.5H6.2"/><circle cx="9" cy="19.3" r="1.4"/><circle cx="17" cy="19.3" r="1.4"/>',
    onibus: '<rect x="4.5" y="3.5" width="15" height="14" rx="3"/><path d="M4.5 11h15M7.5 17.5v3M16.5 17.5v3"/><circle cx="8.5" cy="14.3" r=".9"/><circle cx="15.5" cy="14.3" r=".9"/>',
    cruz: '<rect x="3.5" y="3.5" width="17" height="17" rx="4"/><path d="M12 8v8M8 12h8"/>', pata: '<circle cx="7" cy="9" r="1.8"/><circle cx="11" cy="6" r="1.8"/><circle cx="15.5" cy="7" r="1.8"/><circle cx="18" cy="11" r="1.8"/><path d="M12.5 12c-3 0-6 3.5-6 6 0 1.5 1.5 2.3 3 1.8 2-.7 3-.7 5 0 1.5.5 3-.3 3-1.8 0-2.5-2-6-5-6z"/>',
    carro: '<path d="M4 16.5v-4l2-5.5a1.5 1.5 0 0 1 1.4-1h9.2a1.5 1.5 0 0 1 1.4 1l2 5.5v4M4 12.5h16"/><rect x="3" y="16.5" width="18" height="2" rx="1"/><circle cx="7.5" cy="14.5" r=".8"/><circle cx="16.5" cy="14.5" r=".8"/>',
    talher: '<path d="M7 3v8M4.5 3v5a2.5 2.5 0 0 0 5 0V3M7 11v10M17 21V3c-2.5 1.5-3.5 4-3.5 7.5V13H17"/>', moto: '<circle cx="5.5" cy="16.5" r="3"/><circle cx="18.5" cy="16.5" r="3"/><path d="M8.5 16.5h5l3-6.5h-4M14.5 6.5h2.5l1.5 10"/>',
    taca: '<path d="M7 3.5h10l-1 6a4 4 0 0 1-8 0zM12 13.5v7M8.5 20.5h7"/>', ticket: '<path d="M3.5 8a2 2 0 0 0 0 4v4.5h17V12a2 2 0 0 1 0-4V3.5h-17z" transform="translate(0 2)"/><path d="M14 5.5v13" stroke-dasharray="2 2"/>',
    sacola: '<path d="M5 8h14l-1 12.5H6zM9 8V6.5a3 3 0 0 1 6 0V8"/>', aviao: '<path d="M21 15.5 13.5 11V5a1.5 1.5 0 0 0-3 0v6L3 15.5V17l7.5-2.5v4L8.5 20v1.5l3.5-1 3.5 1V20l-2-1.5v-4L21 17z"/>',
    dado: '<rect x="3.5" y="3.5" width="17" height="17" rx="4"/><circle cx="8.5" cy="8.5" r="1.1"/><circle cx="15.5" cy="15.5" r="1.1"/><circle cx="15.5" cy="8.5" r="1.1"/><circle cx="8.5" cy="15.5" r="1.1"/><circle cx="12" cy="12" r="1.1"/>',
    alerta: '<path d="M12 3.5 21.5 20h-19z"/><path d="M12 10v4.5M12 17.3v.2"/>', pontos: '<circle cx="5.5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="18.5" cy="12" r="1.3"/>',
    troca: '<path d="M4.5 8.5h14M15 5l3.5 3.5L15 12M19.5 15.5h-14M9 12l-3.5 3.5L9 19"/>',
  };
  Object.assign(P, EXT.icones);
  const ic = (n, c = '') => `<svg class="ic ${c}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[n] || P.pontos}</svg>`;
  const corCat = (id) => (GRUPOS[F.grupoDe(id, D)] || GRUPOS.outros).cor;
  const bolinha = (id) => `<span class="bol" style="--c:${id === 'entre_contas' ? '#aeaeb2' : (CAT[id] || {}).grupo === 'receita' ? GRUPOS.receita.cor : corCat(id)}">${ic((CAT[id] || CAT.outros).ic)}</span>`;

  /* ---------- plataforma: onde guardar ---------- */
  const semCalculados = (k, v) => (k && k[0] === '_' ? undefined : v);
  const Plat = PC ? {
    carregar: () => window.api.carregar(),
    salvar: D => window.api.salvar(JSON.parse(JSON.stringify(D, semCalculados))),
    segredo: k => window.api.segredo(k),
    guardar: (k, v) => window.api.guardarSegredo(k, v),
    gemini: (modelo, corpo) => window.api.gemini(modelo, corpo),
    modelos: () => window.api.geminiModelos(),
  } : {
    carregar: async () => { try { return JSON.parse(localStorage.getItem('finn-dados')); } catch { return null; } },
    salvar: async D => { try { localStorage.setItem('finn-dados', JSON.stringify(D, semCalculados)); } catch (e) { aviso('Sem espaço no aparelho para salvar.'); } },
    segredo: async k => localStorage.getItem('finn-' + k),
    guardar: async (k, v) => { v ? localStorage.setItem('finn-' + k, v) : localStorage.removeItem('finn-' + k); },
    async gemini(modelo, corpo) {
      const chave = localStorage.getItem('finn-gemini');
      const r = await fetch(`${window.GEMINI_BASE || 'https://generativelanguage.googleapis.com'}/v1beta/models/${modelo}:generateContent`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': chave }, body: JSON.stringify(corpo) });
      return { status: r.status, json: await r.json().catch(() => null) };
    },
    async modelos() {
      const chave = localStorage.getItem('finn-gemini');
      const r = await fetch(`${window.GEMINI_BASE || 'https://generativelanguage.googleapis.com'}/v1beta/models?pageSize=200`, { headers: { 'x-goog-api-key': chave } });
      return { status: r.status, json: await r.json().catch(() => null) };
    },
  };

  /* ---------- estado ---------- */
  let D = F.vazio();
  let foto = new Map(), tSalvar = null, redesenhoPendente = false;
  const hojeYM = () => F.hoje().slice(0, 7);
  const M = {
    tela: 'hoje', ultimaFin: 'inicio', periodo: 'mes', mes: hojeYM(), grupoAberto: null,
    filtro: { q: '', tipo: '', banco: '', cat: '', mes: 'todos' }, filtrosAbertos: false,
    folha: null, pensando: false, iaOk: false, belvo: null, belvoOcupado: '',
  };

  /* ---------- salvar ---------- */
  function ganchos(D) { let n = 0; for (const f of EXT.antesDeSalvar) { try { n += f(D) || 0; } catch (e) { console.error(e); } } return n; }
  function salvar({ semSync = false } = {}) {
    F.preparar(D);
    ganchos(D);
    if (S.carimbar(D, foto) && !semSync) N.mudou();
    clearTimeout(tSalvar); tSalvar = setTimeout(() => Plat.salvar(D), 250);
  }
  function aviso(msg, tipo = '') {
    const a = $('#toast'); a.textContent = msg; a.className = 'toast on ' + tipo;
    clearTimeout(aviso.t); aviso.t = setTimeout(() => a.className = 'toast', 3600);
  }
  const certeza = (msg) => window.confirm(msg);

  /* ---------- período escolhido ---------- */
  function periodoAtual() {
    if (M.periodo === '30d') { const ate = F.hoje(); return { de: F.addDias(ate, -29), ate, nome: 'Últimos 30 dias' }; }
    return { de: M.mes + '-01', ate: F.fimDoMes(M.mes), nome: F.nomeMes(M.mes).replace(/^./, c => c.toUpperCase()) };
  }
  const saudacao = () => { const h = new Date().getHours(); return h < 5 ? 'Boa noite' : h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'; };
  const quando = iso => { if (!iso) return ''; const d = new Date(iso); return isNaN(d) ? '' : d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }); };
  const diaSemana = iso => { const d = new Date(iso + 'T12:00:00'); const t = d.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'long' }).replace('.', ''); return t.charAt(0).toUpperCase() + t.slice(1); };
  const pct = (a, b) => b > 0 ? Math.round(a / b * 100) : 0;

  /* =====================================================================
     TELAS
     ===================================================================== */
  const TITULOS = { inicio: 'Resumo', mov: 'Movimentações', finn: 'Jarvis', planos: 'Planos', ajustes: 'Ajustes', ...EXT.titulos };
  // no celular, algumas telas ficam numa aba só, com um seletor em cima (Finanças, Memória e Hoje + Hábitos)
  const FIN = ['inicio', 'mov', 'contas', 'planos'];
  const NOMES_FIN = { inicio: 'Resumo', mov: 'Extrato', contas: 'Contas', planos: 'Planos' };
  const GRUPOS_NAV = {
    financas: { titulo: 'Finanças', telas: FIN, nomes: NOMES_FIN },
    memoria: { titulo: 'Memória', telas: ['cerebro', 'biblioteca'], nomes: { cerebro: 'Segundo cérebro', biblioteca: 'Biblioteca' } },
    hoje: { titulo: null, telas: ['hoje', 'habitos'], nomes: { hoje: 'Hoje', habitos: 'Hábitos e saúde' } },
  };
  const grupoDaTela = (t, telas) => Object.keys(GRUPOS_NAV).find(g => GRUPOS_NAV[g].telas.includes(t) && GRUPOS_NAV[g].telas.filter(x => telas[x] || FIN.includes(x)).length > 1) || null;
  const celular = () => !window.matchMedia('(min-width: 820px)').matches;

  function desenhar() {
    const telas = { inicio: telaInicio, mov: telaMov, finn: telaFinn, planos: telaPlanos, ajustes: telaAjustes, ...EXT.telas };
    if (!telas[M.tela]) M.tela = telas.hoje ? 'hoje' : 'inicio';
    document.body.dataset.atual = M.tela;
    const fin = FIN.includes(M.tela), g = grupoDaTela(M.tela, telas), G = g && GRUPOS_NAV[g];
    if (fin) M.ultimaFin = M.tela;
    if (g) M.ultimaGrupo = Object.assign(M.ultimaGrupo || {}, { [g]: M.tela });
    $$('button[data-tela]').forEach(b => b.classList.toggle('on', b.dataset.tela === M.tela || (!!g && b.dataset.tela === g && b.closest('#abas') !== null)));
    $('#titulo').textContent = G && G.titulo && celular() ? G.titulo : (TITULOS[M.tela] || EXT.titulos[M.tela] || '');
    const sn = $('#subnav');
    if (sn) { sn.innerHTML = G ? `<div class="seg largo">${G.telas.filter(t => telas[t]).map(t => `<button class="${t === M.tela ? 'on' : ''}" data-tela="${t}">${G.nomes[t]}</button>`).join('')}</div>` : ''; sn.classList.toggle('on', !!G); }
    telas[M.tela]();
    EXT.aoMudar.forEach(f => { try { f(M.tela); } catch (e) { console.error(e); } });
    statusNuvem();
  }
  function redesenhar() {
    const a = document.activeElement;
    if (a && /INPUT|TEXTAREA|SELECT/.test(a.tagName) && !['busca', 'chat-texto'].includes(a.id)) { redesenhoPendente = true; return; }
    if (M.tela === 'finn') { desenharMensagens(); return; }
    desenhar();
    if (M.folha) abrirFolha(M.folha, true);
  }
  document.addEventListener('focusout', () => setTimeout(() => { if (redesenhoPendente) { redesenhoPendente = false; redesenhar(); } }, 300));

  /* ---------- Início ---------- */
  function seletorPeriodo() {
    const p = periodoAtual();
    return `<div class="periodo">
      <div class="seg">
        <button class="${M.periodo === 'mes' ? 'on' : ''}" data-acao="periodo" data-v="mes">Mês</button>
        <button class="${M.periodo === '30d' ? 'on' : ''}" data-acao="periodo" data-v="30d">30 dias</button>
      </div>
      ${M.periodo === 'mes' ? `<div class="mes-nav"><button class="redondo" data-acao="mes" data-v="-1" aria-label="Mês anterior">${ic('esq')}</button><strong>${esc(p.nome)}</strong><button class="redondo" data-acao="mes" data-v="1" aria-label="Próximo mês" ${M.mes >= hojeYM() ? 'disabled' : ''}>${ic('dir')}</button></div>` : `<div class="mes-nav"><strong>${F.dataBR(p.de)} – ${F.dataBR(p.ate)}</strong></div>`}
    </div>`;
  }

  const siglaBanco = b => ({ 'Inter': 'in', 'Itaú': 'it', 'InfinitePay': 'ip', 'Nubank': 'nu', 'Mercado Pago': 'mp', 'Banco do Brasil': 'bb', 'C6 Bank': 'c6', 'PicPay': 'pp' }[b] || String(b).slice(0, 2).toLowerCase());
  const logoBanco = b => `<span class="logo-banco" data-b="${esc(b)}">${esc(siglaBanco(b))}</span>`;
  function telaInicio() {
    const p = perfilD();
    const per = periodoAtual();
    const r = F.resumo(D, per.de, per.ate);
    const s = F.saldos(D);
    const NIVEL = { alto: 0, medio: 1, baixo: 2 };
    const alertas = [...EXT.alertas.flatMap(f => { try { return f(D) || []; } catch (e) { console.error(e); return []; } }), ...F.alertas(D, M.periodo === 'mes' ? M.mes : hojeYM())]
      .map((a, k) => ({ a, k })).sort((x, y) => (NIVEL[x.a.nivel] ?? 3) - (NIVEL[y.a.nivel] ?? 3) || x.k - y.k).map(x => x.a);
    const vazio = !D.transacoes.length;
    let h = `<div class="saudacao"><span>${saudacao()}${p.nome ? ', ' + esc(p.nome) : ''}</span></div>`;
    if (vazio) {
      h += `<div class="card destaque vazio-inicio"><h3>Vamos começar</h3><p>${PC ? 'Conecte seus bancos pela Belvo em Ajustes, ou importe um extrato.' : 'Abra o Jarvis no computador e conecte este celular em Ajustes → Celular. Os dados aparecem aqui sozinhos.'}</p><button class="btn pri" data-ir="ajustes">Ir para Ajustes</button></div>`;
      $('#tela').innerHTML = h; return;
    }
    if (!PC && !navigator.standalone && !matchMedia('(display-mode: standalone)').matches && !localStorage.getItem('finn-inst')) {
      h += `<div class="card instalar"><b>Deixe o Jarvis como app</b><p>Toque em <b>Compartilhar</b> (quadrado com seta) e depois em <b>Adicionar à Tela de Início</b>.</p><button class="btn" data-acao="inst-ok">Entendi</button></div>`;
    }
    h += seletorPeriodo();
    h += `<div class="grade inicio">`;
    // alertas, no topo e com destaque
    if (alertas.length) {
      const mostra = M.todosAlertas ? alertas : alertas.slice(0, 3);
      h += `<section class="card alertas largo"><div class="rot">Atenção</div><div class="alertas-grade">${mostra.map(a => `<div class="alerta n-${a.nivel}${a.ir ? ' toca' : ''}"${a.ir ? ` data-ir="${esc(a.ir)}" role="button" tabindex="0"` : ''}>${ic(a.ic || 'alerta')}<div><b>${esc(a.titulo)}</b><p>${esc(a.texto)}</p></div>${a.ir ? ic('dir', 'seta') : ''}</div>`).join('')}</div>${alertas.length > 3 ? `<button class="btn link" data-acao="alertas">${M.todosAlertas ? 'Mostrar menos' : `Ver mais ${alertas.length - 3}`}</button>` : ''}</section>`;
    }
    // saldo
    h += `<section class="card saldo">
      <div class="rot">Saldo nas contas</div>
      <div class="grande">${dinheiro(s.total)}</div>
      <div class="bancos">${s.contas.map(c => `<div class="banco-linha">${logoBanco(c.banco)}<span>${esc(c.banco)}</span><b>${dinheiro(c.saldo)}</b></div>`).join('')}</div>
      <div class="rodape-card">${s.atualizado ? 'Atualizado ' + quando(s.atualizado) : ''}${M.belvo && M.belvo.conectado ? ' · pela Belvo' : ''}</div>
    </section>`;
    // resultado do período
    const largura = r.entradas > 0 ? Math.min(100, r.saidas / r.entradas * 100) : (r.saidas ? 100 : 0);
    h += `<section class="card resultado">
      <div class="rot">${esc(per.nome)}</div>
      <div class="linha-valor"><span>Entrou</span><b class="verde">${dinheiro(r.entradas)}</b></div>
      <div class="linha-valor"><span>Saiu</span><b>${dinheiro(r.saidas)}</b></div>
      <div class="barra-uso ${r.saidas > r.entradas ? 'passou' : ''}"><i style="width:${largura}%"></i></div>
      <div class="linha-valor forte"><span>${r.resultado >= 0 ? 'Sobrou' : 'Faltou'}</span><b class="${r.resultado >= 0 ? 'verde' : 'vermelho'}">${dinheiro(Math.abs(r.resultado))}</b></div>
      <div class="rodape-card">${r.saidas > r.entradas ? `Você gastou ${pct(r.saidas, r.entradas) - 100}% a mais do que entrou` : r.entradas ? `Gastou ${pct(r.saidas, r.entradas)}% do que entrou` : 'Nenhuma entrada no período'}${r.estornos.n ? ` · ${r.estornos.n} estornos descontados` : ''}</div>
    </section>`;
    // plano / renda
    const plano = (D.planos || []).find(x => x.ativo);
    const rb = F.rendaBase(D);
    h += `<section class="card plano-card"><div class="rot">Seu plano</div>` + (plano
      ? `<h3>${esc(plano.nome)}</h3><p class="muted">${esc(plano.resumo)}</p>${orcResumo()}<button class="btn" data-ir="planos">Ver plano</button>`
      : `<p>${rb.fonte === 'informada' ? `Sua renda: <b>${dinheiro(rb.valor)}</b> por mês.` : 'Ainda sem plano. O Jarvis monta um com base no que você ganha e no que você gasta.'}</p><div class="linha-btn"><button class="btn pri" data-acao="perguntar" data-v="Monte um plano pra mim com base no que eu ganho e no que eu gasto.">${ic('finn')} Montar com o Jarvis</button><button class="btn" data-ir="planos">Ver sugestão</button></div>`) + `</section>`;
    // para onde foi
    const tot = r.saidas || 1;
    h += `<section class="card onde"><div class="rot">Para onde foi o dinheiro</div>
      <div class="barra-grupos">${ORDEM_GRUPOS.filter(g => r.porGrupo[g]).map(g => `<i style="width:${r.porGrupo[g] / tot * 100}%;background:${GRUPOS[g].cor}" title="${GRUPOS[g].nome}"></i>`).join('')}</div>
      <div class="grupos">${ORDEM_GRUPOS.filter(g => r.porGrupo[g]).map(g => {
        const aberto = M.grupoAberto === g;
        const cats = Object.entries(r.porCategoria).filter(([c]) => F.grupoDe(c, D) === g).sort((a, b) => b[1] - a[1]);
        return `<button class="grupo-linha ${aberto ? 'aberto' : ''}" data-acao="grupo" data-v="${g}"><span class="ponto" style="background:${GRUPOS[g].cor}"></span><span class="gnome">${GRUPOS[g].nome}${g === 'estilo' ? ' <em>supérfluos</em>' : ''}</span><span class="gpct">${pct(r.porGrupo[g], tot)}%</span><b>${dinheiro(r.porGrupo[g])}</b>${ic('dir', 'seta')}</button>` +
          (aberto ? `<div class="subcats">${cats.map(([c, v]) => `<button class="subcat" data-acao="ver-cat" data-v="${c}">${bolinha(c)}<span>${esc(CAT[c].nome)}</span><b>${dinheiro(v)}</b></button>`).join('')}</div>` : '');
      }).join('')}</div>
      <p class="muted pequeno">Toque num grupo para ver as categorias.${r.entreContas.n ? ` Transferências entre as suas contas (${r.entreContas.n}) não entram nessa conta.` : ''}</p>
    </section>`;
    // contas fixas
    const fixas = F.contasFixas(D);
    if (EXT.cardFixas && (D.fixas || []).length) h += EXT.cardFixas(D);
    else h += `<section class="card fixas"><div class="rot">Contas fixas <span class="dica">por mês</span></div>
      ${fixas.length ? `<div class="lista-simples">${fixas.slice(0, 7).map(f => `<div class="ls-linha">${bolinha(f.categoria)}<div class="ls-txt"><b>${esc(f.nome)}</b><small>${f.dia ? 'cai por volta do dia ' + f.dia : ''}</small></div><span>${dinheiro(f.porMes)}</span></div>`).join('')}</div>
      <div class="total-linha"><span>Total por mês</span><b>${dinheiro(F.soma(fixas, f => f.porMes))}</b></div>` : '<p class="muted">Nenhuma conta fixa detectada ainda.</p>'}
    </section>`;
    // supérfluos
    const sup = r.lojas.filter(l => F.grupoDe(l.categoria, D) === 'estilo');
    const supTot = r.porGrupo.estilo || 0;
    h += `<section class="card superfluos"><div class="rot">Supérfluos <span class="dica">estilo de vida</span></div>
      <div class="grande menor">${dinheiro(supTot)} <small>${r.entradas ? pct(supTot, r.entradas) + '% do que entrou' : ''}</small></div>
      <div class="lista-simples duas">${sup.slice(0, 8).map(l => `<button class="ls-linha" data-acao="ver-loja" data-v="${esc(l.nome)}">${bolinha(l.categoria)}<div class="ls-txt"><b>${esc(l.nome)}</b><small>${l.n}× · média ${dinheiro(l.total / l.n)}</small></div><span>${dinheiro(l.total)}</span></button>`).join('')}</div>
    </section>`;
    // pergunte
    h += `<section class="card pergunte"><div class="rot">Pergunte ao Jarvis</div><div class="chips">${SUGESTOES.slice(0, 4).map(s => `<button class="chip" data-acao="perguntar" data-v="${esc(s)}">${esc(s)}</button>`).join('')}</div></section>`;
    h += `</div>`;
    $('#tela').innerHTML = h;
  }
  function orcResumo() {
    const os = F.orcamentos(D, hojeYM()).slice(0, 3);
    if (!os.length) return '';
    return `<div class="orc-mini">${os.map(o => `<div><span>${esc(o.nome)}</span><div class="barra-uso ${o.pct >= 1 ? 'passou' : o.pct >= .8 ? 'quase' : ''}"><i style="width:${Math.min(100, o.pct * 100)}%"></i></div><small>${dinheiro(o.gasto)} de ${dinheiro(o.limite)}</small></div>`).join('')}</div>`;
  }
  const perfilD = () => F.perfil(D);

  /* ---------- Movimentações ---------- */
  function telaMov() {
    const f = M.filtro;
    const meses = F.mesesDisponiveis(D).reverse();
    const bancos = [...new Set(D.transacoes.map(t => t.banco))].sort();
    const q = F.norm(f.q);
    let ts = D.transacoes.filter(t => (f.mes === 'todos' || t.data.startsWith(f.mes)) && (!f.tipo || t.tipo === f.tipo) && (!f.banco || t.banco === f.banco) && (!f.cat || t.categoria === f.cat || ('grupo:' + F.grupoDe(t.categoria, D)) === f.cat) && (!q || F.norm(t.descricao + ' ' + F.nomeCurto(t.descricao) + ' ' + (t.nota || '') + ' ' + (CAT[t.categoria] || {}).nome).includes(q)));
    ts.sort((a, b) => b.data.localeCompare(a.data) || (b.criadoEm || '').localeCompare(a.criadoEm || ''));
    const nf = ['tipo', 'banco', 'cat'].filter(k => f[k]).length + (f.mes !== 'todos' ? 1 : 0);
    const totS = F.soma(ts.filter(t => t.tipo === 'saida' && F.conta(t))), totE = F.soma(ts.filter(t => t.tipo === 'entrada' && F.conta(t)));
    let h = `<div class="busca-linha"><label class="campo-busca">${ic('busca')}<input id="busca" type="search" placeholder="Buscar lugar, pessoa, categoria…" value="${esc(f.q)}" enterkeyhint="search" autocomplete="off"></label>
      <button class="redondo ${M.filtrosAbertos || nf ? 'on' : ''}" data-acao="filtros" aria-label="Filtros">${ic('filtro')}${nf ? `<em>${nf}</em>` : ''}</button>
      <button class="redondo pri" data-acao="nova-tx" aria-label="Adicionar">${ic('mais')}</button></div>`;
    if (M.filtrosAbertos) h += `<div class="card filtros">
      <div class="seg largo">${[['', 'Tudo'], ['saida', 'Saídas'], ['entrada', 'Entradas']].map(([v, n]) => `<button class="${f.tipo === v ? 'on' : ''}" data-acao="f-tipo" data-v="${v}">${n}</button>`).join('')}</div>
      <div class="filtros-grade">
        <label>Mês<select data-filtro="mes"><option value="todos">Todos</option>${meses.map(m => `<option value="${m}" ${f.mes === m ? 'selected' : ''}>${F.nomeMes(m)}</option>`).join('')}</select></label>
        <label>Banco<select data-filtro="banco"><option value="">Todos</option>${bancos.map(b => `<option ${f.banco === b ? 'selected' : ''}>${esc(b)}</option>`).join('')}</select></label>
        <label>Categoria<select data-filtro="cat"><option value="">Todas</option>${opcoesCat(f.cat, true)}</select></label>
      </div>${nf ? '<button class="btn link" data-acao="f-limpar">Limpar filtros</button>' : ''}</div>`;
    h += `<div class="totais-mov"><span>${ts.length} movimentaç${ts.length === 1 ? 'ão' : 'ões'}</span><span>Saídas <b>${dinheiro(totS)}</b></span><span>Entradas <b class="verde">${dinheiro(totE)}</b></span></div>`;
    if (!ts.length) h += `<div class="card vazio-lista"><p>Nada encontrado.</p></div>`;
    const porDia = new Map();
    ts.slice(0, 400).forEach(t => (porDia.get(t.data) || porDia.set(t.data, []).get(t.data)).push(t));
    for (const [dia, lista] of porDia) {
      const saiuDia = F.soma(lista.filter(t => t.tipo === 'saida' && F.conta(t)));
      h += `<div class="dia"><div class="dia-cab"><span>${esc(diaSemana(dia))}</span>${saiuDia ? `<span>−${dinheiro(saiuDia)}</span>` : ''}</div><div class="card lista-tx">${lista.map(linhaTx).join('')}</div></div>`;
    }
    if (ts.length > 400) h += `<p class="muted centro">Mostrando as 400 mais recentes. Use a busca ou os filtros.</p>`;
    const foco = document.activeElement && document.activeElement.id === 'busca';
    const pos = foco ? document.activeElement.selectionStart : null;
    $('#tela').innerHTML = h;
    if (foco) { const b = $('#busca'); b.focus(); try { b.setSelectionRange(pos, pos); } catch {} }
  }
  function linhaTx(t) {
    const fora = !F.conta(t);
    const marca = t.categoria === 'entre_contas' ? '<em class="tag">entre contas</em>' : t._estornada ? '<em class="tag">estornada</em>' : t._estornoDe ? '<em class="tag">estorno</em>' : t.ignorar ? '<em class="tag">ignorada</em>' : '';
    return `<button class="tx ${fora ? 'fora' : ''}" data-acao="tx" data-v="${t.id}">${bolinha(t.categoria)}
      <div class="tx-txt"><b>${esc(F.nomeCurto(t.descricao))}</b><small>${esc((CAT[t.categoria] || {}).nome || '')} · ${esc(t.banco)} ${marca}</small></div>
      <span class="tx-valor ${t.tipo === 'entrada' ? 'verde' : ''}">${t.tipo === 'entrada' ? '+' : '−'}${dinheiro(t.valor)}</span></button>`;
  }
  function opcoesCat(sel, comGrupos) {
    let h = '';
    if (comGrupos) h += `<optgroup label="Grupos">${['fixo', 'essencial', 'estilo', 'pessoas', 'outros'].map(g => `<option value="grupo:${g}" ${sel === 'grupo:' + g ? 'selected' : ''}>${GRUPOS[g].nome}</option>`).join('')}</optgroup>`;
    for (const g of ['receita', 'fixo', 'essencial', 'estilo', 'pessoas', 'outros', 'interna']) {
      const cs = F.CATS.filter(c => c.grupo === g);
      h += `<optgroup label="${GRUPOS[g].nome}">${cs.map(c => `<option value="${c.id}" ${sel === c.id ? 'selected' : ''}>${esc(c.nome)}</option>`).join('')}</optgroup>`;
    }
    return h;
  }

  /* ---------- Jarvis Finance (chat) ---------- */
  const SUGESTOES = ['Como foi meu mês?', 'Onde eu posso cortar gastos?', 'Monte um plano pra eu juntar uma reserva', 'Quais são minhas contas fixas?', 'Quanto gastei de Uber?', 'Quero atualizar minha renda'];
  const SUGESTOES_CHAT = ['O que eu tenho hoje?', 'Como foi meu mês?', 'O que eu já aprendi sobre foco?', 'Me lembra de pagar o IPVA na sexta', 'Onde eu posso cortar gastos?', 'Monte um plano pra eu juntar uma reserva'];
  function telaFinn() {
    $('#tela').innerHTML = `<div class="chat">
      <div class="chat-topo">${M.iaOk ? `<span class="ok-ia">${ic('check')} IA conectada</span>` : `<span class="sem-ia">IA não configurada</span>`}${(D.chat || []).length ? `<button class="btn link" data-acao="limpar-chat">Nova conversa</button>` : ''}</div>
      <div class="mensagens" id="mensagens"></div>
      <form class="chat-barra" id="chat-form">
        <textarea id="chat-texto" rows="1" placeholder="${M.iaOk ? 'Mensagem para o Jarvis' : 'Configure a IA em Ajustes'}" enterkeyhint="send" ${M.iaOk ? '' : 'disabled'}></textarea>
        <button class="enviar" type="submit" aria-label="Enviar" ${M.iaOk ? '' : 'disabled'}>${ic('enviar')}</button>
      </form></div>`;
    desenharMensagens();
    if (window.matchMedia('(pointer: fine)').matches && M.iaOk) $('#chat-texto').focus();
  }
  function desenharMensagens() {
    const box = $('#mensagens'); if (!box) return;
    const msgs = D.chat || [];
    let h = '';
    if (!M.iaOk) h += `<div class="card config-ia">${blocoIA(true)}</div>`;
    if (!msgs.length) {
      h += `<div class="boas-vindas"><div class="avatar grande-av">${ic('finn')}</div><h2>Oi${perfilD().nome ? ', ' + esc(perfilD().nome) : ''}! Eu sou o Jarvis.</h2><p>Cuido do seu dinheiro, da sua rotina, do seu segundo cérebro e da sua biblioteca. Pode perguntar do seu jeito.</p>
        <div class="chips">${SUGESTOES_CHAT.map(s => `<button class="chip" data-acao="perguntar" data-v="${esc(s)}" ${M.iaOk ? '' : 'disabled'}>${esc(s)}</button>`).join('')}</div></div>`;
    }
    for (const m of msgs) {
      if (m.papel === 'eu') h += `<div class="msg eu"><div class="balao">${esc(m.texto).replace(/\n/g, '<br>')}</div></div>`;
      else h += `<div class="msg finn"><div class="avatar">${ic('finn')}</div><div class="balao">${markdown(m.texto)}${(m.acoes || []).length ? `<div class="acoes">${m.acoes.map(a => `<span>${ic('check')}${esc(a)}</span>`).join('')}</div>` : ''}${m.erro ? `<div class="erro-msg">${esc(m.erro)}</div>` : ''}</div></div>`;
    }
    if (M.pensando) h += `<div class="msg finn"><div class="avatar">${ic('finn')}</div><div class="balao digitando"><i></i><i></i><i></i></div></div>`;
    box.innerHTML = h;
    requestAnimationFrame(() => { box.scrollTop = box.scrollHeight; const sc = $('#tela'); if (sc) sc.scrollTop = sc.scrollHeight; });
  }
  function markdown(t) {
    const linhas = esc(t || '').split('\n');
    let h = '', lista = null;
    const inline = s => s.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/(^|[^*])\*(?!\s)(.+?)\*(?!\*)/g, '$1<i>$2</i>').replace(/`([^`]+)`/g, '<code>$1</code>');
    const fecha = () => { if (lista) { h += `</${lista}>`; lista = null; } };
    for (const l of linhas) {
      const ul = l.match(/^\s*[-*•]\s+(.*)/), ol = l.match(/^\s*\d+[.)]\s+(.*)/), hd = l.match(/^\s*#{1,4}\s+(.*)/);
      if (ul) { if (lista !== 'ul') { fecha(); h += '<ul>'; lista = 'ul'; } h += `<li>${inline(ul[1])}</li>`; }
      else if (ol) { if (lista !== 'ol') { fecha(); h += '<ol>'; lista = 'ol'; } h += `<li>${inline(ol[1])}</li>`; }
      else { fecha(); if (hd) h += `<p class="md-t">${inline(hd[1])}</p>`; else if (l.trim()) h += `<p>${inline(l)}</p>`; }
    }
    fecha();
    return h;
  }
  async function enviarMensagem(texto) {
    texto = String(texto || '').trim();
    if (!texto || M.pensando) return;
    if (!M.iaOk) { aviso('Configure a IA em Ajustes primeiro.'); return; }
    if (M.tela !== 'finn') { M.tela = 'finn'; desenhar(); }
    D.chat.push({ id: F.uid(), papel: 'eu', texto, em: new Date().toISOString() });
    M.pensando = true; salvar(); desenharMensagens();
    const ta = $('#chat-texto'); if (ta) { ta.value = ''; ajustaAltura(ta); }
    let resposta;
    try {
      const r = await A.responder(texto, D, { historico: D.chat.slice(0, -1), aoMudar: () => { salvar(); } });
      resposta = { id: F.uid(), papel: 'finn', texto: r.texto, acoes: r.acoes, em: new Date().toISOString() };
    } catch (e) {
      resposta = { id: F.uid(), papel: 'finn', texto: '', erro: e.message, em: new Date().toISOString() };
    }
    D.chat.push(resposta);
    if (D.chat.length > 300) D.chat.splice(0, D.chat.length - 300);
    M.pensando = false; salvar();
    if (M.tela === 'finn') desenharMensagens(); else desenhar();
    if (resposta.acoes && resposta.acoes.length && M.tela !== 'finn') aviso('O Jarvis atualizou seus dados.');
  }
  function ajustaAltura(ta) { ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight, 160) + 'px'; }

  /* ---------- Planos ---------- */
  function telaPlanos() {
    const rb = F.rendaBase(D), det = F.rendaDetectada(D), sug = F.planoSugerido(D);
    const os = F.orcamentos(D, hojeYM());
    let h = `<div class="grade">`;
    // renda
    h += `<section class="card renda"><div class="rot">Sua renda</div>`;
    if ((D.renda || []).length) {
      h += `<div class="grande menor">${dinheiro(F.rendaMensal(D))}<small>por mês</small></div><div class="lista-simples">${D.renda.map(r => `<button class="ls-linha" data-acao="renda" data-v="${r.id}">${bolinha('salario')}<div class="ls-txt"><b>${esc(r.nome)}</b><small>${r.frequencia && r.frequencia !== 'mensal' ? r.frequencia : 'mensal'}${r.dia ? ' · dia ' + r.dia : ''}</small></div><span>${dinheiro(r.valor)}</span></button>`).join('')}</div>`;
    } else {
      h += `<p>Você ainda não informou sua renda. Nos últimos 30 dias entraram <b>${dinheiro(det.salario)}</b> de salário${det.vendas ? `, <b>${dinheiro(det.vendas)}</b> de vendas` : ''}${det.beneficios ? ` e <b>${dinheiro(det.beneficios)}</b> de benefícios` : ''}.</p>`;
      if (det.salario) h += `<button class="btn" data-acao="usar-detectada">Usar ${dinheiro(det.salario)} de salário como renda mensal</button>`;
    }
    h += `<button class="btn link" data-acao="renda" data-v="">${ic('mais')} Adicionar renda</button></section>`;
    // plano sugerido
    h += `<section class="card sugestao"><div class="rot">Plano sugerido <span class="dica">pelos princípios dos 3 livros</span></div>
      <ol class="passos">
        <li><b>Pague-se primeiro:</b> no dia que o dinheiro entra, separe <b>${dinheiro(sug.pagueSePrimeiro)}</b> antes de gastar qualquer coisa.</li>
        <li><b>Reserva de emergência:</b> juntar <b>${dinheiro(sug.reservaMin)}</b> (3 meses dos seus custos essenciais de ${dinheiro(sug.essenciais)})${sug.mesesAteReserva ? `, em cerca de <b>${sug.mesesAteReserva} ${sug.mesesAteReserva === 1 ? 'mês' : 'meses'}</b>` : ''}. Depois, até ${dinheiro(sug.reservaIdeal)}.</li>
        <li><b>Supérfluos com limite:</b> ${sug.cortes.slice(0, 4).map(c => `${esc(c.nome)} até ${dinheiro(c.limite, { centavos: false })}`).join(', ')}. Libera uns <b>${dinheiro(sug.economia, { centavos: false })}</b> por mês.</li>
        <li><b>Depois da reserva:</b> o que sobrar vai para investimento simples e de longo prazo.</li>
      </ol>
      ${sug.grandesFora.length ? `<p class="muted pequeno">Não entraram na conta, por serem compras grandes que não se repetem: ${sug.grandesFora.map(g => `${esc(g.nome)} (${dinheiro(g.valor)})`).join(', ')}.</p>` : ''}
      <div class="linha-btn"><button class="btn pri" data-acao="aplicar-sugestao">Aplicar esses limites</button><button class="btn" data-acao="perguntar" data-v="Me ajuda a ajustar esse plano sugerido ao meu jeito.">${ic('finn')} Ajustar com o Jarvis</button></div>
      ${rb.fonte !== 'informada' ? '<p class="muted pequeno">Calculado com a renda detectada nos últimos 30 dias. Informe sua renda para ficar exato.</p>' : ''}
    </section>`;
    // orçamentos
    h += `<section class="card orcamentos"><div class="rot">Limites de ${F.nomeMes(hojeYM())}</div>
      ${os.length ? os.map(o => `<button class="orc" data-acao="orcamento" data-v="${o.id}"><div class="orc-cab"><span>${esc(o.nome)}</span><span><b>${dinheiro(o.gasto)}</b> de ${dinheiro(o.limite)}</span></div><div class="barra-uso ${o.pct >= 1 ? 'passou' : o.pct >= .8 ? 'quase' : ''}"><i style="width:${Math.min(100, o.pct * 100)}%"></i></div><small>${o.resta >= 0 ? 'Restam ' + dinheiro(o.resta) : 'Passou ' + dinheiro(-o.resta)}</small></button>`).join('') : '<p class="muted">Nenhum limite ainda.</p>'}
      <button class="btn link" data-acao="orcamento" data-v="">${ic('mais')} Novo limite</button></section>`;
    // metas
    h += `<section class="card metas"><div class="rot">Metas</div>
      ${(D.metas || []).length ? D.metas.map(m => { const p = m.alvo > 0 ? Math.min(1, (m.guardado || 0) / m.alvo) : 0; return `<button class="meta" data-acao="meta" data-v="${m.id}"><div class="orc-cab"><span>${esc(m.nome)}</span><span><b>${dinheiro(m.guardado || 0)}</b> de ${dinheiro(m.alvo)}</span></div><div class="barra-uso meta-b"><i style="width:${p * 100}%"></i></div><small>${Math.round(p * 100)}%${m.mensal ? ' · ' + dinheiro(m.mensal) + ' por mês' : ''}${m.prazo ? ' · até ' + F.nomeMes(m.prazo) : ''}</small></button>`; }).join('') : '<p class="muted">Nenhuma meta ainda.</p>'}
      <button class="btn link" data-acao="meta" data-v="">${ic('mais')} Nova meta</button></section>`;
    // planos salvos
    const planos = [...(D.planos || [])].sort((a, b) => (b.criadoEm || '').localeCompare(a.criadoEm || ''));
    h += `<section class="card planos-salvos"><div class="rot">Planos</div>${planos.length ? planos.map(p => `<button class="plano-item" data-acao="plano" data-v="${p.id}"><div><b>${esc(p.nome)}</b>${p.ativo ? '<em class="tag ativo">ativo</em>' : ''}<small>${esc(p.resumo || '')}</small></div>${ic('dir')}</button>`).join('') : '<p class="muted">O Jarvis salva aqui os planos que vocês montarem juntos.</p>'}
      <button class="btn link" data-acao="perguntar" data-v="Monte um plano pra mim com base no que eu ganho e no que eu gasto.">${ic('finn')} Montar um plano com o Jarvis</button></section>`;
    // projeção
    const pj = F.projecao(D, 6);
    const maxAbs = Math.max(1, ...pj.linhas.map(l => Math.abs(l.acumulado)));
    h += `<section class="card projecao"><div class="rot">Se continuar assim <span class="dica">próximos 6 meses</span></div>
      <p>Renda ${dinheiro(pj.renda)} − gastos previstos ${dinheiro(pj.gastoPrevisto)} = <b class="${pj.sobraMensal >= 0 ? 'verde' : 'vermelho'}">${dinheiro(pj.sobraMensal, { sinal: true })}</b> por mês.</p>
      <div class="barras">${pj.linhas.map(l => `<div class="barra-col"><div class="col-area"><i class="${l.acumulado < 0 ? 'neg' : ''}" style="height:${Math.max(3, Math.abs(l.acumulado) / maxAbs * 100)}%"></i></div><small>${F.nomeMesCurto(l.mes)}</small><b>${dinheiro(l.acumulado, { centavos: false })}</b></div>`).join('')}</div>
      <p class="muted pequeno">Saldo acumulado nas contas, partindo de ${dinheiro(pj.saldoAtual)} hoje. Usa o gasto típico dos últimos 30 dias${pj.grandesFora.length ? ' (sem compras grandes avulsas)' : ''} e os limites que você definiu.</p></section>`;
    h += `</div>`;
    $('#tela').innerHTML = h;
  }

  /* ---------- Ajustes ---------- */
  function blocoIA(curto) {
    return `<div class="ia-bloco"><h3>${ic('finn')} IA do Jarvis</h3>
      ${M.iaOk ? `<p>Conectada${A.modelo ? ` (${esc(A.modelo)})` : ''}. Para trocar, cole outra chave abaixo.</p>` : `<p>Para conversar, o Jarvis usa a IA do Google (Gemini), que tem uso gratuito. Você só precisa de uma chave:</p>
      <ol class="passos"><li>Abra o <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener">Google AI Studio</a> e entre com sua conta Google.</li><li>Toque em <b>Create API key</b> e copie a chave (começa com <b>AIza</b>).</li><li>Cole aqui embaixo.</li></ol>`}
      <div class="linha-campo"><input type="password" id="chave-ia" placeholder="Cole a chave (começa com AQ.)" autocomplete="off" autocapitalize="none" spellcheck="false"><button class="btn pri" data-acao="salvar-ia">Salvar</button></div>
      ${curto ? '' : `<p class="muted pequeno">Privacidade: no uso gratuito, o Google pode usar o que é enviado para melhorar os produtos dele. O Jarvis manda resumos e descrições das movimentações, nunca número de conta, CPF ou senha. Se preferir que nada seja usado, ative o faturamento na sua conta do Google AI Studio (custa centavos por mês nesse uso).</p>${M.iaOk ? '<button class="btn link perigo" data-acao="remover-ia">Remover a chave deste aparelho</button>' : ''}`}
    </div>`;
  }
  function telaAjustes() {
    const p = perfilD();
    let h = `<div class="grade ajustes">`;
    h += `<section class="card"><div class="rot">Você</div>
      <label class="campo-rot">Como o Jarvis te chama<input id="p-nome" value="${esc(p.nome)}" placeholder="Seu nome" autocomplete="off"></label>
      <label class="campo-rot">Seu nome completo, como aparece nos Pix<input id="p-pix" value="${esc(p.nomePix)}" placeholder="Ex.: Breno Magalhaes Matos" autocomplete="off"><small>Serve para reconhecer transferências entre as suas próprias contas, que não contam como gasto.</small></label>
      <button class="btn" data-acao="salvar-perfil">Salvar</button></section>`;
    // bancos
    h += `<section class="card bancos-card"><div class="rot">Bancos</div>${blocoBancos()}</section>`;
    // celular / sincronização
    h += `<section class="card celular-card"><div class="rot">${PC ? 'Celular' : 'Sincronização'}</div><div id="bloco-celular">${blocoCelular()}</div></section>`;
    // IA
    h += `<section class="card">${blocoIA(false)}</section>`;
    // categorias
    h += `<section class="card"><div class="rot">Grupos das categorias</div><p class="muted pequeno">Se algum gasto é necessário pra você (ex.: Uber para trabalhar), mude o grupo dele. Isso muda o que conta como supérfluo.</p>
      <div class="cats-grupos">${F.CATS.filter(c => !['receita', 'interna'].includes(c.grupo)).map(c => `<label class="cg">${bolinha(c.id)}<span class="cg-nome">${esc(c.nome)}</span><select data-grupo-cat="${c.id}">${['fixo', 'essencial', 'estilo', 'pessoas', 'outros'].map(g => `<option value="${g}" ${F.grupoDe(c.id, D) === g ? 'selected' : ''}>${GRUPOS[g].nome}</option>`).join('')}</select></label>`).join('')}</div>
      ${(D.regras || []).length ? `<div class="rot sub">Suas regras</div><div class="lista-simples">${D.regras.map(r => `<div class="ls-linha"><div class="ls-txt"><b>“${esc(r.padrao)}”</b><small>→ ${esc((CAT[r.categoria] || {}).nome || r.categoria)}</small></div><button class="redondo peq" data-acao="apagar-regra" data-v="${r.id}" aria-label="Apagar regra">${ic('lixo')}</button></div>`).join('')}</div>` : ''}
    </section>`;
    // importar / exportar
    h += `<section class="card"><div class="rot">Extratos e backup</div>
      <p class="muted pequeno">Importe o extrato em PDF do Inter, ou OFX/CSV de qualquer banco. O que já existe não é duplicado.</p>
      <div class="linha-btn"><label class="btn">${ic('importar')} Importar extrato<input type="file" id="arq-import" accept=".pdf,.ofx,.csv,.txt,.json" hidden></label>
      <button class="btn" data-acao="exportar-csv">${ic('exportar')} Exportar planilha (CSV)</button>
      <button class="btn" data-acao="exportar-json">${ic('exportar')} Backup completo</button></div></section>`;
    for (const f of EXT.ajustes) { try { h += f() || ''; } catch (e) { console.error(e); } }
    h += `<section class="card"><div class="rot">Sobre</div><p class="muted pequeno">Jarvis Finance ${VERSAO} · ${D.transacoes.length} movimentações · dados guardados ${PC ? 'neste computador' : 'neste celular'}${N.ligada() ? ' e no seu cofre privado do GitHub' : ''}.</p>
      <button class="btn link perigo" data-acao="apagar-tudo">Apagar todos os dados ${PC ? 'deste computador' : 'deste celular'}</button></section>`;
    h += `</div>`;
    $('#tela').innerHTML = h;
  }

  function blocoBancos() {
    const s = F.saldos(D);
    const lista = s.contas.length ? `<div class="lista-simples">${s.contas.map(c => `<div class="ls-linha">${logoBanco(c.banco)}<div class="ls-txt"><b>${esc(c.banco)}</b><small>${c.atualizadoEm ? 'atualizado ' + quando(c.atualizadoEm) : ''}</small></div><span>${dinheiro(c.saldo)}</span></div>`).join('')}</div>` : '';
    if (!PC) return `${lista}<p class="muted pequeno">A conexão com os bancos fica no app do computador. Tudo o que ele puxar aparece aqui sozinho.</p>`;
    const b = M.belvo || {};
    if (M.belvoOcupado) return `${lista}<div class="progresso"><span class="giro"></span>${esc(M.belvoOcupado)}</div>`;
    if (!b.conectado) {
      const semGit = !N.ligada();
      return `${lista}<p>Conecte o Jarvis à <b>Belvo</b> (a mesma que você já usa com o Claude) para puxar sozinho as movimentações e saldos do Inter, Itaú e InfinitePay, todo dia.</p>
      <ol class="passos">${semGit ? `<li class="${M.belvoDepois ? 'passo-atual' : ''}"><b>Ligue o GitHub</b> logo abaixo, em Celular (o mesmo da Carteira).<small>A Belvo só aceita apps com endereço próprio na internet: o Jarvis publica a “ficha” dele no seu GitHub. De quebra, isso já liga o app do iPhone.</small></li>` : ''}
        <li>Clique em <b>Conectar</b>: abre a página da Belvo no navegador.</li><li>Entre com a mesma conta da Belvo e autorize o Jarvis.</li><li>Volte aqui: ele puxa tudo sozinho.</li></ol>
      <div class="linha-btn">${semGit ? `<button class="btn pri" data-acao="belvo-github">${ic('banco')} Ligar o GitHub primeiro</button>` : `<button class="btn pri" data-acao="belvo-conectar">${ic('banco')} Conectar com a Belvo</button>`}</div>
      ${b.erro ? `<p class="erro-msg">${esc(b.erro)}</p>` : ''}${M.belvoDepois && semGit ? '<p class="muted pequeno">Assim que o GitHub ligar, a conexão com a Belvo começa sozinha.</p>' : ''}<p class="muted pequeno">É só leitura: o Jarvis não vê suas senhas e não movimenta dinheiro.</p>`;
    }
    return `${lista}<div class="belvo-status"><span class="ponto-verde"></span><div><b>Conectado à Belvo</b><small>${(b.conexoes || []).map(c => esc(c.nome) + (c.status !== 'valid' ? ' (' + esc(c.status) + ')' : '')).join(' · ') || ''}</small><small>${b.ultimaLeitura ? 'Última leitura ' + quando(b.ultimaLeitura) : ''}${b.ultimaAtualizacao ? ' · bancos consultados ' + quando(b.ultimaAtualizacao) : ''}</small></div></div>
      ${b.erro ? `<p class="erro-msg">${esc(b.erro)}</p>` : ''}
      <div class="linha-btn"><button class="btn pri" data-acao="belvo-atualizar">${ic('atualizar')} Atualizar agora</button><button class="btn" data-acao="belvo-gerenciar">Adicionar ou remover bancos</button><button class="btn link perigo" data-acao="belvo-sair">Desconectar</button></div>
      <p class="muted pequeno">O Jarvis lê o que a Belvo já tem várias vezes ao dia e pede dados novos aos bancos uma vez por dia, para não gastar o limite mensal do Open Finance.</p>`;
  }

  /* ---------- celular (PC) e sincronização (iPhone) ---------- */
  let qrCache = { link: '', img: '' };
  function blocoCelular() {
    if (!PC) {
      if (!N.ligada()) return '<p>Este celular não está conectado.</p>';
      return `<div class="belvo-status"><span class="ponto-verde ${N.estado}"></span><div><b>${{ ok: 'Tudo sincronizado', sync: 'Sincronizando…', erro: 'Não consegui sincronizar', offline: 'Sem internet', off: '' }[N.estado] || ''}</b><small>${N.erro ? esc(N.erro) : 'Conta do GitHub: ' + esc(N.cfg.dono)}</small></div></div>
        <div class="linha-btn"><button class="btn" data-acao="sync-agora">${ic('atualizar')} Sincronizar agora</button><button class="btn link perigo" data-acao="desconectar-celular">Desconectar este celular</button></div>`;
    }
    if (!N.ligada()) return `<p>Para usar o Jarvis no iPhone, seus dados ficam guardados num espaço <b>privado</b> do seu GitHub (o mesmo jeito da Minha Carteira). Você faz isso uma vez só.</p>
      <ol class="passos">
        <li><b>Use a mesma conta do GitHub da Carteira</b> (ou crie uma). <a href="https://github.com/signup" target="_blank" rel="noopener">Abrir cadastro</a></li>
        <li><b>Gere um código de acesso.</b> <a href="https://github.com/settings/tokens/new?scopes=repo&description=Jarvis%20Finance" target="_blank" rel="noopener">Abrir a página do código</a><small>Em Expiration escolha <b>No expiration</b> · confira que <b>repo</b> está marcado · clique em <b>Generate token</b> · copie o código (começa com <b>ghp_</b>).</small></li>
        <li><b>Cole aqui</b> e clique em Conectar.<div class="linha-campo"><input id="tk" type="password" placeholder="ghp_…" autocomplete="off" spellcheck="false"><button class="btn pri" data-acao="conectar-celular">Conectar</button></div><small id="tk-msg"></small></li>
      </ol><p class="muted pequeno">Esse código funciona como uma senha: não mande para ninguém. Ele fica guardado só neste computador e no seu celular.</p>`;
    const link = N.link(M.iaOk && M.mandarChave !== false ? M.chaveIA : '');
    return `<div class="belvo-status"><span class="ponto-verde ${N.estado}"></span><div><b>${{ ok: 'Tudo sincronizado', sync: 'Sincronizando…', erro: 'Não consegui sincronizar', offline: 'Sem internet' }[N.estado] || ''}</b><small>${N.erro ? esc(N.erro) : 'Conta do GitHub: ' + esc(N.cfg.dono)}</small></div></div>
      <div class="qr-grade"><img class="qr" id="qr" alt="QR code para abrir o Jarvis no iPhone" src="${qrCache.link === link ? qrCache.img : ''}">
      <ol class="passos"><li><b>No iPhone, abra a Câmera</b> e aponte para o QR code. Toque no link (abre no Safari).<small>Na primeira vez o endereço pode levar até 5 minutos para entrar no ar.</small></li>
      <li>Toque em <b>Compartilhar</b> (quadrado com seta) e depois em <b>Adicionar à Tela de Início</b>.</li><li>Pronto: o Jarvis vira um app no seu iPhone, com os mesmos dados.</li></ol></div>
      ${M.iaOk ? `<label class="chk-linha"><input type="checkbox" id="mandar-chave" ${M.mandarChave !== false ? 'checked' : ''}> Levar a chave da IA junto no QR code (para o chat funcionar no celular)</label>` : ''}
      <div class="linha-btn"><button class="btn" data-acao="sync-agora">${ic('atualizar')} Sincronizar agora</button><button class="btn" data-acao="republicar">Atualizar o app do celular</button><button class="btn link perigo" data-acao="desconectar-celular">Desconectar</button></div>`;
  }
  async function atualizaQR() {
    const img = $('#qr'); if (!img || !PC || !N.ligada()) return;
    const link = N.link(M.iaOk && M.mandarChave !== false ? M.chaveIA : '');
    if (qrCache.link !== link) qrCache = { link, img: await window.api.qr(link) };
    img.src = qrCache.img;
  }
  const NOME_ESTADO = { ok: 'Sincronizado', sync: 'Sincronizando…', erro: 'Erro na sincronização', offline: 'Sem internet', off: '' };
  function statusNuvem() {
    const b = $('#nuvem'); if (!b) return;
    b.className = 'nuvem ' + N.estado; b.title = N.erro || '';
    $('span', b).textContent = N.ligada() ? NOME_ESTADO[N.estado] || '' : (PC ? 'Celular não conectado' : '');
    if (M.tela === 'ajustes' && !M.folha) { const c = $('#bloco-celular'); if (c && !(document.activeElement && document.activeElement.id === 'tk')) { c.innerHTML = blocoCelular(); atualizaQR(); } }
  }

  /* =====================================================================
     FOLHAS (janelas que sobem de baixo no iPhone / centralizadas no PC)
     ===================================================================== */
  function abrirFolha(f, redesenho) {
    M.folha = f;
    let h = '';
    if (f.tipo === 'tx') {
      const t = D.transacoes.find(x => x.id === f.id); if (!t) return fecharFolha();
      h = `<div class="folha-cab"><h3>${esc(F.nomeCurto(t.descricao))}</h3><button class="redondo" data-acao="fechar" aria-label="Fechar">${ic('fechar')}</button></div>
        <div class="tx-grande ${t.tipo === 'entrada' ? 'verde' : ''}">${t.tipo === 'entrada' ? '+' : '−'}${dinheiro(t.valor)}</div>
        <div class="info-grade"><span>Data</span><b>${F.dataBR(t.data)}</b><span>Banco</span><b>${esc(t.banco)}</b><span>No extrato</span><b class="quebra">${esc(t.descricao)}</b>${t._estornada ? '<span>Situação</span><b>Compra estornada (não conta nos gastos)</b>' : ''}${t._estornoDe ? '<span>Situação</span><b>Estorno de uma compra (não conta como renda)</b>' : ''}</div>
        <label class="campo-rot">Categoria<select id="tx-cat">${opcoesCat(t.categoria, false)}</select></label>
        <label class="chk-linha"><input type="checkbox" id="tx-todas" checked> Aplicar a todas de “${esc(F.nomeCurto(t.descricao))}” e às próximas</label>
        <label class="campo-rot">Nota<textarea id="tx-nota" rows="2" placeholder="Ex.: aluguel de novembro">${esc(t.nota || '')}</textarea></label>
        <label class="chk-linha"><input type="checkbox" id="tx-ignorar" ${t.ignorar ? 'checked' : ''}> Não contar nos totais</label>
        <div class="linha-btn"><button class="btn pri" data-acao="tx-salvar" data-v="${t.id}">Salvar</button>${t.origem === 'manual' ? `<button class="btn perigo" data-acao="tx-apagar" data-v="${t.id}">${ic('lixo')} Apagar</button>` : ''}<button class="btn" data-acao="perguntar" data-v="${esc(`Me explica esta movimentação: ${t.descricao}, ${dinheiro(t.valor)} em ${F.dataBR(t.data)}.`)}">${ic('finn')} Perguntar ao Jarvis</button></div>`;
    } else if (f.tipo === 'nova-tx') {
      h = `<div class="folha-cab"><h3>Nova movimentação</h3><button class="redondo" data-acao="fechar" aria-label="Fechar">${ic('fechar')}</button></div>
        <div class="seg largo" id="nt-tipo"><button class="on" data-acao="nt-tipo" data-v="saida">Saída</button><button data-acao="nt-tipo" data-v="entrada">Entrada</button></div>
        <label class="campo-rot">Valor<input id="nt-valor" inputmode="decimal" placeholder="0,00" autocomplete="off"></label>
        <label class="campo-rot">Descrição<input id="nt-desc" placeholder="Ex.: Feira, dinheiro vivo" autocomplete="off"></label>
        <div class="dois-campos"><label class="campo-rot">Data<input id="nt-data" type="date" value="${F.hoje()}"></label><label class="campo-rot">Onde<input id="nt-banco" value="Dinheiro" autocomplete="off"></label></div>
        <label class="campo-rot">Categoria<select id="nt-cat">${opcoesCat('outros', false)}</select></label>
        <button class="btn pri largo" data-acao="nt-salvar">Adicionar</button>`;
    } else if (f.tipo === 'renda') {
      const r = (D.renda || []).find(x => x.id === f.id) || {};
      h = `<div class="folha-cab"><h3>${r.id ? 'Editar renda' : 'Nova renda'}</h3><button class="redondo" data-acao="fechar" aria-label="Fechar">${ic('fechar')}</button></div>
        <label class="campo-rot">Nome<input id="rd-nome" value="${esc(r.nome || 'Salário')}" autocomplete="off"></label>
        <label class="campo-rot">Valor<input id="rd-valor" inputmode="decimal" value="${r.valor ? String(r.valor).replace('.', ',') : ''}" placeholder="0,00" autocomplete="off"></label>
        <div class="dois-campos"><label class="campo-rot">Frequência<select id="rd-freq">${['mensal', 'quinzenal', 'semanal', 'anual'].map(x => `<option ${(r.frequencia || 'mensal') === x ? 'selected' : ''}>${x}</option>`).join('')}</select></label><label class="campo-rot">Dia que cai<input id="rd-dia" inputmode="numeric" value="${r.dia || ''}" placeholder="Ex.: 5"></label></div>
        <div class="linha-btn"><button class="btn pri" data-acao="rd-salvar" data-v="${r.id || ''}">Salvar</button>${r.id ? `<button class="btn perigo" data-acao="rd-apagar" data-v="${r.id}">${ic('lixo')} Apagar</button>` : ''}</div>`;
    } else if (f.tipo === 'orcamento') {
      const o = (D.orcamentos || []).find(x => x.id === f.id) || {};
      h = `<div class="folha-cab"><h3>${o.id ? 'Editar limite' : 'Novo limite mensal'}</h3><button class="redondo" data-acao="fechar" aria-label="Fechar">${ic('fechar')}</button></div>
        <label class="campo-rot">Categoria ou grupo<select id="or-cat">${opcoesCat(o.categoria || 'uber', true)}</select></label>
        <label class="campo-rot">Limite por mês<input id="or-valor" inputmode="decimal" value="${o.limite ? String(o.limite).replace('.', ',') : ''}" placeholder="0,00" autocomplete="off"></label>
        <div class="linha-btn"><button class="btn pri" data-acao="or-salvar" data-v="${o.id || ''}">Salvar</button>${o.id ? `<button class="btn perigo" data-acao="or-apagar" data-v="${o.id}">${ic('lixo')} Apagar</button>` : ''}</div>`;
    } else if (f.tipo === 'meta') {
      const m = (D.metas || []).find(x => x.id === f.id) || {};
      h = `<div class="folha-cab"><h3>${m.id ? esc(m.nome) : 'Nova meta'}</h3><button class="redondo" data-acao="fechar" aria-label="Fechar">${ic('fechar')}</button></div>
        ${m.id ? `<label class="campo-rot">Guardei mais<div class="linha-campo"><input id="mt-add" inputmode="decimal" placeholder="0,00" autocomplete="off"><button class="btn pri" data-acao="mt-add" data-v="${m.id}">Somar</button></div></label>` : ''}
        <label class="campo-rot">Nome<input id="mt-nome" value="${esc(m.nome || 'Reserva de emergência')}" autocomplete="off"></label>
        <div class="dois-campos"><label class="campo-rot">Quero juntar<input id="mt-alvo" inputmode="decimal" value="${m.alvo ? String(m.alvo).replace('.', ',') : ''}" placeholder="0,00"></label><label class="campo-rot">Já tenho<input id="mt-guardado" inputmode="decimal" value="${m.guardado ? String(m.guardado).replace('.', ',') : ''}" placeholder="0,00"></label></div>
        <div class="dois-campos"><label class="campo-rot">Por mês<input id="mt-mensal" inputmode="decimal" value="${m.mensal ? String(m.mensal).replace('.', ',') : ''}" placeholder="0,00"></label><label class="campo-rot">Até<input id="mt-prazo" type="month" value="${m.prazo || ''}"></label></div>
        <div class="linha-btn"><button class="btn pri" data-acao="mt-salvar" data-v="${m.id || ''}">Salvar</button>${m.id ? `<button class="btn perigo" data-acao="mt-apagar" data-v="${m.id}">${ic('lixo')} Apagar</button>` : ''}</div>`;
    } else if (f.tipo === 'plano') {
      const p = (D.planos || []).find(x => x.id === f.id); if (!p) return fecharFolha();
      h = `<div class="folha-cab"><h3>${esc(p.nome)}</h3><button class="redondo" data-acao="fechar" aria-label="Fechar">${ic('fechar')}</button></div>
        <p>${esc(p.resumo || '')}</p>${(p.passos || []).length ? `<ol class="passos">${p.passos.map(x => `<li>${esc(x)}</li>`).join('')}</ol>` : ''}
        <p class="muted pequeno">Criado em ${quando(p.criadoEm)}${p.origem === 'finn' ? ' com o Jarvis' : ''}.</p>
        <div class="linha-btn">${p.ativo ? '' : `<button class="btn pri" data-acao="plano-ativar" data-v="${p.id}">Deixar como ativo</button>`}<button class="btn perigo" data-acao="plano-apagar" data-v="${p.id}">${ic('lixo')} Apagar</button></div>`;
    } else if (f.tipo === 'importar') {
      const r = f.res;
      const novas = r.transacoes.filter(t => !existe(t)).length;
      h = `<div class="folha-cab"><h3>Importar ${esc(r.info.formato)}</h3><button class="redondo" data-acao="fechar" aria-label="Fechar">${ic('fechar')}</button></div>
        <div class="info-grade"><span>Período</span><b>${F.dataBR(r.info.de)} a ${F.dataBR(r.info.ate)}</b><span>Movimentações</span><b>${r.info.n} no arquivo · ${novas} novas</b>${r.info.conferencia ? `<span>Conferência</span><b>${esc(r.info.conferencia)}</b>` : ''}</div>
        ${r.info.formato === 'PDF do Inter' ? '' : `<label class="campo-rot">De qual banco é?<input id="imp-banco" value="${esc(r.info.banco)}" autocomplete="off"></label>`}
        <button class="btn pri largo" data-acao="imp-ok" ${novas ? '' : 'disabled'}>${novas ? `Importar ${novas} movimentações` : 'Nada novo nesse arquivo'}</button>`;
    } else if (EXT.folhas[f.tipo]) {
      h = EXT.folhas[f.tipo](f, redesenho);
      if (h == null) return fecharFolha();
    } else if (f.tipo === 'progresso') {
      h = `<div class="folha-cab"><h3>${esc(f.titulo)}</h3></div><div class="progresso"><span class="giro"></span><span id="prog-txt">${esc(f.texto || '')}</span></div>`;
    }
    const fo = $('#folha');
    $('.folha-corpo', fo).innerHTML = h;
    if (!redesenho) { fo.classList.add('on'); document.body.classList.add('com-folha'); }
  }
  function fecharFolha() { M.folha = null; $('#folha').classList.remove('on'); document.body.classList.remove('com-folha'); }
  const existe = t => D.transacoes.some(x => F.digital(x) === F.digital(t));
  const numero = s => { const v = I.valorBR(s); return v == null ? NaN : v; };

  /* =====================================================================
     AÇÕES
     ===================================================================== */
  document.addEventListener('click', async ev => {
    const ir = ev.target.closest('[data-ir]');
    if (ir) { M.tela = ir.dataset.ir; fecharFolha(); desenhar(); $('#tela').scrollTop = 0; return; }
    const tab = ev.target.closest('button[data-tela]');
    if (tab) {
      let alvo = tab.dataset.tela;
      if (alvo === 'financas') alvo = FIN.includes(M.tela) ? M.tela : (M.ultimaFin || 'inicio');
      else if (GRUPOS_NAV[alvo] && alvo !== 'hoje') alvo = GRUPOS_NAV[alvo].telas.includes(M.tela) ? M.tela : ((M.ultimaGrupo || {})[alvo] || GRUPOS_NAV[alvo].telas[0]);
      if (M.tela === alvo) { $('#tela').scrollTo({ top: 0, behavior: 'smooth' }); return; }
      M.tela = alvo; fecharFolha(); desenhar(); $('#tela').scrollTop = 0; return;
    }
    if (ev.target.id === 'folha') return fecharFolha();
    const b = ev.target.closest('[data-acao]'); if (!b || b.disabled) return;
    const v = b.dataset.v;
    if (EXT.acoes[b.dataset.acao]) { try { await EXT.acoes[b.dataset.acao](v, b, ev); } catch (e) { console.error(e); aviso(e.message || 'Algo deu errado.', 'erro'); } return; }
    switch (b.dataset.acao) {
      case 'periodo': M.periodo = v; telaInicio(); break;
      case 'inst-ok': localStorage.setItem('finn-inst', '1'); telaInicio(); break;
      case 'alertas': M.todosAlertas = !M.todosAlertas; telaInicio(); break;
      case 'mes': M.mes = v === '-1' ? F.mesAnterior(M.mes) : F.mesSeguinte(M.mes); if (M.mes > hojeYM()) M.mes = hojeYM(); telaInicio(); break;
      case 'grupo': M.grupoAberto = M.grupoAberto === v ? null : v; telaInicio(); break;
      case 'ver-cat': { const per = periodoAtual(); M.filtro = { q: '', tipo: '', banco: '', cat: v, mes: M.periodo === 'mes' ? M.mes : 'todos' }; M.filtrosAbertos = true; M.tela = 'mov'; desenhar(); break; }
      case 'ver-loja': M.filtro = { q: v, tipo: 'saida', banco: '', cat: '', mes: M.periodo === 'mes' ? M.mes : 'todos' }; M.tela = 'mov'; desenhar(); break;
      case 'perguntar': fecharFolha(); enviarMensagem(v); break;
      case 'filtros': M.filtrosAbertos = !M.filtrosAbertos; telaMov(); break;
      case 'f-tipo': M.filtro.tipo = v; telaMov(); break;
      case 'f-limpar': M.filtro = { q: M.filtro.q, tipo: '', banco: '', cat: '', mes: 'todos' }; telaMov(); break;
      case 'tx': abrirFolha({ tipo: 'tx', id: v }); break;
      case 'nova-tx': abrirFolha({ tipo: 'nova-tx' }); break;
      case 'fechar': fecharFolha(); break;
      case 'tx-salvar': {
        const t = D.transacoes.find(x => x.id === v); if (!t) break;
        const cat = $('#tx-cat').value, todas = $('#tx-todas').checked;
        if (cat !== t.categoria || todas) {
          if (todas) {
            const chave = F.chaveLoja(t);
            D.transacoes.forEach(x => { if (F.chaveLoja(x) === chave && x.tipo === t.tipo) { x.categoria = cat; x.catManual = true; } });
            const pad = F.nomeCurto(t.descricao);
            D.regras = D.regras.filter(r => F.norm(r.padrao) !== F.norm(pad));
            if (F.norm(pad).length >= 3) D.regras.push({ id: F.uid(), padrao: pad, categoria: cat, tipo: t.tipo, criadoEm: new Date().toISOString() });
          } else { t.categoria = cat; t.catManual = true; }
        }
        t.nota = $('#tx-nota').value.trim(); t.ignorar = $('#tx-ignorar').checked;
        salvar(); fecharFolha(); desenhar(); aviso('Salvo');
        break;
      }
      case 'tx-apagar': if (certeza('Apagar esta movimentação?')) { D.transacoes = D.transacoes.filter(x => x.id !== v); salvar(); fecharFolha(); desenhar(); } break;
      case 'nt-tipo': $$('#nt-tipo button').forEach(x => x.classList.toggle('on', x === b)); break;
      case 'nt-salvar': {
        const valor = numero($('#nt-valor').value), tipo = $('#nt-tipo .on').dataset.v;
        if (!(Math.abs(valor) > 0)) { aviso('Informe o valor'); break; }
        const t = { id: F.uid(), data: $('#nt-data').value || F.hoje(), valor: F.r2(Math.abs(valor)), tipo, descricao: $('#nt-desc').value.trim() || (tipo === 'saida' ? 'Gasto' : 'Entrada'), banco: $('#nt-banco').value.trim() || 'Dinheiro', categoria: $('#nt-cat').value, catManual: true, origem: 'manual', criadoEm: new Date().toISOString() };
        D.transacoes.push(t); salvar(); fecharFolha(); desenhar(); aviso('Adicionada');
        break;
      }
      case 'renda': abrirFolha({ tipo: 'renda', id: v }); break;
      case 'rd-salvar': {
        const valor = numero($('#rd-valor').value); if (!(valor > 0)) { aviso('Informe o valor'); break; }
        let r = D.renda.find(x => x.id === v); if (!r) { r = { id: F.uid(), criadoEm: new Date().toISOString() }; D.renda.push(r); }
        Object.assign(r, { nome: $('#rd-nome').value.trim() || 'Renda', valor: F.r2(valor), frequencia: $('#rd-freq').value, dia: parseInt($('#rd-dia').value, 10) || null, ativa: true });
        salvar(); fecharFolha(); desenhar(); aviso('Renda salva');
        break;
      }
      case 'rd-apagar': D.renda = D.renda.filter(x => x.id !== v); salvar(); fecharFolha(); desenhar(); break;
      case 'usar-detectada': { const det = F.rendaDetectada(D); D.renda.push({ id: F.uid(), nome: 'Salário', valor: det.salario, frequencia: 'mensal', ativa: true, criadoEm: new Date().toISOString() }); salvar(); desenhar(); aviso('Renda salva. Ajuste se não for todo mês.'); break; }
      case 'orcamento': abrirFolha({ tipo: 'orcamento', id: v }); break;
      case 'or-salvar': {
        const lim = numero($('#or-valor').value); if (!(lim > 0)) { aviso('Informe o limite'); break; }
        const cat = $('#or-cat').value;
        let o = D.orcamentos.find(x => x.id === v) || D.orcamentos.find(x => x.categoria === cat);
        if (!o) { o = { id: F.uid() }; D.orcamentos.push(o); }
        Object.assign(o, { categoria: cat, limite: F.r2(lim) });
        salvar(); fecharFolha(); desenhar(); aviso('Limite salvo');
        break;
      }
      case 'or-apagar': D.orcamentos = D.orcamentos.filter(x => x.id !== v); salvar(); fecharFolha(); desenhar(); break;
      case 'aplicar-sugestao': {
        const sug = F.planoSugerido(D);
        for (const c of sug.cortes.slice(0, 5)) { let o = D.orcamentos.find(x => x.categoria === c.categoria); if (!o) { o = { id: F.uid(), categoria: c.categoria }; D.orcamentos.push(o); } o.limite = c.limite; }
        if (!D.metas.some(m => F.norm(m.nome).includes('RESERVA'))) D.metas.push({ id: F.uid(), nome: 'Reserva de emergência', alvo: sug.reservaMin, guardado: 0, mensal: sug.pagueSePrimeiro || null, criadoEm: new Date().toISOString() });
        D.planos.forEach(p => p.ativo = false);
        D.planos.push({ id: F.uid(), nome: 'Primeira reserva', resumo: `Separar ${dinheiro(sug.pagueSePrimeiro)} no dia do pagamento até juntar ${dinheiro(sug.reservaMin)}, com limites nos supérfluos.`, passos: [`No dia que o dinheiro entrar, mover ${dinheiro(sug.pagueSePrimeiro)} para a reserva.`, ...sug.cortes.slice(0, 5).map(c => `${c.nome}: no máximo ${dinheiro(c.limite)} por mês (hoje ${dinheiro(c.atual)}).`), `Quando a reserva chegar a ${dinheiro(sug.reservaMin)}, continuar até ${dinheiro(sug.reservaIdeal)} e depois investir o que sobrar.`], criadoEm: new Date().toISOString(), ativo: true, origem: 'sugestao' });
        salvar(); desenhar(); aviso('Plano aplicado');
        break;
      }
      case 'meta': abrirFolha({ tipo: 'meta', id: v }); break;
      case 'mt-add': { const m = D.metas.find(x => x.id === v), val = numero($('#mt-add').value); if (m && val) { m.guardado = F.r2((m.guardado || 0) + val); salvar(); fecharFolha(); desenhar(); aviso('Somado à meta'); } break; }
      case 'mt-salvar': {
        const alvo = numero($('#mt-alvo').value); if (!(alvo > 0)) { aviso('Informe quanto quer juntar'); break; }
        let m = D.metas.find(x => x.id === v); if (!m) { m = { id: F.uid(), criadoEm: new Date().toISOString() }; D.metas.push(m); }
        const g = numero($('#mt-guardado').value), me = numero($('#mt-mensal').value);
        Object.assign(m, { nome: $('#mt-nome').value.trim() || 'Meta', alvo: F.r2(alvo), guardado: g > 0 ? F.r2(g) : 0, mensal: me > 0 ? F.r2(me) : null, prazo: $('#mt-prazo').value || null });
        salvar(); fecharFolha(); desenhar(); aviso('Meta salva');
        break;
      }
      case 'mt-apagar': D.metas = D.metas.filter(x => x.id !== v); salvar(); fecharFolha(); desenhar(); break;
      case 'plano': abrirFolha({ tipo: 'plano', id: v }); break;
      case 'plano-ativar': D.planos.forEach(p => p.ativo = p.id === v); salvar(); fecharFolha(); desenhar(); break;
      case 'plano-apagar': if (certeza('Apagar este plano?')) { D.planos = D.planos.filter(p => p.id !== v); salvar(); fecharFolha(); desenhar(); } break;
      case 'limpar-chat': if (certeza('Começar uma conversa nova? As mensagens atuais serão apagadas.')) { D.chat = []; salvar(); telaFinn(); } break;
      case 'salvar-perfil': { const p = perfilD(); p.nome = $('#p-nome').value.trim(); p.nomePix = $('#p-pix').value.trim(); F.recategorizar(D); salvar(); aviso('Salvo'); desenhar(); break; }
      case 'apagar-regra': D.regras = D.regras.filter(r => r.id !== v); F.recategorizar(D); salvar(); desenhar(); break;
      case 'salvar-ia': await salvarIA(); break;
      case 'remover-ia': await Plat.guardar('gemini', ''); M.iaOk = false; M.chaveIA = ''; A.chamada = null; desenhar(); aviso('Chave removida deste aparelho'); break;
      case 'exportar-csv': baixar(`jarvis-finance-movimentacoes-${F.hoje()}.csv`, F.csv(D), 'text/csv;charset=utf-8'); break;
      case 'exportar-json': baixar(`jarvis-finance-backup-${F.hoje()}.json`, JSON.stringify({ versao: 1, ...JSON.parse(JSON.stringify(D, semCalculados)) }, null, 1), 'application/json'); break;
      case 'imp-ok': {
        const r = M.folha.res, banco = $('#imp-banco') ? $('#imp-banco').value.trim() : '';
        if (banco) r.transacoes.forEach(t => t.banco = banco);
        if (banco) (r.contas || []).forEach(c => { c.banco = banco; c.chave = `${banco}|corrente|0`; c.nome = 'Conta ' + banco; });
        const res = F.incorporar(D, r, 'importacao'); salvar(); fecharFolha(); desenhar();
        aviso(`${res.novas} movimentações importadas`);
        break;
      }
      case 'apagar-tudo': if (certeza('Apagar TODOS os dados deste aparelho? (O cofre do GitHub continua intacto.)') && certeza('Tem certeza mesmo?')) { N.parar(); D = F.vazio(); foto = new Map(); await Plat.salvar(D); if (!PC) { localStorage.removeItem('finn-cfg'); location.replace(location.pathname); } else { await window.api.guardarSegredo('github', ''); desenhar(); } } break;
      // bancos
      case 'belvo-conectar': belvoConectar(); break;
      case 'belvo-github': belvoPedirGithub(); break;
      case 'belvo-atualizar': belvoSincronizar({ consultarBancos: true, manual: true }); break;
      case 'belvo-gerenciar': window.api.abrirExterno('https://panorama.belvo.com/dashboard'); break;
      case 'belvo-sair': if (certeza('Desconectar o Jarvis da Belvo? Seus dados continuam aqui.')) { await window.api.belvoSair(); M.belvo = await window.api.belvoEstado(); desenhar(); } break;
      // celular
      case 'conectar-celular': conectarCelular(); break;
      case 'republicar': republicar(); break;
      case 'sync-agora': N.ciclo(); break;
      case 'desconectar-celular': if (certeza(PC ? 'Desconectar o celular? Os dados continuam no computador e no seu GitHub.' : 'Desconectar este celular?')) { N.parar(); if (PC) await window.api.guardarSegredo('github', ''); else { localStorage.removeItem('finn-cfg'); location.replace(location.pathname); return; } desenhar(); } break;
    }
  });
  document.addEventListener('change', ev => {
    const t = ev.target;
    if (t.dataset.filtro) { M.filtro[t.dataset.filtro] = t.value; telaMov(); }
    if (t.dataset.grupoCat) { const p = perfilD(); p.grupos = { ...p.grupos, [t.dataset.grupoCat]: t.value }; salvar(); aviso('Grupo alterado'); }
    if (t.id === 'mandar-chave') { M.mandarChave = t.checked; atualizaQR(); }
    if (t.id === 'arq-import' && t.files[0]) importar(t.files[0]).finally(() => { t.value = ''; });
  });
  document.addEventListener('input', ev => {
    if (ev.target.id === 'busca') { M.filtro.q = ev.target.value; clearTimeout(telaMov.t); telaMov.t = setTimeout(telaMov, 120); }
    if (ev.target.id === 'chat-texto') ajustaAltura(ev.target);
  });
  document.addEventListener('focusin', ev => { if (ev.target.id === 'chat-texto' && !window.matchMedia('(min-width: 820px)').matches) document.body.classList.add('digitando'); });
  document.addEventListener('focusout', ev => { if (ev.target.id === 'chat-texto') setTimeout(() => document.body.classList.remove('digitando'), 80); });
  document.addEventListener('submit', ev => { if (ev.target.id === 'chat-form') { ev.preventDefault(); enviarMensagem($('#chat-texto').value); } });
  document.addEventListener('keydown', ev => {
    if (ev.target.id === 'chat-texto' && ev.key === 'Enter' && !ev.shiftKey && window.matchMedia('(pointer: fine)').matches) { ev.preventDefault(); enviarMensagem(ev.target.value); }
    if (ev.key === 'Escape' && M.folha && M.folha.tipo !== 'progresso') fecharFolha();
  });

  function baixar(nome, conteudo, tipo) {
    if (PC) { window.api.salvarArquivo(nome, conteudo).then(ok => ok && aviso('Arquivo salvo')); return; }
    const url = URL.createObjectURL(new Blob([conteudo], { type: tipo }));
    const a = document.createElement('a'); a.href = url; a.download = nome; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 4000);
  }
  async function importar(arq) {
    try {
      abrirFolha({ tipo: 'progresso', titulo: 'Lendo o arquivo…' });
      const r = await I.ler(arq);
      if (r.backup) {
        fecharFolha();
        if (!certeza(`Restaurar o backup de ${r.backup.transacoes.length} movimentações? Ele substitui os dados deste aparelho.`)) return;
        const novo = F.normaliza(r.backup); delete novo.versao;
        D = novo; foto = new Map(); salvar(); desenhar(); aviso('Backup restaurado');
        return;
      }
      abrirFolha({ tipo: 'importar', res: r });
    } catch (e) { fecharFolha(); aviso(e.message, 'erro'); }
  }

  /* ---------- IA ---------- */
  async function salvarIA() {
    const k = ($('#chave-ia') || {}).value ? $('#chave-ia').value.trim() : '';
    if (!/^(AIza[\w-]{20,}|AQ\.[\w.-]{20,})$/.test(k)) { aviso('Essa chave não parece certa. Ela começa com AQ. (ou AIza, nas antigas).', 'erro'); return; }
    await Plat.guardar('gemini', k);
    configurarIA(k);
    try {
      A.modelo = await A.escolherModelo();
      await Plat.guardar('modelo', A.modelo);
      M.iaOk = true; M.chaveIA = k; aviso('IA conectada');
    } catch (e) { M.iaOk = false; await Plat.guardar('gemini', ''); aviso(e.message, 'erro'); }
    desenhar();
  }
  function configurarIA(k) { A.chamada = Plat.gemini; A.modelos = Plat.modelos; if (k) M.chaveIA = k; }

  /* ---------- Belvo (só no PC) ---------- */
  // a Belvo reconhece o Jarvis por uma "ficha" publicada no site do app do celular (GitHub Pages do usuário)
  const fichaExtra = dono => window.api.belvoFicha(dono).then(f => f ? [f] : []).catch(() => []);
  function belvoPedirGithub() {
    M.belvoDepois = true; if (M.belvo) delete M.belvo.erro; desenhar();
    const c = document.querySelector('.celular-card'); if (c) c.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => { const t = $('#tk'); if (t) t.focus(); }, 350);
  }
  async function belvoConectar() {
    if (!N.ligada()) return belvoPedirGithub();
    M.belvoDepois = false;
    const passo = t => { M.belvoOcupado = t; if (M.tela === 'ajustes') desenhar(); };
    passo('Conferindo a ficha do Jarvis Finance no seu GitHub…');
    try {
      let id = await window.api.belvoIdentidade();
      if (!id.url) throw new Error('Ligue o GitHub em Ajustes → Celular para conectar a Belvo.');
      if (!id.publicado) {
        passo('Publicando a ficha do Jarvis Finance no seu GitHub…');
        await N.publicarNoSite([id.ficha]);
        const t0 = Date.now();
        while (!(id = await window.api.belvoIdentidade()).publicado) {
          const s = Math.round((Date.now() - t0) / 1000);
          if (s > 420) throw new Error('O GitHub ainda não pôs a ficha do Jarvis no ar. Espere uns minutos e clique em Conectar de novo.');
          passo(`O GitHub está colocando a ficha do Jarvis no ar (leva 1 a 2 minutos)… ${s}s`);
          await new Promise(r => setTimeout(r, id.esperaMs || 6000));
        }
      }
      passo('Abrindo a página da Belvo no navegador… Autorize por lá e volte aqui.');
      await window.api.belvoConectar();
      M.belvoOcupado = '';
      await belvoSincronizar({ consultarBancos: false, primeira: true });
    } catch (e) { M.belvoOcupado = ''; M.belvo = { ...(M.belvo || {}), erro: e.message }; desenhar(); }
  }
  async function belvoSincronizar({ consultarBancos = false, manual = false, primeira = false } = {}) {
    if (!PC) return;
    const est = await window.api.belvoEstado(); M.belvo = est;
    if (!est.conectado) return;
    if (manual || primeira) { M.belvoOcupado = consultarBancos ? 'Pedindo dados novos aos bancos (pode levar alguns minutos)…' : 'Lendo suas contas e movimentações…'; if (M.tela === 'ajustes') desenhar(); }
    try {
      const ds = F.datasDisponiveis(D);
      const desde = primeira || !ds ? F.addDias(F.hoje(), -365) : F.addDias(est.ultimaLeituraData || ds.ultima, -10);
      const pacote = await window.api.belvoPuxar({ desde, consultarBancos });
      const res = F.incorporar(D, pacote, 'belvo');
      salvar();
      M.belvo = await window.api.belvoEstado();
      if (manual || primeira || res.novas) aviso(res.novas ? `${res.novas} movimentaç${res.novas === 1 ? 'ão nova' : 'ões novas'} dos bancos` : 'Tudo em dia com os bancos');
      if (pacote.avisos && pacote.avisos.length && (manual || primeira)) aviso(pacote.avisos[0]);
    } catch (e) {
      M.belvo = { ...(await window.api.belvoEstado()), erro: e.message };
      if (manual || primeira) aviso(e.message, 'erro');
    } finally { M.belvoOcupado = ''; redesenhar(); }
  }

  /* ---------- celular (PC) ---------- */
  async function conectarCelular() {
    const tk = $('#tk').value.trim(), msg = $('#tk-msg');
    if (!/^(ghp_|github_pat_)\w{20,}/.test(tk)) { msg.textContent = 'Esse código não parece certo: ele começa com ghp_.'; return; }
    try {
      $('[data-acao="conectar-celular"]').disabled = true;
      const arquivos = await window.api.arquivosSite();
      const cfg = await N.instalar(tk, arquivos, t => { msg.textContent = t; }, fichaExtra);
      await window.api.guardarSegredo('github', JSON.stringify(cfg));
      ligarNuvem(cfg);
      localStorage.setItem('finn-app-publicado', VERSAO);
      aviso('GitHub ligado. Aponte a câmera do iPhone para o QR code.');
      desenhar();
      if (M.belvoDepois) belvoConectar();
    } catch (e) { msg.textContent = e.message; const bt = $('[data-acao="conectar-celular"]'); if (bt) bt.disabled = false; }
  }
  async function atualizarAppCelular() {
    if (!PC || !N.ligada() || localStorage.getItem('finn-app-publicado') === VERSAO) return false;
    try { await N.instalar(N.cfg.token, await window.api.arquivosSite(), () => {}, fichaExtra); localStorage.setItem('finn-app-publicado', VERSAO); return true; }
    catch (e) { console.warn('O app do celular não atualizou agora:', e.message); return false; }
  }
  async function republicar() {
    abrirFolha({ tipo: 'progresso', titulo: 'Atualizando o app do celular', texto: 'Enviando os arquivos…' });
    try {
      const arquivos = await window.api.arquivosSite();
      await N.instalar(N.cfg.token, arquivos, t => { const p = $('#prog-txt'); if (p) p.textContent = t; }, fichaExtra);
      localStorage.setItem('finn-app-publicado', VERSAO);
      fecharFolha(); aviso('App do celular atualizado. Pode levar uns minutos para aparecer.');
    } catch (e) { fecharFolha(); aviso(e.message, 'erro'); }
  }
  function ligarNuvem(cfg) {
    N.cfg = cfg;
    N.dados = () => D;
    N.aoReceber = novo => { S.aplicar(D, novo); F.normaliza(D); foto = S.fotografar(D); if (ganchos(D) && S.carimbar(D, foto)) N.mudou(); Plat.salvar(D); redesenhar(); };
    N.aoMudar = statusNuvem;
    N.iniciar(PC ? 45 : 30);
  }

  /* =====================================================================
     INÍCIO
     ===================================================================== */
  function ajustaTopo() { // iPhone: às vezes o app fica por baixo da barra de status, às vezes não
    const alto = innerWidth > innerHeight ? Math.min(screen.width, screen.height) : Math.max(screen.width, screen.height);
    document.documentElement.style.setProperty('--st', alto - innerHeight < 16 ? 'env(safe-area-inset-top, 0px)' : '0px');
  }
  function leLink(txt) {
    const h = String(txt || '').split('#')[1] || ''; const p = new URLSearchParams(h);
    return p.get('t') && p.get('d') ? { cfg: { token: p.get('t'), dono: p.get('d') }, chave: p.get('k') || '' } : null;
  }

  async function iniciar() {
    // testes automáticos: servidores simulados no lugar do GitHub e da IA
    if (PC && window.api.teste) { if (window.api.teste.apiGithub) window.API_BASE = window.api.teste.apiGithub; if (window.api.teste.clima) window.CLIMA_BASE = window.CLIMA_GEO = window.api.teste.clima; if (window.api.teste.geo) window.GEO_CEP = window.GEO_NOMI = window.GEO_OVERPASS = window.api.teste.geo; }
    if (!PC && /^(127\.0\.0\.1|localhost)$/.test(location.hostname)) { const q = new URLSearchParams(location.search); if (q.get('api')) window.API_BASE = q.get('api'); if (q.get('gemini')) window.GEMINI_BASE = q.get('gemini'); if (q.get('clima')) window.CLIMA_BASE = window.CLIMA_GEO = q.get('clima'); if (q.get('geo')) window.GEO_CEP = window.GEO_NOMI = window.GEO_OVERPASS = q.get('geo'); }
    document.body.classList.add(PC ? 'pc' : 'web');
    if (PC && window.api.plataforma) document.body.classList.add('so-' + window.api.plataforma);
    if (!PC) { ajustaTopo(); addEventListener('resize', ajustaTopo); }
    // dados locais
    const local = await Plat.carregar();
    if (local && Array.isArray(local.transacoes)) D = F.normaliza(local);
    else if (PC) {
      D = F.vazio();
      const sem = await window.api.semente();
      if (sem) { Object.assign(F.perfil(D), sem.perfil || {}); F.incorporar(D, sem, 'semente'); }
    }
    F.recategorizar(D); F.preparar(D);
    foto = S.fotografar(D);
    if (PC && (!local || !Array.isArray(local.transacoes))) { S.carimbar(D, foto); await Plat.salvar(D); }
    // IA
    let k = await Plat.segredo('gemini');
    let cfgWeb = null;
    if (!PC) {
      const link = leLink(location.hash);
      if (link) { cfgWeb = link.cfg; localStorage.setItem('finn-cfg', JSON.stringify(link.cfg)); if (link.chave && link.chave !== k) { k = link.chave; localStorage.setItem('finn-gemini', k); localStorage.removeItem('finn-modelo'); } }
      else { try { cfgWeb = JSON.parse(localStorage.getItem('finn-cfg')); } catch {} }
      if (!cfgWeb) { $('#conectar').style.display = 'flex'; return; }
    }
    if (k) { configurarIA(k); A.modelo = (await Plat.segredo('modelo')) || null; M.iaOk = true; }
    // nuvem
    if (PC) {
      const g = await Plat.segredo('github');
      if (g) {
        try { ligarNuvem(JSON.parse(g)); } catch {}
        // versão nova no PC: o app do celular é atualizado sozinho (só arquivos do app, nunca dados)
        if (N.ligada() && localStorage.getItem('finn-app-publicado') !== VERSAO) setTimeout(atualizarAppCelular, 25000);
      }
    }
    else ligarNuvem(cfgWeb);
    $('#app').style.display = '';
    if (ganchos(D)) salvar();
    desenhar();
    EXT.aoIniciar.forEach(f => { try { f(); } catch (e) { console.error(e); } });
    // bancos
    if (PC) {
      M.belvo = await window.api.belvoEstado();
      if (M.belvo.conectado) {
        const precisaConsultar = !M.belvo.ultimaAtualizacao || (Date.now() - new Date(M.belvo.ultimaAtualizacao)) > 20 * 3600e3;
        belvoSincronizar({ consultarBancos: precisaConsultar });
      }
      setInterval(async () => {
        const e = await window.api.belvoEstado(); if (!e.conectado) return;
        const precisa = !e.ultimaAtualizacao || (Date.now() - new Date(e.ultimaAtualizacao)) > 20 * 3600e3;
        belvoSincronizar({ consultarBancos: precisa });
      }, 3 * 3600e3);
      window.api.aoAvisoBelvo && window.api.aoAvisoBelvo(t => { if (M.belvoOcupado) { M.belvoOcupado = t; if (M.tela === 'ajustes') desenhar(); } });
    }
  }

  // tela de conexão do celular (quando abre sem o link)
  document.addEventListener('click', ev => {
    if (ev.target.id !== 'colar-ok') return;
    const l = leLink($('#colar-link').value.trim());
    if (!l) { $('#colar-msg').textContent = 'Esse link não parece o do Jarvis. Copie de novo no computador.'; return; }
    location.replace(location.pathname + '#d=' + encodeURIComponent(l.cfg.dono) + '&t=' + encodeURIComponent(l.cfg.token) + (l.chave ? '&k=' + encodeURIComponent(l.chave) : ''));
    location.reload();
  });

  window.__finn = { get D() { return D; }, M, salvar, enviarMensagem, desenhar, abrirFolha, fecharFolha, belvoSincronizar, ligarNuvem, configurarIA, importar, atualizarAppCelular };
  // o que os módulos extras podem usar
  const irPara = t => { M.tela = t; fecharFolha(); desenhar(); const tl = $('#tela'); if (tl) tl.scrollTop = 0; };
  window.__ui = { get D() { return D; }, M, PC, Plat, N, F, A, VERSAO, salvar, aviso, certeza, ic, P, esc, bolinha, logoBanco, quando, abrirFolha, fecharFolha, desenhar, redesenhar, numero: s => numero(s), opcoesCat: (a, g) => opcoesCat(a, g), baixar, hojeYM, enviarMensagem, markdown, saudacao, irPara, ajustaAltura, celular };
  iniciar().catch(e => { console.error(e); document.body.insertAdjacentHTML('beforeend', `<pre class="erro-fatal">${esc(e.stack || e.message)}</pre>`); });
})();
