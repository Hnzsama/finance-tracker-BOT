import { prisma } from "../../utils/prisma.js";
import { getUserByWhatsapp, getSender } from "../../utils/user.js";

export default {
    name: "edit-cat",
    matches: (text) => text.startsWith("$edit-cat"),
    execute: async (sock, message, text) => {
        const chatId = message.key.remoteJid;
        const sender = getSender(message);
        const whatsappNumber = sender.replace("@s.whatsapp.net", "");

        try {
            const user = await getUserByWhatsapp(whatsappNumber);
            if (!user) {
                return sock.sendMessage(chatId, { text: "⚠️ Kamu belum terdaftar. Ketik $register <nama> dulu ya!" });
            }

            const rawInput = text.replace("$edit-cat", "").trim();
            // Expect format: old name -> new name
            const parts = rawInput.split("->");

            if (parts.length !== 2) {
                return sock.sendMessage(chatId, { text: "⚠️ Format: $edit-cat <lama> -> <baru>" });
            }

            const oldName = parts[0].trim();
            const newName = parts[1].trim();

            if (!oldName || !newName) return;

            // Check if old exists
            const oldCat = await prisma.category.findUnique({
                where: { name_userId: { name: oldName, userId: user.id } }
            });

            if (!oldCat) {
                return sock.sendMessage(chatId, { text: `⚠️ Kategori '${oldName}' tidak ditemukan.` });
            }

            // Check if new name is taken
            const newCatExists = await prisma.category.findUnique({
                where: { name_userId: { name: newName, userId: user.id } }
            });

            if (newCatExists) {
                return sock.sendMessage(chatId, { text: `⚠️ Kategori '${newName}' sudah ada.` });
            }

            await prisma.category.update({
                where: { id: oldCat.id },
                data: { name: newName }
            });

            await sock.sendMessage(chatId, { text: `✅ Kategori diubah: ${oldName} -> ${newName}` });

        } catch (error) {
            console.error("Edit Cat Error:", error);
            await sock.sendMessage(chatId, { text: "❌ Gagal mengubah kategori." });
        }
    },
};
