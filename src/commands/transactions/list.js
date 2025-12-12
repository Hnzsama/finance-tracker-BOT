import { prisma } from "../../utils/prisma.js";
import { getUserByWhatsapp, getSender } from "../../utils/user.js";

export default {
    name: "list-trx",
    matches: (text) => text.startsWith("$list-trx"),
    execute: async (sock, message) => {
        const chatId = message.key.remoteJid;
        const sender = getSender(message);
        const whatsappNumber = sender.replace("@s.whatsapp.net", "");

        // Parse filter arguments
        const text = message.message?.conversation || message.message?.extendedTextMessage?.text || "";
        const args = text.split(" ").slice(1);
        const filter = args[0] ? args[0].toUpperCase() : null;

        const validFilters = ["INCOME", "EXPENSE", "DEBT", "SAVINGS"];
        const filterMap = {
            "INCOME": "INCOME", "INC": "INCOME",
            "EXPENSE": "EXPENSE", "EXP": "EXPENSE",
            "DEBT": "DEBT",
            "SAVING": "SAVINGS", "SAVINGS": "SAVINGS", "SAVE": "SAVINGS"
        };

        let selectedFilter = null;
        if (filter && filterMap[filter]) {
            selectedFilter = filterMap[filter];
        }

        try {
            const user = await getUserByWhatsapp(whatsappNumber);
            if (!user) {
                return sock.sendMessage(chatId, { text: "⚠️ Kamu belum terdaftar." });
            }

            // Build query
            const whereClause = { userId: user.id };
            if (selectedFilter) {
                whereClause.type = selectedFilter;
            }

            const transactions = await prisma.transaction.findMany({
                where: whereClause,
                orderBy: { createdAt: "desc" },
                take: 20,
                include: { category: true }
            });

            if (transactions.length === 0) {
                return sock.sendMessage(chatId, { text: "📭 Belum ada transaksi." });
            }

            // Group transactions
            const grouped = {
                INCOME: [],
                EXPENSE: [],
                DEBT: [],
                SAVINGS: []
            };

            let totalIncome = 0;
            let totalExpense = 0;
            let totalDebt = 0;
            let totalSavings = 0;

            transactions.forEach(trx => {
                if (grouped[trx.type]) {
                    grouped[trx.type].push(trx);

                    const amount = Number(trx.amount);
                    if (trx.type === "INCOME") totalIncome += amount;
                    if (trx.type === "EXPENSE") totalExpense += amount;
                    if (trx.type === "DEBT") totalDebt += amount;
                    if (trx.type === "SAVINGS") totalSavings += amount;
                }
            });

            // Format Currency
            const fmt = (num) => new Intl.NumberFormat('id-ID').format(num);
            const formatDate = (date) => new Date(date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });

            let msg = `📊 *RIWAYAT TRANSAKSI TERAKHIR*
_Menampilkan ${transactions.length} data terbaru._
`;

            // Function to generate section
            const generateSection = (title, icon, data, total) => {
                if (data.length === 0) return "";
                let sectionMsg = `
╭── [ ${icon} *${title}* ] (Rp ${fmt(total)})
│`;
                data.forEach(trx => {
                    sectionMsg += `
├ • ${formatDate(trx.createdAt)} : *Rp ${fmt(Number(trx.amount))}*
│   _${trx.description || '-'}_ (${trx.category?.name || 'Umum'})`;
                });
                sectionMsg += `
│`;
                return sectionMsg;
            };

            if (selectedFilter) {
                // Show only selected filter
                if (selectedFilter === "INCOME") msg += generateSection("PEMASUKAN", "💰", grouped.INCOME, totalIncome);
                if (selectedFilter === "EXPENSE") msg += generateSection("PENGELUARAN", "💸", grouped.EXPENSE, totalExpense);
                if (selectedFilter === "DEBT") msg += generateSection("HUTANG", "📒", grouped.DEBT, totalDebt);
                if (selectedFilter === "SAVINGS") msg += generateSection("TABUNGAN", "🏦", grouped.SAVINGS, totalSavings);
            } else {
                // Show all present groups
                msg += generateSection("PEMASUKAN", "💰", grouped.INCOME, totalIncome);
                msg += generateSection("PENGELUARAN", "💸", grouped.EXPENSE, totalExpense);
                msg += generateSection("HUTANG", "📒", grouped.DEBT, totalDebt);
                msg += generateSection("TABUNGAN", "🏦", grouped.SAVINGS, totalSavings);
            }

            msg += `
╰──────────────────
_Gunakan $list-trx [income/expense] untuk filter._`;

            await sock.sendMessage(chatId, { text: msg });
        } catch (error) {
            console.error("List Trx Error:", error);
            await sock.sendMessage(chatId, { text: "❌ Gagal mengambil data transaksi." });
        }
    },
};
