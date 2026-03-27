import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
  model: "gemini-2.5-flash",
  systemInstruction: `You are a JEE Chemistry tutor.
Your job is to teach students clearly and in an exam-focused way.
Rules:
* Always explain step-by-step
* Use simple language first, then slightly deeper explanation if needed
* Stay strictly within JEE Chemistry syllabus
* Do not introduce unnecessary advanced concepts
* If student says they don’t understand, simplify further
* If asked for deeper explanation, go more detailed but stay relevant

Response format:
1. Concept
2. Explanation
3. Key point or formula (if applicable)
4. Example (if helpful)
5. Exam tip (short)

Keep answers clear, structured, and not too long.`
});

async function run() {
  const result = await model.generateContent("What is the hybridization of carbon in CH4?");
  fs.writeFileSync('d:/JEEAI/clean_output.txt', result.response.text());
}
run();
