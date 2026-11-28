/* Jarvis Finance — o Jarvis com memória de tudo: ferramentas de agenda, tarefas, e-mails,
   segundo cérebro e biblioteca. Assim ele não precisa que você explique tudo de novo. */
(function (G) {
  'use strict';
  const F = G.Finn, A = G.Agente, V = G.Vida, Cb = G.Cerebro, B = G.Biblioteca, Mm = G.Memoria;
  if (!A || !A.EXTRAS) return;
  const S = (type, description, extra) => ({ type, ...(description ? { description } : {}), ...extra });
  const dataOk = v => /^\d{4}-\d{2}-\d{2}$/.test(String(v || '')) ? String(v) : null;
  const horaOk = v => /^\d{1,2}:\d{2}$/.test(String(v || '')) ? String(v).padStart(5, '0') : null;
  const achaTitulo = (lista, t) => { const n = F.norm(t); if (!n) return null; return lista.find(x => F.norm(x.titulo) === n) || lista.find(x => F.norm(x.titulo).includes(n)) || lista.find(x => n.includes(F.norm(x.titulo)) && F.norm(x.titulo).length > 3) || null; };

  const FERRAMENTAS = [
    { name: 'hoje_resumo', description: 'Tudo do dia de hoje: agenda, tarefas, contas que vencem, dinheiro, e-mails não lidos, prazos de documentos, aniversários e a lição do dia. Use para "o que tenho hoje?", "como está meu dia?" e para montar briefings.' },
    { name: 'agenda', description: 'Compromissos da agenda num período (vêm do Google Agenda/iCloud conectado no computador e dos que o Jarvis anotou).',
      parameters: S('OBJECT', '', { properties: { inicio: S('STRING', 'AAAA-MM-DD'), fim: S('STRING', 'AAAA-MM-DD') }, required: ['inicio', 'fim'] }) },
    { name: 'criar_compromisso', description: 'Anota um compromisso com data (e hora, se tiver) na agenda do Jarvis. Não vai para o Google Agenda.',
      parameters: S('OBJECT', '', { properties: { titulo: S('STRING', 'O que é'), data: S('STRING', 'AAAA-MM-DD'), hora: S('STRING', 'HH:MM (opcional)'), duracao_min: S('INTEGER', 'Duração em minutos (padrão 60)'), local: S('STRING', 'Onde (opcional)') }, required: ['titulo', 'data'] }) },
    { name: 'tarefas', description: 'Lista as tarefas em aberto (atrasadas, de hoje, sem data e próximas) e as feitas hoje.' },
    { name: 'criar_tarefa', description: 'Cria uma tarefa (algo a fazer). Use quando ele disser "preciso", "tenho que", "me lembra de".',
      parameters: S('OBJECT', '', { properties: { titulo: S('STRING', 'A tarefa, começando com verbo'), quando: S('STRING', 'Dia AAAA-MM-DD (opcional)'), hora: S('STRING', 'HH:MM (opcional)'), prioridade: S('STRING', 'alta ou normal', { enum: ['alta', 'normal'] }) }, required: ['titulo'] }) },
    { name: 'concluir_tarefa', description: 'Marca uma tarefa como feita (ou desfaz).',
      parameters: S('OBJECT', '', { properties: { titulo: S('STRING', 'Nome ou parte do nome da tarefa'), desfazer: S('BOOLEAN', 'true para voltar a ficar em aberto') }, required: ['titulo'] }) },
    { name: 'emails_nao_lidos', description: 'E-mails não lidos da caixa de entrada (remetente, assunto e data; o Jarvis não lê o corpo das mensagens).' },
    { name: 'buscar_memoria', description: 'Procura no segundo cérebro (notas, documentos, contratos, pessoas, clientes, metas, ideias) e na biblioteca (livros, artigos, vídeos, grifos e anotações). Use sempre que ele perguntar algo que pode ter guardado ou estudado, ou quando precisar de contexto sobre pessoas e assuntos dele.',
      parameters: S('OBJECT', '', { properties: { consulta: S('STRING', 'O que procurar, em poucas palavras'), onde: S('STRING', 'tudo, cerebro ou biblioteca', { enum: ['tudo', 'cerebro', 'biblioteca'] }) }, required: ['consulta'] }) },
    { name: 'ler_item', description: 'Lê o conteúdo completo de uma nota, documento ou item da biblioteca pelo id que veio de buscar_memoria.',
      parameters: S('OBJECT', '', { properties: { id: S('STRING', 'id do item') }, required: ['id'] }) },
    { name: 'salvar_nota', description: 'Guarda algo no segundo cérebro: um fato, uma ideia, informação de uma pessoa ou cliente, uma meta. Use quando ele pedir para anotar ou lembrar uma informação. Se já existir uma nota com o mesmo título, acrescenta.',
      parameters: S('OBJECT', '', { properties: {
        titulo: S('STRING', 'Título curto'), texto: S('STRING', 'Conteúdo em markdown'), tipo: S('STRING', 'Tipo', { enum: Object.keys(Cb.TIPOS) }),
        tags: S('ARRAY', 'Até 5 temas', { items: S('STRING', 'tema') }), vence: S('STRING', 'Prazo/validade AAAA-MM-DD (opcional)'), fixar: S('BOOLEAN', 'true para ir junto em toda conversa (fatos importantes sobre ele)'),
        aniversario: S('STRING', 'Só para pessoas: DD/MM'), telefone: S('STRING', 'Só para pessoas/clientes (opcional)') }, required: ['titulo', 'texto'] }) },
    { name: 'biblioteca_adicionar', description: 'Adiciona um livro, artigo, vídeo, podcast, newsletter ou curso à biblioteca.',
      parameters: S('OBJECT', '', { properties: { titulo: S('STRING', 'Título'), tipo: S('STRING', 'Tipo', { enum: Object.keys(B.TIPOS) }), autor: S('STRING', 'Autor ou canal (opcional)'), url: S('STRING', 'Link (opcional)'), status: S('STRING', 'quero, consumindo ou concluido', { enum: ['quero', 'consumindo', 'concluido'] }) }, required: ['titulo'] }) },
    { name: 'biblioteca_atualizar', description: 'Atualiza um item da biblioteca: status, nota de 1 a 5, nova lição aprendida ou anotação.',
      parameters: S('OBJECT', '', { properties: { titulo: S('STRING', 'Título ou parte dele'), status: S('STRING', 'quero, consumindo ou concluido', { enum: ['quero', 'consumindo', 'concluido'] }), nota: S('INTEGER', '1 a 5'), licao: S('STRING', 'Uma lição para acrescentar'), anotacao: S('STRING', 'Texto para acrescentar às anotações') }, required: ['titulo'] }) },
  ];

  async function textos(D) {
    const caminhos = [...(D.notas || []).map(n => n.extraido && n.extraido.caminho), ...(D.biblioteca || []).map(i => i.pontos && i.pontos.caminho)].filter(Boolean);
    return G.Arquivos ? G.Arquivos.textos(caminhos) : new Map();
  }
  async function executar(nome, a, D, acoes) {
    const hoje = F.hoje();
    switch (nome) {
      case 'hoje_resumo': {
        let clima = null; try { clima = JSON.parse(localStorage.getItem('jarvis-clima') || 'null'); clima = clima && clima.dados; } catch {}
        return { agora: new Date().toLocaleString('pt-BR'), ...V.dadosDoDia(D, { hoje, climaDados: clima }) };
      }
      case 'agenda': {
        const ini = dataOk(a.inicio) || hoje, fim = dataOk(a.fim) || F.addDias(ini, 6);
        const out = [];
        for (let d = ini; d <= fim && out.length < 80; d = F.addDias(d, 1)) for (const e of V.eventosDoDia(D, d)) if (!out.some(x => x.id === e.id)) out.push({ id: e.id, dia: d, quando: e.diaInteiro ? 'dia todo' : `${V.hhmm(e.inicio)}–${V.hhmm(e.fim)}`, titulo: e.titulo, local: e.local || undefined, origem: e.origem === 'manual' ? 'anotado no Jarvis' : 'calendário' });
        return { compromissos: out, obs: (D.agenda || []).some(e => e.origem !== 'manual') ? '' : 'Nenhum calendário conectado ainda (conecta em Hoje → Agenda, no computador).' };
      }
      case 'criar_compromisso': {
        if (!String(a.titulo || '').trim()) return { ok: false, erro: 'Falta o título' };
        const ev = V.novoCompromisso({ titulo: a.titulo, data: dataOk(a.data) || hoje, hora: horaOk(a.hora), duracao: a.duracao_min, local: a.local });
        (D.agenda = D.agenda || []).push(ev);
        acoes.push(`Compromisso: ${ev.titulo} — ${F.dataBR(ev.data)}${a.hora ? ' às ' + horaOk(a.hora) : ''}`);
        return { ok: true, compromisso: { titulo: ev.titulo, data: ev.data, hora: horaOk(a.hora) } };
      }
      case 'tarefas': {
        const t = V.tarefas(D, hoje); const f = x => ({ titulo: x.titulo, quando: x.quando, hora: x.hora, prioridade: x.prioridade });
        return { atrasadas: t.atrasadas.map(f), hoje: t.hoje.map(f), sem_data: t.semData.map(f), proximas: t.proximas.slice(0, 20).map(f), feitas_hoje: t.feitasHoje.map(x => x.titulo) };
      }
      case 'criar_tarefa': {
        const titulo = String(a.titulo || '').trim(); if (!titulo) return { ok: false, erro: 'Falta a tarefa' };
        const t = V.novaTarefa({ titulo, quando: dataOk(a.quando), hora: horaOk(a.hora), prioridade: a.prioridade });
        (D.tarefas = D.tarefas || []).push(t);
        acoes.push(`Tarefa: ${t.titulo}${t.quando ? ' — ' + F.dataBR(t.quando) : ''}${t.prioridade === 'alta' ? ' (importante)' : ''}`);
        return { ok: true };
      }
      case 'concluir_tarefa': {
        const lista = (D.tarefas || []).filter(t => a.desfazer ? t.feita : !t.feita);
        const t = achaTitulo(lista, a.titulo); if (!t) return { ok: false, erro: 'Tarefa não encontrada', abertas: (D.tarefas || []).filter(x => !x.feita).map(x => x.titulo).slice(0, 20) };
        V.concluir(D, t.id, !a.desfazer);
        acoes.push(`${a.desfazer ? 'Reaberta' : 'Feita'}: ${t.titulo}`);
        return { ok: true };
      }
      case 'emails_nao_lidos': {
        const ei = F.perfil(D).emailInfo;
        if (!ei) return { obs: 'O e-mail ainda não foi conectado (Hoje → E-mails, no computador).' };
        return { caixa: ei.caixa, nao_lidos: ei.total, conferido_em: ei.em, recentes: (D.emails || []).map(e => ({ de: e.de, assunto: e.assunto, quando: e.data })) };
      }
      case 'buscar_memoria': {
        const t = await textos(D);
        const docs = [...(a.onde === 'biblioteca' ? [] : Cb.docsBusca(D, t)), ...(a.onde === 'cerebro' ? [] : B.docsBusca(D, t))];
        const r = Mm.buscar(a.consulta || '', docs, { limite: 10 });
        const sens = r.filter(x => x.doc.sensivel).length;
        return {
          encontrados: r.filter(x => !x.doc.sensivel).map(x => ({ id: x.doc.id, onde: x.doc.origem === 'cerebro' ? 'segundo cérebro' : 'biblioteca', tipo: x.doc.tipo, titulo: x.doc.titulo, detalhes: x.doc.subtitulo, trecho: x.trecho })),
          ...(sens ? { obs: `${sens} item(ns) marcado(s) como sensível também combinam, mas não são lidos pela IA. Ele pode abrir no app.` } : {}),
          ...(r.length ? {} : { obs: 'Nada encontrado com essas palavras. Tente sinônimos ou outra forma de dizer.' }),
        };
      }
      case 'ler_item': {
        const n = (D.notas || []).find(x => x.id === a.id), it = (D.biblioteca || []).find(x => x.id === a.id);
        if (n) {
          if (n.sensivel) return { erro: 'Item marcado como sensível: não é lido pela IA. Peça para ele abrir no app.' };
          const t = n.extraido ? await G.Arquivos.lerTexto(n.extraido.caminho).catch(() => null) : null;
          return { titulo: n.titulo, tipo: n.tipo, tags: n.tags, vence: n.vence, campos: n.campos, resumo: n.resumo, texto: String(n.texto || '').slice(0, 12000), conteudo_do_arquivo: t ? t.slice(0, 15000) : undefined, ligacoes: Cb.links(n.texto).map(l => l.alvo), mencionado_em: Cb.mencoes(D, n).map(x => x.titulo) };
        }
        if (it) {
          const p = it.pontos ? await G.Arquivos.lerTexto(it.pontos.caminho).catch(() => null) : null;
          return { titulo: it.titulo, autor: it.autor, tipo: it.tipo, status: B.nomeStatus(it), nota: it.nota, resumo: it.resumo, licoes: it.licoes, destaques: (it.destaques || []).slice(0, 80).map(d => d.texto), anotacoes: String(it.anotacoes || '').slice(0, 6000), pontos_chave: p ? p.slice(0, 15000) : undefined, origem_do_resumo: it.fonte === 'ia-conhecimento' ? 'conhecimento geral da IA' : it.fonte };
        }
        return { erro: 'Item não encontrado' };
      }
      case 'salvar_nota': {
        const titulo = String(a.titulo || '').trim(); if (!titulo) return { ok: false, erro: 'Falta o título' };
        D.notas = D.notas || [];
        let n = Cb.porTitulo(D, titulo);
        const campos = {}; if (a.aniversario) campos.aniversario = String(a.aniversario).slice(0, 10); if (a.telefone) campos.telefone = String(a.telefone).slice(0, 40);
        if (n) {
          if (n.sensivel) return { ok: false, erro: 'Já existe uma nota sensível com esse título; edite no app.' };
          n.texto = (n.texto ? n.texto.trimEnd() + '\n\n' : '') + String(a.texto || '').trim();
          if (a.tags) n.tags = Cb.limparTags([...(n.tags || []), ...a.tags]);
          if (dataOk(a.vence)) n.vence = a.vence;
          if (a.fixar) n.fixada = true;
          n.campos = { ...(n.campos || {}), ...campos }; n.editadoEm = new Date().toISOString();
          acoes.push(`Nota atualizada: ${n.titulo}`);
        } else {
          n = Cb.nova({ titulo, texto: a.texto, tipo: a.tipo, tags: a.tags, vence: a.vence, fixada: !!a.fixar, campos, origem: 'jarvis' });
          D.notas.push(n);
          acoes.push(`${Cb.TIPOS[n.tipo].nome} salva no cérebro: ${n.titulo}`);
        }
        return { ok: true, id: n.id };
      }
      case 'biblioteca_adicionar': {
        const titulo = String(a.titulo || '').trim(); if (!titulo) return { ok: false, erro: 'Falta o título' };
        D.biblioteca = D.biblioteca || [];
        if (achaTitulo(D.biblioteca, titulo)) return { ok: false, erro: 'Já está na biblioteca' };
        const det = a.url ? B.detectar(a.url) : {};
        const it = B.novo({ titulo, tipo: a.tipo || det.tipo || 'livro', autor: a.autor, url: det.url || a.url, status: a.status, fonte: 'manual' });
        if (it.status === 'concluido') it.concluidoEm = F.hoje();
        D.biblioteca.push(it);
        acoes.push(`Na biblioteca: ${it.titulo} (${B.TIPOS[it.tipo].nome.toLowerCase()})`);
        return { ok: true, id: it.id, obs: 'Na aba Biblioteca ele pode tocar em "Resumir com o Jarvis" para gerar resumo e lições.' };
      }
      case 'biblioteca_atualizar': {
        const it = achaTitulo(D.biblioteca || [], a.titulo); if (!it) return { ok: false, erro: 'Não achei esse item na biblioteca' };
        if (a.status && B.STATUS[a.status]) { it.status = a.status; if (a.status === 'concluido' && !it.concluidoEm) it.concluidoEm = F.hoje(); }
        if (a.nota >= 1 && a.nota <= 5) it.nota = Math.round(a.nota);
        if (a.licao) it.licoes = [...(it.licoes || []), String(a.licao).trim()].slice(-20);
        if (a.anotacao) it.anotacoes = ((it.anotacoes || '').trimEnd() + '\n\n' + String(a.anotacao).trim()).trim();
        it.editadoEm = new Date().toISOString();
        acoes.push(`Biblioteca: ${it.titulo} atualizado`);
        return { ok: true };
      }
    }
    return { erro: 'Ferramenta desconhecida' };
  }

  function contexto(D) {
    const hoje = F.hoje();
    const fixo = Cb.contextoFixo(D);
    const ev = V.eventosDoDia(D, hoje).map(e => e.diaInteiro ? e.titulo + ' (dia todo)' : V.hhmm(e.inicio) + ' ' + e.titulo).join('; ');
    const t = V.tarefas(D, hoje);
    const conta = (l, f) => { const c = {}; for (const x of l) c[f(x)] = (c[f(x)] || 0) + 1; return Object.entries(c).map(([k, v]) => `${v} ${k}`).join(', '); };
    const notas = (D.notas || []).filter(n => !n.arquivada);
    const ei = F.perfil(D).emailInfo;
    const licao = B.licaoDoDia(D, hoje);
    return `SOBRE ELE (notas fixadas no segundo cérebro)
${fixo || '(nenhuma ainda; quando ele contar algo importante sobre si — trabalho, família, objetivos —, ofereça salvar com salvar_nota e fixar: true)'}

ROTINA HOJE
- Agenda: ${ev || 'nada marcado'}.
- Tarefas: ${t.atrasadas.length} atrasada(s), ${t.hoje.length} para hoje${t.hoje.length ? ' (' + t.hoje.slice(0, 5).map(x => x.titulo).join('; ') + ')' : ''}, ${t.semData.length} sem data.
- E-mails não lidos: ${ei ? ei.total + ' na ' + ei.caixa.toLowerCase() : 'e-mail não conectado'}.
- Segundo cérebro: ${notas.length ? conta(notas, n => (Cb.TIPOS[n.tipo] || Cb.TIPOS.nota).plural.toLowerCase()) : 'vazio'}. Biblioteca: ${(D.biblioteca || []).length ? conta(D.biblioteca, i => (B.TIPOS[i.tipo] || B.TIPOS.livro).plural.toLowerCase()) : 'vazia'}.${licao ? `\n- Lição do dia: "${licao.texto}" (${licao.item.titulo}).` : ''}

MEMÓRIA E ROTINA — COMO AGIR
- Se ele perguntar algo que pode ter guardado ou estudado (um contrato, um cliente, o que um livro ensina, o que ele anotou), use buscar_memoria e, se precisar, ler_item. Cite de onde veio (título). Não invente.
- "Anota/lembra que…" (uma informação) → salvar_nota. "Preciso/tenho que…" → criar_tarefa. Algo com dia e hora → criar_compromisso.
- Itens marcados como sensíveis nunca são lidos por você; peça para ele abrir no app.
- Para "o que tenho hoje/amanhã" use hoje_resumo ou agenda. E-mails: só remetente e assunto (você não lê o conteúdo).`;
  }

  A.EXTRAS.push({ ferramentas: FERRAMENTAS, executar, contexto });
})(typeof window !== 'undefined' ? window : globalThis);
