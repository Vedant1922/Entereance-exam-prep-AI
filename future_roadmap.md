# JEE AI - Future Roadmap & Ideas

This document tracks high-level features, monetization strategies, and architectural improvements to implemented after the primary launch.

---

### 1. Dynamic Model Routing (Cost Optimization)
**The Problem:** Using heavy, expensive models (like Gemini 1.5 Pro or GPT-4) for simple questions burns through API budget too quickly.
**The Solution:** Implement an "LLM Router" step in `index.js`.
*   A cheap, ultra-fast model (e.g., Gemini Flash) intercepts the user's question and rates its complexity (1 to 3).
*   If Level 1 (basic definitions/simple math), route the request to the strict, cheap model.
*   If Level 2 or 3 (advanced calculus, complex conceptual physics), route the request to the expensive powerhouse model.
*   **Monetization Idea:** Free users are entirely locked to the cheap model. "Premium" subscribers unlock the Heavy model for their doubts.

### 2. Zero-Cost Multi-Modal Visualizations (Flowcharts & Diagrams)
**The Problem:** Generating actual images (DALL-E, Stable Diffusion) costs between $0.02 to $0.04 per image, which kills profit margins for free student users.
**The Solution:** Use Code-Based Visualizations (Mermaid.js).
*   Instead of calling an Image API, we inject a prompt into Gemini asking it to output logic charts (like Kinematics steps or Chemistry Cycles) using `mermaid` markdown blocks.
*   Because this is purely text-generation, it costs essentially $0.
*   We add a renderer (like `react-mermaid`) to the Frontend. When the Frontend detects a markdown code block labeled `mermaid`, instead of printing the raw code, it dynamically draws a beautiful, colorful flowchart directly in the chat interface.
*   This creates an ultra-premium visual experience for the student with zero added API overhead.

### 3. Generative UI (Clickable Chat Simulators)
**The Concept:** Students struggle with concepts like Rotational Dynamics because they are hard to visualize through pure text.
**The Solution:** Implement expandable "Generative UI" logic.
*   The AI delivers a phenomenal textual breakdown and explanation of the concept first.
*   Attached below the AI's explanation, a distinct UI card or "Play" button appears (e.g., passing a `<Launcher type="rotational_simulator" />` tag).
*   When the student clicks this card, it expands into a live, interactive React applet right below the text.
*   The student can drag sliders and use the virtual simulation to deeply understand what they just read, without losing the flow of their conversation space.

### 4. Hyper-Personalized AI Mock Tests (Second USP)
**The Concept:** Standard mock tests are generic. Students need practice that aggressively targets their specific weak spots using decades of Previous Year Questions (PYQs).
**The Solution:** An "Adaptive Quiz Generator" powered by historical user data.
*   **The Brain:** We load the last 20 years of JEE Main & Advanced PYQs into a Vector Database. The AI has deep, structured knowledge of the exact exam format.
*   **The Tracking:** Every time the student asks a doubt in the chat, the backend discreetly logs the topics they struggle with into their Supabase profile (e.g., `weaknesses: ["Integration by Parts", "Optics"]`).
*   **The Quiz:** When the student clicks "Take Mock", the AI doesn't just pull random questions. It reads their Supabase profile, identifies their weakness, and extracts or generates 20 highly-specific PYQs that perfectly challenge them.
*   **Result:** A fully personalized, infinitely generating mock test engine that guarantees a higher ROI on studying time than any static textbook.

### 5. Multi-Exam Horizontal Scaling (The Ultimate Vision)
**The Concept:** Limiting the platform to only JEE leaves massive markets on the table. The platform MUST be capable of handling NEET, CUET, CA, and UPSC students seamlessly.
**The Challenge:** The backend cannot just use a single hardcoded prompt or a single folder of PDFs. It requires a dynamic, multi-tenant architecture.
**The Architecture:**
*   **Database Expansion:** The `users` table will gain an `exam_type` column (e.g. "NEET", "JEE", "CA"). 
*   **Dynamic Personas:** When the Express backend receives a message, it checks the user's `exam_type` in the session payload. It then dynamically injects an entirely different personality (e.g., "You are an elite CA mentor" vs "You are a ruthless JEE rank-builder").
*   **Multi-Vault RAG System:** Instead of dumping all notes into one folder, we build "Vector Vaults". NEET students only query the Biology/NCERT vault, while JEE students query the advanced Maths vaults. 
*   **Frontend Scaling:** The React app becomes modular. The "Subject Switcher" (Physics, Chem, Maths) will automatically read the user's `exam_type` and swap to (Biology, Chem, Physics) or (Accounts, Law, Tax) dynamically upon login.
