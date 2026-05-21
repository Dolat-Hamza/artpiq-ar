/*
 * ArtPiq newsletter embed.
 *
 * Drop this snippet on any HTML site (Squarespace code block, Wix HTML embed,
 * static page, etc.):
 *
 *   <script src="https://app.artpiq.com/embed/newsletter.js"
 *           data-owner="YOUR_OWNER_ID"
 *           data-accent="#111"
 *           data-heading="Stay in the loop"
 *           data-button="Subscribe"
 *           defer></script>
 *
 * The script renders a styled <form> inside a shadow DOM (so it doesn't
 * inherit or pollute the host site's CSS) and POSTs `{ email, name, source,
 * ownerId }` to `<origin>/api/subscribe`. Includes a honeypot field for
 * basic bot defence.
 */
(function () {
  'use strict';

  var script = document.currentScript || (function () {
    var all = document.getElementsByTagName('script');
    return all[all.length - 1];
  })();
  if (!script) return;

  var ownerId = script.getAttribute('data-owner');
  if (!ownerId) {
    console.warn('[artpiq newsletter] Missing data-owner attribute.');
    return;
  }
  var accent = script.getAttribute('data-accent') || '#111';
  var heading = script.getAttribute('data-heading') || 'Stay in the loop';
  var subheading = script.getAttribute('data-subheading') || 'New artworks, viewings and shows — straight to your inbox.';
  var buttonLabel = script.getAttribute('data-button') || 'Subscribe';
  var sourceTag = script.getAttribute('data-source') || 'embed';
  var origin = new URL(script.src).origin;

  var host = document.createElement('div');
  host.className = 'artpiq-newsletter-embed';
  // Insert immediately after the <script> tag.
  if (script.parentNode) {
    script.parentNode.insertBefore(host, script.nextSibling);
  } else {
    document.body.appendChild(host);
  }

  var shadow = host.attachShadow({ mode: 'open' });

  var style = document.createElement('style');
  style.textContent = [
    ':host, * { box-sizing: border-box; }',
    '.wrap {',
    '  font-family: -apple-system, BlinkMacSystemFont, "Inter", "Helvetica Neue", Arial, sans-serif;',
    '  color: #111;',
    '  max-width: 480px;',
    '  margin: 0 auto;',
    '  padding: 20px;',
    '  border: 1px solid rgba(0,0,0,0.08);',
    '  border-radius: 4px;',
    '  background: #fff;',
    '}',
    '.heading { font-size: 18px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; margin: 0 0 6px; }',
    '.sub { font-size: 13px; color: rgba(0,0,0,0.6); margin: 0 0 14px; line-height: 1.45; }',
    '.row { display: grid; gap: 8px; }',
    '@media (min-width: 420px) { .row { grid-template-columns: 1fr 1fr; } }',
    'input { font: inherit; padding: 10px 12px; border: 1px solid rgba(0,0,0,0.12); border-radius: 3px; background: #fff; color: inherit; width: 100%; }',
    'input:focus { outline: none; border-color: ' + accent + '; box-shadow: 0 0 0 2px ' + accent + '22; }',
    'button { font: inherit; font-weight: 700; letter-spacing: 0.10em; text-transform: uppercase; padding: 12px 14px; margin-top: 10px; border: none; border-radius: 3px; background: ' + accent + '; color: #fff; cursor: pointer; width: 100%; }',
    'button[disabled] { opacity: 0.5; cursor: not-allowed; }',
    '.honeypot { position: absolute; left: -9999px; height: 0; width: 0; opacity: 0; }',
    '.status { margin-top: 10px; font-size: 12px; }',
    '.ok { color: #047857; }',
    '.err { color: #b91c1c; }',
    '.fine { margin: 8px 0 0; font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase; color: rgba(0,0,0,0.4); }',
  ].join('\n');
  shadow.appendChild(style);

  var wrap = document.createElement('div');
  wrap.className = 'wrap';
  wrap.innerHTML = [
    '<p class="heading"></p>',
    '<p class="sub"></p>',
    '<form>',
    '  <div class="row">',
    '    <input type="text" name="name" placeholder="Name (optional)" autocomplete="name" />',
    '    <input type="email" name="email" placeholder="you@example.com" required autocomplete="email" />',
    '  </div>',
    '  <input type="text" name="website" class="honeypot" tabindex="-1" autocomplete="off" />',
    '  <button type="submit"></button>',
    '  <p class="status" role="status" aria-live="polite"></p>',
    '  <p class="fine">Powered by ArtPiq · unsubscribe anytime</p>',
    '</form>',
  ].join('\n');
  shadow.appendChild(wrap);

  // Text injection (avoids HTML injection from data-* attrs).
  wrap.querySelector('.heading').textContent = heading;
  wrap.querySelector('.sub').textContent = subheading;
  wrap.querySelector('button').textContent = buttonLabel;

  var form = wrap.querySelector('form');
  var btn = wrap.querySelector('button');
  var statusEl = wrap.querySelector('.status');

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    var data = new FormData(form);
    var email = (data.get('email') || '').toString().trim();
    var name = (data.get('name') || '').toString().trim();
    var honey = (data.get('website') || '').toString().trim();
    if (!email) return;
    btn.disabled = true;
    statusEl.textContent = 'Subscribing…';
    statusEl.className = 'status';

    fetch(origin + '/api/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ownerId: ownerId,
        email: email,
        name: name || undefined,
        source: sourceTag,
        website: honey || undefined,
      }),
    })
      .then(function (res) { return res.json().then(function (json) { return { res: res, json: json }; }); })
      .then(function (result) {
        if (!result.res.ok) {
          statusEl.textContent = result.json.error || 'Something went wrong.';
          statusEl.className = 'status err';
        } else {
          statusEl.textContent = 'Thanks — check your inbox.';
          statusEl.className = 'status ok';
          form.reset();
        }
      })
      .catch(function () {
        statusEl.textContent = 'Network error. Please try again.';
        statusEl.className = 'status err';
      })
      .finally(function () {
        btn.disabled = false;
      });
  });
})();
