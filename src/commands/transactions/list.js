import { prisma } from "../../utils/prisma.js";
import { getUserByWhatsapp } from "../../utils/user.js";

export default {
    name: "list-trx",
    matches: (text) => text.startsWith("$list-trx"),
    execute: async (sock, message) => {
        const from = message.key.remoteJid;
        const whatsappNumber = from.replace("@s.whatsapp.net", "");

        try {
            const user = await getUserByWhatsapp(whatsappNumber);
            if (!user) {
                return sock.sendMessage(from, { text: "⚠️ Kamu belum terdaftar." });
            }

            const transactions = await prisma.transaction.findMany({
                where: { userId: user.id },
                orderBy: { createdAt: "desc" },
                take: 10,
                include: { category: true }
            });

            if (transactions.length === 0) {
                return sock.sendMessage(from, { text: "📭 Belum ada transaksi." });
            }

            let msg = `╭── [ *RIWAYAT TRANSAKSI* ]
│
`;

            transactions.forEach(trx => {
                let typeIcon = "📄";
                if (trx.type === "INCOME") typeIcon = "💰";
                if (trx.type === "EXPENSE") typeIcon = "💸";
                if (trx.type === "DEBT") typeIcon = "📒";
                if (trx.type === "SAVINGS") typeIcon = "🏦";

                const typeSign = trx.type === "INCOME" ? "+" : "-";
                const fmtAmount = new Intl.NumberFormat('id-ID').format(Number(trx.amount));
                const date = new Date(trx.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });

                msg += `├ ${typeIcon} *${typeSign}Rp ${fmtAmount}* (${trx.category?.name || '-'})
│    _${trx.description || ''}_ • ${date}
│
`;
            });

            msg += `╰ _Menampilkan 10 transaksi terakhir_`;

            await sock.sendMessage(from, { text: msg });

        } catch (error) {
            console.error("List Trx Error:", error);
            await sock.sendMessage(from, { text: "❌ Gagal mengambil data transaksi." });
        }
    },
};
