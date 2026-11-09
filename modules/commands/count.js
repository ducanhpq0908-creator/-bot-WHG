module.exports = {
 name: "count", description: "Đếm ký tự và từ", role: "all",
 async execute(api, message, args, config) {
   const text = args.join(" ");
   const words = text.trim() ? text.trim().split(/\s+/u).length : 0;
   await api.sendMessage(`📝 Ký tự: ${Array.from(text).length}\nTừ: ${words}\nDòng: ${text ? text.split(/\r?\n/).length : 0}`, message.threadId, message.type);
 }
};