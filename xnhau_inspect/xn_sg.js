(function () {
	if (window.xnsgLoaded) { return; }
	window.xnsgLoaded = '1.2.1';
	var WEBP = 0, SEEN = {}, STEP = 0, RUN = 0, BUSY = 0, MIN_SHOW = 4, MAX_AGE = 2592000, MAX_D = 864000, END = 0.9, SHORT_MIN = 10, MAX_SEEDS = 12, MAX_REQ = 3;
	var CACHE = 'xnsg_c', CACHE_MAX = 600000, CACHE_KEEP = 6, FAIL = 'xnsg_f', FAIL_WAIT = 120000, soon = null;
	(function () {
		var im = new Image();
		im.onload = function () { WEBP = im.width === 2 ? 1 : 0; };
		im.src = 'data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA';
	})();

	function ls(k) { try { return window.localStorage.getItem(k); } catch (e) { return null; } }
	function lsSet(k, v) { try { window.localStorage.setItem(k, v); } catch (e) {} }
	function ssGet(k) { try { return window.sessionStorage.getItem(k); } catch (e) { return null; } }
	function ssSet(k, v) { try { window.sessionStorage.setItem(k, v); } catch (e) {} }
	function num(el, k, d) { var v = parseInt(el.getAttribute('data-' + k), 10); return isFinite(v) ? v : d; }

	function seedList(minT, max) {
		var p = null, out = [], k, v, t0 = Date.now() / 1000;
		try { p = JSON.parse(ls('xnvh_pos') || '{}'); } catch (e) { p = null; }
		if (!p || typeof p !== 'object') { return []; }
		for (k in p) {
			if (!Object.prototype.hasOwnProperty.call(p, k) || !/^[0-9]{1,10}$/.test(k)) { continue; }
			v = p[k];
			if (!v || typeof v.length !== 'number' || v.length < 3) { continue; }
			if (!(+v[1] > 0) || +v[1] > MAX_D || +v[0] > +v[1] || !(+v[2] > 0) || t0 - (+v[2]) > MAX_AGE) { continue; }
			if (!(+v[0] >= minT) && !(+v[0] >= SHORT_MIN && +v[0] >= END * (+v[1]))) { continue; }
			out.push([k, +v[2]]);
		}
		out.sort(function (a, b) { return b[1] - a[1]; });
		return out.slice(0, max).map(function (x) { return x[0]; });
	}

	function seedsOf(block) {
		return seedList(num(block, 'min', 30), Math.max(1, Math.min(MAX_SEEDS, num(block, 'seeds', MAX_SEEDS))));
	}

	function seenSet() {
		var s = {}, l, i, p, k;
		try { l = window.xnHistoryLoad ? window.xnHistoryLoad() : []; } catch (e) { l = []; }
		for (i = 0; i < l.length; i++) {
			if (l[i] && l[i].video_id) { s[String(l[i].video_id).replace(/\D/g, '')] = 1; }
		}
		try { p = JSON.parse(ls('xnvh_pos') || '{}'); } catch (e) { p = null; }
		if (p && typeof p === 'object') {
			for (k in p) {
				if (Object.prototype.hasOwnProperty.call(p, k)) { s[String(k).replace(/\D/g, '')] = 1; }
			}
		}
		return s;
	}

	function onPage() {
		var out = {};
		Array.prototype.slice.call(document.querySelectorAll('.xnhw .xnhw-it')).forEach(function (t) {
			if (!t.hidden) { out[String(t.getAttribute('data-vid') || '')] = 1; }
		});
		return out;
	}

	function tiles(block) {
		return Array.prototype.slice.call(block.querySelectorAll('.xnsg-it'));
	}

	function usable(block) {
		var page = onPage();
		return tiles(block).filter(function (t) {
			var id = String(t.getAttribute('data-vid') || '');
			return !SEEN[id] && !page[id];
		}).length;
	}

	function animate(el, i) {
		var done = 0, h = function () {
			if (done) { return; }
			done = 1;
			el.classList.remove('xnsg-in');
			el.style.animationDelay = '';
			el.removeEventListener('animationend', h);
		};
		el.style.animationDelay = (Math.min(i, 11) * 40) + 'ms';
		el.classList.add('xnsg-in');
		el.addEventListener('animationend', h);
		setTimeout(h, 1000);
	}

	function reveal(t, anim) {
		var img = t.querySelector('img.thumb'), src;
		if (!t.hidden) { return; }
		t.hidden = false;
		if (anim) { animate(t, STEP++); }
		if (img && img.getAttribute('data-original') && (img.getAttribute('src') || '').indexOf('data:') === 0) {
			src = (WEBP && img.getAttribute('data-webp')) ? img.getAttribute('data-webp') : img.getAttribute('data-original');
			img.setAttribute('src', src);
		}
	}

	function hover(block) {
		var fresh;
		if (block.hidden || !window.jQuery) { return; }
		fresh = tiles(block).filter(function (t) { return !t.hidden && !t.getAttribute('data-xnsg-h'); });
		if (!fresh.length) { return; }
		fresh.forEach(function (t) { t.setAttribute('data-xnsg-h', '1'); });
		try {
			if (window.jQuery.fn.thumbs) { window.jQuery(fresh).find('img[data-cnt]').thumbs(); }
			if (window.jQuery.fn.videopreview) { window.jQuery(fresh).find('img[data-preview]').videopreview(); }
		} catch (e) {}
	}

	function apply(block, anim) {
		var want = num(block, 'want', num(block, 'per', 8)), shown = 0, spare = 0, foot = block.querySelector('.xnsg-foot'), page = onPage();
		STEP = 0;
		tiles(block).forEach(function (t) {
			var id = String(t.getAttribute('data-vid') || '');
			if (SEEN[id] || page[id]) { t.hidden = true; return; }
			if (shown < want) { reveal(t, anim); shown++; } else { t.hidden = true; spare++; }
		});
		if (foot) { foot.hidden = spare === 0; }
		return shown;
	}

	function place(block) {
		var name = block.getAttribute('data-place'), at = name ? document.getElementById(name) : null;
		if (at && at.parentNode && at !== block && block.nextElementSibling !== at) { at.parentNode.insertBefore(block, at); }
	}

	function collapse(block) {
		block.hidden = true;
		block.classList.remove('xnsg-wait');
		block.classList.remove('xnsg-on');
		block.style.minHeight = '';
	}

	function settle(block, anim) {
		if (apply(block, anim) < MIN_SHOW) { collapse(block); return false; }
		if (block.hidden) { place(block); block.hidden = false; }
		block.classList.remove('xnsg-wait');
		block.classList.add('xnsg-on');
		block.style.minHeight = '';
		hover(block);
		if (!block.getAttribute('data-want') && tiles(block).filter(function (t) { return !t.hidden; }).length >= num(block, 'per', 8) && block.offsetHeight > 0) {
			lsSet('xnsg_h', window.innerWidth + ':' + Math.round(block.offsetHeight));
		}
		return true;
	}

	function reserve(block) {
		var ref = document.querySelector('.xnhw .xnhw-it:not([hidden])'), grid = block.querySelector('.xnsg-items');
		var foot = document.querySelector('.xnhw .xnhw-foot'), cs, h, w, cols, fh, chrome, kept = /^([0-9]{2,5}):([0-9]{2,5})$/.exec(ls('xnsg_h') || '');
		if (kept && parseInt(kept[1], 10) === window.innerWidth) { block.style.minHeight = kept[2] + 'px'; return; }
		if (!ref || !grid || !grid.clientWidth || !ref.offsetWidth) { return; }
		block.style.minHeight = '0px';
		chrome = block.offsetHeight;
		fh = (foot && !foot.hidden && foot.offsetHeight) ? foot.offsetHeight : 50;
		cs = window.getComputedStyle(ref);
		h = ref.offsetHeight + (parseFloat(cs.marginTop) || 0) + (parseFloat(cs.marginBottom) || 0);
		w = ref.offsetWidth + (parseFloat(cs.marginLeft) || 0) + (parseFloat(cs.marginRight) || 0);
		cols = Math.max(1, Math.round(grid.clientWidth / Math.max(1, w)));
		block.style.minHeight = Math.round(chrome + Math.ceil(num(block, 'per', 8) / cols) * h + fh) + 'px';
	}

	function fetchSeeds(block, sg, cb) {
		var url = window.location.pathname + '?mode=async&action=get_block&block_id=' + encodeURIComponent(block.getAttribute('data-block')) + '&sg=' + sg;
		var x = new XMLHttpRequest(), done = 0, fin = function (t) { if (done) { return; } done = 1; cb(t); };
		x.open('GET', url, true);
		x.timeout = 15000;
		x.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
		x.onreadystatechange = function () {
			if (x.readyState !== 4) { return; }
			fin((x.status === 200 && x.responseText) ? x.responseText : null);
		};
		x.onerror = function () { fin(null); };
		x.ontimeout = function () { fin(null); };
		x.send();
	}

	function take(block, html, skip, have) {
		var doc = null, got = null, grid = block.querySelector('.xnsg-items'), used;
		try { doc = new DOMParser().parseFromString(html || '', 'text/html'); } catch (e) { doc = null; }
		if (doc) { got = doc.getElementById(block.id) || doc.querySelector('.xnsg'); }
		if (!got || !grid) { return -1; }
		Array.prototype.slice.call(got.querySelectorAll('.xnsg-it')).forEach(function (n) {
			var id = String(n.getAttribute('data-vid') || ''), node;
			if (!/^[0-9]+$/.test(id) || have[id] || skip[id] || SEEN[id]) { return; }
			have[id] = 1;
			node = document.importNode(n, true);
			node.hidden = true;
			grid.appendChild(node);
		});
		used = parseInt(got.getAttribute('data-used'), 10);
		return used > 0 ? used : 0;
	}

	function cacheLoad(ttl) {
		var c = null, out = {}, k, now = Date.now();
		if (!(ttl > 0)) { return out; }
		try { c = JSON.parse(ssGet(CACHE) || 'null'); } catch (e) { c = null; }
		if (!c || typeof c !== 'object') { return out; }
		for (k in c) {
			if (Object.prototype.hasOwnProperty.call(c, k) && /^[0-9]{1,10}(?:-[0-9]{1,10}){0,31}$/.test(k) && c[k] && c[k].length === 2 && typeof c[k][1] === 'string' && now - (+c[k][0]) < ttl * 1000 && now >= +c[k][0]) { out[k] = c[k]; }
		}
		return out;
	}

	function cacheSave(c, ttl) {
		var keys, text;
		if (!(ttl > 0)) { return; }
		keys = Object.keys(c).sort(function (a, b) { return c[b][0] - c[a][0]; });
		while (keys.length) {
			if (keys.length <= CACHE_KEEP) {
				text = JSON.stringify(c);
				if (text.length <= CACHE_MAX) { ssSet(CACHE, text); return; }
			}
			delete c[keys.pop()];
		}
	}

	function load(block) {
		var run = ++RUN, seeds = seedsOf(block), per = num(block, 'per', 8), ttl = num(block, 'ttl', 600), grid = block.querySelector('.xnsg-items');
		var have = {}, skip = {}, cache, failed = 0, asked = 0;
		if (!grid || !seeds.length) { BUSY = 0; collapse(block); return; }
		SEEN = seenSet();
		seeds.forEach(function (s) { skip[s] = 1; });
		if (block.classList.contains('xnsg-on') && block.offsetHeight) { block.style.minHeight = block.offsetHeight + 'px'; }
		while (grid.firstChild) { grid.removeChild(grid.firstChild); }
		block.removeAttribute('data-want');
		block.setAttribute('data-key', seeds.join('-'));
		cache = cacheLoad(ttl);
		BUSY = run;
		function done() {
			var ok;
			if (BUSY === run) { BUSY = 0; }
			ok = settle(block, false);
			if (!failed && asked > 0) { lsSet('xnsg_r', ok ? '1' : '0'); }
		}
		function step(at, n) {
			var sg, wait, used;
			if (run !== RUN) { return; }
			if (at >= seeds.length || n >= MAX_REQ || usable(block) >= per) { done(); return; }
			sg = seeds.slice(at).join('-');
			if (cache[sg]) {
				used = take(block, cache[sg][1], skip, have);
				if (used >= 0) {
					asked++;
					step(at + (used > 0 ? used : seeds.length), n + 1);
					return;
				}
				delete cache[sg];
			}
			wait = parseInt(ssGet(FAIL) || '0', 10) || 0;
			if (wait > 0 && Date.now() - wait < FAIL_WAIT && Date.now() >= wait) { failed = 1; done(); return; }
			fetchSeeds(block, sg, function (html) {
				var u;
				if (run !== RUN) { return; }
				u = html === null ? -1 : take(block, html, skip, have);
				if (u < 0) {
					failed = 1;
					ssSet(FAIL, String(Date.now()));
					done();
					return;
				}
				asked++;
				cache[sg] = [Date.now(), html];
				cacheSave(cache, ttl);
				step(at + (u > 0 ? u : seeds.length), n + 1);
			});
		}
		step(0, 0);
	}

	function eligible(block) {
		var rate = num(block, 'rate', 0), b = ls('xnsg_b');
		if (b === null || !/^[0-9]{1,2}$/.test(b)) {
			b = String(Math.floor(Math.random() * 100));
			lsSet('xnsg_b', b);
			if (ls('xnsg_b') !== b) { return false; }
		}
		return parseInt(b, 10) < rate && seedList(num(block, 'min', 30), 1).length > 0;
	}

	function start(block) {
		if (!block.classList.contains('xnsg-wait') && !block.classList.contains('xnsg-on')) {
			if (!eligible(block)) { RUN++; BUSY = 0; collapse(block); return; }
			if (ls('xnsg_r') === '1') {
				place(block);
				block.hidden = false;
				block.classList.add('xnsg-wait');
			}
		}
		if (block.classList.contains('xnsg-wait')) { reserve(block); }
		load(block);
	}

	function again(block, fresh) {
		if (soon) { clearTimeout(soon); }
		soon = setTimeout(function () {
			soon = null;
			if (BUSY || !tiles(block).length) { return; }
			if (fresh) { SEEN = seenSet(); }
			settle(block, false);
		}, 250);
	}

	function init() {
		var block = document.querySelector('.xnsg'), btn, mo;
		if (!block) { return; }
		btn = block.querySelector('.xnsg-more');
		if (btn) {
			btn.addEventListener('click', function (ev) {
				var per = num(block, 'per', 8);
				ev.preventDefault();
				block.setAttribute('data-want', String(num(block, 'want', per) + per));
				apply(block, true);
				hover(block);
			});
		}
		start(block);
		if (window.MutationObserver) {
			mo = new MutationObserver(function () { again(block, false); });
			Array.prototype.slice.call(document.querySelectorAll('.xnhw .xnhw-items')).forEach(function (g) {
				mo.observe(g, { subtree: true, childList: true, attributes: true, attributeFilter: ['hidden'] });
			});
		}
		window.addEventListener('storage', function (ev) {
			if (ev.key === null || ev.key === 'video_history' || ev.key === 'xnvh_pos' || (window.xnHistoryKey && ev.key === window.xnHistoryKey)) { again(block, true); }
		});
		window.addEventListener('pageshow', function (ev) {
			if (!ev.persisted) { return; }
			if (block.classList.contains('xnsg-on') && block.getAttribute('data-key') === seedsOf(block).join('-')) {
				SEEN = seenSet();
				settle(block, false);
				return;
			}
			start(block);
		});
	}

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', init);
	} else {
		init();
	}
})();
