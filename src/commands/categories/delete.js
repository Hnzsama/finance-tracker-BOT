import { prisma } from "../../utils/prisma.js";
import { getUserByWhatsapp } from "../../utils/user.js";

export default {
    name: "del-cat",
    matches: (text) => text.startsWith("$del-cat"),
    execute: async (sock, message, text) => {
        const from = message.key.remoteJid;
        const whatsappNumber = from.replace("@s.whatsapp.net", "");

        try {
            const user = await getUserByWhatsapp(whatsappNumber);
            if (!user) {
                return sock.sendMessage(from, { text: "⚠️ Kamu belum terdaftar. Ketik $register <nama> dulu ya!" });
            }

            const rawInput = text.replace("$del-cat", "").trim();
            if (!rawInput) {
                return sock.sendMessage(from, { text: "⚠️ Format salah. Contoh: $del-cat Makanan, Gaji" });
            }

            const catNames = rawInput.split(",").map(c => c.trim()).filter(c => c.length > 0);

            if (catNames.length === 0) return;

            const result = await prisma.category.deleteMany({
                where: {
                    userId: user.id,
                    name: { in: catNames } // Delete all matching names for this user
                }
            });

            if (result.count > 0) {
                await sock.sendMessage(from, {
                    text: `╭── [ *HAPUS KATEGORI* ]
│
├ 🗑️ *Dihapus:* ${result.count} item
├ 📋 *List:* ${catNames.join(", ")}
│
╰ _Cek list: $list-cat_`
                });
            } else {
                await sock.sendMessage(from, { text: "⚠️ Tidak ada kategori yang ditemukan untuk dihapus." });
            }

        } catch (error) {
            console.error("Del Cat Error:", error);
            // Prisma error P2003 = Foreign key constraint failed (if used in transactions)
            if (error.code === 'P2003') {
                await sock.sendMessage(from, { text: "⚠️ Gagal menghapus: Kategori ini sedang digunakan dalam transaksi." });
            } else {
                await sock.sendMessage(from, { text: "❌ Terjadi kesalahan saat menghapus kategori." });
            }
        }
    },
};
