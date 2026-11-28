/* Jarvis Finance — biblioteca da sua vida: livros, artigos, vídeos, podcasts, newsletters e cursos.
   Cada item guarda resumo, lições, seus grifos e anotações; depois é só perguntar o que você já estudou. */
(function (G) {
  'use strict';
  const F = G.Finn, M = G.Memoria;

  const TIPOS = {
    livro: { nome: 'Livro', plural: 'Livros', ic: 'livro', cor: '#ff9f0a' },
    artigo: { nome: 'Artigo', plural: 'Artigos', ic: 'nota', cor: '#0a84ff' },
    video: { nome: 'Vídeo', plural: 'Vídeos', ic: 'play', cor: '#ff3b30' },
    podcast: { nome: 'Podcast', plural: 'Podcasts', ic: 'fone', cor: '#bf5af2' },
    newsletter: { nome: 'Newsletter', plural: 'Newsletters', ic: 'envelope', cor: '#30b0c7' },
    curso: { nome: 'Curso', plural: 'Cursos', ic: 'chapeu', cor: '#34c759' },
  };
  const STATUS = { quero: 'Quero ver', consumindo: 'Em andamento', concluido: 'Concluído' };
  const VERBO = { livro: ['Quero ler', 'Lendo', 'Lido'], artigo: ['Quero ler', 'Lendo', 'Lido'], newsletter: ['Quero ler', 'Lendo', 'Lida'], video: ['Quero ver', 'Vendo', 'Visto'], podcast: ['Quero ouvir', 'Ouvindo', 'Ouvido'], curso: ['Quero fazer', 'Fazendo', 'Concluído'] };
  const nomeStatus = (it) => { const v = VERBO[it.tipo] || VERBO.livro; return v[{ quero: 0, consumindo: 1, concluido: 2 }[it.status] ?? 0]; };
  const agora = () => new Date().toISOString();
  const itens = D => D.biblioteca || (D.biblioteca = []);

  function novo(d = {}) {
    return {
      id: d.id || 'bib-' + F.uid(), tipo: TIPOS[d.tipo] ? d.tipo : 'livro', titulo: String(d.titulo || '').trim().slice(0, 220) || 'Sem título', autor: String(d.autor || '').trim().slice(0, 140),
      url: String(d.url || '').trim().slice(0, 600), status: STATUS[d.status] ? d.status : 'quero', nota: d.nota || null, concluidoEm: d.concluidoEm || null,
      resumo: String(d.resumo || '').slice(0, 4000), licoes: (d.licoes || []).map(String).filter(Boolean).slice(0, 15), destaques: d.destaques || [], anotacoes: String(d.anotacoes || '').slice(0, 40000),
      tags: d.tags || [], fonte: d.fonte || 'manual', criadoEm: agora(), editadoEm: agora(),
    };
  }

  /* ---------- o que é o link/texto colado ---------- */
  function youtubeId(u) {
    const m = String(u || '').match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|live\/|embed\/)|youtu\.be\/)([\w-]{11})/i);
    return m ? m[1] : null;
  }
  function detectar(entrada) {
    const t = String(entrada || '').trim();
    const url = (t.match(/https?:\/\/\S+/i) || [])[0] || '';
    if (url) {
      const y = youtubeId(url);
      if (y) return { tipo: 'video', url: `https://www.youtube.com/watch?v=${y}`, youtube: y };
      if (/open\.spotify\.com\/(episode|show)|podcasts\.apple\.com|anchor\.fm|deezer\.com\/.*(episode|show)|castbox|podbean/i.test(url)) return { tipo: 'podcast', url };
      if (/substack\.com|beehiiv\.com|mailchi\.mp|newsletter|revue|convertkit/i.test(url)) return { tipo: 'newsletter', url };
      if (/udemy\.com|coursera\.org|alura\.com|hotmart\.com|edx\.org|domestika/i.test(url)) return { tipo: 'curso', url };
      return { tipo: 'artigo', url };
    }
    // "Título - Autor", "Título, de Autor" ou "Título (Autor)"
    const m = t.match(/^(.+?)\s+(?:[-–—]|,?\s+de|por)\s+([^-–—]+)$/i) || t.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
    return { tipo: 'livro', titulo: (m ? m[1] : t).trim(), autor: m ? m[2].trim() : '' };
  }

  /* ---------- grifos do Kindle (My Clippings.txt) ---------- */
  function kindle(txt) {
    const livros = new Map();
    const blocos = String(txt || '').replace(/﻿/g, '').replace(/\r\n?/g, '\n').split(/\n=+\n?/);
    for (const b of blocos) {
      const linhas = b.split('\n').map(l => l.trim());
      while (linhas.length && !linhas[0]) linhas.shift();
      if (linhas.length < 3) continue;
      const cab = linhas[0], info = linhas[1];
      const corpo = linhas.slice(2).join('\n').trim();
      if (!corpo || /marcador|bookmark/i.test(info)) continue;
      const nota = /sua nota|your note|nota em/i.test(info);
      const am = cab.match(/^(.*)\(([^()]*)\)\s*$/);
      const titulo = (am ? am[1] : cab).trim(), autor = am ? am[2].trim() : '';
      const local = (info.match(/(?:posi[çc][ãa]o|location|loc\.?)\s*([\d-]+)/i) || info.match(/(?:p[áa]gina|page)\s*([\d-]+)/i) || [])[1] || '';
      const chave = F.norm(titulo);
      if (!livros.has(chave)) livros.set(chave, { titulo, autor, destaques: [] });
      const L = livros.get(chave);
      if (nota) { L.destaques.push({ texto: corpo.slice(0, 2000), local, nota: true }); continue; }
      // o Kindle repete o grifo quando você aumenta a seleção: fica só o maior
      const n = F.norm(corpo);
      const i = L.destaques.findIndex(d => !d.nota && (F.norm(d.texto).includes(n) || n.includes(F.norm(d.texto))));
      if (i >= 0) { if (corpo.length > L.destaques[i].texto.length) L.destaques[i] = { texto: corpo.slice(0, 2000), local }; }
      else L.destaques.push({ texto: corpo.slice(0, 2000), local });
    }
    return [...livros.values()].filter(l => l.destaques.length);
  }
  function mesclarKindle(D, livros) {
    let novos = 0, grifos = 0;
    for (const L of livros) {
      const nt = F.norm(L.titulo);
      let it = itens(D).find(x => F.norm(x.titulo) === nt || (nt.length > 12 && (F.norm(x.titulo).startsWith(nt) || nt.startsWith(F.norm(x.titulo)))));
      if (!it) { it = novo({ tipo: 'livro', titulo: L.titulo, autor: L.autor, status: 'consumindo', fonte: 'kindle' }); itens(D).push(it); novos++; }
      if (!it.autor && L.autor) it.autor = L.autor;
      const ja = new Set((it.destaques || []).map(d => F.norm(d.texto)));
      for (const d of L.destaques) if (!ja.has(F.norm(d.texto))) { (it.destaques = it.destaques || []).push(d); ja.add(F.norm(d.texto)); grifos++; }
      if (it.destaques.length > 400) it.destaques = it.destaques.slice(-400);
      it.editadoEm = agora();
    }
    return { novos, grifos };
  }

  /* ---------- resumo pela IA ---------- */
  const ESQUEMA = `{"conhecido": true, "titulo": "título", "autor": "autor ou canal", "tipo": "livro|artigo|video|podcast|newsletter|curso", "resumo": "3 a 5 frases", "licoes": ["5 a 8 lições práticas, cada uma numa frase"], "pontos_chave": "notas detalhadas em markdown (tópicos), com exemplos e números que aparecem no conteúdo", "tags": ["até 5 temas"]}`;
  async function resumir({ A, item, texto = '', urlDireta = false }) {
    const base = `Resuma para a biblioteca pessoal do usuário (alguém que quer lembrar e aplicar o que estudou). Português do Brasil.
Devolva JSON neste formato: ${ESQUEMA}`;
    let partes, ferramentas = null, fonte;
    if (item.tipo === 'video' && youtubeId(item.url)) {
      partes = [{ fileData: { fileUri: item.url } }, { text: `TAREFA: resumir_video\n${base}\nO vídeo está anexado. Se não conseguir assistir, devolva "conhecido": false.` }];
      fonte = 'video';
    } else if (texto) {
      partes = [{ text: `TAREFA: resumir_conteudo\n${base}\nTítulo informado: ${item.titulo || '(nenhum)'}${item.autor ? ' — ' + item.autor : ''}\nTipo: ${item.tipo}\nCONTEÚDO:\n${String(texto).slice(0, 90000)}` }];
      fonte = 'texto';
    } else if (urlDireta && item.url) {
      partes = [{ text: `TAREFA: resumir_link\n${base}\nLeia esta página: ${item.url}\nSe não conseguir abrir, devolva "conhecido": false.` }];
      ferramentas = [{ urlContext: {} }]; fonte = 'texto';
    } else {
      partes = [{ text: `TAREFA: resumir_livro\n${base}\nUse o seu conhecimento geral sobre esta obra: "${item.titulo}"${item.autor ? ' de ' + item.autor : ''} (${item.tipo}). Se você não conhece a obra com segurança, devolva "conhecido": false e deixe o resto vazio — não invente.` }];
      fonte = 'ia-conhecimento';
    }
    const j = await M.pedirJSON(A, partes, { ferramentas, max: 16384 });
    if (j.conhecido === false && !j.resumo) return { conhecido: false };
    return {
      conhecido: true, fonte, titulo: String(j.titulo || '').slice(0, 220), autor: String(j.autor || '').slice(0, 140), tipo: TIPOS[j.tipo] ? j.tipo : null,
      resumo: String(j.resumo || '').slice(0, 4000), licoes: (Array.isArray(j.licoes) ? j.licoes : []).map(String).filter(Boolean).slice(0, 12),
      pontos: String(j.pontos_chave || '').slice(0, 60000), tags: (Array.isArray(j.tags) ? j.tags : []).map(x => String(x).toLowerCase()).slice(0, 6),
    };
  }

  /* ---------- lição do dia (a mesma o dia inteiro, em todos os aparelhos) ---------- */
  function licoes(D) {
    const out = [];
    for (const it of itens(D)) {
      if (it.status === 'quero') continue;
      for (const l of it.licoes || []) out.push({ texto: l, item: it });
      for (const d of (it.destaques || []).filter(d => !d.nota && d.texto.length >= 40 && d.texto.length <= 320)) out.push({ texto: d.texto, item: it, grifo: true });
    }
    return out;
  }
  function licaoDoDia(D, data = F.hoje()) {
    const ls = licoes(D); if (!ls.length) return null;
    let h = 0; for (const c of data) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    return ls[h % ls.length];
  }

  /* ---------- para a busca ---------- */
  function docsBusca(D, textos = new Map()) {
    return itens(D).map(it => {
      const extra = it.pontos && textos.get(it.pontos.caminho) || '';
      const grifos = (it.destaques || []).map(d => (d.nota ? 'Minha nota: ' : '“') + d.texto + (d.nota ? '' : '”')).join('\n');
      const sub = [TIPOS[it.tipo] ? TIPOS[it.tipo].nome : '', it.autor, nomeStatus(it)].filter(Boolean).join(' · ');
      const texto = [it.resumo, (it.licoes || []).map(l => '• ' + l).join('\n'), it.anotacoes, grifos, extra].filter(Boolean).join('\n\n');
      return { id: it.id, origem: 'biblioteca', tipo: it.tipo, titulo: it.titulo, subtitulo: sub, tags: it.tags || [], texto, textoIA: (it.fonte === 'ia-conhecimento' ? '(resumo feito pela IA a partir do conhecimento geral)\n' : '') + texto, sensivel: false, data: it.concluidoEm || it.editadoEm };
    });
  }

  /* ---------- os 3 livros que já guiam o Jarvis ---------- */
  function semente() {
    const obs = 'Adicionado pelo Jarvis com as ideias principais do livro. Ajuste o status se ainda não leu e acrescente as suas anotações.';
    return [
      { id: 'bib-psicologia-financeira', tipo: 'livro', titulo: 'A Psicologia Financeira', autor: 'Morgan Housel', status: 'concluido', fonte: 'jarvis', tags: ['dinheiro', 'comportamento'],
        resumo: 'Mostra que o sucesso com dinheiro depende mais de comportamento do que de inteligência ou fórmulas. Histórias pessoais, emoções, sorte e risco moldam as decisões de cada um; quem sabe esperar, guardar margem de segurança e reconhecer o que é suficiente tende a ir mais longe.',
        licoes: ['Com dinheiro, comportamento vale mais do que inteligência: hábitos simples repetidos por anos vencem estratégias brilhantes.', 'Saiba o que é "suficiente": quem não sabe parar arrisca o que tem e precisa pelo que não tem e não precisa.', 'Juros compostos precisam de tempo: o mais importante é continuar no jogo e não ser expulso por um erro grande.', 'Riqueza é o que você não vê: é o dinheiro que deixou de ser gasto.', 'Guarde dinheiro mesmo sem um motivo específico: a margem de segurança paga os imprevistos que sempre aparecem.', 'Julgue decisões pelo processo, não só pelo resultado: sorte e risco andam juntos.', 'O maior dividendo do dinheiro é controlar o próprio tempo.'], anotacoes: obs },
      { id: 'bib-pai-rico-pai-pobre', tipo: 'livro', titulo: 'Pai Rico, Pai Pobre', autor: 'Robert T. Kiyosaki', status: 'concluido', fonte: 'jarvis', tags: ['dinheiro', 'educação financeira'],
        resumo: 'Compara a mentalidade de dois "pais" para mostrar a diferença entre trabalhar pelo dinheiro e fazer o dinheiro trabalhar para você. O ponto central é aprender educação financeira na prática: entender o que é ativo e passivo e construir fontes de renda além do salário.',
        licoes: ['Ativo coloca dinheiro no seu bolso; passivo tira. Antes de comprar algo grande, pergunte qual dos dois é.', 'A classe média trabalha pelo dinheiro; os ricos fazem o dinheiro trabalhar por eles.', 'Educação financeira não vem da escola: estude o básico de contabilidade, investimentos e mercado.', 'Cuide do seu próprio negócio: construa uma coluna de ativos além do salário.', 'Pague-se primeiro: separe a parte de guardar antes de pagar as outras contas.', 'Medo e cobiça movem as decisões com dinheiro; reconheça essas emoções antes de agir.'], anotacoes: obs },
      { id: 'bib-simple-path-wealth', tipo: 'livro', titulo: 'The Simple Path to Wealth', autor: 'JL Collins', status: 'concluido', fonte: 'jarvis', tags: ['dinheiro', 'investimentos'],
        resumo: 'Um guia direto para a independência financeira: gastar menos do que ganha, fugir de dívidas e investir a diferença de forma simples, barata e diversificada, mantendo o rumo nas quedas do mercado.',
        licoes: ['Gaste menos do que ganha, invista a diferença e evite dívidas: esse é o caminho inteiro.', 'Dívida cara tira a sua liberdade; quite primeiro as de juros mais altos.', 'Invista de forma simples: fundos de índice amplos e baratos, por muito tempo.', 'O mercado sobe no longo prazo, mas passa por quedas fortes; não venda no pânico.', 'Ter uma reserva te dá liberdade para dizer não a um emprego ou situação ruim.', 'Taxas altas corroem o retorno: prefira custos baixos.', 'A sua taxa de poupança é a alavanca que mais acelera a independência financeira.'], anotacoes: obs },
    ].map(d => ({ ...novo(d), id: d.id }));
  }

  G.Biblioteca = { TIPOS, STATUS, VERBO, nomeStatus, novo, detectar, youtubeId, kindle, mesclarKindle, resumir, licoes, licaoDoDia, docsBusca, semente };
})(typeof window !== 'undefined' ? window : globalThis);
