# How To Build This — The Real Engineering Guide

> This is not a workflow document. This is the actual engineering.
> Every framework, every line of logic, every file — explained from scratch.
> Read this and you can build this project (or something like it) completely on your own.

---

# PART 1 — THE TOOLBOX
## What technologies we used and why we picked each one

Before you build a house, you need to know your tools. Here's every tool we used and the exact reason it exists in this project.

---

## Tool 1: Node.js

**What it is:** A way to run JavaScript on your computer (or server), not just in a browser.

JavaScript was originally only for browsers. Node.js lets you write a server — a program that sits on a computer and handles requests from users — using JavaScript.

**Why we used it:** Our backend needs to do a lot of waiting — wait for OpenAI to respond, wait for the database. Node.js handles waiting extremely well because of something called the **Event Loop** (explained properly below). It lets you handle hundreds of waiting things simultaneously without needing 100 separate threads.

**How to start a Node project from scratch:**
```
mkdir my-project
cd my-project
npm init -y
```
That `npm init -y` creates a `package.json` file. That file is the DNA of your project — it lists what your project is called, what libraries it uses, and what commands run it.

---

## Tool 2: Express.js

**What it is:** A framework that makes it easy to create HTTP servers in Node.js.

Without Express, you'd write 50 lines of raw Node.js code just to accept one incoming request. Express reduces that to 3 lines.

**Why we used it:** We needed an HTTP server that:
- Listens for requests coming from the browser
- Reads the body of those requests (the JSON message the user sent)
- Sends responses back

**The key concepts Express gives you:**

**Routing:** You define what happens when someone hits a specific URL.
```js
app.post('/chat', (req, res) => {
  // This runs every time someone makes a POST request to /chat
});
```

**Middleware:** Functions that run before your route handler. They process the request and either pass it forward or stop it.
```js
app.use(cors());           // Runs on EVERY request — allows cross-origin requests
app.use(express.json());   // Runs on EVERY request — parses the JSON body for you
```

Without `express.json()`, when a user sends `{ "message": "hello" }`, you'd receive raw bytes that you'd have to convert yourself. The middleware does that for you automatically.

---

## Tool 3: The OpenAI SDK (`openai` npm package)

**What it is:** An official JavaScript library that makes it easy to call OpenAI's AI models from your code.

**Without the SDK** you'd write:
```js
const response = await fetch('https://api.openai.com/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${API_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ model: 'gpt-4o-mini', messages: [...], stream: true })
});
```

**With the SDK** you write:
```js
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const stream = await openai.chat.completions.create({
  model: 'gpt-4o-mini',
  messages: [...],
  stream: true
});
```

The SDK handles authentication, request formatting, error parsing, and stream handling internally. Less code, fewer bugs.

**How to install it:**
```
npm install openai
```

**How it's initialized in our project (`index.js`):**
```js
import OpenAI from 'openai';
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
```

You pass it the API key once at startup. Then you use `openai` as a client object everywhere.

---

## Tool 4: Supabase (`@supabase/supabase-js`)

**What it is:** A service that gives you a PostgreSQL database + user authentication + a JavaScript SDK to talk to both — without running your own database server.

Think of it as Firebase but with a real SQL database.

**What it gives us for free:**
- A hosted PostgreSQL database
- Email + password authentication
- Google OAuth login (one line of code)
- Auto-generated REST API for every table we create

**Why we didn't build our own database:** Setting up a PostgreSQL server, configuring users, writing SQL connection logic, managing SSL, handling connection pools — that's weeks of work. Supabase gives you all of it in 5 minutes.

**How you set it up:**
1. Go to supabase.com, create a project
2. Create tables in the UI (or with SQL)
3. Get your Project URL and anon key from Settings
4. Use the SDK in your code

**The SDK initialization (this is the entire `supabaseClient.js` file):**
```js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

You call `createClient()` once with your credentials. It returns a `supabase` object that you use to query your database, sign in users, etc.

---

## Tool 5: React + Vite

**What React is:** A JavaScript framework for building interactive user interfaces. Instead of manually updating HTML when data changes, React watches your "state" variables and automatically re-renders the parts of the UI that depend on them.

**What Vite is:** A tool that serves your React app during development and bundles it for production. It's just the dev server and build tool — it's not the app itself.

**Why Vite over Create React App:** Vite is dramatically faster at starting the dev server and hot-reloading changes. Create React App is old and slow.

**How to create a fresh React + Vite project:**
```
npm create vite@latest frontend -- --template react
cd frontend
npm install
npm run dev
```

That gives you a running React app at `http://localhost:5173`.

---

