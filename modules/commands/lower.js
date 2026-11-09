module.exports = {
 name: "lower", description: "Đổi văn bản thành chữ thường", role: "all",
 async execute(api, message, args, config) {
   const text = args.join(" ");
   await api.sendMessage(text ? text.toLocaleLowerCase("vi-VN") : "Dùng: !dblower nội dung", message.threadId, message.type);
 }
};