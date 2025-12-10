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
