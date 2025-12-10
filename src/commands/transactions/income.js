import { prisma } from "../../utils/prisma.js";
import { getUserByWhatsapp, getSender } from "../../utils/user.js";

function parseMoney(str) {
    // Remove Rp, dots, commas, spaces
    const clean = str.replace(/[^0-9]/g, "");
    return parseFloat(clean) || 0;
}

export default {
    name: "inc",
    matches: (text) => text.startsWith("$inc"),
    execute: async (sock, message, text) => {
        const chatId = message.key.remoteJid;
        const sender = getSender(message);
        const whatsappNumber = sender.replace("@s.whatsapp.net", "");

        try {
            const user = await getUserByWhatsapp(whatsappNumber);
            if (!user) {
                return sock.sendMessage(chatId, { text: "⚠️ Kamu belum terdaftar. Ketik $register <nama> dulu ya!" });
            }

            // Expected format: $inc <amount> <category> <desc>
            // Example: $inc 100000 Gaji Bulan ini
            const args = text.replace("$inc", "").trim().split(" ");

            if (args.length < 2) {
                return sock.sendMessage(chatId, { text: "⚠️ Format salah. Contoh: $inc 5000000 Gaji Bonus Tahunan" });
            }

            const amountStr = args[0];
            const categoryName = args[1];
            const description = args.slice(2).join(" ") || "Tanpa keterangan";
            const amount = parseMoney(amountStr);

            if (amount <= 0) {
                return sock.sendMessage(chatId, { text: "⚠️ Nominal tidak valid." });
            }

            // Find category (Exact match preferred, or handle if not exists? User should use existing)
            // For manual, we act strict: Category MUST exist.
            const category = await prisma.category.findUnique({
                where: { name_userId: { name: categoryName, userId: user.id } }
            });

            if (!category) {
                return sock.sendMessage(chatId, { text: `⚠️ Kategori '${categoryName}' tidak ditemukan. Cek $list-cat` });
            }

            const trx = await prisma.transaction.create({
                data: {
                    amount,
                    type: "INCOME",
                    description,
                    categoryId: category.id,
                    userId: user.id
                }
            });

            const formattedAmount = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amount);

            await sock.sendMessage(chatId, {
                text: `╭── [ *PEMASUKAN (INC) TERCATAT* ]
│
├ 💰 *Nominal:* ${formattedAmount}
├ 📂 *Kategori:* ${categoryName}
├ 📝 *Ket:* ${description}
│
╰ _Cek history: $list-trx_`
            });

        } catch (error) {
            console.error("Income Error:", error);
            await sock.sendMessage(chatId, { text: "❌ Terjadi kesalahan saat mencatat pemasukan." });
        }
    },
};