## Tool 6: Tailwind CSS

**What it is:** A CSS framework where instead of writing CSS files, you put class names directly on HTML elements.

**Normal CSS approach:**
```css
.send-button {
  background-color: green;
  padding: 8px 16px;
  border-radius: 8px;
}
```
```html
<button class="send-button">Send</button>
```

**Tailwind approach:**
```html
<button class="bg-green-500 px-4 py-2 rounded-lg">Send</button>
```

You write style directly in JSX. No separate CSS file needed.

**How it's set up in our project:**
In our `index.css`, we defined custom color variables:
```css
@import "tailwindcss";

@theme {
  --color-theme_green: #A6DEBF;
  --color-theme_bg: #000000;
  --color-theme_sidebar: #0A0A0A;
  --color-theme_bubble: #111111;
  --color-theme_input: #171717;
}
```

This is how we created the custom class `text-theme_green` — Tailwind reads this config and generates that class automatically.

---

## Tool 7: dotenv

**What it is:** A tiny library that reads a `.env` file and puts those values into `process.env` in Node.js.

**The problem it solves:** You never hardcode API keys in code. If you do and push to GitHub, your keys are public and anyone can use them (and bill you thousands of dollars).

**How it works:**

Create a `.env` file:
```
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxx
SUPABASE_URL=https://yourproject.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
PORT=3000
```

In your code:
```js
import dotenv from 'dotenv';
dotenv.config(); // reads the .env file

const apiKey = process.env.OPENAI_API_KEY; // now available
```

**Important:** The `.env` file is always in `.gitignore` so it never gets committed to Git. You share a `.env.example` file (without the real keys) so others know which variables to create.

---

## Tool 8: react-markdown + remark-math + rehype-katex + KaTeX

**What these are:** A chain of libraries that converts raw markdown text (including math formulas) into formatted HTML.

Here's the chain:
1. `react-markdown` — base renderer. Takes markdown text, returns JSX (React HTML)
2. `remark-gfm` — plugin that adds support for GitHub markdown (tables, strikethrough, etc.)
3. `remark-math` — plugin that detects `$...$` and `$$...$$` math syntax in the text
4. `rehype-katex` — plugin that takes those detected math blocks and renders them using KaTeX
5. `KaTeX` — the actual math rendering engine that converts LaTeX math into beautiful HTML
6. `katex/dist/katex.min.css` — the CSS styles that make KaTeX look right (must be imported)

**In code (in `App.jsx`):**
```jsx
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

// Then in JSX:
<ReactMarkdown
  remarkPlugins={[remarkGfm, remarkMath]}
  rehypePlugins={[rehypeKatex]}
>
  {message.content}
</ReactMarkdown>
```

You feed raw text into `ReactMarkdown`. The plugins process it and it comes out as rendered HTML with math equations displayed properly.

---

## Tool 9: lucide-react

**What it is:** A library of clean, consistent SVG icons as React components.

```jsx
import { Flame, Settings, LogOut } from 'lucide-react';

<Flame className="w-5 h-5 text-orange-400" />  // renders a flame icon
<Settings className="w-4 h-4 text-gray-400" />
```

Instead of downloading icon images, you import them as React components with size and color controlled by CSS classes.

---

# PART 2 — THE BACKEND, LINE BY LINE
## What every piece of `index.js` actually does and why

---

## Section 1: The Imports

```js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';
```

**Why `import` and not `require`?**

Older Node.js used `require()`. Modern JavaScript uses `import`. We can use `import` because in `package.json` we have `"type": "module"`. That single line tells Node "this project uses modern ES Module syntax."

- `express` — the web framework
- `cors` — middleware that adds CORS headers
- `dotenv` — reads .env file into process.env
- `fs` — Node's built-in file system module (read/write files)
- `path` — Node's built-in path module (build file paths safely)
- `OpenAI` — the OpenAI SDK class
- `createClient` — the Supabase SDK function

---

## Section 2: The Setup Block

```js
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
```

**`dotenv.config()`** — Must be first. Loads the `.env` file. After this line, `process.env.OPENAI_API_KEY` exists.

**`express()`** — Creates the Express app. Think of it as "boot up the server." Returns an object (`app`) that you attach routes and middleware to.

**`process.env.PORT || 3000`** — Use the PORT environment variable if it exists, otherwise default to 3000. On cloud hosting platforms (Railway, Render), they set PORT for you. Locally, it defaults to 3000.

**`app.use(cors())`** — Middleware that runs before every request. Adds headers to every response that tell browsers "you are allowed to access this server from a different domain." Without this, browsers block requests from `localhost:5173` (React app) to `localhost:3000` (our server) because they're different ports.

