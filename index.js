import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Load environment variables from a .env file into process.env
dotenv.config();

// Initialize the Express application
const app = express();
const port = process.env.PORT || 3000;

// Enable CORS so frontend applications can make requests to this backend
app.use(cors());

// Middleware to automatically parse incoming JSON payloads in the request body
app.use(express.json());

// Initialize the Google Gemini AI client using the API key from environment variables
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * POST /chat endpoint
 * Expected JSON Input: { "message": "your text here" }
 * Expected JSON Output: { "response": "AI's text here" }
 */
app.post('/chat', async (req, res) => {
  try {
    // 1. Extract 'message' and 'history' from the parsed JSON body (default history to empty array)
    const { message, history = [] } = req.body;

    // 2. Validate input: Ensure the message is provided
    if (!message) {
      return res.status(400).json({ error: 'Message is required. Provide JSON like { "message": "text" }' });
    }

    // --- Basic Chapter Detection ---
    let chapter = null;
    const lowerMessage = message.toLowerCase();
    if (lowerMessage.includes('bond') || lowerMessage.includes('hybridization') || lowerMessage.includes('vsepr')) {
      chapter = 'chemical_bonding';
    } else if (lowerMessage.includes('orbital') || lowerMessage.includes('quantum') || lowerMessage.includes('electron')) {
      chapter = 'atomic_structure';
    }

    // --- Load Notes From File ---
    let notesContent = '';
    if (chapter) {
      try {
        const notesPath = path.join(process.cwd(), 'data', 'notes', `${chapter}.txt`);
        if (fs.existsSync(notesPath)) {
          notesContent = fs.readFileSync(notesPath, 'utf-8');
        }
      } catch (err) {
        console.error(`Error reading notes for chapter ${chapter}:`, err.message);
      }
    }

    // --- Load Master Prompt ---
    const masterPromptPath = path.join(process.cwd(), 'prompt_engineering', 'v2_elite_mentor_framework.txt');
    let finalSystemInstruction = 'You are a JEE Tutor.'; // fallback
    try {
      finalSystemInstruction = fs.readFileSync(masterPromptPath, 'utf-8');
    } catch (err) {
      console.error('Warning: Failed to load master prompt file:', err.message);
    }

    // Inject notes if loaded
    if (notesContent) {
      finalSystemInstruction += `\n\nPrefer and align your explanation with the following JEE study material. Stay exam-focused and avoid unnecessary advanced theory.\n\n[${chapter} notes content]\n${notesContent}`;
    }

    // --- Set SSE Headers for real-time streaming ---
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.flushHeaders();

    // --- Select Model ---
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction: finalSystemInstruction
    });

    // --- Format History ---
    const recentHistory = history.slice(-5);
    const formattedHistory = recentHistory.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));

    // --- Start Chat ---
    const chat = model.startChat({ history: formattedHistory });

    // --- Stream response chunk by chunk ---
    const result = await chat.sendMessageStream(message);

    for await (const chunk of result.stream) {
      const chunkText = chunk.text();
      if (chunkText) {
        res.write(`data: ${JSON.stringify({ chunk: chunkText })}\n\n`);
      }
    }

    // Signal the frontend that streaming is complete
    res.write('data: [DONE]\n\n');
    res.end();

  } catch (error) {
    console.error('Error generating AI response:', error);
    // If headers already sent, can't send JSON error — write as SSE error event
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to generate response. Check API key and server logs.' });
    } else {
      res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
      res.end();
    }
  }
});

// Start the server and listen on the specified port
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
  console.log(`Send POST requests to http://localhost:${port}/chat`);
});
