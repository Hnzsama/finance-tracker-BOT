import { prisma } from "../../utils/prisma.js";
import { getUserByWhatsapp } from "../../utils/user.js";

export default {
    name: "smart-cat",
    matches: (text) => text.startsWith("$cat"),
    execute: async (sock, message, text, { gemini }) => {
        const from = message.key.remoteJid;
        const whatsappNumber = from.replace("@s.whatsapp.net", "");

        try {
            const user = await getUserByWhatsapp(whatsappNumber);
            if (!user) {
                return sock.sendMessage(from, { text: "⚠️ Kamu belum terdaftar. Ketik $register <nama> dulu ya!" });
            }

            const instruction = text.replace("$cat", "").trim();
            if (!instruction) {
                return sock.sendMessage(from, { text: "⚠️ Berikan instruksi. Contoh: $cat Tambah Gaji dan hapus Rokok" });
            }

            // React Processing
            await sock.sendMessage(from, { react: { text: "⏳", key: message.key } });

            // 1. Get current categories
            const currentCats = await prisma.category.findMany({
                where: { userId: user.id },
                select: { name: true }
            });
            const currentCatNames = currentCats.map(c => c.name);

            // 2. Prompt Gemini
            const prompt = `
        You are an AI assistant managing specific categories in a database.
        
        Current Categories of the User: ${JSON.stringify(currentCatNames)}
        
        User Instruction: "${instruction}"
        
        Analyze the instruction and return a JSON object with a list of actions to perform.
        The actions can be: "create", "delete", "update".
        
        Format:
        {
          "actions": [
            { "type": "create", "name": "CategoryName" },
            { "type": "delete", "name": "CategoryName" },
            { "type": "update", "oldName": "OldName", "newName": "NewName" }
          ],
          "summary": "A cool, brief summary of what you did (in Indonesian style, like 'Oke bos, Gaji udah masuk, Rokok dibuang!')"
        }

        Rules:
        - For "delete" and "update", exact name matching with Current Categories is preferred but fuzzy is okay if obvious.
        - If "create" and it already exists, ignore it or handle gracefully (I will handle in code, just return create).
        - If "delete" and not exists, ignore.
        - STRICTLY return only JSON. No markdown formatting.
      `;

            const result = await gemini.generateContent(prompt);
            const responseText = result.response.text().replace(/```json/g, "").replace(/```/g, "").trim();

            let parsed;
            try {
                parsed = JSON.parse(responseText);
            } catch (e) {
                console.error("AI Parse Error:", responseText);
                return sock.sendMessage(from, { text: "⚠️ Maaf, aku bingung sama instruksinya." });
            }

            // 3. Execute Actions
            const results = [];

            for (const action of parsed.actions) {
                if (action.type === "create") {
                    const exists = await prisma.category.findUnique({
                        where: { name_userId: { name: action.name, userId: user.id } }
                    });
                    if (!exists) {
                        await prisma.category.create({ data: { name: action.name, userId: user.id } });
                        results.push(`✅ Tambah: ${action.name}`);
                    } else {
                        results.push(`⚠️ Sudah ada: ${action.name}`);
                    }
                } else if (action.type === "delete") {
                    // Try exact match first
                    let target = action.name;
                    // (Optional: Fuzzy match logic here if needed, relying on AI for now)

                    const deleted = await prisma.category.deleteMany({
                        where: { name: target, userId: user.id }
                    });
                    if (deleted.count > 0) results.push(`🗑️ Hapus: ${target}`);
                    else results.push(`⚠️ Gagal hapus (tak ditemukan): ${target}`);

                } else if (action.type === "update") {
                    const exists = await prisma.category.findUnique({
                        where: { name_userId: { name: action.oldName, userId: user.id } }
                    });
                    if (exists) {
                        await prisma.category.update({
                            where: { id: exists.id },
                            data: { name: action.newName }
                        });
                        results.push(`✏️ Edit: ${action.oldName} -> ${action.newName}`);
                    } else {
                        results.push(`⚠️ Gagal edit (tak ditemukan): ${action.oldName}`);
                    }
                }
            }

            // 4. Respond
            let finalMsg = `╭── [ *AI MANAGER* ]
│
├ 🤖 "${parsed.summary}"
│
├ 📜 *LOG AKSI*
`;
            results.forEach(res => {
                finalMsg += `├ ${res}\n`;
            });
            finalMsg += `│
╰ _Cek hasil: $list-cat_`;

            await sock.sendMessage(from, { text: finalMsg });

            // React Success
            await sock.sendMessage(from, { react: { text: "✅", key: message.key } });

        } catch (error) {
            console.error("AI Cat Error:", error);
            await sock.sendMessage(from, { text: "❌ Terjadi kesalahan sistem." });
        }
    },
};
