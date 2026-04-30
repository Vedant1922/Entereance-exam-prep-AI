import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import OpenAI from 'openai';
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

// Initialize the OpenAI client using the API key from environment variables
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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
 * Expected JSON Output: SSE stream of { "chunk": "..." } events
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

    // --- AI Router: Classify the student's question (gpt-4o-mini for speed & cost) ---
    let chapterFilename = null;
    let notesContent = '';
    
    try {
      const routerPrompt = `You are a strict traffic router for a JEE Chemistry AI Tutor.
Analyze the student's message. 
If the student is asking a general question (e.g., 'hi', 'how are you', 'how should I study', 'motivate me', 'thanks', 'bye', or anything not directly related to chemistry subject matter), reply with EXACTLY the word: GENERAL

If the student is asking a Chemistry question, figure out which syllabus unit it belongs to and reply with EXACTLY the corresponding filename (do not include the .txt extension).
Here are the available units:
chem_unit1_basic_concepts
chem_unit2_atomic_structure
chem_unit3_chemical_bonding
chem_unit4_thermodynamics
chem_unit5_solutions
chem_unit6_equilibrium
chem_unit7_electrochemistry
chem_unit8_kinetics
chem_unit9_periodic_table
chem_unit10_pblock
chem_unit11_dfblock
chem_unit12_coordination
chem_unit13_14_organic_basics
chem_unit15_hydrocarbons
chem_unit16_17_18_functional_organic
chem_unit19_20_biomolecules_practical

Student message: "${message}"
Reply ONLY with 'GENERAL' or the exact filename. Do not add any quotes, punctuation, or other text.`;

      const routerResult = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: routerPrompt }],
        max_tokens: 20,
        temperature: 0,
      });

      const routerResponse = routerResult.choices[0]?.message?.content?.trim().replace(/['\"]/g, '') || 'GENERAL';
      console.log(`[AI Router] Classified message as: ${routerResponse}`);

      if (routerResponse !== 'GENERAL' && routerResponse.length > 0) {
        chapterFilename = routerResponse;
      }
    } catch (err) {
      console.error('Error in AI Router:', err.message);
    }

    // --- Load Notes From File ---
    if (chapterFilename) {
      try {
        const notesPath = path.join(process.cwd(), 'syllabus_docs', `${chapterFilename}.txt`);
        if (fs.existsSync(notesPath)) {
          notesContent = fs.readFileSync(notesPath, 'utf-8');
          console.log(`[Backend] Successfully loaded notes: ${chapterFilename}.txt`);
        } else {
          console.warn(`[Backend] Warning: Router suggested ${chapterFilename}, but file was not found at ${notesPath}`);
        }
      } catch (err) {
        console.error(`Error reading notes for chapter ${chapterFilename}:`, err.message);
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
      finalSystemInstruction += `\n\nPrefer and align your explanation with the following JEE study material. Stay exam-focused and avoid unnecessary advanced theory.\n\n[${chapterFilename} notes content]\n${notesContent}`;
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

    // --- Format History for OpenAI ---
    // OpenAI uses 'assistant' role (not 'model' like Gemini), which matches our DB perfectly
    const recentHistory = history.slice(-5);
    const formattedHistory = recentHistory.map(msg => ({
      role: msg.role === 'assistant' ? 'assistant' : 'user',
      content: msg.content
    }));

    // --- Build the full messages array for OpenAI ---
    const openaiMessages = [
      { role: "system", content: finalSystemInstruction },
      ...formattedHistory,
      { role: "user", content: message }
    ];

    // --- Stream the response from GPT-4o-mini ---
    const stream = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: openaiMessages,
      stream: true,
      temperature: 0.7,
    });

    let fullAssistantResponse = '';

    for await (const chunk of stream) {
      const chunkText = chunk.choices[0]?.delta?.content || '';
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
    if (finalSessionId && history.length <= 1) {
      const titlePrompt = `Summarize this query in 3 simple words (no punctuation, no quotes): "${message}"`;
      openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: titlePrompt }],
        max_tokens: 10,
        temperature: 0,
      }).then((result) => {
        let text = result.choices[0]?.message?.content?.trim() || 'New Chat';
        text = text.replace(/[\"']/g, ''); // strip quotes
        supabase.from('chat_sessions').update({ title: text, updated_at: new Date() }).eq('id', finalSessionId).then();
      }).catch(err => console.error("Auto-titling failed:", err));
    }

    res.write('data: [DONE]\n\n');
    res.end();

  } catch (error) {
    console.error('Error generating AI response:', error);
    if (!res.headersSent) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.flushHeaders();
    }
    
    const fallbackMessage = `Hey there! 😅 I'm currently experiencing an unusually high volume of questions from other JEE aspirants and my servers are a bit overloaded. Please wait a moment and try asking your question again!`;
    
    res.write(`data: ${JSON.stringify({ chunk: fallbackMessage })}\n\n`);
    res.write('data: [DONE]\n\n');
    res.end();
  }
});

// Start the server and listen on the specified port
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
  console.log(`Send POST requests to http://localhost:${port}/chat`);
});
