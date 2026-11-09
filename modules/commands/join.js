module.exports = {
    name: 'join',
    adminOnly: true,
    execute: async function(api, message, args) {
        const threadId = message.threadId || message.data?.idTo;
        let link = args[0] ? args[0].trim() : "";
        
        if (!link) {
            return api.sendMessage("⚠️ Cú pháp: !join <link_nhóm>\nVí dụ: !join https://zalo.me/g/xxxxxx", threadId, message.type);
        }

        // Làm sạch link (Xóa khoảng trắng, thêm https nếu thiếu)
        if (!link.startsWith('http')) {
            link = 'https://' + link;
        }

        try {
            await api.sendMessage("⏳ Đang gửi yêu cầu tham gia nhóm...", threadId, message.type);

            // Gọi hàm joinGroupLink với tham số là toàn bộ link
            if (typeof api.joinGroupLink === 'function') {
                await api.joinGroupLink(link);
            } else {
                throw new Error("Thư viện zca-js không có hàm joinGroupLink.");
            }

            return api.sendMessage(`✅ Đã gửi yêu cầu tham gia nhóm thành công!\n(Hãy mở Zalo kiểm tra xem bot đã vào nhóm chưa)`, threadId, message.type);
            
        } catch (error) {
            // Bắt lỗi chi tiết từ Zalo
            let errorMsg = error.message;
            if (errorMsg.includes("240")) {
                errorMsg = "Nhóm này đang bật chế độ duyệt thành viên. Yêu cầu đã được gửi và đang chờ duyệt.";
            } else if (errorMsg.includes("178")) {
                errorMsg = "Bot đã ở trong nhóm này rồi.";
            } else if (errorMsg.includes("Invalid group link")) {
                errorMsg = "Link không hợp lệ. Vui lòng kiểm tra lại link (phải có dạng https://zalo.me/g/...)";
            }
            
            return api.sendMessage(`❌ Thất bại!\nChi tiết: ${errorMsg}`, threadId, message.type);
        }
    }
};
