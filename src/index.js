import { createRequire } from "module";
import { useMultiFileAuthState, fetchLatestBaileysVersion, makeWASocket, DisconnectReason } from "@whiskeysockets/baileys";
import { prisma } from "./utils/prisma.js";
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
        // @ts-ignore
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

  // Load commands
  const commands = [];
  const fs = await import("fs");
  const path = await import("path");
  const { fileURLToPath } = await import("url");
  const { gemini } = await import("./utils/gemini.js"); // Import Gemini
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const commandsDir = path.join(__dirname, "commands");

  // Ensure commands directory exists
  if (!fs.existsSync(commandsDir)) {
    fs.mkdirSync(commandsDir);
  }

  // Recursive function to load commands
  async function loadCommandsRecursive(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        await loadCommandsRecursive(fullPath);
      } else if (entry.isFile() && entry.name.endsWith(".js")) {
        try {
          const commandCheck = await import(`file://${fullPath}`);
          const command = commandCheck.default || commandCheck;
          if (command.name && command.execute) {
            commands.push(command);
            console.log(`Command loaded: ${command.name}`);
          }
        } catch (err) {
          console.error(`Failed to load command at ${fullPath}:`, err);
        }
      }
    }
  }

  await loadCommandsRecursive(commandsDir);

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

      for (const command of commands) {
        if (command.matches(text)) {
          try {
            // Pass gemini instance to the command
            await command.execute(sock, msg, text, { gemini });
          } catch (error) {
            console.error(`Error executing command ${command.name}:`, error);
          }
        }
      }
    }
  });
}

startSock();
