module.exports = {
 name: "upper", description: "Đổi văn bản thành chữ hoa", role: "all",
 async execute(api, message, args, config) {
   const text = args.join(" ");
   await api.sendMessage(text ? text.toLocaleUpperCase("vi-VN") : "Dùng: !dbupper nội dung", message.threadId, message.type);
 }
};