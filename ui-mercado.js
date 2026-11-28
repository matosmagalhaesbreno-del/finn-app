/* Jarvis Finance — tela Mercado (PC e iPhone).
   Lista de compras, compra planejada, comparação de preços entre os seus mercados, encartes, notas fiscais e gasto do mês.
   No PC também lê os encartes e os sites dos mercados sozinho, atende os pedidos do iPhone e avisa no dia da compra. */
(function () {
  'use strict';
  const F = window.Finn, M = window.Mercado, Mm = window.Memoria;
  const EXT = window.FinnExt = window.FinnExt || {};
  for (const k of ['telas', 'folhas', 'acoes', 'titulos', 'icones']) EXT[k] = EXT[k] || {};
  for (const k of ['aoIniciar', 'antesDeSalvar', 'alertas', 'aoMudar', 'ajustes', 'cartoesHoje', 'prioridades']) EXT[k] = EXT[k] || [];
  const U = () => window.__ui;
  const $ = (s, r = document) => r.querySelector(s);
  const esc = s => F.esc(s);
  const { dinheiro } = F;

  Object.assign(EXT.icones, {
    pin: '<path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.4"/>',
    loja: '<path d="M4 9.5 5.5 4h13L20 9.5"/><path d="M4 9.5a2.7 2.7 0 0 0 5.3 0 2.7 2.7 0 0 0 5.4 0 2.7 2.7 0 0 0 5.3 0"/><path d="M5.5 11.5V20h13v-8.5M10 20v-5h4v5"/>',
    qrcode: '<rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><path d="M14 14h2.5v2.5H14zM18 18h2v2h-2zM14 18.5h1.5M18.5 14H20"/>',
    divide: '<path d="M12 20v-7.5L6.5 7M12 12.5 17.5 7M4.5 4.5H9v4.5M19.5 4.5H15v4.5"/>',
    tendencia: '<path d="M3.5 17 9 11.5l3.5 3.5 8-8"/><path d="M15 7h5.5v5.5"/>',
    folheto: '<path d="M6 3.5h9l3.5 3.5v13.5H6z"/><path d="M14.5 3.5V7.5h4M9 11h6.5M9 14.5h6.5M9 18h4"/>',
    balanca: '<path d="M12 4v16M7.5 20h9M5 7.5h14M12 5.5 5 7.5M12 5.5l7 2"/><path d="M5 7.5 2.5 13a2.6 2.6 0 0 0 5 0zM19 7.5 16.5 13a2.6 2.6 0 0 0 5 0z"/>',
  });
  EXT.titulos.mercado = 'Mercado';

  const ST = { data: null, redes: null, res: null, analise: null, ocupado: {}, perto: null, pertoMsg: '', alvoNota: null };
  const cfg = () => M.cfg(U().D);
  const naTela = () => U() && U().M.tela === 'mercado' && !U().M.folha;
  const redesenhar = () => { if (naTela()) { const t = $('#tela'), y = t ? t.scrollTop : 0; telaMercado(); if (t) t.scrollTop = y; } };
  const perfilPronto = () => { const ui = U(); if (ui.PC || !ui.N.ligada() || ui.N.ultima) return true; ui.aviso('Espere o Jarvis terminar de sincronizar e tente de novo.'); return false; };
  const ponto = rede => `<span class="mc-ponto" style="--c:${esc(M.info(U().D, rede).cor)}"></span>`;
  const nomeR = rede => M.info(U().D, rede).nome;
  const curto = rede => M.info(U().D, rede).curto;
  const dataCurta = iso => F.dataBR(iso).slice(0, 5);
  // "COMERCIAL SACOLAO SAO PEDRO LTDA" → "Sacolao Sao Pedro"
  const nomeLoja = t => { const s = String(t || '').replace(/\b(LTDA|S\/?A|EIRELI|ME|EPP|COMERCIAL|COMERCIO|DE ALIMENTOS|DISTRIBUIDORA|IND(USTRIA)?|E)\b\.?/gi, ' ').replace(/\s+/g, ' ').trim(); return s.toLowerCase().replace(/(^|\s)\S/g, c => c.toUpperCase()).slice(0, 40) || 'Mercado'; };
  const horaDe = iso => { const d = new Date(iso); return isNaN(d) ? '' : d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }); };
  const quandoFoi = iso => { if (!iso) return ''; const dd = F.difDias(String(iso).slice(0, 10), F.hoje()); return dd === 0 ? 'hoje ' + horaDe(iso) : dd === 1 ? 'ontem ' + horaDe(iso) : dataCurta(String(iso).slice(0, 10)); };
  const proxDiaSemana = n => { const d = new Date(F.hoje() + 'T12:00:00'); d.setDate(d.getDate() + ((n - d.getDay() + 7) % 7 || 7)); return F.isoDe ? F.isoDe(d) : d.toISOString().slice(0, 10); };

  function redesSel() {
    const meus = M.meusMercados(U().D).map(m => m.rede);
    if (!ST.redes) { const ida = M.proximaIda(U().D); ST.redes = (ida && ida.redes && ida.redes.length ? ida.redes : meus.slice(0, 4)); }
    ST.redes = ST.redes.filter(r => meus.includes(r));
    return ST.redes;
  }
  function dataSel() {
    if (!ST.data) { const ida = M.proximaIda(U().D); ST.data = ida ? ida.data : F.hoje(); }
    if (ST.data < F.hoje()) ST.data = F.hoje();
    return ST.data;
  }
  function calcular() {
    const ui = U(); ST.res = M.comparar(ui.D, { data: dataSel(), redes: redesSel() }); return ST.res;
  }

  /* ---------- cartões ---------- */
  function cardCompra() {
    const ui = U(), D = ui.D, meus = M.meusMercados(D), data = dataSel(), sel = redesSel(), c = cfg();
    const ida = (D.idas || []).find(i => i.data === data && i.status !== 'feita');
    const sab = proxDiaSemana(6), opDatas = [[F.hoje(), 'Hoje'], [F.addDias(F.hoje(), 1), 'Amanhã']];
    if (!opDatas.some(o => o[0] === sab)) opDatas.push([sab, 'Sábado']);
    const pedido = (D.pedidosMercado || []).filter(p => p.tipo === 'atualizar').sort((a, b) => String(b.criado).localeCompare(String(a.criado)))[0];
    const statusPedido = !ui.PC && pedido && F.difDias(String(pedido.criado).slice(0, 10), F.hoje()) <= 1 ? `<p class="muted pequeno">${pedido.status === 'novo' ? `Pedido ao computador enviado ${horaDe(pedido.criado)} — os preços chegam em 1 ou 2 minutos se ele estiver ligado.` : pedido.status === 'feito' ? `O computador atualizou os preços ${quandoFoi(pedido.feitoEm)}.` : `O computador não conseguiu: ${esc(pedido.erro || 'erro')}`}</p>` : '';
    if (!meus.length) return `<section class="card largo mc-compra"><div class="rot">${ui.ic('carrinho')} Próxima compra</div>
      <p>Primeiro escolha os mercados onde você costuma comprar. O Jarvis acha os que ficam perto da sua casa pelo CEP.</p>
      <div class="linha-btn"><button class="btn pri" data-acao="mc-perto">${ui.ic('pin')} Mercados perto de casa</button><button class="btn" data-acao="mc-add-mercado">Escolher da lista</button></div></section>`;
    const ocup = ST.ocupado.atualizar;
    return `<section class="card largo mc-compra"><div class="rot">${ui.ic('carrinho')} Próxima compra${c.ultimaAtualizacao ? `<span class="dica">preços de ${esc(quandoFoi(c.ultimaAtualizacao))}</span>` : ''}</div>
      <div class="mc-linha"><span class="mc-rot">Quando</span><div class="chips">${opDatas.map(([d, n]) => `<button class="chip ${data === d ? 'on' : ''}" data-acao="mc-data" data-v="${d}">${n}${n === 'Sábado' ? ` <em>${dataCurta(d)}</em>` : ''}</button>`).join('')}<label class="chip mc-outro-dia ${opDatas.some(o => o[0] === data) ? '' : 'on'}">${opDatas.some(o => o[0] === data) ? 'Outro dia' : esc(dataCurta(data))}<input type="date" id="mc-dia" min="${F.hoje()}" value="${data}" aria-label="Escolher o dia da compra"></label></div></div>
      <div class="mc-linha"><span class="mc-rot">Onde</span><div class="chips">${meus.map(m => `<button class="chip ${sel.includes(m.rede) ? 'on' : ''}" data-acao="mc-rede" data-v="${esc(m.rede)}" aria-pressed="${sel.includes(m.rede)}">${ponto(m.rede)}${esc(curto(m.rede))}</button>`).join('')}<button class="chip mc-chip-mais" data-acao="mc-mercados" aria-label="Meus mercados">${ui.ic('mais')}</button></div></div>
      <div class="linha-btn"><button class="btn pri" data-acao="mc-comparar" ${sel.length ? '' : 'disabled'}>${ui.ic('balanca')} Comparar preços</button>
        <button class="btn" data-acao="mc-atualizar" ${ocup ? 'disabled' : ''}>${ocup ? '<span class="giro"></span> Atualizando…' : ui.ic('atualizar') + ' Atualizar preços'}</button>
        ${ida && ida.data <= F.hoje() ? `<button class="btn link" data-acao="mc-concluir" data-v="${ida.id}">${ui.ic('check')} Já fiz a compra</button>` : ''}</div>
      ${ida ? `<p class="muted pequeno mc-planejada">${ui.ic('calendario')} Compra planejada para ${esc(M.quandoTxt(ida.data))} (${dataCurta(ida.data)}).${ui.PC && c.avisar ? ` No dia, às ${esc(c.hora)}, o Jarvis atualiza os preços e te avisa.` : ''}</p>` : ''}
      ${ocup ? `<div class="progresso"><span class="giro"></span>${esc(ST.ocupado.atualizarMsg || 'Lendo os preços…')}</div>` : ''}${statusPedido}</section>`;
  }
  function celula(l, rede, melhorR) {
    const x = l.por[rede]; if (!x) return `<td class="mc-sem">—</td>`;
    const tag = x.o.fonte === 'encarte' ? 'enc' : x.o.fonte === 'online' ? 'site' : x.o.fonte === 'nota' ? 'nota' : x.o.fonte === 'web' ? 'web' : 'visto';
    return `<td class="${melhorR === rede && !l.empate ? 'mc-melhor' : ''}"><button class="mc-cel" data-acao="mc-celula" data-v="${esc(l.item.id)}" data-rede="${esc(rede)}"><b>${dinheiro(x.custo)}${x.difTam ? '<sup>*</sup>' : ''}</b><small class="mc-f-${tag}">${esc(M.FONTES[x.o.fonte])}${x.o.condicao ? ' · ' + esc(x.o.condicao) : ''}</small></button></td>`;
  }
  function cardComparacao() {
    const ui = U(), r = ST.res; if (!r) return '';
    const cols = r.redes.filter(x => r.porRede.find(p => p.rede === x).cobertos > 0);
    const linhas = r.linhas.slice().sort((a, b) => (Object.keys(b.por).length > 0) - (Object.keys(a.por).length > 0));
    const tot = id => { const p = r.porRede.find(x => x.rede === id); return p; };
    const cab = `<div class="rot">${ui.ic('balanca')} Onde comprar ${esc(M.quandoTxt(r.data))}<span class="rot-acoes"><button class="redondo peq" data-acao="mc-comparar" aria-label="Calcular de novo" title="Calcular de novo">${ui.ic('atualizar')}</button></span></div>`;
    if (!r.linhas.length) return `<section class="card largo mc-comp">${cab}<p class="muted">Sua lista está vazia. Adicione os itens em “Lista de compras”.</p></section>`;
    const tabela = cols.length ? `<div class="mc-tabela-caixa"><table class="mc-tabela"><thead><tr><th>Item</th>${cols.map(id => `<th>${ponto(id)}${esc(curto(id))}</th>`).join('')}</tr></thead>
      <tbody>${linhas.map(l => `<tr><th><span>${esc(l.item.nome)}</span><small>${esc([l.item.qtd > 1 ? l.item.qtd + '×' : '', l.item.tam ? M.fmtTam(l.item.tam) : (l.tamRef ? M.fmtTam(l.tamRef) : '')].filter(Boolean).join(' '))}</small></th>${cols.map(id => celula(l, id, l.melhor)).join('')}</tr>`).join('')}</tbody>
      <tfoot><tr><th>Itens com preço</th>${cols.map(id => `<td>${tot(id).cobertos} de ${r.linhas.length}</td>`).join('')}</tr>
      ${r.base === 'comuns' ? `<tr class="mc-tot"><th>Nos ${r.comuns} em comum</th>${cols.map(id => `<td class="${id === r.melhor ? 'mc-melhor' : ''}">${r.totaisComuns[id] != null ? `<b>${dinheiro(r.totaisComuns[id])}</b>` : '—'}</td>`).join('')}</tr>` : ''}
      <tr><th>Mais barato em</th>${cols.map(id => `<td>${tot(id).vence}</td>`).join('')}</tr></tfoot></table></div>` : '';
    const div = r.dividir ? `<div class="mc-dividir">${ui.ic('divide')}<div><b>Dividindo com o ${esc(nomeR(r.dividir.outra))}: mais ${dinheiro(r.dividir.economia)}</b><p>${r.dividir.mover.map(m => `${esc(m.item.nome)} (−${dinheiro(m.economia)})`).join(' · ')}</p></div></div>` : '';
    return `<section class="card largo mc-comp">${cab}
      <div class="mc-reco">${ui.markdown(r.texto)}</div>${div}${tabela}
      ${r.avisos.length ? `<ul class="mc-avisos">${r.avisos.map(a => `<li>${esc(a)}</li>`).join('')}</ul>` : ''}
      ${cols.length ? `<p class="muted pequeno">Toque num preço para ver o produto e a origem. ${r.linhas.some(l => Object.values(l.por).some(x => x.difTam)) ? '* tamanho diferente, comparado pelo preço por kg/L/unidade.' : ''}</p>` : ''}
      ${r.semPreco.length ? `<div class="linha-btn"><button class="btn" data-acao="mc-encarte">${ui.ic('folheto')} Ler encarte</button><button class="btn" data-acao="mc-preco">${ui.ic('etiqueta')} Anotar preço</button>${ui.M.iaOk ? `<button class="btn" data-acao="mc-web" ${ST.ocupado.web ? 'disabled' : ''}>${ST.ocupado.web ? '<span class="giro"></span> Procurando…' : ui.ic('globo') + ' Procurar na web'}</button>` : ''}</div>` : ''}
      ${ST.analise ? `<div class="mc-analise">${ui.ic('finn')}<div>${ui.markdown(ST.analise)}</div></div>` : (ui.M.iaOk && r.ativas.length >= 2 ? `<button class="btn link" data-acao="mc-analise" ${ST.ocupado.analise ? 'disabled' : ''}>${ST.ocupado.analise ? '<span class="giro"></span> O Jarvis está analisando…' : ui.ic('finn') + ' Análise do Jarvis'}</button>` : '')}</section>`;
  }
  function cardLista() {
    const ui = U(), D = ui.D, todos = (D.compras || []).filter(i => !i.arquivado);
    const ativos = todos.filter(i => !i.pular).length;
    const sug = M.sugestoes(D);
    const linha = i => {
      const rt = M.ritmo(D, i);
      const sub = [i.tam ? M.fmtTam(i.tam) : '', i.marca ? 'marca ' + i.marca : '', rt && rt.acabando ? 'deve estar acabando' : rt && rt.intervalo ? `compra a cada ~${rt.intervalo} dias` : '', !i.fixo ? 'só desta vez' : ''].filter(Boolean).join(' · ');
      return `<div class="tf-linha mc-item ${i.pular ? 'feita' : ''}"><button class="tf-check" data-acao="mc-pular" data-v="${esc(i.id)}" aria-label="${i.pular ? 'Pôr de volta nesta compra' : 'Já tenho (tirar desta compra)'}" title="${i.pular ? 'Pôr de volta' : 'Já tenho'}">${ui.ic(i.pular ? 'tarefa' : 'caixa')}</button>
        <button class="tf-txt" data-acao="mc-item" data-v="${esc(i.id)}"><b>${i.qtd > 1 ? i.qtd + '× ' : ''}${esc(i.nome)}</b>${sub ? `<small class="${rt && rt.acabando ? 'mc-acabando' : ''}">${esc(sub)}</small>` : ''}</button></div>`;
    };
    return `<section class="card mc-lista"><div class="rot">${ui.ic('lista')} Lista de compras<span class="dica">${ativos} ite${ativos === 1 ? 'm' : 'ns'}</span></div>
      <form class="tf-add" id="mc-add"><input id="mc-add-txt" placeholder="Ex.: 2 leite integral 1L" autocomplete="off" enterkeyhint="done" aria-label="Novo item da lista"><button class="redondo" type="submit" aria-label="Adicionar">${ui.ic('mais')}</button></form>
      <div class="tf-lista">${todos.map(linha).join('') || '<p class="muted pequeno">Escreva o que você compra sempre: arroz 5kg, feijão 1kg, café 500g… O círculo tira o item só desta compra.</p>'}</div>
      ${sug.length ? `<div class="mc-sug"><small>Você costuma comprar</small><div class="chips">${sug.map((s, k) => `<button class="chip" data-acao="mc-sug" data-v="${k}">${ui.ic('mais')} ${esc(s.nome)}${s.intervalo ? ` <em>a cada ${s.intervalo} d</em>` : ''}</button>`).join('')}</div></div>` : ''}</section>`;
  }
  function cardAlertas() {
    const ui = U(), al = M.alertas(ui.D);
    if (!al.length) return '';
    return `<section class="card alertas mc-alertas"><div class="rot">${ui.ic('tendencia')} Preços que mudaram<span class="dica">${al.length}</span></div>${al.slice(0, 6).map(a => `<div class="alerta n-${a.nivel}">${ui.ic(a.tipo === 'subiu' ? 'tendencia' : 'etiqueta')}<div><b>${esc(a.titulo)}</b><p>${esc(a.texto)}</p></div></div>`).join('')}</section>`;
  }
  function cardEncartes() {
    const ui = U(), D = ui.D, hj = F.hoje();
    const vale = (D.encartes || []).filter(e => !e.validoAte || e.validoAte >= hj).sort((a, b) => String(b.lidoEm).localeCompare(String(a.lidoEm)));
    const fila = (D.pedidosMercado || []).filter(p => p.tipo === 'encarte' && p.status === 'novo');
    return `<section class="card mc-encartes"><div class="rot">${ui.ic('folheto')} Encartes da semana</div>
      ${vale.length ? `<div class="lista-simples">${vale.slice(0, 6).map(e => `<div class="ls-linha">${ponto(e.rede)}<div class="ls-txt"><b>${esc(nomeR(e.rede))}</b><small>${e.n} ofertas · ${e.semValidade ? 'sem validade no encarte' : 'até ' + dataCurta(e.validoAte)} · lido ${esc(quandoFoi(e.lidoEm))}</small></div></div>`).join('')}</div>` : '<p class="muted pequeno">Mande o print ou o PDF do encarte (do WhatsApp, Instagram ou app do mercado) ou cole o link: a IA lê cada oferta com preço e validade.</p>'}
      ${fila.length ? `<p class="muted pequeno">${fila.length} link${fila.length > 1 ? 's' : ''} na fila do computador.</p>` : ''}
      <div class="linha-btn"><button class="btn" data-acao="mc-encarte">${ui.ic('camera')} Ler encarte</button></div></section>`;
  }
  function cardNotas() {
    const ui = U(), D = ui.D;
    const ns = (D.notasFiscais || []).slice().sort((a, b) => String(b.data).localeCompare(String(a.data)));
    const fila = (D.pedidosMercado || []).filter(p => p.tipo === 'nota' && p.status === 'novo');
    const erro = (D.pedidosMercado || []).filter(p => p.tipo === 'nota' && p.status === 'erro' && F.difDias(String(p.criado).slice(0, 10), F.hoje()) <= 2);
    return `<section class="card mc-notas"><div class="rot">${ui.ic('recibo')} Notas fiscais</div>
      ${ns.length ? `<div class="lista-simples">${ns.slice(0, 5).map(n => `<button class="ls-linha" data-acao="mc-nota-ver" data-v="${esc(n.id)}">${n.rede ? ponto(n.rede) : ui.ic('alerta')}<div class="ls-txt"><b>${esc(n.rede ? nomeR(n.rede) : 'Escolha o mercado')}</b><small>${dataCurta(String(n.data).slice(0, 10))} · ${n.n} itens</small></div><b class="pequeno-val">${dinheiro(n.total)}</b></button>`).join('')}</div>` : '<p class="muted pequeno">Escaneie o QR Code do cupom: o Jarvis guarda o preço de cada item que você pagou e avisa quando algo subir.</p>'}
      ${fila.length ? `<p class="muted pequeno">${fila.length} nota${fila.length > 1 ? 's' : ''} na fila do computador.</p>` : ''}${erro.map(p => `<p class="erro-msg">${esc(p.erro)}</p>`).join('')}
      <div class="linha-btn"><button class="btn" data-acao="mc-nota">${ui.ic('qrcode')} Escanear nota</button></div></section>`;
  }
  function cardGasto() {
    const ui = U(), g = M.gastoMes(ui.D), ym = F.hoje().slice(0, 7);
    const pct = g.orcamento ? Math.round(g.gasto / g.orcamento * 100) : null;
    return `<section class="card mc-gasto"><div class="rot">${ui.ic('moeda')} Mercado em ${esc(F.nomeMes(ym).toLowerCase())}</div>
      <div class="linha-valor forte"><span>Gasto até agora</span><b>${dinheiro(g.gasto)}</b></div>
      ${g.orcamento ? `<div class="barra-uso ${pct >= 100 ? 'passou' : pct >= 85 ? 'quase' : ''}"><i style="width:${Math.min(100, pct)}%"></i></div><p class="muted pequeno">${pct}% de ${dinheiro(g.orcamento)} · ${g.orcamento - g.gasto >= 0 ? 'sobram ' + dinheiro(g.orcamento - g.gasto) : 'passou ' + dinheiro(g.gasto - g.orcamento)}</p>` : `<button class="btn link" data-acao="mc-orcamento">Definir quanto quer gastar por mês</button>`}
      ${g.porRede.length ? `<div class="mc-redes-gasto">${g.porRede.slice(0, 4).map(x => `<div class="linha-valor"><span>${x.rede === 'outros' ? 'Outros' : ponto(x.rede) + esc(nomeR(x.rede))}</span><b class="pequeno-val">${dinheiro(x.valor)}</b></div>`).join('')}</div>` : '<p class="muted pequeno">Ainda não há compras de mercado neste mês nos seus bancos.</p>'}
      ${g.orcamento ? `<button class="btn link" data-acao="mc-orcamento">Mudar o limite</button>` : ''}</section>`;
  }
  function cardMercados() {
    const ui = U(), D = ui.D, meus = M.meusMercados(D), c = cfg();
    return `<section class="card mc-mercados"><div class="rot">${ui.ic('loja')} Meus mercados${c.bairro ? `<span class="dica">${esc(c.bairro)}</span>` : ''}</div>
      ${meus.length ? `<div class="lista-simples">${meus.map(m => { const i = M.info(D, m.rede); const fontes = [i.encarte ? 'encarte automático' : '', i.site ? 'site' : ''].filter(Boolean).join(' · '); return `<button class="ls-linha" data-acao="mc-mercado" data-v="${esc(m.rede)}">${ponto(m.rede)}<div class="ls-txt"><b>${esc(i.nome)}</b><small>${esc([m.dist != null ? M.fmtDist(m.dist) + ' de casa' : '', fontes].filter(Boolean).join(' · ') || 'encartes e notas')}</small></div>${ui.ic('dir', 'seta')}</button>`; }).join('')}</div>` : ''}
      <div class="linha-btn"><button class="btn" data-acao="mc-perto">${ui.ic('pin')} Perto de casa</button><button class="btn" data-acao="mc-add-mercado">${ui.ic('mais')} Adicionar</button></div></section>`;
  }
  function telaMercado() {
    const ui = U();
    if (ST.res && ST.res.data !== dataSel()) ST.res = null;
    if (!ST.res && (ui.D.compras || []).length && M.meusMercados(ui.D).length) calcular();
    $('#tela').innerHTML = `<div class="mercado"><div class="grade mercado-grade">${cardCompra()}${cardComparacao()}${cardLista()}${cardAlertas()}${cardEncartes()}${cardNotas()}${cardGasto()}${cardMercados()}</div></div>`;
  }

  /* ---------- PC e iPhone: atualizar preços ---------- */
  const termoDe = i => [i.nome, i.marca].filter(Boolean).join(' ').replace(/\b(tipo\s*1)\b/i, '').trim();
  async function lerOnline(rede) {
    const ui = U(), D = ui.D, i = M.info(D, rede), c = cfg();
    if (!i.site && !i.busca) return 0;
    const itens = M.itensAtivos(D); if (!itens.length) return 0;
    const r = await window.api.mercadoOnline({ site: i.site, busca: i.busca, termos: itens.map(termoDe), cep: c.cep });
    const obs = [];
    for (const it of itens) {
      const achados = (r.termos[termoDe(it)] || []).map(p => ({ p, s: M.casar(it, p.produto, p.marca) })).filter(x => x.s > 0).sort((a, b) => b.s - a.s || a.p.preco - b.p.preco).slice(0, 3);
      for (const { p } of achados) obs.push(M.novaObs({ rede, produto: p.produto, marca: p.marca, tamanho: p.tamanho, preco: p.preco, de: p.de, fonte: 'online', url: p.url }));
    }
    const m = (D.mercados || []).find(x => x.rede === rede); if (m) { m.siteModo = r.modo; m.siteLido = new Date().toISOString(); m.siteErro = null; }
    return M.aplicarSite(D, rede, obs);
  }
  async function encarteDeLink(url, rede, { silencioso = false } = {}) {
    const ui = U();
    const pg = await window.api.mercadoEncarte(url);
    const partes = pg.pdf ? [[{ inlineData: { mimeType: 'application/pdf', data: b64(pg.pdf) } }]] : lotes(await Promise.all(pg.imagens.map(im => reduzirB64(im.b64, im.mime))));
    const extra = pg.texto ? [{ text: 'Texto da página do encarte (ajuda a achar a validade): ' + pg.texto.slice(0, 1500) }] : [];
    const r = await lerComIA(partes, rede, { origem: 'link', url, extra });
    if (!silencioso) ui.aviso(`${r.ofertas.length} ofertas do ${nomeR(r.encarte.rede)}`);
    return r;
  }
  async function atualizarPC({ redes = null, motivo = 'manual' } = {}) {
    const ui = U(); if (!ui.PC) return null;
    const D = ui.D, lista = redes && redes.length ? redes : M.meusMercados(D).map(m => m.rede);
    const rel = { encartes: 0, online: 0, erros: [] };
    for (const rede of lista) {
      const i = M.info(D, rede);
      if (i.encarte && ui.M.iaOk) {
        const ult = (D.encartes || []).filter(e => e.url && e.rede === rede && e.origem === 'link').sort((a, b) => String(b.lidoEm).localeCompare(String(a.lidoEm)))[0];
        if (!ult || (Date.now() - new Date(ult.lidoEm)) > 20 * 3600e3 || motivo === 'manual') {
          ST.ocupado.atualizarMsg = `Lendo o encarte do ${i.nome}…`; redesenhar();
          try { await encarteDeLink(i.encarte, rede, { silencioso: true }); rel.encartes++; } catch (e) { rel.erros.push(`${i.nome}: ${e.message}`); }
        }
      }
      if (i.site || i.busca) {
        ST.ocupado.atualizarMsg = `Consultando o site do ${i.nome}…`; redesenhar();
        try { rel.online += await lerOnline(rede); } catch (e) { rel.erros.push(`${i.nome}: ${e.message}`); const m = (D.mercados || []).find(x => x.rede === rede); if (m) m.siteErro = e.message; }
      }
    }
    M.salvarCfg(D, { ultimaAtualizacao: new Date().toISOString() });
    guardarResultadoIda();
    ui.salvar();
    return rel;
  }
  function guardarResultadoIda() {
    const D = U().D, ida = M.proximaIda(D); if (!ida) return null;
    const r = M.comparar(D, { data: ida.data, redes: ida.redes });
    ida.resultado = M.resumoGuardado(D, r);
    if (ST.res && ST.res.data === ida.data) ST.res = r;
    return r;
  }

  /* ---------- IA: encartes, notas pela foto ---------- */
  const b64 = bytes => { let s = ''; const u = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes); for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s); };
  async function reduzir(blob, max = 2000) {
    try {
      const bmp = await createImageBitmap(blob);
      const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
      if (k >= 1 && blob.size < 2.5e6 && /jpe?g|png|webp/.test(blob.type)) { bmp.close && bmp.close(); return { inlineData: { mimeType: blob.type, data: b64(new Uint8Array(await blob.arrayBuffer())) } }; }
      const cv = document.createElement('canvas'); cv.width = Math.round(bmp.width * k); cv.height = Math.round(bmp.height * k);
      cv.getContext('2d').drawImage(bmp, 0, 0, cv.width, cv.height); bmp.close && bmp.close();
      const out = await new Promise(r => cv.toBlob(r, 'image/jpeg', 0.86));
      return { inlineData: { mimeType: 'image/jpeg', data: b64(new Uint8Array(await out.arrayBuffer())) } };
    } catch { return { inlineData: { mimeType: blob.type || 'image/jpeg', data: b64(new Uint8Array(await blob.arrayBuffer())) } }; }
  }
  const reduzirB64 = async (data, mime) => reduzir(new Blob([Uint8Array.from(atob(data), ch => ch.charCodeAt(0))], { type: mime || 'image/jpeg' }));
  const lotes = (partes, n = 4) => { const out = []; for (let i = 0; i < partes.length; i += n) out.push(partes.slice(i, i + n)); return out; };
  async function lerComIA(lotesPartes, rede, { origem = 'foto', url = '', extra = [] } = {}) {
    const ui = U(); if (!ui.M.iaOk) throw new Error('Configure a IA em Ajustes para ler encartes.');
    const data = F.hoje(); let junto = { rede: '', validade_inicio: null, validade_fim: null, ofertas: [] };
    for (const partes of lotesPartes) {
      const j = await Mm.pedirJSON(ui.A, [{ text: M.promptEncarte({ rede: rede ? nomeR(rede) : '', data }) }, ...extra, ...partes], { temperatura: 0.1, max: 16384 });
      junto.rede = junto.rede || j.rede || ''; junto.validade_inicio = junto.validade_inicio || j.validade_inicio || null; junto.validade_fim = junto.validade_fim || j.validade_fim || null;
      junto.ofertas.push(...(j.ofertas || []));
    }
    const ref = url ? 'ec-' + M.slug(rede || junto.rede || 'x') + '-' + Math.abs([...url].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) | 0, 0)) : null;
    const r = M.ofertasDoEncarte(ui.D, junto, { rede, data, origem, url, ref });
    if (!rede && r.encarte.rede && !(ui.D.mercados || []).some(m => m.rede === r.encarte.rede)) M.adicionarMercado(ui.D, { rede: r.encarte.rede });
    guardarResultadoIda(); ST.res = null; ui.salvar();
    return r;
  }
  async function partesDeArquivos(files) {
    const pdfs = [], imgs = [];
    for (const f of files) {
      if (f.type === 'application/pdf' || /\.pdf$/i.test(f.name)) { if (f.size > 18e6) throw new Error('PDF grande demais (máx. 18 MB).'); pdfs.push([{ inlineData: { mimeType: 'application/pdf', data: b64(new Uint8Array(await f.arrayBuffer())) } }]); }
      else if (/^image\//.test(f.type) || /\.(jpe?g|png|webp|heic)$/i.test(f.name)) imgs.push(await reduzir(f));
    }
    return [...pdfs, ...lotes(imgs)];
  }

  /* ---------- notas fiscais ---------- */
  async function carregarJsQR() {
    if (window.jsQR) return;
    await new Promise((ok, falha) => { const s = document.createElement('script'); s.src = 'jsQR.js'; s.onload = ok; s.onerror = falha; document.head.appendChild(s); });
  }
  async function qrDaImagem(file) {
    try { await carregarJsQR(); } catch { return null; }
    let bmp; try { bmp = await createImageBitmap(file); } catch { return null; }
    for (const max of [1400, 2200, 900, 3000]) {
      const k = Math.min(1, max / Math.max(bmp.width, bmp.height)), w = Math.round(bmp.width * k), h = Math.round(bmp.height * k);
      const cv = document.createElement('canvas'); cv.width = w; cv.height = h; const cx = cv.getContext('2d', { willReadFrequently: true });
      cx.drawImage(bmp, 0, 0, w, h);
      const q = window.jsQR(cx.getImageData(0, 0, w, h).data, w, h, { inversionAttempts: 'attemptBoth' });
      if (q && q.data) { bmp.close && bmp.close(); return q.data.trim(); }
      if (k >= 1) break;
    }
    bmp.close && bmp.close(); return null;
  }
  async function notaDeLink(url) { // só no PC
    const ui = U();
    const n = await window.api.mercadoNota(url);
    let r;
    if (n.itens && n.itens.length) r = M.aplicarNota(ui.D, n, { origem: 'qr' });
    else {
      if (!ui.M.iaOk) throw new Error('A página da nota veio sem a lista de itens. Ligue a IA em Ajustes para o Jarvis ler o texto da nota.');
      const j = await M.lerNotaIA({ A: ui.A, partes: [{ text: 'Texto da página da nota: ' + n.texto }] });
      r = M.aplicarNota(ui.D, { ...j, chave: n.chave || j.chave }, { origem: 'qr' });
    }
    if (!r.repetida) { guardarResultadoIda(); ST.res = null; }
    ui.salvar();
    return r;
  }
  async function processarPedidos() {
    const ui = U(); if (!ui || !ui.PC || ST.ocupado.pedidos) return;
    const fila = (ui.D.pedidosMercado || []).filter(p => p.status === 'novo');
    if (!fila.length) return;
    ST.ocupado.pedidos = true;
    try {
      for (const p of fila) {
        try {
          if (p.tipo === 'atualizar') { const rel = await atualizarPC({ redes: p.redes, motivo: 'celular' }); p.resumo = rel ? `${rel.encartes} encarte(s), ${rel.online} preço(s) de site${rel.erros.length ? '; ' + rel.erros.join('; ') : ''}` : ''; }
          else if (p.tipo === 'nota') { const r = await notaDeLink(p.url); p.resumo = r.repetida ? 'nota já lida' : `${r.nota.n} itens`; }
          else if (p.tipo === 'encarte') { const r = await encarteDeLink(p.url, p.rede || null, { silencioso: true }); p.resumo = `${r.ofertas.length} ofertas`; }
          p.status = 'feito'; p.feitoEm = new Date().toISOString();
        } catch (e) { p.status = 'erro'; p.erro = e.message; p.feitoEm = new Date().toISOString(); }
        p.url = null; // o link da nota não fica guardado
        ui.salvar();
      }
    } finally { ST.ocupado.pedidos = false; ST.ocupado.atualizar = false; redesenhar(); }
  }
  async function checarIdas() {
    const ui = U(); if (!ui || !ui.PC) return;
    const c = cfg(); if (!c.avisar) return;
    const agora = new Date(), hh = agora.toTimeString().slice(0, 5), hj = F.hoje(), am = F.addDias(hj, 1);
    for (const ida of (ui.D.idas || []).filter(i => i.status !== 'feita' && (i.data === hj || i.data === am))) {
      const momento = ida.data === hj ? 'dia' : 'vespera';
      if (momento === 'dia' && hh < c.hora) continue;
      if (momento === 'vespera' && (!c.vespera || hh < '19:00')) continue;
      const k = `jarvis-ida-${ida.id}-${momento}`; if (localStorage.getItem(k)) continue;
      localStorage.setItem(k, '1');
      if (!c.ultimaAtualizacao || Date.now() - new Date(c.ultimaAtualizacao) > 6 * 3600e3) { try { await atualizarPC({ redes: ida.redes, motivo: 'auto' }); } catch (e) { console.warn(e); } }
      const r = M.comparar(ui.D, { data: ida.data, redes: ida.redes });
      ida.resultado = M.resumoGuardado(ui.D, r); ida.avisadoEm = new Date().toISOString(); ui.salvar();
      window.api.notificar(momento === 'dia' ? 'Compra de hoje' : 'Compra de amanhã', M.frase(ui.D, r).slice(0, 220), 'mercado');
      if (naTela()) { ST.res = null; redesenhar(); }
    }
  }
  async function encartesAutomaticos() { // a cada poucos dias, relê os encartes com link (um por vez)
    const ui = U(); if (!ui || !ui.PC || !ui.M.iaOk || ST.ocupado.atualizar || ST.ocupado.pedidos) return;
    for (const m of M.meusMercados(ui.D)) {
      const i = M.info(ui.D, m.rede); if (!i.encarte) continue;
      const ult = (ui.D.encartes || []).filter(e => e.rede === m.rede && e.origem === 'link').sort((a, b) => String(b.lidoEm).localeCompare(String(a.lidoEm)))[0];
      const venceu = ult && ult.validoAte && ult.validoAte < F.hoje();
      if (ult && !venceu && Date.now() - new Date(ult.lidoEm) < 3 * 864e5) continue;
      if (m.encarteFalhouEm && Date.now() - new Date(m.encarteFalhouEm) < 864e5) continue;
      try { await encarteDeLink(i.encarte, m.rede, { silencioso: true }); m.encarteFalhouEm = null; ui.salvar(); }
      catch (e) { m.encarteFalhouEm = new Date().toISOString(); m.encarteErro = e.message; ui.salvar(); }
      redesenhar();
      return;
    }
  }

  /* ---------- folhas ---------- */
  const cab = t => `<div class="folha-cab"><h3>${esc(t)}</h3><button class="redondo" data-acao="fechar" aria-label="Fechar">${U().ic('fechar')}</button></div>`;
  const opcoesRede = (sel, incluirTodas = false) => { const D = U().D; const meus = M.meusMercados(D).map(m => m.rede); const outras = M.REDES.map(r => r.id).filter(r => !meus.includes(r)); return `${incluirTodas ? '<option value="">Descobrir pelo encarte</option>' : ''}<optgroup label="Meus mercados">${meus.map(r => `<option value="${esc(r)}" ${sel === r ? 'selected' : ''}>${esc(nomeR(r))}</option>`).join('')}</optgroup><optgroup label="Outros">${outras.map(r => `<option value="${r}" ${sel === r ? 'selected' : ''}>${esc(M.REDE[r].nome)}</option>`).join('')}</optgroup>`; };
  EXT.folhas['mc-item'] = f => {
    const i = (U().D.compras || []).find(x => x.id === f.id); if (!i) return null;
    return `${cab('Item da lista')}<label class="campo-rot">Item<input id="mi-nome" value="${esc(i.nome)}" autocomplete="off"></label>
      <div class="dois-campos"><label class="campo-rot">Tamanho<input id="mi-tam" value="${esc(i.tam ? M.fmtTam(i.tam) : '')}" placeholder="5 kg, 1 L, 12 rolos" autocomplete="off"></label><label class="campo-rot">Quantidade<input id="mi-qtd" inputmode="numeric" value="${i.qtd}"></label></div>
      <label class="campo-rot">Marca preferida (opcional)<input id="mi-marca" value="${esc(i.marca || '')}" placeholder="Ex.: Tio João" autocomplete="off"></label>
      <label class="chk-linha"><input type="checkbox" id="mi-fixo" ${i.fixo ? 'checked' : ''}> Sempre na lista (item de toda compra)</label>
      ${(i.rejeitados || []).length ? `<p class="muted pequeno">${i.rejeitados.length} produto(s) marcados como “não é esse”. <button class="btn link" data-acao="mc-item-limpar" data-v="${esc(i.id)}">Desfazer</button></p>` : ''}
      <div class="linha-btn"><button class="btn pri" data-acao="mc-item-salvar" data-v="${esc(i.id)}">Salvar</button><button class="btn perigo" data-acao="mc-item-apagar" data-v="${esc(i.id)}">${U().ic('lixo')} Tirar da lista</button></div>`;
  };
  EXT.folhas['mc-celula'] = f => {
    const ui = U(), D = ui.D, r = ST.res; if (!r) return null;
    const l = r.linhas.find(x => x.item.id === f.id); if (!l) return null;
    const x = l.por[f.rede]; if (!x) return null;
    const lin = (y, princ) => `<div class="mc-prod ${princ ? 'princ' : ''}"><div><b>${esc(y.o.produto)}</b><small>${esc([y.o.tam ? M.fmtTam(y.o.tam) : '', y.unit ? M.fmtUnit(y.unit) : '', M.FONTES[y.o.fonte] + ' ' + y.quando, y.o.condicao].filter(Boolean).join(' · '))}${y.o.de ? ` · de ${dinheiro(y.o.de)}` : ''}</small></div><b>${dinheiro(y.custo)}</b>${princ ? `<button class="btn link perigo" data-acao="mc-nao-e" data-v="${esc(l.item.id)}" data-k="${esc(y.o.chave)}">Não é esse</button>` : ''}</div>`;
    return `${cab(`${l.item.nome} no ${curto(f.rede)}`)}<p class="muted pequeno">Para ${esc(M.descItem(l.item))}${x.leve ? ` — leve ${x.leve} embalagens` : ''}.</p>
      ${lin(x, true)}${(l.alt[f.rede] || []).length ? `<small class="mc-sub">Outras opções no mesmo mercado</small>${l.alt[f.rede].map(y => lin(y)).join('')}` : ''}
      ${x.o.url ? `<p><a href="${esc(x.o.url)}" target="_blank" rel="noopener">Ver no site</a></p>` : ''}
      <div class="linha-btn"><button class="btn" data-acao="mc-preco" data-v="${esc(l.item.id)}" data-rede="${esc(f.rede)}">${ui.ic('etiqueta')} Anotar o preço que vi</button></div>`;
  };
  EXT.folhas['mc-preco'] = f => {
    const ui = U(), D = ui.D, itens = (D.compras || []).filter(i => !i.arquivado);
    return `${cab('Anotar preço')}<label class="campo-rot">Item<select id="mp-item">${itens.map(i => `<option value="${esc(i.id)}" ${f.item === i.id ? 'selected' : ''}>${esc(i.nome)}${i.tam ? ' ' + esc(M.fmtTam(i.tam)) : ''}</option>`).join('')}</select></label>
      <label class="campo-rot">Mercado<select id="mp-rede">${opcoesRede(f.rede || (ST.redes || [])[0])}</select></label>
      <label class="campo-rot">Produto (marca e tamanho)<input id="mp-prod" placeholder="Ex.: Arroz Tio João 5kg" autocomplete="off"></label>
      <div class="dois-campos"><label class="campo-rot">Preço (R$)<input id="mp-preco" inputmode="decimal" placeholder="0,00"></label><label class="campo-rot">Vale até (opcional)<input id="mp-ate" type="date" min="${F.hoje()}"></label></div>
      <button class="btn pri largo" data-acao="mc-preco-salvar">Guardar</button><small id="mp-msg" class="erro-msg"></small>`;
  };
  EXT.folhas['mc-encarte'] = f => {
    const ui = U();
    return `${cab('Ler encarte')}<label class="campo-rot">De qual mercado<select id="me-rede">${opcoesRede(f.rede || '', true)}</select></label>
      <div class="mc-escolha"><label class="btn pri largo mc-arquivo">${ui.ic('camera')} Foto, print ou PDF do encarte<input type="file" id="me-arq" accept="image/*,application/pdf" multiple hidden></label>
      <p class="muted pequeno">Pode escolher várias páginas de uma vez. A IA lê cada oferta com preço, tamanho e validade.</p></div>
      <div class="linha-campo"><input id="me-url" placeholder="Ou cole o link do encarte" autocomplete="off" autocapitalize="none" spellcheck="false" inputmode="url"><button class="btn" data-acao="mc-encarte-link">Ler link</button></div>
      ${ui.PC ? '' : '<p class="muted pequeno">No iPhone, o link é lido pelo computador (ele precisa estar ligado com o Jarvis aberto).</p>'}
      <small id="me-msg" class="erro-msg"></small>${ST.ocupado.encarte ? '<div class="progresso"><span class="giro"></span>Lendo o encarte…</div>' : ''}`;
  };
  EXT.folhas['mc-nota'] = () => {
    const ui = U();
    return `${cab('Escanear nota fiscal')}<p>Tire uma foto do <b>QR Code</b> do cupom (ou do cupom inteiro). O Jarvis abre a nota na Fazenda e guarda o preço de cada item.</p>
      <label class="btn pri largo mc-arquivo">${ui.ic('camera')} Foto do cupom<input type="file" id="mn-arq" accept="image/*" capture="environment" hidden></label>
      <div class="linha-campo"><input id="mn-url" placeholder="Ou cole o link do QR Code" autocomplete="off" autocapitalize="none" spellcheck="false" inputmode="url"><button class="btn" data-acao="mc-nota-link">Ler</button></div>
      <small id="mn-msg" class="erro-msg"></small>${ST.ocupado.nota ? '<div class="progresso"><span class="giro"></span>Lendo a nota…</div>' : ''}
      <p class="muted pequeno">O Jarvis guarda só a loja, a data e os itens com preço. Nome e CPF do consumidor nunca entram.${ui.PC ? '' : ' No iPhone, a nota pelo QR Code é aberta pelo computador; sem QR, a IA lê a foto.'}</p>`;
  };
  EXT.folhas['mc-nota-ver'] = f => {
    const ui = U(), n = (ui.D.notasFiscais || []).find(x => x.id === f.id); if (!n) return null;
    return `${cab(n.rede ? nomeR(n.rede) : 'Nota fiscal')}<p class="muted pequeno">${esc(n.emitente || '')}${n.cnpj ? ' · CNPJ ' + esc(n.cnpj) : ''} · ${esc(F.dataBR(String(n.data).slice(0, 10)))}</p>
      ${n.rede ? '' : `<label class="campo-rot">De qual mercado é esta nota?<select id="nv-rede">${n.emitente ? `<option value="__novo">Novo mercado: ${esc(nomeLoja(n.emitente))}</option>` : ''}${opcoesRede('')}</select></label><button class="btn pri largo" data-acao="mc-nota-rede" data-v="${esc(n.id)}">Guardar os preços</button>`}
      <div class="lista-simples mc-nota-itens">${n.itens.map(i => `<div class="linha-valor"><span>${esc(i.nome)}${i.qtd !== 1 ? ` <small>${String(i.qtd).replace('.', ',')} ${esc(i.un)}</small>` : ''}</span><b class="pequeno-val">${dinheiro(i.total || i.preco * i.qtd)}</b></div>`).join('')}</div>
      <div class="linha-valor forte"><span>Total</span><b>${dinheiro(n.total)}</b></div>
      <button class="btn perigo" data-acao="mc-nota-apagar" data-v="${esc(n.id)}">${ui.ic('lixo')} Apagar a nota</button>`;
  };
  EXT.folhas['mc-perto'] = () => {
    const ui = U(), c = cfg(), g = ST.perto;
    const lista = g ? (g.length ? `<div class="lista-simples mc-perto">${g.map((x, k) => { const ja = (ui.D.mercados || []).some(m => m.rede === x.rede && m.ativo !== false); return `<div class="ls-linha">${x.conhecida ? ponto(x.rede) : ui.ic('loja')}<div class="ls-txt"><b>${esc(x.nome)}</b><small>${x.lojas.length} loja${x.lojas.length > 1 ? 's' : ''} · a mais perto a ${M.fmtDist(x.dist)}${x.lojas[0].endereco ? ' · ' + esc(x.lojas[0].endereco) : ''}</small></div><button class="btn ${ja ? '' : 'pri'} peq" data-acao="mc-perto-add" data-v="${k}" ${ja ? 'disabled' : ''}>${ja ? 'Adicionado' : 'Adicionar'}</button></div>`; }).join('')}</div>` : '<p class="muted">Não achei mercados nesse raio. Aumente a distância.</p>') : '';
    return `${cab('Mercados perto de casa')}<p class="muted pequeno">Digite o CEP da sua casa. O Jarvis guarda só o CEP e o bairro e procura os mercados no mapa aberto (OpenStreetMap).</p>
      <div class="linha-campo"><input id="pt-cep" inputmode="numeric" placeholder="00000-000" value="${esc(c.cep ? c.cep.replace(/(\d{5})(\d{3})/, '$1-$2') : '')}" autocomplete="postal-code" maxlength="9"><select id="pt-raio" aria-label="Distância"><option value="1500" ${c.raio == 1500 ? 'selected' : ''}>1,5 km</option><option value="3000" ${c.raio == 3000 ? 'selected' : ''}>3 km</option><option value="5000" ${c.raio == 5000 ? 'selected' : ''}>5 km</option></select><button class="btn pri" data-acao="mc-perto-buscar" ${ST.ocupado.geo ? 'disabled' : ''}>${ST.ocupado.geo ? '<span class="giro"></span>' : 'Buscar'}</button></div>
      <small id="pt-msg" class="${ST.pertoMsg ? 'erro-msg' : 'muted pequeno'}">${esc(ST.pertoMsg || (c.bairro ? `${c.bairro}, ${c.cidade}` : ''))}</small>${lista}`;
  };
  EXT.folhas['mc-add-mercado'] = () => {
    const ui = U(), D = ui.D;
    return `${cab('Adicionar mercado')}<div class="lista-simples">${M.REDES.map(r => { const ja = (D.mercados || []).some(m => m.rede === r.id && m.ativo !== false); return `<div class="ls-linha">${ponto(r.id)}<div class="ls-txt"><b>${esc(r.nome)}</b></div><button class="btn ${ja ? '' : 'pri'} peq" data-acao="mc-add-rede" data-v="${r.id}" ${ja ? 'disabled' : ''}>${ja ? 'Adicionado' : 'Adicionar'}</button></div>`; }).join('')}</div>
      <div class="linha-campo"><input id="am-nome" placeholder="Outro mercado (nome)" autocomplete="off"><button class="btn" data-acao="mc-add-outro">Adicionar</button></div>`;
  };
  EXT.folhas['mc-mercado'] = f => {
    const ui = U(), i = M.info(ui.D, f.rede), m = i.cfg; if (!m || !m.rede) return null;
    return `${cab(i.nome)}${m.lojas && m.lojas.length ? `<p class="muted pequeno">${m.lojas.slice(0, 3).map(l => esc(l.nome + (l.endereco ? ' — ' + l.endereco : '') + ' (' + M.fmtDist(l.dist) + ')')).join('<br>')}</p>` : ''}
      <label class="campo-rot">Link do encarte (o PC relê a cada 3 dias)<input id="mm-encarte" value="${esc(i.encarte || '')}" placeholder="https://… página de ofertas ou PDF" autocomplete="off" autocapitalize="none" spellcheck="false"></label>
      ${m.encarteErro ? `<small class="erro-msg">${esc(m.encarteErro)}</small>` : ''}
      <label class="campo-rot">Site com loja online (preço do dia pelo seu CEP)<input id="mm-site" value="${esc(i.site || '')}" placeholder="https://…" autocomplete="off" autocapitalize="none" spellcheck="false"></label>
      ${m.siteErro ? `<small class="erro-msg">${esc(m.siteErro)}</small>` : m.siteLido ? `<small class="muted pequeno">Site lido ${esc(quandoFoi(m.siteLido))}.</small>` : ''}
      <details class="cf-mais"><summary>Avançado: link de busca do site</summary><label class="campo-rot">Use {q} no lugar do produto<input id="mm-busca" value="${esc(i.busca || '')}" placeholder="https://site/busca?q={q}" autocomplete="off" autocapitalize="none" spellcheck="false"></label></details>
      <div class="linha-btn"><button class="btn pri" data-acao="mc-mercado-salvar" data-v="${esc(f.rede)}">Salvar</button>${ui.PC && (i.encarte || i.site) ? `<button class="btn" data-acao="mc-mercado-testar" data-v="${esc(f.rede)}">Ler agora</button>` : ''}<button class="btn perigo" data-acao="mc-mercado-tirar" data-v="${esc(f.rede)}">Tirar</button></div><small id="mm-msg" class="muted pequeno"></small>`;
  };
  EXT.folhas['mc-orcamento'] = () => {
    const g = M.gastoMes(U().D);
    return `${cab('Limite do mercado')}<label class="campo-rot">Quanto quer gastar por mês com mercado (R$)<input id="mo-valor" inputmode="decimal" value="${g.orcamento ? String(g.orcamento).replace('.', ',') : ''}" placeholder="Ex.: 900"></label>
      <p class="muted pequeno">Fica igual ao limite da categoria Mercado em Planos e metas.</p><button class="btn pri largo" data-acao="mc-orcamento-salvar">Salvar</button>`;
  };

  /* ---------- ações ---------- */
  const A = EXT.acoes;
  A['mc-data'] = v => { ST.data = v; ST.res = null; ST.analise = null; redesenhar(); };
  A['mc-rede'] = v => { const s = redesSel(); ST.redes = s.includes(v) ? s.filter(x => x !== v) : [...s, v]; ST.res = null; ST.analise = null; redesenhar(); };
  A['mc-mercados'] = () => { const el = $('.mc-mercados'); if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); el.classList.add('pisca'); setTimeout(() => el.classList.remove('pisca'), 1200); } };
  A['mc-comparar'] = () => {
    const ui = U(), D = ui.D, data = dataSel(), redes = redesSel();
    if (!redes.length) { ui.aviso('Escolha pelo menos um mercado'); return; }
    let ida = (D.idas || []).find(i => i.data === data && i.status !== 'feita');
    if (!ida) { ida = M.novaIda({ data, redes }); (D.idas = D.idas || []).push(ida); }
    ida.redes = redes.slice();
    calcular(); ida.resultado = M.resumoGuardado(D, ST.res); ST.analise = null;
    ui.salvar(); redesenhar();
    const el = $('.mc-comp'); if (el && ui.celular()) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (ui.M.iaOk) M.conferir({ A: ui.A, D, res: ST.res }).then(n => { if (n) { calcular(); ida.resultado = M.resumoGuardado(D, ST.res); ui.salvar(); redesenhar(); } }).catch(e => console.warn('conferir:', e.message));
  };
  A['mc-atualizar'] = async () => {
    const ui = U(), D = ui.D, redes = redesSel();
    if (!ui.PC) {
      if (!perfilPronto()) return;
      M.pedir(D, 'atualizar', { redes }); ui.salvar(); redesenhar(); ui.aviso('Pedi ao computador para atualizar os preços');
      return;
    }
    ST.ocupado.atualizar = true; ST.ocupado.atualizarMsg = 'Lendo os preços…'; redesenhar();
    try {
      const rel = await atualizarPC({ redes, motivo: 'manual' });
      ST.res = null; calcular();
      const sem = redes.filter(r => { const i = M.info(D, r); return !i.encarte && !i.site; });
      ui.aviso(rel.erros.length ? rel.erros[0] : `${rel.encartes ? rel.encartes + ' encarte(s) e ' : ''}${rel.online} preço(s) de site atualizados${sem.length ? '' : ''}`, rel.erros.length ? 'erro' : undefined);
      if (sem.length && !rel.encartes && !rel.online) ui.aviso(`${sem.map(nomeR).join(', ')}: sem link de encarte ou site. Use “Ler encarte” ou as notas.`);
    } finally { ST.ocupado.atualizar = false; redesenhar(); }
  };
  A['mc-concluir'] = v => { const ui = U(); if (!ui.certeza('Marcar a compra como feita? Os itens “só desta vez” saem da lista e os outros voltam para a próxima.')) return; M.concluirIda(ui.D, v); ST.res = null; ST.data = null; ui.salvar(); redesenhar(); ui.aviso('Compra concluída'); };
  A['mc-analise'] = async () => {
    const ui = U(); if (!ST.res) calcular();
    ST.ocupado.analise = true; redesenhar();
    try { ST.analise = await M.analisar({ A: ui.A, D: ui.D, res: ST.res }); }
    catch (e) { ui.aviso(e.message, 'erro'); }
    finally { ST.ocupado.analise = false; redesenhar(); }
  };
  A['mc-web'] = async () => {
    const ui = U(); if (!ST.res) calcular();
    ST.ocupado.web = true; redesenhar();
    try {
      const n = await M.ofertasWeb({ A: ui.A, D: ui.D, itens: ST.res.semPreco.length ? ST.res.semPreco : M.itensAtivos(ui.D), redes: redesSel(), data: dataSel() });
      ui.salvar(); ST.res = null; ui.aviso(n ? `${n} oferta(s) achadas na web — confira a origem antes de ir` : 'Não achei ofertas confiáveis na web para esses itens');
    } catch (e) { ui.aviso(/googleSearch|google_search|grounding|tool/i.test(e.message) ? 'A busca na web não está disponível na sua chave da IA agora.' : e.message, 'erro'); }
    finally { ST.ocupado.web = false; redesenhar(); }
  };
  A['mc-celula'] = (v, b) => U().abrirFolha({ tipo: 'mc-celula', id: v, rede: b.dataset.rede });
  A['mc-nao-e'] = (v, b) => {
    const ui = U(), it = (ui.D.compras || []).find(i => i.id === v); if (!it) return;
    it.rejeitados = [...new Set([...(it.rejeitados || []), b.dataset.k])].slice(-40);
    calcular(); ui.salvar(); ui.fecharFolha(); redesenhar(); ui.aviso('Certo, esse produto não conta mais para este item');
  };
  A['mc-pular'] = v => { const ui = U(), it = (ui.D.compras || []).find(i => i.id === v); if (!it) return; it.pular = !it.pular; ST.res = null; ui.salvar(); redesenhar(); };
  A['mc-item'] = v => U().abrirFolha({ tipo: 'mc-item', id: v });
  A['mc-item-salvar'] = v => {
    const ui = U(), it = (ui.D.compras || []).find(i => i.id === v); if (!it) return;
    const nome = $('#mi-nome').value.trim(); if (nome) it.nome = nome[0].toUpperCase() + nome.slice(1);
    const t = $('#mi-tam').value.trim(); it.tam = t ? (M.tamanho(t) || M.tamanho('1 ' + t) || it.tam) : null;
    it.qtd = Math.max(1, Math.min(99, parseInt($('#mi-qtd').value, 10) || 1)); it.marca = $('#mi-marca').value.trim().slice(0, 40); it.fixo = $('#mi-fixo').checked;
    ST.res = null; ui.salvar(); ui.fecharFolha(); redesenhar();
  };
  A['mc-item-limpar'] = v => { const ui = U(), it = (ui.D.compras || []).find(i => i.id === v); if (!it) return; it.rejeitados = []; ST.res = null; ui.salvar(); ui.abrirFolha({ tipo: 'mc-item', id: v }, true); };
  A['mc-item-apagar'] = v => { const ui = U(); ui.D.compras = (ui.D.compras || []).filter(i => i.id !== v); ST.res = null; ui.salvar(); ui.fecharFolha(); redesenhar(); };
  A['mc-sug'] = v => { const ui = U(), s = M.sugestoes(ui.D)[+v]; if (!s) return; (ui.D.compras = ui.D.compras || []).push(M.novoItem({ nome: s.nome, tam: s.tam, fixo: true })); ST.res = null; ui.salvar(); redesenhar(); };
  A['mc-preco'] = (v, b) => U().abrirFolha({ tipo: 'mc-preco', item: v || null, rede: b && b.dataset.rede || null });
  A['mc-preco-salvar'] = () => {
    const ui = U(), D = ui.D, it = (D.compras || []).find(i => i.id === $('#mp-item').value);
    const preco = parseFloat(String($('#mp-preco').value).replace(/\./g, '').replace(',', '.')), rede = $('#mp-rede').value;
    if (!it || !(preco > 0) || !rede) { $('#mp-msg').textContent = 'Escolha o item, o mercado e o preço.'; return; }
    const prod = $('#mp-prod').value.trim() || [it.nome, it.marca, it.tam ? M.fmtTam(it.tam) : ''].filter(Boolean).join(' ');
    const ate = $('#mp-ate').value || null;
    const o = M.novaObs({ rede, produto: prod, preco, fonte: ate ? 'encarte' : 'manual', validoAte: ate, ref: ate ? 'manual' : null });
    if (!M.casar(it, o.produto, o.marca)) { it.aceitos = [...new Set([...(it.aceitos || []), o.chave])]; o.produto = it.nome + ' ' + o.produto.replace(new RegExp('^' + it.nome, 'i'), '').trim(); o.chave = M.chaveProduto(o.produto); }
    M.addObs(D, [o]); if (!(D.mercados || []).some(m => m.rede === rede)) M.adicionarMercado(D, { rede });
    guardarResultadoIda(); ST.res = null; ui.salvar(); ui.fecharFolha(); redesenhar(); ui.aviso('Preço anotado');
  };
  A['mc-encarte'] = (v, b) => U().abrirFolha({ tipo: 'mc-encarte', rede: (b && b.dataset.rede) || '' });
  A['mc-encarte-link'] = async () => {
    const ui = U(), url = $('#me-url').value.trim(), rede = $('#me-rede').value || null, msg = $('#me-msg');
    if (!/^https?:\/\//i.test(url)) { msg.textContent = 'Cole o link completo (começa com https://).'; return; }
    if (!ui.PC) { if (!perfilPronto()) return; M.pedir(ui.D, 'encarte', { url, rede }); ui.salvar(); ui.fecharFolha(); redesenhar(); ui.aviso('O computador vai ler esse encarte'); return; }
    ST.ocupado.encarte = true; msg.className = 'muted pequeno'; msg.textContent = 'Abrindo a página do encarte…';
    try { const r = await encarteDeLink(url, rede); if (rede) { const m = (ui.D.mercados || []).find(x => x.rede === rede); if (m && !m.encarte) { m.encarte = url; ui.salvar(); } } ui.fecharFolha(); ST.res = null; redesenhar(); }
    catch (e) { msg.className = 'erro-msg'; msg.textContent = e.message; }
    finally { ST.ocupado.encarte = false; }
  };
  A['mc-nota'] = () => U().abrirFolha({ tipo: 'mc-nota' });
  A['mc-nota-link'] = async () => {
    const ui = U(), url = $('#mn-url').value.trim(), msg = $('#mn-msg');
    if (!/^https?:\/\//i.test(url)) { msg.textContent = 'Cole o link completo do QR Code (começa com https://).'; return; }
    await notaPorLink(url, msg);
  };
  async function notaPorLink(url, msg) {
    const ui = U();
    if (!ui.PC) { if (!perfilPronto()) return; M.pedir(ui.D, 'nota', { url }); ui.salvar(); ui.fecharFolha(); redesenhar(); ui.aviso('Nota na fila: o computador vai abrir na Fazenda'); return; }
    ST.ocupado.nota = true; if (msg) { msg.className = 'muted pequeno'; msg.textContent = 'Abrindo a nota na Fazenda…'; }
    try {
      const r = await notaDeLink(url);
      ui.fecharFolha(); redesenhar();
      if (r.repetida) ui.aviso('Essa nota já estava guardada');
      else if (!r.rede) ui.abrirFolha({ tipo: 'mc-nota-ver', id: r.nota.id });
      else ui.aviso(`Nota do ${nomeR(r.rede)}: ${r.nota.n} itens guardados`);
    } catch (e) { if (msg) { msg.className = 'erro-msg'; msg.textContent = e.message; } else ui.aviso(e.message, 'erro'); }
    finally { ST.ocupado.nota = false; }
  }
  A['mc-nota-ver'] = v => U().abrirFolha({ tipo: 'mc-nota-ver', id: v });
  A['mc-nota-rede'] = v => {
    const ui = U(), n = (ui.D.notasFiscais || []).find(x => x.id === v); if (!n) return;
    let rede = $('#nv-rede').value;
    if (rede === '__novo') rede = M.adicionarMercado(ui.D, { nome: nomeLoja(n.emitente) }).rede;
    else if (!(ui.D.mercados || []).some(m => m.rede === rede && m.ativo !== false)) M.adicionarMercado(ui.D, { rede });
    M.definirRedeNota(ui.D, v, rede); guardarResultadoIda(); ST.res = null; ST.redes = null; ui.salvar(); ui.fecharFolha(); redesenhar(); ui.aviso('Preços da nota guardados');
  };
  A['mc-nota-apagar'] = v => { const ui = U(); if (!ui.certeza('Apagar esta nota e os preços dela?')) return; ui.D.notasFiscais = (ui.D.notasFiscais || []).filter(n => n.id !== v); ST.res = null; ui.salvar(); ui.fecharFolha(); redesenhar(); };
  A['mc-perto'] = () => { ST.pertoMsg = ''; U().abrirFolha({ tipo: 'mc-perto' }); };
  A['mc-perto-buscar'] = async () => {
    const ui = U(), cep = $('#pt-cep').value, raio = +$('#pt-raio').value || 3000;
    if (!perfilPronto()) return;
    ST.ocupado.geo = true; ST.pertoMsg = ''; ui.abrirFolha({ tipo: 'mc-perto' }, true);
    try {
      const l = await M.localDoCep(cep);
      M.salvarCfg(ui.D, { cep: l.cep, bairro: l.bairro, cidade: l.cidade, lat: l.lat, lon: l.lon, raio });
      ST.perto = M.agruparPorRede(await M.mercadosPerto({ lat: l.lat, lon: l.lon, raio }));
      ui.salvar();
    } catch (e) { ST.pertoMsg = e.message; }
    finally { ST.ocupado.geo = false; ui.abrirFolha({ tipo: 'mc-perto' }, true); }
  };
  A['mc-perto-add'] = v => {
    const ui = U(), x = (ST.perto || [])[+v]; if (!x) return;
    M.adicionarMercado(ui.D, { rede: x.rede, nome: x.nome, lojas: x.lojas.map(l => ({ nome: l.nome, endereco: l.endereco, dist: l.dist })), dist: x.dist });
    ST.redes = null; ST.res = null; ui.salvar(); ui.abrirFolha({ tipo: 'mc-perto' }, true);
  };
  A['mc-add-mercado'] = () => U().abrirFolha({ tipo: 'mc-add-mercado' });
  A['mc-add-rede'] = v => { const ui = U(); M.adicionarMercado(ui.D, { rede: v }); ST.redes = null; ST.res = null; ui.salvar(); ui.abrirFolha({ tipo: 'mc-add-mercado' }, true); };
  A['mc-add-outro'] = () => { const ui = U(), n = $('#am-nome').value.trim(); if (!n) return; M.adicionarMercado(ui.D, { nome: n }); ST.redes = null; ui.salvar(); ui.abrirFolha({ tipo: 'mc-add-mercado' }, true); };
  A['mc-mercado'] = v => U().abrirFolha({ tipo: 'mc-mercado', rede: v });
  const lerCamposMercado = v => {
    const ui = U(), m = (ui.D.mercados || []).find(x => x.rede === v); if (!m) return null;
    const lim = s => { s = String(s || '').trim(); return s && !/^https?:\/\//i.test(s) ? 'https://' + s : s; };
    m.encarte = lim($('#mm-encarte').value); m.site = lim($('#mm-site').value); m.busca = ($('#mm-busca') || {}).value ? lim($('#mm-busca').value) : '';
    m.encarteErro = null; m.siteErro = null; m.encarteFalhouEm = null;
    return m;
  };
  A['mc-mercado-salvar'] = v => { const ui = U(); const m = lerCamposMercado(v); if (!m) return; if (m.busca && !/\{q\}/.test(m.busca)) { $('#mm-msg').textContent = 'O link de busca precisa ter {q}.'; return; } ui.salvar(); ui.fecharFolha(); redesenhar(); };
  A['mc-mercado-testar'] = async (v, b) => {
    const ui = U(); const m = lerCamposMercado(v); if (!m) return; ui.salvar();
    b.disabled = true; const msg = $('#mm-msg'); msg.className = 'muted pequeno'; msg.textContent = 'Lendo…';
    const partes = [];
    try { if (m.encarte) { const r = await encarteDeLink(m.encarte, v, { silencioso: true }); partes.push(`${r.ofertas.length} ofertas no encarte`); } } catch (e) { partes.push('Encarte: ' + e.message); m.encarteErro = e.message; }
    try { if (m.site) { const n = await lerOnline(v); partes.push(`${n} preço(s) do site`); } } catch (e) { partes.push('Site: ' + e.message); m.siteErro = e.message; }
    ui.salvar(); ST.res = null; msg.textContent = partes.join(' · '); b.disabled = false;
  };
  A['mc-mercado-tirar'] = v => { const ui = U(), m = (ui.D.mercados || []).find(x => x.rede === v); if (!m) return; m.ativo = false; ST.redes = null; ST.res = null; ui.salvar(); ui.fecharFolha(); redesenhar(); };
  A['mc-orcamento'] = () => U().abrirFolha({ tipo: 'mc-orcamento' });
  A['mc-orcamento-salvar'] = () => {
    const ui = U(), D = ui.D, v = parseFloat(String($('#mo-valor').value).replace(/\./g, '').replace(',', '.'));
    D.orcamentos = D.orcamentos || [];
    let o = D.orcamentos.find(x => x.categoria === 'mercado');
    if (!(v > 0)) { if (o) D.orcamentos.splice(D.orcamentos.indexOf(o), 1); if (cfg().orcamento) M.salvarCfg(D, { orcamento: null }); }
    else { if (!o) { o = { id: 'or-' + F.uid(), categoria: 'mercado' }; D.orcamentos.push(o); } o.valor = Math.round(v * 100) / 100; if ('limite' in o) o.limite = o.valor; }
    ui.salvar(); ui.fecharFolha(); redesenhar();
  };

  /* ---------- formulários e arquivos ---------- */
  document.addEventListener('submit', ev => {
    if (ev.target.id !== 'mc-add') return;
    ev.preventDefault();
    const ui = U(), inp = $('#mc-add-txt'); const partes = inp.value.split(/[;\n]|,\s(?=\D)/).map(s => s.trim()).filter(Boolean);
    let n = 0;
    for (const p of partes) { const x = M.lerItem(p); if (!x) continue; (ui.D.compras = ui.D.compras || []).push(M.novoItem({ ...x, fixo: true })); n++; }
    if (!n) return;
    inp.value = ''; ST.res = null; ui.salvar(); redesenhar(); const e = $('#mc-add-txt'); if (e) e.focus();
  });
  document.addEventListener('change', async ev => {
    if (ev.target.id === 'mc-dia') { if (ev.target.value) { ST.data = ev.target.value; ST.res = null; ST.analise = null; redesenhar(); } return; }
    if (ev.target.id === 'me-arq') {
      const ui = U(), files = [...ev.target.files], msg = $('#me-msg'), rede = $('#me-rede').value || null; if (!files.length) return;
      ST.ocupado.encarte = true; msg.className = 'muted pequeno'; msg.innerHTML = '<span class="giro"></span> A IA está lendo o encarte…';
      try { const r = await lerComIA(await partesDeArquivos(files), rede, { origem: files.some(f => /pdf/i.test(f.type)) ? 'pdf' : 'foto' }); ui.fecharFolha(); ST.res = null; redesenhar(); ui.aviso(`${r.ofertas.length} ofertas do ${nomeR(r.encarte.rede)}${r.encarte.semValidade ? ' (sem validade no encarte: vale por 7 dias)' : ' até ' + dataCurta(r.encarte.validoAte)}`); }
      catch (e) { msg.className = 'erro-msg'; msg.textContent = e.message; }
      finally { ST.ocupado.encarte = false; ev.target.value = ''; }
      return;
    }
    if (ev.target.id === 'mn-arq') {
      const ui = U(), f = ev.target.files[0], msg = $('#mn-msg'); if (!f) return;
      msg.className = 'muted pequeno'; msg.textContent = 'Procurando o QR Code…';
      try {
        const q = await qrDaImagem(f);
        if (q && /^https?:\/\//i.test(q)) { await notaPorLink(q, msg); return; }
        if (!ui.M.iaOk) throw new Error('Não achei o QR Code na foto. Tente mais perto, com o QR Code inteiro e nítido.');
        msg.textContent = 'Sem QR Code legível: a IA está lendo o cupom…';
        const j = await M.lerNotaIA({ A: ui.A, partes: [await reduzir(f, 2400)] });
        const r = M.aplicarNota(ui.D, j, { origem: 'foto' });
        guardarResultadoIda(); ST.res = null; ui.salvar(); ui.fecharFolha(); redesenhar();
        if (r.repetida) ui.aviso('Essa nota já estava guardada'); else if (!r.rede) ui.abrirFolha({ tipo: 'mc-nota-ver', id: r.nota.id }); else ui.aviso(`Nota do ${nomeR(r.rede)}: ${r.nota.n} itens`);
      } catch (e) { msg.className = 'erro-msg'; msg.textContent = e.message; }
      finally { ev.target.value = ''; }
    }
  });

  /* ---------- Hoje e prioridades ---------- */
  EXT.cartoesHoje.push(() => {
    const ui = U(), D = ui.D, ida = M.proximaIda(D), n = M.itensAtivos(D).length;
    if (!ida && !n) return '';
    const r = ida && ida.resultado;
    const txt = ida ? `<p><b>Compra ${esc(M.quandoTxt(ida.data) === 'hoje' ? 'de hoje' : M.quandoTxt(ida.data) === 'amanhã' ? 'de amanhã' : 'de ' + M.quandoTxt(ida.data))}</b> · ${esc(r ? r.frase : 'toque em Comparar para ver onde está mais barato')}</p>` : `<p>${n} ite${n === 1 ? 'm' : 'ns'} na lista. Escolha o dia e veja onde está mais barato.</p>`;
    const al = M.alertas(D).length;
    return `<section class="card mercado-card"><div class="rot">${ui.ic('carrinho')} Mercado${al ? `<span class="dica">${al} aviso${al > 1 ? 's' : ''} de preço</span>` : ''}</div>${txt}<button class="btn" data-ir="mercado">${ui.ic('balanca')} ${ida ? 'Ver comparação' : 'Planejar compra'}</button></section>`;
  });
  EXT.prioridades.push(D => {
    const ida = M.proximaIda(D); if (!ida || ida.data !== F.hoje() || !ida.resultado || !ida.resultado.melhor) return [];
    const t = String(ida.resultado.frase || '').replace(/^[^:]{2,40}:\s*/, '');
    return [{ nivel: 'medio', id: 'mc-ida-' + ida.id, ic: 'carrinho', ir: 'mercado', titulo: `Compra hoje: ${M.info(D, ida.resultado.melhor).nome}`, texto: t ? t[0].toUpperCase() + t.slice(1) : '' }];
  });

  /* ---------- Ajustes ---------- */
  EXT.ajustes.push(() => {
    const ui = U(), c = cfg();
    return `<section class="card"><div class="rot">Mercado</div>
      <div class="seg largo mc-modo"><button class="${c.modo !== 'online' ? 'on' : ''}" data-acao="mc-modo" data-v="loja">Compro na loja</button><button class="${c.modo === 'online' ? 'on' : ''}" data-acao="mc-modo" data-v="online">Compro pelo site</button></div>
      <p class="muted pequeno">${c.modo === 'online' ? 'O preço do site vale mais que o do encarte.' : 'Encarte e nota fiscal valem mais que o preço do site, que costuma ser mais alto que o da loja.'}</p>
      <div class="dois-campos"><label class="campo-rot">Dividir a compra se economizar mais de (R$)<input id="mc-cfg-div" inputmode="decimal" value="${esc(String(c.dividirMin ?? 10).replace('.', ','))}"></label><label class="campo-rot">Aviso no dia da compra<input id="mc-cfg-hora" type="time" value="${esc(c.hora || '08:00')}"></label></div>
      ${ui.PC ? `<label class="chk-linha"><input type="checkbox" id="mc-cfg-avisar" ${c.avisar ? 'checked' : ''}> Atualizar os preços e avisar no dia da compra</label><label class="chk-linha"><input type="checkbox" id="mc-cfg-vespera" ${c.vespera ? 'checked' : ''}> Avisar também na véspera, às 19h</label>` : ''}
      <div class="linha-btn"><button class="btn" data-acao="mc-cfg">Salvar</button><button class="btn link" data-acao="mc-perto">${c.cep ? 'CEP ' + esc(c.cep.replace(/(\d{5})(\d{3})/, '$1-$2')) : 'Mercados perto de casa'}</button></div></section>`;
  });
  A['mc-modo'] = v => { if (!perfilPronto()) return; M.salvarCfg(U().D, { modo: v }); ST.res = null; U().salvar(); U().desenhar(); };
  A['mc-cfg'] = () => {
    if (!perfilPronto()) return;
    const d = parseFloat(String(($('#mc-cfg-div') || {}).value || '10').replace(',', '.'));
    const mud = { dividirMin: d >= 0 ? d : 10, hora: ($('#mc-cfg-hora') || {}).value || '08:00' };
    if ($('#mc-cfg-avisar')) { mud.avisar = $('#mc-cfg-avisar').checked; mud.vespera = $('#mc-cfg-vespera').checked; }
    M.salvarCfg(U().D, mud); ST.res = null; U().salvar(); U().aviso('Salvo');
  };

  /* ---------- registro ---------- */
  EXT.telas.mercado = telaMercado;
  EXT.antesDeSalvar.push(D => { M.podar(D); return 0; });
  EXT.aoIniciar.push(() => {
    const ui = U(); if (!ui.PC) return;
    setTimeout(() => processarPedidos(), window.api.teste ? 400 : 8000);
    setInterval(() => { processarPedidos(); checarIdas(); }, window.api.teste ? 1500 : 60e3);
    setInterval(() => encartesAutomaticos(), window.api.teste ? 4000 : 30 * 60e3);
    setTimeout(() => encartesAutomaticos(), window.api.teste ? 3000 : 90e3);
  });
  window.__mercado = { ST, calcular, atualizarPC, processarPedidos, checarIdas, encartesAutomaticos, lerComIA, partesDeArquivos, qrDaImagem, notaPorLink, guardarResultadoIda };
})();
