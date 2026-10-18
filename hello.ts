// Load the secret key from the .env file
import "dotenv/config";

// Load the library that talks to the AI
import OpenAI from "openai";

// Set up the connection to Groq, using your key
const client = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});

// A function that sends one question and prints the answer
async function askAI() {
  const response = await client.chat.completions.create({
    model: "openai/gpt-oss-20b",
    messages: [{ role: "user", content: "Say hello in one sentence." }],
  });

  console.log(response.choices[0].message.content);
}

// Run the function
askAI();