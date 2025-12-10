import { prisma } from "../../utils/prisma.js";

function generateUniqueCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

export default {
    name: "register",
    matches: (text) => text.startsWith("$register"),
    execute: async (sock, message, text) => {
        const from = message.key.remoteJid;
        const isGroup = from.endsWith("@g.us");

        // Hanya untuk private chat
        if (isGroup) {
            // Optional: reply that it only works in private
            // await sock.sendMessage(from, { text: "Perintah ini hanya bisa digunakan di chat pribadi." });
            return;
        }

        const name = text.replace("$register", "").trim();
        if (!name) {
            await sock.sendMessage(from, { text: "Format salah. Gunakan: $register <nama>" });
            return;
        }

        // Extract nomor WA (remove @s.whatsapp.net)
        const whatsappNumber = from.replace("@s.whatsapp.net", "");

        try {
            // Check if user already exists
            const existingUser = await prisma.user.findUnique({
                where: { whatsappNumber },
            });

            if (existingUser) {
                await sock.sendMessage(from, {
                    text: `⚠️ *OOPS!* Kamu sudah terdaftar.\n\n👤 *Nama:* ${existingUser.name}\n🔑 *Kode Akses:* ${existingUser.uniqueCode}\n\n_Butuh bantuan? Ketik $help_`
                });
                return;
            }

            // Generate unique code and create user
            // Loop to ensure uniqueness (though clash is rare for 6 digits, good practice)
            let uniqueCode = generateUniqueCode();
            let isCodeUnique = false;

            while (!isCodeUnique) {
                const checkCode = await prisma.user.findUnique({ where: { uniqueCode } });
                if (!checkCode) isCodeUnique = true;
                else uniqueCode = generateUniqueCode();
            }

            const newUser = await prisma.user.create({
                data: {
                    whatsappNumber,
                    name,
                    uniqueCode,
                },
            });

            // Tambahkan kategori default
            const defaultCategories = ["Makan", "Transport", "Gaji", "Belanja", "Tagihan"];
            const categoryData = defaultCategories.map(cat => ({
                name: cat,
                userId: newUser.id
            }));

            await prisma.category.createMany({
                data: categoryData
            });

            const msg = `╭── [ *REGISTRASI BERHASIL* ]
│
├ 🎉 *Selamat Datang, ${newUser.name}!*
│ Akun keuanganmu telah aktif.
│
├ 🔑 *KODE AKSES WEB*
│ 👉 *${newUser.uniqueCode}*
│ 🔗 *Login:* ${process.env.DASHBOARD_URL || "Hubungi Admin"}
│ _(Simpan kode ini untuk login dashboard)_
│
╰ 💡 *Next Step:*
  Ketik *$help* untuk melihat menu.`;

            await sock.sendMessage(from, { text: msg });

        } catch (error) {
            console.error("Register Error:", error);
            await sock.sendMessage(from, { text: "❌ *ERROR TERSISTEM*\n\nTerjadi kesalahan saat mendaftar. Silakan coba lagi nanti." });
        }
    },
};