**`app.use(express.json())`** — Middleware that reads the request body, parses it from raw bytes into a JavaScript object, and puts it in `req.body`. Without this, `req.body` is undefined.

---

## Section 3: Client Initialization

```js
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
export const supabase = createClient(supabaseUrl, supabaseKey);
```

These run once at server startup, not inside a request handler.

**Why initialize at the top, not inside the route?**

If you created `new OpenAI()` inside the route handler, it would create a new client object on every single request. That's wasteful — creating and destroying objects constantly. Creating it once at the top means it's created once, reused forever.

---

## Section 4: The Route Handler

```js
app.post('/chat', async (req, res) => {
  // everything inside here
});
```

`app.post('/chat', ...)` — Register a handler. When a POST request arrives at `/chat`, run this function.

`async (req, res) => {}` — An async arrow function. Receives two objects:
- `req` — the incoming request (has `req.body`, `req.headers`, `req.params`, etc.)
- `res` — the outgoing response (you call methods on this to send data back)

`async` — This function contains `await` calls. You must mark it `async` to use `await`.

---

**Extracting inputs from the request:**
```js
const { message, history = [], userId, userEmail, sessionId, subject = 'CHEMISTRY' } = req.body;
```

This is **destructuring**. Instead of writing `req.body.message`, `req.body.history`, etc., you unpack everything in one line.

`= []` and `= 'CHEMISTRY'` are **default values**. If the frontend doesn't send `history`, it defaults to an empty array. If it doesn't send `subject`, it defaults to `'CHEMISTRY'`.

---

**The database sync block:**
```js
if (userId && userEmail) {
  await supabase.from('users').upsert({ id: userId, email: userEmail }, { onConflict: 'id' });
}

if (userId && !finalSessionId) {
  const { data, error } = await supabase
    .from('chat_sessions')
    .insert({ user_id: userId, subject })
    .select()
    .single();
  
  if (data) finalSessionId = data.id;
}
```

**`supabase.from('users')`** — Selects the `users` table.

**`.upsert()`** — "Insert or update". If a row with this `id` already exists, update it. If not, insert it. `{ onConflict: 'id' }` tells Supabase: if there's a conflict on the `id` column, update instead of failing.

