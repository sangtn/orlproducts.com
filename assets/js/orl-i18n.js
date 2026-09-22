/* Origami Learn — page translation.
 *
 * One page per document, one JSON file per language. Everything marked
 * data-i18n is replaced in place; the English written into the HTML is the
 * fallback, so a failed fetch leaves a readable page rather than an empty one.
 */
(function () {
  'use strict';
  var SUPPORTED = ['en', 'vi', 'ja', 'es', 'zh-Hans'];
  var STORE_KEY = 'orl-lang';
  var EMAIL = 'info@orlproducts.com';
  var cache = {};

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

  function normalise(tag) {
    if (!tag) return null;
    var t = String(tag).toLowerCase();
    if (t.indexOf('vi') === 0) return 'vi';
    if (t.indexOf('ja') === 0) return 'ja';
    if (t.indexOf('es') === 0) return 'es';
    // zh-TW and zh-HK are traditional; only simplified is translated, so they
    // fall through to English rather than being shown the wrong script.
    if (t === 'zh' || t.indexOf('zh-cn') === 0 || t.indexOf('zh-hans') === 0 ||
        t.indexOf('zh-sg') === 0) return 'zh-Hans';
    if (t.indexOf('en') === 0) return 'en';
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
    document.documentElement.setAttribute('lang', lang);
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      var v = dict[el.getAttribute('data-i18n')];
      if (typeof v !== 'string') return;
      if (v.indexOf('%EMAIL%') >= 0) {
        el.innerHTML = '';
        v.split('%EMAIL%').forEach(function (part, i) {
          if (i > 0) {
            var a = document.createElement('a');
            a.href = 'mailto:' + EMAIL;
            a.textContent = EMAIL;
            el.appendChild(a);
          }
          el.appendChild(document.createTextNode(part));
        });
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
    var t = dict['meta.title'];
    if (t) document.title = t;
    document.querySelectorAll('[data-lang-option]').forEach(function (el) {
      el.setAttribute('aria-current', el.getAttribute('data-lang-option') === lang
        ? 'true' : 'false');
    });
    var picker = document.querySelector('[data-lang-select]');
    if (picker) picker.value = lang;
    document.documentElement.classList.add('i18n-ready');
  }

  function load(lang) {
    if (cache[lang]) { apply(cache[lang], lang); return Promise.resolve(); }
    return fetch('assets/i18n/origamilearn.' + lang + '.json')
      .then(function (r) {
        if (!r.ok) throw new Error(r.status);
        return r.json();
      })
      .then(function (dict) { cache[lang] = dict; apply(dict, lang); })
      .catch(function () {
        // Leave the English in place; a missing file must not blank the page.
        document.documentElement.classList.add('i18n-ready');
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

  function start() { snapshotEnglish(); wire(); load(preferred()); }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
