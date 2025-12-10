import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// User requested "flash-2.5", ensuring we use the closest valid flash model or experimental if they specifically meant that.
// For now, defaulting to 'gemini-1.5-flash' which is the current standard.
// If you specifically need a different version, update this string.
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

export { model as gemini };