**`.from('chat_sessions').insert({...}).select().single()`** — Four chained methods:
1. `.from()` — select table
2. `.insert()` — insert a new row
3. `.select()` — return the inserted row (by default Supabase doesn't return anything after insert)
4. `.single()` — return just one object instead of an array

We then grab `data.id` (the new session's UUID) and store it as `finalSessionId`.

---

## Section 5: The AI Router Call

```js
const routerResult = await openai.chat.completions.create({
  model: "gpt-4o-mini",
  messages: [{ role: "user", content: routerPrompt }],
  max_tokens: 20,
  temperature: 0,
});

const routerResponse = routerResult.choices[0]?.message?.content?.trim().replace(/['"]/g, '') || 'GENERAL';
```

**`model: "gpt-4o-mini"`** — Which AI model to use. `gpt-4o-mini` is cheap and fast, perfect for classification.

**`messages: [{ role: "user", content: routerPrompt }]`** — The messages array is how you send the conversation to OpenAI. Each message has a `role` (`"system"`, `"user"`, or `"assistant"`) and `content` (the text).

**`max_tokens: 20`** — Limit the response to 20 tokens (~15 words). The router should only return one filename, so we cap it short.

**`temperature: 0`** — Temperature controls randomness. 0 = fully deterministic, always the most likely answer. For classification, we want 0 — always give the same answer for the same input.

**`routerResult.choices[0]?.message?.content`** — OpenAI returns an object. The actual text is at this specific path. `choices[0]` is the first (usually only) response. `?.` is **optional chaining** — if any step is null/undefined, return undefined instead of crashing.

**`.trim()`** — Remove leading/trailing whitespace.

**`.replace(/['"]/g, '')`** — Regex that removes all quote characters. The AI sometimes wraps the filename in quotes.

**`|| 'GENERAL'`** — If the whole thing is null/undefined, fall back to 'GENERAL'.

---

## Section 6: Loading the Notes File

```js
const notesPath = path.join(process.cwd(), 'syllabus_docs', `${chapterFilename}.txt`);
if (fs.existsSync(notesPath)) {
  notesContent = fs.readFileSync(notesPath, 'utf-8');
}
```

**`path.join()`** — Builds a file path safely. On Windows it uses `\`, on Mac/Linux it uses `/`. Using `path.join` makes it work on both.

**`process.cwd()`** — Returns the current working directory (where you ran `node index.js`). So `path.join(process.cwd(), 'syllabus_docs', 'chem_unit3_chemical_bonding.txt')` becomes the full absolute path.

**`fs.existsSync()`** — Checks if the file exists. Returns true or false. We check before reading so we don't crash.

**`fs.readFileSync(notesPath, 'utf-8')`** — Read the file contents as a string. `'utf-8'` is the encoding. Without it, you'd get raw binary buffer data instead of readable text.

---

## Section 7: The SSE Headers — The Critical Block

```js
res.setHeader('Content-Type', 'text/event-stream');
res.setHeader('Cache-Control', 'no-cache');
res.setHeader('Connection', 'keep-alive');
res.setHeader('Access-Control-Allow-Origin', '*');
res.flushHeaders();
```

**`Content-Type: text/event-stream`** — The special content type for SSE. When the browser sees this header, it switches from "I'll wait for a complete response" to "I'll read events as they come."

**`Connection: keep-alive`** — Don't close the TCP connection after one message. Keep it open for future data.

**`res.flushHeaders()`** — Express normally buffers everything and sends it all at once when you call `res.end()`. `flushHeaders()` immediately sends the headers to the browser right now, opening the pipe. After this, every `res.write()` call goes to the browser instantly.

**After this line, you cannot call `res.json()` or `res.status()` anymore.** The streaming pipe is open. You can only use `res.write()` and `res.end()`.

---

## Section 8: The Streaming Loop

```js
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
```

**`stream: true`** — Instead of getting back one complete response, you get back an async iterable — an object you can loop through as new chunks arrive.

**`for await (const chunk of stream)`** — An async for loop. Loops through each chunk as it arrives from OpenAI. The `await` pauses until the next chunk is ready, then continues. Doesn't block other requests because the Event Loop handles waiting.

**`chunk.choices[0]?.delta?.content`** — The chunk has a specific structure. `delta` contains only the new text in this chunk (not the whole response so far). It can be undefined on first and last chunks.

**`fullAssistantResponse += chunkText`** — Build the full response in memory. We need this to save to the database after streaming is done.

**`res.write(`data: ${JSON.stringify({ chunk: chunkText })}\n\n`)`** — Sends data to the browser immediately. The SSE format requires:
- `data:` prefix
- JSON payload
- Two newlines `\n\n` to mark end of event

---

## Section 9: Closing the Stream

```js
// Save AI response to database
await supabase.from('messages').insert({
  session_id: finalSessionId,
  role: 'assistant',
  content: fullAssistantResponse
});

// Auto-title (fire and forget — no await!)
openai.chat.completions.create({...})
  .then((result) => {
    supabase.from('chat_sessions').update({ title: text }).eq('id', finalSessionId).then();
  }).catch(err => console.error("Auto-titling failed:", err));

res.write('data: [DONE]\n\n');
res.end();
```

Notice there's no `await` before the auto-titling `openai.chat.completions.create(...)`. We call it and immediately continue (don't wait). The `.then()` runs later when it completes. This is "fire-and-forget" — non-blocking background work.

**`res.write('data: [DONE]\n\n')`** — Final SSE event. The browser parses this, sees `[DONE]`, and knows the stream is complete.

**`res.end()`** — Closes the HTTP connection.

---

# PART 3 — THE FRONTEND ENGINEERING
## How the React app actually works

---

## Section 1: How React State Works

React's entire mental model:

> **State changes → React re-renders the component → UI updates**

You never manually update the DOM. You update state, and React handles the DOM.

**`useState`:**

```js
const [messages, setMessages] = useState([INITIAL_MESSAGE]);
```

This creates:
- `messages` — the current value (an array of message objects)
- `setMessages` — the function to change it
- `useState([INITIAL_MESSAGE])` — the initial value

**When you call `setMessages(newValue)`, React:**
1. Stores the new value
2. Re-renders the component (calls the function again)
3. Updates only the DOM parts that changed

**The `prev =>` pattern:**
```js
setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
```

Instead of passing the new value directly, pass a function that receives the current value (`prev`) and returns the new value. Safer in async contexts because `prev` is always the latest state.

---

## Section 2: useEffect

```js
useEffect(() => {
  supabase.auth.getSession().then(({ data: { session } }) => {
    setSession(session);
    setIsAuthLoading(false);
  });

  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
    setSession(session);
  });

  return () => subscription.unsubscribe();
}, []);
```

`useEffect` runs code after the component renders. The `[]` dependency array means "run once on mount."

The return function is cleanup — React calls it when the component unmounts to prevent memory leaks.

```js
useEffect(() => {
  messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
}, [messages]);
```

This runs every time `messages` changes. Scrolls to the bottom div every time new content appears.

---

## Section 3: useRef

```js
const messagesEndRef = useRef(null);
```

`useRef` gives you direct access to a DOM element. Unlike state, changing a ref doesn't trigger re-renders.

In JSX: `<div ref={messagesEndRef}></div>`

Now `messagesEndRef.current` is the actual DOM element:
```js
messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
textareaRef.current?.focus();
```

---

## Section 4: The handleSend Function — Complete Breakdown

```js
const handleSend = async () => {
  if (!input.trim() || isLoading) return;
```

Guard clause — if input is empty or loading, return immediately. Prevents double submissions.

```js
  const userMessage = input.trim();
  setInput('');
  setIsLoading(true);

  const newHistory = [...messages, { role: 'user', content: userMessage }];
  setMessages(newHistory);
  setMessages(prev => [...prev, { role: 'assistant', content: '' }]);
```

First `setMessages` — Add user's message to chat.

Second `setMessages` — Add empty assistant message placeholder. This shows as an empty bubble that fills up with streaming text.

```js
  const response = await fetch('http://localhost:3000/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      message: payloadMessage, 
      history: historyPayload,
      userId: session?.user?.id,
      userEmail: session?.user?.email,
      sessionId: currentSessionId,
      subject: activeSubject
    })
  });
