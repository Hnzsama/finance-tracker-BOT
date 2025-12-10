import { prisma } from "./prisma.js";

/**
 * Get user by WhatsApp number
 * @param {string} whatsappNumber 
 * @returns {Promise<import("@prisma/client").User | null>}
 */
export async function getUserByWhatsapp(whatsappNumber) {
    return await prisma.user.findUnique({
        where: { whatsappNumber },
    });
}

/**
 * Get normalized sender JID (handles LID)
 * @param {import("@whiskeysockets/baileys").proto.IWebMessageInfo} msg 
 * @returns {string}
 */
export function getSender(msg) {
    let jid = msg.key.remoteJid;
    // @ts-ignore
    if (jid?.includes("@lid") && msg.key.remoteJidAlt) {
        // @ts-ignore
        jid = msg.key.remoteJidAlt;
    }
    return jid || "";
}
