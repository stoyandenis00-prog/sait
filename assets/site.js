// Малко JS: навигация (сянка при скрол, меню на телефон), появяване на секциите, филтър с чипове.
(() => {
  const nav = document.querySelector(".nav");
  if (nav) {
    const onScroll = () => nav.classList.toggle("is-scrolled", scrollY > 4);
    addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    const burger = nav.querySelector(".nav__burger");
    burger?.addEventListener("click", () => {
      const open = nav.classList.toggle("is-open");
      burger.setAttribute("aria-expanded", open);
      document.body.style.overflow = open ? "hidden" : "";
    });
    nav.querySelectorAll(".nav__mobile a").forEach((a) => a.addEventListener("click", () => {
      nav.classList.remove("is-open");
      burger?.setAttribute("aria-expanded", "false");
      document.body.style.overflow = "";
    }));
  }

  const items = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((entries) => entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); }
    }), { rootMargin: "0px 0px -8% 0px" });
    items.forEach((el) => io.observe(el));
  } else items.forEach((el) => el.classList.add("is-in"));

  // Отворен е само един въпрос наведнъж.
  document.querySelectorAll(".faq__item").forEach((d) => d.addEventListener("toggle", () => {
    if (d.open) document.querySelectorAll(".faq__item[open]").forEach((o) => o !== d && (o.open = false));
  }));

  // „Проекти“: категория + търсене, без презареждане. Адресът се пази (?k=…&q=…), за да може линкът да се прати.
  const filter = document.querySelector("[data-filter]");
  if (filter) {
    const cards = [...document.querySelectorAll("[data-s]")];
    const groups = [...document.querySelectorAll("[data-group]")];
    const empty = document.querySelector("[data-empty]");
    const input = filter.querySelector("input[name=q]");
    const chips = [...filter.querySelectorAll("a.chip")];
    let k = (chips.find((c) => c.classList.contains("chip--active")) || chips[0]).dataset.k;

    const apply = (push) => {
      const words = input.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
      let shown = 0;
      cards.forEach((c) => {
        const ok = (!k || c.dataset.k === k) && words.every((w) => c.dataset.s.includes(w));
        c.hidden = !ok;
        if (ok) shown++;
      });
      groups.forEach((g) => (g.hidden = !g.querySelector("[data-s]:not([hidden])")));
      empty.hidden = shown > 0;
      chips.forEach((c) => {
        const on = c.dataset.k === k;
        c.classList.toggle("chip--active", on);
        on ? c.setAttribute("aria-current", "true") : c.removeAttribute("aria-current");
      });
      const qs = new URLSearchParams();
      if (k) qs.set("k", k);
      if (input.value.trim()) qs.set("q", input.value.trim());
      const url = location.pathname + (qs.size ? "?" + qs : "");
      history[push ? "pushState" : "replaceState"](null, "", url);
    };

    chips.forEach((c) => c.addEventListener("click", (e) => { e.preventDefault(); k = c.dataset.k; apply(true); }));
    input.addEventListener("input", () => apply(false));
    // Филтърът идва от адреса — и онлайн, където няма сървър, който да го приложи предварително.
    const fromUrl = () => {
      const qs = new URLSearchParams(location.search);
      k = chips.some((c) => c.dataset.k === qs.get("k")) ? qs.get("k") : "";
      input.value = qs.get("q") || "";
      apply(false);
    };
    addEventListener("popstate", fromUrl);
    if (location.search) fromUrl();
  }

  // Umami: броим натисканията на „Запази разговор“ (всички бутони водят към един и същ адрес, като този в менюто).
  const ctaHref = document.querySelector(".nav__in > .btn--primary")?.getAttribute("href");
  if (ctaHref) document.addEventListener("click", (e) => {
    const a = e.target.closest("a.btn");
    if (a && a.getAttribute("href") === ctaHref) window.umami?.track("zapazi-razgovor", { page: location.pathname });
  });

  // Калкулатор „колко спестявате“.
  document.querySelectorAll("[data-roi]").forEach((box) => {
    const v = (n) => Math.max(0, parseFloat(String(box.querySelector(`[name=${n}]`).value).replace(",", ".")) || 0);
    const eur = (n) => Math.round(n).toLocaleString("bg-BG") + " €";
    const hrs = (n) => (n >= 10 ? Math.round(n) : Math.round(n * 10) / 10).toLocaleString("bg-BG");
    const calc = () => {
      const times = v("times"), minutes = v("minutes"), rate = v("rate"), share = v("share") / 100;
      const hours = (times * minutes * (52 / 12) * share) / 60;
      box.querySelector("[data-roi-pct]").textContent = Math.round(share * 100) + "%";
      box.querySelector("[data-roi-hours]").textContent = hrs(hours);
      box.querySelector("[data-roi-month]").textContent = eur(hours * rate);
      box.querySelector("[data-roi-year]").textContent = eur(hours * rate * 12);
      box.querySelector("[data-roi-formula]").textContent = `${times} пъти × ${minutes} мин × 4,33 седмици × ${Math.round(share * 100)}% = ${hrs(hours)} ч на месец; × ${rate} € на час`;
    };
    box.addEventListener("input", calc);
    calc();
  });

  // Форма за запитване → Web3Forms. Проверка на полетата тук; при грешка — ясно съобщение и имейлът ни.
  document.querySelectorAll("[data-lead-form]").forEach((form) => {
    const msg = form.querySelector("[data-msg]");
    const btn = form.querySelector("button[type=submit]");
    const say = (text, ok) => { msg.hidden = false; msg.textContent = text; msg.className = "lead-form__msg " + (ok ? "is-ok" : "is-bad"); };
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const bad = [...form.querySelectorAll("[required]")].filter((el) => !el.value.trim());
      form.querySelectorAll("[required]").forEach((el) => el.setAttribute("aria-invalid", bad.includes(el)));
      if (bad.length) { bad[0].focus(); return say("Попълнете всички полета.", false); }
      if (form.botcheck.checked) return; // бот
      btn.disabled = true;
      try {
        const d = Object.fromEntries(new FormData(form));
        d["Страница"] = location.pathname;
        // За HUB → Запитвания: полетата като един ред (base64url на JSON), точни каквото и да е оформлението на писмото.
        const bytes = new TextEncoder().encode(JSON.stringify({ n: d.name, c: d.contact, m: d.message, d: d["Демо"] || "", p: location.pathname }));
        let bin = ""; bytes.forEach((b) => (bin += String.fromCharCode(b)));
        d.HUB = "HUB1:" + btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
        const r = await fetch(form.action, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(d) });
        const j = await r.json().catch(() => ({}));
        if (!r.ok || j.success === false) throw new Error(j.message || "грешка");
        window.umami?.track("zapitvane-forma", { page: location.pathname });
        form.reset();
        say("Благодарим! Получихме запитването и ще ви пишем обратно.", true);
      } catch {
        say("Не успяхме да изпратим. Опитайте пак или ни пишете директно по имейла.", false);
      } finally { btn.disabled = false; }
    });
  });

  // Видеото на демото на цял екран: бутонът или натискане върху самото видео. На iPhone — вграденият плейър.
  const vid = document.querySelector(".project-top__media video");
  const goFull = () => (vid.requestFullscreen ? vid.requestFullscreen().catch(() => {}) : vid.webkitEnterFullscreen?.());
  if (vid) {
    document.querySelector("[data-video-full]")?.addEventListener("click", goFull);
    vid.addEventListener("click", () => { if (!document.fullscreenElement) goFull(); });
  }

  // Галерия на проект: снимка на цял екран, стрелки и Esc.
  const lb = document.querySelector("[data-lightbox]");
  if (lb) {
    const items = [...document.querySelectorAll("[data-gallery] [data-full]")];
    const img = lb.querySelector("img");
    let i = 0;
    const show = (n) => { i = (n + items.length) % items.length; img.src = items[i].dataset.full; img.alt = items[i].dataset.alt; };
    items.forEach((b, n) => b.addEventListener("click", () => { show(n); lb.showModal(); }));
    lb.querySelector("[data-prev]").addEventListener("click", () => show(i - 1));
    lb.querySelector("[data-next]").addEventListener("click", () => show(i + 1));
    lb.querySelector("[data-close]").addEventListener("click", () => lb.close());
    lb.addEventListener("click", (e) => { if (e.target === lb) lb.close(); });
    lb.addEventListener("keydown", (e) => { if (e.key === "ArrowLeft") show(i - 1); if (e.key === "ArrowRight") show(i + 1); });
    lb.addEventListener("close", () => setTimeout(() => items[i]?.focus()));
    if (items.length < 2) lb.querySelectorAll("[data-prev],[data-next]").forEach((b) => (b.hidden = true));
  }

  // „Запази разговор“ към Cal.com → прозорец върху сайта в цвета на сайта (--accent; цветът в самия Cal.com е платен).
  // Ако прозорецът не се появи до 3 сек (блокиран скрипт, без мрежа) → обикновеният линк.
  const calLinks = [...document.querySelectorAll('a[href^="https://cal.com/"]')];
  if (calLinks.length) {
    const ns = "razgovor";
    // Cal.com се зарежда едва при първото натискане (така пише и в „Поверителност“).
    const initCal = () => {
      if (window.Cal?.ns?.[ns]) return;
      const brand = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() || "#f6785c";
      // Официалният код за вграждане на Cal.com (зарежда app.cal.com/embed/embed.js).
      (function (C, A, L) { const p = (a, ar) => a.q.push(ar); const d = C.document; C.Cal = C.Cal || function () { const cal = C.Cal; const ar = arguments; if (!cal.loaded) { cal.ns = {}; cal.q = cal.q || []; d.head.appendChild(d.createElement("script")).src = A; cal.loaded = true; } if (ar[0] === L) { const api = function () { p(api, arguments); }; const namespace = ar[1]; api.q = api.q || []; if (typeof namespace === "string") { cal.ns[namespace] = cal.ns[namespace] || api; p(cal.ns[namespace], ar); p(cal, ["initNamespace", namespace]); } else p(cal, ar); return; } p(cal, ar); }; })(window, "https://app.cal.com/embed/embed.js", "init");
      Cal("init", ns, { origin: "https://app.cal.com" });
      Cal.ns[ns]("ui", { theme: "light", layout: "month_view", hideEventTypeDetails: false, cssVarsPerTheme: { light: { "cal-brand": brand } } });
    };
    calLinks.forEach((a) => a.addEventListener("click", (e) => {
      if (e.ctrlKey || e.metaKey || e.shiftKey || e.button) return; // нов раздел → нормално
      e.preventDefault();
      initCal();
      const u = new URL(a.href);
      Cal.ns[ns]("modal", { calLink: u.pathname.slice(1), config: { layout: "month_view", theme: "light" } });
      setTimeout(() => { if (!document.querySelector("cal-modal-box")) location.href = a.href; }, 3000);
    }));
  }

  // Закрепеният бутон на телефон излиза, след като бутоните горе се скрият (иначе са два един над друг).
  const mbar = document.querySelector(".mbar");
  if (mbar) {
    const heroEl = document.querySelector(".hero");
    const syncBar = () => mbar.classList.toggle("is-on", !heroEl || heroEl.getBoundingClientRect().bottom < 80);
    addEventListener("scroll", syncBar, { passive: true });
    syncBar();
  }

  const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
  const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Личен линк за продажби: ?za=Салон Мария → името на клиента в ъгъла на демото горе. Само на тази страница.
  const biz = (new URLSearchParams(location.search).get("za") || "").replace(/\s+/g, " ").trim().slice(0, 40);
  if (biz) document.querySelectorAll(".hero .badge-demo").forEach((e) => { e.textContent = biz; });

  // „Един ден“: докато скролваш, небето минава от сутрин към вечер, а редът „сега“ светва.
  const day = document.querySelector("[data-day]");
  if (day) {
    const rows = [...day.querySelectorAll(".day__row")], box = day.querySelector(".day");
    let ticking = false;
    const tick = () => {
      ticking = false;
      // 0, когато секцията се показва отдолу; 1, когато излиза отгоре — денят минава през целия скрол на секцията.
      const r = day.getBoundingClientRect(), mid = innerHeight * 0.6;
      const p = Math.min(1, Math.max(0, (innerHeight * 0.85 - r.top) / (r.height + innerHeight * 0.45)));
      day.style.setProperty("--p", p.toFixed(3)); box.style.setProperty("--p", p.toFixed(3));
      let now = -1;
      rows.forEach((row, i) => { if (row.getBoundingClientRect().top < mid) now = i; });
      rows.forEach((row, i) => row.classList.toggle("is-now", i === now));
    };
    addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(tick); } }, { passive: true });
    tick();
  }

  // Светлина, която следва мишката (само с мишка, не на телефон).
  if (matchMedia("(hover: hover)").matches && !calm) {
    document.addEventListener("pointermove", (e) => {
      const s = e.target.closest?.(".spot");
      if (!s) return;
      const r = s.getBoundingClientRect();
      s.style.setProperty("--mx", e.clientX - r.left + "px"); s.style.setProperty("--my", e.clientY - r.top + "px");
    }, { passive: true });
  }

  // Горе: демотата се сменят сами (щом видеото свърши), а до тях излизат известия какво прави системата.
  const show = document.querySelector("[data-hero-show]");
  if (show) {
    const demos = [...show.querySelectorAll(".hero__demo")], tabs = [...show.querySelectorAll(".hero__tab")];
    const card = show.querySelector(".hero__event"), cardText = card.querySelector("[data-event-text]");
    let cur = 0, evTimer, evN = 0;
    const events = () => {
      clearTimeout(evTimer);
      const list = JSON.parse(demos[cur].dataset.events || "[]");
      if (!list.length) return card.classList.remove("is-on");
      const next = () => {
        card.classList.remove("is-on");
        evTimer = setTimeout(() => { cardText.textContent = list[evN++ % list.length]; card.classList.add("is-on"); evTimer = setTimeout(next, 3200); }, calm ? 0 : 450);
      };
      evN = 0; next();
    };
    const go = (i) => {
      demos[cur].querySelector("video")?.pause();
      cur = (i + demos.length) % demos.length;
      demos.forEach((d, n) => { d.hidden = n !== cur; });
      tabs.forEach((b, n) => { b.setAttribute("aria-selected", n === cur); b.querySelector("i").style.width = "0"; });
      const v = demos[cur].querySelector("video");
      if (v) { v.currentTime = 0; v.play().catch(() => {}); }
      events();
    };
    demos.forEach((d, n) => {
      const v = d.querySelector("video");
      if (!v) return;
      v.addEventListener("timeupdate", () => { if (n === cur && tabs[n] && v.duration) tabs[n].querySelector("i").style.width = (v.currentTime / v.duration) * 100 + "%"; });
      v.addEventListener("ended", () => (demos.length > 1 ? go(cur + 1) : v.play()));
    });
    tabs.forEach((b, n) => b.addEventListener("click", () => go(n)));
    events();
  }

  // Числата под героя броят до стойността си, когато се покажат.
  document.querySelectorAll("[data-count]").forEach((b) => {
    const to = +b.dataset.count;
    if (calm || !to || !("IntersectionObserver" in window)) return;
    b.textContent = "0";
    new IntersectionObserver(([e], o) => {
      if (!e.isIntersecting) return;
      o.disconnect();
      const t0 = performance.now();
      const step = (now) => { const k = Math.min(1, (now - t0) / 1200); b.textContent = Math.round(to * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(step); };
      requestAnimationFrame(step);
    }).observe(b);
  });

  // „Пробвай сами“: симулация в браузъра, нищо не се праща.
  const sim = document.querySelector("[data-sim]");
  if (sim) {
    const data = JSON.parse(sim.dataset.sim);
    const tabs = sim.querySelector(".sim__tabs"), ask = sim.querySelector(".sim__ask"), opts = sim.querySelector(".sim__opts");
    const go = sim.querySelector(".sim__go"), feed = sim.querySelector(".sim__feed"), end = sim.querySelector(".sim__end");
    const phone = sim.querySelector("[data-phone]"), soundBtn = sim.querySelector("[data-sound]");
    const date = sim.querySelector("[data-phone-date]");
    if (date) date.textContent = new Date().toLocaleDateString("bg-BG", { weekday: "long", day: "numeric", month: "long" });
    // „Дзън“ при всяко известие: кратък тон през Web Audio (без файл). Тръгва само след натискане на бутона.
    let sound = true, audio;
    soundBtn?.addEventListener("click", () => { sound = !sound; soundBtn.setAttribute("aria-pressed", sound); soundBtn.textContent = "Звук: " + (sound ? "включен" : "изключен"); });
    const ding = () => {
      if (!sound) return;
      try {
        audio ||= new (window.AudioContext || window.webkitAudioContext)();
        const o = audio.createOscillator(), g = audio.createGain(), now = audio.currentTime;
        o.type = "sine"; o.frequency.setValueAtTime(1046, now); o.frequency.setValueAtTime(1568, now + 0.08);
        g.gain.setValueAtTime(0.0001, now); g.gain.exponentialRampToValueAtTime(0.05, now + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
        o.connect(g).connect(audio.destination); o.start(now); o.stop(now + 0.36);
      } catch {}
    };
    const buzz = () => {
      if (calm || !phone) return;
      phone.classList.remove("is-buzz"); void phone.offsetWidth; phone.classList.add("is-buzz");
      navigator.vibrate?.(30);
    };
    let cur, picked, run = 0;
    const show = (x) => {
      run++; cur = x; picked = "";
      [...tabs.children].forEach((b) => { const on = b.dataset.id === x.id; b.classList.toggle("chip--active", on); b.setAttribute("aria-selected", on); });
      ask.textContent = x.ask; go.textContent = x.go; go.disabled = true; end.hidden = true;
      sim.querySelectorAll("[data-sim-demo]").forEach((a) => { a.hidden = a.dataset.simDemo !== x.id; });
      const chips = x.options.map((o) => {
        const b = el("button", "sim__opt", o); b.type = "button"; b.setAttribute("aria-pressed", "false");
        b.addEventListener("click", () => {
          picked = o; go.disabled = false; chips.forEach((c) => c.setAttribute("aria-pressed", c === b));
          if (input) input.value = o;
        });
        return b;
      });
      // Свой текст: човекът пише своята услуга, а примерите само го попълват.
      let input = null;
      if (x.free) {
        input = el("input", "sim__free"); input.maxLength = 60; input.placeholder = x.free; input.setAttribute("aria-label", x.free);
        input.addEventListener("input", () => { picked = input.value.trim(); go.disabled = !picked; chips.forEach((c) => c.setAttribute("aria-pressed", c.textContent === input.value)); });
        input.addEventListener("keydown", (e) => { if (e.key === "Enter" && picked) go.click(); });
        const row = el("div", "sim__opts sim__opts--chips"); row.append(...chips);
        opts.replaceChildren(input, el("p", "sim__hint", "или изберете пример:"), row);
      } else opts.replaceChildren(...chips);
      feed.replaceChildren(el("li", "sim__empty", "Изберете вляво и натиснете бутона. Тук ще видите какво става след това."));
    };
    tabs.append(...data.map((x) => {
      const b = el("button", "chip", x.tab); b.type = "button"; b.dataset.id = x.id; b.setAttribute("role", "tab");
      b.addEventListener("click", () => show(x));
      return b;
    }));
    go.addEventListener("click", () => {
      if (!picked) return;
      const id = ++run; go.disabled = true; end.hidden = true; feed.replaceChildren();
      if (innerWidth < 768) (phone || feed).scrollIntoView({ behavior: calm ? "auto" : "smooth", block: "center" }); // на телефон отговорите са под бутона
      cur.steps.forEach(([when, to, text], i) => setTimeout(() => {
        if (id !== run) return;
        const li = el("li", "sim__msg" + (to.startsWith("Вие") ? " sim__msg--you" : to.startsWith("Още") ? " sim__msg--more" : " sim__msg--client"));
        const meta = el("div", "sim__meta"); meta.append(el("i", "sim__app"), el("b", "", to), el("span", "", when));
        li.append(meta, el("p", "", text.replace("{x}", picked)));
        feed.prepend(li); // най-новото е отгоре, като на заключен екран
        ding(); buzz();
        if (i === cur.steps.length - 1) { end.hidden = false; go.disabled = false; }
      }, calm ? 0 : i * 800));
    });
    show(data[0]);
  }

  // Тест „Какво да автоматизирате първо“: препоръката е по отговорите, без сървър.
  const quiz = document.querySelector("[data-quiz]");
  if (quiz) {
    const steps = [...quiz.querySelectorAll(".quiz__step")], result = quiz.querySelector(".quiz__result"), bar = quiz.querySelector(".quiz__bar i");
    let ans = {};
    const goTo = (i) => {
      steps.forEach((s, n) => { s.hidden = n !== i; });
      result.hidden = i < steps.length;
      bar.style.width = (i / steps.length) * 100 + "%";
    };
    const niches = JSON.parse(quiz.dataset.niches || "{}");
    const finish = () => {
      // Първата е по „кое ви изяжда времето“, втората е от демотата за бранша (или общите, при „Друго“).
      const pool = (niches[ans.biz] || ["barz-otgovor", "ai-asistent", "oferti"]).concat("ai-asistent", "barz-otgovor");
      const first = ans.pain !== "drugo" ? ans.pain : pool[0];
      const second = pool.find((x) => x !== first);
      quiz.querySelectorAll("[data-q]").forEach((c) => { c.hidden = c.dataset.q !== first && c.dataset.q !== second; });
      quiz.querySelectorAll("[data-quiz-niche]").forEach((a) => { a.hidden = a.dataset.quizNiche !== ans.biz; });
      const main = quiz.querySelector(`[data-q="${first}"]`);
      if (main) main.parentNode.prepend(main);
      const n = +ans.vol;
      // Голямото число брои до стойността си.
      const hoursBox = quiz.querySelector("[data-quiz-hours]"), hours = Math.round((n * 5 * 22) / 60);
      hoursBox.classList.add("quiz__hours");
      hoursBox.replaceChildren(el("b", "", "0 часа на месец"), document.createTextNode(`При около ${n} на ден и 5 минути за всяко. Сметка по вашите отговори, не обещание.`));
      const big = hoursBox.querySelector("b"), t0 = performance.now();
      const step = (now) => { const k = calm ? 1 : Math.min(1, (now - t0) / 900); big.textContent = `${Math.round(hours * (1 - Math.pow(1 - k, 3)))} часа на месец`; if (k < 1) requestAnimationFrame(step); };
      requestAnimationFrame(step);
      goTo(steps.length);
    };
    steps.forEach((s, i) => s.addEventListener("click", (e) => {
      const b = e.target.closest(".quiz__opt");
      if (!b) return;
      ans[s.dataset.name] = b.dataset.v;
      if (i + 1 < steps.length) goTo(i + 1); else finish();
    }));
    quiz.querySelector("[data-quiz-again]").addEventListener("click", () => { ans = {}; goTo(0); });
  }

  // Чипове на тестовата страница: само визуално.
  document.querySelectorAll("[data-chips]").forEach((row) => row.addEventListener("click", (e) => {
    const b = e.target.closest("button.chip");
    if (!b) return;
    row.querySelectorAll("button.chip").forEach((c) => { c.classList.toggle("chip--active", c === b); c.setAttribute("aria-pressed", c === b); });
  }));
  // Кълбото (идея от neon.com): сфера от къси черти по паралелите, върти се бавно.
  // По нея са бизнеси от различни браншове: когато точката излезе отпред, до нея светва какво току-що е станало само.
  const orb = document.querySelector("[data-orb]");
  if (orb) {
    const cx = orb.getContext("2d"), still = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const css = getComputedStyle(orb), ink = css.color || "#f0eeed", acc = css.getPropertyValue("--accent-ink").trim() || "#ffb5a5";
    const pts = [];
    for (let lat = -84; lat <= 84; lat += 5) {
      const ring = Math.cos((lat * Math.PI) / 180), n = Math.max(6, Math.round(ring * 64));
      for (let k = 0; k < n; k++) pts.push([(lat * Math.PI) / 180, (k / n) * Math.PI * 2]);
    }
    const rad = (d) => (d * Math.PI) / 180;
    const pins = [
      [32, 0, "Салон", "нов час, 10:30"], [-30, 45, "Автосервиз", "офертата е приета"], [32, 90, "Клиника", "напомняне пратено"],
      [-30, 135, "Магазин", "поръчката е потвърдена"], [32, 180, "Имоти", "оглед записан"], [-30, 225, "Ресторант", "маса за 4, 20:00"],
      [32, 270, "Фитнес", "нов лийд, поет за 2 мин"], [-30, 315, "Ремонти", "запитване с цена"],
    ].map(([la, lo, who, what]) => [rad(la), rad(lo), who, what]);
    let R = 0, C = 0, rot = 0, seen = true;
    const size = () => { const r = devicePixelRatio || 1, w = orb.clientWidth; orb.width = orb.height = w * r; cx.setTransform(r, 0, 0, r, 0, 0); C = w / 2; R = w * 0.42; };
    const tilt = 0.32, ct = Math.cos(tilt), st = Math.sin(tilt);
    const proj = (la, lo) => { const x = Math.cos(la) * Math.sin(lo + rot), y = Math.sin(la), z = Math.cos(la) * Math.cos(lo + rot); return [x, y * ct - z * st, y * st + z * ct]; };
    const card = (x, y, a, who, what) => {
      cx.font = "600 13px Onest, system-ui, sans-serif"; const w1 = cx.measureText(who).width;
      cx.font = "400 13px Onest, system-ui, sans-serif"; const w2 = cx.measureText(what).width;
      const w = Math.max(w1, w2) + 24, h = 44, left = x + (x > C ? -w - 16 : 16), top = y - h / 2;
      cx.globalAlpha = a; cx.fillStyle = "#ffffff"; cx.beginPath(); cx.roundRect(left, top, w, h, 8); cx.fill();
      cx.fillStyle = "#0d1015"; cx.font = "600 13px Onest, system-ui, sans-serif"; cx.fillText(who, left + 12, top + 18);
      cx.fillStyle = "#5c534a"; cx.font = "400 13px Onest, system-ui, sans-serif"; cx.fillText(what, left + 12, top + 34);
      cx.strokeStyle = acc; cx.lineWidth = 1; cx.beginPath(); cx.moveTo(x, y); cx.lineTo(x > C ? left + w : left, y); cx.stroke();
    };
    const draw = () => {
      rot += 0.0022; cx.clearRect(0, 0, C * 2, C * 2); cx.lineCap = "round"; cx.strokeStyle = ink; cx.lineWidth = 1.3;
      for (const [la, lo] of pts) {
        const [x, y, z] = proj(la, lo); if (z < -0.2) continue;
        const [x2, y2] = proj(la, lo + 0.045);
        cx.globalAlpha = Math.max(0.04, 0.08 + 0.72 * z);
        cx.beginPath(); cx.moveTo(C + x * R, C - y * R); cx.lineTo(C + x2 * R, C - y2 * R); cx.stroke();
      }
      for (const [la, lo, who, what] of pins) {
        const [x, y, z] = proj(la, lo); if (z < 0) continue;
        const px = C + x * R, py = C - y * R;
        cx.globalAlpha = z; cx.fillStyle = acc; cx.beginPath(); cx.arc(px, py, 4, 0, 7); cx.fill();
        if (z > 0.5 && C > 150) card(px, py, Math.min(1, (z - 0.5) * 5), who, what);
      }
      cx.globalAlpha = 1;
      if (!still && seen) requestAnimationFrame(draw);
    };
    size(); addEventListener("resize", () => { size(); if (still) draw(); });
    if ("IntersectionObserver" in window) new IntersectionObserver(([e]) => { const was = seen; seen = e.isIntersecting; if (seen && !was && !still) draw(); }).observe(orb);
    draw();
  }

  // Каскадата от прозорци: щом се покаже, прозорците влизат един след друг.
  const stack = document.querySelector("[data-stack]");
  if (stack) {
    if ("IntersectionObserver" in window) { const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { stack.classList.add("is-in"); io.disconnect(); } }, { threshold: 0.25 }); io.observe(stack); }
    else stack.classList.add("is-in");
  }
  // 3D кубът горе (идея от resend.com): върти се бавно и се накланя след мишката.
  const cubeWrap = document.querySelector("[data-cube]");
  if (cubeWrap) {
    const cubeEl = cubeWrap.querySelector(".cube"), still = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let a = 35, mx = 0, my = 0, tx = 0, ty = 0, seen = true;
    if (matchMedia("(hover: hover)").matches) addEventListener("pointermove", (e) => { tx = e.clientX / innerWidth - 0.5; ty = e.clientY / innerHeight - 0.5; }, { passive: true });
    const spin = () => {
      a += 0.12; mx += (tx - mx) * 0.05; my += (ty - my) * 0.05;
      cubeEl.style.transform = `rotateX(${-24 - my * 16}deg) rotateY(${a + mx * 30}deg)`;
      if (!still && seen) requestAnimationFrame(spin);
    };
    if ("IntersectionObserver" in window) new IntersectionObserver(([e]) => { const was = seen; seen = e.isIntersecting; if (seen && !was && !still) spin(); }).observe(cubeWrap);
    spin();
  }

  // Екранът с демотата е наклонен назад и се изправя, докато скролваш (идея от linear.app).
  const stage = document.querySelector("[data-stage]");
  if (stage && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
    let tk = false;
    const tilt = () => {
      tk = false;
      const r = stage.getBoundingClientRect(), p = Math.min(1, Math.max(0, (innerHeight - r.top) / (innerHeight * 0.75)));
      stage.style.setProperty("--tilt", `${(1 - p) * 24}deg`); stage.style.setProperty("--sc", (0.9 + 0.1 * p).toFixed(3));
    };
    addEventListener("scroll", () => { if (!tk) { tk = true; requestAnimationFrame(tilt); } }, { passive: true });
    tilt();
  }
})();

