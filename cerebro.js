/* Jarvis Finance — segundo cérebro: notas, documentos, pessoas, metas, contratos, clientes, negócios e ideias.
   Tudo num lugar só, com busca, ligações entre notas ([[assim]]), vencimentos e leitura de PDFs e fotos pela IA. */
(function (G) {
  'use strict';
  const F = G.Finn, M = G.Memoria;

  const TIPOS = {
    nota: { nome: 'Nota', plural: 'Notas', ic: 'nota', cor: '#0a84ff' },
    documento: { nome: 'Documento', plural: 'Documentos', ic: 'pdf', cor: '#5e5ce6' },
    pessoa: { nome: 'Pessoa', plural: 'Pessoas', ic: 'pessoa', cor: '#ff9f0a' },
    meta: { nome: 'Meta', plural: 'Metas', ic: 'planos', cor: '#34c759' },
    contrato: { nome: 'Contrato', plural: 'Contratos', ic: 'contrato', cor: '#bf5af2' },
    cliente: { nome: 'Cliente', plural: 'Clientes', ic: 'maleta', cor: '#ff375f' },
    negocio: { nome: 'Negócio', plural: 'Negócios', ic: 'grafico', cor: '#30b0c7' },
    ideia: { nome: 'Ideia', plural: 'Ideias', ic: 'lampada', cor: '#ffd60a' },
  };
  const tipoDe = t => (TIPOS[t] ? t : 'nota');
  const agora = () => new Date().toISOString();

  function nova(d = {}) {
    return {
      id: 'nt-' + F.uid(), tipo: tipoDe(d.tipo), titulo: String(d.titulo || '').trim().slice(0, 200) || 'Sem título', texto: String(d.texto || '').slice(0, 60000),
      tags: limparTags(d.tags), fixada: !!d.fixada, sensivel: !!d.sensivel, vence: dataOk(d.vence), campos: d.campos || {},
      origem: d.origem || 'manual', criadoEm: agora(), editadoEm: agora(),
    };
  }
  const dataOk = v => /^\d{4}-\d{2}-\d{2}$/.test(String(v || '')) ? String(v) : null;
  function limparTags(t) {
    const lista = Array.isArray(t) ? t : String(t || '').split(/[,;]+/);
    return [...new Set(lista.map(x => String(x).trim().replace(/^#/, '').toLowerCase().replace(/\s+/g, '-')).filter(x => x && x.length <= 40))].slice(0, 12);
  }
  const notas = D => D.notas || (D.notas = []);
  const porId = (D, id) => notas(D).find(n => n.id === id) || null;
  function porTitulo(D, t) { const n = F.norm(t); return notas(D).find(x => F.norm(x.titulo) === n) || null; }

  /* ---------- ligações [[Título]] e #tags ---------- */
  function links(texto) { return [...String(texto || '').matchAll(/\[\[([^\]|#]{1,200})(?:#[^\]|]*)?(?:\|([^\]]{1,200}))?\]\]/g)].map(m => ({ alvo: m[1].trim(), rotulo: (m[2] || m[1]).trim() })); }
  function tagsNoTexto(texto) { return [...String(texto || '').matchAll(/(?:^|\s)#([\p{L}\d][\p{L}\d_-]{1,39})/gu)].map(m => m[1].toLowerCase()); }
  function mencoes(D, nota) {
    const alvo = F.norm(nota.titulo);
    return notas(D).filter(n => n.id !== nota.id && links(n.texto).some(l => F.norm(l.alvo) === alvo));
  }

  /* ---------- prazos: documentos que vencem, metas com data, aniversários ---------- */
  function vencimentos(D, { hoje = F.hoje(), dias = 45 } = {}) {
    const out = [];
    for (const n of notas(D)) {
      if (!n.vence || n.arquivada) continue;
      const falta = F.difDias(hoje, n.vence);
      const aviso = Number.isFinite(n.lembrar) ? n.lembrar : (n.tipo === 'meta' ? 14 : 30);
      if (falta <= Math.max(aviso, 0) && falta >= -60 && falta <= dias) out.push({ nota: n, falta });
    }
    return out.sort((a, b) => a.falta - b.falta);
  }
  function aniversarios(D, { hoje = F.hoje(), dias = 7 } = {}) {
    const out = [];
    for (const n of notas(D)) {
      if (n.tipo !== 'pessoa' || !n.campos || !n.campos.aniversario) continue;
      const m = String(n.campos.aniversario).match(/^(\d{1,2})[/-](\d{1,2})/); if (!m) continue;
      const dd = +m[1], mm = +m[2]; if (!(dd >= 1 && dd <= 31 && mm >= 1 && mm <= 12)) continue;
      const ano = +hoje.slice(0, 4);
      let data = `${ano}-${F.pad(mm)}-${F.pad(dd)}`;
      if (data < hoje) data = `${ano + 1}-${F.pad(mm)}-${F.pad(dd)}`;
      const falta = F.difDias(hoje, data);
      if (falta <= dias) out.push({ nota: n, data, falta });
    }
    return out.sort((a, b) => a.falta - b.falta);
  }

  /* datas com cara de vencimento no texto de um documento (sem IA) */
  const MESES_TXT = { jan: 1, fev: 2, mar: 3, abr: 4, mai: 5, jun: 6, jul: 7, ago: 8, set: 9, out: 10, nov: 11, dez: 12 };
  function datasNoTexto(texto) {
    const t = String(texto || '');
    const achados = [];
    const re = /(\d{1,2})\s*[/.-]\s*(\d{1,2})\s*[/.-]\s*(\d{2,4})|(\d{1,2})\s+de\s+(jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)[a-zç]*\.?\s+de\s+(\d{4})/gi;
    for (const m of t.matchAll(re)) {
      let d, mo, a;
      if (m[1]) { d = +m[1]; mo = +m[2]; a = +m[3]; if (a < 100) a += 2000; } else { d = +m[4]; mo = MESES_TXT[m[5].toLowerCase().slice(0, 3)]; a = +m[6]; }
      if (!(d >= 1 && d <= 31 && mo >= 1 && mo <= 12 && a >= 1990 && a <= 2100)) continue;
      const antes = F.norm(t.slice(Math.max(0, m.index - 90), m.index));
      const peso = /VENC|VALID|VALIDO ATE|VIGENC|TERMINO|EXPIRA|RENOV|PRAZO|ATE O DIA|FIM DO CONTRATO|ENCERRA/.test(antes) ? 2 : /EMISSAO|EMITIDO|ASSINAD|NASC|DATA DE/.test(antes) ? -1 : 0;
      achados.push({ data: `${a}-${F.pad(mo)}-${F.pad(d)}`, peso, contexto: t.slice(Math.max(0, m.index - 50), m.index + m[0].length + 10).replace(/\s+/g, ' ').trim() });
    }
    return achados;
  }
  function venceSugerido(texto, hoje = F.hoje()) {
    const ds = datasNoTexto(texto).filter(x => x.peso > 0 && x.data >= F.addDias(hoje, -30)).sort((a, b) => b.peso - a.peso || a.data.localeCompare(b.data));
    return ds[0] ? ds[0].data : null;
  }

  /* ---------- documentos para a busca ---------- */
  // textos = Map(caminho -> texto) com o conteúdo dos arquivos que já estão no aparelho
  function docsBusca(D, textos = new Map()) {
    return notas(D).filter(n => !n.arquivada).map(n => {
      const arq = n.extraido && textos.get(n.extraido.caminho) || '';
      const campos = n.campos ? Object.entries(n.campos).filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join('; ') : '';
      const meta = [TIPOS[tipoDe(n.tipo)].nome, n.vence ? 'vence em ' + F.dataBR(n.vence) : '', campos].filter(Boolean).join(' · ');
      const texto = [n.resumo, n.texto, arq].filter(Boolean).join('\n\n');
      return { id: n.id, origem: 'cerebro', tipo: n.tipo, titulo: n.titulo, subtitulo: meta, tags: n.tags || [], texto, textoIA: [meta, n.resumo, n.texto, arq].filter(Boolean).join('\n'), sensivel: !!n.sensivel, data: n.editadoEm || n.criadoEm };
    });
  }
  // o que vai junto em toda conversa com o Jarvis: as notas fixadas ("Sobre mim") que não são sensíveis
  function contextoFixo(D, limite = 2500) {
    const fx = notas(D).filter(n => n.fixada && !n.sensivel);
    let txt = ''; for (const n of fx) { const b = `${n.titulo}: ${String(n.texto || n.resumo || '').replace(/\s+/g, ' ').trim()}`; if (txt.length + b.length > limite) break; txt += (txt ? '\n' : '') + b; }
    return txt;
  }

  /* ---------- leitura de documentos pela IA ---------- */
  const ESQUEMA_DOC = `{"tipo": "documento|contrato|pessoa|cliente|negocio|meta|ideia|nota", "titulo": "nome curto e claro", "resumo": "2 a 4 frases", "tags": ["até 5"], "vence": "AAAA-MM-DD ou null (validade, fim de contrato, renovação ou prazo principal)", "datas_importantes": [{"data": "AAAA-MM-DD", "o_que": "texto"}], "pessoas": ["nomes"], "valores": ["R$ ... e o que é"], "transcricao": "texto completo do documento (só se for imagem ou PDF escaneado)"}`;
  async function analisar({ A, texto = '', arquivo = null, nomeArquivo = '', hoje = F.hoje() }) {
    const partes = [{ text: `TAREFA: analisar_documento
Hoje é ${hoje}. Leia o documento abaixo, que o usuário guardou no segundo cérebro dele, e devolva JSON neste formato:
${ESQUEMA_DOC}
Regras: português do Brasil; não invente nada que não está no documento; números de documentos (CPF, RG, conta) não vão no resumo.
Nome do arquivo: ${nomeArquivo || '(sem nome)'}
${texto ? 'TEXTO DO DOCUMENTO:\n' + String(texto).slice(0, 60000) : 'O documento está no anexo.'}` }];
    if (arquivo) partes.push({ inlineData: { mimeType: arquivo.tipo, data: arquivo.b64 } });
    const j = await M.pedirJSON(A, partes, { max: 16384 });
    return {
      tipo: TIPOS[j.tipo] ? j.tipo : 'documento', titulo: String(j.titulo || '').slice(0, 200), resumo: String(j.resumo || '').slice(0, 1500), tags: limparTags(j.tags),
      vence: dataOk(j.vence), datas: (Array.isArray(j.datas_importantes) ? j.datas_importantes : []).filter(x => x && dataOk(x.data)).slice(0, 12).map(x => ({ data: x.data, oQue: String(x.o_que || '').slice(0, 120) })),
      pessoas: (Array.isArray(j.pessoas) ? j.pessoas : []).map(String).slice(0, 12), valores: (Array.isArray(j.valores) ? j.valores : []).map(String).slice(0, 12), transcricao: String(j.transcricao || '').slice(0, 120000),
    };
  }

  /* ---------- Obsidian / Markdown ---------- */
  const PASTA_TIPO = { pessoas: 'pessoa', pessoa: 'pessoa', people: 'pessoa', clientes: 'cliente', cliente: 'cliente', metas: 'meta', objetivos: 'meta', goals: 'meta', contratos: 'contrato', negocios: 'negocio', negócios: 'negocio', projetos: 'negocio', ideias: 'ideia', ideas: 'ideia', documentos: 'documento', docs: 'documento' };
  function frontmatter(txt) {
    const m = String(txt).match(/^﻿?---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
    if (!m) return { meta: {}, corpo: String(txt) };
    const meta = {}; let chave = null;
    for (const l of m[1].split(/\r?\n/)) {
      const kv = l.match(/^([\w-]+):\s*(.*)$/);
      if (kv) { chave = kv[1].toLowerCase(); let v = kv[2].trim(); if (/^\[.*\]$/.test(v)) v = v.slice(1, -1).split(',').map(x => x.trim().replace(/^["']|["']$/g, '')).filter(Boolean); else v = v.replace(/^["']|["']$/g, ''); meta[chave] = v; continue; }
      const it = l.match(/^\s*-\s+(.*)$/); if (it && chave) { if (!Array.isArray(meta[chave])) meta[chave] = meta[chave] ? [meta[chave]] : []; meta[chave].push(it[1].trim().replace(/^["']|["']$/g, '')); }
    }
    return { meta, corpo: String(txt).slice(m[0].length) };
  }
  function deMarkdown(caminho, conteudo, mtime) {
    const { meta, corpo } = frontmatter(conteudo);
    const partes = caminho.split('/'); const arq = partes.pop();
    const pasta = partes.map(p => F.norm(p).toLowerCase()).reverse().find(p => PASTA_TIPO[p]);
    const tipo = tipoDe(meta.tipo || meta.type || (pasta && PASTA_TIPO[pasta]) || 'nota');
    const tags = limparTags([...(Array.isArray(meta.tags) ? meta.tags : meta.tags ? [meta.tags] : []), ...tagsNoTexto(corpo)]);
    const vence = dataOk(meta.vence || meta.vencimento || meta.prazo || meta.deadline || meta.due);
    const campos = {}; for (const k of ['aniversario', 'aniversário', 'telefone', 'email', 'empresa', 'relacao', 'relação']) if (meta[k]) campos[F.norm(k).toLowerCase()] = String(meta[k]).slice(0, 120);
    return { tipo, titulo: (meta.titulo || meta.title || arq.replace(/\.md$/i, '')).toString().slice(0, 200), texto: corpo.trim().slice(0, 60000), tags, vence, campos, origem: 'obsidian', obsidian: { caminho, mtime: mtime || null } };
  }
  const nomeArquivo = t => String(t || 'Sem título').replace(/[\\/:*?"<>|#^[\]]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 90) || 'Sem título';
  function paraMarkdown(n) {
    const linhas = ['---', `tipo: ${n.tipo}`];
    if ((n.tags || []).length) linhas.push(`tags: [${n.tags.join(', ')}]`);
    if (n.vence) linhas.push(`vence: ${n.vence}`);
    for (const [k, v] of Object.entries(n.campos || {})) if (v) linhas.push(`${k}: ${String(v).replace(/\n/g, ' ')}`);
    linhas.push(`criado: ${(n.criadoEm || '').slice(0, 10)}`, '---', '');
    let corpo = n.texto || '';
    if (n.resumo) corpo = `> ${n.resumo.replace(/\n/g, '\n> ')}\n\n` + corpo;
    if (n.arquivo) corpo += `\n\nArquivo: ${n.arquivo.nome} (guardado no Jarvis)`;
    return linhas.join('\n') + corpo.trim() + '\n';
  }
  function pastaExport(n) { return TIPOS[tipoDe(n.tipo)].plural; }

  G.Cerebro = { TIPOS, tipoDe, nova, limparTags, porId, porTitulo, links, tagsNoTexto, mencoes, vencimentos, aniversarios, datasNoTexto, venceSugerido, docsBusca, contextoFixo, analisar, frontmatter, deMarkdown, paraMarkdown, nomeArquivo, pastaExport, dataOk };
})(typeof window !== 'undefined' ? window : globalThis);
