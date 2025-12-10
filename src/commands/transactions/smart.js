import { prisma } from "../../utils/prisma.js";
import { getUserByWhatsapp } from "../../utils/user.js";
import { downloadMediaMessage } from "@whiskeysockets/baileys";

export default {
    name: "trx-smart",
    matches: (text) => text.startsWith("$trx"),
    execute: async (sock, message, text, { gemini }) => {
        const from = message.key.remoteJid;
        const whatsappNumber = from.replace("@s.whatsapp.net", "");

        try {
            const user = await getUserByWhatsapp(whatsappNumber);
            if (!user) {
                return sock.sendMessage(from, { text: "⚠️ Kamu belum terdaftar. Ketik $register <nama> dulu ya!" });
            }

            const instruction = text.replace("$trx", "").trim();

            // Check for image
            const isImage = message.message?.imageMessage;
            if (!instruction && !isImage) {
                return sock.sendMessage(from, { text: "⚠️ Kirim gambar struk atau tulis instruksi. Contoh: $trx Beli kopi 25k" });
            }

            // React Processing
            await sock.sendMessage(from, { react: { text: "⏳", key: message.key } });

            // 1. Get Categories
            const categories = await prisma.category.findMany({
                where: { userId: user.id },
                select: { id: true, name: true }
            });

            const categoryList = categories.map(c => c.name).join(", ");

            // Prepare inputs
            const promptParts = [];

            if (isImage) {
                const buffer = await downloadMediaMessage(
                    message,
                    'buffer',
                    {}
                );
                promptParts.push({
                    inlineData: {
                        data: buffer.toString("base64"),
                        mimeType: "image/jpeg"
                    }
                });
            }

            // 2. Prompt Gemini
            const textPrompt = `
        You are a financial assistant.
        
        User Categories: ${categoryList}
        User Instruction: "${instruction}"
        
        Task: 
        Analyze the input (Text Instruction AND/OR Image of Receipt/Note).
        Extract transaction data. Map each item to the most relevant Category from the list above. 
        If no category fits well, suggest "Lainnya" or "Umum" (but prioritize existing ones).
        
        Return JSON format:
        {
          "transactions": [
            {
              "type": "INCOME" | "EXPENSE",
              "amount": number,
              "categoryName": "Exact Name from User Categories if possible",
              "description": "Short description"
            }
          ],
          "summary": "Brief summary of what you are about to record (in Indonesian cool style)"
        }
        
        stictly return valid JSON only.
      `;

            promptParts.push(textPrompt);

            const result = await gemini.generateContent(promptParts);
            const strRes = result.response.text().replace(/```json/g, "").replace(/```/g, "").trim();

            let parsed;
            try {
                parsed = JSON.parse(strRes);
            } catch (e) {
                console.error("AI Trx Parse Error:", strRes);
                return sock.sendMessage(from, { text: "⚠️ Maaf, aku bingung. Coba kalimat lain ya." });
            }

            let successLog = "";

            // 3. Execute
            for (const t of parsed.transactions) {
                // Find Category ID
                let cat = categories.find(c => c.name.toLowerCase() === t.categoryName.toLowerCase());

                // If strict match fails, try fuzzy or create if permitted? 
                // For now, if not found, use first category or error?
                // Let's safe guard: If not found, skip or create "Lainnya" on the fly?
                // Better: Skip and report.
                if (!cat) {
                    // Fallback: Try to find "Lainnya" or just pick the first one as emergency?
                    // Or create new category?
                    // Let's create if not exists
                    const existing = await prisma.category.findUnique({
                        where: { name_userId: { name: t.categoryName, userId: user.id } }
                    });
                    if (existing) {
                        cat = existing;
                    } else {
                        cat = await prisma.category.create({
                            data: { name: t.categoryName, userId: user.id }
                        });
                        successLog += `📂 *Kategori Baru:* ${t.categoryName}\n`;
                    }
                }

                await prisma.transaction.create({
                    data: {
                        amount: t.amount,
                        type: t.type,
                        description: t.description,
                        categoryId: cat.id,
                        userId: user.id
                    }
                });

                const fmt = new Intl.NumberFormat('id-ID').format(t.amount);
                const icon = t.type === "INCOME" ? "💰" : "💸";
                successLog += `├ ${icon} Rp ${fmt} (${t.categoryName}) - ${t.description}\n`;
            }

            // 4. Respond
            let msg = `╭── [ *TRANSAKSI AI* ]
│
├ 🤖 "${parsed.summary}"
│
${successLog}│
╰ _Cek history: $list-trx_`;

            await sock.sendMessage(from, { text: msg });
            await sock.sendMessage(from, { react: { text: "✅", key: message.key } });

        } catch (error) {
            console.error("Smart Trx Error:", error);
            await sock.sendMessage(from, { text: "❌ Gagal mencatat transaksi." });
        }
    },
};
