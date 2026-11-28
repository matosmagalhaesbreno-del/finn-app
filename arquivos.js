/* Jarvis Finance — arquivos do segundo cérebro e da biblioteca (documentos, fotos e textos lidos).
   Ficam guardados no aparelho e no cofre PRIVADO do GitHub (pasta cerebro/ e biblioteca/),
   fora do arquivo de dados, para a sincronização continuar leve. */
(function (G) {
  'use strict';
  const VALIDO = /^(cerebro|biblioteca)\/[\w.-]{1,160}$/;
  const PC = () => !!(G.api && G.api.arqSalvar);

  /* ---------- iPhone: IndexedDB (cabe muito mais que o localStorage) ---------- */
  let banco = null;
  function idb() {
    if (banco) return banco;
    banco = new Promise((ok, erro) => {
      const r = indexedDB.open('jarvis-arquivos', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('arqs', { keyPath: 'caminho' });
      r.onsuccess = () => ok(r.result); r.onerror = () => erro(r.error);
    });
    return banco;
  }
  const tx = async (modo, f) => { const db = await idb(); return new Promise((ok, erro) => { const t = db.transaction('arqs', modo); const s = t.objectStore('arqs'); const r = f(s); t.oncomplete = () => ok(r && r.result); t.onerror = () => erro(t.error); }); };
  const web = {
    salvar: (caminho, bytes, enviado) => tx('readwrite', s => s.put({ caminho, bytes: bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), enviado: !!enviado })),
    ler: async caminho => { const r = await tx('readonly', s => s.get(caminho)); return r ? new Uint8Array(r.bytes) : null; },
    apagar: caminho => tx('readwrite', s => s.delete(caminho)),
    todos: () => tx('readonly', s => s.getAll()),
    marcar: async (caminho, enviado) => { const db = await idb(); return new Promise(ok => { const t = db.transaction('arqs', 'readwrite'); const s = t.objectStore('arqs'); const g = s.get(caminho); g.onsuccess = () => { if (g.result) { g.result.enviado = enviado; s.put(g.result); } }; t.oncomplete = () => ok(true); t.onerror = () => ok(false); }); },
  };

  const N = () => G.Nuvem;
  const ligado = () => !!(N() && N().ligada && N().ligada());
  const Arquivos = {
    valido: c => VALIDO.test(String(c || '')),
    async guardar(caminho, bytes) {
      if (!this.valido(caminho)) throw new Error('Nome de arquivo inválido.');
      this.cache.delete(caminho);
      bytes = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
      if (PC()) await G.api.arqSalvar(caminho, bytes, false); else await web.salvar(caminho, bytes, false);
      this.enviarPendentes().catch(() => {});
      return true;
    },
    guardarTexto(caminho, texto) { return this.guardar(caminho, new TextEncoder().encode(String(texto || ''))); },
    async ler(caminho) {
      if (!this.valido(caminho)) return null;
      let b = PC() ? await G.api.arqLer(caminho) : await web.ler(caminho).catch(() => null);
      if (b) return b instanceof Uint8Array ? b : new Uint8Array(b);
      if (!ligado()) return null;
      b = await N().baixarArquivo(caminho);
      if (b) { if (PC()) await G.api.arqSalvar(caminho, b, true); else await web.salvar(caminho, b, true).catch(() => {}); }
      return b;
    },
    async lerTexto(caminho) { const b = await this.ler(caminho); return b ? new TextDecoder().decode(b) : null; },
    // texto que já está no aparelho (sem internet), para a busca
    async textoLocal(caminho) {
      if (!this.valido(caminho)) return null;
      const b = PC() ? await G.api.arqLer(caminho) : await web.ler(caminho).catch(() => null);
      return b ? new TextDecoder().decode(b instanceof Uint8Array ? b : new Uint8Array(b)) : null;
    },
    async apagar(caminho) {
      if (!this.valido(caminho)) return;
      if (PC()) await G.api.arqApagar(caminho); else await web.apagar(caminho).catch(() => {});
      if (ligado()) { try { await N().apagarArquivo(caminho); } catch (e) { console.warn('arquivo continua no cofre:', e.message); } }
    },
    async enviarPendentes() {
      if (!ligado() || this.enviando) return 0;
      this.enviando = true; let n = 0;
      try {
        const pend = PC() ? await G.api.arqPendentes() : (await web.todos()).filter(x => !x.enviado).map(x => x.caminho);
        for (const c of pend) {
          const b = PC() ? await G.api.arqLer(c) : await web.ler(c); if (!b) continue;
          await N().enviarArquivo(c, b instanceof Uint8Array ? b : new Uint8Array(b));
          if (PC()) await G.api.arqEnviado(c); else await web.marcar(c, true);
          n++;
        }
      } catch (e) { console.warn('envio de arquivos adiado:', e.message); }
      finally { this.enviando = false; }
      return n;
    },
    // baixa para o aparelho os textos que ainda não estão aqui (para a busca funcionar offline)
    async trazerTextos(caminhos, aoTerminar) {
      let n = 0;
      for (const c of caminhos) { if (await this.textoLocal(c) != null) continue; try { if (await this.ler(c)) n++; } catch {} }
      if (n && aoTerminar) aoTerminar(n);
      return n;
    },
    // textos guardados no aparelho, para a busca (com cache em memória)
    cache: new Map(),
    async textos(caminhos) {
      const out = new Map();
      for (const c of caminhos) {
        if (!c) continue;
        if (this.cache.has(c)) { out.set(c, this.cache.get(c)); continue; }
        const t = await this.textoLocal(c).catch(() => null);
        if (t != null) { this.cache.set(c, t); out.set(c, t); }
      }
      return out;
    },
    esquecer(c) { this.cache.delete(c); },
    // remove do aparelho arquivos de itens que foram apagados
    async limpar(validos) {
      const ok = new Set(validos);
      if (PC()) return G.api.arqLimpar([...ok]);
      let n = 0; for (const x of await web.todos().catch(() => [])) if (!ok.has(x.caminho)) { await web.apagar(x.caminho); n++; }
      return n;
    },
  };
  G.Arquivos = Arquivos;
})(typeof window !== 'undefined' ? window : globalThis);
