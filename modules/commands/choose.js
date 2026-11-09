module.exports = {
 name: "choose", description: "Chọn ngẫu nhiên một lựa chọn", role: "all",
 async execute(api, message, args, config) {
   const choices = args.join(" ").split("|").map(x => x.trim()).filter(Boolean);
   if (choices.length < 2) return api.sendMessage("Dùng: !dbchoose trà sữa | cà phê | nước ép", message.threadId, message.type);
   await api.sendMessage("🎯 DUCANH chọn: " + choices[Math.floor(Math.random()*choices.length)], message.threadId, message.type);
 }
};