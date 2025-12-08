import { createRequire } from "module";
import { useMultiFileAuthState, fetchLatestBaileysVersion, makeWASocket, DisconnectReason } from "@whiskeysockets/baileys";
const require = createRequire(import.meta.url);
const qrcode = require("qrcode-terminal");

async function startSock() {
  const { state, saveCreds } = await useMultiFileAuthState("auth");
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: state,
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect, qr } = update;
    if (qr) {
      qrcode.generate(qr, { small: true });
      console.log("Scan QR code ini dengan WhatsApp kamu!");
    }
    if (connection === "close") {
      if (
        lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut
      ) {
        startSock();
      } else {
        console.log(
          "Disconnected. Please delete auth_info_baileys folder and restart to re-authenticate."
        );
      }
    } else if (connection === "open") {
      console.log("Bot is now connected");
    }
  });

  sock.ev.on("messages.upsert", async ({ messages }) => {
    for (const msg of messages) {
      if (!msg.message || msg.key.fromMe) continue;
      const from = msg.key.remoteJid;
      let text = "";
      if (msg.message.conversation) text = msg.message.conversation;
      else if (msg.message.extendedTextMessage)
        text = msg.message.extendedTextMessage.text;

      // Log semua pesan yang diterima
      console.log(`[DEBUG] Pesan masuk dari ${from}:`, text);

      if (text && text.toLowerCase().includes("halo")) {
        console.log(`Pesan dari ${from}: ${text}`);
        await sock.sendMessage(from, {
          text: "Halo! Ada yang bisa saya bantu?",
        });
      }
    }
  });
}

startSock();
