// Load the secret key from the .env file
import "dotenv/config";

// Load the library that talks to the AI
import OpenAI from "openai";

// Load a built-in helper that lets us read what you type in the terminal
import * as readline from "readline/promises";

// Load the tool menu, the real tools, the code check, and the rules
import { toolMenu } from "./tool-menu";
import { checkEndpoint, checkJsonField } from "./tools";
import { checkAddress } from "./guardrail";
import { systemRules } from "./rules";

// The AI model we use. To try another model, change only this line.
const MODEL = "openai/gpt-oss-20b";

// The most rounds the agent may take before it stops
const MAX_ROUNDS = 15;

// Set up the connection to Groq, using your key
const client = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});

// Fixes the address the AI sent, so it matches what you typed
function fixAddress(address: string, typedText: string) {
  // If there is no address at all, return nothing
  if (!address) {
    return "";
  }

  let fixed = address.trim();

  // Add https:// if it is missing
  if (!fixed.startsWith("http://") && !fixed.startsWith("https://")) {
    fixed = "https://" + fixed;
  }

  // If you never typed www. anywhere, take it out (the AI sometimes adds it)
  const youTypedWww = typedText.toLowerCase().includes("www.");
  if (fixed.includes("://www.") && !youTypedWww) {
    fixed = fixed.replace("://www.", "://");
  }

  return fixed;
}

// Asks the AI, and tries again (up to 3 times) if the call fails
async function askAI(messages: any[]) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      return await client.chat.completions.create({
        model: MODEL,
        messages: messages,
        tools: toolMenu,
      });
    } catch (error: any) {
      // Show a short version of what went wrong
      console.log(
        "The AI call failed (attempt " + attempt + " of 3): " +
          String(error.message).slice(0, 150)
      );
      // After the third failure, give up and show the error
      if (attempt === 3) {
        throw error;
      }
    }
  }
}

async function runAgent() {
  // The conversation so far: the rules first, then your question
  const messages: any[] = [
    { role: "system", content: systemRules },
    { role: "user", content: "Is bluebitechnologies.com up?" },
  ];

  // Open a way to read what you type in the terminal
  const terminal = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  // Remember whether a tool has really run yet
  let toolHasRun = false;

  // Remember whether the run ended properly
  let finished = false;

  // Keep going, but never more than MAX_ROUNDS rounds
  for (let round = 1; round <= MAX_ROUNDS; round++) {
    // Send the conversation to the AI (with retries)
    const response = await askAI(messages);
    const message = response.choices[0].message;

    // Remember what the AI said or asked for
    messages.push(message);

    // Case 1: the AI wants to run a tool
    if (message.tool_calls) {
      for (const toolCall of message.tool_calls) {
        const toolName = toolCall.function.name;
        const inputs = JSON.parse(toolCall.function.arguments);

        // Collect everything you have typed so far
        let typedText = "";
        for (const oneMessage of messages) {
          if (oneMessage.role === "user") {
            typedText = typedText + " " + oneMessage.content;
          }
        }

        // Fix the address, and tell you if we changed it
        const fixedUrl = fixAddress(inputs.url, typedText);
        if (fixedUrl !== inputs.url) {
          console.log("Address adjusted: " + inputs.url + " -> " + fixedUrl);
          inputs.url = fixedUrl;
        }

        console.log("AI asked to run: " + toolName, inputs);

        // The code check runs first, even if you said yes
        const check = await checkAddress(inputs.url);

        // This holds whatever we hand back to the AI
        let result: any = { error: "Unknown tool" };

        // This says whether the tool is allowed to run
        let allowed = true;

        if (!check.ok) {
          // The code check blocked it, so tell the AI why
          console.log("Code check blocked it: " + check.reason);
          result = { error: check.reason };
          allowed = false;
        } else if (check.warning) {
          // The address has an unusual ending, so the CODE asks you
          console.log("Note: " + check.warning);
          const answer = await terminal.question(
            "Do you want to check this address anyway? (yes / no): "
          );
          const saidYes = answer.trim().toLowerCase() === "yes" || answer.trim().toLowerCase() === "y";
          if (!saidYes) {
            console.log("Stopped by you: the tool did not run.");
            result = { error: "The user chose not to check this address." };
            allowed = false;
          }
        }

        // Run the real tool only if it is allowed
        if (allowed) {
          if (toolName === "checkEndpoint") {
            result = await checkEndpoint(inputs.url);
          } else if (toolName === "checkJsonField") {
            result = await checkJsonField(inputs.url, inputs.fieldName);
          }
          console.log("Tool result:", result);
          toolHasRun = true;
        }

        // Hand the result back to the AI
        messages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: JSON.stringify(result),
        });
      }
      // Go around again so the AI can read the result
      continue;
    }

    // Case 2: the AI is talking to you
    const text = message.content || "";
    console.log("AI says: " + text);

    // If a tool has really run, this is the final answer, so we are done
    if (toolHasRun) {
      finished = true;
      break;
    }

    // Otherwise wait for your reply. Type exit to stop.
    const reply = await terminal.question("Your reply (or type exit to stop): ");
    if (reply.trim().toLowerCase() === "exit") {
      finished = true;
      break;
    }
    messages.push({ role: "user", content: reply });
  }

  // If we ran out of rounds, say so clearly instead of ending silently
  if (!finished) {
    console.log("Stopped: reached the limit of " + MAX_ROUNDS + " rounds without a final answer.");
  }

  // Close the terminal reader
  terminal.close();
}

// Run the function
runAgent();