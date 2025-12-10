import { prisma } from "../../utils/prisma.js";
import { getUserByWhatsapp } from "../../utils/user.js";

export default {
    name: "edit-name",
    matches: (text) => text.startsWith("$edit-name"),
    execute: async (sock, message, text) => {
        const from = message.key.remoteJid;
        const whatsappNumber = from.replace("@s.whatsapp.net", "");

        try {
            const user = await getUserByWhatsapp(whatsappNumber);
            if (!user) {
                return sock.sendMessage(from, { text: "⚠️ Kamu belum terdaftar. Ketik $register <nama> dulu ya!" });
            }

            const newName = text.replace("$edit-name", "").trim();
            if (!newName) {
                return sock.sendMessage(from, { text: "⚠️ Format salah. Contoh: $edit-name Sultan Andara" });
            }

            const updatedUser = await prisma.user.update({
                where: { id: user.id },
                data: { name: newName }
            });

            await sock.sendMessage(from, {
                text: `╭── [ *UPDATE PROFIL* ]
│
├ ✏️ *Nama Berubah!*
├ Dari: ${user.name}
├ Jadi: *${updatedUser.name}*
│
╰ _Data berhasil disimpan._`
            });

        } catch (error) {
            console.error("Edit Name Error:", error);
            await sock.sendMessage(from, { text: "❌ Terjadi kesalahan saat mengupdate nama." });
        }
    },
};
