import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';

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

// Initialize Supabase Client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
if (!supabaseUrl || !supabaseKey) {
  console.error("Missing SUPABASE environment variables! Check your .env file.");
}
export const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * POST /chat endpoint
 * Expected JSON Input: { "message": "your text here" }
 * Expected JSON Output: { "response": "AI's text here" }
 */
app.post('/chat', async (req, res) => {
  try {
    // 1. Extract inputs
    const { message, history = [], userId, userEmail, sessionId, subject = 'CHEMISTRY' } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required.' });
    }

    let finalSessionId = sessionId;

    // --- Automatically create/verify User in database ---
    if (userId && userEmail) {
      await supabase.from('users').upsert({ id: userId, email: userEmail }, { onConflict: 'id' });
    }

    // --- Create Chat Session if missing ---
    if (userId && !finalSessionId) {
      const { data, error } = await supabase
        .from('chat_sessions')
        .insert({ user_id: userId, subject })
        .select()
        .single();
      
      if (error) console.error("Error creating session:", error);
      if (data) finalSessionId = data.id;
    }

    // --- Save USER Message ---
    if (finalSessionId) {
      await supabase.from('messages').insert({
        session_id: finalSessionId,
        role: 'user',
        content: message
      });
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
    const masterPromptPath = path.join(process.cwd(), 'prompt_engineering', 'v4_boundary_prompt.txt');
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

    // --- Set SSE Headers ---
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.flushHeaders();

    // Send the sessionId down the stream first so the frontend knows!
    if (finalSessionId) {
      res.write(`data: ${JSON.stringify({ sessionId: finalSessionId })}\n\n`);
    }

    // --- Select Model ---
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-pro",
      systemInstruction: finalSystemInstruction
    });

    // --- Format History ---
    const recentHistory = history.slice(-5);
    const formattedHistory = recentHistory.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));

    // --- Start Chat & Stream ---
    const chat = model.startChat({ history: formattedHistory });
    const result = await chat.sendMessageStream(message);

    let fullAssistantResponse = '';

    for await (const chunk of result.stream) {
      const chunkText = chunk.text();
      if (chunkText) {
        fullAssistantResponse += chunkText;
        res.write(`data: ${JSON.stringify({ chunk: chunkText })}\n\n`);
      }
    }

    // Save ASSISTANT message to database
    if (finalSessionId && fullAssistantResponse) {
      await supabase.from('messages').insert({
        session_id: finalSessionId,
        role: 'assistant',
        content: fullAssistantResponse
      });
    }

    // Auto-Title Logic (Fire and forget, non-blocking)
    if (finalSessionId && history.length === 0) {
      const titlePrompt = `Summarize this query in 3 simple words (no punctuation, no quotes): "${message}"`;
      // Use fallback tiny model for speed and cost
      const fastModel = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
      fastModel.generateContent(titlePrompt).then(({ response }) => {
        let text = response.text().trim();
        text = text.replace(/["']/g, ''); // strip quotes
        supabase.from('chat_sessions').update({ title: text, updated_at: new Date() }).eq('id', finalSessionId).then();
      }).catch(err => console.error("Auto-titling failed:", err));
    }

    res.write('data: [DONE]\n\n');
    res.end();

  } catch (error) {
    console.error('Error generating AI response:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message || 'Failed to generate response.' });
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
