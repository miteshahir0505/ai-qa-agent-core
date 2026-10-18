// Load the secret key from the .env file
import "dotenv/config";

// Load the library that talks to the AI
import OpenAI from "openai";

// Load a built-in helper that lets us read what you type in the terminal
import * as readline from "readline/promises";

// Load a built-in helper that looks up a website name on the internet
import { lookup } from "dns/promises";

// Load the tool menu and the real tools
import { toolMenu } from "./tool-menu";
import { checkEndpoint, checkJsonField } from "./tools";

// Set up the connection to Groq, using your key
const client = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});

// THE CODE CHECK: checks an address before any tool runs
async function checkAddress(address: string) {
  // Check 1: is it a properly written web address?
  let parsed;
  try {
    parsed = new URL(address);
  } catch (error) {
    return { ok: false, reason: "This is not a properly written web address.", warning: "" };
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { ok: false, reason: "The address must start with http:// or https://", warning: "" };
  }

  // Check 2: does this website name exist on the internet?
  try {
    await lookup(parsed.hostname);
  } catch (error) {
    return {
      ok: false,
      reason: "The website name " + parsed.hostname + " was not found on the internet. Please check the spelling.",
      warning: "",
    };
  }

  // Check 3: warn (but do not stop) if the ending is unusual
  const commonEndings = [".com", ".org", ".net", ".in", ".io", ".co.uk", ".edu", ".gov"];
  let hasCommonEnding = false;
  for (const ending of commonEndings) {
    if (parsed.hostname.endsWith(ending)) {
      hasCommonEnding = true;
    }
  }
  if (!hasCommonEnding) {
    return {
      ok: true,
      reason: "",
      warning: "The ending of " + parsed.hostname + " is unusual. Make sure this is the website you meant.",
    };
  }

  // All checks passed
  return { ok: true, reason: "", warning: "" };
}

// Turns a tool result into a plain-English message
function showFriendlyResult(toolName: string, result: any) {
  if (toolName === "checkEndpoint") {
    if (typeof result.status === "number" && result.status >= 200 && result.status < 300) {
      console.log("Website is up and running: " + result.url);
      console.log("(status " + result.status + ", answered in " + result.timeInMs + " ms)");
    } else if (typeof result.status === "number") {
      console.log("Website answered, but with a problem: " + result.url);
      console.log("(status " + result.status + " - " + result.meaning + ")");
    } else {
      console.log("Website could not be reached: " + result.url);
    }
  }

  if (toolName === "checkJsonField") {
    if (result.exists) {
      console.log("The field '" + result.field + "' was found. Its value is: " + result.value);
    } else {
      console.log("The field '" + result.field + "' was NOT found at " + result.url);
    }
  }
}

async function askWithTools() {
  // The conversation so far: the rules first, then your question
  const messages: any[] = [
    {
      role: "system",
      content:
        "You are a QA assistant. Only use web addresses that the user typed in full. If the user gives only a name, do not guess an address. Ask for the full address instead. Before using an address, check it. The ending should be a common one such as .com, .org, .net, .in, .io, .co.uk, .edu or .gov, and the name should look correctly spelled. If the ending is unusual (for example .cm, .con or .om) or the name looks misspelled, do not use the address yet. Ask a short yes or no question, for example: Do you want me to check https://example.cm exactly as typed? (yes / no). If the user says yes, use that address as typed. If the user says no, ask them for the correct address and use the one they give.",
    },
    { role: "user", content: "Is Google website up and running?" },
  ];

  // Open a way to read what you type in the terminal
  const terminal = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  // Keep the conversation going, up to 5 rounds so it can never run forever
  for (let round = 1; round <= 5; round++) {
    // Send the conversation to the AI, along with the tool menu
    const response = await client.chat.completions.create({
      model: "openai/gpt-oss-20b",
      messages: messages,
      tools: toolMenu,
    });
    const message = response.choices[0].message;

    // Case 1: the AI wants to run a tool
    if (message.tool_calls) {
      for (const toolCall of message.tool_calls) {
        const toolName = toolCall.function.name;
        const inputs = JSON.parse(toolCall.function.arguments);

        // The code check runs first, even if you said yes
        const check = await checkAddress(inputs.url);
        if (!check.ok) {
          console.log("Address problem: " + check.reason);
          continue;
        }
        if (check.warning) {
          console.log("Note: " + check.warning);
        }

        // The check passed, so run the real tool
        let result;
        if (toolName === "checkEndpoint") {
          result = await checkEndpoint(inputs.url);
        } else if (toolName === "checkJsonField") {
          result = await checkJsonField(inputs.url, inputs.fieldName);
        }

        // Show the result in plain English
        showFriendlyResult(toolName, result);
      }
      break;
    }

    // Case 2: the AI asked you something, so show it and wait for your reply
    console.log("AI says:", message.content);
    messages.push(message);

    const reply = await terminal.question("Your reply: ");
    messages.push({ role: "user", content: reply });
  }

  // Close the terminal reader
  terminal.close();
}

// Run the function
askWithTools();