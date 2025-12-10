import { prisma } from "../../utils/prisma.js";
import { getUserByWhatsapp } from "../../utils/user.js";

export default {
    name: "edit-cat",
    matches: (text) => text.startsWith("$edit-cat"),
    execute: async (sock, message, text) => {
        const from = message.key.remoteJid;
        const whatsappNumber = from.replace("@s.whatsapp.net", "");

        try {
            const user = await getUserByWhatsapp(whatsappNumber);
            if (!user) {
                return sock.sendMessage(from, { text: "⚠️ Kamu belum terdaftar. Ketik $register <nama> dulu ya!" });
            }

            const rawInput = text.replace("$edit-cat", "").trim();
            // Expect format: old name -> new name
            const parts = rawInput.split("->");

            if (parts.length !== 2) {
                return sock.sendMessage(from, { text: "⚠️ Format salah. Contoh: $edit-cat Makanan -> Kebutuhan Pokok" });
            }

            const oldName = parts[0].trim();
            const newName = parts[1].trim();

            if (!oldName || !newName) return;

            // Check if old exists
            const oldCat = await prisma.category.findUnique({
                where: { name_userId: { name: oldName, userId: user.id } }
            });

            if (!oldCat) {
                return sock.sendMessage(from, { text: `⚠️ Kategori '${oldName}' tidak ditemukan.` });
            }

            // Check if new name is taken
            const newCatExists = await prisma.category.findUnique({
                where: { name_userId: { name: newName, userId: user.id } }
            });

            if (newCatExists) {
                return sock.sendMessage(from, { text: `⚠️ Kategori '${newName}' sudah ada.` });
            }

            await prisma.category.update({
                where: { id: oldCat.id },
                data: { name: newName }
            });

            await sock.sendMessage(from, {
                text: `✏️ *KATEGORI DIUPDATE* ✏️\n\n'${oldName}' ➡️ '${newName}'\n\n_List update: $list-cat_`
            });

        } catch (error) {
            console.error("Edit Cat Error:", error);
            await sock.sendMessage(from, { text: "❌ Terjadi kesalahan saat mengedit kategori." });
        }
    },
};
