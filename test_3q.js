import fs from 'fs';

async function run() {
  const history = [];

  try {
    console.log("=== Sending Question 1 ===");
    const q1 = "What are quantum numbers?";
    console.log("User:", q1);
    
    const res1 = await fetch('http://localhost:3000/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: q1, history: history })
    });
    const data1 = await res1.json();
    const answer1 = data1.response;
    
    // Add to history
    history.push({ role: 'user', content: q1 });
    history.push({ role: 'assistant', content: answer1 });

    console.log("\n=== Sending Question 2 ===");
    const q2 = "Can you explain the magnetic one in more detail?";
    console.log("User:", q2);
    
    const res2 = await fetch('http://localhost:3000/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: q2, history: history })
    });
    const data2 = await res2.json();
    const answer2 = data2.response;

    // Add to history
    history.push({ role: 'user', content: q2 });
    history.push({ role: 'assistant', content: answer2 });

    console.log("\n=== Sending Question 3 ===");
    const q3 = "How does this relate to the shapes of s and p orbitals that you mentioned?";
    console.log("User:", q3);
    
    const res3 = await fetch('http://localhost:3000/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: q3, history: history })
    });
    const data3 = await res3.json();
    const answer3 = data3.response;

    // Write results properly to a markdown file to easily read
    const finalReport = `### Test: 3 Related Questions (Atomic Structure)

**User Q1:** ${q1}
**AI A1:**
${answer1}

---
**User Q2:** ${q2}
**AI A2:**
${answer2}

---
**User Q3:** ${q3}
**AI A3:**
${answer3}
`;
    fs.writeFileSync('d:/JEEAI/test_3_questions_result.md', finalReport);
    console.log("\nSuccessfully generated the 3-question sequence!");

  } catch (error) {
    console.error("Test Error:", error);
  }
}

run();
