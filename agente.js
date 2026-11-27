/* Jarvis Finance — o agente: conversa por mensagem usando a IA do Google (Gemini) com ferramentas
   que leem e organizam os seus dados. Funciona igual no PC e no iPhone. */
(function (G) {
  'use strict';
  const F = G.Finn;
  const { dinheiro, r2, CAT, GRUPOS } = F;

  const MODELOS_PADRAO = ['gemini-2.5-flash', 'gemini-flash-latest', 'gemini-2.0-flash'];

  /* ---------- ferramentas que a IA pode usar ---------- */
  const S = (type, description, extra) => ({ type, ...(description ? { description } : {}), ...extra });
  const FERRAMENTAS = [
    { name: 'resumo_periodo', description: 'Totais de entradas e saídas num período, por grupo (contas fixas, essenciais, estilo de vida/supérfluos, Pix para pessoas, outros), por categoria e principais lugares onde o dinheiro foi gasto. Ignora transferências entre as contas do próprio usuário e compras estornadas.',
      parameters: S('OBJECT', '', { properties: { inicio: S('STRING', 'Data inicial AAAA-MM-DD'), fim: S('STRING', 'Data final AAAA-MM-DD') }, required: ['inicio', 'fim'] }) },
    { name: 'buscar_transacoes', description: 'Lista movimentações (até 60) filtrando por período, texto da descrição, categoria ou tipo. Use para responder perguntas específicas ("quanto gastei no iFood", "quais Pix mandei para a Maria").',
      parameters: S('OBJECT', '', { properties: {
        inicio: S('STRING', 'AAAA-MM-DD (opcional)'), fim: S('STRING', 'AAAA-MM-DD (opcional)'), texto: S('STRING', 'Trecho da descrição ou nome do lugar/pessoa (opcional)'),
        categoria: S('STRING', 'Id da categoria (opcional). Veja a ferramenta categorias.'), tipo: S('STRING', 'entrada ou saida (opcional)', { enum: ['entrada', 'saida'] }),
        limite: S('INTEGER', 'Máximo de linhas (padrão 40, máximo 60)') } }) },
    { name: 'contas_fixas', description: 'Gastos recorrentes detectados no extrato (luz, água, celular, assinaturas, parcelas) com valor por mês e dia em que costumam cair. Para as contas cadastradas e o que vence, use contas_a_pagar.' },
    { name: 'ver_renda', description: 'Fontes de renda cadastradas pelo usuário e o que entrou de fato nos últimos 30 dias (salário, vendas, Pix recebidos, benefícios).' },
    { name: 'atualizar_renda', description: 'Cadastra, muda ou remove uma fonte de renda. Use sempre que o usuário disser quanto ganha ou que a renda mudou.',
      parameters: S('OBJECT', '', { properties: {
        nome: S('STRING', 'Nome da fonte, ex.: Salário, Vendas, Freela'), valor: S('NUMBER', 'Valor em reais por ocorrência'),
        frequencia: S('STRING', 'mensal (padrão), quinzenal, semanal ou anual', { enum: ['mensal', 'quinzenal', 'semanal', 'anual'] }),
        dia: S('INTEGER', 'Dia do mês em que costuma cair (opcional)'), remover: S('BOOLEAN', 'true para apagar essa fonte') }, required: ['nome'] }) },
    { name: 'definir_orcamento', description: 'Define o limite mensal de gasto de uma categoria (ex.: uber) ou de um grupo inteiro (use "grupo:estilo", "grupo:essencial", "grupo:fixo", "grupo:pessoas"). Limite 0 remove.',
      parameters: S('OBJECT', '', { properties: { categoria: S('STRING', 'Id da categoria ou grupo:<id>'), limite: S('NUMBER', 'Limite em reais por mês') }, required: ['categoria', 'limite'] }) },
    { name: 'criar_meta', description: 'Cria uma meta de dinheiro guardado (ex.: reserva de emergência).',
      parameters: S('OBJECT', '', { properties: { nome: S('STRING', 'Nome da meta'), valor_alvo: S('NUMBER', 'Quanto quer juntar'), mensal: S('NUMBER', 'Quanto guardar por mês (opcional)'), prazo: S('STRING', 'Mês alvo AAAA-MM (opcional)'), guardado: S('NUMBER', 'Quanto já tem guardado (opcional)') }, required: ['nome', 'valor_alvo'] }) },
    { name: 'atualizar_meta', description: 'Atualiza uma meta existente: adiciona valor guardado, muda o alvo ou remove.',
      parameters: S('OBJECT', '', { properties: { nome: S('STRING', 'Nome (ou parte do nome) da meta'), adicionar: S('NUMBER', 'Valor a somar no guardado'), guardado: S('NUMBER', 'Novo total guardado'), valor_alvo: S('NUMBER', 'Novo alvo'), mensal: S('NUMBER', 'Novo valor mensal'), remover: S('BOOLEAN', 'true para apagar') }, required: ['nome'] }) },
    { name: 'salvar_plano', description: 'Salva um plano financeiro e o deixa como plano ativo. Pode já criar os limites por categoria e as metas do plano. Use quando o usuário pedir para criar ou ajustar um plano, ou aceitar o que você propôs.',
      parameters: S('OBJECT', '', { properties: {
        nome: S('STRING', 'Nome curto do plano'), resumo: S('STRING', 'Resumo em 1 a 3 frases'),
        passos: S('ARRAY', 'Passos práticos, em ordem', { items: S('STRING', 'Um passo') }),
        orcamentos: S('ARRAY', 'Limites mensais a aplicar', { items: S('OBJECT', '', { properties: { categoria: S('STRING', 'Id da categoria ou grupo:<id>'), limite: S('NUMBER', 'Limite mensal') }, required: ['categoria', 'limite'] }) }),
        metas: S('ARRAY', 'Metas a criar', { items: S('OBJECT', '', { properties: { nome: S('STRING', 'Nome'), valor_alvo: S('NUMBER', 'Alvo'), mensal: S('NUMBER', 'Por mês'), prazo: S('STRING', 'AAAA-MM') }, required: ['nome', 'valor_alvo'] }) }),
      }, required: ['nome', 'resumo', 'passos'] }) },
    { name: 'recategorizar', description: 'Muda a categoria das movimentações cuja descrição contém um trecho, e cria uma regra para as próximas. Ex.: marcar os Pix para "Maiza" como Moradia se for aluguel.',
      parameters: S('OBJECT', '', { properties: { texto: S('STRING', 'Trecho da descrição'), categoria: S('STRING', 'Id da nova categoria'), criar_regra: S('BOOLEAN', 'true (padrão) para valer também para as próximas') }, required: ['texto', 'categoria'] }) },
    { name: 'mudar_grupo', description: 'Move uma categoria para outro grupo. Ex.: se o Uber é o transporte do dia a dia do usuário, mover uber para essencial.',
      parameters: S('OBJECT', '', { properties: { categoria: S('STRING', 'Id da categoria'), grupo: S('STRING', 'fixo, essencial, estilo, pessoas ou outros', { enum: ['fixo', 'essencial', 'estilo', 'pessoas', 'outros'] }) }, required: ['categoria', 'grupo'] }) },
    { name: 'projecao', description: 'Projeta os próximos meses: renda, gasto previsto (média recente ou limites do plano), sobra por mês e saldo acumulado.', parameters: S('OBJECT', '', { properties: { meses: S('INTEGER', 'Quantos meses (padrão 6)') } }) },
    { name: 'plano_sugerido', description: 'Números de partida para um plano: renda, custo essencial, reserva de emergência mínima e ideal, cortes possíveis nos supérfluos e quanto separar por mês.' },
    { name: 'categorias', description: 'Lista as categorias (id, nome e grupo).' },
    { name: 'contas_a_pagar', description: 'Contas fixas cadastradas na aba Contas: as atrasadas, as que vencem nos próximos 30 dias (valor, vencimento, forma de pagamento, se tem PDF, código de barras e Pix) e as pagas no mês. Também diz como está a busca automática da Cemig, Copasa e Claro.' },
    { name: 'nova_conta_fixa', description: 'Cadastra ou atualiza (mesmo nome) uma conta fixa: academia, aluguel, condomínio, assinatura, plano de saúde, faculdade etc. Use quando o usuário pedir para adicionar ou mudar uma conta fixa.',
      parameters: S('OBJECT', null, { properties: {
        nome: S('STRING', 'Nome da conta, ex.: Academia Smart Fit'), valor: S('NUMBER', 'Valor em reais'), dia: S('INTEGER', 'Dia do mês em que vence, de 1 a 31'),
        forma: S('STRING', 'Como paga', { enum: ['debito', 'boleto', 'pix', 'cartao'] }), banco: S('STRING', 'Banco do débito automático (só se for débito)'),
        categoria: S('STRING', 'Categoria (id ou nome), ex.: saude, moradia, assinaturas, educacao'), valor_variavel: S('BOOLEAN', 'true se o valor muda todo mês'),
        mes_anual: S('INTEGER', 'Só se for cobrada uma vez por ano: o mês, de 1 a 12'), como_aparece_no_extrato: S('STRING', 'Palavra que aparece no extrato do banco, ex.: SMARTFIT'),
      }, required: ['nome'] }) },
    { name: 'remover_conta_fixa', description: 'Remove uma conta fixa cadastrada (e as contas já registradas dela). Confirme com o usuário antes de remover.',
      parameters: S('OBJECT', null, { properties: { nome: S('STRING', 'Nome da conta fixa') }, required: ['nome'] }) },
    { name: 'marcar_conta_paga', description: 'Marca como paga a próxima conta em aberto de uma conta fixa, ou desfaz (paga=false). Use quando o usuário disser que já pagou.',
      parameters: S('OBJECT', null, { properties: { nome: S('STRING', 'Nome da conta fixa ou da empresa (ex.: Cemig, aluguel)'), paga: S('BOOLEAN', 'false para desfazer'), data: S('STRING', 'Data do pagamento AAAA-MM-DD; padrão: hoje') }, required: ['nome'] }) },
  ];

  // o Gemini recusa objetos sem propriedades
  for (const f of FERRAMENTAS) if (f.parameters && f.parameters.type === 'OBJECT' && !Object.keys(f.parameters.properties || {}).length) delete f.parameters;

  /* ---------- execução das ferramentas ---------- */
  const nomeCat = id => (CAT[id] || {}).nome || id;
  const resumoCompacto = (D, r) => ({
    periodo: `${r.de} a ${r.ate}`, entradas: r.entradas, saidas: r.saidas, resultado: r.resultado,
    por_grupo: Object.fromEntries(Object.entries(r.porGrupo).map(([g, v]) => [GRUPOS[g] ? GRUPOS[g].nome : g, v])),
    por_categoria: Object.fromEntries(Object.entries(r.porCategoria).sort((a, b) => b[1] - a[1]).map(([c, v]) => [nomeCat(c), v])),
    entradas_por_categoria: Object.fromEntries(Object.entries(r.entradasPorCategoria).map(([c, v]) => [nomeCat(c), v])),
    principais_lugares: r.lojas.slice(0, 12).map(l => `${l.nome}: ${dinheiro(l.total)} em ${l.n}x (${nomeCat(l.categoria)})`),
    estornos_ignorados: r.estornos, transferencias_entre_contas_ignoradas: r.entreContas,
  });
  const achaCat = c => {
    if (!c) return null;
    if (String(c).startsWith('grupo:')) return GRUPOS[c.slice(6)] ? c : null;
    if (CAT[c]) return c;
    const n = F.norm(c);
    const x = F.CATS.find(k => F.norm(k.nome) === n || F.norm(k.nome).includes(n) || F.norm(k.id) === n);
    return x ? x.id : null;
  };
  const agora = () => new Date().toISOString();
  // conta fixa pelo nome, pela empresa ou pelo tipo (luz, água, internet)
  function acharFixa(D, nome) {
    const C = G.Contas, n = F.norm(nome || ''); if (!C || !n) return null;
    const fs = D.fixas || [];
    const TIPOS = { LUZ: 'cemig', ENERGIA: 'cemig', AGUA: 'copasa', ESGOTO: 'copasa', INTERNET: 'claro' };
    return fs.find(x => F.norm(C.nomeFixa(x)) === n) || fs.find(x => x.fornecedor && F.norm(C.FORNECEDORES[x.fornecedor].nome) === n)
      || fs.find(x => F.norm(C.nomeFixa(x)).includes(n) || n.includes(F.norm(C.nomeFixa(x))))
      || fs.find(x => x.fornecedor && Object.entries(TIPOS).some(([k, f]) => f === x.fornecedor && n.includes(k)))
      || fs.find(x => C.chavesFixa(x).some(k => n.includes(k))) || null;
  }
  const itemConta = i => {
    const C = G.Contas, fx = i.fixa || {};
    return { conta: C.nomeFixa(fx), empresa: fx.fornecedor ? C.FORNECEDORES[fx.fornecedor].nome : null, valor: i.valor, valor_estimado: !!i.estimado, vencimento: i.vencimento, situacao: i.sit.txt, forma: C.FORMAS[fx.forma] || null, paga_em: i.pagaEm || null, tem_pdf: !!i.pdf, tem_codigo_de_barras: !!i.linha, tem_pix: !!i.pix, ainda_nao_saiu: !!i.aguardando };
  };

  function executar(nome, a, D, acoes) {
    a = a || {};
    switch (nome) {
      case 'resumo_periodo': return resumoCompacto(D, F.resumo(D, a.inicio, a.fim));
      case 'buscar_transacoes': {
        const q = F.norm(a.texto || ''), cat = a.categoria ? achaCat(a.categoria) : null;
        let ts = D.transacoes.filter(t => (!a.inicio || t.data >= a.inicio) && (!a.fim || t.data <= a.fim) && (!a.tipo || t.tipo === a.tipo) && (!cat || t.categoria === cat) && (!q || F.norm(t.descricao + ' ' + (t.nota || '')).includes(q)));
        ts = ts.sort((x, y) => y.data.localeCompare(x.data));
        const lim = Math.min(60, a.limite || 40);
        return {
          total_encontrado: ts.length, quantas_contam_nos_totais: ts.filter(F.conta).length, soma_saidas: F.soma(ts.filter(t => t.tipo === 'saida' && F.conta(t))), soma_entradas: F.soma(ts.filter(t => t.tipo === 'entrada' && F.conta(t))),
          linhas: ts.slice(0, lim).map(t => `${t.data} | ${t.banco} | ${t.tipo === 'entrada' ? '+' : '-'}${t.valor.toFixed(2)} | ${t.descricao} | ${nomeCat(t.categoria)}${F.conta(t) ? '' : ' | (fora dos totais: ' + (t.categoria === 'entre_contas' ? 'entre contas' : t._estornada || t._estornoDe ? 'estornada' : 'ignorada') + ')'}${t.nota ? ' | nota: ' + t.nota : ''}`),
        };
      }
      case 'contas_fixas': return F.contasFixas(D).map(f => ({ nome: f.nome, categoria: nomeCat(f.categoria), por_mes: f.porMes, ultimo_valor: f.ultimo, ultima_data: f.ultimaData, dia: f.dia, recorrente_em_varios_meses: f.recorrente }));
      case 'ver_renda': return { cadastrada: (D.renda || []).map(r => ({ nome: r.nome, valor: r.valor, frequencia: r.frequencia || 'mensal', dia: r.dia || null })), total_mensal_cadastrado: F.rendaMensal(D), entrou_ultimos_30_dias: F.rendaDetectada(D) };
      case 'atualizar_renda': {
        const n = F.norm(a.nome);
        let r = D.renda.find(x => F.norm(x.nome) === n);
        if (a.remover) { if (r) { D.renda = D.renda.filter(x => x !== r); acoes.push(`Renda removida: ${r.nome}`); return { ok: true }; } return { ok: false, erro: 'Fonte não encontrada' }; }
        if (!(Number(a.valor) > 0)) return { ok: false, erro: 'Informe o valor' };
        if (!r) { r = { id: F.uid(), criadoEm: agora() }; D.renda.push(r); }
        Object.assign(r, { nome: a.nome, valor: r2(a.valor), frequencia: a.frequencia || r.frequencia || 'mensal', dia: a.dia || r.dia || null, ativa: true });
        acoes.push(`Renda: ${r.nome} — ${dinheiro(r.valor)}${r.frequencia !== 'mensal' ? ' (' + r.frequencia + ')' : '/mês'}`);
        return { ok: true, total_mensal: F.rendaMensal(D) };
      }
      case 'definir_orcamento': {
        const c = achaCat(a.categoria); if (!c) return { ok: false, erro: 'Categoria não encontrada. Use a ferramenta categorias.' };
        let o = D.orcamentos.find(x => x.categoria === c);
        if (!(a.limite > 0)) { if (o) D.orcamentos = D.orcamentos.filter(x => x !== o); acoes.push(`Limite removido: ${c.startsWith('grupo:') ? GRUPOS[c.slice(6)].nome : nomeCat(c)}`); return { ok: true }; }
        if (!o) { o = { id: F.uid(), categoria: c }; D.orcamentos.push(o); }
        o.limite = r2(a.limite);
        acoes.push(`Limite: ${c.startsWith('grupo:') ? GRUPOS[c.slice(6)].nome : nomeCat(c)} — ${dinheiro(o.limite)}/mês`);
        return { ok: true };
      }
      case 'criar_meta': {
        const m = { id: F.uid(), nome: a.nome, alvo: r2(a.valor_alvo), guardado: r2(a.guardado || 0), mensal: a.mensal ? r2(a.mensal) : null, prazo: a.prazo || null, criadoEm: agora() };
        D.metas.push(m); acoes.push(`Meta: ${m.nome} — ${dinheiro(m.alvo)}`);
        return { ok: true };
      }
      case 'atualizar_meta': {
        const n = F.norm(a.nome), m = D.metas.find(x => F.norm(x.nome).includes(n));
        if (!m) return { ok: false, erro: 'Meta não encontrada', metas: D.metas.map(x => x.nome) };
        if (a.remover) { D.metas = D.metas.filter(x => x !== m); acoes.push(`Meta removida: ${m.nome}`); return { ok: true }; }
        if (a.adicionar) m.guardado = r2((m.guardado || 0) + a.adicionar);
        if (a.guardado != null) m.guardado = r2(a.guardado);
        if (a.valor_alvo) m.alvo = r2(a.valor_alvo);
        if (a.mensal != null) m.mensal = r2(a.mensal);
        acoes.push(`Meta ${m.nome}: ${dinheiro(m.guardado)} de ${dinheiro(m.alvo)}`);
        return { ok: true, meta: m };
      }
      case 'salvar_plano': {
        D.planos.forEach(p => { if (p.ativo) p.ativo = false; });
        const p = { id: F.uid(), nome: a.nome, resumo: a.resumo, passos: a.passos || [], criadoEm: agora(), ativo: true, origem: 'finn' };
        D.planos.push(p);
        for (const o of a.orcamentos || []) executar('definir_orcamento', o, D, acoes);
        for (const m of a.metas || []) {
          const ex = D.metas.find(x => F.norm(x.nome) === F.norm(m.nome));
          if (ex) executar('atualizar_meta', { nome: m.nome, valor_alvo: m.valor_alvo, mensal: m.mensal }, D, acoes);
          else executar('criar_meta', m, D, acoes);
        }
        acoes.push(`Plano salvo: ${p.nome}`);
        return { ok: true };
      }
      case 'recategorizar': {
        const c = achaCat(a.categoria); if (!c || c.startsWith('grupo:')) return { ok: false, erro: 'Categoria não encontrada' };
        const q = F.norm(a.texto); if (q.length < 3) return { ok: false, erro: 'Trecho muito curto' };
        let n = 0;
        for (const t of D.transacoes) if (F.norm(t.descricao).includes(q)) { t.categoria = c; t.catManual = true; n++; }
        if (a.criar_regra !== false) { D.regras = D.regras.filter(r => F.norm(r.padrao) !== q); D.regras.push({ id: F.uid(), padrao: a.texto, categoria: c, criadoEm: agora() }); }
        F.preparar(D);
        acoes.push(`${n} movimentaç${n === 1 ? 'ão' : 'ões'} com “${a.texto}” → ${nomeCat(c)}`);
        return { ok: true, alteradas: n };
      }
      case 'mudar_grupo': {
        const c = achaCat(a.categoria); if (!c || !GRUPOS[a.grupo]) return { ok: false, erro: 'Categoria ou grupo inválido' };
        const p = F.perfil(D); p.grupos = { ...p.grupos, [c]: a.grupo };
        acoes.push(`${nomeCat(c)} agora conta em ${GRUPOS[a.grupo].nome}`);
        return { ok: true };
      }
      case 'projecao': return F.projecao(D, Math.min(24, a.meses || 6));
      case 'plano_sugerido': { const p = F.planoSugerido(D); return { ...p, cortes: p.cortes.map(c => ({ ...c, categoria_id: c.categoria })), observacao: p.grandesFora.length ? 'Os valores ignoram compras grandes que não se repetem: ' + p.grandesFora.map(g => g.nome + ' ' + dinheiro(g.valor)).join(', ') : '' }; }
      case 'categorias': return F.CATS.filter(c => c.grupo !== 'interna').map(c => `${c.id} = ${c.nome} (${GRUPOS[F.grupoDe(c.id, D)].nome})`);
      case 'contas_a_pagar': {
        const C = G.Contas; if (!C) return { erro: 'Aba Contas indisponível' };
        const p = C.painel(D);
        return {
          hoje: F.hoje(), atrasadas: p.atrasadas.map(itemConta), a_pagar_proximos_30_dias: p.aPagar.map(itemConta), total_a_pagar: p.falta, pagas_no_mes: p.pagas.map(itemConta), total_pago_no_mes: p.pago,
          cadastradas: (D.fixas || []).map(fx => ({ nome: C.nomeFixa(fx), empresa: fx.fornecedor ? C.FORNECEDORES[fx.fornecedor].nome : null, valor: fx.valor, dia: fx.dia || null, forma: C.FORMAS[fx.forma], ativa: fx.ativa !== false, busca_automatica: fx.busca && fx.busca.ligada ? { estado: fx.busca.estado, ultima_vez: fx.busca.ultima || null } : null })),
          observacao: 'A busca automática da Cemig, Copasa e Claro roda no Jarvis do computador (aba Contas). As contas pagas aparecem sozinhas quando o pagamento entra no extrato.',
        };
      }
      case 'nova_conta_fixa': {
        const C = G.Contas; if (!C) return { erro: 'Aba Contas indisponível' };
        const nome = String(a.nome || '').trim(); if (!nome) return { ok: false, erro: 'Falta o nome da conta' };
        let fx = (D.fixas || []).find(x => F.norm(C.nomeFixa(x)) === F.norm(nome));
        const novo = !fx;
        if (novo) { if (!(a.valor > 0)) return { ok: false, erro: 'Pergunte o valor da conta antes de cadastrar' }; fx = C.novaFixa({ nome }); D.fixas = D.fixas || []; D.fixas.push(fx); }
        if (a.valor > 0) fx.valor = r2(a.valor);
        if (a.dia >= 1 && a.dia <= 31) fx.dia = Math.round(a.dia);
        if (C.FORMAS[a.forma]) fx.forma = a.forma;
        if (a.banco) fx.banco = String(a.banco);
        if (fx.forma !== 'debito') delete fx.banco;
        const cat = achaCat(a.categoria); if (cat && !cat.startsWith('grupo:')) fx.categoria = cat;
        if (typeof a.valor_variavel === 'boolean') fx.variavel = a.valor_variavel;
        if (a.mes_anual >= 1 && a.mes_anual <= 12) { fx.frequencia = 'anual'; fx.mesAnual = Math.round(a.mes_anual); }
        if (a.como_aparece_no_extrato) fx.palavra = String(a.como_aparece_no_extrato).toUpperCase().slice(0, 40);
        fx.ativa = true;
        acoes.push(`${novo ? 'Conta fixa' : 'Conta atualizada'}: ${C.nomeFixa(fx)} — ${dinheiro(fx.valor)}, dia ${fx.dia}, ${C.FORMAS[fx.forma]}`);
        return { ok: true, conta: { nome: C.nomeFixa(fx), valor: fx.valor, dia: fx.dia, forma: C.FORMAS[fx.forma], categoria: nomeCat(fx.categoria), anual: fx.frequencia === 'anual' } };
      }
      case 'remover_conta_fixa': {
        const C = G.Contas; if (!C) return { erro: 'Aba Contas indisponível' };
        const fx = acharFixa(D, a.nome); if (!fx) return { ok: false, erro: 'Conta não encontrada', cadastradas: (D.fixas || []).map(C.nomeFixa) };
        if (fx.fornecedor) { fx.ativa = false; fx.busca = { ...(fx.busca || {}), ligada: false }; acoes.push(`Pausada: ${C.nomeFixa(fx)} (${C.FORNECEDORES[fx.fornecedor].nome})`); return { ok: true, pausada: true, obs: 'Contas da Cemig, Copasa e Claro são pausadas; para apagar de vez, use a aba Contas no computador.' }; }
        C.apagarFixa(D, fx.id); acoes.push(`Conta fixa removida: ${C.nomeFixa(fx)}`);
        return { ok: true };
      }
      case 'marcar_conta_paga': {
        const C = G.Contas; if (!C) return { erro: 'Aba Contas indisponível' };
        const fx = acharFixa(D, a.nome); if (!fx) return { ok: false, erro: 'Conta não encontrada', cadastradas: (D.fixas || []).map(C.nomeFixa) };
        const p = C.painel(D);
        const cands = [...p.atrasadas, ...p.aPagar, ...p.pagas].filter(i => i.fixaId === fx.id && !i.aguardando).sort((x, y) => x.vencimento.localeCompare(y.vencimento));
        const desfazer = a.paga === false;
        const alvo = desfazer ? cands.filter(i => i.status === 'paga').pop() : cands.find(i => i.status !== 'paga');
        if (!alvo) return { ok: false, erro: desfazer ? 'Não há conta paga dessa para desfazer' : 'Não há conta em aberto dessa nos próximos 30 dias' };
        if (desfazer) C.desmarcar(D, alvo); else C.marcarPaga(D, alvo, { data: /^\d{4}-\d{2}-\d{2}$/.test(a.data || '') ? a.data : F.hoje(), como: 'manual' });
        acoes.push(`${desfazer ? 'Pagamento desfeito' : 'Paga'}: ${C.nomeFixa(fx)} de ${dinheiro(alvo.valor)} (vence ${F.dataBR(alvo.vencimento)})`);
        return { ok: true, conta: C.nomeFixa(fx), vencimento: alvo.vencimento, valor: alvo.valor, paga: !desfazer };
      }
      default: return { erro: 'Ferramenta desconhecida' };
    }
  }

  /* ---------- contexto que vai junto em toda conversa ---------- */
  function instrucoes(D) {
    const p = F.perfil(D), hoje = F.hoje(), mes = hoje.slice(0, 7);
    const r30 = F.resumo30(D), rm = F.resumoMes(D, mes), s = F.saldos(D), rb = F.rendaBase(D);
    const ds = F.datasDisponiveis(D);
    const fixas = F.contasFixas(D).slice(0, 10).map(f => `${f.nome} ~${dinheiro(f.porMes)}/mês (dia ${f.dia})`).join('; ');
    const orc = F.orcamentos(D, mes).map(o => `${o.nome}: ${dinheiro(o.gasto)} de ${dinheiro(o.limite)}`).join('; ');
    const metas = (D.metas || []).map(m => `${m.nome}: ${dinheiro(m.guardado || 0)} de ${dinheiro(m.alvo)}${m.mensal ? ', ' + dinheiro(m.mensal) + '/mês' : ''}${m.prazo ? ', até ' + m.prazo : ''}`).join('; ');
    const plano = (D.planos || []).find(x => x.ativo);
    const alertas = F.alertas(D, mes).map(a => a.titulo).join('; ');
    const grupos = Object.entries(r30.porGrupo).map(([g, v]) => `${GRUPOS[g].nome} ${dinheiro(v)}`).join(', ');
    const grandes = F.tipico30(D).grandes;
    let contasTxt = 'nenhuma cadastrada na aba Contas';
    if (G.Contas && (D.fixas || []).length) {
      const pc = G.Contas.painel(D);
      const fmt = i => `${G.Contas.nomeFixa(i.fixa)} ${i.estimado ? '~' : ''}${dinheiro(i.valor)} ${i.sit.txt.toLowerCase()}`;
      contasTxt = `${dinheiro(pc.falta)} a pagar nos próximos 30 dias${pc.atrasadas.length ? `; ATRASADAS: ${pc.atrasadas.map(fmt).join(', ')}` : ''}${pc.aPagar.length ? `; próximas: ${pc.aPagar.slice(0, 8).map(fmt).join(', ')}` : ''}; pagas em ${F.nomeMes(mes)}: ${dinheiro(pc.pago)}`;
    }
    return `Você é o Jarvis, o agente financeiro pessoal de ${p.nome || 'o usuário'}. Ele conversa com você por mensagem, no computador ou no iPhone.

JEITO DE FALAR
- Português do Brasil, direto, caloroso e prático, como um amigo que entende muito de dinheiro. Sem jargão.
- Respostas curtas que cabem na tela do celular: poucas frases ou uma lista curta. Use **negrito** só nos números principais.
- Nunca invente números: use os dados abaixo e as ferramentas. Se não souber algo (ex.: para que foi um Pix grande), pergunte.
- Seja honesto quando algo vai mal (ex.: gastou mais do que ganhou), sem julgamento e sem sermão. Mostre o caminho.
- Não diga qual empresa faz a IA por trás de você.

PRINCÍPIOS (de A Psicologia Financeira, Pai Rico Pai Pobre e The Simple Path to Wealth)
1. Comportamento vale mais que conhecimento: hábitos simples e repetidos vencem planos perfeitos.
2. Gaste menos do que ganha, sempre. A diferença é o que compra liberdade.
3. Pague-se primeiro: separe a parte de guardar no dia em que o dinheiro entra, antes de gastar.
4. Margem de segurança: reserva de emergência de 3 a 6 meses do custo essencial, num lugar seguro e com resgate no mesmo dia.
5. Fuja de dívida cara: cheque especial, adiantamento a depositante, rotativo do cartão, empréstimo pessoal.
6. Ativo coloca dinheiro no bolso, passivo tira. Antes de uma compra grande, pergunte qual dos dois é.
7. Riqueza é o que você não vê: o dinheiro que não foi gasto.
8. Depois da reserva, invista o que sobra de forma simples, diversificada e barata, por muito tempo. Juros compostos precisam de tempo. Não indique ativos específicos nem prometa rentabilidade: você não é consultor de investimentos.
9. Saiba o que é "suficiente": não aumente o padrão de vida a cada aumento de renda.

COMO AGIR
- Quando ele disser quanto ganha ou que a renda mudou, chame atualizar_renda na hora.
- Para criar um plano: use renda real e gastos reais (contas fixas, essenciais, supérfluos), proponha números concretos (quanto separar no dia do pagamento, limites por categoria, meta de reserva) e salve com salvar_plano quando ele pedir para criar ou concordar.
- Gastos supérfluos = grupo Estilo de vida. Se ele disser que algo é necessário pra ele (ex.: Uber para trabalhar), use mudar_grupo.
- Contas fixas (aba Contas): use contas_a_pagar para dizer o que vence e quanto; nova_conta_fixa quando ele falar de academia, aluguel, assinatura etc. (pergunte valor, dia e se é débito automático, boleto, Pix ou cartão se ele não disse); marcar_conta_paga quando ele disser que pagou. A busca automática da Cemig, Copasa e Claro roda no Jarvis do computador; se ele pedir para buscar, explique isso.
- Para corrigir categorias, use recategorizar. Transferências entre as contas dele não são gasto nem renda.
- Datas: hoje é ${hoje}. Os dados vão de ${ds ? ds.primeira + ' a ' + ds.ultima : '(sem dados)'}.

DADOS ATUAIS
- Saldo somado das contas: ${dinheiro(s.total)} (${s.contas.map(c => c.banco + ' ' + dinheiro(c.saldo)).join(', ') || 'sem contas'}).
- Renda para planos: ${dinheiro(rb.valor)}/mês (${rb.fonte === 'informada' ? 'informada por ele' : 'detectada: salário, vendas e benefícios dos últimos 30 dias; confirme com ele se é fixa'}). Fontes cadastradas: ${(D.renda || []).map(r => r.nome + ' ' + dinheiro(r.valor)).join('; ') || 'nenhuma'}.
- Últimos 30 dias: entrou ${dinheiro(r30.entradas)}, saiu ${dinheiro(r30.saidas)}, resultado ${dinheiro(r30.resultado, { sinal: true })}. Por grupo: ${grupos || '—'}.
- Compras grandes avulsas (não se repetem) nos 30 dias: ${grandes.map(g => g.nome + ' ' + dinheiro(g.valor) + ' em ' + g.data).join('; ') || 'nenhuma'}. Para planejar, considere o gasto típico sem elas, mas comente com ele se fizer sentido.
- Onde mais gastou (30 dias): ${r30.lojas.slice(0, 8).map(l => `${l.nome} ${dinheiro(l.total)} (${l.n}x)`).join('; ') || '—'}.
- ${F.nomeMes(mes)} até agora: entrou ${dinheiro(rm.entradas)}, saiu ${dinheiro(rm.saidas)}.
- Contas fixas da aba Contas: ${contasTxt}.
- Gastos recorrentes vistos no extrato: ${fixas || 'nenhum detectado ainda'}.
- Limites do mês: ${orc || 'nenhum definido'}.
- Metas: ${metas || 'nenhuma'}.
- Plano ativo: ${plano ? plano.nome + ' — ' + plano.resumo : 'nenhum'}.
- Alertas: ${alertas || 'nenhum'}.`;
  }

  /* ---------- conversa ---------- */
  const Agente = {
    chamada: null, // (modelo, corpo) => Promise<{status, json}>
    modelos: null, // () => Promise<{status, json}>
    modelo: null,
    configurado() { return !!this.chamada; },

    async escolherModelo() {
      try {
        const r = await this.modelos();
        if (r.status === 200 && r.json && r.json.models) {
          const nomes = r.json.models.filter(m => (m.supportedGenerationMethods || []).includes('generateContent')).map(m => m.name.replace(/^models\//, ''));
          const ok = n => /^gemini-[\d.]+-flash$/.test(n);
          const ver = n => parseFloat(n.match(/gemini-([\d.]+)/)[1]);
          const flash = nomes.filter(ok).sort((a, b) => ver(b) - ver(a));
          if (flash.length) return flash[0];
          const qualquer = nomes.find(n => /flash/.test(n) && !/lite|image|tts|audio|live|thinking|exp/.test(n));
          if (qualquer) return qualquer;
        } else if (r.status === 400 || r.status === 401 || r.status === 403) throw new Error(erroAmigavel(r.status, r.json));
      } catch (e) { if (/chave|acesso/i.test(e.message)) throw e; }
      return MODELOS_PADRAO[0];
    },

    async responder(texto, D, { aoMudar } = {}) {
      if (!this.chamada) throw new Error('Configure a IA em Ajustes primeiro.');
      const modelo = this.modelo || MODELOS_PADRAO[0];
      const historico = (D.chat || []).slice(-16).filter(m => m.texto).map(m => ({ role: m.papel === 'eu' ? 'user' : 'model', parts: [{ text: m.texto }] }));
      // a API exige que a conversa comece pelo usuário
      while (historico.length && historico[0].role !== 'user') historico.shift();
      const contents = [...historico, { role: 'user', parts: [{ text: texto }] }];
      const acoes = [];
      const corpoBase = () => ({ systemInstruction: { parts: [{ text: instrucoes(D) }] }, tools: [{ functionDeclarations: FERRAMENTAS }], generationConfig: { temperature: 0.5, maxOutputTokens: 2048 } });
      let mudou = false;
      for (let volta = 0; volta < 8; volta++) {
        const r = await this.pedir(modelo, { ...corpoBase(), contents });
        const cand = r.candidates && r.candidates[0];
        if (!cand || !cand.content) {
          const motivo = (r.promptFeedback && r.promptFeedback.blockReason) || (cand && cand.finishReason) || '';
          throw new Error('A IA não respondeu' + (motivo ? ` (${motivo})` : '') + '. Tente de novo com outras palavras.');
        }
        const partes = cand.content.parts || [];
        const chamadas = partes.filter(x => x.functionCall);
        if (!chamadas.length) {
          const resposta = partes.filter(x => x.text && !x.thought).map(x => x.text).join('').trim();
          if (mudou && aoMudar) aoMudar();
          return { texto: resposta || (acoes.length ? 'Pronto.' : 'Não consegui pensar numa resposta. Pode perguntar de outro jeito?'), acoes };
        }
        contents.push(cand.content);
        const respostas = [];
        for (const c of chamadas) {
          let saida;
          const antes = acoes.length;
          try { saida = executar(c.functionCall.name, c.functionCall.args, D, acoes); } catch (e) { saida = { erro: e.message }; }
          if (acoes.length > antes) mudou = true;
          respostas.push({ functionResponse: { name: c.functionCall.name, response: { resultado: saida } } });
        }
        contents.push({ role: 'user', parts: respostas });
        if (mudou && aoMudar) aoMudar();
      }
      if (aoMudar && mudou) aoMudar();
      return { texto: 'Fiz o que deu, mas a conversa ficou longa demais. Me pergunte de novo de forma mais direta?', acoes };
    },

    async pedir(modelo, corpo) {
      for (let t = 0; t < 3; t++) {
        let r;
        try { r = await this.chamada(modelo, corpo); } catch (e) { throw new Error(/fetch|network|load failed/i.test(e.message) ? 'Sem internet no momento.' : e.message); }
        if (r.status === 200) return r.json;
        if (r.status === 404 && t === 0) { this.modelo = modelo = await this.escolherModelo(); continue; }
        if ((r.status === 503 || r.status === 500 || r.status === 502) && t < 2) { await new Promise(ok => setTimeout(ok, 1500 * (t + 1))); continue; }
        throw new Error(erroAmigavel(r.status, r.json));
      }
      throw new Error('A IA está sobrecarregada agora. Tente de novo em instantes.');
    },
  };

  function erroAmigavel(status, json) {
    const msg = (json && json.error && json.error.message) || '';
    if (status === 400 && /API key|api_key|API_KEY_INVALID/i.test(msg)) return 'A chave da IA não é válida. Confira em Ajustes.';
    if (status === 401 || status === 403) return /ACCESS_TOKEN_TYPE|OAuth/i.test(msg) ? 'O Google recusou a chave da IA (401). No AI Studio, confira se a chave está ativa e liberada para a Gemini API, ou gere outra e cole em Ajustes.' : 'A chave da IA não tem acesso. Gere uma nova em Ajustes.';
    if (status === 429 && /limit:\s*0\b/.test(msg)) return 'Esse projeto do Google está sem cota gratuita da IA (limite 0). No AI Studio, crie a chave num projeto novo e cole em Ajustes.';
    if (status === 429) return 'Bateu o limite gratuito da IA por agora. Espere um minuto e tente de novo (se repetir, só amanhã).';
    if (status === 400) return 'A IA recusou o pedido: ' + (msg || 'erro 400');
    return `A IA respondeu com erro ${status}${msg ? ': ' + msg : ''}.`;
  }

  Agente.FERRAMENTAS = FERRAMENTAS;
  Agente.executar = executar;
  Agente.instrucoes = instrucoes;
  Agente.erroAmigavel = erroAmigavel;
  G.Agente = Agente;
  if (typeof module !== 'undefined') module.exports = Agente;
})(typeof window !== 'undefined' ? window : globalThis);