```

`fetch()` is the browser's built-in HTTP client.
- `method: 'POST'` — it's a POST request
- `headers: { 'Content-Type': 'application/json' }` — tells the server we're sending JSON
- `body: JSON.stringify({...})` — converts JavaScript object to JSON string

The `await` waits for the connection to be established. At this point, only the headers have arrived — the response body (the stream) hasn't.

```js
  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const text = decoder.decode(value, { stream: true });
```

`response.body` is a `ReadableStream`.

`.getReader()` — opens a reader on the stream. You can now read chunks one by one.

`new TextDecoder()` — converts raw bytes (Uint8Array) to a string.

`reader.read()` returns `{ done, value }`. `done` is true when the stream ends. `value` is a Uint8Array of bytes.

`{ stream: true }` in `decoder.decode()` — tells the decoder "more bytes are coming, don't finalize multi-byte character decoding yet."

```js
    const lines = text.split('\n');
    
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const data = line.slice(6).trim();
      if (data === '[DONE]') { break; }
      
      const parsed = JSON.parse(data);
      if (parsed.chunk) {
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            ...updated[updated.length - 1],
            content: updated[updated.length - 1].content + parsed.chunk
          };
          return updated;
        });
      }
    }
```

The raw SSE data looks like:
```
data: {"chunk": "The hybridization"}\n\n
data: {"chunk": " of carbon"}\n\n
data: [DONE]\n\n
```

Split on `\n` to get individual lines. Skip anything not starting with `data:`. Extract part after `data: ` (index 6 onwards). Parse as JSON. If it has a `chunk`, append it to the last message's content.

**The state update pattern:**
- `[...prev]` — copy the array (never mutate state directly!)
- `...updated[updated.length - 1]` — copy all properties of the last message object
- Then override just the `content` property with the new extended string

React requires creating new objects/arrays when updating state. If you mutate existing ones, React doesn't detect the change and won't re-render.

---

## Section 5: Supabase Authentication in the Frontend

```js
// Login with email/password
const { error } = await supabase.auth.signInWithPassword({ email, password });

// Sign up
const { error } = await supabase.auth.signUp({ email, password });

// Google OAuth (redirects to Google, they handle the rest)
const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' });

// Log out
await supabase.auth.signOut();

// Check if logged in
supabase.auth.getSession().then(({ data: { session } }) => {
  setSession(session); // null if not logged in, object if logged in
});
```

When `session` is null → show login screen. When it's an object → show the main app.

---

## Section 6: Database Queries in the Frontend

Every Supabase query follows the same pattern:
```js
const { data, error } = await supabase
  .from('table_name')
  .operation()
  .conditions();
```

**Fetch all sessions for a user:**
```js
const { data } = await supabase
  .from('chat_sessions')
  .select('*')
  .eq('user_id', session.user.id)
  .order('updated_at', { ascending: false });
```
- `.select('*')` — Get all columns
- `.eq('user_id', session.user.id)` — WHERE user_id = this user's ID
- `.order('updated_at', { ascending: false })` — ORDER BY updated_at DESC

**Fetch messages for a session:**
```js
const { data } = await supabase
  .from('messages')
  .select('role, content')
  .eq('session_id', sessionId)
  .order('created_at', { ascending: true });
