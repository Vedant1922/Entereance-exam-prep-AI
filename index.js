import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
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

    // 3. Select the Gemini model. "gemini-2.5-flash" is the recommended model for general text tasks in 2026.
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

    // 4. Handle history safely: keep only the last 5 messages to avoid long context window
    const recentHistory = history.slice(-5);

    // 5. Format messages for Gemini API chat-style format
    // Map 'user' -> 'user', and 'assistant' -> 'model'
    const formattedHistory = recentHistory.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));

    // 6. Start a chat session using the correctly formatted history
    const chat = model.startChat({
      history: formattedHistory
    });

    // 7. Send the new user message to the chat session
    const result = await chat.sendMessage(message);
    const aiResponseText = result.response.text();

    // 8. Send the AI response back to the client as JSON
    res.json({ response: aiResponseText });

  } catch (error) {
    // Log the error for debugging purposes
    console.error('Error generating AI response:', error);
    
    // Return a generic error message to the client indicating a server issue
    res.status(500).json({ error: 'Failed to generate response. Check API key and server logs.' });
  }
});

// Start the server and listen on the specified port
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
  console.log(`Send POST requests to http://localhost:${port}/chat`);
});
