export default {
    name: "halo",
    description: "Responds to greetings",
    matches: (text) => text && text.toLowerCase().includes("halo"),
    execute: async (sock, message) => {
        const from = message.key.remoteJid;
        const text =
            message.message?.conversation || message.message?.extendedTextMessage?.text;

        console.log(`Pesan dari ${from}: ${text}`);
        await sock.sendMessage(from, {
            text: "Halo! Ada yang bisa saya bantu?",
        });
    },
};
