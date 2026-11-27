/* Jarvis Finance — aba Contas fixas (PC e iPhone). Lista o que vence no mês, guarda o PDF de cada conta,
   copia código de barras/Pix, marca como paga (sozinho, quando o pagamento aparece no extrato)
   e, no PC, conecta a busca automática da Cemig, da Copasa e da Claro. */
(function () {
  'use strict';
  const F = window.Finn, C = window.Contas;
  const EXT = window.FinnExt = window.FinnExt || {};
  for (const k of ['telas', 'folhas', 'acoes', 'titulos', 'icones']) EXT[k] = EXT[k] || {};
  for (const k of ['aoIniciar', 'antesDeSalvar', 'alertas', 'aoMudar']) EXT[k] = EXT[k] || [];
  const U = () => window.__ui;
  const $ = (s, r = document) => r.querySelector(s);
  const { dinheiro, dataBR } = F;
  const esc = s => F.esc(s);
  const so = s => String(s || '').replace(/\D/g, '');

  Object.assign(EXT.icones, {
    gota: '<path d="M12 3.5c3.2 4.2 6 7.6 6 11a6 6 0 0 1-12 0c0-3.4 2.8-6.8 6-11z"/>',
    wifi: '<path d="M2.5 9a14 14 0 0 1 19 0M5.5 12.5a9.5 9.5 0 0 1 13 0M8.6 15.9a5 5 0 0 1 6.8 0"/><circle cx="12" cy="19" r="1.1"/>',
    recibo: '<path d="M6 3.5h12v17l-2.2-1.4-2 1.4-1.8-1.4-1.8 1.4-2-1.4L6 20.5z"/><path d="M9 8h6M9 11.5h6M9 15h3.5"/>',
    pdf: '<path d="M14 3.5H7a1.5 1.5 0 0 0-1.5 1.5v14A1.5 1.5 0 0 0 7 20.5h10a1.5 1.5 0 0 0 1.5-1.5V8z"/><path d="M14 3.5V8h4.5M9 13h6M9 16.5h4"/>',
    copiar: '<rect x="8.5" y="8.5" width="11" height="11" rx="2"/><path d="M15.5 8.5V6a1.5 1.5 0 0 0-1.5-1.5H6A1.5 1.5 0 0 0 4.5 6v8A1.5 1.5 0 0 0 6 15.5h2.5"/>',
    clipe: '<path d="M19.5 11.5 12 19a5 5 0 0 1-7-7l8-8a3.3 3.3 0 0 1 4.7 4.7l-8 8a1.7 1.7 0 0 1-2.4-2.4l7.4-7.4"/>',
    compartilhar: '<path d="M12 3.5v11M7.5 8 12 3.5 16.5 8M6 11.5H5a1 1 0 0 0-1 1V20a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7.5a1 1 0 0 0-1-1h-1"/>',
    robo: '<rect x="4.5" y="8" width="15" height="11" rx="3"/><path d="M12 4.5V8M9 13h.01M15 13h.01M9.5 16.5h5"/>',
    cadeado: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7.5a4 4 0 0 1 8 0V11"/>',
  });
  EXT.titulos.contas = 'Contas fixas';

  /* ---------- estado só desta tela ---------- */
  const ST = { mes: null, rodando: {}, pc: {}, cache: new Map(), pdfLido: null, ultimaBusca: 0, avisados: {} };
  const ymHoje = () => F.hoje().slice(0, 7);
  const mesSo = ym => { const n = F.nomeMes(ym); return ym.slice(0, 4) === F.hoje().slice(0, 4) ? n.replace(/ de \d{4}$/, '') : n; };
  const nomeMesCap = ym => F.nomeMes(ym).replace(/^./, c => c.toUpperCase());

  /* ---------- pedaços visuais ---------- */
  function bolha(fx) {
    const P = fx && fx.fornecedor ? C.FORNECEDORES[fx.fornecedor] : null;
    const cor = P ? P.cor : (F.GRUPOS[F.grupoDe(fx && fx.categoria || 'outros', U().D)] || F.GRUPOS.outros).cor;
    return `<span class="bol" style="--c:${cor}">${U().ic(C.icFixa(fx))}</span>`;
  }
  const corSit = s => ({ paga: 'ok', vencida: 'ruim', hoje: 'quase', proxima: 'quase', aguardando: 'neutro', futura: '' }[s] || '');
  function linhaInst(i) {
    const fx = i.fixa || {};
    const forma = C.FORMAS_CURTAS[fx.forma] || '';
    const sub = [fx.fornecedor ? C.FORNECEDORES[fx.fornecedor].nome : '', i.sit.txt, fx.forma && i.status !== 'paga' && !i.aguardando ? forma : ''].filter(Boolean).join(' · ');
    return `<button class="cf-linha" data-acao="cf-fatura" data-v="${esc(i.id)}">
      ${bolha(fx)}
      <span class="cf-txt"><b>${esc(C.nomeFixa(fx))}</b><small class="sit ${corSit(i.sit.s)}">${esc(sub)}</small></span>
      <span class="cf-dir"><b class="${i.status === 'paga' ? 'verde' : ''}">${i.estimado && i.status !== 'paga' ? '~' : ''}${dinheiro(i.valor)}</b>${i.pdf ? `<small class="pdf-tag">${U().ic('pdf')} PDF</small>` : ''}</span>
    </button>`;
  }
  const vazioLista = t => `<p class="muted pequeno cf-vazio">${esc(t)}</p>`;

  /* =====================================================================
     TELA
     ===================================================================== */
  function telaContas() {
    const ui = U(), D = ui.D;
    const agora = !ST.mes, ym = ST.mes || ymHoje();
    const fixas = (D.fixas || []);
    let h = `<div class="periodo"><div class="mes-nav"><button class="redondo" data-acao="cf-mes" data-v="-1" aria-label="Mês anterior">${ui.ic('esq')}</button><strong>${agora ? 'Próximas contas' : esc(nomeMesCap(ym))}</strong><button class="redondo" data-acao="cf-mes" data-v="1" aria-label="Próximo mês">${ui.ic('dir')}</button>${agora ? '' : `<button class="btn mini" data-acao="cf-agora">Agora</button>`}</div>
      <div class="linha-btn topo-btn"><button class="btn pri" data-acao="cf-nova">${ui.ic('mais')} Nova conta fixa</button><label class="btn">${ui.ic('clipe')} Anexar PDF<input type="file" id="cf-arq" accept="application/pdf,.pdf" hidden></label></div></div>`;
    h += `<div class="grade contas">`;
    let atrasadas = [], aPagar = [], pagas = [], resumoHtml = '';
    if (agora) {
      const p = C.painel(D);
      atrasadas = p.atrasadas; aPagar = p.aPagar; pagas = p.pagas;
      const nAbertas = atrasadas.length + aPagar.filter(i => !i.aguardando).length;
      const pct = p.pago + p.falta > 0 ? Math.min(100, p.pago / (p.pago + p.falta) * 100) : 0;
      resumoHtml = (nAbertas || pagas.length || aPagar.length) ? `
        <div class="rot">Próximos 30 dias</div>
        <div class="grande">${p.falta > 0.004 ? `${dinheiro(p.falta)} <small class="muted">a pagar</small>` : `<span class="verde">Nada para pagar agora</span>`}</div>
        <div class="barra-uso meta-b"><i style="width:${pct}%"></i></div>
        <div class="linha-valor"><span>${dinheiro(p.pago)} pagos em ${esc(mesSo(ymHoje()))}${p.previsto > 0 ? ` <small class="muted">· ~${dinheiro(p.previsto)} de contas que ainda não saíram</small>` : ''}</span><b class="nowrap">${nAbertas} ${nAbertas === 1 ? 'conta' : 'contas'}</b></div>
        ${p.proxima ? `<button class="cf-proxima" data-acao="cf-fatura" data-v="${esc(p.proxima.id)}">${ui.ic('calendario')}<span>Próxima: <b>${esc(C.nomeFixa(p.proxima.fixa))}</b> · ${esc(p.proxima.sit.txt.toLowerCase())} · ${dinheiro(p.proxima.valor)}</span>${ui.ic('dir')}</button>` : ''}`
        : `<div class="rot">Próximos 30 dias</div><p>${fixas.length ? 'Nenhuma conta para pagar nos próximos 30 dias.' : 'Cadastre suas contas fixas — academia, aluguel, assinaturas — e conecte a Cemig, a Copasa e a Claro para o Jarvis buscar as contas sozinho.'}</p>`;
    } else {
      const r = C.resumo(D, ym);
      aPagar = r.its.filter(i => i.status !== 'paga'); pagas = r.its.filter(i => i.status === 'paga');
      const pct = r.total > 0 ? Math.min(100, r.pago / r.total * 100) : 0;
      resumoHtml = `<div class="rot">${esc(nomeMesCap(ym))}</div>` + (r.its.length ? `
        <div class="grande">${r.falta > 0.004 ? `Faltam ${dinheiro(r.falta)}` : `<span class="verde">Tudo pago</span>`}</div>
        <div class="barra-uso meta-b"><i style="width:${pct}%"></i></div>
        <div class="linha-valor"><span>${dinheiro(r.pago)} pagos de ${dinheiro(r.total)}${r.estimado ? ' <small class="muted">(~ estimado)</small>' : ''}</span><b class="nowrap">${pagas.length}/${r.its.length} contas</b></div>`
        : `<p>Nada vence em ${esc(F.nomeMes(ym))}.</p>`);
    }
    h += `<section class="card cf-resumo largo">${resumoHtml}</section>`;
    if (atrasadas.length) h += `<section class="card cf-lista atrasadas largo"><div class="rot vermelho">Atrasadas <span class="dica">${dinheiro(F.soma(atrasadas))}</span></div>${atrasadas.map(linhaInst).join('')}</section>`;
    const reais = aPagar.filter(i => !i.aguardando), esperando = aPagar.filter(i => i.aguardando);
    h += `<section class="card cf-lista"><div class="rot">A pagar <span class="dica">${reais.length ? dinheiro(F.soma(reais)) : ''}</span></div>${aPagar.length ? [...reais, ...esperando].map(linhaInst).join('') : vazioLista(agora ? 'Nada para pagar nos próximos 30 dias.' : 'Nada em aberto neste mês.')}</section>`;
    h += `<section class="card cf-lista"><div class="rot">${agora ? 'Pagas em ' + esc(mesSo(ymHoje())) : 'Pagas'} <span class="dica">${pagas.length ? dinheiro(F.soma(pagas)) : ''}</span></div>${pagas.length ? pagas.map(linhaInst).join('') : vazioLista('Quando um pagamento aparecer no extrato, a conta é baixada sozinha.')}</section>`;
    // busca automática
    h += cardBusca();
    // cadastro
    h += `<section class="card cf-cadastro"><div class="rot">Suas contas fixas <span class="dica">${fixas.filter(f => f.ativa !== false).length}</span></div>
      ${fixas.length ? `<div class="lista-simples">${[...fixas].sort((a, b) => (a.ativa === false) - (b.ativa === false) || (a.dia || 99) - (b.dia || 99)).map(fx => `<button class="ls-linha cf-def ${fx.ativa === false ? 'pausada' : ''}" data-acao="cf-editar" data-v="${esc(fx.id)}">${bolha(fx)}<div class="ls-txt"><b>${esc(C.nomeFixa(fx))}</b><small>${esc([fx.dia ? (fx.frequencia === 'anual' ? `todo ano, dia ${fx.dia}/${String(fx.mesAnual || 1).padStart(2, '0')}` : `todo dia ${fx.dia}`) : 'aguardando a primeira conta', C.FORMAS[fx.forma] || '', fx.ativa === false ? 'pausada' : ''].filter(Boolean).join(' · '))}</small></div><span>${fx.valor ? (fx.variavel || fx.fornecedor ? '~' : '') + dinheiro(fx.valor) : '—'}</span></button>`).join('')}</div>`
      : '<p class="muted">Nenhuma ainda.</p>'}
      <button class="btn largo" data-acao="cf-nova">${ui.ic('mais')} Nova conta fixa</button>
    </section>`;
    // sugestões do extrato
    const sug = C.sugestoes(D);
    if (sug.length) h += `<section class="card cf-sug"><div class="rot">Achei no seu extrato <span class="dica">parecem contas fixas</span></div>
      <div class="lista-simples">${sug.map(s => `<div class="ls-linha">${U().bolinha(s.categoria)}<div class="ls-txt"><b>${esc(s.nome)}</b><small>${dinheiro(s.valor)} · por volta do dia ${s.dia}</small></div><div class="mini-btns"><button class="btn mini pri" data-acao="cf-sug-add" data-v="${esc(s.chave)}">Adicionar</button><button class="redondo peq" data-acao="cf-sug-ignorar" data-v="${esc(s.chave)}" aria-label="Ignorar">${ui.ic('fechar')}</button></div></div>`).join('')}</div>
    </section>`;
    h += `</div>`;
    $('#tela').innerHTML = h;
  }

  function cardBusca() {
    const ui = U(), D = ui.D, PC = ui.PC;
    const linhas = C.ORDEM_FORN.map(prov => {
      const P = C.FORNECEDORES[prov], fx = C.fixaDe(D, C.idFixaForn(prov)), b = fx && fx.busca, pc = ST.pc[prov] || {};
      const ligada = !!(fx && fx.ativa !== false && b && b.ligada);
      const rodando = ST.rodando[prov] || pc.rodando;
      let st = 'Não conectada', cls = 'neutro';
      if (rodando) { st = 'Buscando agora…'; cls = 'quase'; }
      else if (ligada) {
        const d = b.ultima ? new Date(b.ultima) : null, hojeD = d && d.toDateString() === new Date().toDateString();
        const hm = d ? d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '', dm = d ? d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : '';
        st = { ok: d ? `Conferida ${hojeD ? 'às ' + hm : 'em ' + dm}` : 'Conectada', 'sem-aberto': `Em dia${d ? ' · ' + (hojeD ? hm : dm) : ''}`, entrar: 'Sessão expirou', senha: 'Senha recusada', erro: 'Busca falhou', cancelado: 'Busca cancelada', novo: 'Ainda não buscou' }[b.estado] || 'Conectada';
        cls = { ok: 'ok', 'sem-aberto': 'ok', entrar: 'ruim', senha: 'ruim', erro: 'quase' }[b.estado] || '';
      }
      const btn = !PC ? '' : rodando ? `<span class="giro"></span>` : ligada
        ? `<button class="btn mini ${['entrar', 'senha'].includes(b.estado) ? 'pri' : ''}" data-acao="cf-buscar" data-v="${prov}">${['entrar', 'senha'].includes(b.estado) ? 'Entrar' : 'Buscar'}</button><button class="redondo peq" data-acao="cf-conectar" data-v="${prov}" aria-label="Opções da ${P.nome}">${ui.ic('pontos')}</button>`
        : `<button class="btn mini pri" data-acao="cf-conectar" data-v="${prov}">Conectar</button>`;
      return `<div class="forn-linha"><span class="bol" style="--c:${P.cor}">${ui.ic(P.ic)}</span><div class="ls-txt"><b>${P.nome}</b><small class="sit ${cls}" title="${esc(b && b.msg || '')}">${esc(st)}</small></div><div class="mini-btns">${btn}</div></div>`;
    }).join('');
    return `<section class="card cf-busca"><div class="rot">${U().ic('robo')} Busca automática</div>${linhas}
      <p class="muted pequeno">${PC ? 'O Jarvis entra nos sites oficiais numa janela dele, pega a conta em aberto com o PDF e confere de 6 em 6 horas. Senhas ficam criptografadas só neste computador.' : 'A busca roda no Jarvis do computador. As contas e os PDFs aparecem aqui sozinhos.'}</p>
      ${PC ? `<label class="chk-linha"><input type="checkbox" id="cf-segundo-plano" ${ST.segundoPlano ? 'checked' : ''}> Continuar buscando com a janela fechada (fica na bandeja e abre com o Windows)</label>` : ''}
    </section>`;
  }

  /* ---------- card do Início ---------- */
  EXT.cardFixas = D => {
    const ui = U(), r = C.painel(D);
    const prox = [...r.atrasadas, ...r.aPagar.filter(i => !i.aguardando)].slice(0, 4);
    return `<section class="card fixas"><div class="rot">Contas do mês <span class="dica">${r.falta > 0.004 ? dinheiro(r.falta) + ' a pagar' : 'nada a pagar agora'}</span></div>
      ${prox.length ? `<div class="lista-simples">${prox.map(i => `<button class="ls-linha" data-acao="cf-fatura-ir" data-v="${esc(i.id)}">${bolha(i.fixa)}<div class="ls-txt"><b>${esc(C.nomeFixa(i.fixa))}</b><small class="sit ${corSit(i.sit.s)}">${esc(i.sit.txt)}</small></div><span>${i.estimado ? '~' : ''}${dinheiro(i.valor)}</span></button>`).join('')}</div>` : `<p class="muted">Nenhuma conta em aberto agora.</p>`}
      <div class="total-linha"><span>${dinheiro(r.pago)} pagos em ${esc(mesSo(ymHoje()))}</span><button class="btn link" data-ir="contas">Ver contas</button></div>
    </section>`;
  };

  /* =====================================================================
     FOLHAS
     ===================================================================== */
  const cab = (t) => `<div class="folha-cab"><h3>${esc(t)}</h3><button class="redondo" data-acao="fechar" aria-label="Fechar">${U().ic('fechar')}</button></div>`;
  function acharInst(id) {
    const D = U().D, ym = (ST.mes || ymHoje());
    const ciclo = (/-(\d{4}-\d{2})(?:-\d+)?$/.exec(id) || [])[1];
    const meses = [...new Set([ciclo, ym, ymHoje(), F.mesAnterior(ymHoje()), F.mesSeguinte(ymHoje())].filter(Boolean))];
    for (const m of meses) { const i = C.instancias(D, m, { todas: true }).find(x => x.id === id); if (i) return i; }
    return C.atrasadas(D, ymHoje()).find(x => x.id === id) || null;
  }

  EXT.folhas['cf-fatura'] = f => {
    const ui = U(), D = ui.D, i = acharInst(f.id); if (!i) return null;
    const fx = i.fixa || {}, P = fx.fornecedor ? C.FORNECEDORES[fx.fornecedor] : null;
    const tx = i.transacaoId ? (D.transacoes || []).find(t => t.id === i.transacaoId) : null;
    let h = cab(C.nomeFixa(fx));
    h += `<div class="tx-grande ${i.status === 'paga' ? 'verde' : ''}">${i.estimado && i.status !== 'paga' ? '~' : ''}${dinheiro(i.valor)}</div>
      <p class="centro"><span class="sit-chip ${corSit(i.sit.s)}">${esc(i.sit.txt)}</span></p>
      <div class="info-grade">
        <span>Vencimento</span><b>${dataBR(i.vencimento)}</b>
        ${i.competencia ? `<span>Referente a</span><b>${esc(nomeMesCap(i.competencia))}</b>` : ''}
        <span>Pagamento</span><b>${esc(C.FORMAS[fx.forma] || '—')}${fx.forma === 'debito' && fx.banco ? ' · ' + esc(fx.banco) : ''}</b>
        ${P ? `<span>Empresa</span><b>${esc(P.nome)}</b>` : ''}
        ${tx ? `<span>No extrato</span><b class="quebra">${esc(tx.descricao)} · ${dataBR(tx.data)} · ${dinheiro(tx.valor)}</b>` : ''}
        ${i.estimado && i.status !== 'paga' ? `<span>Valor</span><b>Estimado pela última conta</b>` : ''}
      </div>`;
    if (i.linha) h += `<div class="codigo-box"><small>Código de barras</small><code>${esc(C.formatarLinha(i.linha))}</code><button class="btn mini" data-acao="cf-copiar" data-v="linha:${esc(i.id)}">${ui.ic('copiar')} Copiar</button></div>`;
    if (i.pix) h += `<div class="codigo-box"><small>Pix copia e cola</small><code class="pix">${esc(i.pix.slice(0, 64))}…</code><button class="btn mini" data-acao="cf-copiar" data-v="pix:${esc(i.id)}">${ui.ic('copiar')} Copiar Pix</button></div>`;
    h += `<div class="linha-btn">`;
    if (i.pdf) h += `<button class="btn pri" data-acao="cf-ver-pdf" data-v="${esc(i.id)}">${ui.ic('pdf')} Ver conta (PDF)</button>`;
    else if (!i.aguardando || !ui.PC) h += `<label class="btn">${ui.ic('clipe')} Anexar PDF<input type="file" class="cf-arq-inst" data-inst="${esc(i.id)}" accept="application/pdf,.pdf" hidden></label>`;
    if (i.aguardando && ui.PC && fx.fornecedor) h += `<button class="btn pri" data-acao="cf-buscar" data-v="${fx.fornecedor}">Buscar agora</button>`;
    if (!i.aguardando) h += i.status === 'paga'
      ? `<button class="btn" data-acao="cf-desmarcar" data-v="${esc(i.id)}">Desfazer pagamento</button>`
      : `<button class="btn ${i.pdf ? '' : 'pri'}" data-acao="cf-paga" data-v="${esc(i.id)}">${ui.ic('check')} Marcar como paga</button>`;
    h += `</div>`;
    if (!i.aguardando) h += `<details class="cf-mais"><summary>Corrigir valor ou vencimento</summary>
      <div class="dois-campos"><label class="campo-rot">Valor<input id="cf-i-valor" inputmode="decimal" value="${String(i.valor || '').replace('.', ',')}" autocomplete="off"></label><label class="campo-rot">Vencimento<input id="cf-i-venc" type="date" value="${i.vencimento}"></label></div>
      <div class="linha-btn"><button class="btn" data-acao="cf-i-salvar" data-v="${esc(i.id)}">Salvar</button>${i.virtual ? '' : `<button class="btn perigo" data-acao="cf-i-apagar" data-v="${esc(i.id)}">${ui.ic('lixo')} Apagar esta conta</button>`}</div>
    </details>`;
    h += `<div class="linha-btn"><button class="btn link" data-acao="cf-editar" data-v="${esc(fx.id || '')}">Editar a conta fixa</button><button class="btn link" data-acao="perguntar" data-v="${esc(`Me ajuda com a conta ${C.nomeFixa(fx)} de ${dinheiro(i.valor)}, que vence em ${dataBR(i.vencimento)}.`)}">${ui.ic('finn')} Perguntar ao Jarvis</button></div>`;
    return h;
  };

  const PRESETS = [['Academia', 'saude'], ['Aluguel', 'moradia'], ['Condomínio', 'moradia'], ['Internet', 'celular'], ['Celular', 'celular'], ['Streaming', 'assinaturas'], ['Plano de saúde', 'saude'], ['Faculdade', 'educacao'], ['Seguro', 'outros'], ['Financiamento', 'parcelas']];
  const CATS_FIXA = ['moradia', 'casa', 'celular', 'assinaturas', 'parcelas', 'educacao', 'saude', 'transporte', 'pets', 'lazer', 'outros'];
  EXT.folhas['cf-fixa'] = f => {
    const ui = U(), D = ui.D;
    const fx = f.id ? C.fixaDe(D, f.id) : (f.base || {});
    if (f.id && !fx) return null;
    const novo = !f.id, auto = !!fx.fornecedor;
    const forma = fx.forma || 'boleto';
    const bancos = [...new Set([...(D.contas || []).map(c => c.banco), 'Inter', 'Itaú', 'Nubank', 'InfinitePay'])].filter(Boolean);
    let h = cab(novo ? 'Nova conta fixa' : C.nomeFixa(fx));
    if (novo) h += `<div class="chips presets">${PRESETS.map(([n, c]) => `<button class="chip" data-acao="cf-preset" data-v="${esc(n)}|${c}">${esc(n)}</button>`).join('')}</div>`;
    if (auto) h += `<p class="muted pequeno">${esc(C.FORNECEDORES[fx.fornecedor].nome)}: o valor e o vencimento vêm da própria conta, que o Jarvis busca no site. Aqui você ajusta como paga.</p>`;
    h += `<label class="campo-rot">Nome<input id="cf-nome" value="${esc(fx.nome || '')}" placeholder="Ex.: Academia Smart Fit" autocomplete="off"></label>`;
    if (!auto) h += `<div class="dois-campos"><label class="campo-rot">Valor<input id="cf-valor" inputmode="decimal" value="${fx.valor ? String(fx.valor).replace('.', ',') : ''}" placeholder="0,00" autocomplete="off"></label>
      <label class="campo-rot">Vence todo dia<select id="cf-dia">${Array.from({ length: 31 }, (_, k) => k + 1).map(d => `<option ${Number(fx.dia || 10) === d ? 'selected' : ''}>${d}</option>`).join('')}</select></label></div>
      <label class="chk-linha"><input type="checkbox" id="cf-variavel" ${fx.variavel ? 'checked' : ''}> O valor muda todo mês</label>`;
    h += `<div class="campo-rot">Como você paga<div class="seg largo seg-forma" id="cf-forma">${['debito', 'boleto', 'pix', 'cartao'].map(k => `<button class="${forma === k ? 'on' : ''}" data-acao="cf-forma" data-v="${k}">${esc(C.FORMAS_CURTAS[k])}</button>`).join('')}</div></div>
      <label class="campo-rot cf-banco" ${forma === 'debito' ? '' : 'hidden'}>Débito em qual banco?<select id="cf-banco">${bancos.map(b => `<option ${fx.banco === b ? 'selected' : ''}>${esc(b)}</option>`).join('')}<option value="">Outro</option></select></label>`;
    if (!auto) h += `<div class="dois-campos"><label class="campo-rot">Repete<select id="cf-freq"><option value="mensal" ${fx.frequencia !== 'anual' ? 'selected' : ''}>Todo mês</option><option value="anual" ${fx.frequencia === 'anual' ? 'selected' : ''}>Uma vez por ano</option></select></label>
      <label class="campo-rot cf-mes-anual" ${fx.frequencia === 'anual' ? '' : 'hidden'}>Em qual mês<select id="cf-mes-anual">${F.MESES.map((m, k) => `<option value="${k + 1}" ${Number(fx.mesAnual || 1) === k + 1 ? 'selected' : ''}>${m}</option>`).join('')}</select></label></div>
      <label class="campo-rot">Categoria<select id="cf-cat">${CATS_FIXA.map(c => `<option value="${c}" ${(fx.categoria || 'outros') === c ? 'selected' : ''}>${esc(F.CAT[c].nome)}</option>`).join('')}</select></label>
      <label class="campo-rot">Como aparece no extrato <small>(opcional — ajuda o Jarvis a dar baixa sozinho)</small><input id="cf-palavra" value="${esc(fx.palavra || '')}" placeholder="Ex.: SMARTFIT" autocomplete="off" autocapitalize="characters"></label>`;
    h += `<label class="campo-rot">Observação<textarea id="cf-obs" rows="2" placeholder="Ex.: plano anual, renova em março">${esc(fx.obs || '')}</textarea></label>`;
    if (!novo) h += `<label class="chk-linha"><input type="checkbox" id="cf-ativa" ${fx.ativa !== false ? 'checked' : ''}> Conta ativa (desmarque para pausar sem apagar)</label>`;
    h += `<div class="linha-btn"><button class="btn pri" data-acao="cf-salvar" data-v="${esc(f.id || '')}">Salvar</button>${novo ? '' : `<button class="btn perigo" data-acao="cf-apagar" data-v="${esc(f.id)}">${ui.ic('lixo')} Remover conta</button>`}</div>`;
    return h;
  };

  EXT.folhas['cf-conectar'] = f => {
    const ui = U(), D = ui.D, prov = f.prov, P = C.FORNECEDORES[prov]; if (!P) return null;
    const pc = ST.pc[prov] || {}, fx = C.fixaDe(D, C.idFixaForn(prov)), ligada = !!(fx && fx.busca && fx.busca.ligada && fx.ativa !== false);
    let h = cab((ligada ? '' : 'Conectar ') + P.nome);
    h += `<p>O Jarvis abre o <b>site oficial da ${P.nome}</b> numa janela dele${pc.credencial ? ', entra com o seu login' : ''}, pega a conta em aberto com o PDF e anexa aqui. Depois confere sozinho de 6 em 6 horas.</p>`;
    if (prov === 'cemig') h += `<p class="muted pequeno">A Cemig pede "Não sou um robô" no login. Quando pedir, a janela aparece com tudo preenchido e você só marca a caixinha. Depois de entrar, a sessão costuma durar um tempo e o Jarvis busca sem te chamar.</p>`;
    if (prov === 'claro') h += `<p class="muted pequeno">Se a Claro mandar um código por SMS ou e-mail, a janela aparece para você digitar. O PDF da Claro costuma ter senha (os 5 primeiros números do CPF) — com o login salvo, o Jarvis abre sozinho.</p>`;
    if (prov === 'copasa') h += `<p class="muted pequeno">Com o login salvo, a Copasa costuma deixar o Jarvis entrar e buscar tudo sozinho.</p>`;
    h += `<div class="cf-cred">
      <div class="rot">${ui.ic('cadeado')} Login da ${P.nome} ${pc.credencial ? `<span class="tag ativo">salvo · ${esc(pc.usuario)}</span>` : ''}</div>
      <label class="campo-rot">${prov === 'claro' ? 'CPF, celular ou e-mail' : 'CPF'}<input id="cf-usuario" autocomplete="off" autocapitalize="none" spellcheck="false" inputmode="${prov === 'claro' ? 'text' : 'numeric'}" placeholder="${pc.credencial ? 'Deixe em branco para manter o salvo' : 'Só números'}"></label>
      <label class="campo-rot">Senha do site da ${P.nome}<input id="cf-senha" type="password" autocomplete="off" placeholder="${pc.credencial ? '••••••••' : ''}"></label>
      <p class="muted pequeno">Fica criptografado pelo Windows só neste computador. Não vai para o GitHub, nem para o celular, nem para a IA. Se preferir, deixe em branco e entre direto no site quando a janela abrir.</p>
    </div>
    <div class="linha-btn"><button class="btn pri" data-acao="cf-conectar-ok" data-v="${prov}">${ligada ? 'Salvar e buscar agora' : 'Abrir o site e conectar'}</button>${pc.credencial ? `<button class="btn" data-acao="cf-esquecer" data-v="${prov}">Apagar login salvo</button>` : ''}</div>`;
    if (ligada) h += `<div class="linha-btn"><button class="btn perigo" data-acao="cf-desligar" data-v="${prov}">Desconectar a ${P.nome}</button></div>`;
    if (fx && fx.busca && fx.busca.msg) h += `<p class="muted pequeno">Última busca: ${esc(fx.busca.msg)}</p>`;
    return h;
  };

  EXT.folhas['cf-pdf'] = f => {
    const ui = U();
    const i = acharInst(f.id); if (!i || !i.pdf) return null;
    let h = cab(C.nomeFixa(i.fixa) + ' · ' + dataBR(i.vencimento));
    h += `<div class="linha-btn pdf-acoes">${ui.PC ? `<button class="btn" data-acao="cf-pdf-abrir" data-v="${esc(i.id)}">${ui.ic('exportar')} Abrir no leitor de PDF</button>` : `<button class="btn" data-acao="cf-pdf-compartilhar" data-v="${esc(i.id)}">${ui.ic('compartilhar')} Salvar ou compartilhar</button>`}${i.linha ? `<button class="btn" data-acao="cf-copiar" data-v="linha:${esc(i.id)}">${ui.ic('copiar')} Código de barras</button>` : ''}${i.pix ? `<button class="btn" data-acao="cf-copiar" data-v="pix:${esc(i.id)}">${ui.ic('copiar')} Pix</button>` : ''}</div>
      <div class="pdf-visor" id="pdf-visor"><div class="progresso"><span class="giro"></span><span>Abrindo o PDF…</span></div></div>`;
    if (!f.desenhado) setTimeout(() => mostrarPdf(i), 30);
    return h;
  };

  EXT.folhas['cf-leitura'] = f => {
    const ui = U(), D = ui.D, L = ST.pdfLido; if (!L) return null;
    const r = L.r || {};
    const alvo = L.instId ? acharInst(L.instId) : null;
    const fixas = (D.fixas || []).filter(x => x.ativa !== false);
    const sugere = alvo ? alvo.fixaId : r.fornecedor ? C.idFixaForn(r.fornecedor) : '';
    const opts = [...C.ORDEM_FORN.filter(p => !fixas.some(x => x.id === C.idFixaForn(p))).map(p => ({ id: C.idFixaForn(p), nome: `${C.FORNECEDORES[p].conta} · ${C.FORNECEDORES[p].nome}` })), ...fixas.map(x => ({ id: x.id, nome: C.nomeFixa(x) + (x.fornecedor ? ' · ' + C.FORNECEDORES[x.fornecedor].nome : '') }))];
    let h = cab('Conta em PDF');
    h += `<p class="muted pequeno">${r.confianca === 'alta' ? 'Li o PDF: confira e anexe.' : 'Li o que deu. Confira e complete o que faltar.'}</p>
      <label class="campo-rot">De qual conta é?<select id="cf-l-fixa">${opts.map(o => `<option value="${esc(o.id)}" ${o.id === sugere ? 'selected' : ''}>${esc(o.nome)}</option>`).join('')}<option value="__nova" ${!sugere ? 'selected' : ''}>Outra (criar conta fixa nova)</option></select></label>
      <label class="campo-rot cf-l-nome" ${sugere ? 'hidden' : ''}>Nome da conta nova<input id="cf-l-nome" placeholder="Ex.: Aluguel" autocomplete="off"></label>
      <div class="dois-campos"><label class="campo-rot">Valor<input id="cf-l-valor" inputmode="decimal" value="${r.valor != null ? String(r.valor.toFixed(2)).replace('.', ',') : ''}" placeholder="0,00" autocomplete="off"></label><label class="campo-rot">Vencimento<input id="cf-l-venc" type="date" value="${r.vencimento || ''}"></label></div>
      <div class="info-grade">${r.competencia ? `<span>Referente a</span><b>${esc(nomeMesCap(r.competencia))}</b>` : ''}<span>Código de barras</span><b>${r.linha ? 'lido ✓' : 'não encontrado'}</b><span>Pix</span><b>${r.pix ? 'lido ✓' : 'não encontrado'}</b></div>
      <button class="btn pri largo" data-acao="cf-l-ok">${ui.ic('clipe')} Anexar conta</button>`;
    return h;
  };

  EXT.folhas['cf-senha'] = () => {
    const ui = U();
    return cab('PDF com senha') + `<p>Esse PDF está protegido. Na Claro, a senha costuma ser os <b>5 primeiros números do CPF</b> do titular.</p>
      <label class="campo-rot">Senha do PDF<input id="cf-pdf-senha" type="password" inputmode="numeric" autocomplete="off"></label>
      <button class="btn pri largo" data-acao="cf-senha-ok">Abrir</button>`;
  };

  /* =====================================================================
     PDFs: ler, guardar, mostrar
     ===================================================================== */
  const nomeArq = (fx, fa) => `${(fx && fx.fornecedor ? C.FORNECEDORES[fx.fornecedor].nome : C.nomeFixa(fx)).replace(/[^\wÀ-ÿ -]/g, '').trim()} ${fa.ciclo || ''}.pdf`.replace(/\s+/g, ' ');
  async function bytesDoPdf(i) {
    const ui = U(), id = i.id;
    if (ST.cache.has(id)) return ST.cache.get(id);
    let b = null;
    if (ui.PC) b = await window.api.pdfLer(id);
    if (!b && ui.N.ligada() && i.pdf && i.pdf.arq) {
      b = await ui.N.baixarArquivo(i.pdf.arq);
      if (b && ui.PC) await window.api.pdfSalvar(id, b, true);
    }
    if (!b) throw new Error(ui.PC ? 'O PDF ainda não chegou neste computador.' : 'O PDF ainda não subiu do computador. Abra o Jarvis no PC conectado à internet.');
    const u8 = b instanceof Uint8Array ? b : new Uint8Array(b);
    ST.cache.set(id, u8);
    return u8;
  }
  async function mostrarPdf(i, senha) {
    const alvo = $('#pdf-visor'); if (!alvo) return;
    try {
      const b = await bytesDoPdf(i);
      let senhas = [...(ST.senhasPdf || [])];
      if (senha) senhas.unshift(senha);
      if (U().PC && i.fixa && i.fixa.fornecedor && window.api.contasSenhasPdf) senhas = senhas.concat(await window.api.contasSenhasPdf(i.fixa.fornecedor).catch(() => []));
      alvo.innerHTML = '<div class="progresso"><span class="giro"></span><span>Abrindo o PDF…</span></div>';
      const tmp = document.createElement('div'); tmp.className = 'pdf-paginas';
      await C.renderizar(b, tmp, { senhas, largura: Math.min(900, alvo.clientWidth || 600) });
      if (senha) ST.senhasPdf = [...new Set([senha, ...(ST.senhasPdf || [])])];
      alvo.innerHTML = ''; alvo.append(...tmp.children);
    } catch (e) {
      if (e.senha) {
        alvo.innerHTML = `<div class="pdf-senha"><p>${senha ? 'Senha errada. ' : ''}Esse PDF tem senha${i.fixa && i.fixa.fornecedor === 'claro' ? ' — na Claro são os <b>5 primeiros números do CPF</b>' : ''}.</p>
          <div class="linha-campo"><input type="password" id="cf-v-senha" inputmode="numeric" autocomplete="off" placeholder="Senha do PDF"><button class="btn pri" data-acao="cf-v-senha" data-v="${esc(i.id)}">Abrir</button></div></div>`;
      } else alvo.innerHTML = `<p class="muted centro">${esc(e.message)}</p>`;
    }
  }
  async function guardarPdf(fa, fx, bytes) {
    const ui = U();
    fa.pdf = { arq: `contas/${fa.id}.pdf`, nome: nomeArq(fx, fa), tamanho: bytes.length };
    ST.cache.set(fa.id, bytes);
    if (ui.PC) { await window.api.pdfSalvar(fa.id, bytes, false); enviarPendentes(); return true; }
    if (!ui.N.ligada()) throw new Error('Sem conexão com o GitHub neste aparelho.');
    await ui.N.enviarArquivo(fa.pdf.arq, bytes);
    return true;
  }
  // PDFs de contas apagadas (em qualquer aparelho) saem do cofre — só os que têm registro de apagado
  async function limparCofre() {
    const ui = U(); if (!ui.PC || !ui.N.ligada()) return 0;
    const ap = ui.D.apagados || {}, vivas = new Set((ui.D.faturas || []).map(f => f.id));
    let n = 0;
    try {
      for (const a of await ui.N.listarPasta('contas')) {
        const id = String(a.path || '').replace(/^contas\//, '').replace(/\.pdf$/, '');
        if (ap[id] && !vivas.has(id)) { await ui.N.apagarArquivo(a.path); n++; }
      }
    } catch (e) { console.warn('limpeza do cofre:', e.message); }
    return n;
  }
  let enviando = false;
  async function enviarPendentes() {
    const ui = U(); if (!ui.PC || enviando || !ui.N.ligada()) return;
    enviando = true;
    try {
      const ids = await window.api.pdfPendentes();
      const validos = new Set((ui.D.faturas || []).filter(f => f.pdf).map(f => f.id));
      for (const id of ids) {
        if (!validos.has(id)) continue;
        const b = await window.api.pdfLer(id); if (!b) continue;
        await ui.N.enviarArquivo(`contas/${id}.pdf`, b);
        await window.api.pdfEnviado(id);
      }
    } catch (e) { console.warn('PDF não subiu agora:', e.message); }
    finally { enviando = false; }
  }
  async function apagarPdfs(arqs) {
    const ui = U();
    for (const arq of arqs) {
      const id = arq.replace(/^contas\//, '').replace(/\.pdf$/, '');
      ST.cache.delete(id);
      if (ui.PC) await window.api.pdfApagar(id).catch(() => {});
      if (ui.N.ligada()) await ui.N.apagarArquivo(arq).catch(() => {});
    }
  }
  // lê um PDF escolhido pela pessoa (no PC ou no iPhone)
  async function lerArquivoEscolhido(arq, instId) {
    const ui = U();
    if (!arq) return;
    if (!/pdf$/i.test(arq.type) && !/\.pdf$/i.test(arq.name)) { ui.aviso('Escolha um arquivo PDF.', 'erro'); return; }
    if (arq.size > 8e6) { ui.aviso('PDF grande demais (máx. 8 MB).', 'erro'); return; }
    const bytes = new Uint8Array(await arq.arrayBuffer());
    ST.pdfLido = { bytes, nome: arq.name, instId, r: null, senhas: [] };
    await lerPendente();
  }
  async function lerPendente(senha) {
    const ui = U(), L = ST.pdfLido;
    ui.abrirFolha({ tipo: 'progresso', titulo: 'Lendo a conta…', texto: 'Procurando valor, vencimento, código de barras e Pix' });
    try {
      if (senha) { L.senhas = [senha]; ST.senhasPdf = [...new Set([senha, ...(ST.senhasPdf || [])])]; }
      L.r = await C.lerPdf(L.bytes, { senhas: L.senhas });
      ui.abrirFolha({ tipo: 'cf-leitura' });
    } catch (e) {
      if (e.senha) ui.abrirFolha({ tipo: 'cf-senha' });
      else { ui.fecharFolha(); ui.aviso(e.message, 'erro'); }
    }
  }

  /* =====================================================================
     BUSCA AUTOMÁTICA (PC)
     ===================================================================== */
  async function estadoPc() { if (U().PC) { try { ST.pc = await window.api.contasEstado(); } catch {} } return ST.pc; }
  async function verificar(prov, { interativo = false, manual = false } = {}) {
    const ui = U(); if (!ui.PC || ST.rodando[prov]) return null;
    ST.rodando[prov] = true; if (ui.M.tela === 'contas') ui.desenhar();
    let r = null;
    try {
      const fx = C.garantirFixa(ui.D, prov);
      fx.busca = { ...(fx.busca || {}), ligada: true };
      ui.salvar();
      r = await window.api.contasVerificar(prov, { interativo });
      // pediu você? no "Buscar agora" a janela aparece na hora
      if (manual && !interativo && r && ['entrar', 'erro', 'senha'].includes(r.estado)) r = await window.api.contasVerificar(prov, { interativo: true });
      await processar(prov, r, { manual });
      return r;
    } catch (e) {
      if (manual) ui.aviso(e.message, 'erro');
      return null;
    } finally {
      ST.rodando[prov] = false; await estadoPc(); ui.redesenhar();
    }
  }
  async function processar(prov, r, { manual = false } = {}) {
    const ui = U(), D = ui.D; if (!r) return;
    const fx = C.garantirFixa(D, prov), P = C.FORNECEDORES[prov];
    const novas = [], presentes = [];
    for (const p of r.pdfs || []) {
      const bytes = b64Bytes(p.b64);
      let lido = null;
      try { lido = await C.lerPdf(bytes, { senhas: r.senhasPdf || [] }); } catch (e) { lido = null; }
      const d = { ...(lido || {}), fornecedor: prov, origem: prov };
      delete d.texto;
      const c = (r.abertas || []).find(a => (d.linha && a.linha && so(a.linha) === d.linha) || (d.vencimento && a.vencimento === d.vencimento)) || ((r.abertas || []).length === 1 ? r.abertas[0] : null);
      if (c) { if (d.valor == null) d.valor = c.valor; if (!d.vencimento) d.vencimento = c.vencimento; if (!d.competencia) d.competencia = c.competencia; }
      const reg = C.registrar(D, d);
      if (reg.erro) { if (manual) ui.aviso(`Peguei o PDF da ${P.nome}, mas não achei o vencimento. Abra a conta e corrija.`, 'erro'); continue; }
      await guardarPdf(reg.fatura, fx, bytes);
      presentes.push({ vencimento: reg.fatura.vencimento, linha: reg.fatura.linha });
      if (reg.nova) novas.push(reg.fatura);
    }
    for (const a of (r.abertas || []).filter(a => a.status !== 'paga' && a.vencimento)) {
      presentes.push({ vencimento: a.vencimento, linha: a.linha });
      if ((D.faturas || []).some(f => f.fixaId === fx.id && (f.vencimento === a.vencimento || (a.linha && f.linha === so(a.linha))))) continue;
      const reg = C.registrar(D, { fornecedor: prov, origem: prov, vencimento: a.vencimento, valor: a.valor, competencia: a.competencia, linha: a.linha, pix: a.pix });
      if (!reg.erro && reg.nova) novas.push(reg.fatura);
    }
    if (r.completa && ['ok', 'sem-aberto'].includes(r.estado)) C.baixarAusentes(D, prov, presentes);
    fx.busca = { ...(fx.busca || {}), ligada: true, estado: r.estado, msg: r.msg || '', ultima: r.quando || new Date().toISOString(), abertas: presentes.length };
    ui.salvar();
    for (const fa of novas) {
      const t = `Chegou a ${C.nomeFixa(fx).toLowerCase()} da ${P.nome}`, x = `${fa.valor ? dinheiro(fa.valor) : 'Valor no PDF'} · vence ${dataBR(fa.vencimento)}`;
      window.api.notificar(t, x).catch(() => {});
      if (manual || ui.M.tela === 'contas') ui.aviso(`${t}: ${x}`);
    }
    if (!novas.length && manual) ui.aviso(r.estado === 'sem-aberto' ? `${P.nome}: nenhuma conta em aberto.` : r.estado === 'ok' ? `${P.nome}: conta já estava aqui, atualizei.` : r.msg || 'Busca encerrada.', ['erro', 'senha'].includes(r.estado) ? 'erro' : '');
    if (r.estado === 'entrar' && !manual) {
      const k = prov + F.hoje();
      if (!ST.avisados[k]) { ST.avisados[k] = 1; window.api.notificar(`A ${P.nome} pediu para você entrar de novo`, 'Abra o Jarvis → Contas e toque em Entrar. Leva 10 segundos.').catch(() => {}); }
    }
  }
  const b64Bytes = t => { const s = atob(t); const u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return u; };
  async function buscarTodas({ manual = false } = {}) {
    const ui = U(); if (!ui.PC) return;
    for (const prov of C.ORDEM_FORN) {
      const fx = C.fixaDe(ui.D, C.idFixaForn(prov));
      if (!fx || fx.ativa === false || !fx.busca || !fx.busca.ligada) continue;
      if (!manual && fx.busca.ultima && Date.now() - new Date(fx.busca.ultima) < 5 * 3600e3 && fx.busca.estado !== 'erro') continue;
      if (!manual && fx.busca.estado === 'entrar' && fx.busca.ultima && Date.now() - new Date(fx.busca.ultima) < 12 * 3600e3) continue;
      await verificar(prov, { interativo: false, manual });
    }
  }

  /* =====================================================================
     AÇÕES
     ===================================================================== */
  const A = EXT.acoes;
  const fecha = () => { const ui = U(); ui.fecharFolha(); ui.desenhar(); };
  A['cf-mes'] = v => { const m = v === '-1' ? F.mesAnterior(ST.mes || ymHoje()) : F.mesSeguinte(ST.mes || ymHoje()); ST.mes = m === ymHoje() ? null : m; U().desenhar(); };
  A['cf-agora'] = () => { ST.mes = null; U().desenhar(); };
  A['cf-fatura'] = v => U().abrirFolha({ tipo: 'cf-fatura', id: v });
  A['cf-fatura-ir'] = v => { const ui = U(); ui.M.tela = 'contas'; ST.mes = null; ui.desenhar(); ui.abrirFolha({ tipo: 'cf-fatura', id: v }); };
  A['cf-nova'] = () => U().abrirFolha({ tipo: 'cf-fixa', base: { forma: 'boleto', dia: 10 } });
  A['cf-editar'] = v => { if (v) U().abrirFolha({ tipo: 'cf-fixa', id: v }); };
  A['cf-preset'] = v => { const [n, c] = v.split('|'); const ui = U(); const nome = $('#cf-nome'); if (nome) nome.value = n; const cat = $('#cf-cat'); if (cat) cat.value = c; if (/Streaming/.test(n) && $('#cf-forma')) A['cf-forma']('cartao'); if (/Academia|Plano/.test(n) && $('#cf-forma')) A['cf-forma']('debito'); };
  A['cf-forma'] = v => {
    document.querySelectorAll('#cf-forma button').forEach(b => b.classList.toggle('on', b.dataset.v === v));
    const bk = $('.cf-banco'); if (bk) bk.hidden = v !== 'debito';
  };
  A['cf-salvar'] = v => {
    const ui = U(), D = ui.D;
    const nome = ($('#cf-nome') || {}).value ? $('#cf-nome').value.trim() : '';
    if (!nome) { ui.aviso('Dê um nome para a conta.', 'erro'); return; }
    const forma = (document.querySelector('#cf-forma button.on') || {}).dataset ? document.querySelector('#cf-forma button.on').dataset.v : 'boleto';
    let fx = v ? C.fixaDe(D, v) : null;
    const dados = { nome, forma, banco: forma === 'debito' ? ($('#cf-banco') || {}).value || '' : '', obs: ($('#cf-obs') || {}).value ? $('#cf-obs').value.trim() : '' };
    if ($('#cf-valor')) {
      const val = ui.numero($('#cf-valor').value);
      if (!(val > 0)) { ui.aviso('Coloque o valor da conta.', 'erro'); return; }
      Object.assign(dados, { valor: F.r2(val), dia: Number($('#cf-dia').value), variavel: $('#cf-variavel').checked, frequencia: $('#cf-freq').value, mesAnual: $('#cf-freq').value === 'anual' ? Number($('#cf-mes-anual').value) : undefined, categoria: $('#cf-cat').value, palavra: $('#cf-palavra').value.trim() });
    }
    if ($('#cf-ativa')) dados.ativa = $('#cf-ativa').checked;
    if (fx) Object.assign(fx, dados);
    else { fx = C.novaFixa(dados); D.fixas.push(fx); }
    if (dados.mesAnual === undefined) delete fx.mesAnual;
    ui.salvar(); fecha(); ui.aviso(v ? 'Conta atualizada' : 'Conta fixa adicionada');
  };
  A['cf-apagar'] = async v => {
    const ui = U(), fx = C.fixaDe(ui.D, v); if (!fx) return;
    if (!ui.certeza(`Remover "${C.nomeFixa(fx)}"? As contas já registradas dela (e os PDFs) também saem.`)) return;
    if (fx.fornecedor && ui.PC) await window.api.contasSair(fx.fornecedor).catch(() => {});
    const arqs = C.apagarFixa(ui.D, v);
    ui.salvar(); fecha(); apagarPdfs(arqs); ui.aviso('Conta removida');
  };
  A['cf-paga'] = v => { const ui = U(), i = acharInst(v); if (!i) return; C.marcarPaga(ui.D, i, { data: F.hoje(), como: 'manual' }); ui.salvar(); fecha(); ui.aviso('Marcada como paga'); };
  A['cf-desmarcar'] = v => { const ui = U(), i = acharInst(v); if (!i) return; C.desmarcar(ui.D, i); ui.salvar(); ui.desenhar(); ui.abrirFolha({ tipo: 'cf-fatura', id: v }); };
  A['cf-i-salvar'] = v => {
    const ui = U(), i = acharInst(v); if (!i) return;
    const val = ui.numero($('#cf-i-valor').value), venc = $('#cf-i-venc').value;
    if (!(val > 0) || !/^\d{4}-\d{2}-\d{2}$/.test(venc)) { ui.aviso('Confira o valor e a data.', 'erro'); return; }
    const fa = C.materializar(ui.D, i);
    fa.valor = F.r2(val);
    if (venc !== fa.vencimento) { fa.vencimento = venc; fa.ciclo = venc.slice(0, 7); }
    ui.salvar(); fecha(); ui.aviso('Conta corrigida');
  };
  A['cf-i-apagar'] = async v => {
    const ui = U(), fa = (ui.D.faturas || []).find(x => x.id === v); if (!fa) return;
    if (!ui.certeza('Apagar só esta conta (e o PDF dela)?')) return;
    ui.D.faturas = ui.D.faturas.filter(x => x.id !== v);
    ui.salvar(); fecha(); if (fa.pdf) apagarPdfs([fa.pdf.arq]);
  };
  A['cf-copiar'] = async v => {
    const ui = U(), [tipo, id] = [v.slice(0, v.indexOf(':')), v.slice(v.indexOf(':') + 1)], i = acharInst(id); if (!i) return;
    const txt = tipo === 'pix' ? i.pix : i.linha;
    const msg = tipo === 'pix' ? 'Pix copiado — cole no app do banco' : 'Código de barras copiado';
    try {
      if (ui.PC && window.api.copiar) await window.api.copiar(txt); else await navigator.clipboard.writeText(txt);
      ui.aviso(msg);
    } catch {
      const t = document.createElement('textarea'); t.value = txt; t.setAttribute('readonly', ''); t.style.cssText = 'position:fixed;opacity:0'; document.body.append(t); t.select(); t.setSelectionRange(0, txt.length);
      try { document.execCommand('copy') ? ui.aviso(msg) : ui.aviso('Não consegui copiar. Toque e segure o código para copiar.', 'erro'); } catch { ui.aviso('Não consegui copiar.', 'erro'); }
      t.remove();
    }
  };
  A['cf-ver-pdf'] = v => U().abrirFolha({ tipo: 'cf-pdf', id: v });
  A['cf-pdf-abrir'] = async v => {
    const ui = U(), i = acharInst(v); if (!i) return;
    try { await bytesDoPdf(i); const err = await window.api.pdfAbrir(i.id); if (err) ui.aviso(err, 'erro'); } catch (e) { ui.aviso(e.message, 'erro'); }
  };
  A['cf-pdf-compartilhar'] = async v => {
    const ui = U(), i = acharInst(v); if (!i) return;
    try {
      const b = await bytesDoPdf(i), nome = (i.pdf && i.pdf.nome) || 'conta.pdf';
      const arq = new File([b], nome, { type: 'application/pdf' });
      if (navigator.canShare && navigator.canShare({ files: [arq] })) await navigator.share({ files: [arq], title: nome });
      else ui.baixar(nome, new Blob([b], { type: 'application/pdf' }), 'application/pdf');
    } catch (e) { if (e && e.name !== 'AbortError') ui.aviso(e.message, 'erro'); }
  };
  A['cf-conectar'] = async v => { await estadoPc(); U().abrirFolha({ tipo: 'cf-conectar', prov: v }); };
  A['cf-conectar-ok'] = async v => {
    const ui = U(); const usu = $('#cf-usuario').value.trim(), sen = $('#cf-senha').value;
    if ((usu && !sen) || (!usu && sen)) { ui.aviso('Preencha o CPF e a senha (ou deixe os dois em branco).', 'erro'); return; }
    if (usu && v !== 'claro' && so(usu).length !== 11 && so(usu).length !== 14) { ui.aviso('O CPF tem 11 números.', 'erro'); return; }
    if (usu) await window.api.contasCredencial(v, { usuario: v === 'claro' ? usu : so(usu), senha: sen });
    ui.fecharFolha();
    const fx = C.garantirFixa(ui.D, v); fx.busca = { ...(fx.busca || {}), ligada: true, estado: fx.busca && fx.busca.estado || 'novo' }; ui.salvar(); ui.desenhar();
    ui.aviso(`Abrindo a ${C.FORNECEDORES[v].nome}…`);
    await verificar(v, { interativo: true, manual: true });
  };
  A['cf-esquecer'] = async v => { const ui = U(); await window.api.contasCredencial(v, null); await estadoPc(); ui.abrirFolha({ tipo: 'cf-conectar', prov: v }); ui.aviso('Login apagado deste computador'); };
  A['cf-desligar'] = async v => {
    const ui = U(); if (!ui.certeza(`Desconectar a ${C.FORNECEDORES[v].nome}? O login salvo e a sessão do site saem deste computador. As contas que já estão aqui continuam.`)) return;
    await window.api.contasSair(v);
    const fx = C.fixaDe(ui.D, C.idFixaForn(v)); if (fx) fx.busca = { ligada: false, estado: 'desligada' };
    ui.salvar(); await estadoPc(); fecha();
  };
  A['cf-buscar'] = async v => { const ui = U(); ui.fecharFolha(); const fx = C.fixaDe(ui.D, C.idFixaForn(v)); await verificar(v, { interativo: !!(fx && fx.busca && ['entrar', 'senha'].includes(fx.busca.estado)), manual: true }); };
  A['cf-sug-add'] = v => {
    const ui = U(), s = C.sugestoes(ui.D).find(x => x.chave === v); if (!s) return;
    if (s.fornecedor && ui.PC) return A['cf-conectar'](s.fornecedor);
    ui.abrirFolha({ tipo: 'cf-fixa', base: { nome: s.nome, valor: s.valor, dia: s.dia, categoria: s.categoria, forma: s.forma, palavra: s.chave.split(/[^A-Z0-9]+/).find(w => w.length >= 4) || '' } });
  };
  A['cf-sug-ignorar'] = v => { const ui = U(), p = F.perfil(ui.D); p.sugestoesIgnoradas = [...new Set([...(p.sugestoesIgnoradas || []), v])]; ui.salvar(); ui.desenhar(); };
  A['cf-l-ok'] = async () => {
    const ui = U(), D = ui.D, L = ST.pdfLido; if (!L) return;
    const sel = $('#cf-l-fixa').value, val = ui.numero($('#cf-l-valor').value), venc = $('#cf-l-venc').value;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(venc)) { ui.aviso('Coloque o vencimento.', 'erro'); return; }
    let fixaId = sel, fornecedor = null;
    if (sel === '__nova') {
      const nome = $('#cf-l-nome').value.trim(); if (!nome) { ui.aviso('Dê um nome para a conta nova.', 'erro'); return; }
      const fx = C.novaFixa({ nome, valor: val > 0 ? F.r2(val) : 0, dia: Number(venc.slice(8)), variavel: true, forma: L.r.pix ? 'pix' : 'boleto' }); D.fixas.push(fx); fixaId = fx.id;
    } else if (/^fx-(cemig|copasa|claro)$/.test(sel) && !C.fixaDe(D, sel)) { fornecedor = sel.slice(3); fixaId = null; }
    const reg = C.registrar(D, { fixaId, fornecedor, valor: val > 0 ? val : null, vencimento: venc, competencia: L.r.competencia, linha: L.r.linha, pix: L.r.pix, origem: 'pdf' });
    if (reg.erro) { ui.aviso(reg.erro, 'erro'); return; }
    ui.abrirFolha({ tipo: 'progresso', titulo: 'Anexando…', texto: ui.PC ? 'Guardando o PDF' : 'Enviando o PDF para o seu cofre no GitHub' });
    try { await guardarPdf(reg.fatura, reg.fixa, L.bytes); }
    catch (e) { ui.fecharFolha(); ui.aviso('Não consegui guardar o PDF: ' + e.message, 'erro'); delete reg.fatura.pdf; ui.salvar(); return; }
    ST.pdfLido = null; ui.salvar(); ST.mes = reg.fatura.vencimento <= F.addDias(F.hoje(), 35) && reg.fatura.vencimento >= ymHoje() + '-01' ? null : reg.fatura.ciclo;
    ui.M.tela = 'contas'; ui.fecharFolha(); ui.desenhar(); ui.aviso('Conta anexada'); ui.abrirFolha({ tipo: 'cf-fatura', id: reg.fatura.id });
  };
  A['cf-v-senha'] = v => { const i = acharInst(v), s2 = ($('#cf-v-senha') || {}).value; if (i && s2) mostrarPdf(i, s2); };
  A['cf-senha-ok'] = () => { const s = $('#cf-pdf-senha').value; if (!s) return; lerPendente(s); };

  // campos que mudam a folha sem redesenhar tudo
  document.addEventListener('change', async ev => {
    const t = ev.target, ui = U(); if (!ui) return;
    if (t.id === 'cf-arq' && t.files[0]) { const f = t.files[0]; t.value = ''; lerArquivoEscolhido(f, null); }
    if (t.classList && t.classList.contains('cf-arq-inst') && t.files[0]) { const f = t.files[0], inst = t.dataset.inst; t.value = ''; lerArquivoEscolhido(f, inst); }
    if (t.id === 'cf-freq') { const m = $('.cf-mes-anual'); if (m) m.hidden = t.value !== 'anual'; }
    if (t.id === 'cf-l-fixa') { const n = $('.cf-l-nome'); if (n) n.hidden = t.value !== '__nova'; }
    if (t.id === 'cf-segundo-plano') { ST.segundoPlano = await window.api.segundoPlano(t.checked); ui.aviso(ST.segundoPlano ? 'O Jarvis vai continuar buscando na bandeja' : 'Fechar a janela agora encerra o Jarvis'); }
  });

  /* =====================================================================
     LIGAÇÕES COM O RESTO DO APP
     ===================================================================== */
  EXT.telas.contas = telaContas;
  EXT.antesDeSalvar.push(D => C.casarPagamentos(D).length);
  EXT.alertas.push(D => C.alertas(D));
  EXT.aoMudar.push(tela => { if (tela !== 'contas') ST.mes = null; });
  EXT.aoIniciar.push(async () => {
    const ui = U(); if (!ui.PC) return;
    ST.segundoPlano = await window.api.segundoPlano().catch(() => false);
    await estadoPc();
    window.api.aoContas(m => {
      if (m.tipo === 'buscar-todas') buscarTodas({ manual: true });
      if (m.tipo === 'ir-contas') { ui.M.tela = 'contas'; ui.fecharFolha(); ui.desenhar(); }
    });
    const teste = window.api.teste;
    if (!teste) { setTimeout(() => buscarTodas({}), 40e3); setInterval(() => buscarTodas({}), 6 * 3600e3); }
    setTimeout(enviarPendentes, 4000); setInterval(enviarPendentes, 4 * 60e3);
    setTimeout(limparCofre, 60e3); setInterval(limparCofre, 6 * 3600e3);
    // limpa PDFs deste computador de contas que foram apagadas
    setTimeout(() => window.api.pdfLimpar((ui.D.faturas || []).filter(f => f.pdf).map(f => f.id)).catch(() => {}), 15e3);
  });
  window.__contas = { ST, verificar, processar, buscarTodas, enviarPendentes, limparCofre, lerArquivoEscolhido, bytesDoPdf, mostrarPdf, estadoPc };
})();
