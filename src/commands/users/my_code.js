import { getUserByWhatsapp } from "../../utils/user.js";

export default {
    name: "my-code",
    matches: (text) => text === "$my-code" || text === "$cek-kode",
    execute: async (sock, message) => {
        const from = message.key.remoteJid;
        const whatsappNumber = from.replace("@s.whatsapp.net", "");

        try {
            const user = await getUserByWhatsapp(whatsappNumber);
            if (!user) {
                return sock.sendMessage(from, { text: "⚠️ Kamu belum terdaftar. Ketik $register <nama> dulu ya!" });
            }

            const dashboardUrl = process.env.DASHBOARD_URL || "_(URL belum diset admin)_";

            const msg = `╭── [ *AKSES RAHASIA* ]
│
├ 👤 *Nama:* ${user.name}
│
├ 🔑 *Kode Akses:*
│ 👉 *${user.uniqueCode}*
│
├ 🔗 *Link Dashboard:*
│ ${dashboardUrl}
│
╰ ⚠️ _Jaga kerahasiaan kodenya ya!_`;

            await sock.sendMessage(from, { text: msg });

        } catch (error) {
            console.error("My Code Error:", error);
            await sock.sendMessage(from, { text: "❌ Terjadi kesalahan saat mengambil data." });
        }
    },
};
