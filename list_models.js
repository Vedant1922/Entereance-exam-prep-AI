import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function listModels() {
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`);
    const data = await response.json();
    console.log("Available models:");
    data.models.forEach(model => {
      console.log(`- ${model.name} (supports: ${model.supportedGenerationMethods.join(', ')})`);
    });
  } catch (error) {
    console.error("Error fetching models:", error);
  }
}

listModels();
