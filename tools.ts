// http status response number into plain English
function describeStatus(code: number) {
  if (code === 200) return "OK - the site is healthy";
  if (code === 201) return "Created - something new was saved";
  if (code === 301 || code === 302) return "Redirect - the address has moved";
  if (code === 400) return "Bad Request - the request was wrong";
  if (code === 401) return "Unauthorized - login or key needed";
  if (code === 403) return "Forbidden - access is not allowed";
  if (code === 404) return "Not Found - the page does not exist";
  if (code === 429) return "Too Many Requests - slow down";
  if (code === 500) return "Server Error - the site has a problem";
  if (code === 502 || code === 503) return "Site is down or overloaded";
  return "Other status - look it up";
}


// A tool that visits a web address and reports what happened
export async function checkEndpoint(url: string) {
  // Note the time before we start
  const startTime = Date.now();

  try {
    // Visit the address
    const response = await fetch(url);

    // Work out how long it took
    const timeTaken = Date.now() - startTime;

    // Report the result
    return {
      url: url,
      status: response.status,
      meaning: describeStatus(response.status),
      timeInMs: timeTaken,
    };
  } catch (error) {
    // If the address could not be reached at all
    return {
      url: url,
      status: "failed",
      meaning: "Could not reach the address at all",
      timeInMs: Date.now() - startTime,
    };
  }
}

// A tool that fetches data from an address and checks one field inside it
export async function checkJsonField(url: string, fieldName: string) {
  try {
    // Visit the address and read the reply as JSON data
    const response = await fetch(url);
    const data = await response.json();

    // Check whether the field exists in the data
    const fieldExists = fieldName in data;

    // Report the result
    return {
      url: url,
      field: fieldName,
      exists: fieldExists,
      value: fieldExists ? data[fieldName] : null,
    };
  } catch (error) {
    // If the address failed or the reply was not JSON
    return {
      url: url,
      field: fieldName,
      exists: false,
      value: null,
      problem: "Could not read JSON from this address",
    };
  }
}