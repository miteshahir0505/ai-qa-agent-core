// Load the tool we wrote in tools.ts
import { checkEndpoint } from "./tools";

// A function that tries the tool on two addresses
async function tryTool() {
  // A working address
  const healthy = await checkEndpoint("https://www.google.com");
  console.log(healthy);

  // An address that does not exist
  const notExist = await checkEndpoint("https://examples123.com");
  console.log(notExist);

  // An address that sends Bad Request - the request was wrong
  const badRequest = await checkEndpoint("https://httpbin.org/status/400");
  console.log(badRequest);

  // An address that sends Unauthorized - login or key needed
  const unauthorizedRequest = await checkEndpoint("https://httpbin.org/status/401");
  console.log(unauthorizedRequest);

  // An address that sends Forbidden - access is not allowed
  const forbiddenRequest = await checkEndpoint("https://httpbin.org/status/403");
  console.log(forbiddenRequest);

  // An address that sends Not Found - the page does not exist
  const notFound = await checkEndpoint("https://httpbin.org/status/404");
  console.log(notFound);

  // An address that sends Server Error - the site has a problem
  const serverError = await checkEndpoint("https://httpbin.org/status/500");
  console.log(serverError);
}



// Run the function
tryTool();