const fs = require('fs');
const path = require('path');

const BASE_DIR = __dirname;
const DATA_DIR = path.join(BASE_DIR, "data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const ENABLED_FILE = path.join(DATA_DIR, "autoduyet_groups.json");
let _CLIENT = null;
let _cooldownGroups = new Set();

function loadEnabled() {
    try {
        if (!fs.existsSync(ENABLED_FILE)) return new Set();
        const data = JSON.parse(fs.readFileSync(ENABLED_FILE, 'utf-8'));
        if (Array.isArray(data)) return new Set(data.map(String));
        return new Set(Object.keys(data).filter(k => data[k]).map(String));
    } catch (e) { return new Set(); }
}

function saveEnabled(groups) {
    try {
        fs.writeFileSync(ENABLED_FILE, JSON.stringify(Array.from(groups).sort(), null, 2), 'utf-8');
    } catch (e) {}
}

function isEnabled(groupId = null) {
    const groups = loadEnabled();
    if (groupId === null) return groups.size > 0;
    return groups.has(String(groupId));
}

function enable(groupId) {
    const groups = loadEnabled();
    groups.add(String(groupId));
    saveEnabled(groups);
}

function disable(groupId) {
    const groups = loadEnabled();
    groups.delete(String(groupId));
    saveEnabled(groups);
}

function setClient(client) { _CLIENT = client; }

async function reply(text, messageObject, threadId, threadType, client = null) {
    client = client || _CLIENT;
    if (!client) return false;
    try {
        const msg = { msg: text };
        if (typeof client.replyMessage === 'function' && messageObject) {
            await client.replyMessage(msg, messageObject, threadId, threadType);
        } else if (typeof client.sendMessage === 'function') {
            await client.sendMessage(msg, threadId, threadType);
        }
        return true;
    } catch (e) { return false; }
}

async function handleAutoduyetCommand(messageText, messageObject, threadId, threadType, authorId) {
    const groupId = String(threadId);
    const parts = String(messageText || "").trim().split(/\s+/);
    const action = parts.length >= 2 ? parts[1].toLowerCase() : "";

    if (["on", "bat"].includes(action)) {
        enable(groupId);
        return await reply("🟢 AUTO DUYỆT ĐÃ BẬT\nNhóm này sẽ tự động duyệt thành viên.", messageObject, threadId, threadType);
    }
    if (["off", "tat"].includes(action)) {
        disable(groupId);
        return await reply("🔴 AUTO DUYỆT ĐÃ TẮT", messageObject, threadId, threadType);
    }
    return await reply("🤖 AUTO DUYỆT\n🟢 !autoduyet on\n🔴 !autoduyet off", messageObject, threadId, threadType);
}

async function scanAndApprove(client, groupId) {
    if (!isEnabled(groupId)) return 0;
    groupId = String(groupId);
    if (_cooldownGroups.has(groupId)) return 0;

    try {
        if (typeof client.getPendingGroupMembers !== 'function') return 0;
        const pendingData = await client.getPendingGroupMembers(groupId);
        
        let uids = [];
        if (pendingData && pendingData.users && Array.isArray(pendingData.users)) {
            uids = pendingData.users.map(u => u.uid).filter(Boolean);
        } else if (pendingData && pendingData.members && Array.isArray(pendingData.members)) {
            uids = pendingData.members.map(u => u.uid || u.userId).filter(Boolean);
        }

        if (uids.length === 0) return 0;
        uids = [...new Set(uids.map(String))];
        
        console.log(`[AUTODUYET] 📥 Group ${groupId} | Có ${uids.length} người chờ.`);
        _cooldownGroups.add(groupId);
        setTimeout(() => _cooldownGroups.delete(groupId), 2000);

        for (const uid of uids) {
            try {
                await client.reviewPendingMemberRequest(groupId, [uid], 1);
                console.log(`[AUTODUYET] ✅ Đã duyệt UID: ${uid}`);
            } catch (err) {
                console.log(`[AUTODUYET] ❌ Lỗi duyệt: ${err.message}`);
            }
        }
        return uids.length;
    } catch (e) {
        _cooldownGroups.add(groupId);
        setTimeout(() => _cooldownGroups.delete(groupId), 5000);
        return 0;
    }
}

async function runOnce(client = null) {
    const c = client || _CLIENT;
    if (!c) return 0;
    let total = 0;
    for (const groupId of Array.from(loadEnabled())) {
        total += await scanAndApprove(c, groupId);
    }
    return total;
}

module.exports = {
    setClient, handleAutoduyetCommand, runOnce, isEnabled, enable, disable
};
