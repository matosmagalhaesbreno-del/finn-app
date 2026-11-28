/* Jarvis Finance — o Jarvis no mercado: lista de compras, onde está mais barato e quanto já foi no mês. */
(function (G) {
  'use strict';
  const F = G.Finn, A = G.Agente, M = G.Mercado;
  if (!A || !A.EXTRAS || !M) return;
  const S = (type, description, extra) => ({ type, ...(description ? { description } : {}), ...extra });
  const dataOk = v => /^\d{4}-\d{2}-\d{2}$/.test(String(v || '')) ? String(v) : null;
  const redesDe = (D, nomes) => {
    const meus = M.meusMercados(D).map(m => m.rede);
    if (!nomes || !nomes.length) return meus;
    const out = [];
    for (const n of nomes) { const r = M.redeDe(n) || meus.find(x => F.norm(M.info(D, x).nome).includes(F.norm(n))); if (r && !out.includes(r)) out.push(r); }
    return out.length ? out : meus;
  };
  const achaItem = (D, t) => { const n = F.norm(t); const l = (D.compras || []).filter(i => !i.arquivado); return l.find(i => F.norm(i.nome) === n) || l.find(i => F.norm(i.nome).includes(n) || n.includes(F.norm(i.nome))) || null; };

  const FERRAMENTAS = [
    { name: 'lista_compras', description: 'A lista de compras do mercado (itens, tamanho, marca preferida, se está acabando).' },
    { name: 'lista_adicionar', description: 'Põe itens na lista de compras. Cada item em texto livre, com quantidade e tamanho se ele disser: "2 leite integral 1L", "arroz 5kg".',
      parameters: S('OBJECT', '', { properties: { itens: S('ARRAY', 'Itens', { items: S('STRING') }), so_desta_vez: S('BOOLEAN', 'true se for só para a próxima compra (não fica na lista fixa)') }, required: ['itens'] }) },
    { name: 'lista_remover', description: 'Tira itens da lista de compras.', parameters: S('OBJECT', '', { properties: { itens: S('ARRAY', 'Nomes', { items: S('STRING') }) }, required: ['itens'] }) },
    { name: 'comparar_mercados', description: 'Compara os preços da lista de compras entre os mercados dele (encartes, sites, notas fiscais e preços anotados) para um dia. Diz onde fica mais barato, quanto economiza, se vale dividir e quais itens estão sem preço. Use para "onde compro sábado?", "o BH está mais barato que o Carrefour?".',
      parameters: S('OBJECT', '', { properties: { data: S('STRING', 'Dia da compra AAAA-MM-DD (padrão hoje)'), mercados: S('ARRAY', 'Mercados a comparar (padrão: os dele)', { items: S('STRING') }), planejar: S('BOOLEAN', 'true para marcar a compra nesse dia (o PC atualiza os preços e avisa no dia)') } }) },
    { name: 'preco_item', description: 'Os preços que o Jarvis tem de um produto em cada mercado (com a origem e a data).', parameters: S('OBJECT', '', { properties: { item: S('STRING', 'Produto, ex.: café 500g') }, required: ['item'] }) },
    { name: 'anotar_preco', description: 'Anota um preço que ele viu numa loja ("o arroz Tio João 5kg está 22,90 no Epa").',
      parameters: S('OBJECT', '', { properties: { produto: S('STRING', 'Produto com marca e tamanho'), mercado: S('STRING', 'Mercado'), preco: S('NUMBER', 'Preço em reais'), valido_ate: S('STRING', 'Se for oferta, até quando (AAAA-MM-DD)') }, required: ['produto', 'mercado', 'preco'] }) },
    { name: 'gasto_mercado', description: 'Quanto ele gastou com mercado no mês (pelos bancos), o limite do mês e em quais mercados.', parameters: S('OBJECT', '', { properties: { mes: S('STRING', 'AAAA-MM (padrão este mês)') } }) },
  ];

  async function executar(nome, a, D) {
    if (nome === 'lista_compras') {
      const l = (D.compras || []).filter(i => !i.arquivado);
      return { itens: l.map(i => { const rt = M.ritmo(D, i); return { item: M.descItem(i), desta_vez: !i.pular, fixo: i.fixo, acabando: rt && rt.acabando || undefined, compra_a_cada_dias: rt && rt.intervalo || undefined }; }), total: l.length };
    }
    if (nome === 'lista_adicionar') {
      const add = [];
      for (const t of (a.itens || []).slice(0, 30)) { const x = M.lerItem(t); if (!x) continue; const ja = achaItem(D, x.nome); if (ja) { ja.pular = false; add.push(M.descItem(ja) + ' (já estava)'); continue; } const i = M.novoItem({ ...x, fixo: !a.so_desta_vez }); (D.compras = D.compras || []).push(i); add.push(M.descItem(i)); }
      return { ok: add.length > 0, adicionados: add };
    }
    if (nome === 'lista_remover') {
      const tirados = [];
      for (const t of a.itens || []) { const i = achaItem(D, t); if (i) { D.compras = D.compras.filter(x => x !== i); tirados.push(i.nome); } }
      return { ok: tirados.length > 0, removidos: tirados };
    }
    if (nome === 'comparar_mercados') {
      const data = dataOk(a.data) || F.hoje(), redes = redesDe(D, a.mercados);
      if (!redes.length) return { erro: 'Ele ainda não escolheu os mercados. Peça para abrir Mercado → Mercados perto de casa.' };
      if (!M.itensAtivos(D).length) return { erro: 'A lista de compras está vazia.' };
      const r = M.comparar(D, { data, redes });
      if (a.planejar) { let ida = (D.idas || []).find(i => i.data === data && i.status !== 'feita'); if (!ida) { ida = M.novaIda({ data, redes }); (D.idas = D.idas || []).push(ida); } ida.redes = redes; ida.resultado = M.resumoGuardado(D, r); }
      const nomeR = id => M.info(D, id).nome;
      return {
        data, quando: M.quandoTxt(data), resumo: r.texto.replace(/\*\*/g, ''), melhor: r.melhor ? nomeR(r.melhor) : null, economia: r.economia || undefined,
        mercados: r.porRede.map(p => ({ mercado: nomeR(p.rede), itens_com_preco: p.cobertos, total_desses_itens: p.total, mais_barato_em: p.vence })),
        itens: r.linhas.map(l => ({ item: M.descItem(l.item), mais_barato: l.melhor ? nomeR(l.melhor) : null, precos: Object.fromEntries(Object.entries(l.por).map(([k, x]) => [nomeR(k), `${F.dinheiro(x.custo)} (${M.FONTES[x.o.fonte]}, ${x.quando})`])) })),
        dividir: r.dividir ? { com: nomeR(r.dividir.outra), economia: r.dividir.economia, levar_la: r.dividir.mover.map(m => m.item.nome) } : null,
        sem_preco: r.semPreco.map(i => i.nome), avisos: r.avisos, planejada: !!a.planejar,
      };
    }
    if (nome === 'preco_item') {
      const x = M.lerItem(a.item) || { nome: a.item }; const it = achaItem(D, x.nome) || M.novoItem(x);
      const out = [];
      for (const rede of new Set(M.obsDe(D).map(o => o.rede))) {
        const cs = M.candidatos(D, it, rede, { data: F.hoje() }).slice(0, 2);
        for (const c of cs) out.push({ mercado: M.info(D, rede).nome, produto: c.o.produto, preco: c.o.preco, por: c.unit ? M.fmtUnit(c.unit) : undefined, origem: M.FONTES[c.o.fonte], quando: c.quando, condicao: c.o.condicao || undefined });
      }
      return out.length ? { item: M.descItem(it), precos: out.sort((p, q) => p.preco - q.preco) } : { item: M.descItem(it), precos: [], dica: 'Sem preços desse item. Sugira ler o encarte ou escanear uma nota.' };
    }
    if (nome === 'anotar_preco') {
      const rede = M.redeDe(a.mercado) || (D.mercados || []).find(m => F.norm(m.nome).includes(F.norm(a.mercado)))?.rede || null;
      if (!rede) return { ok: false, erro: 'Não reconheci esse mercado.' };
      const ate = dataOk(a.valido_ate);
      const o = M.novaObs({ rede, produto: a.produto, preco: +a.preco, fonte: ate ? 'encarte' : 'manual', validoAte: ate, ref: ate ? 'manual' : null });
      if (!o) return { ok: false, erro: 'Preço inválido.' };
      M.addObs(D, [o]); if (!(D.mercados || []).some(m => m.rede === rede)) M.adicionarMercado(D, { rede });
      return { ok: true, anotado: `${o.produto} — ${F.dinheiro(o.preco)} no ${M.info(D, rede).nome}${ate ? ' até ' + F.dataBR(ate) : ''}` };
    }
    if (nome === 'gasto_mercado') {
      const ym = /^\d{4}-\d{2}$/.test(a.mes || '') ? a.mes : F.hoje().slice(0, 7), g = M.gastoMes(D, ym);
      return { mes: ym, gasto: g.gasto, limite: g.orcamento, compras: g.compras, por_mercado: g.porRede.map(x => ({ mercado: x.rede === 'outros' ? 'Outros' : M.info(D, x.rede).nome, valor: x.valor })) };
    }
    return { erro: 'Ferramenta desconhecida' };
  }

  function contexto(D) {
    const meus = M.meusMercados(D).map(m => M.info(D, m.rede).nome), n = M.itensAtivos(D).length, ida = M.proximaIda(D);
    if (!meus.length && !n) return '';
    return `MERCADO
- Mercados dele: ${meus.join(', ') || 'ainda não escolheu'}. Lista de compras: ${n} item(ns).${ida ? ` Próxima compra: ${M.quandoTxt(ida.data)} (${F.dataBR(ida.data)})${ida.resultado ? ' — ' + ida.resultado.frase : ''}.` : ''}
- "Onde compro?", "tá mais barato no X ou no Y?" → comparar_mercados. Mostre o resultado com os números da ferramenta; não invente preço. Diga a origem quando importar (encarte, site, nota) e que preço de site pode mudar na loja.
- "Põe/acabou o café" → lista_adicionar. "Vi o arroz a 22,90 no Epa" → anotar_preco.`;
  }

  A.EXTRAS.push({ ferramentas: FERRAMENTAS, executar, contexto });
})(typeof window !== 'undefined' ? window : globalThis);
