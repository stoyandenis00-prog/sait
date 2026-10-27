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
        const r = await fetch(form.action, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(Object.fromEntries(new FormData(form))) });
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
      const brand = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() || "#7c5cf6";
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

  // Чипове на тестовата страница: само визуално.
  document.querySelectorAll("[data-chips]").forEach((row) => row.addEventListener("click", (e) => {
    const b = e.target.closest("button.chip");
    if (!b) return;
    row.querySelectorAll("button.chip").forEach((c) => { c.classList.toggle("chip--active", c === b); c.setAttribute("aria-pressed", c === b); });
  }));
})();
