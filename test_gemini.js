import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function test() {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-pro" });
    console.log("Testing connection to Gemini 2.5 Pro...");
    const result = await model.generateContent("Respond with exactly 'PRO_WORKING' if you receive this.");
    console.log("Response:", result.response.text().trim());
  } catch (error) {
    console.error("Pro Error:", error.message);
  }
}
test();
