module.exports = {
    name: "fun", description: "Game (dice, coin, rps)", role: "user",
    execute: async (api, message, args, config) => {
        const action = args[0] ? args[0].toLowerCase() : "";
        if (action === "dice") {
            api.sendMessage(`🎲 Bạn tung được: ${Math.floor(Math.random() * 6) + 1}`, message.threadId, message.type);
        } else if (action === "coin") {
            api.sendMessage(`🪙 Kết quả: ${Math.random() > 0.5 ? "Ngửa" : "Sấp"}`, message.threadId, message.type);
        } else if (action === "rps") {
            const res = ["Búa", "Bao", "Kéo"][Math.floor(Math.random() * 3)];
            api.sendMessage(`✊ Bot ra: ${res}`, message.threadId, message.type);
        } else {
            api.sendMessage(`📌 Cú pháp:\n${config.prefix}fun dice\n${config.prefix}fun coin\n${config.prefix}fun rps`, message.threadId, message.type);
        }
    }
};
