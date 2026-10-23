import * as dotenv from 'dotenv';
dotenv.config();

async function testGemini() {
  const key = process.env.GOOGLE_GEMINI_API_KEY;
  console.log('Testing Gemini API with key prefix:', key?.slice(0, 10));
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: 'Explica en 2 lineas qué es la gravedad según la creación de Dios' }] }]
      })
    });
    const data = await res.json();
    console.log('Status:', res.status);
    console.log('Response:', data?.candidates?.[0]?.content?.parts?.[0]?.text || data);
  } catch (err) {
    console.error('Error:', err);
  }
}
testGemini();
