module.exports = {
 name: "roll", description: "Random số từ 1 đến N", role: "all",
 async execute(api, message, args, config) {
   const n = Number(args[0]);
   if (!Number.isSafeInteger(n) || n < 1 || n > 1000000000) {
     return api.sendMessage("Dùng: !dbroll 100 (chọn số từ 1 đến 100)", message.threadId, message.type);
   }
   await api.sendMessage(`🎲 Kết quả: ${Math.floor(Math.random()*n)+1} / ${n}`, message.threadId, message.type);
 }
};