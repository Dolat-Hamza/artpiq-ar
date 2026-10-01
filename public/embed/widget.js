/*
 * ArtPiq "Visualise in your home" widget.
 * <script src="https://<origin>/embed/widget.js" defer></script>
 * <artpiq-widget owner="<uuid>" type="my-wall|sample-room" collection="<uuid>,<uuid>" artwork="<id>"
 *   text="Visualise in your home" bgcolor="#ed1c78" fontcolor="#ffffff"></artpiq-widget>
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
  var PARAMS = ['owner', 'collection', 'artwork'];
  var CSS =
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
      var root = this.attachShadow({ mode: 'open' });
      var style = document.createElement('style');
      style.textContent = CSS;
      var button = document.createElement('button');
      button.type = 'button';
      button.setAttribute('part', 'button');
      button.textContent = this.getAttribute('text') || DEFAULT_LABEL;
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
      var dialog = this._dialog || (this._dialog = this._build());
      if (dialog.open) return;
      var html = document.documentElement;
      this._prevOverflow = html.style.overflow;
      html.style.overflow = 'hidden';
      dialog.showModal();
    }

    _build() {
      var label = this.getAttribute('text') || DEFAULT_LABEL;
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
      iframe.src = origin + '/embed/' + mode + '?' + params.toString();

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
})();
