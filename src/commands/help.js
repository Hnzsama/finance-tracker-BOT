import { getSender } from "../utils/user.js";

export default {
  name: "help",
  matches: (text) => text.toLowerCase().startsWith("$help"),
  execute: async (sock, message) => {
    const chatId = message.key.remoteJid;
    const sender = getSender(message);
    const name = message.pushName || "User";
    const text = message.message?.conversation || message.message?.extendedTextMessage?.text || "";
    const args = text.split(" ").slice(1); // Get args after $help
    const subCommand = args[0] ? args[0].toLowerCase() : null;

    // ============================================================
    // 1. SUB-MENU: USER
    // ============================================================
    if (subCommand === "user") {
      const msg = `👤 *BANTUAN: PENGGUNA*

╭── [ *Pendaftaran* ]
│
╰ \`$register [Nama]\`
  Daftar akun baru & dapatkan kode akses.
  Contoh: _"$register Tegar"_

╭── [ *Profil & Akses* ]
│
├ \`$edit-name [Nama Baru]\`
│ Ganti nama tampilanmu.
│
╰ \`$my-code\`
  Lihat kode rahasia & link dashboard.

_Ketik_ \`$help\` _untuk kembali ke menu utama._`;
      return await sock.sendMessage(chatId, { text: msg });
    }

    // ============================================================
    // 2. SUB-MENU: CATEGORY
    // ============================================================
    if (subCommand === "category" || subCommand === "cat") {
      const msg = `📂 *BANTUAN: MANAJEMEN KATEGORI*

╭── [ *🤖 AI Manager (Rekomendasi)* ]
│
╰ \`$cat [Instruksi Natural]\`
  Kelola kategori dengan bahasa manusia.
  Contoh: _"$cat Tambah Saham dan Hapus Rokok"_
  Contoh: _"$cat Ganti Gaji jadi Income"_

╭── [ *🛠️ Manual* ]
│
├ \`$list-cat\`
│ Lihat semua daftar kategori.
│
├ \`$add-cat [Nama 1], [Nama 2]\`
│ Tambah kategori baru (Bisa banyak).
│ Contoh: _"$add-cat Bonus, Tunjangan"_
│
├ \`$del-cat [Nama 1], [Nama 2]\`
│ Hapus kategori (Bisa banyak).
│ Contoh: _"$del-cat Judi, Slot"_
│
╰ \`$edit-cat [Lama] -> [Baru]\`
  Ganti nama kategori.
  Contoh: _"$edit-cat Makanan -> Kuliner"_

_Ketik_ \`$help\` _untuk kembali ke menu utama._`;
      return await sock.sendMessage(chatId, { text: msg });
    }

    // ============================================================
    // 3. SUB-MENU: TRANSACTION
    // ============================================================
    if (subCommand === "transaction" || subCommand === "trx") {
      const msg = `💰 *BANTUAN: TRANSAKSI*

╭── [ *🤖 AI Manager* ]
│
╰ \`$trx [Instruksi/FOTO]\`
  Catat transaksi otomatis (Text/Gambar).
  Contoh Text: _"$trx Beli kopi 25rb"_
  Contoh Gambar: _Kirim foto struk + caption $trx_

╭── [ *🛠️ Manual* ]
│
├ \`$inc [Jml] [Kat] [Ket]\`
│ Catat Pemasukan (Income).
│ Contoh: _"$inc 5jt Gaji"_
│
├ \`$exp [Jml] [Kat] [Ket]\`
│ Catat Pengeluaran (Expense).
│ Contoh: _"$exp 20rb Makan"_
│
├ \`$debt [Jml] [Kat] [Ket]\`
│ Catat Hutang (Debt).
│ Contoh: _"$debt 50rb Pinjaman"_
│
├ \`$save [Jml] [Kat] [Ket]\`
│ Catat Tabungan (Savings).
│ Contoh: _"$save 100rb Haji"_
│
├ \`$list-trx [Filter]\`
│ Lihat riwayat transaksi.
│ Filter: _income, expense, debt, saving_
│ Contoh: _"$list-trx expense"_

_Ketik_ \`$help\` _untuk kembali ke menu utama._`;
      return await sock.sendMessage(chatId, { text: msg });
    }

    // ============================================================
    // MENU UTAMA (DEFAULT)
    // ============================================================
    const msg = `Halo *${name}*! 👋
Saya adalah *Finance Tracker Bot* yang siap bantuin catat keuanganmu.
    
Gunakan menu di bawah ini untuk memulai:

╭── [ 📌 *MENU BANTUAN* ]
│
├ \`$help user\`
│ 👤 Pendaftaran & Profil Pengguna.
│
├ \`$help category\`
│ 📂 Manajemen Kategori (AI & Manual).
│
╰ \`$help trx\`
  💰 Catat Pemasukan & Pengeluaran.

_Gunakan prefix $ untuk setiap perintah._
*Powered by Gemini AI 🚀*

Developed by:
👨‍💻 *Hnzsama* (github.com/Hnzsama)
👨‍💻 *Tegar* (github.com/tegarsw21)`;

    await sock.sendMessage(chatId, {
      text: msg,
      mentions: [sender]
    });
  },
};
