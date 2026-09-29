/* Page translation for the app pages on orlproducts.com (Origami Learn, Raykin).
 *
 * One page per document, one JSON file per app and language:
 * assets/i18n/<app>.<lang>.json, shared by that app's landing, privacy, terms
 * and support pages. Everything marked data-i18n is replaced in place; the
 * English written into the HTML is the fallback, so a failed fetch leaves a
 * readable page rather than an empty one.
 *
 * A page can set, on <html>:
 *   data-i18n-page="raykin"        which JSON files to load (default: origamilearn)
 *   data-i18n-contact="mailto:…"   where %EMAIL% links to (default: the Telegram group)
 * The languages offered are the <option>s of the page's [data-lang-select]
 * picker; a page without one gets the original Origami Learn list.
 */
(function () {
  'use strict';
  var root = document.documentElement;
  var PAGE = root.getAttribute('data-i18n-page') || 'origamilearn';
  var SUPPORTED = ['en', 'vi', 'ja', 'es', 'zh-Hans'];
  var STORE_KEY = 'orl-lang';
  var EMAIL = 'info@orlproducts.com';
  var CONTACT = root.getAttribute('data-i18n-contact') || 'https://t.me/+MF4aYRoVeEJlMTVl';
  var cache = {};

  function readLanguages() {
    var picker = document.querySelector('[data-lang-select]');
    if (!picker || !picker.options.length) return;
    var list = [];
    for (var i = 0; i < picker.options.length; i++) list.push(picker.options[i].value);
    SUPPORTED = list;
  }

  /* The English text only exists in the HTML, so it has to be snapshotted
   * before anything overwrites it — otherwise switching to another language
   * and back leaves the page stuck in that language. */
  function snapshotEnglish() {
    var dict = {};
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      dict[el.getAttribute('data-i18n')] = el.getAttribute('data-i18n-html') === 'keep'
        ? el.innerHTML : el.textContent;
    });
    ['alt', 'content', 'title', 'placeholder', 'aria-label'].forEach(function (attr) {
      document.querySelectorAll('[data-i18n-' + attr + ']').forEach(function (el) {
        dict[el.getAttribute('data-i18n-' + attr)] = el.getAttribute(attr);
      });
    });
    cache.en = dict;
  }

  function supported(code) { return SUPPORTED.indexOf(code) >= 0 ? code : null; }

  /* Maps a browser or ?lang= tag onto one of the page's languages. Chinese is
   * matched by script: zh-TW, zh-HK and zh-MO are Traditional, so a page that
   * only has Simplified leaves them in English rather than the wrong script. */
  function normalise(tag) {
    if (!tag) return null;
    var t = String(tag).toLowerCase().replace(/_/g, '-');
    for (var i = 0; i < SUPPORTED.length; i++) {
      if (SUPPORTED[i].toLowerCase() === t) return SUPPORTED[i];
    }
    var base = t.split('-')[0];
    if (base === 'zh') {
      if (t.indexOf('hans') >= 0) return supported('zh-Hans');
      if (t.indexOf('hant') >= 0 || /-(tw|hk|mo)(-|$)/.test(t)) return supported('zh-Hant');
      return supported('zh-Hans');
    }
    for (var j = 0; j < SUPPORTED.length; j++) {
      if (SUPPORTED[j].toLowerCase().split('-')[0] === base) return SUPPORTED[j];
    }
    return null;
  }

  function preferred() {
    var q = new URLSearchParams(location.search).get('lang');
    var fromQuery = normalise(q);
    if (fromQuery) return fromQuery;
    try {
      var saved = localStorage.getItem(STORE_KEY);
      if (SUPPORTED.indexOf(saved) >= 0) return saved;
    } catch (e) { /* private browsing: fall through */ }
    var list = navigator.languages || [navigator.language];
    for (var i = 0; i < list.length; i++) {
      var m = normalise(list[i]);
      if (m) return m;
    }
    return 'en';
  }

  function apply(dict, lang) {
    root.setAttribute('lang', lang);
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      var v = dict[el.getAttribute('data-i18n')];
      if (typeof v !== 'string') return;
      if (v.indexOf('%EMAIL%') >= 0) {
        el.innerHTML = '';
        v.split('%EMAIL%').forEach(function (part, i) {
          if (i > 0) {
            var a = document.createElement('a');
            a.href = CONTACT;
            if (/^https?:/i.test(CONTACT)) {
              a.target = '_blank';
              a.rel = 'noopener';
            }
            a.textContent = EMAIL;
            el.appendChild(a);
          }
          el.appendChild(document.createTextNode(part));
        });
      } else if (el.getAttribute('data-i18n-html') === 'keep') {
        el.innerHTML = v;
      } else {
        el.textContent = v;
      }
    });
    // Attributes: data-i18n-alt="key", data-i18n-content="key", and so on.
    ['alt', 'content', 'title', 'placeholder', 'aria-label'].forEach(function (attr) {
      document.querySelectorAll('[data-i18n-' + attr + ']').forEach(function (el) {
        var v = dict[el.getAttribute('data-i18n-' + attr)];
        if (typeof v === 'string') el.setAttribute(attr, v);
      });
    });
    // A <title> with its own data-i18n key was set above; only pages without
    // one take the landing page's title.
    var t = dict['meta.title'];
    if (t && !document.querySelector('title[data-i18n]')) document.title = t;
    document.querySelectorAll('[data-lang-option]').forEach(function (el) {
      el.setAttribute('aria-current', el.getAttribute('data-lang-option') === lang
        ? 'true' : 'false');
    });
    var picker = document.querySelector('[data-lang-select]');
    if (picker) picker.value = lang;
    root.classList.add('i18n-ready');
  }

  function load(lang) {
    if (cache[lang]) { apply(cache[lang], lang); return Promise.resolve(); }
    return fetch('assets/i18n/' + PAGE + '.' + lang + '.json')
      .then(function (r) {
        if (!r.ok) throw new Error(r.status);
        return r.json();
      })
      .then(function (dict) { cache[lang] = dict; apply(dict, lang); })
      .catch(function () {
        // Leave the English in place; a missing file must not blank the page.
        root.classList.add('i18n-ready');
      });
  }

  function choose(lang) {
    if (SUPPORTED.indexOf(lang) < 0) return;
    try { localStorage.setItem(STORE_KEY, lang); } catch (e) { /* ignore */ }
    load(lang);
    var url = new URL(location.href);
    if (lang === 'en') url.searchParams.delete('lang');
    else url.searchParams.set('lang', lang);
    history.replaceState(null, '', url);
  }

  function wire() {
    document.querySelectorAll('[data-lang-option]').forEach(function (el) {
      el.addEventListener('click', function (e) {
        e.preventDefault();
        choose(el.getAttribute('data-lang-option'));
      });
    });
    var picker = document.querySelector('[data-lang-select]');
    if (picker) picker.addEventListener('change', function () { choose(picker.value); });
  }

  function start() { readLanguages(); snapshotEnglish(); wire(); load(preferred()); }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
