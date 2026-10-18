// Load the code check we want to test
import { checkAddress } from "./guardrail";

// The cases. Each one has an address and what we expect the code check to say.
const cases = [
  {
    name: "Normal website, common ending",
    address: "https://www.google.com",
    expectOk: true,
    expectWarning: false,
    expectation: "Allowed, with no warning",
  },
  {
    name: "Real website, unusual ending",
    address: "https://www.google.de",
    expectOk: true,
    expectWarning: true,
    expectation: "Allowed, but with a warning about the ending",
  },
  {
    name: "Website name that does not exist",
    address: "https://this-site-does-not-exist-98765.com",
    expectOk: false,
    expectWarning: false,
    expectation: "Blocked: the name is not found",
  },
  {
    name: "Typo of a real company name",
    address: "https://www.bluebitechnologies.com",
    expectOk: false,
    expectWarning: false,
    expectation: "Blocked: the name is not found",
  },
  {
    name: "The .cm typo",
    address: "https://www.bluebittechnologies.cm",
    expectOk: false,
    expectWarning: false,
    expectation: "Blocked: the name is not found",
  },
  {
    name: "Not a web address at all",
    address: "not a web address",
    expectOk: false,
    expectWarning: false,
    expectation: "Blocked: not a properly written address",
  },
  {
    name: "Wrong kind of address (ftp)",
    address: "ftp://www.google.com",
    expectOk: false,
    expectWarning: false,
    expectation: "Blocked: must start with http:// or https://",
  },
  {
    name: "Empty address",
    address: "",
    expectOk: false,
    expectWarning: false,
    expectation: "Blocked: not a properly written address",
  },
];

// Runs every case once and returns the results
export async function runGuardrailTests() {
  const results: any[] = [];

  for (const oneCase of cases) {
    // Ask the code check about this address
    const check = await checkAddress(oneCase.address);

    // Check 1: did it allow or block as expected?
    let passed = check.ok === oneCase.expectOk;

    // Check 2: if it was allowed, did the warning match what we expected?
    if (passed && oneCase.expectOk) {
      const gotWarning = check.warning !== "";
      if (gotWarning !== oneCase.expectWarning) {
        passed = false;
      }
    }

    // Describe what it actually did, in plain words
    let got = "allowed, no warning";
    if (!check.ok) {
      got = "blocked: " + check.reason;
    } else if (check.warning) {
      got = "allowed with a warning: " + check.warning;
    }

    results.push({
      name: oneCase.name,
      address: oneCase.address,
      expectation: oneCase.expectation,
      got: got,
      passed: passed,
    });
  }

  return results;
}