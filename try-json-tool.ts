// Load the second tool we wrote in tools.ts
import { checkJsonField } from "./tools";

// A function that tries the tool in three different situations
async function tryJsonTool() {
  // A field that exists in the data
  const found = await checkJsonField("https://jsonplaceholder.typicode.com/todos/1", "title");
  console.log(found);

  // A field that does not exist in the data
  const missing = await checkJsonField("https://jsonplaceholder.typicode.com/todos/1", "email");
  console.log(missing);

  // An address that does not return JSON data at all
  const notJson = await checkJsonField("https://example.com", "title");
  console.log(notJson);
}

// Run the function
tryJsonTool();