// v8: известията около демото изскачат едно след друго, после плуват; рамката се накланя към мишката и по нея минава светлина.
(() => {
  const scene = document.querySelector("[data-live]");
  if (!scene) return;
  const frame = scene.querySelector(".v8-frame"), shine = scene.querySelector(".v8-shine");
  requestAnimationFrame(() => scene.classList.add("is-live"));
  setTimeout(() => scene.classList.add("is-float"), 5200);
  if (matchMedia("(prefers-reduced-motion: reduce)").matches || !matchMedia("(pointer: fine)").matches) return;
  scene.addEventListener("pointermove", (e) => {
    const r = frame.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
    shine.style.setProperty("--mx", x * 100 + "%"); shine.style.setProperty("--my", y * 100 + "%");
    frame.style.transform = `rotateY(${(x - .5) * 7}deg) rotateX(${(.5 - y) * 5}deg)`;
  });
  scene.addEventListener("pointerleave", () => { frame.style.transform = ""; });
})();

// v9: числа, които броят; телефонът до „Един ден“; калкулатор на загубата; заглавия, които изплуват.
(() => {
  const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const seen = (els, fn, threshold = 0.3) => {
    if (!("IntersectionObserver" in window) || calm) return els.forEach(fn);
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { fn(e.target); io.unobserve(e.target); } }), { threshold });
    els.forEach((el) => io.observe(el));
  };
  const ease = (x) => 1 - Math.pow(1 - x, 3);
  const tween = (from, to, ms, draw) => {
    if (calm) return draw(to);
    const t0 = performance.now();
    const step = (now) => { const k = Math.min(1, (now - t0) / ms); draw(from + (to - from) * ease(k)); if (k < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  };

  // 4: числата
  seen([...document.querySelectorAll("[data-count]")], (el) => { const n = +el.dataset.count; tween(0, n, 1400, (v) => { el.textContent = Math.round(v); }); }, 0.6);

  // 6: заглавията
  const heads = [...document.querySelectorAll(".section-head .h2, .section-head .lead, .lede, .hl, .hl-sub")].filter((el) => !el.closest(".v8-hero"));
  heads.forEach((el) => el.classList.add("v8-rise"));
  seen(heads, (el) => el.classList.add("is-in"), 0.2);

  // 5: телефонът — часът върви към реда „сега“, а за всеки минат ред има известие
  const day = document.querySelector("[data-day]"), phone = day?.querySelector(".day-phone");
  if (phone) {
    const clock = phone.querySelector("[data-day-clock]"), feed = phone.querySelector("[data-day-feed]");
    const rows = [...day.querySelectorAll(".day__row")].map((r) => ({ el: r, time: r.querySelector(".day__time").textContent.trim(), good: r.querySelector(".day__good > span:last-child").lastChild.textContent.trim() }));
    const mins = (hm) => { const [h, m] = hm.split(":").map(Number); return h * 60 + m; };
    const fmt = (v) => { v = Math.round(v); return String(Math.floor(v / 60)).padStart(2, "0") + ":" + String(v % 60).padStart(2, "0"); };
    const check = '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';
    let shown = -1, cur = mins("08:00");
    const show = (now) => {
      if (now === shown) return;
      const from = cur, to = now < 0 ? mins("08:00") : mins(rows[now].time);
      tween(from, to, 700, (v) => { cur = v; clock.textContent = fmt(v); });
      feed.innerHTML = rows.slice(0, now + 1).reverse().slice(0, 4).map((r, i) => `<div class="day-note${i ? " is-old" : ""}"><i>${check}</i><span><b><span>Ergon</span><span>${r.time}</span></b>${r.good}</span></div>`).join("");
      phone.classList.toggle("has-notes", now >= 0);
      shown = now;
    };
    const tick = () => { let now = -1; rows.forEach((r, i) => { if (r.el.getBoundingClientRect().top < innerHeight * 0.6) now = i; }); show(now); };
    let busy = false;
    addEventListener("scroll", () => { if (!busy) { busy = true; requestAnimationFrame(() => { busy = false; tick(); }); } }, { passive: true });
    tick();
  }

  // „Вижте го с вашето име“: страницата за записване се пренаписва с името и бранша, а записването работи на ужким.
  const withNote = (href, text) => {
    if (/^mailto:/.test(href)) return href + (href.includes("?") ? "&" : "?") + "subject=" + encodeURIComponent("Разговор от сайта") + "&body=" + encodeURIComponent(text);
    if (/^https?:/.test(href)) { try { const u = new URL(href); u.searchParams.set("notes", text); return u.toString(); } catch (e) {} }
    return href;
  };
  document.querySelectorAll("[data-mine]").forEach((box) => {
    const data = JSON.parse(box.dataset.niches), body = box.querySelector("[data-mine-body]"), url = box.querySelector("[data-mine-url]");
    const nameIn = box.querySelector("[data-mine-name]"), cta = box.querySelector("[data-mine-cta]"), base = cta.getAttribute("href");
    const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
    const lat = { а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ж: "zh", з: "z", и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "ts", ч: "ch", ш: "sh", щ: "sht", ъ: "a", ь: "y", ю: "yu", я: "ya" };
    const slug = (t) => t.toLowerCase().split("").map((c) => lat[c] ?? c).join("").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "vashiyat-biznes";
    const wd = ["Нд", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"], mo = ["яну", "фев", "мар", "апр", "май", "юни", "юли", "авг", "сеп", "окт", "ное", "дек"];
    const days = []; for (let d = new Date(), k = 0; days.length < 5 && k < 10; k++) { d.setDate(d.getDate() + 1); if (d.getDay()) days.push(new Date(d)); }
    const times = ["09:00", "10:30", "12:00", "13:30", "15:00", "16:30", "18:00"];
    let k = data[0].k, svc = 0, day = 0, time = -1, done = false;
    const name = () => nameIn.value.trim() || "Вашият бизнес";
    const busy = (d, t) => ((name().length * 7 + d * 3 + t * 5) % 4) === 0;
    const draw = () => {
      const n = data.find((x) => x.k === k), nm = esc(name());
      url.textContent = "ergon.bg/" + slug(name());
      cta.href = withNote(base, `Искам онлайн записване за ${name()} (${n.t}).`);
      if (done) {
        const d = days[day];
        body.innerHTML = `<div class="mine__done"><span class="mine__ok">✓</span><b>Записахте се!</b><p>${esc(n.svc[svc][0])} в ${nm}<br>${wd[d.getDay()]}, ${d.getDate()} ${mo[d.getMonth()]} · ${times[time]}</p><p class="mine__small">Ще получите напомняне 24 часа преди часа.</p><button type="button" class="mine__again" data-mine-again>Ново записване</button></div><div class="mine__toast"><b>Известие до ${nm}</b>Нов клиент: ${esc(n.svc[svc][0])}, ${times[time]}</div>`;
        return;
      }
      body.innerHTML = `<div class="mine__head"><span class="mine__logo">${nm.charAt(0).toUpperCase()}</span><span><b>${nm}</b><small>${esc(n.t)} · онлайн записване</small></span></div>
<p class="mine__step">1. Услуга</p><div class="mine__svc">${n.svc.map(([t, dur, pr], i) => `<button type="button" data-svc="${i}"${i === svc ? ' class="is-on"' : ""}><span>${esc(t)}<small>${esc(dur)}</small></span><b>${esc(pr)}</b></button>`).join("")}</div>
<p class="mine__step">2. Ден и час</p><div class="mine__days">${days.map((d, i) => `<button type="button" data-day="${i}"${i === day ? ' class="is-on"' : ""}><small>${wd[d.getDay()]}</small>${d.getDate()}</button>`).join("")}</div>
<div class="mine__times">${times.map((t, i) => busy(day, i) ? `<button type="button" disabled>${t}</button>` : `<button type="button" data-time="${i}"${i === time ? ' class="is-on"' : ""}>${t}</button>`).join("")}</div>
<button type="button" class="mine__go" data-mine-go${time < 0 ? " disabled" : ""}>${time < 0 ? "Изберете час" : "Запази час за " + times[time]}</button>`;
    };
    box.addEventListener("click", (e) => {
      const b = e.target.closest("button"); if (!b || b.disabled) return;
      if (b.dataset.mineK) { k = b.dataset.mineK; svc = 0; time = -1; done = false; box.querySelectorAll("[data-mine-k]").forEach((x) => x.setAttribute("aria-pressed", String(x === b))); }
      else if (b.dataset.svc) svc = +b.dataset.svc;
      else if (b.dataset.day) { day = +b.dataset.day; time = -1; }
      else if (b.dataset.time) time = +b.dataset.time;
      else if ("mineGo" in b.dataset) done = true;
      else if ("mineAgain" in b.dataset) { done = false; time = -1; }
      else return;
      draw();
    });
    nameIn.addEventListener("input", draw);
    draw();
  });

  // „Сглобете си системата“: отметките → списък, срок и бутон с избора в бележката към разговора.
  document.querySelectorAll("[data-build]").forEach((box) => {
    const boxes = [...box.querySelectorAll("input[type=checkbox]")], list = box.querySelector("[data-build-picked]"), weeks = box.querySelector("[data-build-weeks]"), cta = box.querySelector("[data-build-cta]"), base = box.dataset.cta;
    const calc = () => {
      const on = boxes.filter((b) => b.checked), sum = on.reduce((a, b) => a + +b.dataset.w, 0);
      list.innerHTML = on.length ? on.map((b) => `<li>${b.dataset.t}</li>`).join("") : `<li class="is-empty">Отметнете поне едно нещо отляво.</li>`;
      const lo = Math.max(1, Math.round(1 + sum * 0.6)), hi = lo + 1;
      weeks.textContent = on.length ? `${lo}–${hi} седмици` : "–";
      cta.classList.toggle("is-off", !on.length);
      cta.href = withNote(base, "Искам: " + on.map((b) => b.dataset.t).join(", ") + ".");
    };
    box.addEventListener("change", calc);
    calc();
  });

  // 7: калкулаторът
  document.querySelectorAll("[data-loss]").forEach((box) => {
    const inputs = [...box.querySelectorAll("input[type=range]")], val = (n) => +box.querySelector(`[name=${n}]`).value;
    const month = box.querySelector("[data-loss-month]"), year = box.querySelector("[data-loss-year]"), how = box.querySelector("[data-loss-how]");
    const money = (v) => String(Math.round(v)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
    let last = 0, started = false;
    const calc = () => {
      inputs.forEach((i) => { i.style.setProperty("--fill", ((i.value - i.min) / (i.max - i.min)) * 100 + "%"); box.querySelector(`[data-out=${i.name}]`).textContent = i.value + i.dataset.unit; });
      const m = val("missed") * 4.33 * (val("share") / 100) * val("value");
      how.textContent = `${val("missed")} изпуснати на седмица × 4,33 седмици × ${val("share")}% × ${val("value")} €`;
      year.textContent = money(m * 12) + " €";
      if (!started) return;
      tween(last, m, 600, (v) => { month.textContent = money(v); }); last = m;
    };
    inputs.forEach((i) => i.addEventListener("input", calc));
    calc();
    seen([box], () => { started = true; calc(); }, 0.4);
  });
})();

// v10: „Преди / След“ — плъзгачът мести чертата; при първата поява чертата сама се разхожда, за да се види, че се мести.
document.querySelectorAll("[data-compare]").forEach((box) => {
  const range = box.querySelector(".cmp__range");
  let touched = false;
  const set = (v) => box.style.setProperty("--pos", v + "%");
  range.addEventListener("input", () => { touched = true; set(range.value); });
  if (matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) return;
  const io = new IntersectionObserver(([e]) => {
    if (!e.isIntersecting) return;
    io.disconnect();
    const keys = [50, 22, 78, 50], t0 = performance.now(), seg = 900;
    const step = (now) => {
      if (touched) return;
      const k = (now - t0) / seg, i = Math.floor(k);
      if (i >= keys.length - 1) { set(50); range.value = 50; return; }
      const f = k - i, e2 = f < .5 ? 2 * f * f : 1 - Math.pow(-2 * f + 2, 2) / 2, v = keys[i] + (keys[i + 1] - keys[i]) * e2;
      set(v); range.value = v;
      requestAnimationFrame(step);
    };
    setTimeout(() => requestAnimationFrame(step), 400);
  }, { threshold: 0.5 });
  io.observe(box);
});
