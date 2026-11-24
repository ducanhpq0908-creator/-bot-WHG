(function () {
	'use strict';
	if (window.xnvhLoaded) { return; }
	window.xnvhLoaded = 1;
	var POS_KEY = 'xnvh_pos';
	var TRY_KEY = 'xnvh_try';
	var POS_MAX = 300;
	var MAX_AGE = 2592000;
	var MIN_T = 30;
	var BAR_T = 5;
	var DONE = 0.9;
	var DROP = 0.95;
	var MAX_D = 864000;
	var PER_PAGE = 24;
	var AUTO_CAP = 150;
	var AUTO_NEAR = '0px 0px 600px 0px';
	var AUTO_TOP = 160;
	var ROW_MAX = 4;
	var ROW_WAIT = 250;
	var CLEAR_ROUNDS = 6;
	var BLOCK = 'list_videos_watched_history';
	var CLEAR_URL = '/?mode=async&format=json&action=xn_vh_clear';
	var PH = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
	var OWN = { 'xnvh-tpg': 1, 'xnvh-pct': 1, 'wrap xnvh-wrap': 1, 'xnvh-toast': 1, 'xnvh-row': 1 };
	var cfg = document.getElementById('xnvh');
	var grid = document.getElementById('xnvh_items');
	var srv = document.getElementById('xnvh_server');
	var clearHooks = [];

	function attr(el, k, d) { var v = el ? el.getAttribute('data-' + k) : null; return (v === null || v === '') ? d : v; }
	function lsGet(k) { try { return window.localStorage.getItem(k); } catch (e) { return null; } }
	function lsSet(k, v) { try { window.localStorage.setItem(k, v); return true; } catch (e) { return false; } }
	function lsDrop(k) { try { window.localStorage.removeItem(k); } catch (e) { } }
	function ssGet(k) { try { return window.sessionStorage.getItem(k); } catch (e) { return null; } }
	function ssSet(k, v) { try { window.sessionStorage.setItem(k, v); } catch (e) { } }
	function ssDrop(k) { try { window.sessionStorage.removeItem(k); } catch (e) { } }
	function now() { return Math.floor(Date.now() / 1000); }
	function esc(s) {
		return String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, function (c) {
			return c === '&' ? '&amp;' : c === '<' ? '&lt;' : c === '>' ? '&gt;' : c === '"' ? '&quot;' : '&#39;';
		});
	}
	function safePath(u) {
		u = String(u || '');
		if (u === '' || /[\u0000- \u007f]/.test(u)) { return ''; }
		var m = u.match(/^https?:\/\/([^\/]+)(\/.*)$/i);
		if (m) {
			if (m[1].toLowerCase() !== String(window.location.host).toLowerCase()) { return ''; }
			u = m[2];
		}
		if (u.charAt(0) !== '/' || u.charAt(1) === '/' || u.charAt(1) === '\\' || u.indexOf('\\') >= 0) { return ''; }
		return u;
	}
	function fmt(s) {
		s = Math.max(0, Math.floor(s));
		var h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60;
		return (h > 0 ? h + ':' + (m < 10 ? '0' : '') : '') + m + ':' + (x < 10 ? '0' : '') + x;
	}
	function posLoad() {
		var o = null;
		try { o = JSON.parse(lsGet(POS_KEY) || '{}'); } catch (e) { o = null; }
		if (!o || Object.prototype.toString.call(o) !== '[object Object]') { o = {}; }
		return o;
	}
	function entryOk(v, t0) {
		if (!v || typeof v.length !== 'number' || v.length < 3) { return false; }
		var t = +v[0], d = +v[1], ts = +v[2];
		if (!isFinite(t) || !isFinite(d) || !(t > 0) || !(d > 0) || d > MAX_D || t > d) { return false; }
		return isFinite(ts) && ts > 0 && t0 - ts <= MAX_AGE;
	}
	function posFrom(pos, id, t0) {
		var v = pos[String(id)];
		if (!entryOk(v, t0)) { return null; }
		return { t: +v[0], d: +v[1], ts: +v[2] };
	}
	function posSave(o) {
		var t0 = now(), keys = Object.keys(o), keep = {}, cut, i, k;
		for (i = 0; i < keys.length; i++) { k = keys[i]; if (entryOk(o[k], t0)) { keep[k] = o[k]; } }
		keys = Object.keys(keep);
		if (keys.length > POS_MAX) {
			keys.sort(function (a, b) { return keep[b][2] - keep[a][2]; });
			cut = {};
			for (i = 0; i < POS_MAX; i++) { cut[keys[i]] = keep[keys[i]]; }
			keep = cut;
		}
		lsSet(POS_KEY, JSON.stringify(keep));
	}
	function posGet(id) { return posFrom(posLoad(), id, now()); }
	function posSet(id, t, d) {
		var o = posLoad();
		o[String(id)] = [Math.floor(t), Math.floor(d), now()];
		posSave(o);
	}
	function posDrop(id) {
		var o = posLoad();
		if (Object.prototype.hasOwnProperty.call(o, String(id))) { delete o[String(id)]; posSave(o); }
	}
	function unfinished(p) { return !!p && p.t > MIN_T && p.d > 0 && p.t < p.d * DONE; }
	function pctOf(p) { return p ? Math.max(1, Math.min(100, Math.round(100 * p.t / p.d))) : 0; }
	function hist() {
		var l = [];
		try { l = window.xnHistoryLoad ? window.xnHistoryLoad() : []; } catch (e) { l = []; }
		return (l && typeof l.length === 'number') ? l : [];
	}
	function cap() { var c = window.xnvhCap; return (typeof c === 'number' && isFinite(c) && c > 0) ? Math.floor(c) : AUTO_CAP; }
	function playerRoot() { return document.getElementById('xn_player') || document.getElementById('kt_player'); }
	function runHooks() {
		var i;
		for (i = 0; i < clearHooks.length; i++) { try { clearHooks[i](); } catch (e) { } }
	}
	window.xnvhPosClear = function () { lsDrop(POS_KEY); forgetSaved(); runHooks(); };
	function clearAll() {
		var f = window.xnHistoryClear;
		try { if (f) { f(); } } catch (e) { }
		if (!(f && f.xnvh)) { window.xnvhPosClear(); }
	}
	function wrapHistoryClear() {
		var orig = window.xnHistoryClear, w;
		if (typeof orig !== 'function' || orig.xnvh) { return; }
		w = function () {
			try { orig.apply(this, arguments); } catch (e) { }
			window.xnvhPosClear();
		};
		w.xnvh = 1;
		window.xnHistoryClear = w;
	}

	function tryNote(id) {
		id = String(id || '').replace(/\D/g, '');
		if (id) { ssSet(TRY_KEY, id + '|' + now()); }
	}
	function trySettle(vid) {
		var v = ssGet(TRY_KEY), m, p;
		if (!v) { return false; }
		ssDrop(TRY_KEY);
		m = /^(\d+)\|(\d+)$/.exec(String(v));
		if (!m || m[1] === vid) { return false; }
		p = posGet(m[1]);
		if (!p || p.ts > +m[2]) { return false; }
		posDrop(m[1]);
		return true;
	}
	function noteTaps(box) {
		if (!box || box.xnvhTaps) { return; }
		box.xnvhTaps = 1;
		box.addEventListener('click', function (e) {
			var t = e.target;
			if (e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) { return; }
			while (t && t !== box) {
				if (t.nodeType === 1 && t.hasAttribute && t.hasAttribute('data-vid')) { tryNote(t.getAttribute('data-vid')); return; }
				t = t.parentNode;
			}
		});
	}
	function note(text) {
		var old = document.querySelector('.xnvh-toast'), el;
		if (old && old.parentNode) { old.parentNode.removeChild(old); }
		if (!text) { return; }
		el = document.createElement('div');
		el.className = 'xnvh-toast';
		el.textContent = text;
		document.body.appendChild(el);
		window.setTimeout(function () { if (el.parentNode) { el.parentNode.removeChild(el); } }, 4000);
	}

	function autoMore(find, count, fire, box) {
		var io, seen = null, fired = null, held = false, woke = false, timer = 0;
		if (!window.IntersectionObserver) { return function () { }; }
		function above() {
			var b = box(), r;
			if (!b || typeof b.getBoundingClientRect !== 'function') { return false; }
			r = b.getBoundingClientRect();
			return r.bottom < Math.min(AUTO_TOP, window.innerHeight * 0.2);
		}
		function again() {
			timer = 0;
			if (!held || !seen) { return; }
			held = false;
			io.unobserve(seen);
			io.observe(seen);
		}
		function moved() {
			if (!held || timer) { return; }
			timer = window.setTimeout(again, 150);
		}
		function wake() {
			if (woke) { return; }
			woke = true;
			window.addEventListener('scroll', moved, { passive: true });
			window.addEventListener('touchmove', moved, { passive: true });
		}
		io = new IntersectionObserver(function (es) {
			var i;
			for (i = 0; i < es.length; i++) {
				if (!es[i].isIntersecting || es[i].target !== seen || seen === fired) { continue; }
				if (count() >= cap()) { continue; }
				if (above()) { held = true; wake(); continue; }
				fired = seen;
				fire(seen);
			}
		}, { rootMargin: AUTO_NEAR });
		function arm() {
			var l = find();
			if (seen && seen !== l) {
				io.unobserve(seen);
				seen = null;
				fired = null;
				held = false;
			}
			if (!l) { return; }
			if (seen === l) { io.unobserve(l); }
			seen = l;
			io.observe(l);
		}
		return arm;
	}

	function ours(n) {
		while (n) {
			if (n.nodeType === 1 && OWN[n.className]) { return true; }
			n = n.parentNode;
		}
		return false;
	}
	function foreign(recs) {
		var i, j, a;
		for (i = 0; i < recs.length; i++) {
			a = recs[i].addedNodes;
			for (j = 0; j < a.length; j++) {
				if (a[j].nodeType === 1 && !ours(a[j])) { return true; }
			}
		}
		return false;
	}
	function watchDom(target, fn, ms) {
		var timer = 0;
		if (!target || !window.MutationObserver) { return; }
		new MutationObserver(function (recs) {
			if (timer || !foreign(recs)) { return; }
			timer = window.setTimeout(function () { timer = 0; fn(); }, ms);
		}).observe(target, { childList: true, subtree: true });
	}
	function tagItems(root) {
		var items = root.querySelectorAll('.list-videos .item'), i, a, m;
		for (i = 0; i < items.length; i++) {
			if (items[i].hasAttribute('data-vid')) { continue; }
			a = items[i].querySelector('a[href]');
			m = a ? /\/videos?\/(\d+)(?:\/|$)/.exec(a.getAttribute('href') || '') : null;
			if (!m) { a = items[i].querySelector('[data-fav-video-id]'); m = a ? /^(\d+)$/.exec(a.getAttribute('data-fav-video-id') || '') : null; }
			items[i].setAttribute('data-vid', m ? m[1] : '');
		}
	}
	function refreshBars(root, label) {
		var pos = posLoad(), t0 = now(), items = root.querySelectorAll('.item[data-vid]'), i, it, id, pct, w, bar2, pctEl, img, ws, last, rowEl, gone, txt;
		for (i = 0; i < items.length; i++) {
			it = items[i];
			id = it.getAttribute('data-vid');
			pct = id ? pctOf(posFrom(pos, id, t0)) : 0;
			bar2 = it.querySelector('.xnvh-tpg');
			if (pct > 0) {
				if (!bar2) {
					img = it.querySelector('.img');
					if (img) { bar2 = document.createElement('span'); bar2.className = 'xnvh-tpg'; bar2.appendChild(document.createElement('i')); img.appendChild(bar2); }
				}
				if (bar2 && bar2.firstChild) {
					w = pct + '%';
					if (bar2.firstChild.style.width !== w) { bar2.firstChild.style.width = w; }
				}
			} else if (bar2 && bar2.parentNode) {
				bar2.parentNode.removeChild(bar2);
			}
			if (label === null) { continue; }
			pctEl = it.querySelector('.xnvh-pct');
			if (pct > 0) {
				if (!pctEl) {
					ws = it.querySelectorAll('.wrap:not(.xnvh-wrap)');
					last = ws.length ? ws[ws.length - 1] : null;
					if (last && last.parentNode) {
						rowEl = document.createElement('div');
						rowEl.className = 'wrap xnvh-wrap';
						pctEl = document.createElement('div');
						pctEl.className = 'xnvh-pct';
						rowEl.appendChild(pctEl);
						last.parentNode.insertBefore(rowEl, last.nextSibling);
					}
				}
				if (pctEl) {
					txt = label.replace('%1%', pct + '%');
					if (pctEl.textContent !== txt) { pctEl.textContent = txt; }
				}
			} else if (pctEl && pctEl.parentNode) {
				gone = pctEl.parentNode;
				if (gone.className === 'wrap xnvh-wrap' && gone.parentNode) { gone.parentNode.removeChild(gone); } else { gone.removeChild(pctEl); }
			}
		}
	}
	function bars() {
		function pass() { tagItems(document); refreshBars(document, null); }
		pass();
		watchDom(document.body, pass, 150);
		clearHooks.push(pass);
		window.addEventListener('storage', function (ev) { if (ev && (ev.key === null || ev.key === POS_KEY)) { pass(); } });
		window.addEventListener('pageshow', function (ev) { if (ev && ev.persisted) { pass(); } });
	}

	var rowBox = null, rowSig = '', rowIds = '';
	function collectRow(vid) {
		var pos = posLoad(), t0 = now(), list = hist(), items = [], byId = {}, i, id, p, h;
		for (i = 0; i < list.length; i++) { if (list[i] && list[i].video_id) { byId[String(list[i].video_id)] = list[i]; } }
		for (id in pos) {
			if (!Object.prototype.hasOwnProperty.call(pos, id) || id === vid) { continue; }
			h = byId[id];
			if (!h) { continue; }
			p = posFrom(pos, id, t0);
			if (!unfinished(p) || !safePath(h.url)) { continue; }
			items.push({ id: id, t: p.t, d: p.d, ts: p.ts, url: safePath(h.url), title: h.title || '', shot: safePath(h.screenshot), pct: pctOf(p), left: Math.max(1, Math.round((p.d - p.t) / 60)) });
		}
		items.sort(function (a, b) { return b.ts - a.ts; });
		return items.slice(0, ROW_MAX);
	}
	function sigOf(items, full) {
		var s = [], i;
		for (i = 0; i < items.length; i++) { s.push(full ? items[i].id + ':' + items[i].pct + ':' + items[i].left : items[i].id); }
		return s.join('|');
	}
	function renderRow(items, T) {
		var box, head, wrap, i, it, html = '';
		box = document.createElement('div');
		box.className = 'xnvh-row';
		head = document.createElement('div');
		head.className = 'xnvh-head';
		head.textContent = T.resume;
		box.appendChild(head);
		wrap = document.createElement('div');
		wrap.className = 'xnvh-list';
		for (i = 0; i < items.length; i++) {
			it = items[i];
			html += '<a class="xnvh-it" href="' + esc(it.url) + '" title="' + esc(it.title) + '" data-vid="' + esc(it.id) + '"><div class="xnvh-th">' + (it.shot ? '<img src="' + esc(it.shot) + '" alt="" loading="lazy" decoding="async">' : '') + '<span class="xnvh-dur">' + esc(fmt(it.d)) + '</span><i class="xnvh-pg" style="width:' + it.pct + '%"></i></div><div class="xnvh-tt">' + esc(it.title) + '</div><div class="xnvh-sub">' + esc(T.left.replace('%1%', String(it.left))) + '</div></a>';
		}
		wrap.innerHTML = html;
		noteTaps(wrap);
		box.appendChild(wrap);
		return box;
	}
	function patchRow(items, T) {
		var i, it, el, pg, sub, w, txt;
		try {
			for (i = 0; i < items.length; i++) {
				it = items[i];
				el = rowBox.querySelector('.xnvh-it[data-vid="' + it.id + '"]');
				if (!el) { return false; }
				pg = el.querySelector('.xnvh-pg');
				sub = el.querySelector('.xnvh-sub');
				w = it.pct + '%';
				if (pg && pg.style.width !== w) { pg.style.width = w; }
				txt = T.left.replace('%1%', String(it.left));
				if (sub && sub.textContent !== txt) { sub.textContent = txt; }
			}
		} catch (e) { return false; }
		return true;
	}
	function placeRow() {
		var rel = document.querySelector('.related-videos'), stale, i;
		if (!rel) { return; }
		stale = rel.querySelectorAll('.xnvh-row');
		for (i = 0; i < stale.length; i++) {
			if (stale[i] !== rowBox && stale[i].parentNode) { stale[i].parentNode.removeChild(stale[i]); }
		}
		if (rowBox && rel.firstElementChild !== rowBox) { rel.insertBefore(rowBox, rel.firstChild); }
	}
	function rowWorthy(recs) {
		var i, j, a, n;
		for (i = 0; i < recs.length; i++) {
			a = recs[i].addedNodes;
			for (j = 0; j < a.length; j++) {
				n = a[j];
				if (n.nodeType === 1 && (n.className === 'xnvh-row' || !ours(n))) { return true; }
			}
		}
		return false;
	}
	function row(vid, T) {
		var rel = document.querySelector('.related-videos'), host, timer = 0, later = 0;
		if (!rel) { return; }
		function rebuild() {
			var items = collectRow(vid), ids = sigOf(items, false), sig = sigOf(items, true);
			if (rowBox && sig === rowSig) { placeRow(); return; }
			if (rowBox && items.length && ids === rowIds && patchRow(items, T)) { rowSig = sig; placeRow(); return; }
			rowBox = items.length ? renderRow(items, T) : null;
			rowSig = sig;
			rowIds = ids;
			placeRow();
		}
		function soon() {
			if (later) { return; }
			later = window.setTimeout(function () { later = 0; rebuild(); }, ROW_WAIT);
		}
		rebuild();
		clearHooks.push(rebuild);
		host = rel.parentNode;
		function sweep() {
			var old = host.querySelectorAll('.xnvh-row'), i;
			for (i = 0; i < old.length; i++) { if (old[i] !== rowBox && old[i].parentNode) { old[i].parentNode.removeChild(old[i]); } }
		}
		if (host && window.MutationObserver) {
			new MutationObserver(function (recs) {
				if (!rowWorthy(recs)) { return; }
				sweep();
				if (timer) { return; }
				timer = window.setTimeout(function () { timer = 0; placeRow(); }, 150);
			}).observe(host, { childList: true, subtree: true });
		}
		window.addEventListener('pageshow', function (ev) { if (ev && ev.persisted) { trySettle(vid); rebuild(); } });
		window.addEventListener('storage', function (ev) {
			if (!ev) { return; }
			if (ev.key === null || ev.key === POS_KEY || (window.xnHistoryKey && ev.key === window.xnHistoryKey)) { soon(); }
		});
	}

	function watch(vid) {
		var T = { resume: attr(cfg, 'resume', 'Xem tiếp'), left: attr(cfg, 'left', 'còn %1% phút'), from: attr(cfg, 'from', 'Tiếp tục từ %1%'), restart: attr(cfg, 'restart', 'Xem từ đầu') };
		if (!playerRoot() && document.querySelector('.block-video .no-player')) { posDrop(vid); }
		row(vid, T);
		var want = posGet(vid), seekTo = unfinished(want) ? want.t : 0, resumed = false, lastWrite = 0, fin = false;
		function toast(v) {
			var old = document.querySelector('.xnvh-toast');
			if (old && old.parentNode) { old.parentNode.removeChild(old); }
			var el = document.createElement('div');
			el.className = 'xnvh-toast';
			var s = document.createElement('span');
			s.textContent = T.from.replace('%1%', fmt(seekTo));
			var a = document.createElement('a');
			a.href = '#';
			a.className = 'xnvh-restart';
			a.textContent = T.restart;
			a.addEventListener('click', function (e) {
				e.preventDefault();
				try { v.currentTime = 0; } catch (e2) { }
				posDrop(vid);
				lastWrite = 0;
				if (el.parentNode) { el.parentNode.removeChild(el); }
			});
			el.appendChild(s);
			el.appendChild(a);
			document.body.appendChild(el);
			window.setTimeout(function () { if (el.parentNode) { el.parentNode.removeChild(el); } }, 7000);
		}
		function finish(v) {
			var d = v.duration;
			fin = true;
			if (isFinite(d) && d > 0) { posSet(vid, d, d); }
		}
		function tick(v) {
			if (v.paused || v.ended || v.seeking) { return; }
			var d = v.duration, t = v.currentTime, now2;
			if (!isFinite(d) || !(d > 0) || !isFinite(t) || !(t >= 0)) { return; }
			if (t >= d * DROP || d - t < 5) {
				if (!fin) { finish(v); }
				return;
			}
			fin = false;
			if (t < BAR_T) { return; }
			now2 = Date.now();
			if (now2 - lastWrite >= 5000) { lastWrite = now2; posSet(vid, t, d); }
		}
		function attach(v) {
			if (v.xnvhBound) { return; }
			v.xnvhBound = 1;
			v.addEventListener('timeupdate', function () { tick(v); });
			v.addEventListener('ended', function () { finish(v); });
			v.addEventListener('playing', function () {
				if (resumed || !(seekTo > 0)) { return; }
				resumed = true;
				var d = v.duration;
				if (isFinite(d) && d > 0 && seekTo >= d * DONE) { return; }
				if (v.currentTime < 5) {
					try { v.currentTime = seekTo; } catch (e) { return; }
					toast(v);
				}
			});
		}
		function find() {
			var r = playerRoot(), v = r ? r.querySelector('video') : null;
			if (v) { attach(v); }
			return !!v;
		}
		var root = playerRoot();
		find();
		if (root && window.MutationObserver) {
			new MutationObserver(function () { find(); }).observe(root.parentNode || root, { childList: true, subtree: true });
		}
	}

	function page() {
		var T = { empty: attr(grid, 'empty', ''), newest: attr(grid, 'newest', ''), newestUrl: safePath(attr(grid, 'newest-url', '/')) || '/', more: attr(grid, 'more', 'Xem thêm...'), confirm: attr(grid, 'confirm', ''), watched: attr(grid, 'watched', 'Đã xem %1%') };
		var shown = 0, more = null, bar = document.getElementById('xnvh_clear'), arm;
		function card(v, p) {
			var pct = pctOf(p), when = '', d;
			if (isFinite(v.t) && v.t > 0 && v.t < 1e11) {
				try { d = new Date(v.t * 1000); when = isNaN(d.getTime()) ? '' : d.toLocaleDateString(); } catch (e) { when = ''; }
			}
			return '<div class="item" data-vid="' + esc(String(v.video_id).replace(/\D/g, '')) + '"><a href="' + esc(safePath(v.url)) + '" title="' + esc(v.title) + '"><div class="img"><img class="thumb" src="' + esc(safePath(v.screenshot) || PH) + '" alt="' + esc(v.title) + '" width="320" height="180" loading="lazy" decoding="async">'
				+ (v.duration ? '<span class="xnvn-dur">' + esc(v.duration) + '</span>' : '')
				+ (pct > 0 ? '<span class="xnvh-tpg"><i style="width:' + pct + '%"></i></span>' : '')
				+ '</div><strong class="title">' + esc(v.title) + '</strong><div class="wrap"><div class="xnvh-when">' + esc(when) + '</div></div>' + (pct > 0 ? '<div class="wrap xnvh-wrap"><div class="xnvh-pct">' + esc(T.watched.replace('%1%', pct + '%')) + '</div></div>' : '') + '</a></div>';
		}
		function render() {
			var list = hist(), pos, t0, i, html = '', b;
			if (more && more.parentNode) { more.parentNode.removeChild(more); }
			more = null;
			if (!list.length) {
				grid.innerHTML = '<div class="empty-content xnvh-empty">' + esc(T.empty) + '<br><a href="' + esc(T.newestUrl) + '">' + esc(T.newest) + '</a></div>';
				if (bar) { bar.hidden = true; }
				arm();
				return;
			}
			if (bar) { bar.hidden = false; }
			shown = Math.min(list.length, Math.max(shown, PER_PAGE));
			pos = posLoad();
			t0 = now();
			for (i = 0; i < shown; i++) {
				if (list[i] && safePath(list[i].url)) { html += card(list[i], posFrom(pos, list[i].video_id, t0)); }
			}
			grid.innerHTML = html;
			if (shown < list.length) {
				more = document.createElement('div');
				more.className = 'xnvh-more';
				b = document.createElement('button');
				b.type = 'button';
				b.className = 'btn-load-more';
				b.textContent = T.more;
				b.addEventListener('click', function () { shown += PER_PAGE; render(); });
				more.appendChild(b);
				grid.parentNode.appendChild(more);
			}
			arm();
		}
		arm = autoMore(function () { return more ? more.querySelector('.btn-load-more') : null; }, function () { return grid.querySelectorAll('.item').length; }, function (b) { b.click(); }, function () { return grid; });
		noteTaps(grid);
		clearHooks.push(function () { shown = 0; render(); });
		if (bar) {
			bar.addEventListener('click', function () {
				if (T.confirm && !window.confirm(T.confirm)) { return; }
				clearAll();
			});
		}
		window.addEventListener('pageshow', function (ev) { if (ev && ev.persisted) { trySettle(''); render(); } });
		window.addEventListener('storage', function (ev) {
			if (!ev) { return; }
			if (ev.key === POS_KEY) { refreshBars(grid, T.watched); return; }
			if (ev.key === null || (window.xnHistoryKey && ev.key === window.xnHistoryKey)) { render(); }
		});
		render();
	}

	var forgetT = 0;
	function forgetSaved() {
		var i, k, drop = [];
		try {
			for (i = 0; i < window.sessionStorage.length; i++) {
				k = window.sessionStorage.key(i);
				if (k && k.indexOf('#' + BLOCK) >= 0) { drop.push(k); }
			}
			for (i = 0; i < drop.length; i++) { window.sessionStorage.removeItem(drop[i]); }
		} catch (e) { }
	}
	function forgetSoon() {
		forgetSaved();
		window.clearTimeout(forgetT);
		forgetT = window.setTimeout(function () { forgetT = 0; forgetSaved(); }, 1500);
	}
	function server() {
		forgetSaved();
		var T = { confirm: attr(srv, 'confirm', ''), fail: attr(srv, 'fail', ''), watched: attr(srv, 'watched', 'Đã xem %1%'), result: attr(srv, 'result', 'Kết quả cho "%1%" - %2% video'), resultClear: attr(srv, 'result-clear', 'Xóa tìm kiếm'), url: safePath(attr(srv, 'url', '/watched/')) || '/watched/' };
		var bar = document.getElementById('xnvh_clear'), busy = false, arm, q = attr(srv, 'q', ''), form = null, landed = null;
		function count() { return srv.querySelectorAll('.item').length; }
		function root() { return srv.querySelector('.xnvh-srv'); }
		function term() { var r = root(); return r ? attr(r, 'q', '') : q; }
		function total() { var r = root(), n = r ? parseInt(attr(r, 'total', ''), 10) : NaN; return (isFinite(n) && n >= 0) ? n : count(); }
		function sibling(cls) {
			var c = srv.parentNode, i, k;
			if (!c || !c.children) { return null; }
			for (i = 0; i < c.children.length; i++) {
				k = c.children[i];
				if (k.className === cls) { return k; }
			}
			return null;
		}
		function headline(qq, n) {
			var h = sibling('headline'), el, base, txt;
			el = (h && h.firstElementChild && String(h.firstElementChild.tagName).toUpperCase() === 'H1') ? h.firstElementChild : null;
			if (!el) { return; }
			base = String(el.textContent || '').replace(/\s*\(\d+\)\s*$/, '');
			txt = base + ((qq === '' && n > 0) ? ' (' + n + ')' : '');
			if (el.textContent !== txt) { el.textContent = txt; }
		}
		function bindLine(el) {
			if (el.xnvhBound) { return; }
			el.xnvhBound = 1;
			el.addEventListener('click', function (e) {
				var n = e.target;
				while (n && n !== el) {
					if (n.nodeType === 1 && String(n.tagName).toUpperCase() === 'A') {
						if (form && form.xnvhClear) { e.preventDefault(); form.xnvhClear(); }
						return;
					}
					n = n.parentNode;
				}
			});
		}
		function line(qq, n) {
			var el = sibling('xnvh-result'), a, txt;
			if (qq === '') {
				if (el && el.parentNode) { el.parentNode.removeChild(el); }
				return;
			}
			if (!el) {
				if (!srv.parentNode) { return; }
				el = document.createElement('div');
				el.className = 'xnvh-result';
				el.appendChild(document.createTextNode(''));
				a = document.createElement('a');
				a.href = T.url;
				a.textContent = T.resultClear;
				el.appendChild(a);
				srv.parentNode.insertBefore(el, srv);
			}
			bindLine(el);
			txt = T.result.replace('%2%', function () { return String(n); }).replace('%1%', function () { return qq; }) + ' ';
			if (el.firstChild && el.firstChild.nodeType === 3 && el.firstChild.nodeValue !== txt) { el.firstChild.nodeValue = txt; }
		}
		function refresh() {
			var n;
			tagItems(srv);
			refreshBars(srv, T.watched);
			q = term();
			n = total();
			headline(q, n);
			line(q, n);
			if (bar && !busy) { bar.hidden = count() === 0 && q === ''; }
			arm();
			forgetSoon();
			if (landed) { landed(); }
		}
		function search() {
			var f = document.querySelector('form.xnvh-search'), input, clearBtn, last = q, timer = 0, busyTimer = 0, landT = 0, pending = false, hooked = false, seq = 0, live = 0, healed = null;
			if (!f) { return; }
			input = f.querySelector('input[name="q"]');
			clearBtn = f.querySelector('.xnvh-search-clear');
			if (!input) { return; }
			form = f;
			function cut(s, n) {
				var i = 0, c = 0, k;
				while (i < s.length && c < n) {
					k = s.charCodeAt(i);
					i += (k >= 0xD800 && k <= 0xDBFF && i + 1 < s.length) ? 2 : 1;
					c++;
				}
				return s.slice(0, i);
			}
			function norm(s) {
				s = String(s === null || s === undefined ? '' : s).replace(/\+/g, ' ').replace(/\s+/g, ' ').replace(/^ | $/g, '');
				s = cut(s, 60).replace(/ $/, '');
				return s.length < 2 ? '' : s;
			}
			function fallback(qq) {
				var u;
				try {
					u = new URL(window.location.href);
					u.hash = '';
					if (qq) { u.searchParams.set('q', qq); } else { u.searchParams['delete']('q'); }
					window.location.href = u.toString();
				} catch (e) { f.submit(); }
			}
			function setUrl(qq) {
				var u;
				try {
					u = new URL(window.location.href);
					if (qq) { u.searchParams.set('q', qq); } else { u.searchParams['delete']('q'); }
					window.history.replaceState(window.history.state, '', u.toString());
				} catch (e) { }
			}
			function toggleClear() {
				if (!clearBtn) { return; }
				if (String(input.value).replace(/\s/g, '') !== '') { clearBtn.classList.remove('hidden'); } else { clearBtn.classList.add('hidden'); }
			}
			function setBusy(on) {
				window.clearTimeout(busyTimer);
				busyTimer = 0;
				if (on) {
					f.classList.add('is-busy');
					f.setAttribute('aria-busy', 'true');
					busyTimer = window.setTimeout(function () { setBusy(false); }, 5000);
				} else {
					f.classList.remove('is-busy');
					f.removeAttribute('aria-busy');
				}
			}
			function heal() {
				if (healed === last) { fallback(last); return; }
				healed = last;
				go(last);
			}
			function hook() {
				var jq = window.jQuery;
				if (hooked) { return true; }
				if (!jq || typeof jq.ajaxPrefilter !== 'function') { return false; }
				hooked = true;
				jq.ajaxPrefilter(function (s) {
					var my, ok, done, at;
					if (!s || typeof s.success !== 'function' || String(s.url || '').indexOf('block_id=' + BLOCK) < 0) { return; }
					ok = s.success;
					if (!pending) {
						at = root();
						s.success = function () {
							if (root() !== at) { return; }
							return ok.apply(this, arguments);
						};
						return;
					}
					my = ++seq;
					live = my;
					done = s.complete;
					s.success = function () {
						var st, r;
						if (my !== seq) { return; }
						st = jq.scrollTo;
						jq.scrollTo = function () { return jq(window); };
						try { r = ok.apply(this, arguments); } finally { jq.scrollTo = st; }
						window.clearTimeout(landT);
						landT = window.setTimeout(function () { landT = 0; if (my === seq && live === my) { live = 0; if (q !== last) { heal(); } } }, 1500);
						return r;
					};
					s.complete = function (x, status) {
						if (typeof done === 'function') { done.apply(this, arguments); }
						if (my !== seq || status === 'success') { return; }
						live = 0;
						setBusy(false);
						heal();
					};
				});
				return true;
			}
			function go(qq) {
				var a, before;
				qq = norm(qq);
				last = qq;
				a = srv.querySelector('a.xnvh-go');
				if (a && hook()) {
					a.setAttribute('data-parameters', 'from_watched:0' + (qq ? ';q:' + encodeURIComponent(qq) : ''));
					setUrl(qq);
					setBusy(true);
					before = seq;
					pending = true;
					try { a.click(); } finally { pending = false; }
					if (seq !== before) { toggleClear(); return; }
					setBusy(false);
				}
				fallback(qq);
			}
			function clearNow() {
				input.value = '';
				toggleClear();
				window.clearTimeout(timer);
				timer = 0;
				if (last !== '') { go(''); }
			}
			landed = function () {
				if (q === last || healed === last) {
					live = 0;
					window.clearTimeout(landT);
					landT = 0;
					setBusy(false);
					if (q === last) { healed = null; }
					return;
				}
				if (!live) { heal(); }
			};
			f.xnvhClear = clearNow;
			f.addEventListener('submit', function (e) {
				e.preventDefault();
				window.clearTimeout(timer);
				timer = 0;
				if (norm(input.value) === '' && last === '') { input.focus(); return; }
				go(input.value);
				if (document.body && document.body.classList && !document.body.classList.contains('no-touch')) { input.blur(); }
			});
			input.addEventListener('input', function () {
				var v = norm(input.value);
				toggleClear();
				window.clearTimeout(timer);
				timer = window.setTimeout(function () { timer = 0; if (v !== last) { go(v); } }, 450);
			});
			input.addEventListener('keydown', function (e) {
				if (e.key === 'Escape' || e.key === 'Esc' || e.keyCode === 27) {
					e.preventDefault();
					if (input.value !== '') { clearNow(); }
				}
			});
			if (clearBtn) {
				clearBtn.addEventListener('click', function () { clearNow(); input.focus(); });
			}
			toggleClear();
			hook();
		}
		function send(round) {
			var x = new XMLHttpRequest();
			x.open('POST', CLEAR_URL, true);
			x.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
			x.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
			x.onreadystatechange = function () {
				var ok = false, r = null;
				if (x.readyState !== 4) { return; }
				try { r = JSON.parse(x.responseText); ok = !!(r && r.status === 'success' && r.data && r.data.result === 'ok'); } catch (e) { ok = false; r = null; }
				if (r && r.data && r.data.result === 'not_logged_in') { window.location.reload(); return; }
				if (!ok) { busy = false; bar.disabled = false; note(T.fail); return; }
				if (r.data.done !== 1 && round < CLEAR_ROUNDS) { send(round + 1); return; }
				clearAll();
				if (q !== '') { window.location.href = window.location.pathname; } else { window.location.reload(); }
			};
			x.send('xnvh=1');
		}
		arm = autoMore(function () { return srv.querySelector('.load-more a[data-action="ajax"]'); }, count, function (a) { a.click(); }, function () { return document.getElementById(BLOCK + '_items') || srv; });
		noteTaps(srv);
		watchDom(srv, refresh, 120);
		clearHooks.push(refresh);
		search();
		if (bar) {
			bar.addEventListener('click', function () {
				if (busy) { return; }
				if (T.confirm && !window.confirm(T.confirm)) { return; }
				busy = true;
				bar.disabled = true;
				send(1);
			});
		}
		window.addEventListener('pageshow', function (ev) { if (ev && ev.persisted) { trySettle(''); refresh(); } });
		window.addEventListener('storage', function (ev) {
			if (!ev) { return; }
			if (ev.key === null || ev.key === POS_KEY) { refresh(); }
		});
		refresh();
	}

	function start() {
		var vid = cfg ? String(attr(cfg, 'video', '')).replace(/\D/g, '') : '';
		trySettle(vid);
		if (grid) { page(); }
		if (srv) { server(); }
		if (vid) { watch(vid); }
		bars();
		wrapHistoryClear();
	}
	if ((grid || srv) && !window.xnHistoryLoad && document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', start);
	} else {
		start();
	}
})();
