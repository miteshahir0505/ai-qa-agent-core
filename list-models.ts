// Load the secret key from the .env file
import "dotenv/config";

// Load the library that talks to the AI
import OpenAI from "openai";

// Set up the connection to Groq, using your key
const client = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});

// Asks Groq for the list of models and prints their names
async function listModels() {
  try {
    const response = await client.models.list();

    // Collect the names into a list
    const names: string[] = [];
    for (const model of response.data) {
      names.push(model.id);
    }
    names.sort();

    // Print them
    console.log("Models your Groq key can use (" + names.length + "):");
    for (const name of names) {
      console.log("  " + name);
    }
  } catch (error: any) {
    console.log("Could not get the list: " + error.message);
  }
}

// Run the function
listModels();