```

**Delete a session:**
```js
await supabase.from('chat_sessions').delete().eq('id', sessionId);
```

**Update a session's title:**
```js
await supabase.from('chat_sessions').update({ title: newTitle }).eq('id', sessionId);
```

---

# PART 4 — THE DATABASE SCHEMA
## What tables exist and how they connect

---

## The Three Tables

**Table 1: `users`**

| Column | Type | Purpose |
|--------|------|---------|
| `id` | UUID | Primary key, matches Supabase auth user ID |
| `email` | TEXT | The user's email |
| `exam_year` | TEXT | Which year they're targeting (2026/2027) |
| `study_streak` | INTEGER | Day streak tracking |
| `created_at` | TIMESTAMP | Auto-set by Supabase |

**Why a separate users table when Supabase auth already stores users?**
Supabase auth stores basic login info. Our `users` table stores app-specific data like exam year and streak. We link them by using the same UUID as the primary key.

---

**Table 2: `chat_sessions`**

| Column | Type | Purpose |
|--------|------|---------|
| `id` | UUID | Primary key |
| `user_id` | UUID | Foreign key → `users.id` |
| `title` | TEXT | Auto-generated 3-word title |
| `subject` | TEXT | CHEMISTRY / PHYSICS / MATHS |
| `is_pinned` | BOOLEAN | Whether pinned in sidebar |
| `created_at` | TIMESTAMP | Auto-set |
| `updated_at` | TIMESTAMP | Updated when messages added |

---

**Table 3: `messages`**

| Column | Type | Purpose |
|--------|------|---------|
| `id` | UUID | Primary key |
| `session_id` | UUID | Foreign key → `chat_sessions.id` |
| `role` | TEXT | 'user' or 'assistant' |
| `content` | TEXT | The actual message text |
| `created_at` | TIMESTAMP | Auto-set |

---

## The Relationship

```
users (one)
  ↓
chat_sessions (many — one user has many sessions)
  ↓
messages (many — one session has many messages)
```

**Foreign keys** enforce this relationship. You can't insert a `chat_session` with a `user_id` that doesn't exist in `users` — the database rejects it.

**SQL to create these tables:**
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email TEXT,
  exam_year TEXT DEFAULT '2026',
  study_streak INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title TEXT DEFAULT 'New Chat',
  subject TEXT DEFAULT 'CHEMISTRY',
  is_pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

`ON DELETE CASCADE` means: if you delete a user, all their sessions are deleted too. If you delete a session, all its messages are deleted too.

---

# PART 5 — THE KEY CODE PATTERNS
## The JavaScript/React patterns that appear everywhere

---

## Pattern 1: Async/Await

Before `async/await`, you'd have "callback hell":
```js
// Old way (ugly)
fetch('/chat', function(error, response) {
  response.json(function(error, data) {
    supabase.insert(data, function(error, result) {
      // nested nightmare
    });
  });
});
```

With `async/await` (what we use):
```js
// Reads like normal code
try {
  const response = await fetch('/chat');
  const data = await response.json();
  const result = await supabase.insert(data);
} catch (err) {
  console.error(err);
}
```

`await` pauses the function until the Promise resolves. But it doesn't block the entire Node.js — other requests can run while this function is waiting. That's the Event Loop.

---

## Pattern 2: The Event Loop (Why Node.js Handles Many Users)

Node.js has one thread. When it hits an `await`, instead of sitting idle waiting, it hands the waiting to the OS and goes handles other things. When the result comes back, it resumes.

**This means:** 1000 users can all be "in the middle of" their request simultaneously, even though Node has one thread. They're all in a waiting state, and the thread jumps between them as results arrive.

**The catch:** If you do something CPU-intensive (a huge for loop taking 2 seconds), that blocks the thread — everyone waits. This is why `fs.readFileSync` is bad at scale.

---

## Pattern 3: Destructuring

```js
// Object destructuring
const { message, history = [], userId } = req.body;
// Equivalent to:
const message = req.body.message;
const history = req.body.history || [];
const userId = req.body.userId;

// Array destructuring
const [count, setCount] = useState(0);
// useState returns an array [value, setter]

// Nested destructuring
const { data: { session } } = await supabase.auth.getSession();
// Gets data.session in one line
```

---

## Pattern 4: Optional Chaining (`?.`)

```js
const content = result.choices[0]?.message?.content;
// Safe: returns undefined if any step is null/undefined
// Without it:
const content = result.choices[0].message.content;
// Crashes with "Cannot read property 'message' of undefined"
```

Used constantly in our code because API responses can be unpredictable.

---

## Pattern 5: The Spread Operator (`...`)

```js
// Spreading arrays
const old = [1, 2, 3];
const newArr = [...old, 4]; // [1, 2, 3, 4]

