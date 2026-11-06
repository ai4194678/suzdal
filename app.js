/* ============================================================
   ВПИСАТЬСЯ В СУЗДАЛЬ — логика приложения
   Чистый JS, без зависимостей. Данные: data.js (window.SUZDAL_DATA)
   ============================================================ */
(() => {
  'use strict';

  const DATA = window.SUZDAL_DATA;
  const viewEl = document.getElementById('view');

  if (!DATA || !Array.isArray(DATA.listings)) {
    viewEl.innerHTML = '<div class="container"><div class="empty-block" style="margin-top:40px"><h3>Не удалось загрузить данные</h3><p>Проверьте, что файл data.js на месте.</p></div></div>';
    return;
  }

  const LIST = DATA.listings;
  const BY_ID = new Map(LIST.map((l) => [l.id, l]));
  const PLACEHOLDER = 'assets/placeholder.svg';
  const LS_SET = 'vs_settings_v1';
  const LS_FAV = 'vs_favs_v1';
  const B_MIN = 3000, B_MAX = 20000, B_STEP = 500;
  const OVER_PCT = 0.15;

  /* ---------- утилиты ---------- */

  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));

  const fmt = (n) => new Intl.NumberFormat('ru-RU').format(Math.round(n));
  const fmtPrice = (n) => fmt(n) + ' ₽';
  const fmtRating = (r) => String(r).replace('.', ',');
  const fmtArea = (a) => String(a).replace('.', ',');

  function plural(n, one, few, many) {
    const abs = Math.abs(n) % 100;
    const d = abs % 10;
    if (abs > 10 && abs < 20) return many;
    if (d === 1) return one;
    if (d >= 2 && d <= 4) return few;
    return many;
  }
  const bedsWord = (n) => plural(n, 'кровать', 'кровати', 'кроватей');
  const revWord = (n) => plural(n, 'отзыв', 'отзыва', 'отзывов');

  const clampStep = (v) => {
    v = Math.round(Number(v) || B_MIN);
    v = Math.max(B_MIN, Math.min(B_MAX, v));
    return Math.round(v / B_STEP) * B_STEP;
  };
  const ceilStep = (v) => Math.min(B_MAX, Math.ceil(v / B_STEP) * B_STEP);

  function loadJSON(key) {
    try { return JSON.parse(localStorage.getItem(key)); } catch { return null; }
  }

  /* ---------- иконки ---------- */

  const PATHS = {
    key: '<circle cx="7.5" cy="15.5" r="4.2"/><path d="M10.6 12.4 20.5 2.5M17.5 5.5l3 3M14.5 8.5l2 2"/>',
    house: '<path d="M4 11l8-7 8 7"/><path d="M6 9.5V20h12V9.5"/><path d="M10 20v-6h4v6"/>',
    bed: '<path d="M3 18v-7m0 3h18m0 4v-5a2 2 0 0 0-2-2h-8v3"/><circle cx="6.5" cy="11.7" r="1.7"/>',
    ruler: '<path d="M3.5 16.5 16.5 3.5l4 4L7.5 20.5z"/><path d="M8.5 15.5l1.7 1.7M11.5 12.5l1.7 1.7M14.5 9.5l1.7 1.7M17.5 6.5l1.7 1.7"/>',
    door: '<rect x="6" y="3" width="12" height="18" rx="1.2"/><circle cx="15" cy="12" r="1"/>',
    star: '<path d="M12 3.2l2.6 5.4 5.9.8-4.3 4.1 1 5.9-5.2-2.8-5.2 2.8 1-5.9-4.3-4.1 5.9-.8z"/>',
    heart: '<path d="M12 20.2S3.6 15.4 2.9 10.2A5.2 5.2 0 0 1 12 6.6a5.2 5.2 0 0 1 9.1 3.6c-.7 5.2-9.1 10-9.1 10z"/>',
    arrowL: '<path d="M14.5 6l-6 6 6 6"/>',
    arrowR: '<path d="M9.5 6l6 6-6 6"/>',
    external: '<path d="M14 4h6v6"/><path d="M20 4 11 13"/><path d="M19 13.5V19a1.6 1.6 0 0 1-1.6 1.6H5.6A1.6 1.6 0 0 1 4 19V7.6A1.6 1.6 0 0 1 5.6 6h5.7"/>',
    envelope: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3.5 7.5 8.5 5.7 8.5-5.7"/>',
    sparkle: '<path d="M12 3l1.9 5.3L19.2 10l-5.3 1.9L12 17.2l-1.9-5.3L4.8 10l5.3-1.7z"/><path d="M18.5 15.5l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5M12 7.3v.3"/>',
    pin: '<path d="M12 21.2S5 15.6 5 10a7 7 0 0 1 14 0c0 5.6-7 11.2-7 11.2z"/><circle cx="12" cy="10" r="2.6"/>',
    check: '<path d="M5 12.5 10 17.5 19 7"/>',
    photo: '<rect x="3" y="5" width="18" height="14" rx="2.2"/><circle cx="9" cy="10" r="1.7"/><path d="m5.2 18 4.8-4.8 3 3 3.2-3.2 2.8 2.8"/>',
    wallet: '<rect x="3" y="6" width="18" height="13" rx="2.2"/><path d="M3 10.2h18M15.6 14.7h2.2"/>',
    spruce: '<path d="M12 3 7.4 9.6h2.4L5.6 15h5V21h2.8v-6h5l-4.2-5.4h2.4z"/>',
    compass: '<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5z"/>',
  };
  const icon = (name, cls = '') =>
    `<svg class="ic ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${PATHS[name] || ''}</svg>`;

  /* ---------- состояние ---------- */

  const DEFAULTS = { budget: 5000, scope: 'suzdal', allowOver: true, photosOnly: true, sort: 'cheap' };
  let settings = { ...DEFAULTS, ...(loadJSON(LS_SET) || {}) };
  settings.budget = clampStep(settings.budget);
  if (!['suzdal', 'all'].includes(settings.scope)) settings.scope = 'suzdal';
  if (!['cheap', 'space', 'rating', 'value'].includes(settings.sort)) settings.sort = 'cheap';
  settings.allowOver = !!settings.allowOver;
  settings.photosOnly = settings.photosOnly !== false; // по умолчанию включён

  let favs = new Set(loadJSON(LS_FAV) || []);
  favs = new Set([...favs].filter((id) => BY_ID.has(id)));

  const saveSettings = () => { try { localStorage.setItem(LS_SET, JSON.stringify(settings)); } catch {} };
  const saveFavs = () => { try { localStorage.setItem(LS_FAV, JSON.stringify([...favs])); } catch {} };

  /* ---------- сортировки и фильтры ---------- */

  const SORTS = {
    cheap: { label: 'Сначала дешёвые', fn: (a, b) => a.price - b.price || b.area - a.area },
    space: { label: 'Сначала просторные', fn: (a, b) => b.area - a.area || a.price - b.price },
    rating: {
      label: 'Высокий рейтинг в начале',
      fn: (a, b) => (b.rating ?? -1) - (a.rating ?? -1) || (b.reviews ?? 0) - (a.reviews ?? 0) || a.price - b.price,
    },
    value: { label: 'Лучшее соотношение цены и площади', fn: (a, b) => a.price / a.area - b.price / b.area || a.price - b.price },
  };

  function scopedList() {
    let arr = LIST;
    if (settings.scope === 'suzdal') arr = arr.filter((l) => l.locality === 'suzdal');
    if (settings.photosOnly) arr = arr.filter((l) => l.photos.length > 0);
    return arr;
  }

  function budgetDiff(l, budget) {
    const d = budget - l.price;
    if (d > 0) return { cls: 'ok', text: `Останется ${fmtPrice(d)}` };
    if (d === 0) return { cls: 'eq', text: 'Ровно в бюджет' };
    return { cls: 'over', text: `Нужно добавить ${fmtPrice(-d)}` };
  }

  /* ---------- общие блоки ---------- */

  function priceNoteHTML() {
    return `<p class="tip-line">${icon('info')} ${esc(DATA.meta.sourceNote)}</p>`;
  }

  function galleryHTML(l, { big = false } = {}) {
    const ph = l.photos;
    if (!ph.length) {
      return `<div class="card-gallery"><div class="no-photo">${icon('photo')}<span>Фото — в объявлении</span></div></div>`;
    }
    const imgs = ph.map((u, i) =>
      `<img src="${esc(u)}" alt="${esc(l.typeShort)} — фото ${i + 1}" loading="${big ? 'eager' : 'lazy'}" decoding="async" class="${i === 0 ? 'active' : ''}">`
    ).join('');
    const nav = ph.length > 1 ? `
      <button class="gal-btn gal-prev" data-action="gal-prev" aria-label="Предыдущее фото">${icon('arrowL')}</button>
      <button class="gal-btn gal-next" data-action="gal-next" aria-label="Следующее фото">${icon('arrowR')}</button>
      <div class="gal-dots">${ph.map((_, i) =>
        `<button class="dot ${i === 0 ? 'on' : ''}" data-action="gal-dot" data-i="${i}" aria-label="Фото ${i + 1}"></button>`).join('')}
      </div>
      <span class="gal-count" data-gal-count>1/${ph.length}</span>` : '';
    return `
      <div class="card-gallery" data-gal="1" data-idx="0" ${big ? 'data-big="1"' : ''}>
        ${imgs}${nav}
      </div>`;
  }

  function galStep(gal, dir) {
    const imgs = [...gal.querySelectorAll('img')];
    const n = imgs.length;
    if (n < 2) return;
    const i = (+gal.dataset.idx + dir + n) % n;
    galGo(gal, i);
  }
  function galGo(gal, i) {
    const imgs = [...gal.querySelectorAll('img')];
    imgs.forEach((im, k) => im.classList.toggle('active', k === i));
    gal.dataset.idx = String(i);
    gal.querySelectorAll('.gal-dots .dot').forEach((d, k) => d.classList.toggle('on', k === i));
    const c = gal.querySelector('[data-gal-count]');
    if (c) c.textContent = `${i + 1}/${imgs.length}`;
    const thumbs = gal.parentElement.querySelectorAll('.gal-thumbs button');
    thumbs.forEach((t, k) => t.classList.toggle('on', k === i));
  }

  function specsHTML(l) {
    const out = [`<span class="spec">${icon('door')} ${esc(l.typeShort)}</span>`];
    out.push(`<span class="spec">${icon('ruler')} ${fmtArea(l.area)} м²</span>`);
    if (l.beds != null) out.push(`<span class="spec">${icon('bed')} ${l.beds} ${bedsWord(l.beds)}</span>`);
    else if (l.floor) out.push(`<span class="spec">${icon('house')} ${esc(l.floor)} эт.</span>`);
    return out.join('');
  }

  function ratingHTML(l) {
    if (l.rating == null) return '';
    return `<span class="rate"><span class="star">${icon('star')}</span> ${fmtRating(l.rating)}${l.reviews != null ? ` <span class="rev">· ${l.reviews} ${revWord(l.reviews)}</span>` : ''}</span>`;
  }

  function favBtnHTML(l, { withText = true } = {}) {
    const active = favs.has(l.id);
    return `
      <button class="btn-heart ${active ? 'is-fav' : ''}" data-action="fav" data-id="${l.id}"
        aria-pressed="${active}" aria-label="${active ? 'Убрать из избранного' : 'Добавить в избранное'}"
        title="${active ? 'Убрать из избранного' : 'В избранное'}">
        ${icon('heart')}${withText ? `<span>${active ? 'В избранном' : 'В избранное'}</span>` : ''}
      </button>`;
  }

  /* ---------- карточка ---------- */

  function cardHTML(l, mode, dealIds) {
    const badges = [];
    if (mode === 'fit') {
      badges.push(`<span class="b b-fit">${icon('check')} Вписывается в бюджет</span>`);
      if (dealIds && dealIds.has(l.id)) badges.push(`<span class="b b-deal">${icon('sparkle')} Выгодный вариант</span>`);
    } else if (mode === 'over') {
      badges.push(`<span class="b b-over">${icon('sparkle')} Чуть выше бюджета</span>`);
    }

    const street = l.address.split(',').slice(1).join(',').trim();
    let diffHTML = '';
    if (mode === 'fit') {
      const d = budgetDiff(l, settings.budget);
      diffHTML = `<span class="diff ${d.cls}">${d.text}</span>`;
    } else if (mode === 'over') {
      const d = l.price - settings.budget;
      const pct = Math.round((d / settings.budget) * 100);
      diffHTML = `<span class="over-chip">+${fmt(d)} ₽ · +${pct}% к бюджету</span>`;
    } else if (mode === 'fav' && settings.budget >= B_MIN) {
      const d = budgetDiff(l, settings.budget);
      diffHTML = `<span class="diff ${d.cls}">${d.text}</span>`;
    }

    const tags = l.tags.slice(0, 3).map((t) => `<span class="tag">${esc(t)}</span>`).join('');

    return `
      <article class="card">
        <div class="card-media">
          ${galleryHTML(l)}
          <div class="card-badges">${badges.join('')}</div>
        </div>
        <div class="card-body">
          <h3 class="card-title">${esc(l.title)}</h3>
          <div class="card-loc">
            <span class="loc-chip">${icon('pin')} ${esc(l.localityName)}</span>
            ${street ? `<span class="addr">${esc(street)}</span>` : ''}
          </div>
          <div class="specs">${specsHTML(l)}</div>
          ${ratingHTML(l)}
          ${tags ? `<div class="tags">${tags}</div>` : ''}
          <div class="price-row">
            <div class="price">${fmtPrice(l.price)}<small>за ночь</small></div>
            ${diffHTML}
          </div>
          <div class="card-actions">
            <a class="btn btn-primary btn-sm" href="#/listing/${l.id}">Подробнее</a>
            <a class="btn btn-outline btn-sm" href="${esc(l.url)}" target="_blank" rel="noopener noreferrer">${icon('external')} Авито</a>
            ${favBtnHTML(l)}
          </div>
        </div>
      </article>`;
  }

  /* ---------- главная ---------- */

  const minPriceAll = Math.min(...LIST.map((l) => l.price));

  function renderHome() {
    document.title = 'Вписаться в Суздаль — жильё для поездки по вашему бюджету';
    viewEl.innerHTML = `
    <section class="hero">
      <div class="container hero-grid">
        <div class="hero-copy">
          <span class="hero-eyebrow">${icon('compass')} Travel-сервис · Золотое кольцо</span>
          <h1>Твоя поездка в&nbsp;Суздаль <span class="accent">начинается здесь</span></h1>
          <p class="lead">Найди уютное место для ночлега, не выходя за рамки бюджета. Мы уже собрали варианты — тебе осталось выбрать.</p>
          <ul class="hero-facts">
            <li>${icon('house')} ${DATA.meta.total} реальных вариантов</li>
            <li>${icon('wallet')} от ${fmtPrice(minPriceAll)} за ночь</li>
            <li>${icon('photo')} ${DATA.meta.withPhotos} с фотографиями</li>
          </ul>
          <a class="btn btn-primary" href="#search">${icon('key')} Подобрать жильё</a>
        </div>
        <div class="hero-visual">
          <div class="hero-photo">
            <img src="assets/hero.jpg" alt="Уютный интерьер жилья в Суздале" fetchpriority="high">
          </div>
          <div class="stamp-round" aria-hidden="true">
            <svg viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="57" fill="#FFF9EF"/>
              <circle cx="60" cy="60" r="44" fill="none" stroke="#26382D" stroke-dasharray="2.5 4"/>
              <g class="round-center-wrap"><circle class="round-center" cx="60" cy="60" r="17"/></g>
              <path d="M52 63.5 60 56l8 7.5" stroke="#FFF9EF" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
              <rect x="56.5" y="63.5" width="7" height="6" rx="1" fill="#FFF9EF"/>
              <defs><path id="circ" d="M60,18 a42,42 0 1,1 -0.01,0"/></defs>
              <text><textPath href="#circ">Суздаль · город-заповедник · Золотое кольцо ·&#160;</textPath></text>
            </svg>
          </div>
        </div>
      </div>
    </section>

    <section class="search-section container" id="search">
      <div class="postcard">
        <div class="postcard-stamp" aria-hidden="true">${icon('house')}<span>Суздаль</span></div>
        <p class="eyebrow">${icon('key')} Открытка для путешественника</p>
        <h2>Давай найдём твоё место</h2>
        <p class="form-sub">Задай бюджет на одну ночь — покажем, что в него вписывается. Честно и без переплат.</p>

        <form class="search-form" id="searchForm" novalidate>
          <div class="form-field">
            <p class="field-label">${icon('pin')} Место поездки</p>
            <div class="seg" role="group" aria-label="География поиска">
              <button type="button" data-scope="suzdal" class="${settings.scope === 'suzdal' ? 'on' : ''}">Только Суздаль</button>
              <button type="button" data-scope="all" class="${settings.scope === 'all' ? 'on' : ''}">Суздаль и окрестности</button>
            </div>
            <p class="seg-note" id="scopeNote"></p>
          </div>

          <div class="form-field">
            <p class="field-label">${icon('wallet')} Сколько готов потратить на одну ночь?</p>
            <div class="budget-row">
              <div class="budget-value"><span id="budgetBig">${fmt(settings.budget)} ₽</span><small>за ночь</small></div>
            </div>
            <div class="budget-row">
              <div class="budget-slider-wrap">
                <input type="range" id="budgetRange" min="${B_MIN}" max="${B_MAX}" step="${B_STEP}" value="${settings.budget}"
                  aria-label="Бюджет на одну ночь">
                <div class="range-marks"><span>${fmt(B_MIN)} ₽</span><span>${fmt(B_MAX)} ₽</span></div>
              </div>
              <label class="budget-input-wrap" aria-label="Бюджет в рублях">
                <input type="number" id="budgetInput" inputmode="numeric" min="${B_MIN}" max="${B_MAX}" step="${B_STEP}" value="${settings.budget}">
                <span>₽</span>
              </label>
            </div>
          </div>

          <div class="options-grid">
            <label class="switch-row">
              <input type="checkbox" id="optOver" ${settings.allowOver ? 'checked' : ''}>
              <span class="switch-ui" aria-hidden="true"></span>
              <span class="switch-text"><b>Показывать варианты немного выше бюджета</b><span>До +15% — вдруг тот самый мэтч совсем рядом</span></span>
            </label>
            <label class="switch-row">
              <input type="checkbox" id="optPhotos" ${settings.photosOnly ? 'checked' : ''}>
              <span class="switch-ui" aria-hidden="true"></span>
              <span class="switch-text"><b>Показывать только варианты с фотографиями</b><span>Без фото вариантов меньше, зато всё как на ладони</span></span>
            </label>
          </div>

          <div class="search-cta">
            <button type="submit" class="btn btn-primary">Найти моё жильё</button>
            <p class="cta-note">${icon('info')} Цены — из выгрузки объявлений на 21–22 ноября 2026 года для двух гостей.</p>
          </div>
        </form>
      </div>
    </section>

    <section class="container">
      <div class="vibe-band">
        ${icon('spruce')}
        <p>Суздальский вайб — <b>бесценен</b>.<br>А вот ночлег вполне можно подобрать по бюджету.</p>
        <p class="vibe-sub">Вписаться в Суздаль</p>
      </div>
    </section>`;

    // синхронизация формы
    const range = document.getElementById('budgetRange');
    const input = document.getElementById('budgetInput');
    const big = document.getElementById('budgetBig');
    const paint = () => {
      const p = ((+range.value - B_MIN) / (B_MAX - B_MIN)) * 100;
      range.style.background = `linear-gradient(90deg, var(--terra) ${p}%, #ead9a8 ${p}%)`;
    };
    const show = (v) => { big.textContent = `${fmt(v)} ₽`; };
    paint();

    range.addEventListener('input', () => {
      settings.budget = +range.value;
      input.value = range.value;
      show(settings.budget);
      paint();
      saveSettings();
    });
    input.addEventListener('input', () => {
      const raw = parseInt(String(input.value).replace(/\D/g, ''), 10);
      if (!isNaN(raw)) { settings.budget = clampStep(raw); range.value = settings.budget; paint(); }
      show(settings.budget);
      saveSettings();
    });
    input.addEventListener('blur', () => { input.value = settings.budget; });

    const note = document.getElementById('scopeNote');
    const updNote = () => {
      note.textContent = settings.scope === 'suzdal'
        ? `${DATA.meta.localities.suzdal} вариантов в самом Суздале`
        : `Суздаль (${DATA.meta.localities.suzdal}) · Посёлок Новый (${DATA.meta.localities.novy}) · Сельцо (${DATA.meta.localities.seltso}) · Ивановское (${DATA.meta.localities.ivanovskoe})`;
    };
    updNote();
    viewEl.querySelectorAll('[data-scope]').forEach((b) => {
      b.addEventListener('click', () => {
        settings.scope = b.dataset.scope;
        viewEl.querySelectorAll('[data-scope]').forEach((x) => x.classList.toggle('on', x === b));
        updNote();
        saveSettings();
      });
    });
    document.getElementById('optOver').addEventListener('change', (e) => { settings.allowOver = e.target.checked; saveSettings(); });
    document.getElementById('optPhotos').addEventListener('change', (e) => { settings.photosOnly = e.target.checked; saveSettings(); });

    document.getElementById('searchForm').addEventListener('submit', (e) => {
      e.preventDefault();
      location.hash = '#/results';
    });

    // якорь #search с главной кнопки — плавно проскроллить к форме
    viewEl.querySelector('a[href="#search"]').addEventListener('click', (e) => {
      e.preventDefault();
      document.getElementById('search').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  /* ---------- результаты ---------- */

  const TIPS = [
    'Не всегда самый дешёвый вариант — самый выгодный. Посмотри на площадь и кровати.',
    'Сравни площадь и стоимость: иногда +500 ₽ к бюджету дают вдвое больше простора.',
    'Обрати внимание на количество спальных мест — чтобы хватило всем.',
  ];

  function renderResults() {
    document.title = 'Вот что мы нашли — Вписаться в Суздаль';
    const budget = settings.budget;
    const base = scopedList();
    const inBudget = base.filter((l) => l.price <= budget);
    const over = settings.allowOver
      ? base.filter((l) => l.price > budget && l.price <= Math.round(budget * (1 + OVER_PCT)))
      : [];

    const sorted = [...inBudget].sort(SORTS[settings.sort].fn);
    const overSorted = [...over].sort((a, b) => a.price - b.price);

    // «Выгодный вариант» — пятёрка самых дешёвых подходящих
    const dealIds = new Set([...inBudget].sort((a, b) => a.price - b.price).slice(0, 5).map((l) => l.id));

    // статистика по вписывающимся
    const stats = inBudget.length ? {
      n: inBudget.length,
      min: Math.min(...inBudget.map((l) => l.price)),
      avg: inBudget.reduce((s, l) => s + l.price, 0) / inBudget.length,
      maxArea: Math.max(...inBudget.map((l) => l.area)),
    } : null;

    /* --- умные подсказки --- */
    let hintHTML = '';
    const hintActions = [];
    if (inBudget.length === 0) {
      const allScoped = LIST.filter((l) => settings.scope === 'all' || l.locality === 'suzdal');
      const minScoped = Math.min(...allScoped.map((l) => l.price));
      const noPhotoMatches = allScoped.filter((l) => l.price <= budget).length;
      let msg, isMagic = false;
      if (noPhotoMatches > 0) {
        msg = `<b>Фильтр «только с фото» всё спрятал</b><p>В этот бюджет вписывается ${noPhotoMatches} ${plural(noPhotoMatches, 'вариант', 'варианта', 'вариантов')} без фотографий. Включим их?</p>`;
        hintActions.push(`<button class="btn btn-primary btn-sm" data-action="photos-off">Показать и без фото</button>`);
      } else if (budget < minScoped) {
        isMagic = true;
        msg = `<b>Даже Суздальская магия имеет свою цену</b><p>Самый доступный вариант в выбранной географии — ${fmtPrice(minScoped)} за ночь. Попробуй добавить немного бюджета.</p>`;
        hintActions.push(`<button class="btn btn-primary btn-sm" data-action="budget-up" data-budget="${ceilStep(minScoped)}">Поднять бюджет до ${fmtPrice(ceilStep(minScoped))}</button>`);
      } else {
        msg = `<b>Кажется, бюджет немного не совпадает с местными прайсами</b><p>Ближайший вариант дороже твоей суммы. Попробуем увеличить её?</p>`;
        const next = allScoped.filter((l) => l.price > budget).sort((a, b) => a.price - b.price)[0];
        if (next) hintActions.push(`<button class="btn btn-primary btn-sm" data-action="budget-up" data-budget="${ceilStep(next.price)}">Поднять до ${fmtPrice(ceilStep(next.price))}</button>`);
      }
      hintHTML = `<div class="hint ${isMagic ? 'hint-warn' : ''}">${icon(isMagic ? 'sparkle' : 'info')}<div>${msg}<div class="hint-actions">${hintActions.join('')}</div></div></div>`;
    } else if (inBudget.length <= 3) {
      hintHTML = `<div class="hint">${icon('sparkle')}<div><b>Выбор небольшой, но кое-что интересное есть</b><p>Иногда лучший мэтч прячется в коротком списке.</p></div></div>`;
    } else if (inBudget.length >= 10) {
      hintHTML = `<div class="hint">${icon('sparkle')}<div><b>Ого, у тебя есть из чего выбирать!</b><p>Мы нашли ${inBudget.length} ${plural(inBudget.length, 'подходящее место', 'подходящих места', 'подходящих мест')} — лови выгодный вариант, пока его не забрали.</p></div></div>`;
    } else {
      hintHTML = `<div class="hint">${icon('sparkle')}<div><b>Хороший расклад</b><p>${inBudget.length} ${plural(inBudget.length, 'вариант', 'варианта', 'вариантов')} в бюджете — есть что сравнить.</p></div></div>`;
    }

    const tip = TIPS[(budget / B_STEP + inBudget.length) % TIPS.length];

    const scopeLabel = settings.scope === 'suzdal' ? 'Только Суздаль' : 'Суздаль и окрестности';
    const chips = `
      <span class="f-chip">${icon('wallet')} до ${fmtPrice(budget)}</span>
      <span class="f-chip">${icon('pin')} ${scopeLabel}</span>
      ${settings.photosOnly ? `<span class="f-chip">${icon('photo')} только с фото</span>` : ''}
      ${settings.allowOver ? `<span class="f-chip">${icon('sparkle')} и до +15%</span>` : ''}`;

    const sortNote = settings.sort === 'value'
      ? `<p class="sort-note">${icon('info')} «Цена за м²» здесь — просто сравнительный показатель соотношения стоимости и площади, а не оценка качества жилья.</p>`
      : (settings.sort === 'rating'
        ? `<p class="sort-note">${icon('info')} Варианты без подтверждённого рейтинга в данных показываются в конце списка.</p>` : '');

    const cardsHTML = sorted.length
      ? `<div class="cards-grid">${sorted.map((l) => cardHTML(l, 'fit', dealIds)).join('')}</div>`
      : `<div class="empty-block">
           ${icon('envelope')}
           <h3>В этот бюджет ничего не вписалось</h3>
           <p>Зато чуть выше — есть варианты, которые могут оказаться тем самым мэтчем.</p>
           <a class="btn btn-primary" href="#/">Изменить параметры поиска</a>
         </div>`;

    const overHTML = settings.allowOver && overSorted.length ? `
      <section class="results-sec over-sec">
        <div class="sec-divider">${icon('key')}</div>
        <div class="sec-head">
          <p class="eyebrow">До +15% к бюджету</p>
          <h2>Может, стоит немного доплатить?</h2>
          <p class="sub">Эти варианты дороже твоей суммы не больше чем на 15%. Иногда разница в тысячу рублей — это разница между «нормально» и «вау».</p>
        </div>
        <div class="cards-grid">${overSorted.map((l) => cardHTML(l, 'over')).join('')}</div>
      </section>` : '';

    viewEl.innerHTML = `
      <section class="results-head container">
        <a class="back-link" href="#/">${icon('arrowL')} Изменить поиск</a>
        <h1>Вот что мы нашли для тебя</h1>
        ${hintHTML}
        <p class="tip-line">${icon('sparkle')} ${esc(tip)}</p>

        ${stats ? `
        <div class="stats-grid">
          <div class="stat"><div class="num">${stats.n}</div><div class="cap">${plural(stats.n, 'вариант вписался', 'варианта вписалось', 'вариантов вписалось')}</div></div>
          <div class="stat"><div class="num">${fmtPrice(stats.min)}</div><div class="cap">минимум за ночь</div></div>
          <div class="stat"><div class="num">${fmtPrice(stats.avg)}</div><div class="cap">в среднем за ночь</div></div>
          <div class="stat"><div class="num">${fmtArea(stats.maxArea)} м²</div><div class="cap">максимальная площадь</div></div>
        </div>` : ''}

        <div class="toolbar">
          <span class="toolbar-label">Сортировка</span>
          <div class="select-wrap">
            <select id="sortSel" aria-label="Сортировка результатов">
              ${Object.entries(SORTS).map(([k, v]) => `<option value="${k}" ${settings.sort === k ? 'selected' : ''}>${v.label}</option>`).join('')}
            </select>
          </div>
          <div class="filter-chips">${chips}</div>
        </div>
        ${sortNote}
        ${priceNoteHTML()}
      </section>

      <section class="results-sec container">
        <div class="sec-divider">${icon('key')}</div>
        <div class="sec-head">
          <p class="eyebrow">Точно по твоей сумме</p>
          <h2>Вписываются в твой бюджет</h2>
        </div>
        ${cardsHTML}
      </section>

      ${overHTML}
    `;

    document.getElementById('sortSel').addEventListener('change', (e) => {
      settings.sort = e.target.value;
      saveSettings();
      renderResults();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  /* ---------- детальная страница ---------- */

  function renderListing(id) {
    const l = BY_ID.get(id);
    if (!l) {
      viewEl.innerHTML = `<div class="container"><div class="empty-block" style="margin-top:40px">${icon('envelope')}<h3>Объявление не найдено</h3><p>Возможно, ссылка устарела.</p><a class="btn btn-primary" href="#/">На главную</a></div></div>`;
      return;
    }
    document.title = `${l.title} — ${fmtPrice(l.price)} · Вписаться в Суздаль`;

    const street = l.address.split(',').slice(1).join(',').trim();
    const d = budgetDiff(l, settings.budget);
    const active = favs.has(l.id);
    const paragraphs = l.description.split(/\n+/).map((p) => p.trim()).filter(Boolean);
    const thumbs = l.photos.length > 1 ? `
      <div class="gal-thumbs">
        ${l.photos.map((u, i) => `
          <button class="${i === 0 ? 'on' : ''}" data-action="gal-thumb" data-i="${i}" aria-label="Фото ${i + 1}">
            <img src="${esc(u)}" alt="" loading="lazy">
          </button>`).join('')}
        ${l.photosMore > 0 ? `<a class="more-ph" href="${esc(l.url)}" target="_blank" rel="noopener noreferrer">ещё<br>${l.photosMore}</a>` : ''}
      </div>` : '';

    viewEl.innerHTML = `
      <section class="detail container">
        <a class="back-link" href="#/results">${icon('arrowL')} К результатам</a>
        <div class="detail-grid">
          <div class="detail-gallery">
            ${galleryHTML(l, { big: true })}
            ${thumbs}
            ${l.photosMore > 0 ? `<p class="photos-note">${icon('photo')} Показаны первые ${l.photos.length} ${plural(l.photos.length, 'фото', 'фото', 'фото')} · в объявлении есть ещё ${l.photosMore}</p>` : ''}
            ${!l.photos.length ? `<p class="photos-note">${icon('photo')} В этой выгрузке у объявления нет фото — смотрите их в исходном объявлении.</p>` : ''}
          </div>

          <div class="detail-info detail-sticky">
            <p class="eyebrow">${icon('pin')} ${esc(l.localityName)}</p>
            <h1>${esc(l.title)}</h1>
            <div class="detail-meta">
              ${street ? `<span class="addr">${icon('pin')} ${esc(street)}</span>` : ''}
              ${ratingHTML(l)}
            </div>

            <div class="detail-specs">
              <div class="d-spec">${icon('door')}<div><b>${esc(l.typeShort)}</b><span>тип жилья</span></div></div>
              <div class="d-spec">${icon('ruler')}<div><b>${fmtArea(l.area)} м²</b><span>площадь</span></div></div>
              <div class="d-spec">${icon('bed')}<div><b>${l.beds != null ? `${l.beds} ${bedsWord(l.beds)}` : (l.floor ? `${esc(l.floor)} эт.` : '—')}</b><span>${l.beds != null ? 'спальные места' : 'этаж'}</span></div></div>
              <div class="d-spec">${icon('house')}<div><b>${esc(l.localityName)}</b><span>населённый пункт</span></div></div>
            </div>

            ${l.tags.length ? `<div class="tags detail-tags">${l.tags.map((t) => `<span class="tag">${esc(t)}</span>`).join('')}</div>` : ''}

            <div class="price-ticket">
              <div class="pt-label">Стоимость за ночь</div>
              <div class="pt-price">${fmtPrice(l.price)}</div>
              <div class="pt-note">по данным выгрузки для двух гостей</div>
              <div class="pt-diff">${d.text}</div>
              <a class="btn btn-block" href="${esc(l.url)}" target="_blank" rel="noopener noreferrer">${icon('external')} Открыть объявление и забронировать</a>
              <p class="book-warning">${icon('info')} Итоговая цена, наличие свободных дат и условия бронирования подтверждаются непосредственно на Авито.</p>
            </div>

            <div class="detail-side-actions">
              ${favBtnHTML(l)}
              <a class="btn btn-outline" href="#/results" style="flex:1">${icon('arrowL')} К результатам</a>
            </div>
          </div>
        </div>

        <div class="prose" style="margin-top:clamp(26px,4vw,40px)">
          <div class="sec-divider">${icon('envelope')}</div>
          <h2>Об этом месте</h2>
          ${paragraphs.map((p) => `<p>${esc(p)}</p>`).join('')}
          ${priceNoteHTML()}
        </div>
      </section>`;
  }

  /* ---------- избранное ---------- */

  function renderFavorites() {
    document.title = 'Избранное — Вписаться в Суздаль';
    const items = [...favs].map((id) => BY_ID.get(id)).filter(Boolean);

    if (!items.length) {
      viewEl.innerHTML = `
        <section class="container" style="padding-top:clamp(30px,6vw,60px)">
          <div class="empty-block">
            ${icon('envelope')}
            <h3>Пока здесь пусто</h3>
            <p>Но твоё идеальное место где-то рядом — стоит только задать бюджет.</p>
            <a class="btn btn-primary" href="#/">${icon('key')} Подобрать жильё</a>
          </div>
        </section>`;
      return;
    }

    viewEl.innerHTML = `
      <section class="results-head container">
        <h1>Избранное</h1>
        <p class="tip-line">${icon('heart')} ${items.length} ${plural(items.length, 'вариант', 'варианта', 'вариантов')} · сохранено в этом браузере</p>
        <div class="cards-grid" style="margin-top:22px">
          ${items.map((l) => cardHTML(l, 'fav')).join('')}
        </div>
        ${priceNoteHTML()}
      </section>`;
  }

  /* ---------- о проекте ---------- */

  function renderAbout() {
    document.title = 'О проекте — Вписаться в Суздаль';
    viewEl.innerHTML = `
      <section class="container" style="padding-top:clamp(24px,5vw,46px)">
        <p class="eyebrow">${icon('compass')} О проекте</p>
        <h1 style="font-size:clamp(2rem,6vw,3.1rem)">Вписаться в Суздаль</h1>
        <p class="sub" style="max-width:640px;margin:12px 0 0;color:rgba(81,65,50,.9)">
          Небольшой travel-сервис для тех, кто едет в город-заповедник и хочет эстетики без переплат.
          Мы не продаём жильё и не проверяем доступность в реальном времени — просто честно показываем,
          что из реальных объявлений вписывается в твой бюджет.
        </p>

        <div class="about-grid">
          <div class="about-card">
            <h2>Как это работает</h2>
            <ol class="steps">
              <li><span class="n">1</span><div><b>Задаёшь бюджет на ночь</b><br>от 3 000 до 20 000 ₽ — слайдером или вручную.</div></li>
              <li><span class="n">2</span><div><b>Выбираешь географию</b><br>сам Суздаль или вместе с окрестностями — посёлком Новый, Сельцом и Ивановским.</div></li>
              <li><span class="n">3</span><div><b>Сравниваешь и выбираешь</b><br>сортируй по цене, простору, рейтингу или цене за метр, складывай в избранное, бронируй на Авито.</div></li>
            </ol>
          </div>

          <div class="about-card">
            <h2>Что в данных</h2>
            <p>В основе — выгрузка ${DATA.meta.total} реальных объявлений посуточной аренды с Авито, сделанная для поиска на 21–22 ноября 2026 года для двух гостей. Персональные данные продавцов исключены, цены не менялись.</p>
            <ul class="facts">
              <li><b>${DATA.meta.localities.suzdal}</b>Суздаль</li>
              <li><b>${DATA.meta.localities.novy}</b>Посёлок Новый</li>
              <li><b>${DATA.meta.localities.seltso}</b>Село Сельцо</li>
              <li><b>${DATA.meta.localities.ivanovskoe}</b>Село Ивановское</li>
              <li><b>${DATA.meta.withPhotos}</b>объявлений с фото</li>
              <li><b>3–20 тыс. ₽</b>цены за ночь</li>
            </ul>
            <p style="margin-top:14px">${icon('info')} ${esc(DATA.meta.sourceNote)}</p>
          </div>

          <div class="about-card">
            <h2>Честные ограничения</h2>
            <p>· Сервис не проверяет актуальную доступность жилья — свободные даты и итоговую цену смотри на Авито.</p>
            <p>· Рейтинг и отзывы показаны только там, где они подтверждены исходными данными.</p>
            <p>· Часть объявлений в выгрузке без фотографий — их можно скрыть одним тумблером.</p>
            <p>· Избранное и настройки хранятся только в твоём браузере (localStorage). Никакой регистрации и слежки — это база.</p>
          </div>

          <div class="about-card wide">
            <h2>Палитра и настроение</h2>
            <p>Кремовый фон, лесной зелёный, терракота и шалфей — цвета здешних лугов, дерева и куполов. Иллюстрации, открытки и штампы — как воспоминания из поездки.</p>
            <div class="palette-dots" aria-hidden="true">
              <span style="background:#fae7b5"></span><span style="background:#26382D"></span>
              <span style="background:#B66D4D"></span><span style="background:#743B43"></span>
              <span style="background:#514132"></span><span style="background:#8B947D"></span>
              <span style="background:#FFF9EF"></span>
            </div>
          </div>
        </div>
      </section>`;
  }

  /* ---------- избранное: переключение ---------- */

  function updateFavUI() {
    const count = favs.size;
    const badge = document.getElementById('favCount');
    badge.textContent = count;
    badge.hidden = count === 0;
    document.querySelectorAll('[data-action="fav"]').forEach((btn) => {
      const on = favs.has(btn.dataset.id);
      btn.classList.toggle('is-fav', on);
      btn.setAttribute('aria-pressed', String(on));
      const label = btn.querySelector('span');
      if (label) label.textContent = on ? 'В избранном' : 'В избранное';
    });
  }

  function toggleFav(id) {
    if (favs.has(id)) favs.delete(id); else favs.add(id);
    saveFavs();
    if (location.hash === '#/favorites') { renderFavorites(); updateFavUI(); }
    else updateFavUI();
  }

  /* ---------- роутер ---------- */

  const routes = {
    '': renderHome,
    '#/': renderHome,
    '#/results': renderResults,
    '#/favorites': renderFavorites,
    '#/about': renderAbout,
  };

  function route() {
    const hash = decodeURIComponent(location.hash) || '#/';
    const navKey = hash.startsWith('#/listing/') ? 'home' : (routes[hash] ? hash.slice(2) || 'home' : '');
    document.querySelectorAll('.main-nav a').forEach((a) => {
      const key = a.dataset.nav;
      a.setAttribute('aria-current', key === navKey ? 'page' : 'false');
    });

    if (hash.startsWith('#/listing/')) renderListing(hash.slice('#/listing/'.length));
    else (routes[hash] || renderHome)();

    window.scrollTo(0, 0);
    updateFavUI();
  }

  /* ---------- глобальные события ---------- */

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const act = btn.dataset.action;

    if (act === 'fav') { toggleFav(btn.dataset.id); return; }

    if (act === 'gal-prev' || act === 'gal-next') {
      const gal = btn.closest('[data-gal]');
      if (gal) galStep(gal, act === 'gal-next' ? 1 : -1);
      return;
    }
    if (act === 'gal-dot') {
      const gal = btn.closest('[data-gal]');
      if (gal) galGo(gal, +btn.dataset.i);
      return;
    }
    if (act === 'gal-thumb') {
      const gal = btn.closest('.detail-gallery').querySelector('[data-gal]');
      if (gal) galGo(gal, +btn.dataset.i);
      return;
    }
    if (act === 'budget-up') {
      settings.budget = clampStep(+btn.dataset.budget || settings.budget);
      saveSettings();
      renderResults();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (act === 'photos-off') {
      settings.photosOnly = false;
      saveSettings();
      renderResults();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });

  // свайп по галерее на тач-устройствах
  let touchX = null, touchY = null;
  document.addEventListener('touchstart', (e) => {
    const gal = e.target.closest('[data-gal]');
    if (!gal) return;
    touchX = e.touches[0].clientX;
    touchY = e.touches[0].clientY;
  }, { passive: true });
  document.addEventListener('touchend', (e) => {
    const gal = e.target.closest('[data-gal]');
    if (!gal || touchX === null) return;
    const dx = e.changedTouches[0].clientX - touchX;
    const dy = e.changedTouches[0].clientY - touchY;
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.4) galStep(gal, dx < 0 ? 1 : -1);
    touchX = touchY = null;
  }, { passive: true });

  // заглушка для незагрузившихся изображений
  document.addEventListener('error', (e) => {
    const t = e.target;
    if (t && t.tagName === 'IMG' && !t.dataset.err) {
      t.dataset.err = '1';
      t.src = PLACEHOLDER;
      t.alt = 'Фото недоступно';
    }
  }, true);

  window.addEventListener('hashchange', route);
  route();
})();
