(function () {
	'use strict';
	if (window.xnvcLoaded) { return; }
	window.xnvcLoaded = 1;
	var d = document;
	var API = '/xn_block.php';
	var T = {
		vi: { more: 'Thêm', profile: 'Xem trang cá nhân', block: 'Chặn người này', unblock: 'Bỏ chặn', confirm: 'Chặn %s? Hai bạn sẽ không còn là bạn bè và không thể nhắn tin hay gọi cho nhau nữa.', byme: 'Bạn đã chặn người này.', onme: 'Bạn không thể nhắn tin cho người này.', fail: 'Không thực hiện được, thử lại sau.' },
		en: { more: 'More', profile: 'View profile', block: 'Block this member', unblock: 'Unblock', confirm: 'Block %s? You will no longer be friends and neither of you can message or call the other.', byme: 'You blocked this member.', onme: 'You cannot message this member.', fail: 'That did not work, try again later.' },
		de: { more: 'Mehr', profile: 'Profil ansehen', block: 'Dieses Mitglied blockieren', unblock: 'Blockierung aufheben', confirm: '%s blockieren? Ihr seid dann keine Freunde mehr und könnt euch weder schreiben noch anrufen.', byme: 'Du hast dieses Mitglied blockiert.', onme: 'Du kannst diesem Mitglied nicht schreiben.', fail: 'Das hat nicht geklappt, versuche es später noch einmal.' },
		fr: { more: 'Plus', profile: 'Voir le profil', block: 'Bloquer ce membre', unblock: 'Débloquer', confirm: 'Bloquer %s ? Vous ne serez plus amis et aucun de vous ne pourra écrire ou appeler l’autre.', byme: 'Vous avez bloqué ce membre.', onme: 'Vous ne pouvez pas écrire à ce membre.', fail: 'Cela n’a pas fonctionné, réessayez plus tard.' },
		es: { more: 'Más', profile: 'Ver perfil', block: 'Bloquear a este miembro', unblock: 'Desbloquear', confirm: '¿Bloquear a %s? Dejaréis de ser amigos y ninguno podrá escribir ni llamar al otro.', byme: 'Has bloqueado a este miembro.', onme: 'No puedes escribir a este miembro.', fail: 'No se pudo hacer, inténtalo más tarde.' },
		it: { more: 'Altro', profile: 'Vedi profilo', block: 'Blocca questo membro', unblock: 'Sblocca', confirm: 'Bloccare %s? Non sarete più amici e nessuno dei due potrà scrivere o chiamare l’altro.', byme: 'Hai bloccato questo membro.', onme: 'Non puoi scrivere a questo membro.', fail: 'Non è andata, riprova più tardi.' },
		pt: { more: 'Mais', profile: 'Ver perfil', block: 'Bloquear este membro', unblock: 'Desbloquear', confirm: 'Bloquear %s? Deixam de ser amigos e nenhum dos dois poderá escrever ou ligar ao outro.', byme: 'Bloqueou este membro.', onme: 'Não pode escrever a este membro.', fail: 'Não resultou, tente mais tarde.' },
		zh: { more: '更多', profile: '查看主页', block: '拉黑此人', unblock: '取消拉黑', confirm: '拉黑 %s？你们将不再是好友，彼此都无法发消息或通话。', byme: '你已拉黑此人。', onme: '你无法给此人发消息。', fail: '操作失败，请稍后再试。' },
		ja: { more: 'その他', profile: 'プロフィールを見る', block: 'このメンバーをブロック', unblock: 'ブロック解除', confirm: '%s をブロックしますか？友達ではなくなり、互いにメッセージも通話もできなくなります。', byme: 'このメンバーをブロックしています。', onme: 'このメンバーにはメッセージを送れません。', fail: 'できませんでした。後でもう一度お試しください。' },
		ru: { more: 'Ещё', profile: 'Открыть профиль', block: 'Заблокировать', unblock: 'Разблокировать', confirm: 'Заблокировать %s? Вы перестанете быть друзьями и не сможете писать или звонить друг другу.', byme: 'Вы заблокировали этого участника.', onme: 'Вы не можете писать этому участнику.', fail: 'Не получилось, попробуйте позже.' },
		tr: { more: 'Daha fazla', profile: 'Profili gör', block: 'Bu üyeyi engelle', unblock: 'Engeli kaldır', confirm: '%s engellensin mi? Artık arkadaş olmayacaksınız ve birbirinize mesaj atamaz ya da arayamazsınız.', byme: 'Bu üyeyi engellediniz.', onme: 'Bu üyeye mesaj gönderemezsiniz.', fail: 'Olmadı, daha sonra tekrar deneyin.' }
	};
	function lang() {
		var l = (d.documentElement.getAttribute('lang') || 'vi').toLowerCase().slice(0, 2);
		if (l === 'vn') { l = 'vi'; }
		return T[l] ? l : 'vi';
	}
	var L = T[lang()];
	// the friend pill (profile head): friends / they asked me / I asked them
	var T2 = {
		vi: { friends: 'Bạn bè', respond: 'Phản hồi', cancelreq: 'Hủy lời mời', unfriend: 'Hủy kết bạn', accept: 'Xác nhận', delreq: 'Xóa lời mời', unfriendq: 'Hủy kết bạn với %s?', cancelq: 'Hủy lời mời kết bạn đã gửi cho %s?' },
		en: { friends: 'Friends', respond: 'Respond', cancelreq: 'Cancel request', unfriend: 'Unfriend', accept: 'Confirm', delreq: 'Delete request', unfriendq: 'Unfriend %s?', cancelq: 'Cancel the friend request to %s?' },
		de: { friends: 'Freunde', respond: 'Antworten', cancelreq: 'Anfrage zurückziehen', unfriend: 'Freundschaft beenden', accept: 'Bestätigen', delreq: 'Anfrage löschen', unfriendq: 'Freundschaft mit %s beenden?', cancelq: 'Freundschaftsanfrage an %s zurückziehen?' },
		fr: { friends: 'Amis', respond: 'Répondre', cancelreq: 'Annuler la demande', unfriend: 'Retirer des amis', accept: 'Confirmer', delreq: 'Supprimer la demande', unfriendq: 'Retirer %s de vos amis ?', cancelq: 'Annuler la demande d’ami envoyée à %s ?' },
		es: { friends: 'Amigos', respond: 'Responder', cancelreq: 'Cancelar solicitud', unfriend: 'Eliminar de amigos', accept: 'Confirmar', delreq: 'Eliminar solicitud', unfriendq: '¿Eliminar a %s de tus amigos?', cancelq: '¿Cancelar la solicitud de amistad a %s?' },
		it: { friends: 'Amici', respond: 'Rispondi', cancelreq: 'Annulla richiesta', unfriend: 'Rimuovi dagli amici', accept: 'Conferma', delreq: 'Elimina richiesta', unfriendq: 'Rimuovere %s dagli amici?', cancelq: 'Annullare la richiesta di amicizia a %s?' },
		pt: { friends: 'Amigos', respond: 'Responder', cancelreq: 'Cancelar pedido', unfriend: 'Desfazer amizade', accept: 'Confirmar', delreq: 'Apagar pedido', unfriendq: 'Desfazer a amizade com %s?', cancelq: 'Cancelar o pedido de amizade a %s?' },
		zh: { friends: '好友', respond: '回应', cancelreq: '取消请求', unfriend: '解除好友', accept: '确认', delreq: '删除请求', unfriendq: '解除与 %s 的好友关系？', cancelq: '取消发给 %s 的好友请求？' },
		ja: { friends: '友達', respond: '返答', cancelreq: 'リクエストを取り消す', unfriend: '友達から削除', accept: '承認', delreq: 'リクエストを削除', unfriendq: '%s を友達から削除しますか？', cancelq: '%s への友達リクエストを取り消しますか？' },
		ru: { friends: 'Друзья', respond: 'Ответить', cancelreq: 'Отменить запрос', unfriend: 'Удалить из друзей', accept: 'Подтвердить', delreq: 'Удалить запрос', unfriendq: 'Удалить %s из друзей?', cancelq: 'Отменить запрос в друзья для %s?' },
		tr: { friends: 'Arkadaşsınız', respond: 'Yanıtla', cancelreq: 'İsteği geri al', unfriend: 'Arkadaşlıktan çıkar', accept: 'Onayla', delreq: 'İsteği sil', unfriendq: '%s ile arkadaşlık bitirilsin mi?', cancelq: '%s için gönderilen arkadaşlık isteği geri alınsın mı?' }
	};
	(function () { var x = T2[lang()] || T2.vi; for (var k in x) { if (x.hasOwnProperty(k)) { L[k] = x[k]; } } })();
	var states = {};
	var MORE_SVG = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><circle cx="5" cy="12" r="2" fill="currentColor"/><circle cx="12" cy="12" r="2" fill="currentColor"/><circle cx="19" cy="12" r="2" fill="currentColor"/></svg>';

	function q(s, r) { return (r || d).querySelector(s); }
	function el(tag, cls, text) { var e = d.createElement(tag); if (cls) { e.className = cls; } if (text != null) { e.textContent = text; } return e; }
	function me() {
		var h = q('.notification-header[data-notifications-user-id]');
		return h ? parseInt(h.getAttribute('data-notifications-user-id'), 10) || 0 : 0;
	}
	function api(a, to) {
		var fd = new FormData();
		fd.set('a', a);
		fd.set('to', String(to));
		return fetch(API, { method: 'POST', credentials: 'same-origin', headers: { 'X-Requested-With': 'XMLHttpRequest' }, body: fd })
			.then(function (r) { return r.json(); }).then(function (j) {
				if (j && j.status === 'success') { states[to] = { by_me: !!j.by_me, on_me: !!j.on_me, friends: !!j.friends, at: Date.now() }; d.dispatchEvent(new CustomEvent('xnvc:state', { detail: { to: to, state: states[to] } })); return states[to]; }
				throw new Error('state');
			});
	}
	function state(to, fresh) {
		var s = states[to];
		if (s && !fresh && Date.now() - s.at < 60000) { return Promise.resolve(s); }
		return api('state', to);
	}

	// ---------------------------------------------------------------- the menu
	var openMenu = null;
	function closeMenu() { if (openMenu && openMenu.parentNode) { openMenu.parentNode.removeChild(openMenu); } openMenu = null; }
	d.addEventListener('click', function (e) { if (openMenu && !openMenu.contains(e.target) && !(e.target.closest && e.target.closest('.xnvc-more, .xnvc-dots'))) { closeMenu(); } }, true);
	d.addEventListener('keydown', function (e) { if (e.key === 'Escape' && openMenu) { closeMenu(); } }, true);
	function showMenu(anchor, items) {
		closeMenu();
		var m = el('div', 'xnvc-menu');
		m.setAttribute('role', 'menu');
		items.forEach(function (it) {
			var a = el(it.href ? 'a' : 'button', 'xnvc-mi' + (it.red ? ' red' : ''), it.label);
			if (it.href) { a.href = it.href; } else { a.type = 'button'; }
			a.addEventListener('click', function (e) { if (!it.href) { e.preventDefault(); } closeMenu(); if (it.run) { it.run(); } });
			m.appendChild(a);
		});
		var holder = anchor.closest('.xnhb-ch, .xnmsg-chead, .headline') || anchor.parentNode;
		var hs = getComputedStyle(holder);
		if (hs.position === 'static') { holder.style.position = 'relative'; }
		if (hs.zIndex === 'auto') { holder.style.zIndex = '50'; }   // the menu must paint above what follows the header (the chat body, the pills)
		holder.appendChild(m);
		var hr = holder.getBoundingClientRect(), ar = anchor.getBoundingClientRect();
		m.style.top = (ar.bottom - hr.top + 6) + 'px';
		// right-aligned under its button; a button near the left edge (a phone row) gets the menu left-aligned instead
		if (ar.right - hr.left < 220) { m.style.left = Math.max(0, ar.left - hr.left) + 'px'; } else { m.style.right = Math.max(0, hr.right - ar.right) + 'px'; }
		openMenu = m;
	}
	function toggleBlock(to, name, scope) {
		return state(to, true).then(function (s) {
			if (s.by_me) { return api('unblock', to); }
			if (!window.confirm(L.confirm.replace('%s', name || ''))) { return s; }
			return api('block', to);
		}).then(function () { paintAll(); }).catch(function () { window.alert(L.fail); });
	}
	function blockItems(to, name, profileHref) {
		var s = states[to] || {};
		var items = [];
		if (profileHref) { items.push({ label: L.profile, href: profileHref }); }
		items.push({ label: s.by_me ? L.unblock : L.block, red: !s.by_me, run: function () { toggleBlock(to, name); } });
		return items;
	}

	// ---------------------------------------------------------------- the bars under a chat
	function paintCompose(comp, to) {
		var s = states[to];
		var bar = q('.xnvc-bar', comp);
		if (!s || (!s.by_me && !s.on_me)) {
			comp.classList.remove('xnvc-blocked');
			if (bar) { bar.parentNode.removeChild(bar); }
			return;
		}
		var want = (s.by_me ? 'byme' : 'onme') + ':' + to;
		if (bar && bar.getAttribute('data-xnvc') === want) { comp.classList.add('xnvc-blocked'); return; }   // already painted: nothing to redo
		if (!bar) { bar = el('div', 'xnvc-bar'); comp.appendChild(bar); }
		bar.setAttribute('data-xnvc', want);
		bar.textContent = '';
		bar.appendChild(el('span', '', s.by_me ? L.byme : L.onme));
		if (s.by_me) {
			var b = el('button', 'xnvc-unblock', L.unblock);
			b.type = 'button';
			b.addEventListener('click', function () { api('unblock', to).then(paintAll).catch(function () { window.alert(L.fail); }); });
			bar.appendChild(b);
		}
		comp.classList.add('xnvc-blocked');
		// a send refused by the site (an old tab, a block made elsewhere) -> the state is read again and the bar appears
		var form = q('form', comp);
		if (form && !form.xnvcWatch) {
			form.xnvcWatch = 1;
			form.addEventListener('submit', function () { setTimeout(function () { state(to, true).then(paintAll).catch(function () {}); }, 1500); }, true);
		}
	}
	function watchForm(comp, to) {
		var form = q('form', comp);
		if (form && !form.xnvcWatch) {
			form.xnvcWatch = 1;
			form.addEventListener('submit', function () { setTimeout(function () { state(to, true).then(paintAll).catch(function () {}); }, 1500); }, true);
		}
	}
	function partnerOf(form) {
		var i = form ? form.querySelector('input[name="reply_to_user_id"]') : null;
		return i ? parseInt(i.value, 10) || 0 : 0;
	}

	// ---------------------------------------------------------------- the three places
	function paintWindow() {
		var w = q('.xnhb-chat');
		if (!w) { return; }
		var head = q('.xnhb-ch', w), form = q('.xnhb-cf form', w);
		var to = partnerOf(form);
		if (!head || !to) { return; }
		var more = q('.xnvc-more', head);
		if (!more) {
			more = el('button', 'x xnvc-more');
			more.type = 'button';
			more.title = L.more;
			more.setAttribute('aria-label', L.more);
			more.innerHTML = MORE_SVG;
			var snd = q('.x.snd', head);
			head.insertBefore(more, snd || q('.x.close', head));
			more.addEventListener('click', function (e) {
				e.preventDefault();
				var who = q('.who', head);
				var cur = partnerOf(q('.xnhb-cf form', w));
				state(cur).then(function () { showMenu(more, blockItems(cur, who ? who.textContent.trim() : '', '/members/' + cur + '/')); });
			});
		}
		if (w.getAttribute('data-xnvc-to') !== String(to)) {
			w.setAttribute('data-xnvc-to', String(to));
			state(to).then(function () { paintWindow(); }).catch(function () {});
		}
		var comp = q('.xnmsg-compose', w);
		if (comp) { watchForm(comp, to); paintCompose(comp, to); }
	}
	var pageMenuWatch = false;
	function pageMenuTap(ul) {
		var box = ul.closest('.xnmsg-menu');
		if (!box) { return; }
		box.addEventListener('click', function (e) {
			if (e.target.closest('ul')) { box.classList.remove('xnvc-open'); return; }
			e.preventDefault();
			box.classList.toggle('xnvc-open');
		});
		if (pageMenuWatch) { return; }
		pageMenuWatch = true;
		document.addEventListener('click', function (e) {
			Array.prototype.forEach.call(document.querySelectorAll('.xnmsg-menu.xnvc-open'), function (m) {
				if (!m.contains(e.target)) { m.classList.remove('xnvc-open'); }
			});
		});
	}
	function paintPage() {
		var chat = q('.xnmsg-chat:not(.xnhb-chat)');
		if (!chat) { return; }
		var form = q('#send_message_form', chat), menu = q('.xnmsg-menu ul', chat);
		var to = partnerOf(form);
		if (!to) { return; }
		if (menu && !q('.xnvc-page-item', menu)) {
			var vendorIgnore = q('a[data-action="ignore_conversation"]', menu);
			if (vendorIgnore && vendorIgnore.closest('li')) { vendorIgnore.closest('li').hidden = true; }
			var li = el('li', 'xnvc-page-item');
			var a = el('a', 'xnvc-page-block', L.block);
			a.href = '#block';
			a.addEventListener('click', function (e) {
				e.preventDefault();
				var h = q('.xnmsg-chead h2', chat);
				toggleBlock(to, h ? h.textContent.trim() : '');
			});
			li.appendChild(a);
			menu.appendChild(li);
			pageMenuTap(menu);
		}
		var item = q('.xnvc-page-block', chat);
		var s = states[to];
		if (item && s) { var want = s.by_me ? L.unblock : L.block; if (item.textContent !== want) { item.textContent = want; } }
		if (chat.getAttribute('data-xnvc-to') !== String(to)) {
			chat.setAttribute('data-xnvc-to', String(to));
			state(to).then(function () { paintPage(); }).catch(function () {});
		}
		var comp = q('.xnmsg-compose', chat.parentNode || chat) || q('.xnmsg-compose');
		if (comp && !comp.closest('.xnhb-chat')) { watchForm(comp, to); paintCompose(comp, to); }
	}
	function profileId() {
		var e = q('.headline a.xnph-sub[data-id], .headline [data-subscribe-to="user"][data-id], .headline [data-unsubscribe-to="user"][data-id]');
		if (e) { return parseInt(e.getAttribute('data-id'), 10) || 0; }
		var m = /\/members\/(\d+)\//.exec(location.pathname);
		return m ? parseInt(m[1], 10) : 0;
	}
	// ---------------------------------------------------------------- the friend pill on a profile (Facebook style)
	// the stock page tells the state with a grey box under the name ("X is in your friends list" + Delete, "X wants to
	// be your friend" + Accept / Decline, "invitation sent"); the pill in the head row replaces those boxes, which stay
	// in the page hidden and lend their hidden fields to the requests
	var FR_ICON = { friend: 'fa-solid fa-user-check', 'in': 'fa-solid fa-user-plus', sent: 'fa-solid fa-user-xmark' };
	function frForms() {
		var out = { friend: null, 'in': null, sent: null };
		Array.prototype.forEach.call(d.querySelectorAll('form'), function (f) {
			if (!q('.info-message', f)) { return; }
			var a = q('input[name="action"]', f);
			var v = a ? a.value : '';
			if (v === 'remove_from_friends') { out.friend = f; } else if (v === 'confirm_add_to_friends') { out['in'] = f; } else if (!a) { out.sent = f; }
		});
		return out;
	}
	function frState(forms, stock) {
		if (forms.friend) { return 'friend'; }
		if (forms['in']) { return 'in'; }
		if (stock && stock.classList.contains('done')) { return 'sent'; }
		return '';
	}
	function frPost(form, extra) {
		var fd = new FormData(form);
		Object.keys(extra || {}).forEach(function (k) { fd.set(k, extra[k]); });
		fd.set('mode', 'async');
		fd.set('format', 'json');
		return fetch(location.pathname, { method: 'POST', credentials: 'same-origin', headers: { 'X-Requested-With': 'XMLHttpRequest' }, body: fd })
			.then(function (r) { return r.text(); })
			.then(function (t) { var j = null; try { j = JSON.parse(t); } catch (x) { j = null; } if (!j || j.status !== 'success') { throw new Error('refused'); } return j; });
	}
	function frBusy(pill, on) { pill.classList.toggle('xnvc-busy', !!on); }
	function frClick(pill, to) {
		var st = pill.getAttribute('data-st');
		var forms = frForms();
		var h1 = q('h1', pill.closest('.headline'));
		var name = h1 ? h1.textContent.trim() : '';
		var fail = function () { frBusy(pill, false); window.alert(L.fail); };
		var reload = function () { location.reload(); };
		if (st === 'friend' && forms.friend) {
			showMenu(pill, [{ label: L.unfriend, red: true, run: function () {
				if (!window.confirm(L.unfriendq.replace('%s', name))) { return; }
				frBusy(pill, true);
				frPost(forms.friend).then(reload).catch(fail);
			} }]);
		} else if (st === 'in' && forms['in']) {
			showMenu(pill, [
				{ label: L.accept, run: function () { frBusy(pill, true); frPost(forms['in'], { confirm: '1' }).then(reload).catch(fail); } },
				{ label: L.delreq, red: true, run: function () { frBusy(pill, true); frPost(forms['in'], { reject: '1' }).then(reload).catch(fail); } }
			]);
		} else if (st === 'sent') {
			if (!window.confirm(L.cancelq.replace('%s', name))) { return; }
			frBusy(pill, true);
			api('cancel', to).then(reload).catch(fail);
		}
	}
	function paintFriend(head, to) {
		var stock = q('a.community_user[data-action="add_to_friends"]', head);
		var forms = frForms();
		var st = frState(forms, stock);
		var pill = q('.xnvc-fr', head);
		if (!st) {
			if (pill) { pill.parentNode.removeChild(pill); }
			if (stock) { stock.classList.remove('xnvc-off'); }
			return;
		}
		['friend', 'in', 'sent'].forEach(function (k) { if (forms[k]) { forms[k].classList.add('xnvc-off'); } });
		if (stock) { stock.classList.add('xnvc-off'); }
		if (!pill) {
			pill = el('a', 'button community_user xnvc-fr');
			pill.href = '#friend';
			var after = stock || q('a.community_user[data-action="message"]', head);
			if (after && after.nextSibling) { after.parentNode.insertBefore(pill, after.nextSibling); } else { head.appendChild(pill); }
			pill.addEventListener('click', function (e) { e.preventDefault(); frClick(pill, to); });
		}
		if (pill.getAttribute('data-st') !== st) {
			pill.setAttribute('data-st', st);
			pill.className = 'button community_user xnvc-fr is-' + st;
			pill.innerHTML = '';
			pill.appendChild(el('i', FR_ICON[st] + ' xnph-ico'));
			pill.appendChild(el('span', '', st === 'friend' ? L.friends : (st === 'in' ? L.respond : L.cancelreq)));
			if (st !== 'sent') { pill.appendChild(el('i', 'fa-solid fa-chevron-down xnvc-chev')); }
		}
	}
	function paintProfile() {
		var msg = q('.headline a.community_user[data-action="message"]');
		/* xnhau custom (xn_privacy 1.1.3): the member may have gated the Nhắn tin button away - any head button finds the head */
		var xnprAnchor = msg || q('.headline a.community_user, .headline a.xnph-sub, .headline [data-subscribe-to="user"], .headline [data-unsubscribe-to="user"]');
		var head = xnprAnchor ? xnprAnchor.closest('.headline') : null;
		if (!head || !me()) { return; }
		var to = profileId();
		if (!to || to === me()) { return; }
		paintFriend(head, to);
		var dots = q('.xnvc-dots', head);
		if (!dots) {
			dots = el('a', 'button community_user xnvc-dots');
			dots.href = '#more';
			dots.title = L.more;
			dots.setAttribute('aria-label', L.more);
			dots.innerHTML = MORE_SVG;
			var last = null;
			var cu = head.querySelectorAll('a.community_user');
			if (cu.length) { last = cu[cu.length - 1]; }
			if (last && last.nextSibling) { last.parentNode.insertBefore(dots, last.nextSibling); } else { head.appendChild(dots); }
			dots.addEventListener('click', function (e) {
				e.preventDefault();
				var h1 = q('h1', head);
				state(to).then(function () { showMenu(dots, blockItems(to, h1 ? h1.textContent.trim() : '', '')); });
			});
		}
		if (head.getAttribute('data-xnvc-to') !== String(to)) {
			head.setAttribute('data-xnvc-to', String(to));
			state(to).then(function () { paintProfile(); }).catch(function () {});
		}
		var s = states[to];
		head.classList.toggle('xnvc-byme', !!(s && s.by_me));
		head.classList.toggle('xnvc-onme', !!(s && s.on_me));
	}
	function paintAll() { paintWindow(); paintPage(); paintProfile(); }

	var pending = false;
	function schedule() {
		if (pending) { return; }
		pending = true;
		(window.requestAnimationFrame || setTimeout)(function () { pending = false; paintAll(); });
	}
	// ---------------------------------------------------------------- friend requests inside the chat window
	// the window shows the same conversation block as the messages page; its accept / decline form is a stock ajax
	// form that only the page script binds, so the window posts it itself and redraws the conversation afterwards
	function chatUrl(to) { return '/my/messages/' + to + '/'; }
	function redrawWindow(to) {
		var w = q('.xnhb-chat');
		var body = w ? q('.xnhb-cb', w) : null;
		if (!body) { return Promise.resolve(); }
		return fetch(chatUrl(to) + '?mode=async&function=get_block&block_id=list_messages_my_conversation_messages&conversation_user_id=' + to + '&ipp=' + (window.xnhbChatIpp || 10), { credentials: 'same-origin', headers: { 'X-Requested-With': 'XMLHttpRequest' } })
			.then(function (r) { return r.text(); })
			.then(function (html) {
				var doc = new DOMParser().parseFromString(html, 'text/html');
				var box = doc.querySelector('.xnmsg-box');
				var cur = q('.xnmsg-box', body);
				if (box && cur && cur.parentNode) { cur.parentNode.replaceChild(d.importNode(box, true), cur); body.scrollTop = body.scrollHeight; }
			});
	}
	function inviteForm(node) { return node && node.closest ? node.closest('.xnhb-chat .xnhb-cb form.xnmsg-invite') : null; }
	d.addEventListener('click', function (e) {
		var f = inviteForm(e.target);
		if (f && e.target.type === 'submit' && e.target.name) { f.setAttribute('data-xnvc-btn', e.target.name); }
	}, true);
	d.addEventListener('submit', function (e) {
		var form = inviteForm(e.target);
		if (!form) { return; }
		e.preventDefault();
		if (form.getAttribute('data-xnvc-busy')) { return; }
		var btn = (e.submitter && e.submitter.name) || form.getAttribute('data-xnvc-btn') || 'confirm';
		var fromEl = q('input[name="message_from_user_id"]', form);
		var from = fromEl ? parseInt(fromEl.value, 10) || 0 : 0;
		if (!from) { return; }
		var fd = new FormData(form);
		fd.set(btn === 'reject' ? 'reject' : 'confirm', '1');
		fd.set('mode', 'async');
		fd.set('format', 'json');
		form.setAttribute('data-xnvc-busy', '1');
		form.classList.add('xnvc-busy');
		fetch(chatUrl(from), { method: 'POST', credentials: 'same-origin', headers: { 'X-Requested-With': 'XMLHttpRequest' }, body: fd })
			.then(function (r) { return r.text(); })
			.then(function (t) {
				var j = null;
				try { j = JSON.parse(t); } catch (x) { j = null; }
				if (!j || j.status !== 'success') { throw new Error('refused'); }
				return redrawWindow(from).then(function () {
					state(from, true).then(paintAll).catch(function () {});
					d.dispatchEvent(new CustomEvent('xnrt:refreshed'));
				});
			})
			.catch(function () {
				form.removeAttribute('data-xnvc-busy');
				form.classList.remove('xnvc-busy');
			});
	}, true);

	function init() {
		if (!me()) { return; }
		paintAll();
		if (window.MutationObserver) {
			new MutationObserver(function (muts) {
				for (var i = 0; i < muts.length; i++) {
					var m = muts[i];
					if (!m.addedNodes.length) { continue; }
					// our own menus / bars / buttons never trigger another paint (else paint -> mutation -> paint, forever)
					if (m.target && m.target.closest && m.target.closest('.xnvc-bar, .xnvc-menu')) { continue; }
					var own = true;
					for (var j = 0; j < m.addedNodes.length; j++) {
						var n = m.addedNodes[j];
						if (!(n.nodeType === 1 && n.className && /(^|\s)xnvc-/.test(n.className))) { own = false; break; }
					}
					if (own) { continue; }
					schedule();
					return;
				}
			}).observe(d.body, { childList: true, subtree: true });
		}
	}
	if (d.readyState === 'loading') { d.addEventListener('DOMContentLoaded', init); } else { init(); }
	window.xnvc = { state: state, states: states, refresh: paintAll, lang: lang };
})();
