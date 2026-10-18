// Load a built-in helper that looks up a website name on the internet
import { lookup } from "dns/promises";

// THE CODE CHECK: checks an address before any tool runs
export async function checkAddress(address: string) {
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