module.exports = {
    name: "changereaction",
    description: "Đổi số lượng và icon cảm xúc",
    role: "admin",
    execute: async (api, message, args, config) => {
        if (!config.admin_uids.includes(message.data.uidFrom)) return;

        if (args.length < 2) {
            return api.sendMessage({ msg: `🔧 Đổi icon & số lượng reaction\n-changereaction <số lượng 1-3> <ICON1,ICON2,...>\nVí dụ: -changereaction 3 LIKE,HEART,HAHA`, quote: message.data }, message.threadId, message.type);
        }

        const count = parseInt(args[0]);
        if (isNaN(count) || count < 1 || count > 3) {
            return api.sendMessage({ msg: "⚠️ Zalo chỉ cho phép thả tối đa 3 icon. Vui lòng chọn từ 1 đến 3.", quote: message.data }, message.threadId, message.type);
        }

        const iconStr = args.slice(1).join(" ");
        const icons = iconStr.split(",").map(i => i.trim()).filter(i => i.length > 0);
        
        const iconMap = {
            "LIKE": "👍", "HEART": "❤️", "HAHA": "😂", "WOW": "😮", "SAD": "😢", "ANGRY": "😡", 
            "👍": "👍", "❤️": "❤️", "😂": "😂", "😮": "😮", "😢": "😢", "😡": "😡"
        };
        
        const finalIcons = icons.map(i => iconMap[i.toUpperCase()] || i);

        let reactCfg = config.loadReact();
        reactCfg.count = count;
        reactCfg.icons = finalIcons;
        config.saveReact(reactCfg);

        return api.sendMessage({ msg: `✅ Cập nhật thành công:\n- Số lượng: ${count}\n- Icon: ${finalIcons.join(", ")}`, quote: message.data }, message.threadId, message.type);
    }
};
