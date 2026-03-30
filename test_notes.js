import fs from 'fs';

async function run() {
  try {
    console.log("=== Question 1 (Triggers chemical_bonding) ===");
    const res1 = await fetch('http://localhost:3000/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: "What is VSEPR theory and hybridization?" })
    });
    const data1 = await res1.json();
    console.log(data1.response);

    console.log("\n=== Question 2 (Triggers atomic_structure) ===");
    const res2 = await fetch('http://localhost:3000/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: "Explain the four quantum numbers and orbitals." })
    });
    const data2 = await res2.json();
    console.log(data2.response);

    console.log("\n=== Question 3 (No Trigger) ===");
    const res3 = await fetch('http://localhost:3000/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: "What is the capital of France?" })
    });
    const data3 = await res3.json();
    console.log(data3.response);

  } catch (error) {
    console.error("Test Error:", error);
  }
}

run();
