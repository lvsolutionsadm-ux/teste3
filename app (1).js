(function () {
  "use strict";

  var CFG = window.PIX_CONFIG;
  var CHARGE_KEY = CFG.storageKey + "-charge";
  var IDEM_KEY = CFG.storageKey + "-key";
  var UTM_KEY = "pix-utm-v1";
  var UTM_PARAMS = {
    utm_source: "source", utm_medium: "medium", utm_campaign: "campaign", utm_content: "content",
    utm_term: "term", fbclid: "fbclid", gclid: "gclid", ttclid: "ttclid"
  };

  var ICON = {
    copy: '<svg viewBox="0 0 24 24"><rect x="8" y="8" width="14" height="14" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>',
    check: '<svg viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"/></svg>',
    loader: '<svg class="spin" viewBox="0 0 24 24"><path d="M21 12a9 9 0 1 1-6.22-8.56"/></svg>',
    refresh: '<svg viewBox="0 0 24 24"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></svg>',
    timer: '<svg viewBox="0 0 24 24"><path d="M10 2h4"/><path d="M12 14l3-3"/><circle cx="12" cy="14" r="8"/></svg>',
    qr: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="5" height="5" rx="1"/><rect x="16" y="3" width="5" height="5" rx="1"/><rect x="3" y="16" width="5" height="5" rx="1"/><path d="M21 16h-3a2 2 0 0 0-2 2v3"/><path d="M21 21v.01"/><path d="M12 7v3a2 2 0 0 1-2 2H7"/><path d="M3 12h.01"/><path d="M12 3h.01"/><path d="M12 16v.01"/><path d="M16 12h1"/><path d="M21 12v.01"/><path d="M12 21v-1"/></svg>'
  };

  var $ = function (id) { return document.getElementById(id); };
  var pollTimer = null, countdownTimer = null, current = null;

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function store(k, v) { try { v === null ? sessionStorage.removeItem(k) : sessionStorage.setItem(k, v); } catch (e) {} }
  function read(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }

  function currentUtm() {
    var params = new URLSearchParams(window.location.search), utm = {}, found = false;
    Object.keys(UTM_PARAMS).forEach(function (p) {
      var v = (params.get(p) || "").trim();
      if (v) { utm[UTM_PARAMS[p]] = v.slice(0, 500); found = true; }
    });
    if (found) { store(UTM_KEY, JSON.stringify(utm)); return utm; }
    try { return JSON.parse(read(UTM_KEY) || "{}"); } catch (e) { return {}; }
  }

  function newKey() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return "k" + Date.now().toString(36) + Math.random().toString(36).slice(2, 12);
  }

  function isReusable(c) {
    if (!c || c.status !== "PENDING" || !c.copyPaste || !c.expiresAt) return false;
    if (c.amountCents !== CFG.amountCents) return false;
    return new Date(c.expiresAt).getTime() - Date.now() > 60000;
  }

  function api(method, query, body) {
    return fetch("api.php?" + query, {
      method: method,
      headers: body ? { "Content-Type": "application/json" } : {},
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store"
    }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (data) {
        if (!res.ok) throw new Error(data.error || "Não foi possível gerar o PIX.");
        return data;
      });
    });
  }

  function toast(msg, kind) {
    var t = $("toast");
    t.textContent = msg;
    t.className = "toast show " + (kind || "ok");
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { t.className = "toast"; }, 2600);
  }

  function status(tone, html, icon) {
    var mark = icon || '<span class="pulse"></span>';
    $("status").innerHTML = '<div class="status ' + tone + '">' + mark + html + "</div>";
  }
  function visual(html) {
    $("visual-mobile").innerHTML = html;
    $("visual-desktop").innerHTML = html;
  }
  function actions(html) { $("actions").innerHTML = html; }
  function stopTimers() { clearInterval(pollTimer); clearInterval(countdownTimer); }

  function qrSvg(text) {
    var qr = qrcode(0, "M");
    qr.addData(text);
    qr.make();
    return qr.createSvgTag({ cellSize: 4, margin: 0, scalable: true }).replace("<svg ", '<svg class="qr" ');
  }

  // ---------- telas ----------

  function showLoading() {
    $("title").textContent = "Total a pagar";
    status("info", "Gerando seu PIX...", ICON.loader);
    visual('<div class="skeleton qr"></div>');
    actions('<div class="skeleton bar"></div><div class="skeleton bar"></div>');
  }

  function showError(message) {
    stopTimers();
    $("title").textContent = "Total a pagar";
    status("error", "Não conseguimos gerar o PIX");
    visual('<span class="icon-circle blue">' + ICON.qr + "</span>");
    actions('<p class="small muted">' + esc(message) + '</p><button class="btn" id="retry">' + ICON.refresh + " Tentar novamente</button>");
    $("retry").onclick = function () { start(false); };
  }

  function showPending(c) {
    $("title").textContent = "Total a pagar";
    var qr = qrSvg(c.copyPaste);
    visual(
      '<div><div class="qr-frame"><div class="qr-card">' + qr + '<span class="scan"></span></div>' +
      '<span class="corner tl"></span><span class="corner tr"></span><span class="corner bl"></span><span class="corner br"></span></div>' +
      '<p class="qr-hint">Escaneie com o app do seu banco</p></div>'
    );
    actions(
      '<p class="label">PIX copia e cola</p>' +
      '<button type="button" class="code-box" id="code"><span>' + esc(c.copyPaste) + "</span></button>" +
      '<button type="button" class="btn" id="copy">' + ICON.copy + " Copiar código PIX</button>" +
      '<ol class="steps">' +
      "<li><span>1</span>Abra o app do seu banco e entre na área PIX</li>" +
      "<li><span>2</span>Escaneie o QR code ou cole o código copiado</li>" +
      "<li><span>3</span>Confirme o pagamento — a aprovação aparece aqui na hora</li></ol>"
    );
    $("code").onclick = copy;
    $("copy").onclick = copy;
    tick();
    countdownTimer = setInterval(tick, 1000);
  }

  function tick() {
    if (!current || !current.expiresAt) return;
    var ms = Math.max(0, new Date(current.expiresAt).getTime() - Date.now());
    if (ms === 0) { showExpired(); return; }
    var m = Math.floor(ms / 60000), s = Math.floor((ms % 60000) / 1000);
    var text = (m < 10 ? "0" : "") + m + ":" + (s < 10 ? "0" : "") + s;
    status("waiting", 'Aguardando pagamento <span class="sub">· expira em <b>' + text + "</b></span>");
  }

  function copy() {
    var text = current.copyPaste;
    var done = function () {
      toast("Código PIX copiado! Cole no app do seu banco.", "ok");
      var b = $("copy");
      if (b) {
        b.innerHTML = ICON.check + " Código copiado!";
        setTimeout(function () { if ($("copy")) $("copy").innerHTML = ICON.copy + " Copiar código PIX"; }, 2500);
      }
    };
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(done, fallback);
    } else {
      fallback();
    }
    function fallback() {
      var ta = document.createElement("textarea");
      ta.value = text; ta.setAttribute("readonly", ""); ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select();
      var ok = false;
      try { ok = document.execCommand("copy"); } catch (e) {}
      document.body.removeChild(ta);
      ok ? done() : toast("Não deu para copiar. Selecione o código e copie manualmente.", "bad");
    }
  }

  function showExpired() {
    stopTimers();
    store(CHARGE_KEY, null);
    $("title").textContent = "Total a pagar";
    status("waiting", "Este PIX expirou", ICON.timer);
    visual('<span class="icon-circle warn">' + ICON.timer + "</span>");
    actions('<p class="muted">Gere um novo código para concluir o pagamento.</p><button class="btn" id="renew">' + ICON.refresh + " Gerar novo PIX</button>");
    $("renew").onclick = function () { start(true); };
  }

  function showPaid(c) {
    stopTimers();
    store(CHARGE_KEY, null);
    store(IDEM_KEY, null);
    $("title").textContent = "Valor pago";
    status("success", "Pagamento aprovado", ICON.check);
    visual('<div class="paid"><div class="check">' + ICON.check + "</div><p>Tudo certo!</p></div>");
    var when = c.paidAt ? "Pagamento confirmado em " + new Date(c.paidAt).toLocaleString("pt-BR") + "." : "Seu pagamento foi confirmado.";
    actions('<h1>Recebemos seu PIX 🎉</h1><p class="muted" style="margin-top:8px">' + esc(when) + '</p><p class="redirecting">' + ICON.loader + " Redirecionando...</p>");
    setTimeout(function () { window.location.assign(CFG.redirectUrl); }, CFG.redirectDelayMs);
  }

  // ---------- fluxo ----------

  function render(c) {
    current = c;
    stopTimers();
    if (c.status === "PAID") return showPaid(c);
    if (c.status !== "PENDING") return showExpired();
    showPending(c);
    pollTimer = setInterval(poll, 4000);
  }

  function poll() {
    api("GET", "action=status&id=" + encodeURIComponent(current.id)).then(function (c) {
      if (!c.copyPaste) c.copyPaste = current.copyPaste;
      if (!c.expiresAt) c.expiresAt = current.expiresAt;
      if (c.status === current.status) { current = c; return; }
      render(c);
    }).catch(function () { /* tenta de novo no próximo ciclo */ });
  }

  function start(fresh) {
    stopTimers();
    showLoading();
    if (fresh) { store(CHARGE_KEY, null); store(IDEM_KEY, null); }
    var saved = null;
    try { saved = JSON.parse(read(CHARGE_KEY) || "null"); } catch (e) {}
    if (isReusable(saved)) return render(saved);

    // Mesmo código ao recarregar, para nunca criar duas cobranças sem querer.
    var key = read(IDEM_KEY);
    if (!key) { key = newKey(); store(IDEM_KEY, key); }

    api("POST", "action=create", { idempotencyKey: key, utm: currentUtm() }).then(function (c) {
      if (c.status === "PENDING") store(CHARGE_KEY, JSON.stringify(c));
      render(c);
    }).catch(function (err) { showError(err.message); });
  }

  start(false);
})();
