/* FinControl X — leitor de extrato em PDF (Banco Inter).
   Lê o PDF no próprio aparelho (nada é enviado para lugar nenhum), reconhece
   cada lançamento, confere a conta pelo "saldo por transação" do próprio
   extrato e sugere a categoria de cada linha.

   Formato esperado, como o Inter exporta:
     12 de Janeiro de 2026 Saldo do dia: R$ 119,51
     Pix enviado: "Cp :08561701-Fulano de Tal"        -R$ 52,90   R$ 240,65
     Compra no debito: "No estabelecimento LOJA X BRA" -R$ 53,73   R$ 65,78 */
(function (global) {
  "use strict";

  var MESES = { janeiro: 1, fevereiro: 2, marco: 3, abril: 4, maio: 5, junho: 6, julho: 7, agosto: 8, setembro: 9, outubro: 10, novembro: 11, dezembro: 12 };
  var VALOR = "([-\\u2212\\u2013]?)\\s*R\\$\\s*([\\d.]+,\\d{2})";
  var RE_DIA = new RegExp("^(\\d{1,2}) de ([A-Za-z\\u00C0-\\u00FF]+) de (\\d{4})\\s+Saldo do dia:\\s*" + VALOR);
  var RE_LINHA = new RegExp("^(.+?):\\s*[\"\\u201C](.*)[\"\\u201D]\\s+" + VALOR + "\\s+" + VALOR + "$");
  var RE_LINHA_SIMPLES = new RegExp("^([A-Za-z\\u00C0-\\u00FF].*?)\\s+" + VALOR + "\\s+" + VALOR + "$");

  function semAcento(s) {
    return String(s).normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }
  function centavos(sinal, numero) {
    var n = Math.round(parseFloat(numero.replace(/\./g, "").replace(",", ".")) * 100);
    return sinal ? -n : n;
  }
  function dois(n) { return (n < 10 ? "0" : "") + n; }
  function titulo(s) {
    return s.toLowerCase().replace(/(^|[\s\-\/.(])([a-z\u00E0-\u00FF])/g, function (_, a, b) { return a + b.toUpperCase(); })
      .replace(/\b(De|Da|Do|Das|Dos|E)\b/g, function (m) { return m.toLowerCase(); });
  }

  /* ---------- 1. PDF -> linhas de texto ---------- */
  function linhasDoPdf(pdfjsLib, data, aoAvancar) {
    return pdfjsLib.getDocument({ data: data, isEvalSupported: false, useSystemFonts: false, disableFontFace: true }).promise.then(function (pdf) {
      var linhas = [];
      var p = Promise.resolve();
      for (var n = 1; n <= pdf.numPages; n++) {
        (function (n) {
          p = p.then(function () { return pdf.getPage(n); })
            .then(function (page) { return page.getTextContent(); })
            .then(function (tc) {
              // agrupa os trechos pela altura na página e ordena da esquerda para a direita
              var porY = {};
              tc.items.forEach(function (it) {
                if (!it.str || !it.str.trim()) return;
                var y = Math.round(it.transform[5]);
                var chave = null;
                for (var k = y - 2; k <= y + 2; k++) if (porY[k]) { chave = k; break; }
                if (chave === null) { chave = y; porY[chave] = []; }
                porY[chave].push({ x: it.transform[4], s: it.str });
              });
              Object.keys(porY).map(Number).sort(function (a, b) { return b - a; }).forEach(function (y) {
                var txt = porY[y].sort(function (a, b) { return a.x - b.x; }).map(function (i) { return i.s; }).join(" ");
                linhas.push(txt.replace(/\s+/g, " ").trim());
              });
              if (aoAvancar) aoAvancar(n, pdf.numPages);
            });
        })(n);
      }
      return p.then(function () { return linhas; });
    });
  }

  /* ---------- 2. linhas -> lançamentos ---------- */
  function lerLinhas(linhas) {
    var dia = null, titular = "", banco = "", rows = [], ignoradas = 0, suspeitas = [];
    for (var i = 0; i < linhas.length; i++) {
      var s = linhas[i];
      if (!s) continue;
      if (!titular && /^CPF\/CNPJ:/i.test(s) && i > 0) titular = linhas[i - 1].trim();
      if (!banco) { var b = s.match(/Institui[cç][aã]o:\s*([^,]+)/i); if (b) banco = b[1].trim(); }
      var d = s.match(RE_DIA);
      if (d) {
        var mes = MESES[semAcento(d[2]).toLowerCase()];
        dia = mes ? d[3] + "-" + dois(mes) + "-" + dois(parseInt(d[1], 10)) : null;
        // a linha do dia pode trazer os títulos das colunas no fim; nada mais a ler nela
        continue;
      }
      var m = s.match(RE_LINHA), tipo, texto;
      if (m) { tipo = m[1].trim(); texto = m[2].trim(); }
      else {
        m = s.match(RE_LINHA_SIMPLES);
        if (m && !/^(Saldo|Valor|Per[ií]odo|Solicitado|SAC|Fale|Ouvidoria)/i.test(m[1])) {
          tipo = m[1].trim(); texto = "";
          m = [m[0], tipo, texto, m[2], m[3], m[4], m[5]];
        } else m = null;
      }
      if (!m) {
        if (dia && /R\$\s*[\d.]+,\d{2}/.test(s) && !/^(Saldo|R\$|\(bloq)/i.test(s)) suspeitas.push(s);
        else ignoradas++;
        continue;
      }
      if (!dia) { suspeitas.push(s); continue; }
      var valor = centavos(m[3], m[4]);
      if (valor === 0) { ignoradas++; continue; }
      rows.push({ day: dia, tipo: tipo, texto: texto, valor: valor, saldo: centavos(m[5], m[6]), ordem: rows.length });
    }
    // conferência: cada saldo deve ser o anterior mais o valor da linha
    var quebras = 0;
    for (var k = 1; k < rows.length; k++) {
      if (Math.abs(rows[k - 1].saldo + rows[k].valor - rows[k].saldo) > 1) quebras++;
    }
    return {
      rows: rows, titular: titular, banco: banco, ignoradas: ignoradas, suspeitas: suspeitas, quebras: quebras,
      saldoInicial: rows.length ? rows[0].saldo - rows[0].valor : 0,
      saldoFinal: rows.length ? rows[rows.length - 1].saldo : 0,
    };
  }

  /* ---------- 3. descrição limpa ---------- */
  var CIDADES = /\s+(BELO HORIZONT\w*|BELO HORIZON|ELO HORIZONT\w*|VESPASIANO|CONTAGEM|BETIM|SAO PAULO|OSASCO|BARUERI|RIO DE JANEIRO|LAGOA SANTA|SANTA LUZIA|PEDRO LEOPOLD\w*|RIBEIRAO DAS\w*|SABARA|NOVA LIMA|CURITIBA|CAMPINAS|BRASILIA|SP|RJ|MG)$/;
  function limpar(tipo, texto) {
    var t = texto.replace(/\s+/g, " ").trim();
    var pix = /^pix/i.test(tipo);
    if (pix) {
      t = t.replace(/^Cp\s*:\s*\d+\s*-\s*/i, "").replace(/^\d{3,}\s+\d{3,}\s+/, "").trim();
      if (!t || /^null$/i.test(t)) t = "";
      if (!t) return tipo;
      var u = semAcento(t).toUpperCase();
      if (/^UBER\b/.test(u)) return "Uber";
      if (/^99 ?TECNOLOGIA/.test(u)) return "99";
      if (/^IFOOD/.test(u)) return "iFood";
      return titulo(t);
    }
    if (/^estorno/i.test(tipo)) {
      t = t.replace(/^Estorno no estabelecimento\s*/i, "").replace(/\s+BRA$/, "").replace(CIDADES, "").trim();
      if (!t || /^nao informado$/i.test(semAcento(t))) return "Estorno de compra";
      return "Estorno " + nomeLoja(t);
    }
    t = t.replace(/^No estabelecimento\s*/i, "").replace(/\s+BRA$/, "").replace(CIDADES, "").trim();
    return t ? nomeLoja(t) : tipo;
  }
  function nomeLoja(t) {
    var u = semAcento(t).toUpperCase();
    if (/UBER/.test(u)) return /EATS/.test(u) ? "Uber Eats" : "Uber";
    if (/^99\b|99 ?TECNOLOGIA|99 ?POP|99APP/.test(u)) return "99";
    if (/IFOOD|^IFD\b|IFD\*/.test(u)) return "iFood" + (u.replace(/.*IFD\*?\s*/, "").length > 2 && /IFD/.test(u) ? " · " + titulo(t.replace(/.*IFD\*?\s*/i, "")) : "");
    return titulo(t.replace(/^(MP|PG|DL|PAG|EC|SUMUP|CAPPTA|ADIQPLU|INFINITE|STONE|TON)\s*\*\s*/i, ""));
  }

  /* ---------- 4. categoria ----------
     Cada regra: [expressão sobre a descrição original em maiúsculas sem acento,
     grupo, categoria]. A primeira que casar vale. */
  var REGRAS = [
    [/UBER ?EATS|IFOOD|\bIFD\b|IFD\*|RAPPI|ZE DELIVERY|AIQFOME/, "Alimentação", "Delivery"],
    [/UBER/, "Transporte", "Uber"],
    [/\b99 ?(TECNOLOGIA|POP|APP|TAXI)|^99\b|CABIFY|INDRIVE/, "Transporte", "99 e outros apps"],
    [/BUSER|\bMETRO\b|BHTRANS|TRANSFACIL|OTIMO|ONIBUS|RODOVIARIA|PASSAGE/, "Transporte", "Transporte público"],
    [/\bPOSTO\b|AUTO POSTO|IPIRANGA|\bSHELL\b|PETROBRAS|COMBUSTIV|ALE COMBUST/, "Transporte", "Combustível"],
    [/ESTACIONAMENTO|\bPARK\b|ESTAPAR|SEM PARAR|CONECTCAR|PEDAGIO/, "Transporte", "Estacionamento"],
    [/DROGA|ARAUJO|\bRAIA\b|DROGASIL|PACHECO|FARMAC|PAGUE MENOS|PANVEL/, "Saúde", "Farmácia"],
    [/MEDPREV|CARTAO DE TODOS|CLINICA|LABORAT|HOSPITAL|ODONTO|UNIMED|HERMES PARDINI|DENTIST|MEDIC|EXAME|PSICO|FISIO/, "Saúde", "Consultas e exames"],
    [/MERCADO ?LIVRE|MERCADOLIVRE|MERCPAGO|MERCADO ?PAGO|AMAZON|SHOPEE|MAGALU|MAGAZINE|AMERICANAS|ALIEXPRESS|SHEIN|KABUM|CASAS BAHIA|DECATHLON|LEROY|MELISSA/, "Compras", null],
    [/SUPERMERC|\bSUP\b|\bEPA\b|CARREFOUR|ATACAD|ASSAI|\bMERCADO\b|MERCEARIA|HORTIFRUTI|SACOLAO|ACOUGUE|DMA DISTRIBUIDORA|DARK STORE|VERDEMAR|APOIO MINEIRO|MART MINAS|VILLEFORT|\bBIG\b|PAO DE ACUCAR|ALIMENTO/, "Alimentação", "Mercado"],
    [/PIZZA|BURG|HAMBURG|LANCH|RESTAUR|CHURR|SBUX|STARBUCKS|\bCAFE\b|CAFETERIA|PADARIA|\bPAO\b|PANIFIC|SORVET|ACAI|\bBAR\b|\bBEER\b|CERVEJ|ESPET|SUSHI|LOUNGE|\bMATE\b|DOMINOS|MC ?DONALD|\bBK\b|BURGER KING|SUBWAY|PASTEL|DOCERIA|\bDOCES?\b|CONFEIT|SALGAD|TOTEM|SANDU|GRILL|GULOSE|\bFOOD\b|\bKFC\b|MADERO|COMIDA|COZINHA|BOTECO|PUB\b|DISTRIBUIDORA DE BEB|FRANQUIAS/, "Alimentação", "Restaurante"],
    [/CEMIG|\bENEL\b|CPFL|\bLIGHT\b|ENERGISA|EQUATORIAL|ENERGIA/, "Moradia", "Energia"],
    [/\bGAS\b|ULTRAGAZ|SUPERGASBRAS|LIQUIGAS/, "Moradia", "Gás"],
    [/COPASA|SABESP|SANEAMENTO|SANEPAR|\bAGUAS?\b/, "Moradia", "Água"],
    [/\bCLARO\b|\bVIVO\b|\bTIM\b|\bOI\b|TELEFONICA|\bNET\b|INTERNET|FIBRA|TELECOM/, "Moradia", "Internet"],
    [/ALUGUEL|IMOBILI|CONDOMINIO\b/, "Moradia", "Aluguel"],
    [/NETFLIX|SPOTIFY|DISNEY|\bHBO\b|\bMAX\b|PRIME ?VIDEO|YOUTUBE|DEEZER|GLOBOPLAY|APPLE\.COM|PARAMOUNT|CRUNCHYROLL/, "Assinaturas", "Streaming"],
    [/GOOGLE|MICROSOFT|OPENAI|CHATGPT|CLAUDE|ANTHROPIC|ICLOUD|ADOBE|CANVA|NOTION|GITHUB|DROPBOX/, "Assinaturas", "Software"],
    [/ACADEMIA|PRATIQUE|FITNESS|SMART ?FIT|\bGYM\b|CROSSFIT|PILATES|BLUEFIT/, "Academia", null],
    [/CURSO|ESCOLA|FACULDADE|UNIVERSIDADE|UDEMY|ALURA|COLEGIO|LIVRARIA|PAPELARIA/, "Educação", null],
    [/\bHAIR\b|BARBER|BARBEAR|\bSALAO\b|CABELEIR|ESTETICA|MANICURE|BELEZA|PERFUM|BOTICARIO|NATURA|COSMETIC/, "Cuidados pessoais", null],
    [/CINEMA|CINEMARK|INGRESSO|DIVERSAO|SYMPLA|STEAM|PLAYSTATION|XBOX|NINTENDO|\bGAME|PARQUE|TEATRO|\bSHOW\b|BOLICHE|EVENTO|ENTRETENIMENTO|TABACARIA|\bLOUN|AIRSOFT|BYTEDANCE|TIKTOK/, "Lazer", null],
    [/\bLOJA\b|PRESENTES|CELLULAR|CELULAR|MAGAZINE|RENNER|\bC&A\b|RIACHUELO|MARISA|CALCAD|ROUPA|MODA|BOUTIQUE|ELETRO|MOVEIS|MARCENARIA|UTILIDADES|VARIEDADES|BAZAR|\bLOJAS\b|SEMIJOIAS|JOALHE|MULTIMARCAS|SHOPPING|CHAVEIRO|FLORETERIA/, "Compras", null],
  ];

  function mesmaPessoa(a, b) {
    var x = semAcento(a).toUpperCase().replace(/[^A-Z ]/g, "").trim();
    var y = semAcento(b).toUpperCase().replace(/[^A-Z ]/g, "").trim();
    return !!x && !!y && (x === y || x.indexOf(y) === 0 || y.indexOf(x) === 0);
  }

  /* devolve { grupo, nome, kind, certo } — "certo" é falso quando caiu numa
     categoria genérica, e aí o que o app já aprendeu com você tem preferência. */
  function categorizar(row, titular) {
    var entrada = row.valor > 0;
    var tipo = semAcento(row.tipo).toLowerCase();
    var bruto = semAcento(row.texto).toUpperCase();
    var nomePix = bruto.replace(/^CP\s*:\s*\d+\s*-\s*/, "").trim();

    if (/estorno|devolvido/.test(tipo)) {
      return entrada
        ? { grupo: "Renda", nome: "Estornos", kind: "income", certo: true }
        : { grupo: "Transferências", nome: "Devoluções", kind: "expense", certo: true };
    }
    if (/^pix/.test(tipo) && titular && mesmaPessoa(nomePix, titular)) {
      return entrada
        ? { grupo: "Renda", nome: "Entre minhas contas", kind: "income", certo: true }
        : { grupo: "Transferências", nome: "Entre minhas contas", kind: "expense", certo: true };
    }
    if (entrada) {
      if (/FLASH TECNOLOGIA/.test(bruto)) return { grupo: "Renda", nome: "Benefício", kind: "income", certo: true };
      return { grupo: "Renda", nome: /^pix/.test(tipo) ? "Pix recebido" : "Extra", kind: "income", certo: false };
    }
    for (var i = 0; i < REGRAS.length; i++) {
      if (REGRAS[i][0].test(bruto)) return { grupo: REGRAS[i][1], nome: REGRAS[i][2], kind: "expense", certo: true };
    }
    if (/^pix/.test(tipo)) return { grupo: "Transferências", nome: "Pix enviado", kind: "expense", certo: false };
    return { grupo: "Outros", nome: null, kind: "expense", certo: false };
  }

  function metodo(tipo) {
    var t = semAcento(tipo).toLowerCase();
    if (/^pix/.test(t)) return "pix";
    if (/estorno/.test(t)) return "estorno";
    if (/debito/.test(t)) return "débito";
    if (/credito/.test(t)) return "crédito";
    return "extrato";
  }

  var CORES = { "Outros": "#b0b7a8", "Renda": "#6fe3a8", "Transferências": "#8fa3b8", "Saúde": "#4fd6a0", "Cuidados pessoais": "#f59ac0", "Moradia": "#6fa8ff", "Transporte": "#ff6b4a", "Alimentação": "#ffb020", "Assinaturas": "#c98bff", "Compras": "#ff7ad9", "Lazer": "#ff5f8d", "Academia": "#ffd25a", "Educação": "#4fd6e0" };

  /* ---------- 5. tudo junto: arquivo -> linhas prontas para a prévia ----------
     ctx = { pdfjsLib, categorias, sugerir(descricoes), criarCategoria(input), aoAvancar } */
  function lerExtrato(arquivo, ctx) {
    return arquivo.arrayBuffer().then(function (buf) {
      return linhasDoPdf(ctx.pdfjsLib, new Uint8Array(buf), ctx.aoAvancar);
    }).then(function (linhas) {
      var r = lerLinhas(linhas);
      if (!r.rows.length) {
        throw new Error("Não reconheci lançamentos neste PDF. O leitor entende o extrato do Banco Inter (dia, descrição entre aspas, valor e saldo por transação).");
      }
      return montar(r, ctx);
    });
  }

  function montar(r, ctx) {
    var cats = (ctx.categorias || []).slice();
    var chave = function (s) { return semAcento(s).toLowerCase().trim(); };
    function achar(nome, parentId, kind) {
      for (var i = 0; i < cats.length; i++) {
        var c = cats[i];
        if (chave(c.name) === chave(nome) && (c.parentId || null) === (parentId || null) && c.kind === kind && !c.archived) return c;
      }
      return null;
    }
    var seq = 0;
    function garantir(nome, parentId, kind, cor) {
      var c = achar(nome, parentId, kind);
      if (c) return Promise.resolve(c);
      var input = { id: "cat_pdf_" + Date.now().toString(36) + "_" + (seq++), name: nome, parentId: parentId || null, kind: kind, color: cor || "#9aa5a0", budgetCents: null };
      return Promise.resolve(ctx.criarCategoria(input)).then(function (criada) {
        var nova = criada && criada.id ? criada : input;
        cats.push({ id: nova.id, name: nome, parentId: parentId || null, kind: kind, archived: false });
        return cats[cats.length - 1];
      });
    }

    var prontos = r.rows.map(function (row) {
      return { row: row, cat: categorizar(row, r.titular), descricao: limpar(row.tipo, row.texto) };
    });

    // o que o app já aprendeu com as suas correções vale mais que a categoria genérica
    var incertos = prontos.filter(function (p) { return !p.cat.certo; });
    var aprendido = ctx.sugerir && incertos.length
      ? Promise.resolve(ctx.sugerir(incertos.map(function (p) { return p.descricao; }))).catch(function () { return []; })
      : Promise.resolve([]);

    return aprendido.then(function (sugestoes) {
      var porId = {};
      cats.forEach(function (c) { porId[c.id] = c; });
      incertos.forEach(function (p, i) {
        var s = sugestoes && sugestoes[i];
        var c = s && s.categoryId && porId[s.categoryId];
        if (c && (s.confidence || 0) >= 0.8 && c.kind === p.cat.kind) { p.aprendida = c; p.porque = s.because || "aprendido com você"; }
      });
      // cria (uma vez) só as categorias que este extrato realmente usa
      var fila = Promise.resolve();
      var destino = {};
      prontos.forEach(function (p) {
        if (p.aprendida) return;
        var k = p.cat.kind + "|" + p.cat.grupo + "|" + (p.cat.nome || "");
        if (destino[k] !== undefined) return;
        destino[k] = null;
        fila = fila.then(function () {
          return garantir(p.cat.grupo, null, p.cat.kind, CORES[p.cat.grupo]);
        }).then(function (pai) {
          if (!p.cat.nome) return pai;
          return garantir(p.cat.nome, pai.id, p.cat.kind, CORES[p.cat.grupo]);
        }).then(function (c) { destino[k] = c; });
      });
      return fila.then(function () {
        var rows = prontos.map(function (p, i) {
          var c = p.aprendida || destino[p.cat.kind + "|" + p.cat.grupo + "|" + (p.cat.nome || "")];
          return {
            id: i, day: p.row.day, description: p.descricao,
            amountCents: Math.abs(p.row.valor), direction: p.row.valor > 0 ? "in" : "out",
            categoryId: c ? c.id : null,
            confidence: p.aprendida ? 0.9 : p.cat.certo ? 0.95 : 0.5,
            because: p.aprendida ? p.porque : p.cat.certo ? "regra do extrato" : "categoria geral — ajuste se quiser",
            corrected: false, duplicate: false, include: true,
            method: metodo(p.row.tipo), raw: p.row.tipo + ": " + p.row.texto,
          };
        });
        return {
          rows: rows, ignored: r.ignoradas, titular: r.titular, banco: r.banco,
          suspeitas: r.suspeitas, quebras: r.quebras, saldoInicial: r.saldoInicial, saldoFinal: r.saldoFinal,
          entradas: r.rows.reduce(function (a, x) { return a + (x.valor > 0 ? x.valor : 0); }, 0),
          saidas: r.rows.reduce(function (a, x) { return a + (x.valor < 0 ? -x.valor : 0); }, 0),
          primeiroDia: r.rows[0].day, ultimoDia: r.rows[r.rows.length - 1].day,
        };
      });
    });
  }

  var api = { linhasDoPdf: linhasDoPdf, lerLinhas: lerLinhas, categorizar: categorizar, limpar: limpar, lerExtrato: lerExtrato, montar: montar };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else global.__fcxExtrato = api;
})(typeof window !== "undefined" ? window : globalThis);
