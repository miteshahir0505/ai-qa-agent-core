// The menu that tells the AI which tools exist and how to use them
export const toolMenu = [
  {
    type: "function",
    function: {
      // The name must match the function in tools.ts
      name: "checkEndpoint",
      // Plain-English description, so the AI knows when to pick this tool
      description:
        "Visits a web address and reports the status code, what it means, and how long it took. Use it to check whether a website or API is up.",
      
      // The information the AI must give us to use this tool
      parameters: {
        type: "object",
        properties: {
          url: {
            type: "string",
            description: "The full web address, starting with https://",
          },
        },
        required: ["url"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "checkJsonField",
      description:
        "Fetches JSON data from a web address and checks whether a named field exists in it, and what value it holds. Use it to verify the content of an API response.",
      parameters: {
        type: "object",
        properties: {
          url: {
            type: "string",
            description: "The full web address that returns JSON data",
          },
          fieldName: {
            type: "string",
            description: "The name of the field to look for, for example title",
          },
        },
        required: ["url", "fieldName"],
      },
    },
  },
];