/* Jarvis Finance — tela Biblioteca (PC e iPhone): tudo o que você leu, viu e ouviu.
   Cole um link do YouTube ou de um artigo, ou o nome de um livro: o Jarvis resume e tira as lições.
   Importa os grifos do Kindle e responde "o que eu aprendi sobre…" citando as fontes. */
(function () {
  'use strict';
  const F = window.Finn, B = window.Biblioteca;
  const EXT = window.FinnExt = window.FinnExt || {};
  for (const k of ['telas', 'folhas', 'acoes', 'titulos', 'icones']) EXT[k] = EXT[k] || {};
  for (const k of ['aoIniciar', 'antesDeSalvar', 'alertas', 'aoMudar', 'ajustes']) EXT[k] = EXT[k] || [];
  const U = () => window.__ui;
  const Arq = () => window.Arquivos;
  const MUI = () => window.__cerebro;
  const $ = (s, r = document) => r.querySelector(s);
  const esc = s => F.esc(s);

  Object.assign(EXT.icones, {
    fone: '<path d="M4 15.5V12a8 8 0 0 1 16 0v3.5"/><rect x="3" y="14" width="4.5" height="6.5" rx="1.5"/><rect x="16.5" y="14" width="4.5" height="6.5" rx="1.5"/>',
    chapeu: '<path d="M2.5 9 12 4.5 21.5 9 12 13.5z"/><path d="M6.5 11v5c1.5 1.5 3.5 2.2 5.5 2.2s4-.7 5.5-2.2v-5M21.5 9v6"/>',
    estrela: '<path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.8l-5.2 2.8 1-5.8-4.3-4.1 5.9-.8z"/>',
    marcador: '<path d="M6.5 3.5h11v17l-5.5-4-5.5 4z"/>',
  });
  EXT.titulos.biblioteca = 'Biblioteca';

  const ST = { tipo: '', status: '', resposta: null, ultimaPergunta: '', resumindo: {}, colar: {}, novo: null, kindle: null };
  const naTela = () => U() && U().M.tela === 'biblioteca';
  const capa = it => { const t = B.TIPOS[it.tipo] || B.TIPOS.livro; return `<span class="bb-capa" style="--c:${t.cor}">${U().ic(t.ic)}</span>`; };
  const estrelas = n => n ? '★'.repeat(n) + '☆'.repeat(5 - n) : '';
  const placeholder = it => !it.titulo || it.titulo === 'Sem título' || /^(https?:|www\.)/i.test(it.titulo) || /^Vídeo do YouTube|^Artigo de /.test(it.titulo);

  /* ---------- tela ---------- */
  function linhaItem(it) {
    const ui = U(), l1 = (it.licoes || [])[0];
    return `<button class="bb-item" data-acao="bb-abrir" data-v="${esc(it.id)}">${capa(it)}<div class="ls-txt"><b>${esc(it.titulo)}</b><small>${[it.autor, B.nomeStatus(it), estrelas(it.nota)].filter(Boolean).map(esc).join(' · ')}${(it.destaques || []).length ? ` · ${it.destaques.length} grifo${it.destaques.length > 1 ? 's' : ''}` : ''}</small>${l1 ? `<small class="bb-licao">${esc(l1)}</small>` : (!it.resumo ? '<small class="bb-licao sem">Sem resumo ainda — toque para resumir com o Jarvis</small>' : '')}</div>${ST.resumindo[it.id] ? '<span class="giro"></span>' : ui.ic('dir', 'seta')}</button>`;
  }
  function telaBiblioteca() {
    const ui = U(), D = ui.D, itens = D.biblioteca || [];
    const cont = {}; for (const it of itens) cont[it.tipo] = (cont[it.tipo] || 0) + 1;
    const andamento = itens.filter(i => i.status === 'consumindo');
    const lista = itens.filter(i => (!ST.tipo || i.tipo === ST.tipo) && (!ST.status || i.status === ST.status))
      .sort((a, b) => ({ consumindo: 0, quero: 2, concluido: 1 }[a.status] - { consumindo: 0, quero: 2, concluido: 1 }[b.status]) || (b.concluidoEm || b.editadoEm || '').localeCompare(a.concluidoEm || a.editadoEm || ''));
    const licoes = B.licoes(D).length;
    let h = `<div class="memoria">
      <form class="pergunte" id="bb-form"><span class="avatar">${ui.ic('livro')}</span><input id="bb-q" type="search" placeholder="O que você quer lembrar?" value="${esc(ST.ultimaPergunta)}" enterkeyhint="search" autocomplete="off" aria-label="Perguntar à biblioteca"><button class="btn pri mini" type="submit">Perguntar</button></form>
      <div id="bb-resp">${ST.resposta ? MUI().cartaoResposta(ST.resposta, { ondeAtual: 'biblioteca' }) : ''}</div>
      <div class="mem-acoes"><button class="btn pri mini" data-acao="bb-novo">${ui.ic('mais')} Adicionar</button><label class="btn mini">${ui.ic('marcador')} Grifos do Kindle<input type="file" id="bb-kindle" accept=".txt,text/plain" hidden></label></div>
      <div class="bb-numeros">${Object.entries(B.TIPOS).filter(([k]) => cont[k]).map(([k, t]) => `<span><b>${cont[k]}</b> ${(cont[k] > 1 ? t.plural : t.nome).toLowerCase()}</span>`).join('')}${licoes ? `<span><b>${licoes}</b> lições e grifos</span>` : ''}</div>`;
    if (andamento.length && !ST.tipo && !ST.status) h += `<div class="rot sub">Em andamento</div><div class="bb-andamento">${andamento.map(it => `<button class="bb-cartao" data-acao="bb-abrir" data-v="${esc(it.id)}">${capa(it)}<b>${esc(it.titulo)}</b><small>${esc(it.autor || B.TIPOS[it.tipo].nome)}</small></button>`).join('')}</div>`;
    h += `<div class="chips tipos-chips"><button class="chip ${!ST.tipo ? 'on' : ''}" data-acao="bb-tipo" data-v="">Tudo</button>${Object.entries(B.TIPOS).map(([k, t]) => `<button class="chip ${ST.tipo === k ? 'on' : ''}" data-acao="bb-tipo" data-v="${k}">${t.plural}${cont[k] ? ` <em>${cont[k]}</em>` : ''}</button>`).join('')}</div>
      <div class="seg bb-status">${[['', 'Todos'], ['quero', 'Quero'], ['consumindo', 'Em andamento'], ['concluido', 'Concluídos']].map(([v, n]) => `<button class="${ST.status === v ? 'on' : ''}" data-acao="bb-status" data-v="${v}">${n}</button>`).join('')}</div>`;
    h += lista.length ? `<div class="card lista-bb">${lista.map(linhaItem).join('')}</div>` : `<div class="card vazio-lista"><p>${itens.length ? 'Nada com esse filtro.' : 'Sua biblioteca está vazia. Adicione um livro, cole um link do YouTube ou importe seus grifos do Kindle.'}</p></div>`;
    $('#tela').innerHTML = h + '</div>';
  }

  /* ---------- folhas ---------- */
  const cab = t => `<div class="folha-cab"><h3>${esc(t)}</h3><button class="redondo" data-acao="fechar" aria-label="Fechar">${U().ic('fechar')}</button></div>`;
  EXT.folhas['bb-novo'] = () => {
    const ui = U(), n = ST.novo || { tipo: 'livro', status: 'quero' };
    return `${cab('Adicionar à biblioteca')}
      <label class="campo-rot">Link ou nome<input id="bn-entrada" value="${esc(n.entrada || '')}" placeholder="Cole um link do YouTube/artigo ou escreva: Hábitos Atômicos - James Clear" autocomplete="off" autocapitalize="sentences"></label>
      <div class="dois-campos"><label class="campo-rot">Título<input id="bn-titulo" value="${esc(n.titulo || '')}" autocomplete="off"></label><label class="campo-rot">Autor ou canal<input id="bn-autor" value="${esc(n.autor || '')}" autocomplete="off"></label></div>
      <div class="dois-campos"><label class="campo-rot">Tipo<select id="bn-tipo">${Object.entries(B.TIPOS).map(([k, t]) => `<option value="${k}" ${n.tipo === k ? 'selected' : ''}>${t.nome}</option>`).join('')}</select></label>
      <label class="campo-rot">Situação<select id="bn-status">${Object.entries(B.STATUS).map(([k, t]) => `<option value="${k}" ${n.status === k ? 'selected' : ''}>${t}</option>`).join('')}</select></label></div>
      <div class="linha-btn"><button class="btn pri" data-acao="bb-novo-salvar" data-v="resumir" ${ui.M.iaOk ? '' : 'hidden'}>${ui.ic('finn')} Adicionar e resumir</button><button class="btn ${ui.M.iaOk ? '' : 'pri'}" data-acao="bb-novo-salvar">Só adicionar</button></div>
      <p class="muted pequeno">Vídeos do YouTube: o Jarvis assiste e resume. Artigos: ${ui.PC ? 'o Jarvis lê a página' : 'a IA abre o link'}. Livros: resumo pelo conhecimento geral da IA (confira com as suas anotações).</p>`;
  };
  EXT.folhas['bb-item'] = f => {
    const ui = U(), it = (ui.D.biblioteca || []).find(x => x.id === f.id); if (!it) return null;
    const T = B.TIPOS[it.tipo] || B.TIPOS.livro, verbos = B.VERBO[it.tipo] || B.VERBO.livro;
    const resumindo = ST.resumindo[it.id];
    return `${cab(it.titulo)}
      <div class="nt-cab">${capa(it)}<span>${esc(T.nome)}${it.autor ? ' · ' + esc(it.autor) : ''}</span>${it.url ? `<a class="btn mini" href="${esc(it.url)}" target="_blank" rel="noopener">${ui.ic('externo')} Abrir</a>` : ''}</div>
      <div class="seg largo bb-st">${['quero', 'consumindo', 'concluido'].map((s, i) => `<button class="${it.status === s ? 'on' : ''}" data-acao="bb-mudar-status" data-v="${it.id}|${s}">${verbos[i]}</button>`).join('')}</div>
      <div class="bb-estrelas" role="group" aria-label="Sua nota">${[1, 2, 3, 4, 5].map(n => `<button class="${(it.nota || 0) >= n ? 'on' : ''}" data-acao="bb-nota" data-v="${it.id}|${n}" aria-label="${n} estrela${n > 1 ? 's' : ''}">${ui.ic('estrela')}</button>`).join('')}</div>
      ${resumindo ? `<div class="progresso"><span class="giro"></span>${esc(resumindo)}</div>` : ''}
      ${it.resumo ? `<div class="rot sub">Resumo</div><div class="nt-resumo">${ui.markdown(it.resumo)}</div>${it.fonte === 'ia-conhecimento' ? '<p class="muted pequeno">Resumo feito pela IA com o conhecimento geral dela. Confira com as suas anotações.</p>' : ''}` : ''}
      ${(it.licoes || []).length ? `<div class="rot sub">Lições</div><ol class="bb-licoes">${it.licoes.map(l => `<li>${esc(l)}</li>`).join('')}</ol>` : ''}
      ${it.pontos ? `<details class="cf-mais" id="bb-pontos" data-v="${it.id}"><summary>Pontos-chave detalhados</summary><div class="nt-texto" id="bb-pontos-txt"><div class="progresso"><span class="giro"></span>Abrindo…</div></div></details>` : ''}
      ${(it.destaques || []).length ? `<details class="cf-mais"><summary>Seus grifos (${it.destaques.length})</summary><div class="bb-grifos">${it.destaques.map(d => `<blockquote class="${d.nota ? 'nota' : ''}">${esc(d.texto)}${d.local ? `<small>${d.nota ? 'nota · ' : ''}posição ${esc(d.local)}</small>` : ''}</blockquote>`).join('')}</div></details>` : ''}
      <label class="campo-rot">Suas anotações<textarea id="bb-anot" rows="4" placeholder="O que você achou, o que vai aplicar…">${esc(it.anotacoes || '')}</textarea></label>
      ${ST.colar[it.id] ? `<label class="campo-rot">Cole o texto ou a transcrição<textarea id="bb-colar" rows="5" placeholder="A IA não conseguiu abrir sozinha. Cole aqui o texto, a transcrição ou suas notas."></textarea></label><button class="btn" data-acao="bb-resumir-texto" data-v="${it.id}">Resumir este texto</button>` : ''}
      <div class="linha-btn"><button class="btn pri" data-acao="bb-salvar-anot" data-v="${it.id}">Salvar anotações</button>${ui.M.iaOk ? `<button class="btn" data-acao="bb-resumir" data-v="${it.id}" ${resumindo ? 'disabled' : ''}>${ui.ic('finn')} ${it.resumo ? 'Resumir de novo' : 'Resumir com o Jarvis'}</button>` : ''}</div>
      <div class="linha-btn"><button class="btn link" data-acao="bb-perguntar-item" data-v="${it.id}">${ui.ic('finn')} Perguntar ao Jarvis sobre isto</button><button class="btn link" data-acao="bb-editar" data-v="${it.id}">${ui.ic('lapis')} Editar</button><button class="btn link perigo" data-acao="bb-apagar" data-v="${it.id}">Apagar</button></div>`;
  };
  EXT.folhas['bb-editar'] = f => {
    const it = (U().D.biblioteca || []).find(x => x.id === f.id); if (!it) return null;
    return `${cab('Editar')}
      <label class="campo-rot">Título<input id="be-titulo" value="${esc(it.titulo)}" autocomplete="off"></label>
      <div class="dois-campos"><label class="campo-rot">Autor ou canal<input id="be-autor" value="${esc(it.autor || '')}" autocomplete="off"></label><label class="campo-rot">Tipo<select id="be-tipo">${Object.entries(B.TIPOS).map(([k, t]) => `<option value="${k}" ${it.tipo === k ? 'selected' : ''}>${t.nome}</option>`).join('')}</select></label></div>
      <label class="campo-rot">Link<input id="be-url" value="${esc(it.url || '')}" autocomplete="off" autocapitalize="none"></label>
      <label class="campo-rot">Temas<input id="be-tags" value="${esc((it.tags || []).join(', '))}" autocomplete="off"></label>
      <div class="linha-btn"><button class="btn pri" data-acao="bb-editar-salvar" data-v="${it.id}">Salvar</button><button class="btn" data-acao="bb-abrir" data-v="${it.id}">Cancelar</button></div>`;
  };
  EXT.folhas['bb-kindle'] = () => {
    const k = ST.kindle || [], g = k.reduce((s, l) => s + l.destaques.length, 0);
    return `${cab('Grifos do Kindle')}
      <p>Encontrei <b>${g} grifo${g === 1 ? '' : 's'}</b> e notas de <b>${k.length} livro${k.length === 1 ? '' : 's'}</b>.</p>
      <div class="lista-simples">${k.slice(0, 40).map(l => `<div class="ls-linha">${capa({ tipo: 'livro' })}<div class="ls-txt"><b>${esc(l.titulo)}</b><small>${esc(l.autor || '')} · ${l.destaques.length} grifo${l.destaques.length > 1 ? 's' : ''}</small></div></div>`).join('')}</div>
      <button class="btn pri largo" data-acao="bb-kindle-ok" ${g ? '' : 'disabled'}>Importar para a biblioteca</button>
      <p class="muted pequeno">No Kindle, o arquivo fica em <b>documents/My Clippings.txt</b> (ligue o Kindle no computador pelo cabo). Grifos repetidos não entram duas vezes.</p>`;
  };

  /* ---------- resumir com a IA ---------- */
  async function resumir(id, { texto = '' } = {}) {
    const ui = U(), it = (ui.D.biblioteca || []).find(x => x.id === id); if (!it || ST.resumindo[id]) return;
    const passo = t => { ST.resumindo[id] = t; if (ui.M.folha && ui.M.folha.id === id) ui.abrirFolha({ tipo: 'bb-item', id }, true); if (naTela() && !ui.M.folha) telaBiblioteca(); };
    passo(it.tipo === 'video' ? 'O Jarvis está assistindo ao vídeo…' : texto ? 'O Jarvis está lendo…' : it.url ? 'Abrindo o link…' : 'O Jarvis está montando o resumo…');
    try {
      let urlDireta = false;
      if (!texto && it.url && it.tipo !== 'video' && !B.youtubeId(it.url)) {
        if (ui.PC) {
          const r = await window.api.artigoLer(it.url);
          if (r.pdf) { const doc = await window.Contas.abrirPdf(r.pdf); try { texto = await window.Contas.textoDoPdf(doc, 150); } finally { try { doc.destroy(); } catch {} } }
          else { texto = r.texto; if (placeholder(it) && r.titulo) it.titulo = r.titulo.slice(0, 220); if (!it.autor && (r.autor || r.site)) it.autor = (r.autor || r.site).slice(0, 140); }
          passo('O Jarvis está lendo…');
        } else urlDireta = true;
      }
      const res = await B.resumir({ A: ui.A, item: it, texto, urlDireta });
      if (!res.conhecido) { ST.colar[id] = true; ui.aviso('A IA não conseguiu abrir esse conteúdo sozinha. Cole o texto ou suas notas no item.', 'erro'); return; }
      it.resumo = res.resumo; it.licoes = res.licoes; it.fonte = res.fonte;
      it.tags = [...new Set([...(it.tags || []), ...res.tags])].slice(0, 8);
      if (res.titulo && placeholder(it)) it.titulo = res.titulo;
      if (!it.autor && res.autor) it.autor = res.autor;
      if (res.pontos) { const c = `biblioteca/${it.id}.md`; await Arq().guardarTexto(c, res.pontos); it.pontos = { caminho: c, chars: res.pontos.length }; if (MUI()) MUI().ST.textos.set(c, res.pontos); }
      it.editadoEm = new Date().toISOString(); delete ST.colar[id];
      ui.salvar(); ui.aviso('Resumo pronto: ' + it.titulo);
    } catch (e) { ui.aviso(e.message, 'erro'); }
    finally { delete ST.resumindo[id]; if (ui.M.folha && ui.M.folha.id === id) ui.abrirFolha({ tipo: 'bb-item', id }, true); if (naTela() && !ui.M.folha) telaBiblioteca(); }
  }

  /* ---------- ações ---------- */
  const A = EXT.acoes;
  A['bb-abrir'] = v => U().abrirFolha({ tipo: 'bb-item', id: v });
  A['bb-tipo'] = v => { ST.tipo = v; telaBiblioteca(); };
  A['bb-status'] = v => { ST.status = v; telaBiblioteca(); };
  A['bb-novo'] = () => { ST.novo = null; U().abrirFolha({ tipo: 'bb-novo' }); };
  A['bb-novo-salvar'] = async v => {
    const ui = U(), entrada = $('#bn-entrada').value.trim();
    const det = entrada ? B.detectar(entrada) : {};
    let titulo = $('#bn-titulo').value.trim() || det.titulo || '', autor = $('#bn-autor').value.trim() || det.autor || '';
    const tipo = $('#bn-tipo').value || det.tipo || 'livro';
    if (!titulo && det.url) { try { const u = new URL(det.url); titulo = det.youtube ? 'Vídeo do YouTube' : 'Artigo de ' + u.hostname.replace(/^www\./, ''); } catch { titulo = det.url; } }
    if (!titulo) { ui.aviso('Escreva o título ou cole um link'); return; }
    const it = B.novo({ titulo, autor, tipo, url: det.url || '', status: $('#bn-status').value, fonte: 'manual' });
    if (it.status === 'concluido') it.concluidoEm = F.hoje();
    (ui.D.biblioteca = ui.D.biblioteca || []).push(it); ui.salvar();
    ui.abrirFolha({ tipo: 'bb-item', id: it.id }); if (naTela()) telaBiblioteca();
    if (v === 'resumir') resumir(it.id);
  };
  A['bb-mudar-status'] = v => { const [id, s] = v.split('|'); const ui = U(), it = (ui.D.biblioteca || []).find(x => x.id === id); if (!it) return; it.status = s; if (s === 'concluido' && !it.concluidoEm) it.concluidoEm = F.hoje(); it.editadoEm = new Date().toISOString(); ui.salvar(); ui.abrirFolha({ tipo: 'bb-item', id }, true); if (naTela()) telaBiblioteca(); };
  A['bb-nota'] = v => { const [id, n] = v.split('|'); const ui = U(), it = (ui.D.biblioteca || []).find(x => x.id === id); if (!it) return; it.nota = it.nota === +n ? null : +n; ui.salvar(); ui.abrirFolha({ tipo: 'bb-item', id }, true); };
  A['bb-salvar-anot'] = v => { const ui = U(), it = (ui.D.biblioteca || []).find(x => x.id === v); if (!it) return; it.anotacoes = $('#bb-anot').value; it.editadoEm = new Date().toISOString(); ui.salvar(); ui.aviso('Anotações salvas'); };
  A['bb-resumir'] = v => resumir(v);
  A['bb-resumir-texto'] = v => { const t = ($('#bb-colar') || {}).value || ''; if (t.trim().length < 80) { U().aviso('Cole um texto um pouco maior.'); return; } resumir(v, { texto: t }); };
  A['bb-editar'] = v => U().abrirFolha({ tipo: 'bb-editar', id: v });
  A['bb-editar-salvar'] = v => {
    const ui = U(), it = (ui.D.biblioteca || []).find(x => x.id === v); if (!it) return;
    it.titulo = $('#be-titulo').value.trim() || it.titulo; it.autor = $('#be-autor').value.trim(); it.tipo = $('#be-tipo').value; it.url = $('#be-url').value.trim();
    it.tags = $('#be-tags').value.split(',').map(x => x.trim().toLowerCase()).filter(Boolean).slice(0, 8); it.editadoEm = new Date().toISOString();
    ui.salvar(); ui.abrirFolha({ tipo: 'bb-item', id: v }); if (naTela()) telaBiblioteca();
  };
  A['bb-apagar'] = v => {
    const ui = U(), l = ui.D.biblioteca || [], i = l.findIndex(x => x.id === v); if (i < 0) return;
    if (!ui.certeza(`Tirar "${l[i].titulo}" da biblioteca?`)) return;
    const it = l.splice(i, 1)[0]; ui.salvar(); ui.fecharFolha(); if (naTela()) telaBiblioteca();
    if (it.pontos) Arq().apagar(it.pontos.caminho).catch(() => {});
  };
  A['bb-perguntar-item'] = v => { const ui = U(), it = (ui.D.biblioteca || []).find(x => x.id === v); if (!it) return; ui.fecharFolha(); ui.irPara('finn'); const t = $('#chat-texto'); if (t) { t.value = `Sobre "${it.titulo}": `; t.focus(); ui.ajustaAltura(t); } };
  A['bb-kindle-ok'] = () => {
    const ui = U(); if (!ST.kindle) return;
    const r = B.mesclarKindle(ui.D, ST.kindle); ST.kindle = null; ui.salvar(); ui.fecharFolha(); if (naTela()) telaBiblioteca();
    ui.aviso(`${r.grifos} grifo${r.grifos === 1 ? '' : 's'} importado${r.grifos === 1 ? '' : 's'}${r.novos ? ` · ${r.novos} livro${r.novos === 1 ? '' : 's'} novo${r.novos === 1 ? '' : 's'}` : ''}`);
  };
  A['bb-perguntar-tudo'] = async () => { const q = ST.ultimaPergunta; if (!q) return; ST.resposta = { carregando: true }; ST.resposta = await MUI().perguntar(q, 'tudo', '#bb-resp', 'tudo'); };

  document.addEventListener('submit', async ev => {
    if (ev.target.id !== 'bb-form') return;
    ev.preventDefault(); const q = $('#bb-q').value.trim(); if (!q) return;
    ST.ultimaPergunta = q; ST.resposta = { carregando: true };
    ST.resposta = await MUI().perguntar(q, 'biblioteca', '#bb-resp', 'biblioteca');
  });
  document.addEventListener('input', ev => {
    if (ev.target.id === 'bn-entrada') {
      const det = B.detectar(ev.target.value);
      const tp = $('#bn-tipo'); if (tp && det.tipo) tp.value = det.tipo;
      if (det.titulo != null) { const t = $('#bn-titulo'); if (t && !t.dataset.mexeu) t.value = det.titulo; const a = $('#bn-autor'); if (a && !a.dataset.mexeu) a.value = det.autor || ''; }
    }
    if (ev.target.id === 'bn-titulo' || ev.target.id === 'bn-autor') ev.target.dataset.mexeu = '1';
  });
  document.addEventListener('change', async ev => {
    if (ev.target.id !== 'bb-kindle' || !ev.target.files[0]) return;
    const f = ev.target.files[0]; ev.target.value = '';
    try { ST.kindle = B.kindle(await f.text()); U().abrirFolha({ tipo: 'bb-kindle' }); }
    catch (e) { U().aviso('Não consegui ler esse arquivo.', 'erro'); }
  });
  // os pontos-chave ficam num arquivo à parte: abre quando você expande
  document.addEventListener('toggle', async ev => {
    if (ev.target.id !== 'bb-pontos' || !ev.target.open) return;
    const it = (U().D.biblioteca || []).find(x => x.id === ev.target.dataset.v); const el = $('#bb-pontos-txt'); if (!it || !it.pontos || !el) return;
    const t = await Arq().lerTexto(it.pontos.caminho).catch(() => null);
    el.innerHTML = t ? U().markdown(t) : '<p class="muted pequeno">Ainda não chegou neste aparelho. Tente de novo em instantes.</p>';
  }, true);

  EXT.telas.biblioteca = telaBiblioteca;
  window.__biblioteca = { ST, resumir, fecharResposta: () => { ST.resposta = null; const el = $('#bb-resp'); if (el) el.innerHTML = ''; } };
})();
