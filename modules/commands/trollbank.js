module.exports = {
    name: "trollbank",
    description: "Gửi thẻ ngân hàng giả troll người bị tag (Bắn liên thanh, không delay)",
    level: 2, // Chỉ Admin
    execute: async (api, message, args, config) => {
        const threadId = message.threadId;
        const sendMsg = (msgObj) => api.sendMessage(msgObj, threadId, message.type);
        const mentions = message.data.mentions || [];

        if (mentions.length === 0) {
            return await sendMsg({ msg: `⚠️ Vui lòng tag (@) người mày muốn troll!\nVí dụ: ${config.prefix}trollbank @Binn` });
        }

        try {
            // Hàm tạo số tài khoản ngẫu nhiên
            const randomAccountNumber = () => {
                const length = Math.floor(Math.random() * (15 - 9 + 1)) + 9;
                let result = "";
                for (let i = 0; i < length; i++) {
                    result += Math.floor(Math.random() * 10);
                }
                return result;
            };

            // DANH SÁCH NGÂN HÀNG THẬT TẠI VIỆT NAM
            const banks = [
                { bin: "970416", name: "ACB" }, { bin: "970422", name: "MB Bank" }, { bin: "970454", name: "BVBank" },
                { bin: "970436", name: "Vietcombank" }, { bin: "970415", name: "VietinBank" }, { bin: "970418", name: "BIDV" },
                { bin: "970407", name: "Techcombank" }, { bin: "970432", name: "VPBank" }, { bin: "970443", name: "SHB" },
                { bin: "970441", name: "VIB" }, { bin: "970426", name: "MSB" }, { bin: "970405", name: "Agribank" },
                { bin: "970448", name: "OCB" }, { bin: "970403", name: "Sacombank" }, { bin: "970437", name: "HDBank" },
                { bin: "970429", name: "SCB" }, { bin: "970431", name: "Eximbank" }, { bin: "970414", name: "OceanBank" },
                { bin: "970423", name: "TPBank" }, { bin: "970428", name: "Nam A Bank" }, { bin: "970425", name: "ABBANK" },
                { bin: "970427", name: "VietABank" }, { bin: "970430", name: "PGBank" }, { bin: "970433", name: "VietBank" },
                { bin: "970438", name: "BaoVietBank" }, { bin: "970440", name: "SeABank" }, { bin: "970442", name: "HDBank" },
                { bin: "970449", name: "LPBank" }, { bin: "970452", name: "KienLongBank" }, { bin: "970455", name: "Vietnam Bank" },
                { bin: "970457", name: "Woori Bank" }, { bin: "970458", name: "UOB" }, { bin: "970400", name: "SaigonBank" },
                { bin: "970410", name: "Standard Chartered" }, { bin: "970412", name: "CIMB Bank" }, { bin: "970419", name: "NCB" },
                { bin: "970421", name: "VRB" }, { bin: "970439", name: "Public Bank" }, { bin: "970446", name: "CoopBank" },
                { bin: "970401", name: "GPBank" }, { bin: "970402", name: "Hong Leong" }, { bin: "970404", name: "Shinhan Bank" },
                { bin: "970406", name: "CBBank" }, { bin: "970408", name: "HSBC" }, { bin: "970409", name: "BacABank" },
                { bin: "970411", name: "Cake" }, { bin: "970413", name: "Timo" }, { bin: "970417", name: "TNEX" },
                { bin: "970420", name: "ViettelMoney" }, { bin: "970424", name: "Vikki" }, { bin: "970434", name: "Indovina" },
                { bin: "970435", name: "Mirae Asset" }
            ];

            // Số lần gửi từ 90 đến 100
            const trollCount = Math.floor(Math.random() * (100 - 90 + 1)) + 90;
            console.log(`[TROLLBANK] Bắt đầu bắn liên thanh ${trollCount} thẻ...`);

            const userNames = {};
            for (const mention of mentions) {
                try {
                    const userInfo = await api.getUserInfo(mention.uid);
                    let name = "NO TIEN";
                    if (userInfo && userInfo[mention.uid] && userInfo[mention.uid].displayName) {
                        name = userInfo[mention.uid].displayName;
                    } else if (userInfo && userInfo.changed_profiles && userInfo.changed_profiles[mention.uid]) {
                        name = userInfo.changed_profiles[mention.uid].displayName;
                    } else if (userInfo && userInfo.name) {
                        name = userInfo.name;
                    }
                    userNames[mention.uid] = name.toUpperCase();
                } catch (e) {
                    userNames[mention.uid] = "NO TIEN";
                }
            }

            // Tạo mảng Promise để gửi song song cùng lúc (Không delay)
            const sendPromises = [];
            for (let i = 0; i < trollCount; i++) {
                const randomMention = mentions[Math.floor(Math.random() * mentions.length)];
                const targetUid = randomMention.uid;
                const targetName = userNames[targetUid];

                const randomBank = banks[Math.floor(Math.random() * banks.length)];
                
                const bankCardData = {
                    binBank: randomBank.bin,
                    numAccBank: randomAccountNumber(),
                    nameAccBank: targetName
                };

                // Push vào mảng để chạy đồng thời, catch lỗi để không bị crash
                sendPromises.push(api.sendBankCard(bankCardData, threadId, message.type).catch(e => console.error(e.message)));
            }

            // Kích hoạt bắn tất cả cùng 1 lúc
            await Promise.all(sendPromises);

        } catch (error) {
            console.error("[TROLLBANK] Lỗi:", error.message);
        }
    }
};
