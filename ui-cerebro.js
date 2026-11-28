/* Jarvis Finance — tela Segundo cérebro (PC e iPhone).
   Notas, documentos (PDF e fotos), pessoas, metas, contratos, clientes, negócios e ideias, num lugar só.
   Busca local na hora, perguntas para o Jarvis com as fontes, ligações [[entre notas]] e importação do Obsidian. */
(function () {
  'use strict';
  const F = window.Finn, Cb = window.Cerebro, B = window.Biblioteca, Mm = window.Memoria;
  const EXT = window.FinnExt = window.FinnExt || {};
  for (const k of ['telas', 'folhas', 'acoes', 'titulos', 'icones']) EXT[k] = EXT[k] || {};
  for (const k of ['aoIniciar', 'antesDeSalvar', 'alertas', 'aoMudar', 'ajustes']) EXT[k] = EXT[k] || [];
  const U = () => window.__ui;
  const Arq = () => window.Arquivos;
  const $ = (s, r = document) => r.querySelector(s);
  const esc = s => F.esc(s);

  Object.assign(EXT.icones, {
    cerebro: '<path d="M9.2 4.2A3 3 0 0 0 6.3 7a3.2 3.2 0 0 0-2 5.3 3.2 3.2 0 0 0 1.8 5 3 3 0 0 0 3.2 2.5A2.6 2.6 0 0 0 12 18V6.5a2.6 2.6 0 0 0-2.8-2.3z"/><path d="M14.8 4.2A3 3 0 0 1 17.7 7a3.2 3.2 0 0 1 2 5.3 3.2 3.2 0 0 1-1.8 5 3 3 0 0 1-3.2 2.5A2.6 2.6 0 0 1 12 18"/><path d="M8.5 10.5c1 0 1.8.6 2.2 1.4M15.5 13.5c-1 0-1.8-.6-2.2-1.4"/>',
    nota: '<path d="M6 3.5h8.5l4 4V20a.5.5 0 0 1-.5.5H6a.5.5 0 0 1-.5-.5V4a.5.5 0 0 1 .5-.5z"/><path d="M14.5 3.5V8h4M8.5 12h7M8.5 15.5h7M8.5 8.5h3"/>',
    contrato: '<path d="M6 3.5h12v17H6z"/><path d="M9 8h6M9 11.5h6M9 17c1-1.5 2-1.5 3 0s2 1.5 3 0"/>',
    maleta: '<rect x="3.5" y="7.5" width="17" height="12" rx="2"/><path d="M8.5 7.5V5.5a1 1 0 0 1 1-1h5a1 1 0 0 1 1 1v2M3.5 12.5h17"/>',
    grafico: '<path d="M4 20.5V3.5M4 20.5h16.5M8 16l3.5-4 3 2.5L20 8"/>',
    lampada: '<path d="M9 18.5h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2v.6h5v-.6c0-.8.4-1.5 1-2A6 6 0 0 0 12 3z"/>',
    fixar: '<path d="M9 3.5h6l-1 5 3 3v1.5H7v-1.5l3-3z"/><path d="M12 13v7.5"/>',
    escudo: '<path d="M12 3 4.5 6v5.5c0 4.5 3.2 8 7.5 9.5 4.3-1.5 7.5-5 7.5-9.5V6z"/>',
    lapis: '<path d="M4 20l1-4.5L15.5 5a2 2 0 0 1 3 0l.5.5a2 2 0 0 1 0 3L8.5 19z"/><path d="M13.5 7l3.5 3.5"/>',
    clipe: '<path d="M19.5 11.5 12 19a5 5 0 0 1-7-7l8-8a3.3 3.3 0 0 1 4.7 4.7l-8 8a1.7 1.7 0 0 1-2.4-2.4l7.4-7.4"/>',
    link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
    pdf: '<path d="M14 3.5H7a1.5 1.5 0 0 0-1.5 1.5v14A1.5 1.5 0 0 0 7 20.5h10a1.5 1.5 0 0 0 1.5-1.5V8z"/><path d="M14 3.5V8h4.5M9 13h6M9 16.5h4"/>',
    camera: '<path d="M4 8.5a2 2 0 0 1 2-2h2l1.5-2h5L16 6.5h2a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/><circle cx="12" cy="13" r="3.5"/>',
    presente: '<rect x="3.5" y="8.5" width="17" height="4" rx="1"/><path d="M5 12.5v8h14v-8M12 8.5v12M12 8.5c-2-4-6-4-6-1.5S10 8.5 12 8.5c2 0 6 1 6-1.5s-4-2.5-6 1.5"/>',
    cadeado: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7.5a4 4 0 0 1 8 0V11"/>',
  });
  EXT.titulos.cerebro = 'Segundo cérebro';

  const ST = { q: '', tipo: '', resposta: null, perguntando: false, textos: new Map(), carregou: false, arq: null };
  const cor = t => (Cb.TIPOS[t] || Cb.TIPOS.nota).cor;
  const bolha = (t, ic) => `<span class="bol" style="--c:${cor(t)}">${U().ic(ic || (Cb.TIPOS[t] || Cb.TIPOS.nota).ic)}</span>`;
  const tamanho = n => n > 1e6 ? (n / 1e6).toFixed(1).replace('.', ',') + ' MB' : Math.max(1, Math.round(n / 1e3)) + ' KB';
  const naTela = () => U() && U().M.tela === 'cerebro';

  async function carregarTextos() {
    const D = U().D;
    const caminhos = [...(D.notas || []).map(n => n.extraido && n.extraido.caminho), ...(D.biblioteca || []).map(i => i.pontos && i.pontos.caminho)].filter(Boolean);
    ST.textos = await Arq().textos(caminhos);
    if (!ST.carregou) { ST.carregou = true; Arq().trazerTextos(caminhos.filter(c => !ST.textos.has(c)), async () => { ST.textos = await Arq().textos(caminhos); if (naTela() && ST.q) desenharResultados(); }).catch(() => {}); }
    return ST.textos;
  }
  const docs = (onde = 'tudo') => [...(onde === 'biblioteca' ? [] : Cb.docsBusca(U().D, ST.textos)), ...(onde === 'cerebro' ? [] : B.docsBusca(U().D, ST.textos))];

  /* ---------- resposta da IA com as fontes (também usada pela Biblioteca) ---------- */
  function cartaoResposta(r, { ondeAtual } = {}) {
    const ui = U();
    if (r.carregando) return `<section class="card resposta-ia"><div class="rot">${ui.ic('finn')} Jarvis</div><div class="progresso"><span class="giro"></span>Procurando nas suas fontes…</div></section>`;
    if (r.erro) return `<section class="card resposta-ia"><div class="rot">${ui.ic('finn')} Jarvis</div><p class="erro-msg">${esc(r.erro)}</p></section>`;
    const usadas = r.usadas.length ? r.usadas : r.fontes.map(f => f.n);
    const porN = new Map(r.fontes.map(f => [f.n, f]));
    let html = ui.markdown(r.resposta).replace(/\[(\d+)\]/g, (m, n) => { const f = porN.get(+n); return f ? `<button class="cita" data-acao="mem-abrir" data-v="${esc(f.doc.id)}" title="${esc(f.doc.titulo)}">${n}</button>` : m; });
    const usadasF = usadas.map(n => porN.get(n)).filter(Boolean);
    return `<section class="card resposta-ia"><div class="rot">${ui.ic('finn')} ${esc(r.pergunta)}<span class="dica">${usadasF.length ? `de ${usadasF.length} fonte${usadasF.length > 1 ? 's' : ''}` : ''}</span><span class="rot-acoes"><button class="redondo peq" data-acao="mem-fechar" aria-label="Fechar resposta">${ui.ic('fechar')}</button></span></div>
      <div class="ri-texto">${html}</div>
      ${usadasF.length ? `<div class="ri-fontes">${usadasF.slice(0, 8).map(f => `<button class="ri-fonte" data-acao="mem-abrir" data-v="${esc(f.doc.id)}"><span class="ri-n">${f.n}</span>${bolhaDoc(f.doc)}<span class="ri-tit"><b>${esc(f.doc.titulo)}</b><small>${esc(f.doc.subtitulo || '')}</small></span></button>`).join('')}</div>` : ''}
      <details class="ri-todas"><summary>Ver todas as fontes consultadas (${r.fontes.length})</summary>${r.fontes.map(f => `<button class="ls-linha" data-acao="mem-abrir" data-v="${esc(f.doc.id)}"><span class="ri-n">${f.n}</span><div class="ls-txt"><b>${esc(f.doc.titulo)}</b><small>${esc(f.doc.subtitulo || '')}</small></div></button>`).join('')}</details>
      ${ondeAtual === 'biblioteca' ? `<button class="btn link" data-acao="bb-perguntar-tudo">${ui.ic('cerebro')} Perguntar também ao segundo cérebro</button>` : ''}</section>`;
  }
  function bolhaDoc(d) {
    if (d.origem === 'biblioteca') { const t = B.TIPOS[d.tipo] || B.TIPOS.livro; return `<span class="bol" style="--c:${t.cor}">${U().ic(t.ic)}</span>`; }
    return bolha(d.tipo);
  }
  async function perguntar(q, onde, alvo, ondeAtual) {
    const ui = U(); const pinta = r => { const el = $(alvo); if (el) el.innerHTML = cartaoResposta(r, { ondeAtual }); };
    if (!ui.M.iaOk) { pinta({ erro: 'Para perguntas, configure a IA em Ajustes. A busca por palavras funciona sem ela.' }); return null; }
    pinta({ carregando: true });
    try {
      await carregarTextos();
      const r = await Mm.perguntar(q, docs(onde), { A: ui.A, nome: F.perfil(ui.D).nome, onde: onde === 'biblioteca' ? 'biblioteca' : onde === 'cerebro' ? 'segundo cérebro' : 'segundo cérebro e na biblioteca' });
      const out = { ...r, pergunta: q }; pinta(out); return out;
    } catch (e) { pinta({ erro: e.message }); return null; }
  }
  function abrirDoc(id) {
    if (String(id).startsWith('bib-') || (U().D.biblioteca || []).some(x => x.id === id)) return U().abrirFolha({ tipo: 'bb-item', id });
    U().abrirFolha({ tipo: 'cb-nota', id });
  }

  /* ---------- tela ---------- */
  function linhaNota(n, trecho) {
    const ui = U();
    const meta = [];
    if (n.vence) { const d = F.difDias(F.hoje(), n.vence); meta.push(`<span class="tag ${d < 0 ? 'ruim' : d <= 30 ? 'quase' : ''}">${d < 0 ? 'venceu' : 'vence'} ${F.dataBR(n.vence).slice(0, 5)}</span>`); }
    if (n.arquivo) meta.push(`<span class="tag">${ui.ic('clipe')}${esc((n.arquivo.nome.split('.').pop() || '').toUpperCase())}</span>`);
    if (n.fixada) meta.push(`<span class="tag ativo">${ui.ic('fixar')}fixada</span>`);
    if (n.sensivel) meta.push(`<span class="tag">${ui.ic('cadeado')}sensível</span>`);
    for (const t of (n.tags || []).slice(0, 3)) meta.push(`<span class="tag">#${esc(t)}</span>`);
    const txt = trecho != null ? trecho : String(n.resumo || n.texto || '').replace(/\[\[([^\]|]+)(\|[^\]]+)?\]\]/g, '$1').replace(/[#*_>`]/g, '').replace(/\s+/g, ' ').trim().slice(0, 140);
    return `<button class="nt-linha" data-acao="cb-abrir" data-v="${esc(n.id)}">${bolha(n.tipo)}<div class="nt-txt"><b>${esc(n.titulo)}</b>${txt ? `<small>${esc(txt)}</small>` : ''}${meta.length ? `<span class="nt-meta">${meta.join('')}</span>` : ''}</div></button>`;
  }
  function resultadosHTML() {
    const ui = U();
    const r = Mm.buscar(ST.q, Cb.docsBusca(ui.D, ST.textos).filter(d => !ST.tipo || d.tipo === ST.tipo), { limite: 40 });
    const extra = Mm.buscar(ST.q, B.docsBusca(ui.D, ST.textos), { limite: 5 });
    let h = `<div class="rot sub">${r.length ? r.length + ' resultado' + (r.length > 1 ? 's' : '') : 'Nada no cérebro com essas palavras'}<span class="dica">aperte Perguntar para o Jarvis responder</span></div>`;
    if (r.length) h += `<div class="card lista-notas">${r.map(x => linhaNota(ui.D.notas.find(n => n.id === x.doc.id), x.trecho)).join('')}</div>`;
    if (extra.length) h += `<div class="rot sub">Na biblioteca</div><div class="card lista-notas">${extra.map(x => `<button class="nt-linha" data-acao="mem-abrir" data-v="${esc(x.doc.id)}">${bolhaDoc(x.doc)}<div class="nt-txt"><b>${esc(x.doc.titulo)}</b><small>${esc(x.trecho)}</small></div></button>`).join('')}</div>`;
    return h;
  }
  function desenharResultados() { const el = $('#cb-res'); if (el) el.innerHTML = ST.q.trim().length >= 2 ? resultadosHTML() : conteudoPadrao(); }
  function conteudoPadrao() {
    const ui = U(), D = ui.D, notas = (D.notas || []).filter(n => !n.arquivada);
    let h = '';
    const fix = notas.filter(n => n.fixada);
    if (!notas.length) {
      return `<div class="card vazio-cerebro"><h3>${ui.ic('cerebro')} Seu segundo cérebro</h3><p>Jogue aqui tudo da sua vida: contratos, documentos, clientes, metas, pessoas, ideias. O Jarvis lê tudo e responde quando você esquecer alguma coisa — sem precisar explicar de novo.</p>
        <ol class="passos"><li><b>Comece por você:</b> uma nota "Sobre mim" fixada vai junto em toda conversa com o Jarvis.</li><li><b>Guarde documentos:</b> PDF ou foto (RG, CNH, contrato, apólice). Ele lê, resume e avisa antes de vencer.</li><li><b>Anote pelo chat:</b> "Jarvis, anota que o aniversário da minha mãe é 12/03" ou "o cliente Paulo prefere contato por WhatsApp".</li></ol>
        <div class="linha-btn"><button class="btn pri" data-acao="cb-sobre-mim">${ui.ic('pessoa')} Criar "Sobre mim"</button><button class="btn" data-acao="cb-arquivo">${ui.ic('clipe')} Guardar um documento</button>${ui.PC ? `<button class="btn" data-acao="cb-obsidian">Importar do Obsidian</button>` : ''}</div></div>`;
    }
    if (!ST.tipo) {
      h += fix.length ? `<div class="rot sub">${ui.ic('fixar')} Sobre você<span class="dica">vai junto em toda conversa</span></div><div class="card lista-notas">${fix.map(n => linhaNota(n)).join('')}</div>`
        : `<div class="card dica-card"><b>Dica:</b> crie uma nota "Sobre mim" e fixe — o Jarvis passa a saber de você em toda conversa. <button class="btn link" data-acao="cb-sobre-mim">Criar agora</button></div>`;
      const vc = Cb.vencimentos(D, { dias: 90 });
      if (vc.length) h += `<div class="rot sub">${ui.ic('relogio')} Prazos chegando</div><div class="card lista-notas">${vc.map(v => linhaNota(v.nota)).join('')}</div>`;
      const an = Cb.aniversarios(D, { dias: 14 });
      if (an.length) h += `<div class="rot sub">${ui.ic('presente')} Aniversários</div><div class="card lista-notas">${an.map(a => linhaNota(a.nota, a.falta === 0 ? 'Hoje!' : a.falta === 1 ? 'Amanhã' : `Em ${a.falta} dias (${F.dataBR(a.data).slice(0, 5)})`)).join('')}</div>`;
    }
    const lista = notas.filter(n => !ST.tipo || n.tipo === ST.tipo).sort((a, b) => (b.editadoEm || b.criadoEm || '').localeCompare(a.editadoEm || a.criadoEm || ''));
    h += `<div class="rot sub">${ST.tipo ? esc(Cb.TIPOS[ST.tipo].plural) : 'Tudo'}<span class="dica">${lista.length}</span></div>`;
    h += lista.length ? `<div class="card lista-notas">${lista.slice(0, 200).map(n => linhaNota(n)).join('')}</div>` : `<p class="muted">Nada aqui ainda.</p>`;
    return h;
  }
  function telaCerebro() {
    const ui = U(), D = ui.D, notas = (D.notas || []).filter(n => !n.arquivada);
    const contagem = {}; for (const n of notas) contagem[n.tipo] = (contagem[n.tipo] || 0) + 1;
    const h = `<div class="memoria">
      <form class="pergunte" id="cb-form"><span class="avatar">${ui.ic('cerebro')}</span><input id="cb-q" type="search" placeholder="Busque ou pergunte…" value="${esc(ST.q)}" enterkeyhint="search" autocomplete="off" aria-label="Buscar no segundo cérebro"><button class="btn pri mini" type="submit">Perguntar</button></form>
      <div class="mem-acoes"><button class="btn pri mini" data-acao="cb-nova">${ui.ic('mais')} Nota</button><label class="btn mini">${ui.ic('clipe')} Documento ou foto<input type="file" id="cb-file" accept=".pdf,.png,.jpg,.jpeg,.webp,.heic,.heif,.txt,.md,.csv,.json,.docx,image/*,application/pdf" hidden></label>${ui.PC ? `<button class="btn mini" data-acao="cb-obsidian">${ui.ic('importar')} Obsidian</button>` : ''}</div>
      <div class="chips tipos-chips"><button class="chip ${!ST.tipo ? 'on' : ''}" data-acao="cb-tipo" data-v="">Tudo <em>${notas.length}</em></button>${Object.entries(Cb.TIPOS).map(([k, t]) => `<button class="chip ${ST.tipo === k ? 'on' : ''}" data-acao="cb-tipo" data-v="${k}">${t.plural}${contagem[k] ? ` <em>${contagem[k]}</em>` : ''}</button>`).join('')}</div>
      <div id="cb-resp">${ST.resposta ? cartaoResposta(ST.resposta) : ''}</div>
      <div id="cb-res">${ST.q.trim().length >= 2 ? resultadosHTML() : conteudoPadrao()}</div></div>`;
    const foco = document.activeElement && document.activeElement.id === 'cb-q';
    $('#tela').innerHTML = h;
    if (foco) { const i = $('#cb-q'); i.focus(); i.setSelectionRange(i.value.length, i.value.length); }
    if (!ST.carregou) carregarTextos().then(() => { if (naTela() && ST.q) desenharResultados(); });
  }

  /* ---------- texto das notas: [[ligações]], #tags e markdown ---------- */
  function textoNota(n) {
    const ui = U();
    let h = ui.markdown(n.texto || '');
    h = h.replace(/\[\[([^\]|#]{1,200})(?:#[^\]|]*)?(?:\|([^\]]{1,200}))?\]\]/g, (m, alvo, rot) => `<button class="wl" data-acao="cb-link" data-v="${esc(alvo.trim())}">${esc((rot || alvo).trim())}</button>`);
    h = h.replace(/(^|[\s>])#([\p{L}\d][\p{L}\d_-]{1,39})/gu, (m, a, t) => `${a}<button class="tag tag-btn" data-acao="cb-tag" data-v="${esc(t.toLowerCase())}">#${esc(t)}</button>`);
    h = h.replace(/(https?:\/\/[^\s<]+[^\s<.,;:!?)])/g, '<a href="$1" target="_blank" rel="noopener">$1</a>');
    return h;
  }

  /* ---------- folhas ---------- */
  const cab = (t, extra = '') => `<div class="folha-cab"><h3>${esc(t)}</h3>${extra}<button class="redondo" data-acao="fechar" aria-label="Fechar">${U().ic('fechar')}</button></div>`;
  EXT.folhas['cb-nota'] = (f, redesenho) => {
    const ui = U(), D = ui.D, n = (D.notas || []).find(x => x.id === f.id); if (!n) return null;
    const T = Cb.TIPOS[n.tipo] || Cb.TIPOS.nota;
    const campos = Object.entries(n.campos || {}).filter(([, v]) => v);
    const nomeCampo = { aniversario: 'Aniversário', telefone: 'Telefone', email: 'E-mail', empresa: 'Empresa', relacao: 'Relação' };
    const valCampo = (k, v) => k === 'telefone' ? `<a href="tel:${esc(String(v).replace(/[^\d+]/g, ''))}">${esc(v)}</a>` : k === 'email' ? `<a href="mailto:${esc(v)}">${esc(v)}</a>` : esc(v);
    const men = Cb.mencoes(D, n);
    const ligadas = Cb.links(n.texto).map(l => Cb.porTitulo(D, l.alvo)).filter(Boolean);
    const venceTxt = n.vence ? (() => { const d = F.difDias(F.hoje(), n.vence); return `${n.tipo === 'meta' ? 'Prazo' : n.tipo === 'contrato' ? 'Fim/renovação' : 'Vence'}: <b>${F.dataBR(n.vence)}</b> (${d < 0 ? 'há ' + (-d) + ' dias' : d === 0 ? 'hoje' : 'em ' + d + ' dias'})`; })() : '';
    setTimeout(() => { if (!redesenho && n.arquivo && /pdf|image/.test(n.arquivo.tipo) && f.ver) mostrarArquivo(n); }, 0);
    return `${cab(n.titulo)}
      <div class="nt-cab">${bolha(n.tipo)}<span>${esc(T.nome)}${n.fixada ? ' · fixada' : ''}${n.sensivel ? ' · sensível (fora da IA)' : ''}</span></div>
      ${venceTxt ? `<p class="nt-vence">${venceTxt}</p>` : ''}
      ${n.arquivo ? `<div class="nt-arquivo">${ui.ic(/image/.test(n.arquivo.tipo) ? 'camera' : 'pdf')}<div class="ls-txt"><b>${esc(n.arquivo.nome)}</b><small>${tamanho(n.arquivo.tamanho || 0)}${n.extraido ? ` · texto lido (${Math.round(n.extraido.chars / 100) / 10} mil caracteres)` : ''}</small></div>${/pdf|image/.test(n.arquivo.tipo) ? `<button class="btn mini" data-acao="cb-ver" data-v="${n.id}">Ver</button>` : ''}<button class="btn mini" data-acao="cb-baixar" data-v="${n.id}">${ui.PC ? 'Abrir' : 'Baixar'}</button></div><div id="cb-visor"></div>` : ''}
      ${n.resumo ? `<div class="nt-resumo">${ui.markdown(n.resumo)}</div>` : ''}
      ${(n.datas || []).length ? `<div class="rot sub">Datas importantes</div><div class="info-grade">${n.datas.map(d => `<span>${F.dataBR(d.data)}</span><b>${esc(d.oQue)}</b>`).join('')}</div>` : ''}
      ${campos.length ? `<div class="info-grade nt-campos">${campos.map(([k, v]) => `<span>${esc(nomeCampo[k] || k)}</span><b>${valCampo(k, v)}</b>`).join('')}</div>` : ''}
      ${n.texto ? `<div class="nt-texto">${textoNota(n)}</div>` : ''}
      ${(n.tags || []).length ? `<div class="nt-tags">${n.tags.map(t => `<button class="tag tag-btn" data-acao="cb-tag" data-v="${esc(t)}">#${esc(t)}</button>`).join('')}</div>` : ''}
      ${ligadas.length || men.length ? `<div class="rot sub">${ui.ic('link')} Ligações</div><div class="lista-simples">${[...ligadas.map(x => ({ x, s: 'citada aqui' })), ...men.map(x => ({ x, s: 'menciona esta nota' }))].map(({ x, s }) => `<button class="ls-linha" data-acao="cb-abrir" data-v="${esc(x.id)}">${bolha(x.tipo)}<div class="ls-txt"><b>${esc(x.titulo)}</b><small>${s}</small></div></button>`).join('')}</div>` : ''}
      <div class="linha-btn"><button class="btn pri" data-acao="cb-editar" data-v="${n.id}">${ui.ic('lapis')} Editar</button>${n.sensivel ? '' : `<button class="btn" data-acao="cb-perguntar-nota" data-v="${n.id}">${ui.ic('finn')} Perguntar ao Jarvis</button>`}<button class="btn link perigo" data-acao="cb-apagar" data-v="${n.id}">Apagar</button></div>
      <p class="muted pequeno">Criada ${esc(ui.quando(n.criadoEm))}${n.origem === 'jarvis' ? ' pelo Jarvis' : n.origem === 'obsidian' ? ' (do Obsidian)' : ''}${n.editadoEm && n.editadoEm !== n.criadoEm ? ' · editada ' + esc(ui.quando(n.editadoEm)) : ''}</p>`;
  };
  function formNota(n) {
    const ui = U(), t = n.tipo || 'nota', c = n.campos || {};
    return `<div class="chips tipos-form">${Object.entries(Cb.TIPOS).map(([k, x]) => `<button type="button" class="chip ${t === k ? 'on' : ''}" data-acao="cb-form-tipo" data-v="${k}">${x.nome}</button>`).join('')}</div>
      <input type="hidden" id="nt-tipo" value="${esc(t)}">
      <label class="campo-rot">Título<input id="nt-titulo" value="${esc(n.titulo || '')}" placeholder="Ex.: Contrato do aluguel, Ana (cliente), Meta 2027" autocomplete="off"></label>
      <label class="campo-rot">Texto<textarea id="nt-texto" rows="9" placeholder="Escreva à vontade. Use [[Outra nota]] para ligar notas e #tags para agrupar.">${esc(n.texto || '')}</textarea></label>
      <div class="dois-campos"><label class="campo-rot">Tags<input id="nt-tags" value="${esc((n.tags || []).join(', '))}" placeholder="trabalho, família" autocomplete="off"></label><label class="campo-rot" id="nt-vence-rot">${t === 'meta' ? 'Prazo' : t === 'contrato' ? 'Fim ou renovação' : 'Vencimento'}<input id="nt-vence" type="date" value="${esc(n.vence || '')}"></label></div>
      <div id="nt-pessoa" ${['pessoa', 'cliente'].includes(t) ? '' : 'hidden'}><div class="dois-campos"><label class="campo-rot">Aniversário<input id="nt-aniv" value="${esc(c.aniversario || '')}" placeholder="DD/MM" inputmode="numeric"></label><label class="campo-rot">Telefone<input id="nt-tel" value="${esc(c.telefone || '')}" inputmode="tel"></label></div>
        <div class="dois-campos"><label class="campo-rot">E-mail<input id="nt-email" value="${esc(c.email || '')}" type="email" autocapitalize="none"></label><label class="campo-rot">Empresa ou relação<input id="nt-empresa" value="${esc(c.empresa || c.relacao || '')}"></label></div></div>
      <label class="chk-linha"><input type="checkbox" id="nt-fixada" ${n.fixada ? 'checked' : ''}> ${ui.ic('fixar')} Fixar — o Jarvis lê em toda conversa</label>
      <label class="chk-linha"><input type="checkbox" id="nt-sensivel" ${n.sensivel ? 'checked' : ''}> ${ui.ic('cadeado')} Sensível — nunca vai para a IA</label>`;
  }
  EXT.folhas['cb-editar'] = f => {
    const n = f.id ? (U().D.notas || []).find(x => x.id === f.id) : (f.modelo || {});
    if (f.id && !n) return null;
    return `${cab(f.id ? 'Editar' : 'Nova nota')}${formNota(n)}<div class="linha-btn"><button class="btn pri" data-acao="cb-salvar" data-v="${esc(f.id || '')}">Salvar</button><button class="btn" data-acao="${f.id ? 'cb-abrir' : 'fechar'}" data-v="${esc(f.id || '')}">Cancelar</button></div>`;
  };
  function lerForm() {
    const v = id => ($('#' + id) || {}).value || '';
    const tipo = Cb.tipoDe(v('nt-tipo'));
    const campos = {};
    if (['pessoa', 'cliente'].includes(tipo)) { if (v('nt-aniv').trim()) campos.aniversario = v('nt-aniv').trim().slice(0, 5); if (v('nt-tel').trim()) campos.telefone = v('nt-tel').trim(); if (v('nt-email').trim()) campos.email = v('nt-email').trim(); if (v('nt-empresa').trim()) campos[tipo === 'pessoa' ? 'relacao' : 'empresa'] = v('nt-empresa').trim(); }
    return { tipo, titulo: v('nt-titulo').trim(), texto: v('nt-texto'), tags: Cb.limparTags([...v('nt-tags').split(','), ...Cb.tagsNoTexto(v('nt-texto'))]), vence: Cb.dataOk(v('nt-vence')), campos, fixada: !!($('#nt-fixada') || {}).checked, sensivel: !!($('#nt-sensivel') || {}).checked };
  }

  /* ---------- arquivos: PDF, fotos, textos ---------- */
  async function textoDoArquivo(nome, tipo, bytes) {
    const n = nome.toLowerCase();
    if (tipo === 'application/pdf' || n.endsWith('.pdf')) {
      let doc;
      try { doc = await window.Contas.abrirPdf(bytes); }
      catch (e) { if (!e.senha) throw e; const s = window.prompt('Esse PDF tem senha. Digite a senha para o Jarvis ler (ela não é guardada):'); if (!s) throw new Error('Sem a senha do PDF não dá para ler o texto.'); doc = await window.Contas.abrirPdf(bytes, [s]); }
      try { return { texto: (await window.Contas.textoDoPdf(doc, 300)).trim(), pdf: true, paginas: doc.numPages }; } finally { try { doc.destroy(); } catch {} }
    }
    if (/^image\//.test(tipo) || /\.(jpe?g|png|webp|heic|heif|gif)$/.test(n)) return { texto: '', imagem: true };
    if (/\.docx$/.test(n)) return { texto: '', docx: true };
    if (/^text\//.test(tipo) || /\.(md|txt|csv|json|html?)$/.test(n)) return { texto: new TextDecoder().decode(bytes).slice(0, 400000) };
    return { texto: '' };
  }
  const mimeDe = (nome, tipo) => tipo || ({ pdf: 'application/pdf', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', heic: 'image/heic', heif: 'image/heif', txt: 'text/plain', md: 'text/markdown' }[(nome.split('.').pop() || '').toLowerCase()] || 'application/octet-stream');
  const b64 = u8 => window.Sinc.b64.deBytes(u8);
  EXT.folhas['cb-arquivo'] = () => {
    const ui = U(), a = ST.arq; if (!a) return null;
    const topo = `${cab('Guardar documento')}<div class="nt-arquivo">${ui.ic(a.imagem ? 'camera' : 'pdf')}<div class="ls-txt"><b>${esc(a.nome)}</b><small>${tamanho(a.bytes.length)}</small></div></div>`;
    if (a.fase === 'escolhido') return `${topo}
      <label class="chk-linha"><input type="checkbox" id="arq-sensivel" ${a.sensivel ? 'checked' : ''}> ${ui.ic('cadeado')} Sensível — não mandar para a IA (ex.: documentos com CPF, exames)</label>
      <p class="muted pequeno">${ui.M.iaOk ? 'O Jarvis lê o documento, sugere título, resumo e vencimento, e guarda o original no seu cofre privado.' : 'Sem a IA configurada, o Jarvis guarda o arquivo e o texto (quando é PDF com texto) para a busca.'}</p>
      <button class="btn pri largo" data-acao="cb-arq-ler">Ler e guardar</button>`;
    if (a.fase === 'lendo') return `${topo}<div class="progresso"><span class="giro"></span>${esc(a.passo || 'Lendo…')}</div>`;
    const sug = a.analise || {};
    return `${topo}${a.aviso ? `<p class="muted pequeno">${esc(a.aviso)}</p>` : ''}
      ${sug.resumo ? `<div class="nt-resumo"><b>Resumo do Jarvis:</b> ${esc(sug.resumo)}</div>` : ''}
      ${(sug.datas || []).length ? `<div class="info-grade">${sug.datas.map(d => `<span>${F.dataBR(d.data)}</span><b>${esc(d.oQue)}</b>`).join('')}</div>` : ''}
      ${formNota({ tipo: sug.tipo || 'documento', titulo: sug.titulo || a.nome.replace(/\.\w+$/, ''), texto: '', tags: sug.tags || [], vence: sug.vence || a.venceTexto || '', sensivel: a.sensivel, campos: {} })}
      <button class="btn pri largo" data-acao="cb-arq-salvar">Guardar no cérebro</button>`;
  };
  async function escolherArquivo(file) {
    if (file.size > 25e6) { U().aviso('Arquivo grande demais (máximo 25 MB).', 'erro'); return; }
    const bytes = new Uint8Array(await file.arrayBuffer());
    ST.arq = { nome: file.name || 'arquivo', tipo: mimeDe(file.name || '', file.type), bytes, fase: 'escolhido', sensivel: false, imagem: /^image\//.test(mimeDe(file.name || '', file.type)) };
    U().abrirFolha({ tipo: 'cb-arquivo' });
  }
  async function lerArquivo() {
    const ui = U(), a = ST.arq; if (!a) return;
    a.sensivel = !!($('#arq-sensivel') || {}).checked;
    const passo = t => { a.passo = t; ui.abrirFolha({ tipo: 'cb-arquivo' }, true); };
    a.fase = 'lendo'; passo('Lendo o arquivo…');
    try {
      const r = await textoDoArquivo(a.nome, a.tipo, a.bytes);
      a.texto = r.texto || ''; a.imagem = !!r.imagem;
      if (r.docx) a.aviso = 'Arquivos do Word ficam guardados, mas o Jarvis ainda não lê o texto deles. Se puder, salve como PDF.';
      a.venceTexto = Cb.venceSugerido(a.texto);
      const podeIA = !a.sensivel && ui.M.iaOk;
      if (podeIA && (a.texto.length >= 120 || ((r.imagem || r.pdf) && a.bytes.length <= 15e6))) {
        passo('O Jarvis está lendo o documento…');
        const usarArquivo = a.texto.length < 120;
        a.analise = await Cb.analisar({ A: ui.A, texto: usarArquivo ? '' : a.texto, arquivo: usarArquivo ? { tipo: a.tipo, b64: b64(a.bytes) } : null, nomeArquivo: a.nome });
        if (usarArquivo && a.analise.transcricao) a.texto = a.analise.transcricao;
        if (!a.analise.vence && a.venceTexto) a.analise.vence = a.venceTexto;
      } else if (!a.texto && !a.sensivel && !ui.M.iaOk && (r.imagem || r.pdf)) a.aviso = 'Sem a IA, o Jarvis guarda a foto/PDF escaneado, mas não consegue ler o texto dela.';
      a.fase = 'pronto';
    } catch (e) { a.fase = 'pronto'; a.aviso = 'Não consegui ler tudo: ' + e.message; }
    ui.abrirFolha({ tipo: 'cb-arquivo' }, true);
  }
  async function salvarArquivo() {
    const ui = U(), a = ST.arq; if (!a) return;
    const f = lerForm(); if (!f.titulo) { ui.aviso('Dê um título'); return; }
    const n = Cb.nova({ ...f, origem: 'arquivo' });
    const ext = ((a.nome.match(/\.(\w{1,5})$/) || [])[1] || 'bin').toLowerCase();
    const caminho = `cerebro/${n.id}.${ext}`;
    ui.abrirFolha({ tipo: 'progresso', titulo: 'Guardando…', texto: 'Salvando o arquivo no aparelho e no seu cofre privado' });
    try {
      await Arq().guardar(caminho, a.bytes);
      n.arquivo = { nome: a.nome.slice(0, 160), tipo: a.tipo, tamanho: a.bytes.length, caminho };
      if (a.texto && a.texto.trim()) { const ct = `cerebro/${n.id}.txt`; await Arq().guardarTexto(ct, a.texto); n.extraido = { caminho: ct, chars: a.texto.length }; ST.textos.set(ct, a.texto); }
      if (a.analise) { n.resumo = a.analise.resumo || ''; n.datas = a.analise.datas || []; if (!f.texto && (a.analise.pessoas || []).length) n.texto = 'Pessoas: ' + a.analise.pessoas.map(p => `[[${p}]]`).join(', ') + ((a.analise.valores || []).length ? '\nValores: ' + a.analise.valores.join('; ') : ''); }
      else if (!n.resumo && a.texto) n.resumo = a.texto.replace(/\s+/g, ' ').slice(0, 300) + (a.texto.length > 300 ? '…' : '');
      (ui.D.notas = ui.D.notas || []).push(n);
      ui.salvar(); ST.arq = null;
      ui.abrirFolha({ tipo: 'cb-nota', id: n.id }); if (naTela()) telaCerebro();
      ui.aviso('Guardado no seu segundo cérebro');
    } catch (e) { ui.aviso(e.message, 'erro'); ui.abrirFolha({ tipo: 'cb-arquivo' }); }
  }
  async function mostrarArquivo(n) {
    const el = $('#cb-visor'); if (!el || !n.arquivo) return;
    el.innerHTML = '<div class="progresso"><span class="giro"></span>Abrindo…</div>';
    try {
      const b = await Arq().ler(n.arquivo.caminho);
      if (!b) { el.innerHTML = '<p class="muted pequeno">O arquivo ainda não chegou neste aparelho. Tente de novo em instantes.</p>'; return; }
      el.innerHTML = ''; el.className = 'pdf-visor';
      if (/pdf/.test(n.arquivo.tipo)) await window.Contas.renderizar(b, el, {});
      else { const img = document.createElement('img'); img.className = 'pdf-pag'; img.alt = n.arquivo.nome; img.src = URL.createObjectURL(new Blob([b], { type: n.arquivo.tipo })); el.append(img); }
    } catch (e) { el.innerHTML = `<p class="erro-msg">${esc(e.message)}</p>`; }
  }

  /* ---------- Obsidian / Markdown (PC) ---------- */
  async function importarObsidian() {
    const ui = U();
    const r = await window.api.obsidianImportar(); if (!r) return;
    let novas = 0, atualizadas = 0;
    const porCaminho = new Map((ui.D.notas || []).filter(n => n.obsidian).map(n => [n.obsidian.caminho, n]));
    for (const a of r.arquivos) {
      const d = Cb.deMarkdown(a.caminho, a.conteudo, a.mtime);
      const ex = porCaminho.get(a.caminho);
      if (ex) { if (ex.obsidian.mtime !== a.mtime) { Object.assign(ex, { titulo: d.titulo, texto: d.texto, tags: d.tags, vence: d.vence || ex.vence, tipo: d.tipo, obsidian: d.obsidian, editadoEm: new Date().toISOString() }); if (Object.keys(d.campos).length) ex.campos = { ...(ex.campos || {}), ...d.campos }; atualizadas++; } continue; }
      const n = Cb.nova(d); n.obsidian = d.obsidian; (ui.D.notas = ui.D.notas || []).push(n); novas++;
    }
    ui.salvar(); if (naTela()) telaCerebro();
    ui.aviso(r.arquivos.length ? `Do Obsidian: ${novas} nota${novas === 1 ? '' : 's'} nova${novas === 1 ? '' : 's'}${atualizadas ? `, ${atualizadas} atualizada${atualizadas === 1 ? '' : 's'}` : ''}` : 'Nenhum arquivo .md nessa pasta');
  }
  async function exportarObsidian() {
    const ui = U(), usados = new Set(), arqs = [];
    const nome = (pasta, t) => { let base = `${pasta}/${Cb.nomeArquivo(t)}`, c = base + '.md', i = 2; while (usados.has(c.toLowerCase())) c = `${base} (${i++}).md`; usados.add(c.toLowerCase()); return c; };
    for (const n of ui.D.notas || []) arqs.push({ caminho: nome(Cb.pastaExport(n), n.titulo), conteudo: Cb.paraMarkdown(n) });
    for (const it of ui.D.biblioteca || []) {
      const cabB = ['---', `tipo: ${it.tipo}`, it.autor ? `autor: ${it.autor}` : '', `status: ${it.status}`, it.nota ? `nota: ${it.nota}` : '', it.url ? `link: ${it.url}` : '', '---', ''].filter(x => x !== '').join('\n');
      const corpo = [it.resumo && '## Resumo\n' + it.resumo, (it.licoes || []).length && '## Lições\n' + it.licoes.map(l => '- ' + l).join('\n'), (it.destaques || []).length && '## Grifos\n' + it.destaques.map(d => (d.nota ? '- Nota: ' : '> ') + d.texto).join('\n\n'), it.anotacoes && '## Anotações\n' + it.anotacoes].filter(Boolean).join('\n\n');
      arqs.push({ caminho: nome('Biblioteca', it.titulo), conteudo: cabB + '\n' + corpo + '\n' });
    }
    const r = await window.api.obsidianExportar(arqs); if (!r) return;
    ui.aviso(`${r.n} arquivos .md salvos em ${r.pasta}`);
  }
  EXT.folhas['cb-obsidian'] = () => `${cab('Obsidian e Markdown')}
    <p>Já usa o Obsidian (ou guarda notas em arquivos .md)? Traga tudo para o Jarvis — pastas como <b>Pessoas</b>, <b>Clientes</b>, <b>Metas</b> e <b>Contratos</b> viram o tipo certo, e as #tags e [[ligações]] continuam funcionando.</p>
    <div class="linha-btn"><button class="btn pri" data-acao="cb-obs-importar">${U().ic('importar')} Importar uma pasta</button><button class="btn" data-acao="cb-obs-exportar">${U().ic('exportar')} Exportar para .md</button></div>
    <p class="muted pequeno">Importar de novo a mesma pasta atualiza as notas que mudaram. Exportar cria a pasta "Jarvis" com o cérebro e a biblioteca, prontos para abrir no Obsidian.</p>`;

  /* ---------- ações ---------- */
  const A = EXT.acoes;
  A['cb-abrir'] = v => U().abrirFolha({ tipo: 'cb-nota', id: v });
  A['mem-abrir'] = v => abrirDoc(v);
  A['mem-fechar'] = () => { ST.resposta = null; const el = $('#cb-resp'); if (el) el.innerHTML = ''; if (window.__biblioteca) window.__biblioteca.fecharResposta(); };
  A['cb-tipo'] = v => { ST.tipo = v; telaCerebro(); };
  A['cb-tag'] = v => { U().fecharFolha(); ST.q = '#' + v; ST.tipo = ''; if (U().M.tela !== 'cerebro') U().irPara('cerebro'); else telaCerebro(); };
  A['cb-link'] = v => {
    const ui = U(), n = Cb.porTitulo(ui.D, v);
    if (n) return ui.abrirFolha({ tipo: 'cb-nota', id: n.id });
    if (ui.certeza(`A nota "${v}" ainda não existe. Criar agora?`)) ui.abrirFolha({ tipo: 'cb-editar', modelo: { titulo: v, tipo: 'nota' } });
  };
  A['cb-nova'] = () => U().abrirFolha({ tipo: 'cb-editar', modelo: { tipo: ST.tipo || 'nota' } });
  A['cb-sobre-mim'] = () => { const ui = U(); const ex = Cb.porTitulo(ui.D, 'Sobre mim'); if (ex) return ui.abrirFolha({ tipo: 'cb-nota', id: ex.id }); ui.abrirFolha({ tipo: 'cb-editar', modelo: { tipo: 'nota', titulo: 'Sobre mim', fixada: true, texto: 'Trabalho:\nO que estou buscando agora:\nFamília:\nObjetivos deste ano:\nComo gosto que o Jarvis fale comigo:' } }); };
  A['cb-form-tipo'] = (v, b) => {
    $('#nt-tipo').value = v; [...b.parentNode.children].forEach(x => x.classList.toggle('on', x === b));
    const p = $('#nt-pessoa'); if (p) p.hidden = !['pessoa', 'cliente'].includes(v);
    const r = $('#nt-vence-rot'); if (r && r.firstChild) r.firstChild.textContent = v === 'meta' ? 'Prazo' : v === 'contrato' ? 'Fim ou renovação' : 'Vencimento';
  };
  A['cb-editar'] = v => U().abrirFolha({ tipo: 'cb-editar', id: v });
  A['cb-salvar'] = v => {
    const ui = U(), f = lerForm(); if (!f.titulo) { ui.aviso('Dê um título'); return; }
    let n;
    if (v) { n = (ui.D.notas || []).find(x => x.id === v); if (!n) return; Object.assign(n, f, { editadoEm: new Date().toISOString() }); }
    else { n = Cb.nova(f); (ui.D.notas = ui.D.notas || []).push(n); }
    ui.salvar(); ui.abrirFolha({ tipo: 'cb-nota', id: n.id }); if (naTela()) telaCerebro(); ui.aviso('Salvo');
  };
  A['cb-apagar'] = async v => {
    const ui = U(), l = ui.D.notas || [], i = l.findIndex(x => x.id === v); if (i < 0) return;
    if (!ui.certeza(`Apagar "${l[i].titulo}"${l[i].arquivo ? ' e o arquivo dela' : ''}?`)) return;
    const n = l.splice(i, 1)[0];
    ui.salvar(); ui.fecharFolha(); if (naTela()) telaCerebro();
    for (const c of [n.arquivo && n.arquivo.caminho, n.extraido && n.extraido.caminho].filter(Boolean)) { Arq().apagar(c).catch(() => {}); ST.textos.delete(c); }
  };
  A['cb-ver'] = v => { const n = (U().D.notas || []).find(x => x.id === v); if (n) mostrarArquivo(n); };
  A['cb-baixar'] = async v => {
    const ui = U(), n = (ui.D.notas || []).find(x => x.id === v); if (!n || !n.arquivo) return;
    if (ui.PC) { const b = await Arq().ler(n.arquivo.caminho); if (!b) return ui.aviso('O arquivo ainda não chegou neste computador.'); const r = await window.api.arqAbrir(n.arquivo.caminho, n.arquivo.nome); if (r) ui.aviso(r, 'erro'); return; }
    const b = await Arq().ler(n.arquivo.caminho); if (!b) return ui.aviso('O arquivo ainda não chegou neste aparelho.');
    const url = URL.createObjectURL(new Blob([b], { type: n.arquivo.tipo })); const a = document.createElement('a'); a.href = url; a.download = n.arquivo.nome; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 5000);
  };
  A['cb-perguntar-nota'] = v => { const ui = U(), n = (ui.D.notas || []).find(x => x.id === v); if (!n) return; ui.fecharFolha(); ui.irPara('finn'); const t = $('#chat-texto'); if (t) { t.value = `Sobre "${n.titulo}": `; t.focus(); ui.ajustaAltura(t); } };
  A['cb-arquivo'] = () => { const i = $('#cb-file'); if (i) i.click(); else { U().irPara('cerebro'); setTimeout(() => { const j = $('#cb-file'); if (j) j.click(); }, 50); } };
  A['cb-arq-ler'] = () => lerArquivo();
  A['cb-arq-salvar'] = () => salvarArquivo();
  A['cb-obsidian'] = () => U().abrirFolha({ tipo: 'cb-obsidian' });
  A['cb-obs-importar'] = () => { U().fecharFolha(); return importarObsidian(); };
  A['cb-obs-exportar'] = () => { U().fecharFolha(); return exportarObsidian(); };

  document.addEventListener('input', ev => {
    if (ev.target.id === 'cb-q') { ST.q = ev.target.value; if (!ST.q.trim()) ST.resposta = null; clearTimeout(ST.t); ST.t = setTimeout(desenharResultados, 120); }
  });
  document.addEventListener('submit', async ev => {
    if (ev.target.id !== 'cb-form') return;
    ev.preventDefault(); const q = $('#cb-q').value.trim(); if (!q) return;
    ST.q = q; desenharResultados();
    ST.resposta = { carregando: true };
    const r = await perguntar(q, 'tudo', '#cb-resp');
    ST.resposta = r;
  });
  document.addEventListener('change', ev => {
    if (ev.target.id === 'cb-file' && ev.target.files[0]) { const f = ev.target.files[0]; ev.target.value = ''; escolherArquivo(f); }
  });

  EXT.ajustes.push(() => {
    const ui = U();
    return `<section class="card"><div class="rot">Segundo cérebro e biblioteca</div>
      <p class="muted pequeno">Notas e documentos ficam neste aparelho e no seu cofre privado do GitHub. Quando você pergunta algo, os trechos que importam vão para a IA do Google para ela responder (no uso gratuito, o Google pode usar o que recebe para melhorar os produtos dele). O que você marcar como <b>sensível</b> nunca vai.</p>
      ${ui.PC ? `<div class="linha-btn"><button class="btn" data-acao="cb-obs-importar">${ui.ic('importar')} Importar do Obsidian</button><button class="btn" data-acao="cb-obs-exportar">${ui.ic('exportar')} Exportar para .md</button></div>` : ''}</section>`;
  });

  EXT.telas.cerebro = telaCerebro;
  EXT.aoIniciar.push(async () => {
    // arquivos novos que ainda não subiram e limpeza de arquivos de itens apagados
    setTimeout(async () => {
      const D = U().D;
      Arq().enviarPendentes().catch(() => {});
      const validos = [...(D.notas || []).flatMap(n => [n.arquivo && n.arquivo.caminho, n.extraido && n.extraido.caminho]), ...(D.biblioteca || []).map(i => i.pontos && i.pontos.caminho)].filter(Boolean);
      Arq().limpar(validos).catch(() => {});
    }, U().PC && window.api.teste ? 1000 : 15000);
    setInterval(() => Arq().enviarPendentes().catch(() => {}), 30e3);
  });
  window.__cerebro = { ST, cartaoResposta, perguntar, abrirDoc, carregarTextos, escolherArquivo, lerArquivo, salvarArquivo, importarObsidian, exportarObsidian, docs };
})();
