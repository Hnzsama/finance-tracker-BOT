import { prisma } from "../../utils/prisma.js";
import { getUserByWhatsapp } from "../../utils/user.js";

export default {
    name: "add-cat",
    matches: (text) => text.startsWith("$add-cat"),
    execute: async (sock, message, text) => {
        const from = message.key.remoteJid;
        const whatsappNumber = from.replace("@s.whatsapp.net", "");

        try {
            const user = await getUserByWhatsapp(whatsappNumber);
            if (!user) {
                return sock.sendMessage(from, { text: "⚠️ Kamu belum terdaftar. Ketik $register <nama> dulu ya!" });
            }

            const rawInput = text.replace("$add-cat", "").trim();
            if (!rawInput) {
                return sock.sendMessage(from, { text: "⚠️ Format salah. Contoh: $add-cat Makanan, Gaji, Transport" });
            }

            // Split by comma and clean up
            const catNames = rawInput.split(",").map(c => c.trim()).filter(c => c.length > 0);

            if (catNames.length === 0) {
                return sock.sendMessage(from, { text: "⚠️ Tidak ada nama kategori yang valid." });
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

            let response = `✅ *BERHASIL MENAMBAH KATEGORI!* \n\n`;
            response += `➕ Ditambahkan: ${addedCount}\n`;
            if (skipped.length > 0) {
                response += `⚠️ Terlewati (sudah ada): ${skipped.join(", ")}\n`;
            }
            response += `\n_Cek daftar kategori dengan $list-cat_`;

            await sock.sendMessage(from, { text: response });

        } catch (error) {
            console.error("Add Cat Error:", error);
            await sock.sendMessage(from, { text: "❌ Terjadi kesalahan saat menambah kategori." });
        }
    },
};
