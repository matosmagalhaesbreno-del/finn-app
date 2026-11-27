/* Jarvis Finance — importar extratos: PDF do Inter, OFX (todos os bancos), CSV e backup do próprio Jarvis Finance.
   Tudo é lido no próprio aparelho. */
(function (G) {
  'use strict';
  const F = G.Finn;
  const BANCOS = { '077': 'Inter', '341': 'Itaú', '542': 'InfinitePay', '260': 'Nubank', '001': 'Banco do Brasil', '237': 'Bradesco', '104': 'Caixa', '033': 'Santander', '336': 'C6 Bank', '323': 'Mercado Pago', '380': 'PicPay', '212': 'Banco Original', '290': 'PagBank', '197': 'Stone', '403': 'Cora', '655': 'Neon', '748': 'Sicredi', '756': 'Sicoob' };

  const valorBR = s => {
    let t = String(s ?? '').trim().replace(/R\$\s*/i, '').replace(/\s/g, '');
    let neg = /^-|^\(|-$|D$/i.test(t);
    t = t.replace(/[()\-+DC]/gi, '');
    if (/,\d{1,2}$/.test(t)) t = t.replace(/\./g, '').replace(',', '.');
    else t = t.replace(/,/g, '');
    const n = parseFloat(t);
    return isNaN(n) ? null : (neg ? -n : n);
  };
  const dataBR = s => {
    s = String(s ?? '').trim();
    let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/); if (m) return `${m[1]}-${m[2]}-${m[3]}`;
    m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/); if (m) { const a = m[3].length === 2 ? '20' + m[3] : m[3]; return `${a}-${F.pad(m[2])}-${F.pad(m[1])}`; }
    m = s.match(/^(\d{4})(\d{2})(\d{2})/); if (m) return `${m[1]}-${m[2]}-${m[3]}`;
    return null;
  };

  /* ---------- OFX ---------- */
  function lerOFX(texto, bancoEscolhido) {
    const tag = (bloco, nome) => { const m = bloco.match(new RegExp('<' + nome + '>([^<\\r\\n]*)', 'i')); return m ? m[1].trim() : ''; };
    const bankid = tag(texto, 'BANKID').replace(/^0+(?=\d{3})/, '').padStart(3, '0');
    const org = tag(texto, 'ORG');
    const banco = bancoEscolhido || BANCOS[bankid] || org || 'Banco';
    const out = [];
    for (const b of texto.split(/<STMTTRN>/i).slice(1)) {
      const bloco = b.split(/<\/STMTTRN>/i)[0];
      const v = parseFloat(tag(bloco, 'TRNAMT').replace(',', '.'));
      const data = dataBR(tag(bloco, 'DTPOSTED'));
      if (!data || !v) continue;
      const desc = [tag(bloco, 'NAME'), tag(bloco, 'MEMO')].filter(Boolean).join(' - ') || tag(bloco, 'TRNTYPE');
      out.push({ data, valor: Math.abs(v), tipo: v > 0 ? 'entrada' : 'saida', descricao: desc.replace(/&amp;/g, '&'), banco });
    }
    const bal = texto.match(/<LEDGERBAL>[\s\S]*?<BALAMT>([-\d.,]+)[\s\S]*?(?:<DTASOF>(\d{8}))?/i);
    const contas = bal ? [{ chave: `${banco}|corrente|0`, banco, nome: `Conta ${banco}`, tipo: 'corrente', saldo: parseFloat(bal[1].replace(',', '.')), atualizadoEm: new Date().toISOString(), origem: 'ofx' }] : [];
    return { transacoes: out, contas, info: { formato: 'OFX', banco } };
  }

  /* ---------- CSV ---------- */
  function linhasCSV(texto) {
    texto = texto.replace(/^﻿/, '');
    const primeira = texto.split(/\r?\n/).find(l => l.trim()) || '';
    const sep = (primeira.match(/;/g) || []).length >= (primeira.match(/,/g) || []).length ? ';' : (primeira.includes('\t') ? '\t' : ',');
    const linhas = []; let atual = [], campo = '', aspas = false;
    for (let i = 0; i < texto.length; i++) {
      const c = texto[i];
      if (aspas) { if (c === '"') { if (texto[i + 1] === '"') { campo += '"'; i++; } else aspas = false; } else campo += c; continue; }
      if (c === '"') aspas = true;
      else if (c === sep) { atual.push(campo); campo = ''; }
      else if (c === '\n' || c === '\r') { if (c === '\r' && texto[i + 1] === '\n') i++; atual.push(campo); linhas.push(atual); atual = []; campo = ''; }
      else campo += c;
    }
    if (campo || atual.length) { atual.push(campo); linhas.push(atual); }
    return linhas.filter(l => l.some(x => String(x).trim()));
  }
  function lerCSV(texto, bancoEscolhido) {
    const L = linhasCSV(texto);
    const H = s => F.norm(s).replace(/[^A-Z]/g, '');
    let hi = -1, col = {};
    for (let i = 0; i < Math.min(L.length, 15); i++) {
      const c = {};
      L[i].forEach((h, j) => {
        const n = H(h);
        if (c.data == null && /^(DATA|DATE|DT|DATALANCAMENTO|DATAMOVIMENTO)/.test(n)) c.data = j;
        else if (c.valor == null && /^(VALOR|AMOUNT|VALUE|QUANTIA|VALORRS)/.test(n)) c.valor = j;
        else if (c.desc == null && /(DESCRI|HISTORICO|TITLE|TITULO|LANCAMENTO|ESTABELECIMENTO|MEMO|DETALHE)/.test(n)) c.desc = j;
        else if (c.tipo == null && /^(TIPO|TYPE|NATUREZA|DC)$/.test(n)) c.tipo = j;
        else if (c.entrada == null && /^(ENTRADA|CREDITO|CREDIT)/.test(n)) c.entrada = j;
        else if (c.saida == null && /^(SAIDA|DEBITO|DEBIT)/.test(n)) c.saida = j;
      });
      if (c.data != null && (c.valor != null || c.entrada != null || c.saida != null)) { hi = i; col = c; break; }
    }
    if (hi < 0) throw new Error('Não achei as colunas de data e valor nesse CSV.');
    const out = [];
    for (const r of L.slice(hi + 1)) {
      const data = dataBR(r[col.data]); if (!data) continue;
      let v = null;
      if (col.valor != null) v = valorBR(r[col.valor]);
      else { const e = valorBR(r[col.entrada]) || 0, s = valorBR(r[col.saida]) || 0; v = e ? Math.abs(e) : -Math.abs(s); }
      if (!v) continue;
      if (col.tipo != null) { const t = F.norm(r[col.tipo]); if (/^(D|DEBITO|SAIDA|DEBIT|OUT)/.test(t)) v = -Math.abs(v); else if (/^(C|CREDITO|ENTRADA|CREDIT|IN)/.test(t)) v = Math.abs(v); }
      out.push({ data, valor: Math.abs(v), tipo: v > 0 ? 'entrada' : 'saida', descricao: String(r[col.desc] ?? '').trim() || 'Sem descrição', banco: bancoEscolhido || 'Banco' });
    }
    return { transacoes: out, contas: [], info: { formato: 'CSV', banco: bancoEscolhido || 'Banco' } };
  }

  /* ---------- PDF do Inter (leitor do FinControl X) ---------- */
  const carrega = url => new Promise((ok, erro) => {
    if (document.querySelector(`script[src="${url}"]`)) return ok();
    const s = document.createElement('script'); s.src = url; s.onload = ok; s.onerror = () => { s.remove(); erro(new Error('Não consegui carregar o leitor de PDF.')); }; document.head.append(s);
  });
  async function lerPDF(buf) {
    await carrega('pdf.min.js'); await carrega('extrato-pdf.js');
    const pdfjsLib = G.pdfjsLib; pdfjsLib.GlobalWorkerOptions.workerSrc = 'pdf.worker.min.js';
    const X = G.__fcxExtrato;
    const linhas = await X.linhasDoPdf(pdfjsLib, new Uint8Array(buf));
    const r = X.lerLinhas(linhas);
    if (!r.rows.length) throw new Error('Não reconheci lançamentos neste PDF. O leitor entende o extrato do Banco Inter.');
    const out = r.rows.map(row => {
      const limpo = X.limpar(row.tipo, row.texto);
      return { data: row.day, valor: Math.abs(row.valor) / 100, tipo: row.valor > 0 ? 'entrada' : 'saida', descricao: limpo && limpo !== row.tipo ? `${row.tipo} - ${limpo}` : row.tipo, banco: 'Inter' };
    });
    const contas = [{ chave: 'Inter|corrente|0', banco: 'Inter', nome: 'Conta Inter', tipo: 'corrente', saldo: r.saldoFinal / 100, atualizadoEm: new Date().toISOString(), origem: 'pdf' }];
    return { transacoes: out, contas, info: { formato: 'PDF do Inter', banco: 'Inter', conferencia: r.quebras ? `${r.quebras} linha(s) não bateram com o saldo do extrato` : 'saldo conferido linha a linha' } };
  }

  /* ---------- entrada única ---------- */
  async function ler(arquivo, { banco } = {}) {
    const nome = (arquivo.name || '').toLowerCase();
    const buf = await arquivo.arrayBuffer();
    const cabeca = new TextDecoder('latin1').decode(new Uint8Array(buf.slice(0, 600)));
    let res;
    if (nome.endsWith('.pdf') || cabeca.startsWith('%PDF')) res = await lerPDF(buf);
    else {
      let texto = new TextDecoder('utf-8').decode(buf);
      if (texto.includes('�')) texto = new TextDecoder('windows-1252').decode(buf);
      if (nome.endsWith('.json') || /^\s*\{/.test(texto)) {
        const j = JSON.parse(texto);
        if (!j || !Array.isArray(j.transacoes)) throw new Error('Esse JSON não é um backup do Jarvis.');
        return { backup: j, info: { formato: 'Backup do Jarvis' } };
      }
      if (nome.endsWith('.ofx') || /<OFX>|OFXHEADER/i.test(texto)) res = lerOFX(texto, banco);
      else res = lerCSV(texto, banco);
    }
    if (!res.transacoes.length) throw new Error('Não encontrei movimentações nesse arquivo.');
    const datas = res.transacoes.map(t => t.data).sort();
    res.info.de = datas[0]; res.info.ate = datas[datas.length - 1]; res.info.n = res.transacoes.length;
    return res;
  }

  G.Importa = { ler, lerOFX, lerCSV, valorBR, dataBR, BANCOS };
  if (typeof module !== 'undefined') module.exports = G.Importa;
})(typeof window !== 'undefined' ? window : globalThis);
