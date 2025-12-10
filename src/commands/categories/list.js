import { prisma } from "../../utils/prisma.js";
import { getUserByWhatsapp, getSender } from "../../utils/user.js";

export default {
    name: "list-cat",
    matches: (text) => text.startsWith("$list-cat"),
    execute: async (sock, message) => {
        const chatId = message.key.remoteJid;
        const sender = getSender(message);
        const whatsappNumber = sender.replace("@s.whatsapp.net", "");

        try {
            const user = await getUserByWhatsapp(whatsappNumber);
            console.log(`[DEBUG] List-Cat User:`, user);

            if (!user) {
                return sock.sendMessage(chatId, { text: "⚠️ Kamu belum terdaftar. Ketik $register <nama> dulu ya!" });
            }

            console.log(`[DEBUG] Fetching categories for UserID: ${user.id}`);
            const categories = await prisma.category.findMany({
                where: { userId: user.id },
                orderBy: { name: "asc" },
            });
            console.log(`[DEBUG] Categories found: ${categories.length}`);

            if (categories.length === 0) {
                return sock.sendMessage(chatId, { text: "⚠️ Kamu belum punya kategori khusus. Gunakan $add-cat <nama>" });
            }

            let response = `╭── [ *DAFTAR KATEGORI* ]
│
`;
            categories.forEach((cat, index) => {
                response += `├ ${index + 1}. ${cat.name}\n`;
            });
            response += `│
╰ _Total: ${categories.length} Kategori_`;

            await sock.sendMessage(chatId, { text: response });

        } catch (error) {
            console.error("List Cat Error:", error);
            await sock.sendMessage(chatId, { text: "❌ Gagal mengambil daftar kategori." });
        }
    },
};
