import { prisma } from "../../utils/prisma.js";
import { getUserByWhatsapp, getSender } from "../../utils/user.js";

function parseMoney(str) {
    const clean = str.replace(/[^0-9]/g, "");
    return parseFloat(clean) || 0;
}

export default {
    name: "debt",
    matches: (text) => text.startsWith("$debt"),
    execute: async (sock, message, text) => {
        const chatId = message.key.remoteJid;
        const sender = getSender(message);
        const whatsappNumber = sender.replace("@s.whatsapp.net", "");

        try {
            const user = await getUserByWhatsapp(whatsappNumber);
            if (!user) {
                return sock.sendMessage(chatId, { text: "⚠️ Kamu belum terdaftar. Ketik $register <nama> dulu ya!" });
            }

            // Example: $debt 50000 Pinjam Teman
            const args = text.replace("$debt", "").trim().split(" ");

            if (args.length < 2) {
                return sock.sendMessage(chatId, { text: "⚠️ Format salah. Contoh: $debt 50000 Pinjam Teman" });
            }

            const amountStr = args[0];
            const categoryName = args[1]; // Or maybe Description? Usually debt doesn't need category per se, but schema requires it? 
            // Schema: categoryId is nullable (Int?) but let's see. 
            // Looking at schema: categoryId Int? -> Optional.
            // But wait, expense/income use category. For debt/savings, maybe we should auto-assign or allow no category?
            // User requested "manual crud berjalan". Let's assume standard format: Amount Category Description.
            // OR Amount Description? 
            // Let's stick to Amount Category Description for consistency with others, or Amount Description if category not strictly needed.
            // However, typical finance apps treat Debt/Savings as categories themselves often, or separate types.
            // Schema has TransactionType DEBT/SAVINGS.
            // Let's enforce Category for consistency for now, or use a "General" one?
            // Let's stick to: $debt <amount> <category> <desc> to be safe and consistent with expense/income.

            const categoryNameInput = args[1];
            const description = args.slice(2).join(" ") || "Tanpa keterangan";
            const amount = parseMoney(amountStr);

            if (amount <= 0) {
                return sock.sendMessage(chatId, { text: "⚠️ Nominal tidak valid." });
            }

            // check category exists
            const category = await prisma.category.findUnique({
                where: { name_userId: { name: categoryNameInput, userId: user.id } }
            });

            if (!category) {
                return sock.sendMessage(chatId, { text: `⚠️ Kategori '${categoryNameInput}' tidak ditemukan. Cek $list-cat` });
            }


            await prisma.transaction.create({
                data: {
                    amount,
                    type: "DEBT",
                    description,
                    categoryId: category.id,
                    userId: user.id
                }
            });

            const formattedAmount = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amount);

            await sock.sendMessage(chatId, {
                text: `╭── [ *HUTANG TERCATAT* ]
│
├ 📒 *Nominal:* ${formattedAmount}
├ 📂 *Kategori:* ${categoryNameInput}
├ 📝 *Ket:* ${description}
│
╰ _Cek history: $list-trx_`
            });

        } catch (error) {
            console.error("Debt Error:", error);
            await sock.sendMessage(chatId, { text: "❌ Terjadi kesalahan saat mencatat hutang." });
        }
    },
};
