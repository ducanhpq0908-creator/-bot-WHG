const axios = require('axios');
module.exports = {
    name: "dich",
    description: "Dịch văn bản sang tiếng Việt",
    role: "user",
    execute: async (api, message, args, config) => {
        const textToTranslate = args.join(" ");
        if (!textToTranslate) return api.sendMessage("Cú pháp: !dich <văn bản>", message.threadId, message.type);

        try {
            const res = await axios.get(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=vi&dt=t&q=${encodeURIComponent(textToTranslate)}`);
            const translatedText = res.data[0].map(item => item[0]).join("");
            api.sendMessage(`🌐 **Bản dịch:**\n${translatedText}`, message.threadId, message.type);
        } catch (e) {
            api.sendMessage(`❌ Lỗi dịch thuật: ${e.message}`, message.threadId, message.type);
        }
    }
};
