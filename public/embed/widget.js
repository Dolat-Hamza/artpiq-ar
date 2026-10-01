/*
 * ArtPiq "Visualise in your home" widget.
 * <script src="https://<origin>/embed/widget.js" defer></script>
 * <artpiq-widget owner="<uuid>" type="my-wall|sample-room|ar" collection="<uuid>,<uuid>" artwork="<id>"
 *   text="Visualise in your home" bgcolor="#ed1c78" fontcolor="#ffffff"></artpiq-widget>
 * Squarespace footer: <script src=".../embed/widget.js" data-owner="<uuid>" data-product-ar defer></script>
 */
(function () {
  'use strict';

  // currentScript is only set while this file evaluates.
  var script = document.currentScript;
  if (!script || !script.src || !window.customElements) return;
  // The snippet may be pasted several times on one page.
  if (window.customElements.get('artpiq-widget')) return;

  var origin = new URL(script.src).origin;
  var HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
  var DEFAULT_LABEL = 'Visualise in your home';
  var AR_LABEL = 'View on your wall';
  var PARAMS = ['owner', 'collection', 'artwork'];
  var STYLES =
    ':host{display:inline-block}' +
    'button[part=button]{background:var(--artpiq-bg);color:var(--artpiq-fg);border:0;border-radius:2px;' +
    'padding:.85em 1.5em;font:inherit;font-weight:600;line-height:1.2;letter-spacing:.02em;cursor:pointer}' +
    'button[part=button]:hover{filter:brightness(1.08)}' +
    'button:focus-visible{outline:2px solid currentColor;outline-offset:2px}' +
    'dialog{width:100vw;height:100dvh;max-width:none;max-height:none;margin:0;padding:0;border:0;' +
    'background:#141210;overflow:hidden}' +
    'iframe{display:block;width:100%;height:100%;border:0}' +
    '.close{position:absolute;z-index:1;top:max(12px,env(safe-area-inset-top));right:max(12px,env(safe-area-inset-right));' +
    'width:40px;height:40px;border:0;border-radius:50%;background:rgba(20,18,16,.72);color:#fff;' +
    'font:24px/1 system-ui,sans-serif;cursor:pointer}';

  var frames = [];

  function colour(value, fallback) {
    return value && HEX.test(value) ? value : fallback;
  }

  function labelOf(el) {
    return el.getAttribute('text') || (el.getAttribute('type') === 'ar' ? AR_LABEL : DEFAULT_LABEL);
  }

  function arUrl(el) {
    return origin + '/ar/' + encodeURIComponent(el.getAttribute('artwork'));
  }

  // Only our own iframe may drive its dialog; 'ready' means the embed renders its own close.
  window.addEventListener('message', function (event) {
    var type = event.data && event.data.type;
    if (event.origin !== origin || (type !== 'artpiq:close' && type !== 'artpiq:ready')) return;
    frames.forEach(function (f) {
      if (!f.dialog.open || f.iframe.contentWindow !== event.source) return;
      if (type === 'artpiq:close') f.dialog.close();
      else f.close.hidden = true;
    });
  });

  window.customElements.define('artpiq-widget', class extends HTMLElement {
    connectedCallback() {
      if (this._artpiqRendered) return;
      this._artpiqRendered = true;
      if (!this.getAttribute('owner')) {
        console.warn('[artpiq-widget] missing owner');
        return;
      }
      if (this.getAttribute('type') === 'ar' && !this.getAttribute('artwork')) {
        console.warn('[artpiq-widget] missing artwork');
        return;
      }
      var root = this.attachShadow({ mode: 'open' });
      var style = document.createElement('style');
      style.textContent = STYLES;
      var button = document.createElement('button');
      button.type = 'button';
      button.setAttribute('part', 'button');
      button.textContent = labelOf(this);
      button.style.setProperty('--artpiq-bg', colour(this.getAttribute('bgcolor'), '#141210'));
      button.style.setProperty('--artpiq-fg', colour(this.getAttribute('fontcolor'), '#ffffff'));
      button.addEventListener('click', this._open.bind(this));
      root.append(style, button);
    }

    disconnectedCallback() {
      // Removing an open dialog fires no close event, so the scroll lock would stick.
      if (this._dialog && this._dialog.open) this._dialog.close();
    }

    _open() {
      // AR Quick Look and Scene Viewer only launch from a top-level page.
      if (this.getAttribute('type') === 'ar' && window.matchMedia('(pointer: coarse)').matches) {
        window.location.assign(arUrl(this));
        return;
      }
      var dialog = this._dialog || (this._dialog = this._build());
      if (dialog.open) return;
      var html = document.documentElement;
      this._prevOverflow = html.style.overflow;
      html.style.overflow = 'hidden';
      dialog.showModal();
    }

    _build() {
      var label = labelOf(this);
      var type = this.getAttribute('type');
      var mode = type === 'sample-room' ? 'sample-room' : 'my-wall';
      var params = new URLSearchParams();
      PARAMS.forEach(function (name) {
        var value = this.getAttribute(name);
        if (value) params.set(name, value);
      }, this);

      var dialog = document.createElement('dialog');
      dialog.setAttribute('part', 'dialog');
      dialog.setAttribute('aria-label', label);
      var close = document.createElement('button');
      close.type = 'button';
      close.className = 'close';
      close.setAttribute('aria-label', 'Close');
      close.textContent = '×';
      close.addEventListener('click', function () { dialog.close(); });
      var iframe = document.createElement('iframe');
      iframe.title = label;
      iframe.setAttribute('allow', 'camera; fullscreen; xr-spatial-tracking');
      iframe.src = type === 'ar' ? arUrl(this) : origin + '/embed/' + mode + '?' + params.toString();

      var self = this;
      dialog.addEventListener('close', function () {
        document.documentElement.style.overflow = self._prevOverflow || '';
      });
      dialog.append(close, iframe);
      this.shadowRoot.appendChild(dialog);
      frames.push({ dialog: dialog, iframe: iframe, close: close });
      return dialog;
    }
  });

  // Most specific first; a plain selector list would pick the outermost by document order.
  var PRODUCT_TARGETS = ['.ProductItem-details', '.ProductItem', '#productWrapper', '.product-block', '[data-product-id]'];
  var ADD_ON = /add[-_ ]?on/i;
  var inflight = null;

  // Not currentScript: a plain Code Block copy may have loaded first and defined the element.
  function productConfig() {
    var scripts = document.querySelectorAll('script[data-product-ar]');
    for (var i = 0; i < scripts.length; i++) {
      if (/\/embed\/widget\.js$/.test(new URL(scripts[i].src, location.href).pathname)) return scripts[i];
    }
    return null;
  }

  function currentProduct() {
    var ctx = window.Static && window.Static.SQUARESPACE_CONTEXT;
    return ctx && ctx.item && ctx.product && ctx.item.id && ctx.item.fullUrl ? ctx.item : null;
  }

  function placed(id) {
    return document.querySelector('artpiq-widget[data-artpiq-product="' + CSS.escape(id) + '"]');
  }

  function okJson(res) {
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return res.json();
  }

  function insertProductButton(config, id, artwork) {
    var el = document.createElement('artpiq-widget');
    el.setAttribute('owner', config.getAttribute('data-owner'));
    el.setAttribute('type', 'ar');
    el.setAttribute('artwork', artwork);
    el.setAttribute('data-artpiq-product', id);
    var text = config.getAttribute('data-text');
    var bg = colour(config.getAttribute('data-bgcolor'), '');
    var fg = colour(config.getAttribute('data-fontcolor'), '');
    if (text) el.setAttribute('text', text);
    if (bg) el.setAttribute('bgcolor', bg);
    if (fg) el.setAttribute('fontcolor', fg);
    var wrapper = document.querySelector('.sqs-add-to-cart-button-wrapper');
    var host = null;
    for (var i = 0; !wrapper && !host && i < PRODUCT_TARGETS.length; i++) host = document.querySelector(PRODUCT_TARGETS[i]);
    if (wrapper) wrapper.after(el);
    else if (host) host.append(el);
  }

  function productAr() {
    var config = productConfig();
    if (!config || !config.getAttribute('data-owner')) return;
    var item = currentProduct();
    var id = item ? String(item.id) : '';
    document.querySelectorAll('artpiq-widget[data-artpiq-product]').forEach(function (el) {
      if (el.getAttribute('data-artpiq-product') !== id) el.remove();
    });
    if (!id || placed(id) || inflight === id) return;
    inflight = id;

    var tag = (config.getAttribute('data-ar-tag') || 'AR').trim().toLowerCase();
    var page = new URL(item.fullUrl, location.origin);
    page.searchParams.set('format', 'json');
    fetch(page, { credentials: 'same-origin' })
      .then(okJson)
      .then(function (data) {
        var tags = (data && data.item && data.item.tags) || [];
        var tagged = tags.some(function (t) { return String(t).toLowerCase() === tag; });
        if (!tagged || tags.some(function (t) { return ADD_ON.test(t); })) return null;
        var variants = data.item.structuredContent && data.item.structuredContent.variants;
        var sku = variants && variants[0] && variants[0].sku;
        if (!sku) return null;
        var query = new URLSearchParams({ owner: config.getAttribute('data-owner'), sku: sku });
        return fetch(origin + '/api/ar/resolve?' + query, { credentials: 'omit' }).then(function (res) {
          return res.status === 404 ? null : okJson(res);
        });
      })
      .then(function (match) {
        // AJAX navigation may have moved on while we were fetching.
        var now = currentProduct();
        if (!match || !match.id || !now || String(now.id) !== id || placed(id)) return;
        insertProductButton(config, id, String(match.id));
      })
      .catch(function (err) {
        console.warn('[artpiq-widget] product AR unavailable', err);
      })
      .finally(function () {
        if (inflight === id) inflight = null;
      });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', productAr, { once: true });
  else productAr();
  // Squarespace 7.0 AJAX page loads.
  window.addEventListener('mercury:load', productAr);
})();