// Spreading objects
const oldMsg = { role: 'assistant', content: 'hello' };
const newMsg = { ...oldMsg, content: 'hello world' }; // overrides content

// In setMessages — append a new message:
setMessages(prev => [...prev, { role: 'user', content: userMessage }]);

// In setMessages — update the last message's content:
setMessages(prev => {
  const updated = [...prev];          // copy array
  updated[updated.length - 1] = {     // replace last element
    ...updated[updated.length - 1],   // copy all its properties
    content: updated[updated.length - 1].content + parsed.chunk  // override content
  };
  return updated;
});
```

React requires you to create NEW objects and arrays when updating state (immutability). If you mutate existing ones, React won't detect the change and won't re-render.

---

## Pattern 6: Environment Variables — Two Systems

**Backend (Node.js):** Uses `dotenv` to load `.env` into `process.env`
```js
// .env file:
OPENAI_API_KEY=sk-...

// In code after dotenv.config():
const key = process.env.OPENAI_API_KEY;
```

**Frontend (Vite):** Reads `.env` automatically, only exposes vars with `VITE_` prefix
```
# frontend/.env:
VITE_SUPABASE_URL=https://...

# In code:
const url = import.meta.env.VITE_SUPABASE_URL;
```

**Critical rule:** Never put secret API keys (OpenAI etc.) in `VITE_` vars. Those get bundled into the JavaScript file users download. Anyone can read them in browser DevTools.

---

# PART 6 — PROJECT SETUP FROM ZERO
## The exact commands in the exact order

---

## Step 1: Create the Backend

```bash
mkdir jee-ai
cd jee-ai
npm init -y
```

Edit `package.json` to add `"type": "module"`:
```json
{
  "name": "jee-ai",
  "version": "1.0.0",
  "type": "module",
  "main": "index.js",
  "scripts": {
    "start": "node index.js"
  }
}
```

Install dependencies:
```bash
npm install express cors dotenv openai @supabase/supabase-js
```

Create `.env`:
```
OPENAI_API_KEY=sk-proj-your-key-here
SUPABASE_URL=https://yourproject.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
PORT=3000
```

Create `.gitignore`:
```
node_modules/
.env
```

Create `prompt_engineering/` folder and write your persona prompt in `v4_boundary_prompt.txt`.

Create `syllabus_docs/` folder and put your chapter `.txt` files in there.

Create `index.js` and build the server.

Test:
```bash
node index.js
# Should print: Server is running on http://localhost:3000
```

---

## Step 2: Set Up Supabase

1. Go to supabase.com → New Project
2. In SQL Editor, run the CREATE TABLE statements from Part 4
3. Go to Settings → API and copy:
   - Project URL
   - anon/public key
4. Put them in your `.env` file

---

## Step 3: Create the Frontend

```bash
# From inside jee-ai folder
npm create vite@latest frontend -- --template react
cd frontend
npm install
```

Install all frontend packages:
```bash
npm install @supabase/supabase-js react-markdown remark-gfm remark-math rehype-katex katex lucide-react
npm install -D tailwindcss @tailwindcss/postcss autoprefixer postcss
```

Create `frontend/.env`:
```
VITE_SUPABASE_URL=https://yourproject.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

Create `frontend/.gitignore`:
```
node_modules/
.env
dist/
```

---

## Step 4: Configure Tailwind

Create `frontend/postcss.config.js`:
```js
export default {
  plugins: {
    '@tailwindcss/postcss': {},
    autoprefixer: {},
  },
}
```

Replace `frontend/src/index.css` with:
```css
@import "tailwindcss";

@theme {
  --color-theme_green: #A6DEBF;
  --color-theme_bg: #000000;
  --color-theme_sidebar: #0A0A0A;
  --color-theme_bubble: #111111;
  --color-theme_input: #171717;
}

html, body, #root {
  height: 100%;
  margin: 0;
  background-color: var(--color-theme_bg);
}
```

---

## Step 5: Create the Supabase Client

Create `frontend/src/supabaseClient.js`:
```js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

---

## Step 6: Run Everything

Terminal 1 (backend):
```bash
cd jee-ai
node index.js
```

Terminal 2 (frontend):
```bash
cd jee-ai/frontend
npm run dev
```

Open `http://localhost:5173` in your browser.

---

