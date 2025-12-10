import { prisma } from "../../utils/prisma.js";
import { getUserByWhatsapp, getSender } from "../../utils/user.js";

export default {
    name: "add-cat",
    matches: (text) => text.startsWith("$add-cat"),
    execute: async (sock, message, text) => {
        const chatId = message.key.remoteJid;
        const sender = getSender(message);
        const whatsappNumber = sender.replace("@s.whatsapp.net", "");

        try {
            const user = await getUserByWhatsapp(whatsappNumber);
            if (!user) {
                return sock.sendMessage(chatId, { text: "⚠️ Kamu belum terdaftar. Ketik $register <nama> dulu ya!" });
            }

            const rawInput = text.replace("$add-cat", "").trim();
            if (!rawInput) {
                return sock.sendMessage(chatId, { text: "⚠️ Format salah. Contoh: $add-cat Makanan, Gaji, Transport" });
            }

            // Split by comma and clean up
            const catNames = rawInput.split(",").map(c => c.trim()).filter(c => c.length > 0);

            if (catNames.length === 0) {
                return sock.sendMessage(chatId, { text: "⚠️ Tidak ada nama kategori yang valid." });
            }

            let addedCount = 0;
            let skipped = [];

            for (const name of catNames) {
                // Check duplicate
                const exists = await prisma.category.findUnique({
                    where: {
                        name_userId: {
                            name: name,
                            userId: user.id
                        }
                    }
                });

                if (!exists) {
                    await prisma.category.create({
                        data: { name, userId: user.id }
                    });
                    addedCount++;
                } else {
                    skipped.push(name);
                }
            }

            let response = `╭── [ *TAMBAH KATEGORI* ]
│
├ ✅ *Sukses:* ${addedCount} ditambahkan
`;
            if (skipped.length > 0) {
                response += `├ ⚠️ *Skip:* ${skipped.join(", ")}\n`;
            }
            response += `│
╰ _Cek list: $list-cat_`;

            await sock.sendMessage(chatId, { text: response });

        } catch (error) {
            console.error("Add Cat Error:", error);
            await sock.sendMessage(chatId, { text: "❌ Terjadi kesalahan saat menambah kategori." });
        }
    },
};
