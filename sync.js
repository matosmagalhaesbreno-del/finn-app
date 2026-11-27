/* Jarvis Finance — sincronização PC ⇄ iPhone pelo GitHub (mesmo método da Minha Carteira).
   Os dados ficam num repositório PRIVADO do GitHub do usuário (finn-dados).
   O app do celular fica num repositório público (finn-app) publicado no GitHub Pages,
   sem nenhum dado dentro dele. */
(function (G) {
  'use strict';
  const COLECOES = (G.Finn && G.Finn.COLECOES) || ['contas', 'transacoes', 'renda', 'orcamentos', 'metas', 'planos', 'regras', 'chat', 'perfil', 'fixas', 'faturas'];

  // campos que começam com "_" são calculados no aparelho e não viajam
  const limpo = r => { const o = {}; for (const k in r) if (k[0] !== '_' && k !== 'mod') o[k] = r[k]; return o; };
  const semMod = r => JSON.stringify(limpo(r));
  function fotografar(D) { const s = new Map(); COLECOES.forEach(c => (D[c] || []).forEach(r => s.set(r.id, semMod(r)))); return s; }
  function carimbar(D, foto) {
    const agora = new Date().toISOString(), vistos = new Set(); let mudou = false;
    D.apagados = D.apagados || {};
    COLECOES.forEach(c => (D[c] || []).forEach(r => {
      vistos.add(r.id); const s = semMod(r);
      if (foto.get(r.id) !== s || !r.mod) { r.mod = agora; foto.set(r.id, s); mudou = true; }
    }));
    for (const id of [...foto.keys()]) if (!vistos.has(id)) { D.apagados[id] = agora; foto.delete(id); mudou = true; }
    return mudou;
  }
  function mesclar(L, R) {
    if (!R) return { dados: L, puxar: false, empurrar: true };
    let puxar = false, empurrar = false;
    const limite = new Date(Date.now() - 180 * 864e5).toISOString();
    const ap = {}, la = L.apagados || {}, ra = R.apagados || {};
    for (const k of new Set([...Object.keys(la), ...Object.keys(ra)])) {
      const v = (la[k] || '') > (ra[k] || '') ? la[k] : ra[k];
      if (v < limite) continue;
      ap[k] = v; if (la[k] !== v) puxar = true; if (ra[k] !== v) empurrar = true;
    }
    const dados = { apagados: ap };
    for (const c of COLECOES) {
      const m = new Map();
      (L[c] || []).forEach(x => m.set(x.id, { x, l: true, r: false }));
      (R[c] || []).forEach(x => {
        const a = m.get(x.id);
        if (!a) return m.set(x.id, { x, l: false, r: true, novoL: true });
        a.r = true;
        if ((x.mod || '') > (a.x.mod || '')) { a.x = x; a.novoL = true; } else if ((x.mod || '') < (a.x.mod || '')) a.novoR = true;
      });
      dados[c] = [];
      for (const [id, e] of m) {
        if (ap[id] && ap[id] >= (e.x.mod || '')) { if (e.l) puxar = true; if (e.r) empurrar = true; continue; }
        if (e.novoL) puxar = true;
        if (e.novoR || !e.r) empurrar = true;
        dados[c].push(e.x);
      }
    }
    return { dados, puxar, empurrar };
  }
  function aplicar(D, novo) {
    D.apagados = novo.apagados;
    for (const c of COLECOES) {
      const atual = new Map((D[c] || []).map(x => [x.id, x]));
      D[c] = (novo[c] || []).map(n => {
        const a = atual.get(n.id); if (!a) return n;
        if (a !== n) { for (const k of Object.keys(a)) delete a[k]; Object.assign(a, n); }
        return a;
      });
    }
  }

  const b64 = {
    deBytes(u8) { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); },
    paraBytes(t) { const s = atob(t.replace(/\s/g, '')); const u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return u; },
    deTexto: t => b64.deBytes(new TextEncoder().encode(t)),
    paraTexto: t => new TextDecoder().decode(b64.paraBytes(t)),
  };

  const Nuvem = {
    get base() { return (typeof window !== 'undefined' && window.API_BASE) || 'https://api.github.com'; }, REPO: 'finn-dados', SITE: 'finn-app', ARQ: 'dados.json',
    cfg: null, sha: null, etag: null, ocupado: false, sujo: false, estado: 'off', erro: '', ultima: null,
    dados: () => ({}), aoReceber() {}, aoMudar() {},
    ligada() { return !!(this.cfg && this.cfg.token && this.cfg.dono); },
    marca(estado, erro) { this.estado = estado; this.erro = erro || ''; if (estado === 'ok') this.ultima = new Date(); this.aoMudar(); },
    api(metodo, caminho, corpo, extra) {
      return fetch(this.base + caminho, {
        method: metodo, cache: 'no-store',
        headers: { Authorization: 'Bearer ' + this.cfg.token, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', ...(corpo ? { 'Content-Type': 'application/json' } : {}), ...extra },
        body: corpo ? JSON.stringify(corpo) : undefined,
      });
    },
    async falha(r) {
      let m = ''; try { m = (await r.json()).message || ''; } catch {}
      if (r.status === 401) return new Error('O código de acesso do GitHub não vale mais. Gere um novo e conecte de novo.');
      if (r.status === 403) return new Error('O GitHub recusou o acesso (403). ' + m);
      return new Error(`Erro ${r.status} do GitHub. ${m}`);
    },
    caminho(arq) { return `/repos/${this.cfg.dono}/${this.REPO}/contents/${arq}`; },
    mudou() { this.sujo = true; clearTimeout(this.t); this.t = setTimeout(() => this.ciclo(), 1500); },
    async ciclo() {
      if (!this.ligada() || this.ocupado || this.instalando) return;
      if (typeof navigator !== 'undefined' && navigator.onLine === false) return this.marca('offline');
      this.ocupado = true; this.marca('sync');
      try {
        for (let t = 0; t < 4; t++) {
          const r = await this.api('GET', this.caminho(this.ARQ), null, this.etag && !this.sujo ? { 'If-None-Match': this.etag } : {});
          let remoto = null;
          if (r.status === 304) break;
          if (r.status === 404) { this.sha = null; }
          else if (r.ok) {
            const j = await r.json(); this.sha = j.sha; this.etag = r.headers.get('etag');
            let c = j.content;
            if (!c && j.size) { const b = await this.api('GET', `/repos/${this.cfg.dono}/${this.REPO}/git/blobs/${j.sha}`); if (!b.ok) throw await this.falha(b); c = (await b.json()).content; }
            remoto = JSON.parse(b64.paraTexto(c));
          } else throw await this.falha(r);
          const m = mesclar(this.dados(), remoto);
          if (m.puxar) this.aoReceber(m.dados);
          this.sujo = false;
          if (!m.empurrar) break;
          const envio = { versao: 1, apagados: m.dados.apagados };
          COLECOES.forEach(c => envio[c] = (m.dados[c] || []).map(r => ({ ...limpo(r), mod: r.mod })));
          const p = await this.api('PUT', this.caminho(this.ARQ), { message: 'sincronização', content: b64.deTexto(JSON.stringify(envio)), ...(this.sha ? { sha: this.sha } : {}) });
          if (p.status === 409 || p.status === 422) { this.sujo = true; this.etag = null; continue; } // o outro aparelho gravou no meio: junta de novo
          if (!p.ok) throw await this.falha(p);
          this.sha = (await p.json()).content.sha; this.etag = null;
          break;
        }
        this.marca('ok');
      } catch (e) { this.marca('erro', /Failed to fetch|NetworkError|Load failed/i.test(e.message) ? 'Sem internet no momento. Vou tentar de novo sozinho.' : e.message); }
      finally { this.ocupado = false; if (this.sujo && this.estado !== 'erro') { clearTimeout(this.t); this.t = setTimeout(() => this.ciclo(), 2000); } }
    },
    iniciar(seg = 40) {
      this.ciclo();
      clearInterval(this.ti); this.ti = setInterval(() => { if (typeof document === 'undefined' || !document.hidden) this.ciclo(); }, seg * 1000);
      if (typeof document !== 'undefined' && !this.ouvindo) {
        this.ouvindo = true;
        document.addEventListener('visibilitychange', () => { if (!document.hidden) this.ciclo(); });
        window.addEventListener('online', () => this.ciclo());
      }
    },
    parar() { clearInterval(this.ti); clearTimeout(this.t); this.cfg = null; this.sha = this.etag = null; this.sujo = false; this.marca('off'); },
    // arquivos (PDFs das contas) no repositório privado
    async listarPasta(pasta) {
      const r = await this.api('GET', `/repos/${this.cfg.dono}/${this.REPO}/contents/${pasta}`);
      if (r.status === 404) return [];
      if (!r.ok) throw await this.falha(r);
      const j = await r.json(); return Array.isArray(j) ? j : [];
    },
    async shaGit(bytes) { // mesmo cálculo do git: evita reenviar um arquivo igual
      const cab = new TextEncoder().encode(`blob ${bytes.length}\0`), tudo = new Uint8Array(cab.length + bytes.length);
      tudo.set(cab); tudo.set(bytes, cab.length);
      const h = new Uint8Array(await crypto.subtle.digest('SHA-1', tudo));
      return [...h].map(x => x.toString(16).padStart(2, '0')).join('');
    },
    async enviarArquivo(arq, bytes, tentativa = 0) {
      bytes = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
      const pasta = arq.split('/').slice(0, -1).join('/');
      const ex = (await this.listarPasta(pasta)).find(x => x.path === arq);
      if (ex && ex.sha === await this.shaGit(bytes).catch(() => '')) return true;
      const r = await this.api('PUT', this.caminho(arq), { message: 'conta em PDF', content: b64.deBytes(bytes), ...(ex ? { sha: ex.sha } : {}) });
      if ((r.status === 409 || r.status === 422) && tentativa < 2) { await new Promise(ok => setTimeout(ok, 800)); return this.enviarArquivo(arq, bytes, tentativa + 1); }
      if (!r.ok) throw await this.falha(r);
      return true;
    },
    async baixarArquivo(arq) {
      const r = await this.api('GET', this.caminho(arq), null, { Accept: 'application/vnd.github.raw+json' });
      if (r.status === 404) return null;
      if (!r.ok) throw await this.falha(r);
      return new Uint8Array(await r.arrayBuffer());
    },
    async apagarArquivo(arq) {
      const pasta = arq.split('/').slice(0, -1).join('/');
      const ex = (await this.listarPasta(pasta)).find(x => x.path === arq); if (!ex) return true;
      const r = await this.api('DELETE', this.caminho(arq), { message: 'remover conta', sha: ex.sha });
      if (!r.ok && r.status !== 404) throw await this.falha(r);
      return true;
    },
    // primeira configuração, feita pelo computador: cria os dois repositórios e publica o app do celular
    async instalar(token, arquivosSite, passo = () => {}, extras = null) {
      const antes = this.cfg; this.cfg = { token, dono: (antes && antes.token === token && antes.dono) || '?' };
      this.instalando = true;
      try {
        passo('Conferindo o código…');
        const u = await this.api('GET', '/user'); if (!u.ok) throw await this.falha(u);
        const dono = (await u.json()).login; this.cfg.dono = dono;
        const garante = async (nome, privado, descricao) => {
          const r = await this.api('GET', `/repos/${dono}/${nome}`);
          if (r.ok) { const j = await r.json(); if (privado && !j.private) throw new Error(`O repositório ${nome} existe e é público. Por segurança, apague-o no GitHub ou torne-o privado.`); return; }
          const c = await this.api('POST', '/user/repos', { name: nome, private: privado, auto_init: true, description: descricao });
          if (!c.ok) throw new Error(c.status === 403 || c.status === 404 ? 'O código não tem a permissão “repo”. Gere outro marcando a caixinha “repo”.' : (await this.falha(c)).message);
          await new Promise(ok => setTimeout(ok, 1500));
        };
        passo('Criando o cofre privado dos seus dados…');
        await garante(this.REPO, true, 'Dados do Jarvis (privado)');
        passo('Publicando o app do celular…');
        await garante(this.SITE, false, 'Jarvis Finance — app do celular (sem dados)');
        if (extras) arquivosSite = arquivosSite.concat(await extras(dono));
        const lista = await this.api('GET', `/repos/${dono}/${this.SITE}/contents/`);
        const shas = Object.fromEntries((lista.ok ? await lista.json() : []).map(f => [f.path, f.sha]));
        let i = 0;
        for (const f of arquivosSite) {
          passo(`Publicando o app do celular… (${++i}/${arquivosSite.length})`);
          const r = await this.api('PUT', `/repos/${dono}/${this.SITE}/contents/${f.nome}`, { message: 'app do celular', content: f.b64, ...(shas[f.nome] ? { sha: shas[f.nome] } : {}) });
          if (!r.ok && r.status !== 422) throw await this.falha(r);
        }
        passo('Ligando o endereço do app…');
        const pg = await this.api('POST', `/repos/${dono}/${this.SITE}/pages`, { source: { branch: 'main', path: '/' } });
        if (!pg.ok && pg.status !== 409) throw await this.falha(pg);
        return { token, dono };
      } catch (e) { this.cfg = antes || null; throw e; }
      finally { this.instalando = false; }
    },
    // publica só alguns arquivos no site do app (ex.: a ficha do Jarvis que a Belvo confere)
    async publicarNoSite(arquivos) {
      const dono = this.cfg.dono;
      const lista = await this.api('GET', `/repos/${dono}/${this.SITE}/contents/`);
      if (!lista.ok) throw await this.falha(lista);
      const shas = Object.fromEntries((await lista.json()).map(f => [f.path, f.sha]));
      for (const f of arquivos) {
        const r = await this.api('PUT', `/repos/${dono}/${this.SITE}/contents/${f.nome}`, { message: 'app do celular', content: f.b64, ...(shas[f.nome] ? { sha: shas[f.nome] } : {}) });
        if (!r.ok && r.status !== 422) throw await this.falha(r);
      }
      const pg = await this.api('POST', `/repos/${dono}/${this.SITE}/pages`, { source: { branch: 'main', path: '/' } });
      if (!pg.ok && pg.status !== 409) throw await this.falha(pg);
      return true;
    },
    link(chaveIA) {
      return `https://${this.cfg.dono.toLowerCase()}.github.io/${this.SITE}/#d=${encodeURIComponent(this.cfg.dono)}&t=${encodeURIComponent(this.cfg.token)}` + (chaveIA ? `&k=${encodeURIComponent(chaveIA)}` : '');
    },
  };

  G.Nuvem = Nuvem;
  G.Sinc = { fotografar, carimbar, mesclar, aplicar, limpo, b64 };
  if (typeof module !== 'undefined') module.exports = { Nuvem, fotografar, carimbar, mesclar, aplicar, limpo };
})(typeof window !== 'undefined' ? window : globalThis);