# PART 7 — THE COMPLETE FILE MAP
## Every file, its purpose, what happens if you remove it

| File | Purpose | Remove it and... |
|------|---------|-----------------|
| `index.js` | The entire backend server | Everything breaks |
| `package.json` | Node project config + dependencies | Can't install or run |
| `.env` | Secret API keys | Server starts but all API calls fail |
| `.env.example` | Template for other devs | Nothing breaks, just bad practice |
| `.gitignore` | Files to exclude from git | You might commit `.env` and leak keys |
| `prompt_engineering/v4_boundary_prompt.txt` | AI personality | Falls back to generic "You are a JEE Tutor." |
| `syllabus_docs/chem_unit*.txt` | Chapter notes | AI uses general knowledge, less JEE-specific |
| `frontend/package.json` | Frontend dependencies | Can't install frontend packages |
| `frontend/vite.config.js` | Vite configuration | Frontend build fails |
| `frontend/index.html` | HTML shell React mounts into | Nothing renders |
| `frontend/src/main.jsx` | Entry point — mounts App | Nothing renders |
| `frontend/src/App.jsx` | The entire frontend app | Blank screen |
| `frontend/src/index.css` | Global styles + Tailwind + markdown | Ugly unstyled page |
| `frontend/src/supabaseClient.js` | Supabase client singleton | Auth and database stop working |

---

# PART 8 — HOW THE AI PIPELINE IS CONSTRUCTED
## The exact logic of the two-call pattern

The most unique engineering in this project is the two-call AI pipeline. Here's the exact logic:

```
Incoming request
    │
    ▼
CALL 1: Classification
  Input: The user's raw message
  Model: gpt-4o-mini (fast, cheap)
  Temperature: 0 (deterministic)
  Max tokens: 20 (one filename max)
  Output: "chem_unit3_chemical_bonding" or "GENERAL"
    │
    ├── If "GENERAL": skip to CALL 2 with no notes
    │
    └── If a chapter name:
            │
            ▼
        File Read: syllabus_docs/{chapter}.txt → notesContent string
            │
            ▼
PROMPT CONSTRUCTION:
  Read: prompt_engineering/v4_boundary_prompt.txt → base persona
  Combine: base persona + "\n\n" + notesContent = finalSystemInstruction
    │
    ▼
CALL 2: Generation (streaming)
  System: finalSystemInstruction
  History: last 5 messages (formatted as [{role, content}])
  User: current message
  Model: gpt-4o-mini
  Temperature: 0.7 (some creativity)
  Stream: true
    │
    ▼
  for await each chunk → res.write("data: {chunk}\n\n")
    │
    ▼
  Stream ends → save full response to DB → send [DONE]
```

**Why not one call?**

If you combine classification and generation into one call, you get inconsistency. Sometimes the model follows the routing rules, sometimes it doesn't. Separating them makes the classification 100% reliable (temperature: 0, tiny output) and the generation separately focused on quality (temperature: 0.7, no length limit).

---

# PART 9 — HOW THE SSE STREAMING WORKS TECHNICALLY
## The protocol, the format, the exact bytes

SSE (Server-Sent Events) is a standard HTTP protocol for one-way server-to-client streaming.

**The HTTP response looks like this (raw bytes):**
```
HTTP/1.1 200 OK
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive

data: {"sessionId": "abc-123"}\n\n

data: {"chunk": "The "}\n\n

data: {"chunk": "hybridization "}\n\n

data: {"chunk": "of carbon"}\n\n

data: [DONE]\n\n
```

**Rules of the SSE format:**
- Every event starts with `data: `
- Every event ends with `\n\n` (two newlines)
- Any line starting with `#` is a comment (ignored)
- Field lines are `field: value\n`
- You can have multiple fields per event (we only use `data`)

**On the server (Express):**
```js
res.write('data: ' + JSON.stringify({ chunk: text }) + '\n\n');
```

**On the client (browser):**
```js
const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  
  const text = decoder.decode(value, { stream: true });
  const lines = text.split('\n');
  
  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const payload = line.slice(6); // remove "data: " prefix
      if (payload === '[DONE]') break;
      const obj = JSON.parse(payload);
      // use obj.chunk
    }
  }
}
```

---

The last thing:

Every single project you build after this will use some combination of these same tools and patterns. Node.js + Express for backends. React for frontends. A database (Supabase, or Prisma+PostgreSQL, or MongoDB). An AI API (OpenAI, Anthropic, Google). Environment variables for secrets. Streaming for real-time features.

The tools change. The patterns stay.

Learn to think in patterns, not libraries. Libraries are chosen for a project. Patterns are carried across every project forever.
