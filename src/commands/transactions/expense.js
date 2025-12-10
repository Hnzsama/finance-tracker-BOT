import { prisma } from "../../utils/prisma.js";
import { getUserByWhatsapp, getSender } from "../../utils/user.js";

function parseMoney(str) {
    const clean = str.replace(/[^0-9]/g, "");
    return parseFloat(clean) || 0;
}

export default {
    name: "exp",
    matches: (text) => text.startsWith("$exp"),
    execute: async (sock, message, text) => {
        const chatId = message.key.remoteJid;
        const sender = getSender(message);
        const whatsappNumber = sender.replace("@s.whatsapp.net", "");

        try {
            const user = await getUserByWhatsapp(whatsappNumber);
            if (!user) {
                return sock.sendMessage(chatId, { text: "⚠️ Kamu belum terdaftar. Ketik $register <nama> dulu ya!" });
            }

            // Example: $keluar 20000 Makan Nasi Goreng
            const args = text.replace("$exp", "").trim().split(" ");

            if (args.length < 2) {
                return sock.sendMessage(chatId, { text: "⚠️ Format salah. Contoh: $exp 20000 Makan Nasi Padang" });
            }

            const amountStr = args[0];
            const categoryName = args[1];
            const description = args.slice(2).join(" ") || "Tanpa keterangan";
            const amount = parseMoney(amountStr);

            if (amount <= 0) {
                return sock.sendMessage(chatId, { text: "⚠️ Nominal tidak valid." });
            }

            const category = await prisma.category.findUnique({
                where: { name_userId: { name: categoryName, userId: user.id } }
            });

            if (!category) {
                return sock.sendMessage(chatId, { text: `⚠️ Kategori '${categoryName}' tidak ditemukan. Cek $list-cat` });
            }

            await prisma.transaction.create({
                data: {
                    amount,
                    type: "EXPENSE",
                    description,
                    categoryId: category.id,
                    userId: user.id
                }
            });

            const formattedAmount = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amount);

            await sock.sendMessage(chatId, {
                text: `╭── [ *PENGELUARAN (EXP) TERCATAT* ]
│
├ 💸 *Nominal:* ${formattedAmount}
├ 📂 *Kategori:* ${categoryName}
├ 📝 *Ket:* ${description}
│
╰ _Cek history: $list-trx_`
            });

        } catch (error) {
            console.error("Expense Error:", error);
            await sock.sendMessage(chatId, { text: "❌ Terjadi kesalahan saat mencatat pengeluaran." });
        }
    },
};
