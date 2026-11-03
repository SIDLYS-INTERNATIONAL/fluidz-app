/*! Fluidz Labs · Adult Album Creator engine.
 *  100 % client-side. No network, no storage, no globals other than window.AlbumEngine.
 *  Photos live only in canvases held by the caller (memory); nothing is cached here. */
(function (global) {
  'use strict';

  var W = 1179, H = 2556;          // export size (px)
  var DW = 393, DH = 852;          // design units (render = x3)
  var MAXSIDE = 2556;

  /* ---------- palette / fonts ---------- */
  var CORAL = '#E0887A', LAV = '#9080BA', INK = '#F2ECE8';
  var F_SERIF = '"Cormorant Garamond", Georgia, "Times New Roman", serif';
  var F_STAMP = 'VT323, "Courier New", ui-monospace, monospace';
  var F_UI = '"Plus Jakarta Sans", system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif';
  var F_BRAND = '"Bricolage Grotesque", system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif';
  var F_MONO = '"JetBrains Mono", ui-monospace, Menlo, Consolas, monospace';

  /* ---------- small helpers ---------- */
  function err(msg) { return new Error(msg); }
  function mkCanvas(w, h) {
    var c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(w));
    c.height = Math.max(1, Math.round(h));
    return c;
  }
  function free(c) { if (c) { try { c.width = 0; c.height = 0; } catch (e) {} } }
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  var uid = 0;
  function newId() { uid++; return 'ph' + uid + '-' + Math.random().toString(36).slice(2, 8); }

  function readBuf(blob) {
    if (blob.arrayBuffer) return blob.arrayBuffer();
    return new Promise(function (res, rej) {
      var r = new FileReader();
      r.onload = function () { res(r.result); };
      r.onerror = function () { rej(r.error || err('read')); };
      r.readAsArrayBuffer(blob);
    });
  }
  function canvasToBlob(c, type, q) {
    return new Promise(function (res) {
      try { c.toBlob(function (b) { res(b); }, type, q); } catch (e) { res(null); }
    });
  }
  function dataUrlToBlob(u) {
    var p = u.split(','), mime = (p[0].match(/:(.*?);/) || [0, 'image/jpeg'])[1];
    var bin = atob(p[1]), a = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i);
    return new Blob([a], { type: mime });
  }
  function loadImg(url) {
    return new Promise(function (res, rej) {
      var im = new Image();
      im.onload = function () { res(im); };
      im.onerror = function () { rej(err('decode')); };
      im.src = url;
    });
  }

  /* ---------- EXIF (read-only, local) ---------- */
  function parseExif(buf) {
    var out = { orientation: 1, takenAt: null, hadGps: false, hadExif: false };
    try {
      var v = new DataView(buf), n = buf.byteLength;
      if (n < 4 || v.getUint16(0) !== 0xFFD8) return out;
      var p = 2;
      while (p + 4 <= n) {
        if (v.getUint8(p) !== 0xFF) break;
        var m = v.getUint8(p + 1);
        if (m === 0xFF) { p++; continue; }
        if (m === 0xD8 || m === 0x01 || (m >= 0xD0 && m <= 0xD7)) { p += 2; continue; }
        if (m === 0xDA || m === 0xD9) break;
        var len = v.getUint16(p + 2);
        if (m === 0xE1 && p + 10 <= n && v.getUint32(p + 4) === 0x45786966 && v.getUint16(p + 8) === 0) {
          out.hadExif = true;
          try { readTiff(v, p + 10, Math.min(n, p + 2 + len), out); } catch (e) {}
          break;
        }
        p += 2 + len;
      }
    } catch (e) {}
    return out;
  }
  function readTiff(v, t, end, out) {
    var bo = v.getUint16(t), le;
    if (bo === 0x4949) le = true; else if (bo === 0x4D4D) le = false; else return;
    function u16(o) { return v.getUint16(o, le); }
    function u32(o) { return v.getUint32(o, le); }
    if (u16(t + 2) !== 42) return;
    function entries(ifd, cb) {
      if (ifd < t || ifd + 2 > end) return;
      var c = u16(ifd);
      for (var i = 0; i < c; i++) {
        var e = ifd + 2 + i * 12;
        if (e + 12 > end) break;
        cb(u16(e), u16(e + 2), u32(e + 4), e + 8);
      }
    }
    function ascii(count, vo) {
      var o = count > 4 ? t + u32(vo) : vo, s = '';
      if (o < t || o + count > end) return '';
      for (var i = 0; i < count - 1; i++) s += String.fromCharCode(v.getUint8(o + i));
      return s;
    }
    var exifPtr = 0, gpsPtr = 0, dt = '', dto = '', dtd = '';
    entries(t + u32(t + 4), function (tag, type, cnt, vo) {
      if (tag === 0x0112 && type === 3) { var o = u16(vo); if (o >= 1 && o <= 8) { out.orientation = o; out.orientOff = vo; out.le = le; } }
      else if (tag === 0x8769) exifPtr = t + u32(vo);
      else if (tag === 0x8825) gpsPtr = t + u32(vo);
      else if (tag === 0x0132 && type === 2) dt = ascii(cnt, vo);
    });
    if (exifPtr) entries(exifPtr, function (tag, type, cnt, vo) {
      if (tag === 0x9003 && type === 2) dto = ascii(cnt, vo);
      else if (tag === 0x9004 && type === 2) dtd = ascii(cnt, vo);
    });
    if (gpsPtr) entries(gpsPtr, function (tag) { if (tag === 2 || tag === 4) out.hadGps = true; });
    var s = dto || dtd || dt, m = /^(\d{4}):(\d\d):(\d\d)[ T](\d\d):(\d\d):(\d\d)/.exec(s);
    if (m) {
      var y = +m[1], mo = +m[2], d = +m[3];
      if (y > 1990 && mo >= 1 && mo <= 12 && d >= 1 && d <= 31) {
        var dd = new Date(y, mo - 1, d, +m[4], +m[5], +m[6]);
        if (!isNaN(dd.getTime())) out.takenAt = dd;
      }
    }
  }

  /* Tiny JPEG with orientation=6 → tells whether this browser auto-applies EXIF orientation. */
  function injectOrientation(u8, o) {
    var app = new Uint8Array([
      0xFF, 0xE1, 0x00, 0x22, 0x45, 0x78, 0x69, 0x66, 0x00, 0x00,
      0x4D, 0x4D, 0x00, 0x2A, 0x00, 0x00, 0x00, 0x08,
      0x00, 0x01, 0x01, 0x12, 0x00, 0x03, 0x00, 0x00, 0x00, 0x01, 0x00, o, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00]);
    var out = new Uint8Array(u8.length + app.length);
    out.set(u8.subarray(0, 2), 0); out.set(app, 2); out.set(u8.subarray(2), 2 + app.length);
    return out;
  }
  var autoP = null;
  function browserAutoOrients() {
    if (autoP) return autoP;
    autoP = (async function () {
      try {
        var c = mkCanvas(2, 1), x = c.getContext('2d');
        x.fillStyle = '#f00'; x.fillRect(0, 0, 1, 1); x.fillStyle = '#00f'; x.fillRect(1, 0, 1, 1);
        var b = await canvasToBlob(c, 'image/jpeg', 0.9);
        free(c);
        var u8 = new Uint8Array(await readBuf(b));
        var url = URL.createObjectURL(new Blob([injectOrientation(u8, 6)], { type: 'image/jpeg' }));
        try {
          var im = await loadImg(url);
          return im.naturalWidth === 1 && im.naturalHeight === 2;
        } finally { URL.revokeObjectURL(url); }
      } catch (e) { return true; }
    })();
    return autoP;
  }

  /* ---------- image scaling / orientation ---------- */
  function drawScaled(src, sx, sy, sw, sh, dw, dh) {
    var cur = src, cx = sx, cy = sy, cw = sw, ch = sh, tmp = null;
    dw = Math.max(1, Math.round(dw)); dh = Math.max(1, Math.round(dh));
    while (cw / dw > 2 || ch / dh > 2) {
      var nw = cw / dw > 2 ? Math.ceil(cw / 2) : Math.ceil(cw);
      var nh = ch / dh > 2 ? Math.ceil(ch / 2) : Math.ceil(ch);
      var t = mkCanvas(nw, nh), tx = t.getContext('2d');
      tx.imageSmoothingEnabled = true; tx.imageSmoothingQuality = 'high';
      tx.drawImage(cur, cx, cy, cw, ch, 0, 0, nw, nh);
      if (tmp) free(tmp);
      tmp = t; cur = t; cx = 0; cy = 0; cw = nw; ch = nh;
    }
    var out = mkCanvas(dw, dh), ox = out.getContext('2d');
    ox.imageSmoothingEnabled = true; ox.imageSmoothingQuality = 'high';
    ox.drawImage(cur, cx, cy, cw, ch, 0, 0, dw, dh);
    if (tmp) free(tmp);
    return out;
  }
  function orientCanvas(src, o) {
    if (!(o >= 2 && o <= 8)) return src;
    var w = src.width, h = src.height, swap = o >= 5;
    var c = mkCanvas(swap ? h : w, swap ? w : h), x = c.getContext('2d');
    switch (o) {
      case 2: x.transform(-1, 0, 0, 1, w, 0); break;
      case 3: x.transform(-1, 0, 0, -1, w, h); break;
      case 4: x.transform(1, 0, 0, -1, 0, h); break;
      case 5: x.transform(0, 1, 1, 0, 0, 0); break;
      case 6: x.transform(0, 1, -1, 0, h, 0); break;
      case 7: x.transform(0, -1, -1, 0, h, w); break;
      case 8: x.transform(0, -1, 1, 0, 0, w); break;
    }
    x.drawImage(src, 0, 0);
    free(src);
    return c;
  }

  /* ---------- loadPhoto ---------- */
  function loadPhoto(file, opts) {
    opts = opts || {};
    return (async function () {
      if (!file || typeof file.size !== 'number' || !file.size) throw err('decode');
      var meta = { orientation: 1, takenAt: null, hadGps: false, hadExif: false };
      try { meta = parseExif(await readBuf(file.slice(0, 262144))); } catch (e) {}

      var forced = opts._manual === true;     // test hook: neutralise the EXIF tag in a copy, then rotate ourselves
      var auto = forced ? false : await browserAutoOrients();
      var src, sw, sh, closeSrc = function () {}, url = null;
      try {
        var toDecode = file;
        if (forced && meta.orientOff) {
          var whole = new Uint8Array(await readBuf(file));
          var dvw = new DataView(whole.buffer);
          dvw.setUint16(meta.orientOff, 1, meta.le);
          toDecode = new Blob([whole], { type: file.type || 'image/jpeg' });
        }
        url = URL.createObjectURL(toDecode);
        var im = await loadImg(url);
        src = im; sw = im.naturalWidth; sh = im.naturalHeight;
        closeSrc = function () { im.src = ''; };
      } catch (e) {
        if (url) URL.revokeObjectURL(url);
        throw err('decode');
      }
      if (url) URL.revokeObjectURL(url);
      if (!sw || !sh) { closeSrc(); throw err('decode'); }

      var k = Math.min(1, MAXSIDE / Math.max(sw, sh));
      var tw = Math.max(1, Math.round(sw * k)), th = Math.max(1, Math.round(sh * k));
      var canvas;
      try {
        // a fresh canvas: nothing from the original file (EXIF, GPS, XMP, ICC…) survives
        var base = mkCanvas(tw, th), bx = base.getContext('2d');
        bx.fillStyle = '#0b0a10'; bx.fillRect(0, 0, tw, th);
        var scaled = drawScaled(src, 0, 0, sw, sh, tw, th);
        bx.drawImage(scaled, 0, 0);
        free(scaled);
        canvas = base;
        if (!auto && meta.orientation > 1) canvas = orientCanvas(canvas, meta.orientation);
      } catch (e) {
        closeSrc();
        throw err('decode');
      }
      closeSrc();
      var takenAt = meta.takenAt;
      if (!takenAt && file.lastModified > 86400000) {
        var lm = new Date(file.lastModified);
        if (!isNaN(lm.getTime())) takenAt = lm;
      }
      return {
        id: newId(), canvas: canvas, width: canvas.width, height: canvas.height,
        takenAt: takenAt || null, hadGps: !!meta.hadGps, hadExif: !!meta.hadExif
      };
    })();
  }

  /* ---------- blur (manual, irreversible) ---------- */
  function blur1D(src, dst, n, lines, along, across, r) {
    var win = 2 * r + 1, half = win >> 1;
    for (var l = 0; l < lines; l++) {
      var base = l * across;
      for (var c = 0; c < 4; c++) {
        var b = base + c, sum = src[b] * r, j, i;
        for (j = 0; j <= r; j++) sum += src[b + Math.min(j, n - 1) * along];
        for (i = 0; i < n; i++) {
          dst[b + i * along] = ((sum + half) / win) | 0;
          sum += src[b + Math.min(i + r + 1, n - 1) * along] - src[b + Math.max(i - r, 0) * along];
        }
      }
    }
  }
  function boxBlur(data, w, h, r, passes) {
    var tmp = new Uint8ClampedArray(data.length);
    for (var p = 0; p < passes; p++) {
      blur1D(data, tmp, w, h, 4, w * 4, r);
      blur1D(tmp, data, h, w, w * 4, 4, r);
    }
  }
  function pixelate(data, w, h, bs) {
    for (var by = 0; by < h; by += bs) {
      for (var bx = 0; bx < w; bx += bs) {
        var x1 = Math.min(bx + bs, w), y1 = Math.min(by + bs, h), n = (x1 - bx) * (y1 - by);
        var r = 0, g = 0, b = 0, a = 0, x, y, i;
        for (y = by; y < y1; y++) for (x = bx; x < x1; x++) {
          i = (y * w + x) * 4; r += data[i]; g += data[i + 1]; b += data[i + 2]; a += data[i + 3];
        }
        r = Math.round(r / n); g = Math.round(g / n); b = Math.round(b / n); a = Math.round(a / n);
        for (y = by; y < y1; y++) for (x = bx; x < x1; x++) {
          i = (y * w + x) * 4; data[i] = r; data[i + 1] = g; data[i + 2] = b; data[i + 3] = a;
        }
      }
    }
  }
  function applyBlur(photo, strokes) {
    if (!photo || !photo.canvas || !strokes || !strokes.length) return;
    var cv = photo.canvas, cw = cv.width, ch = cv.height, ctx = cv.getContext('2d');
    for (var si = 0; si < strokes.length; si++) {
      var s = strokes[si], size, pts = [];
      if (!s) continue;
      if (s.kind === 'circle') {
        if (!(s.r > 0)) continue;
        size = s.r * 2; pts = [{ x: s.cx, y: s.cy }];
      } else if (s.kind === 'brush' && s.points && s.points.length) {
        size = s.size > 0 ? s.size : 0; if (!size) continue; pts = s.points;
      } else continue;
      var bs = Math.max(6, Math.round(size / 4));
      var minx = Infinity, miny = Infinity, maxx = -Infinity, maxy = -Infinity, i;
      for (i = 0; i < pts.length; i++) {
        if (!isFinite(pts[i].x) || !isFinite(pts[i].y)) continue;
        minx = Math.min(minx, pts[i].x); maxx = Math.max(maxx, pts[i].x);
        miny = Math.min(miny, pts[i].y); maxy = Math.max(maxy, pts[i].y);
      }
      if (!isFinite(minx)) continue;
      var m = size / 2 + 2;
      var x0 = Math.max(0, Math.floor(minx - m)), y0 = Math.max(0, Math.floor(miny - m));
      var x1 = Math.min(cw, Math.ceil(maxx + m)), y1 = Math.min(ch, Math.ceil(maxy + m));
      var bw = x1 - x0, bh = y1 - y0;
      if (bw < 1 || bh < 1) continue;

      // coverage mask of the stroke
      var mc = mkCanvas(bw, bh), mx = mc.getContext('2d');
      mx.fillStyle = '#fff'; mx.strokeStyle = '#fff';
      mx.lineWidth = size; mx.lineCap = 'round'; mx.lineJoin = 'round';
      mx.beginPath(); mx.moveTo(pts[0].x - x0, pts[0].y - y0);
      for (i = 1; i < pts.length; i++) mx.lineTo(pts[i].x - x0, pts[i].y - y0);
      mx.stroke();
      mx.beginPath(); mx.arc(pts[0].x - x0, pts[0].y - y0, size / 2, 0, 6.2832); mx.fill();
      mx.beginPath(); mx.arc(pts[pts.length - 1].x - x0, pts[pts.length - 1].y - y0, size / 2, 0, 6.2832); mx.fill();
      var mask = mx.getImageData(0, 0, bw, bh).data;
      free(mc);

      var img = ctx.getImageData(x0, y0, bw, bh), d = img.data;
      var proc = new Uint8ClampedArray(d);
      pixelate(proc, bw, bh, bs);
      boxBlur(proc, bw, bh, Math.max(1, Math.round(bs / 2)), 2);
      for (i = 0; i < d.length; i += 4) {
        var a = mask[i + 3];
        if (!a) continue;
        if (a >= 250) { d[i] = proc[i]; d[i + 1] = proc[i + 1]; d[i + 2] = proc[i + 2]; }
        else {
          var f = a / 255;
          d[i] = d[i] + (proc[i] - d[i]) * f; d[i + 1] = d[i + 1] + (proc[i + 1] - d[i + 1]) * f;
          d[i + 2] = d[i + 2] + (proc[i + 2] - d[i + 2]) * f;
        }
      }
      ctx.putImageData(img, x0, y0);
    }
  }

  /* ---------- fonts ---------- */
  var SAMPLE = 'AaBbCcÀÉèçñüöäßÅõãíú¿¡…—·●→«»0123456789';
  function ensureFonts(extra) {
    try {
      if (!document.fonts || !document.fonts.load) return Promise.resolve();
      var txt = SAMPLE + (extra || '');
      var specs = ['600 26px "Cormorant Garamond"', '400 20px "Cormorant Garamond"', '400 20px VT323',
        '400 12px "Plus Jakarta Sans"', '700 12px "Bricolage Grotesque"', '500 11px "JetBrains Mono"'];
      var all = Promise.all(specs.map(function (s) { return document.fonts.load(s, txt).catch(function () { return []; }); }));
      var timeout = new Promise(function (r) { setTimeout(r, 6000); });
      return Promise.race([all, timeout]).catch(function () {});
    } catch (e) { return Promise.resolve(); }
  }

  /* ---------- text layout ---------- */
  function wrap(ctx, text, maxW) {
    var words = text.split(' '), lines = [], cur = '', broke = false;
    for (var i = 0; i < words.length; i++) {
      var w = words[i];
      if (!w) continue;
      var test = cur ? cur + ' ' + w : w;
      if (ctx.measureText(test).width <= maxW) { cur = test; continue; }
      if (cur) { lines.push(cur); cur = ''; }
      if (ctx.measureText(w).width <= maxW) { cur = w; continue; }
      broke = true;
      var chars = Array.from(w), chunk = '';
      for (var j = 0; j < chars.length; j++) {
        if (chunk && ctx.measureText(chunk + chars[j]).width > maxW) { lines.push(chunk); chunk = chars[j]; }
        else chunk += chars[j];
      }
      cur = chunk;
    }
    if (cur || !lines.length) lines.push(cur);
    return { lines: lines, broke: broke };
  }
  function ellipsize(ctx, s, maxW) {
    if (ctx.measureText(s).width <= maxW) return s;
    var a = Array.from(s);
    while (a.length > 1 && ctx.measureText(a.join('').replace(/\s+$/, '') + '…').width > maxW) a.pop();
    return a.join('').replace(/\s+$/, '') + '…';
  }
  /* fits `text` in maxW: biggest size in [min,max] giving ≤ maxLines lines (optionally preferring 1 line down to `single`). */
  function layoutText(ctx, text, fontFn, maxW, o) {
    text = String(text == null ? '' : text).replace(/\s+/g, ' ').trim();
    if (!text) return { size: o.max, lines: [], font: fontFn(o.max) };
    var step = o.step || 0.5, size, res;
    function done(sz, lines) {
      ctx.font = fontFn(sz);
      if (o.balance && lines.length > 1) lines = balance(ctx, text, maxW, lines.length) || lines;
      return { size: sz, lines: lines, font: fontFn(sz) };
    }
    if (o.single) {
      for (size = o.max; size >= o.single; size -= step) {
        ctx.font = fontFn(size);
        if (ctx.measureText(text).width <= maxW) return done(size, [text]);
      }
    }
    for (size = o.max; size >= o.min; size -= step) {
      ctx.font = fontFn(size);
      res = wrap(ctx, text, maxW);
      if (!res.broke && res.lines.length <= o.maxLines) return done(size, res.lines);
    }
    ctx.font = fontFn(o.min);
    res = wrap(ctx, text, maxW);
    var lines = res.lines;
    if (lines.length > o.maxLines) {
      var rest = lines.slice(o.maxLines - 1).join(' ');
      lines = lines.slice(0, o.maxLines - 1);
      lines.push(ellipsize(ctx, rest, maxW));
    }
    return done(o.min, lines);
  }
  function balance(ctx, text, maxW, n) {
    var lo = maxW * 0.45, hi = maxW, best = null;
    for (var i = 0; i < 9; i++) {
      var mid = (lo + hi) / 2, r = wrap(ctx, text, mid);
      if (!r.broke && r.lines.length <= n) { best = r.lines; hi = mid; } else lo = mid;
    }
    return best && best.length === n ? best : null;
  }
  // draws lines, returns y after the block. baseline = line box centre + 0.33 em
  function drawLines(ctx, lines, x, y, lh, size, align) {
    ctx.textAlign = align || 'left'; ctx.textBaseline = 'alphabetic';
    for (var i = 0; i < lines.length; i++) ctx.fillText(lines[i], x, y + i * lh + lh / 2 + size * 0.33);
    return y + lines.length * lh;
  }
  function drawSpaced(ctx, text, cx, y, spacing) {
    var chars = Array.from(text), widths = [], total = 0, i;
    for (i = 0; i < chars.length; i++) { widths[i] = ctx.measureText(chars[i]).width; total += widths[i]; }
    total += spacing * (chars.length - 1);
    var x = cx - total / 2;
    ctx.textAlign = 'left';
    for (i = 0; i < chars.length; i++) { ctx.fillText(chars[i], x, y); x += widths[i] + spacing; }
  }
  function rrect(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  function dropPath(ctx, cx, top, w, h) {
    ctx.beginPath();
    ctx.moveTo(cx, top);
    ctx.bezierCurveTo(cx + 0.16 * w, top + 0.22 * h, cx + 0.5 * w, top + 0.45 * h, cx + 0.5 * w, top + 0.68 * h);
    ctx.bezierCurveTo(cx + 0.5 * w, top + 0.88 * h, cx + 0.28 * w, top + h, cx, top + h);
    ctx.bezierCurveTo(cx - 0.28 * w, top + h, cx - 0.5 * w, top + 0.88 * h, cx - 0.5 * w, top + 0.68 * h);
    ctx.bezierCurveTo(cx - 0.5 * w, top + 0.45 * h, cx - 0.16 * w, top + 0.22 * h, cx, top);
    ctx.closePath();
  }
  function fillDrop(ctx, cx, top, w, h) {
    var g = ctx.createLinearGradient(cx - w / 2, top, cx + w / 2, top + h);
    g.addColorStop(0, CORAL); g.addColorStop(1, LAV);
    ctx.fillStyle = g; dropPath(ctx, cx, top, w, h); ctx.fill();
  }

  /* ---------- page renderers ---------- */
  function setupCanvas(scale) {
    var c = mkCanvas(W * scale, H * scale), ctx = c.getContext('2d');
    ctx.setTransform(c.width / DW, 0, 0, c.height / DH, 0, 0);
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    return { c: c, ctx: ctx, sx: c.width / DW, sy: c.height / DH };
  }
  function drawRadialBg(ctx) {
    ctx.fillStyle = '#070608'; ctx.fillRect(0, 0, DW, DH);
    var cy = DH * 0.38, g = ctx.createRadialGradient(DW / 2, cy, 0, DW / 2, cy, 560);
    g.addColorStop(0, '#3A1A1C'); g.addColorStop(1, '#070608');
    ctx.fillStyle = g; ctx.fillRect(0, 0, DW, DH);
  }

  function renderPhoto(spec, scale) {
    var S = setupCanvas(scale), c = S.c, ctx = S.ctx;
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#05040A'; ctx.fillRect(0, 0, c.width, c.height);
    var ph = spec.photo && spec.photo.canvas;
    if (ph && ph.width > 0 && ph.height > 0) {
      // cover-crop, centred
      var dr = c.width / c.height, sr = ph.width / ph.height, sx0, sy0, sw0, sh0;
      if (sr > dr) { sh0 = ph.height; sw0 = sh0 * dr; sx0 = (ph.width - sw0) / 2; sy0 = 0; }
      else { sw0 = ph.width; sh0 = sw0 / dr; sx0 = 0; sy0 = (ph.height - sh0) / 2; }
      var fit = drawScaled(ph, sx0, sy0, sw0, sh0, c.width, c.height);
      ctx.drawImage(fit, 0, 0); free(fit);
    }
    ctx.restore();

    // legibility scrim
    var sg = ctx.createLinearGradient(0, DH - 360, 0, DH);
    sg.addColorStop(0, 'rgba(5,4,10,0)'); sg.addColorStop(1, 'rgba(5,4,10,0.62)');
    ctx.fillStyle = sg; ctx.fillRect(0, DH - 360, DW, 360);

    // caption box
    var main = String(spec.main == null ? '' : spec.main), second = String(spec.second == null ? '' : spec.second);
    var boxX = 14, boxW = DW - 28, padX = 14, padY = 12, innerW = boxW - padX * 2;
    var mainL = layoutText(ctx, main, function (s) { return '600 ' + s + 'px ' + F_SERIF; }, innerW,
      { max: 26, min: 15, maxLines: 3, step: 0.5 });
    var mainLH = Math.round(mainL.size * 1.14 * 10) / 10;
    var secL = null, secLH = 15;
    if (second.trim()) {
      secL = layoutText(ctx, second, function (s) { return '400 ' + s + 'px ' + F_UI; }, innerW,
        { max: 11, min: 8, maxLines: 2, step: 0.25 });
      secLH = Math.round(secL.size * 1.4 * 10) / 10;
    }
    var contentH = 2 + 8 + mainL.lines.length * mainLH + (secL && secL.lines.length ? 6 + secL.lines.length * secLH : 0);
    var boxH = padY * 2 + contentH, boxY = DH - 26 - boxH;

    // backdrop blur: shrink the region behind the box, blur it, draw it back
    try {
      var rx = boxX * S.sx, ry = boxY * S.sy, rw = boxW * S.sx, rh = boxH * S.sy;
      var smW = Math.max(2, Math.ceil(boxW / 6)), smH = Math.max(2, Math.ceil(boxH / 6));
      var sm = drawScaled(c, rx, ry, rw, rh, smW, smH), sctx = sm.getContext('2d');
      var id = sctx.getImageData(0, 0, smW, smH);
      boxBlur(id.data, smW, smH, 2, 2);
      sctx.putImageData(id, 0, 0);
      ctx.save(); rrect(ctx, boxX, boxY, boxW, boxH, 16); ctx.clip();
      ctx.drawImage(sm, 0, 0, smW, smH, boxX, boxY, boxW, boxH);
      ctx.restore(); free(sm);
    } catch (e) {}
    ctx.fillStyle = 'rgba(8,7,9,0.659)';
    rrect(ctx, boxX, boxY, boxW, boxH, 16); ctx.fill();

    var y = boxY + padY, x = boxX + padX;
    ctx.fillStyle = CORAL; ctx.fillRect(x, y, 20, 2); y += 2 + 8;
    ctx.fillStyle = INK; ctx.font = mainL.font;
    y = drawLines(ctx, mainL.lines, x, y, mainLH, mainL.size, 'left');
    if (secL && secL.lines.length) {
      y += 6;
      ctx.fillStyle = 'rgba(242,236,232,0.6)'; ctx.font = secL.font;
      drawLines(ctx, secL.lines, x, y, secLH, secL.size, 'left');
    }

    // FLUIDZ date stamp (top right)
    if (spec.stamp && spec.date instanceof Date && !isNaN(spec.date.getTime())) {
      var txt = formatStamp(spec.date), fs = 20, STAMP = '#FF9A4D';
      ctx.font = '400 ' + fs + 'px ' + F_STAMP;
      var tw = ctx.measureText(txt).width;
      while (tw > 205 && fs > 12) { fs -= 1; ctx.font = '400 ' + fs + 'px ' + F_STAMP; tw = ctx.measureText(txt).width; }
      var right = DW - 14, tx = right - tw, base = 14 + fs * 0.78, dotX = tx - 6 - 3.5;
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.75)'; ctx.shadowBlur = 4 * S.sx; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;
      ctx.fillStyle = STAMP;
      ctx.beginPath(); ctx.arc(dotX, base - fs * 0.3, 3.5, 0, 6.2832); ctx.fill();
      ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
      ctx.fillText(txt, tx, base); ctx.fillText(txt, tx, base);
      ctx.restore();
    }
    return c;
  }

  function renderAlert(spec, scale) {
    var S = setupCanvas(scale), c = S.c, ctx = S.ctx;
    drawRadialBg(ctx);
    var maxW = DW - 56;
    var big = function (w) { return function (s) { return w + ' ' + s + 'px ' + F_SERIF; }; };
    var l1 = layoutText(ctx, spec.line1, big(600), maxW, { max: 52, min: 28, maxLines: 2, single: 36, step: 1, balance: true });
    var l2 = layoutText(ctx, spec.line2, big(400), maxW, { max: 52, min: 28, maxLines: 2, single: 36, step: 1, balance: true });
    var size = Math.min(l1.lines.length ? l1.size : 52, l2.lines.length ? l2.size : 52);
    if (l1.size !== size && l1.lines.length) l1 = layoutText(ctx, spec.line1, big(600), maxW, { max: size, min: size, maxLines: 3, balance: true });
    if (l2.size !== size && l2.lines.length) l2 = layoutText(ctx, spec.line2, big(400), maxW, { max: size, min: size, maxLines: 3, balance: true });
    var lh = size * 1.04;
    var sm = layoutText(ctx, spec.small, function (s) { return '400 ' + s + 'px ' + F_SERIF; }, maxW, { max: 20, min: 13, maxLines: 3, step: 0.5, balance: true });
    var smLH = sm.size * 1.25;
    var sc = layoutText(ctx, spec.second, function (s) { return '400 ' + s + 'px ' + F_UI; }, maxW, { max: 12, min: 9, maxLines: 3, step: 0.25, balance: true });
    var scLH = sc.size * 1.45;
    var h = 14 + 22 + (l1.lines.length + l2.lines.length) * lh +
      (sm.lines.length ? 16 + sm.lines.length * smLH : 0) + (sc.lines.length ? 10 + sc.lines.length * scLH : 0);
    var y = Math.max(40, DH * 0.42 - h / 2), cx = DW / 2;

    ctx.fillStyle = CORAL; ctx.font = '500 11px ' + F_MONO; ctx.textBaseline = 'alphabetic';
    drawSpaced(ctx, spec.badge || '● 18+ · NSFW', cx, y + 11, 1);
    y += 14 + 22;
    ctx.fillStyle = INK; ctx.font = l1.font; y = drawLines(ctx, l1.lines, cx, y, lh, size, 'center');
    ctx.fillStyle = CORAL; ctx.font = l2.font; y = drawLines(ctx, l2.lines, cx, y, lh, size, 'center');
    if (sm.lines.length) {
      y += 16; ctx.fillStyle = 'rgba(242,236,232,0.6)'; ctx.font = sm.font;
      y = drawLines(ctx, sm.lines, cx, y, smLH, sm.size, 'center');
    }
    if (sc.lines.length) {
      y += 10; ctx.fillStyle = 'rgba(242,236,232,0.52)'; ctx.font = sc.font;
      drawLines(ctx, sc.lines, cx, y, scLH, sc.size, 'center');
    }
    // brand
    ctx.globalAlpha = 0.6; ctx.font = '700 11px ' + F_BRAND;
    var bt = 'fluidz labs', bw = ctx.measureText(bt).width, dotW = 9 + 4;
    var bx = cx - (bw + dotW) / 2, by = DH - 34;
    ctx.fillStyle = CORAL; ctx.beginPath(); ctx.arc(bx + 3, by - 3.5, 3, 0, 6.2832); ctx.fill();
    ctx.fillStyle = INK; ctx.textAlign = 'left'; ctx.fillText(bt, bx + dotW, by);
    ctx.globalAlpha = 1;
    return c;
  }

  function renderEnd(spec, scale) {
    var S = setupCanvas(scale), c = S.c, ctx = S.ctx;
    drawRadialBg(ctx);
    var cx = DW / 2, maxW = DW - 64;

    // bottom banner (measure first, it limits the content area)
    var bX = 16, bW = 361, bPad = 14, dropW = 20, dropH = 26, textX = bX + bPad + dropW + 12, textW = bX + bW - bPad - textX;
    var made = String(spec.madeWith || 'Made with Fluidz Labs');
    var tagL = layoutText(ctx, spec.tagline, function (s) { return '400 ' + s + 'px ' + F_UI; }, textW, { max: 10, min: 8, maxLines: 3, step: 0.25 });
    var tagLH = tagL.size * 1.35;
    var bH = Math.max(56, bPad * 2 + 15 + (tagL.lines.length ? 3 + tagL.lines.length * tagLH : 0));
    var bY = DH - 30 - bH;

    var area0 = 56, area1 = bY - 20;
    var build = function (rsz) {
      var closeMax = 40;
      var make = function (t, w) { return layoutText(ctx, t, function (s) { return w + ' ' + s + 'px ' + F_SERIF; }, maxW, { max: closeMax, min: 24, maxLines: 2, single: 30, step: 1, balance: true }); };
      var a = make(spec.line1, 600), b = make(spec.line2, 400);
      var size = Math.min(a.lines.length ? a.size : closeMax, b.lines.length ? b.size : closeMax);
      var again = function (t, w) { return layoutText(ctx, t, function (s) { return w + ' ' + s + 'px ' + F_SERIF; }, maxW, { max: size, min: size, maxLines: 3, balance: true }); };
      if (a.lines.length && a.size !== size) a = again(spec.line1, 600);
      if (b.lines.length && b.size !== size) b = again(spec.line2, 400);
      var lh = size * 1.06;
      var sc = layoutText(ctx, spec.second, function (s) { return '400 ' + s + 'px ' + F_UI; }, maxW, { max: 12.5, min: 9, maxLines: 3, step: 0.25, balance: true });
      var rules = (spec.rules || []).slice(0, 5).filter(function (r) { return r && String(r).trim(); });
      var rl = rules.map(function (r) {
        return layoutText(ctx, r, function (s) { return '400 ' + s + 'px ' + F_UI; }, maxW - 8, { max: rsz, min: Math.min(rsz, 9.5), maxLines: 3, step: 0.25, balance: true });
      });
      var rlh = rsz * 1.5;
      var hh = (a.lines.length + b.lines.length) * lh;
      if (sc.lines.length) hh += 10 + sc.lines.length * sc.size * 1.45;
      if (rl.length) {
        hh += 22 + 2 + 18;
        rl.forEach(function (r, i) { hh += r.lines.length * (r.size * 1.5) + (i ? 7 : 0); });
      }
      return { a: a, b: b, size: size, lh: lh, sc: sc, rl: rl, rlh: rlh, h: hh };
    };
    var L = build(12.5);
    for (var rsz = 12.25; L.h > area1 - area0 && rsz >= 9.5; rsz -= 0.25) L = build(rsz);

    var y = area0 + Math.max(0, (area1 - area0 - L.h) * 0.42);
    ctx.fillStyle = INK; ctx.font = L.a.font; y = drawLines(ctx, L.a.lines, cx, y, L.lh, L.size, 'center');
    ctx.fillStyle = CORAL; ctx.font = L.b.font; y = drawLines(ctx, L.b.lines, cx, y, L.lh, L.size, 'center');
    if (L.sc.lines.length) {
      y += 10; ctx.fillStyle = 'rgba(242,236,232,0.6)'; ctx.font = L.sc.font;
      y = drawLines(ctx, L.sc.lines, cx, y, L.sc.size * 1.45, L.sc.size, 'center');
    }
    if (L.rl.length) {
      y += 22; ctx.fillStyle = CORAL; ctx.fillRect(cx - 10, y, 20, 2); y += 2 + 18;
      ctx.fillStyle = 'rgba(242,236,232,0.8)';
      L.rl.forEach(function (r, i) {
        if (i) y += 7;
        ctx.font = r.font;
        y = drawLines(ctx, r.lines, cx, y, r.size * 1.5, r.size, 'center');
      });
    }

    // banner
    ctx.fillStyle = 'rgba(255,255,255,0.05)'; rrect(ctx, bX, bY, bW, bH, 14); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.1)'; ctx.lineWidth = 1; rrect(ctx, bX + 0.5, bY + 0.5, bW - 1, bH - 1, 14); ctx.stroke();
    fillDrop(ctx, bX + bPad + dropW / 2, bY + (bH - dropH) / 2, dropW, dropH);
    var blockH = 15 + (tagL.lines.length ? 3 + tagL.lines.length * tagLH : 0), ty = bY + (bH - blockH) / 2;
    ctx.fillStyle = INK; ctx.font = '700 12px ' + F_BRAND;
    var madeFit = layoutText(ctx, made, function (s) { return '700 ' + s + 'px ' + F_BRAND; }, textW, { max: 12, min: 9, maxLines: 1, step: 0.25 });
    ctx.font = madeFit.font;
    drawLines(ctx, madeFit.lines, textX, ty, 15, madeFit.size, 'left');
    if (tagL.lines.length) {
      ctx.fillStyle = 'rgba(242,236,232,0.6)'; ctx.font = tagL.font;
      drawLines(ctx, tagL.lines, textX, ty + 15 + 3, tagLH, tagL.size, 'left');
    }
    return c;
  }

  function renderPage(spec, scale) {
    scale = scale > 0 ? scale : 1;
    return (async function () {
      if (!spec || !spec.kind) throw err('spec');
      var sample = [spec.main, spec.second, spec.line1, spec.line2, spec.small, spec.tagline, spec.madeWith]
        .concat(spec.rules || []).join('');
      await ensureFonts(sample);
      if (spec.kind === 'photo') return renderPhoto(spec, scale);
      if (spec.kind === 'alert') return renderAlert(spec, scale);
      if (spec.kind === 'end') return renderEnd(spec, scale);
      throw err('spec');
    })();
  }

  function formatStamp(date) {
    var d = date instanceof Date ? date : new Date(date);
    return 'FLUIDZ · ' + pad2(d.getDate()) + '.' + pad2(d.getMonth() + 1) + '.' + pad2(d.getFullYear() % 100);
  }

  /* ---------- export ---------- */
  function fileNames() {
    var a = [];
    for (var i = 1; i <= 10; i++) a.push('fluidz-album-' + pad2(i) + '.jpg');
    return a;
  }
  function toBlobs(canvases, onProgress) {
    return (async function () {
      var out = [];
      for (var i = 0; i < canvases.length; i++) {
        var cv = canvases[i], b = await canvasToBlob(cv, 'image/jpeg', 0.92);
        if (!b) {
          try { b = dataUrlToBlob(cv.toDataURL('image/jpeg', 0.92)); } catch (e) { b = null; }
        }
        free(cv);
        if (!b) throw err('encode');
        out.push(b);
        if (onProgress) { try { onProgress(i + 1, canvases.length); } catch (e) {} }
        await new Promise(function (r) { setTimeout(r, 0); });
      }
      return out;
    })();
  }

  var CRC_T = null;
  function crc32(u8) {
    if (!CRC_T) {
      CRC_T = new Uint32Array(256);
      for (var n = 0; n < 256; n++) { var c = n; for (var k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; CRC_T[n] = c >>> 0; }
    }
    var crc = 0xFFFFFFFF;
    for (var i = 0; i < u8.length; i++) crc = CRC_T[(crc ^ u8[i]) & 0xFF] ^ (crc >>> 8);
    return (crc ^ 0xFFFFFFFF) >>> 0;
  }
  function utf8(s) {
    if (global.TextEncoder) return new TextEncoder().encode(s);
    var e = unescape(encodeURIComponent(s)), a = new Uint8Array(e.length);
    for (var i = 0; i < e.length; i++) a[i] = e.charCodeAt(i);
    return a;
  }
  function zip(blobs, names) {
    return (async function () {
      var now = new Date();
      var dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1);
      var dosDate = (((now.getFullYear() - 1980) & 0x7F) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();
      var parts = [], central = [], offset = 0;
      for (var i = 0; i < blobs.length; i++) {
        var name = utf8(names[i]), data = new Uint8Array(await readBuf(blobs[i]));
        var crc = crc32(data), size = data.length;
        var lh = new DataView(new ArrayBuffer(30));
        lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0x0800, true);
        lh.setUint16(8, 0, true); lh.setUint16(10, dosTime, true); lh.setUint16(12, dosDate, true);
        lh.setUint32(14, crc, true); lh.setUint32(18, size, true); lh.setUint32(22, size, true);
        lh.setUint16(26, name.length, true); lh.setUint16(28, 0, true);
        parts.push(new Uint8Array(lh.buffer), name, blobs[i]);
        var ch = new DataView(new ArrayBuffer(46));
        ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true);
        ch.setUint16(8, 0x0800, true); ch.setUint16(10, 0, true); ch.setUint16(12, dosTime, true);
        ch.setUint16(14, dosDate, true); ch.setUint32(16, crc, true); ch.setUint32(20, size, true);
        ch.setUint32(24, size, true); ch.setUint16(28, name.length, true); ch.setUint16(30, 0, true);
        ch.setUint16(32, 0, true); ch.setUint16(34, 0, true); ch.setUint16(36, 0, true);
        ch.setUint32(38, 0, true); ch.setUint32(42, offset, true);
        central.push(new Uint8Array(ch.buffer), name);
        offset += 30 + name.length + size;
        data = null;
      }
      var cdSize = 0;
      for (var j = 0; j < central.length; j++) cdSize += central[j].length;
      var end = new DataView(new ArrayBuffer(22));
      end.setUint32(0, 0x06054b50, true); end.setUint16(8, blobs.length, true); end.setUint16(10, blobs.length, true);
      end.setUint32(12, cdSize, true); end.setUint32(16, offset, true);
      return new Blob(parts.concat(central, [new Uint8Array(end.buffer)]), { type: 'application/zip' });
    })();
  }

  function share(blobs, names) {
    return (async function () {
      try {
        if (!navigator.canShare || !navigator.share || typeof File !== 'function') return 'unsupported';
        var files = blobs.map(function (b, i) { return new File([b], names[i], { type: 'image/jpeg' }); });
        if (!navigator.canShare({ files: files })) return 'unsupported';
        await navigator.share({ files: files });
        return 'shared';
      } catch (e) {
        if (e && e.name === 'AbortError') return 'cancelled';
        return 'unsupported';
      }
    })();
  }

  function download(blob, name) {
    var url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = name; a.rel = 'noopener'; a.style.display = 'none';
    document.body.appendChild(a); a.click();
    setTimeout(function () { if (a.parentNode) a.parentNode.removeChild(a); URL.revokeObjectURL(url); }, 4000);
  }

  global.AlbumEngine = {
    W: W, H: H,
    loadPhoto: loadPhoto, applyBlur: applyBlur, renderPage: renderPage,
    toBlobs: toBlobs, fileNames: fileNames, zip: zip, share: share, download: download,
    formatStamp: formatStamp
  };
})(window);
