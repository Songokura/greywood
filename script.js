/* Grey & Wood. Ванильный JS: плиты и соединение «ласточкин хвост», меню, якоря, лента, заявка. */
(function () {
  "use strict";
  var doc = document, root = doc.documentElement, W = window;
  root.classList.add("js");
  var REDUCED = W.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var clamp = function (v, a, b) { return Math.max(a === undefined ? 0 : a, Math.min(b === undefined ? 1 : b, v)); };
  var smooth = function (x) { x = clamp(x); return x * x * (3 - 2 * x); };
  /* запирание с лёгким «щелчком»: шипы доходят до упора и чуть пережимают стык */
  var lock = function (x) { x = clamp(x); var c1 = 1.25, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
  var MOBILE = W.matchMedia("(max-width:760px)").matches;
  var TOUCH = W.matchMedia("(pointer:coarse)").matches;
  var VW = W.innerWidth, VH = W.innerHeight;

  /* ---------- Конверсия Google Ads: только принятая заявка, одна за сессию, без ботов ---------- */
  var human = false;
  ["pointerdown", "touchstart", "keydown", "scroll", "wheel"].forEach(function (ev) {
    W.addEventListener(ev, function () { human = true; }, { once: true, passive: true });
  });
  var ADS = { form: "AW-18512685469/jqGkCNGV0ZwdEJ3TxPtE" };
  function adsConv(kind) {
    if (typeof W.gtag !== "function" || navigator.webdriver || !human) return;
    try { if (sessionStorage.getItem("gw_conv_" + kind)) return; sessionStorage.setItem("gw_conv_" + kind, "1"); } catch (err) {}
    W.gtag("event", "conversion", { send_to: ADS[kind], value: 1.0, currency: "USD" });
  }

  /* ---------- fitText для первой строки заголовка героя ---------- */
  var h1 = doc.getElementById("h1");
  function fitText() {
    if (!h1) return;
    var l1 = h1.querySelector(".l1");
    var avail = h1.clientWidth;
    if (!avail || !l1) return;
    h1.style.removeProperty("--fs");
    var fs = parseFloat(getComputedStyle(l1).fontSize);
    var guard = 0;
    while (guard++ < 30 && l1.scrollWidth > avail + 1 && fs > 22) {
      fs *= 0.95; h1.style.setProperty("--fs", fs + "px");
    }
  }

  /* ---------- Меню ---------- */
  var burger = doc.querySelector(".burger"), menu = doc.getElementById("menu");
  var behind = [doc.getElementById("main"), doc.querySelector(".foot"), doc.getElementById("sticky")];
  function setMenu(open, returnFocus) {
    if (!menu || !burger) return;
    var was = doc.body.classList.contains("menu-open");
    if (open === was) return;
    doc.body.classList.toggle("menu-open", open);
    behind.forEach(function (el) { if (el) { if (open) el.setAttribute("inert", ""); else el.removeAttribute("inert"); } });
    burger.setAttribute("aria-expanded", open ? "true" : "false");
    if (open) {
      menu.hidden = false;
      requestAnimationFrame(function () { menu.classList.add("open"); });
      setTimeout(function () { var first = menu.querySelector("a"); if (first) first.focus({ preventScroll: true }); }, 60);
    } else {
      menu.classList.remove("open");
      setTimeout(function () { if (!doc.body.classList.contains("menu-open")) menu.hidden = true; }, 320);
      if (returnFocus) burger.focus({ preventScroll: true });
    }
  }
  if (burger) burger.addEventListener("click", function () { var o = doc.body.classList.contains("menu-open"); setMenu(!o, o); });
  doc.addEventListener("keydown", function (e) { if (e.key === "Escape" && doc.body.classList.contains("menu-open")) setMenu(false, true); });

  /* ---------- Якоря ---------- */
  var HDR = function () { return parseFloat(getComputedStyle(root).getPropertyValue("--hdr")) || 70; };
  function targetTop(el) {
    var r = el.getBoundingClientRect().top + W.pageYOffset;
    if (el.classList.contains("pw") || el.classList.contains("anchor")) return r;
    if (el.classList.contains("sec")) return r - HDR();
    return r - HDR() - 14;
  }
  function goTo(id, instant) {
    var el = doc.getElementById(id);
    if (!el) return false;
    setMenu(false);
    var top = Math.max(0, targetTop(el));
    if (instant || REDUCED) { root.style.scrollBehavior = "auto"; W.scrollTo(0, top); root.style.scrollBehavior = ""; }
    else W.scrollTo({ top: top, behavior: "smooth" });
    return true;
  }
  doc.addEventListener("click", function (e) {
    var a = e.target && e.target.closest ? e.target.closest('a[href^="#"]') : null;
    if (!a) return;
    var id = a.getAttribute("href").slice(1);
    if (!id) return;
    if (goTo(id)) {
      e.preventDefault();
      try { history.pushState(null, "", "#" + id); } catch (err) {}
      var t = doc.getElementById(id);
      if (t && t.classList.contains("anchor")) t = t.parentNode;
      if (t) { if (!t.hasAttribute("tabindex") && !/^(A|BUTTON|INPUT|SELECT|TEXTAREA)$/.test(t.tagName)) t.setAttribute("tabindex", "-1"); try { t.focus({ preventScroll: true }); } catch (err2) {} }
    }
  });

  /* ---------- Плиты ---------- */
  var pws = [].slice.call(doc.querySelectorAll(".pw"));
  var sticky = doc.getElementById("sticky"), kont = doc.getElementById("kontakty");
  var hdr = doc.getElementById("hdr");
  var INTRO = (location.hash.length > 1 || W.pageYOffset > 80 || REDUCED) ? 1 : 0;
  var introStart = 0, ticking = false;

  /* чтение размеров пакетом, потом запись; open догоняет цель плавно (lerp), поэтому скролл пальцем не дёргает половины */
  var st = pws.map(function () { return { open: -1, out: {} }; });
  var lastTs = 0;
  function put(pw, s, k, v) { if (s.out[k] !== v) { s.out[k] = v; pw.style.setProperty(k, v); } }
  function update(ts) {
    ticking = false;
    var now = typeof ts === "number" ? ts : performance.now();
    var dt = lastTs ? Math.min(64, now - lastTs) : 16.7; lastTs = now;
    var k = 1 - Math.pow(1 - 0.22, dt / 16.7);
    var H = VH;
    var pageY = W.pageYOffset;
    var kontTop = kont ? kont.getBoundingClientRect().top : null;
    var rects = [], nxtTops = [], i;
    for (i = 0; i < pws.length; i++) {
      rects.push(pws[i].getBoundingClientRect());
      var nx = pws[i].nextElementSibling;
      nxtTops.push(nx ? nx.getBoundingClientRect().top : null);
    }
    var moving = false;
    for (i = 0; i < pws.length; i++) {
      var pw = pws[i], r = rects[i], s = st[i];
      var enter = clamp(1 - r.top / H);
      var stay = r.height > H ? clamp(-r.top / (r.height - H)) : 0;
      var exit = nxtTops[i] !== null ? clamp(1 - nxtTops[i] / H) : 0;
      var isHero = pw.classList.contains("pw-hero");
      var open;
      if (isHero) open = REDUCED ? 1 : lock(INTRO / 0.82);
      else open = REDUCED ? 1 : lock(smooth((enter - 0.24) / 0.6));
      var near = r.bottom > -H * 0.5 && r.top < H * 1.5;
      if (s.open < 0 || REDUCED || !near || isHero) { s.open = open; }
      else {
        s.open += (open - s.open) * k;
        if (Math.abs(open - s.open) > 0.002) moving = true; else s.open = open;
      }
      pw.classList.toggle("near", near);
      /* стык заперт: левая половина без выреза, чтобы на зубьях не просвечивала подложка */
      pw.classList.toggle("lock", s.open >= 0.995);
      put(pw, s, "--enter", enter.toFixed(4));
      put(pw, s, "--stay", stay.toFixed(4));
      put(pw, s, "--exit", exit.toFixed(4));
      put(pw, s, "--open", s.open.toFixed(4));
      var plate = pw.firstElementChild;
      if (plate) plate.classList.toggle("gone", exit >= 1);
      if (!s.txts) s.txts = pw.querySelectorAll(".txt");
      var on = isHero ? INTRO > 0.3 : enter > 0.66;
      if (s.on !== on) { s.on = on; for (var t = 0; t < s.txts.length; t++) s.txts[t].classList.toggle("on", on); }
    }
    if (sticky) {
      var show = pageY > H * 0.55;
      if (kontTop !== null && kontTop < H * 0.5) show = false;
      sticky.classList.toggle("show", show);
    }
    if (hdr) hdr.classList.toggle("scrolled", pageY > 12);
    if (moving) onScroll();
  }
  function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(update); } }
  W.addEventListener("scroll", onScroll, { passive: true });
  W.addEventListener("resize", function () {
    /* на телефоне смена только высоты - это адресная строка: раскладку не пересчитываем */
    if (W.innerWidth !== VW) { VW = W.innerWidth; VH = W.innerHeight; fitText(); updateRails(); }
    else if (!TOUCH) VH = W.innerHeight;
    onScroll();
  });
  function runIntro(ts) {
    if (!introStart) introStart = ts;
    INTRO = clamp((ts - introStart) / 1300);
    update(ts);
    if (INTRO < 1) requestAnimationFrame(runIntro);
  }

  /* ---------- Ленты со стрелками ---------- */
  var rails = [].slice.call(doc.querySelectorAll(".rail"));
  function railStep(rail) {
    var card = rail.firstElementChild; if (!card) return 300;
    var cs = getComputedStyle(rail);
    var gap = parseFloat(cs.columnGap || cs.gap) || 16;
    return card.getBoundingClientRect().width + gap;
  }
  function updateRail(rail) {
    var btns = doc.querySelectorAll('.arr[data-for="' + rail.id + '"]');
    var max = rail.scrollWidth - rail.clientWidth;
    var none = max <= 1;
    [].forEach.call(btns, function (b) {
      b.hidden = none;
      var dir = +b.getAttribute("data-dir");
      b.disabled = dir < 0 ? rail.scrollLeft <= 2 : rail.scrollLeft >= max - 2;
    });
  }
  function updateRails() { rails.forEach(updateRail); }
  rails.forEach(function (rail) {
    rail.addEventListener("scroll", function () { updateRail(rail); }, { passive: true });
    rail.addEventListener("keydown", function (e) {
      if (e.key === "ArrowRight") { e.preventDefault(); rail.scrollBy({ left: railStep(rail), behavior: REDUCED ? "auto" : "smooth" }); }
      if (e.key === "ArrowLeft") { e.preventDefault(); rail.scrollBy({ left: -railStep(rail), behavior: REDUCED ? "auto" : "smooth" }); }
    });
  });
  [].forEach.call(doc.querySelectorAll(".arr[data-for]"), function (b) {
    b.addEventListener("click", function () {
      var rail = doc.getElementById(b.getAttribute("data-for")); if (!rail) return;
      rail.scrollBy({ left: railStep(rail) * (+b.getAttribute("data-dir")), behavior: REDUCED ? "auto" : "smooth" });
    });
  });

  /* ---------- Проявление секций ---------- */
  var rv = [].slice.call(doc.querySelectorAll(".rv"));
  if ("IntersectionObserver" in W && !REDUCED) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (x) { if (x.isIntersecting) { x.target.classList.add("in"); io.unobserve(x.target); } });
    }, { rootMargin: "0px 0px -6% 0px", threshold: 0.06 });
    rv.forEach(function (el) { io.observe(el); });
    setTimeout(function () { rv.forEach(function (el) { if (!el.classList.contains("in") && el.getBoundingClientRect().top < W.innerHeight) el.classList.add("in"); }); }, 1500);
  } else rv.forEach(function (el) { el.classList.add("in"); });

  /* ---------- Формы -> LeadBot (заявка уходит в Telegram, без WhatsApp) ---------- */
  var LB = "https://lead-bot.sultan-askarov-kz.workers.dev/e";
  var TOPIC = {
    hero: "", header: "", menu: "", sticky: "", proizv: "Проект заведения целиком",
    bar: "Барная зона", ostrovok: "Торговый островок", divan: "Диваны", stol: "Столики",
    samoob: "Зона самообслуживания", stellazh: "Стеллажи из металла", loft: "Лофт-мебель", dizain: "Дизайн интерьера"
  };
  var topic = "";
  function sendLead(fields, f, section) {
    if (W.LeadBot && W.LeadBot.submit) return W.LeadBot.submit(fields, { el: f, label: "Отправить заявку", section: section });
    /* трекер не загрузился (блокировщик) - шлём сами, без источника визита */
    if (!W.fetch) return Promise.resolve({ ok: false });
    var body = JSON.stringify({ site: "greywood", type: "form", direct: 1, fields: fields, label: "Отправить заявку", section: section,
      page: location.pathname + location.hash, lang: root.lang, ts: new Date().toISOString() });
    return fetch(LB, { method: "POST", body: body, headers: { "content-type": "text/plain" } })
      .then(function (r) { return { ok: r.ok }; }, function () { return { ok: false }; });
  }
  var SENT_KEY = "gw-lead-sent";
  function markSent() { try { localStorage.setItem(SENT_KEY, "1"); } catch (e) {} }
  function bindForm(form, section) {
    if (!form) return;
    var thanks = form.querySelector(".thanks"), ferr = form.querySelector(".ferr:not(.ffail)"), ffail = form.querySelector(".ffail");
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var f = form.elements, btn = form.querySelector('[type="submit"]');
      if (btn.disabled) return;
      if (f.website && f.website.value) { if (thanks) thanks.hidden = false; return; }
      var name = f.name.value.trim(), phone = f.phone.value.trim();
      var badName = !name, badPhone = phone.replace(/\D/g, "").length < 10;
      f.name.classList.toggle("bad", badName); f.phone.classList.toggle("bad", badPhone);
      f.name.setAttribute("aria-invalid", badName ? "true" : "false"); f.phone.setAttribute("aria-invalid", badPhone ? "true" : "false");
      if (badName || badPhone) { if (ferr) ferr.hidden = false; (badName ? f.name : f.phone).focus(); return; }
      if (ferr) ferr.hidden = true;
      if (ffail) ffail.hidden = true;
      var fields = { name: name, phone: phone, "Интересует": section === "popup" ? topic : "", message: f.message.value.trim() };
      for (var k in fields) if (!fields[k]) delete fields[k];
      btn.disabled = true;
      sendLead(fields, form, section).then(function (r) {
        btn.disabled = false;
        if (r && r.ok) {
          adsConv("form"); markSent(); form.reset();
          form.classList.add("sent");
          if (thanks) { thanks.hidden = false; try { thanks.focus({ preventScroll: true }); } catch (err) {} }
        } else if (ffail) ffail.hidden = false;
      });
    });
  }
  bindForm(doc.getElementById("form"), "zayavka");
  bindForm(doc.getElementById("mform"), "popup");

  /* ---------- Окно заявки: все кнопки сайта открывают его ---------- */
  var lm = doc.getElementById("lm"), lmTopic = lm ? lm.querySelector(".lm-topic") : null, lmOpener = null;
  function openLm(key, opener) {
    if (!lm || typeof lm.showModal !== "function") { goTo("zayavka"); return; }
    if (lm.open) return;
    setMenu(false);
    topic = TOPIC[key] || "";
    if (lmTopic) { lmTopic.hidden = !topic; lmTopic.querySelector("b").textContent = topic; }
    var mf = doc.getElementById("mform");
    if (mf && mf.classList.contains("sent") && key !== "auto") {
      mf.classList.remove("sent"); var th = mf.querySelector(".thanks"); if (th) th.hidden = true;
    }
    lmOpener = opener || null;
    lm.showModal();
    root.classList.add("lm-open");
    try { sessionStorage.setItem("gw-lm-shown", "1"); } catch (e) {}
  }
  if (lm) {
    lm.addEventListener("close", function () { root.classList.remove("lm-open"); if (lmOpener) try { lmOpener.focus({ preventScroll: true }); } catch (e) {} });
    lm.querySelector(".lm-x").addEventListener("click", function () { lm.close(); });
    /* клик по затемнению вокруг окна закрывает его */
    lm.addEventListener("click", function (e) { if (e.target === lm) lm.close(); });
  }
  doc.addEventListener("click", function (e) {
    var b = e.target && e.target.closest ? e.target.closest("[data-lm]") : null;
    if (!b) return;
    e.preventDefault();
    openLm(b.getAttribute("data-lm"), b);
  });

  /* Через 20 секунд окно предлагается само: один раз за визит, не после принятой заявки
     и не тогда, когда человек заполняет форму, листает меню или смотрит видео */
  (function autoLm() {
    if (!lm) return;
    var skip = false;
    try { skip = localStorage.getItem(SENT_KEY) === "1" || sessionStorage.getItem("gw-lm-shown") === "1"; } catch (e) {}
    if (skip) return;
    var tries = 0, zay = doc.getElementById("form");
    function busy() {
      var a = doc.activeElement;
      if (a && /INPUT|SELECT|TEXTAREA/.test(a.tagName)) return true;
      if (doc.body.classList.contains("menu-open")) return true;
      var vm = doc.getElementById("vmod"); if (vm && vm.classList.contains("open")) return true;
      if (zay) { var r = zay.getBoundingClientRect(); if (r.top < W.innerHeight * 0.8 && r.bottom > W.innerHeight * 0.2) return true; }
      return false;
    }
    function tick() {
      var sent = false; try { sent = localStorage.getItem(SENT_KEY) === "1"; } catch (e) {}
      if (sent || lm.open || doc.hidden) { if (!sent && !lm.open && ++tries < 24) setTimeout(tick, 5000); return; }
      if (busy()) { if (++tries < 24) setTimeout(tick, 5000); return; }
      openLm("auto");
    }
    setTimeout(tick, 20000);
  })();

  var year = doc.getElementById("year"); if (year) year.textContent = String(new Date().getFullYear());

  /* ---------- Старт ---------- */
  function start() {
    fitText();
    if (location.hash.length > 1) {
      var id = location.hash.slice(1);
      goTo(id, true);
      setTimeout(function () { goTo(id, true); update(); }, 60);
      setTimeout(function () { goTo(id, true); update(); }, 500);
    }
    update();
    if (INTRO < 1) requestAnimationFrame(runIntro);
    updateRails();
  }
  if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(function () { fitText(); update(); });
  if (doc.readyState === "complete") start(); else W.addEventListener("load", start);
  update();

  /* видео объектов: превью только при наведении курсора, полный ролик по нажатию, листание в окне */
  var vcards = [].slice.call(doc.querySelectorAll(".vcard"));
  var HOVER = W.matchMedia("(hover: hover) and (pointer: fine)").matches;
  if (HOVER && !REDUCED) vcards.forEach(function (c) {
    var v = c.querySelector("video");
    c.addEventListener("mouseenter", function () {
      if (!v.getAttribute("src")) { v.src = c.getAttribute("data-loop"); v.addEventListener("playing", function () { c.classList.add("is-live"); }, { once: true }); }
      var p = v.play(); if (p && p.catch) p.catch(function () {});
    });
    c.addEventListener("mouseleave", function () { v.pause(); });
  });
  var vmod = doc.getElementById("vmod");
  if (vmod) {
    var mv = vmod.querySelector("video"), cur = -1, lastCard = null;
    var prevB = vmod.querySelector(".vmod-prev"), nextB = vmod.querySelector(".vmod-next"), cnt = vmod.querySelector(".vmod-n");
    var show = function (i) {
      cur = (i + vcards.length) % vcards.length;
      var c = vcards[cur]; lastCard = c;
      mv.src = c.getAttribute("data-full");
      var p = mv.play(); if (p && p.catch) p.catch(function () {});
      if (cnt) cnt.textContent = (cur + 1) + " / " + vcards.length;
    };
    var closeV = function () { mv.pause(); mv.removeAttribute("src"); mv.load(); vmod.classList.remove("open"); doc.body.style.overflow = ""; if (lastCard) lastCard.focus({ preventScroll: true }); };
    vcards.forEach(function (c, i) {
      c.addEventListener("click", function () {
        c.querySelector("video").pause();
        vmod.classList.add("open"); doc.body.style.overflow = "hidden"; show(i);
        vmod.querySelector(".vmod-x").focus({ preventScroll: true });
      });
    });
    prevB.addEventListener("click", function () { show(cur - 1); });
    nextB.addEventListener("click", function () { show(cur + 1); });
    vmod.querySelector(".vmod-x").addEventListener("click", closeV);
    vmod.addEventListener("click", function (e) { if (e.target === vmod) closeV(); });
    doc.addEventListener("keydown", function (e) {
      if (!vmod.classList.contains("open")) return;
      if (e.key === "Escape") closeV();
      if (e.key === "ArrowLeft") { e.preventDefault(); show(cur - 1); }
      if (e.key === "ArrowRight") { e.preventDefault(); show(cur + 1); }
    });
    var sx = null, sy = 0;
    vmod.addEventListener("touchstart", function (e) { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
    vmod.addEventListener("touchend", function (e) {
      if (sx === null) return;
      var dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy; sx = null;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) show(cur + (dx < 0 ? 1 : -1));
    }, { passive: true });
  }
})();
