// Load the secret key from the .env file
import "dotenv/config";

// Load the library that talks to the AI
import OpenAI from "openai";

// Set up the connection to Groq, using your key
const client = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});

// Makes one small call and shows what Groq says
async function checkLimit() {
  try {
    const response = await client.chat.completions.create({
      model: "openai/gpt-oss-20b",
      messages: [{ role: "user", content: "Say hello." }],
      max_tokens: 100,
    });
    console.log("The call worked, so you are not rate limited right now.");
    console.log("Reply: " + (response.choices[0].message.content || "(empty)"));
  } catch (error: any) {
    console.log("The call failed. Status: " + error.status);
    console.log("Message: " + String(error.message).slice(0, 600));

    // Some errors tell us how long to wait
    if (error.headers && typeof error.headers.get === "function") {
      console.log("Retry after (seconds): " + error.headers.get("retry-after"));
    }
  }
}

// Run the function
checkLimit();