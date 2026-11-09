module.exports = {
 name: "reverse", description: "Đảo ngược văn bản", role: "all",
 async execute(api, message, args, config) {
   const text = args.join(" ");
   await api.sendMessage(text ? Array.from(text).reverse().join("") : "Dùng: !dbreverse nội dung", message.threadId, message.type);
 }
};