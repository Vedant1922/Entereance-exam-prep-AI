  import fs from 'fs';

async function run() {
  try {
    const res1 = await fetch('http://localhost:3000/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: "lets start with hyberddisation today" })
    });
    const data1 = await res1.json();
    const answer1 = data1.response;

    const res2 = await fetch('http://localhost:3000/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: "cant understand , explain in simpler language",
        history: [
          { role: 'user', content: "lets start with hyberddisation today" },
          { role: 'assistant', content: answer1 }
        ]
      })
    });
    const data2 = await res2.json();
    
    fs.writeFileSync('d:/JEEAI/memory_result.md', "### Question 1 Response\n" + answer1 + "\n\n### Question 2 Response\n" + data2.response);
  } catch (error) {
    console.error("Test Error:", error);
  }
}

run();
