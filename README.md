# ai-qa-agent-core

A small AI agent that checks whether websites and APIs are working, plus a test suite that measures how reliably different AI models behave as that agent. It has two layers of safety: the AI model decides what to do, and plain code double-checks it.

This is Day 1 of a 7-day portfolio on QA for AI and LLM systems.

## Why this project

Many QA roles now ask for experience with LLM APIs, agentic workflows and AI testing. A good way to learn those is to build a small agent and then test it like any other product.

I chose an API-diagnostics agent because:

- QA people already know the job it does: call an endpoint, read the status code, check the response.
- It is small enough to test thoroughly, but real enough to fail in interesting ways.
- An AI that makes mistakes is the best way to show why AI systems need QA, which is what this repo is about.

## What it does

You ask a question in plain English. The agent picks a tool, checks the address, runs the tool, and explains the result.

Example questions it handles:

- "Is https://www.google.com up and running?" It checks the site and reports the status code and response time.
- "Does https://jsonplaceholder.typicode.com/todos/1 have a title field?" It fetches the JSON and checks the field.
- "Is Bluebit Technology website up?" It does not guess an address. It asks you for the full address.

The agent has two tools:

| Tool | What it does |
| --- | --- |
| `checkEndpoint` | Visits an address and reports the status code, what it means in plain English, and the response time |
| `checkJsonField` | Fetches JSON from an address and checks whether a named field exists, and what value it holds |

## What is in this repo

| File | What it does |
| --- | --- |
| `tools.ts` | The two real tools |
| `tool-menu.ts` | The description of the tools that is sent to the AI so it knows what exists |
| `rules.ts` | The written rules given to the AI (the system prompt) |
| `guardrail.ts` | The code check on web addresses, run before any tool |
| `agent.ts` | The agent loop: ask the AI, run the code check, run the tool, send the result back, repeat |
| `agent-tests.ts` | Runs the AI tests on three models, many times each, and writes the report |
| `guardrail-tests.ts` | Tests for the code check. It is called by `agent-tests.ts` |
| `test-report.md` | The latest test report, replaced on every run |
| `hello.ts` | The first smoke test: confirms the AI connection works |
| `try-tool.ts`, `try-json-tool.ts` | Run each tool on its own, with no AI involved |
| `ask-with-tools.ts` | An early experiment: the AI asks for a tool once |
| `list-models.ts` | Lists the models your API key can use |
| `check-limit.ts` | Helps find out which rate limit applies to your key |

## How it works: two layers

The agent does not trust the AI alone. It has two layers:

```
 You ask a question
        |
        v
 +-------------------------------+
 | AI LAYER                      |   The AI model reads your question and the
 | (varies from run to run)      |   rules, then picks a tool and an address.
 +-------------------------------+
        |
        v
 +-------------------------------+
 | CODE LAYER (guardrail.ts)     |   Plain code. Same answer every time.
 | 1. Is it a valid address?     |   If any check fails, the tool does not run
 | 2. Does the name exist?       |   and the AI is told why.
 | 3. Is the ending unusual?     |
 +-------------------------------+
        |
        v
 The tool runs, and the AI explains the result in plain sentences
```

What the code layer does:

- `fixAddress` (in `agent.ts`) adds `https://` if it is missing, and removes a `www.` that you never typed.
- `checkAddress` (in `guardrail.ts`) checks the format and looks the website name up on the internet. A name that does not exist is blocked.
- If the ending is unusual (for example `.cm`), the code itself asks you yes or no before running the tool. It does not depend on the AI remembering to ask.

The agent loop is also limited to 15 rounds, and it prints a clear message if it stops without a final answer.

## The problem: the Bluebit story

This project started with one real failure.

I asked the agent: "Is Bluebit Technology website up?" I had given only a company name. The AI made up an address, `bluebit.com`, and checked that. The site answered, so the agent said the website was up and running. But it was the wrong website. The real one is `https://www.bluebittechnologies.com`.

That is a **false pass**, the worst kind of failure for a QA tool, because the result looks green and is wrong.

My first fix was a written rule: "do not guess addresses, and ask first when the ending looks unusual." That helped, but not enough. On one model, the rule for an unusual ending such as `.cm` worked only about half the time, however I worded it. `.cm` is a real country ending, so the AI did not see it as a typo.

So I moved the safety into code. A written rule is a request. A code check is a guarantee. That is the two-layer design described above.

## Test results

The test suite runs 10 AI tests, 5 times each, on three models, plus 8 code-layer cases.

| Layer | Result |
| --- | --- |
| Code layer (`guardrail.ts`) | 8 of 8 cases passed |
| AI layer, `openai/gpt-oss-20b` | 44 of 50 counted runs passed (88%) |
| AI layer, `openai/gpt-oss-120b` | 45 of 50 counted runs passed (90%) |
| AI layer, `qwen/qwen3.8-27b` | 44 of 50 counted runs passed (88%) |

The full report, with every test explained (why it exists, what was expected, what the AI actually did, and the real-world risk), is in [test-report.md](test-report.md).

Two points about reading these numbers:

- AI answers vary from run to run, so each test is repeated. A pass rate below 100% means the model is unstable on that test.
- Runs that Groq's free tier refused because of rate limits are not counted as failures, because they say nothing about the AI.

## What the tests found

Real problems found while building and testing:

- **Inconsistent `www.`:** the AI sometimes added `www.` to an address that I had typed without it. Fixed in code by `fixAddress`.
- **Pointless questions:** after the code blocked a name that does not exist, the AI asked a yes or no question instead of asking for the correct address. Fixed with a new written rule.
- **A broken tool request:** one model sent a malformed tool name (`checkEndpoint<|channel|>commentary`). The agent retries a failed AI call up to 3 times.
- **A silent stop:** the loop once ended at its round limit without saying anything. It now prints a clear "Stopped" message.
- **The `.cm` gap:** in earlier runs, the written rule for unusual endings passed only about 50 to 65 percent of the time on `gpt-oss-20b`, while the other two models passed fully. This is what led to the code-level confirmation.
- **Other model behaviours:** one model leaked a `</think>` tag into a reply, ran a tool on an address it had guessed, ignored a correct address once, and picked the wrong tool once.

## Known limitations

I am listing these on purpose. A QA project should say what it does not cover.

- **Short addresses are refused by the models.** When asked "Is google.com up?" (no `https://`), the models often refuse instead of checking. I kept the rules unchanged and recorded this as a known gap.
- **Typos that are real domains get through.** The code check only catches names that do not exist. A typo such as `googel.com` that happens to be registered would pass the code layer. The AI-layer rule is the only defence there.
- **The AI-layer tests only check the first decision.** The test sees which tool the AI picks first. It does not read the full conversation, so a wrong example address in the AI's own words would pass unnoticed.
- **Some tests use the live internet.** The code-layer tests look up real website names, so a result can change if a domain gets registered or the internet is down.
- **Free-tier limits.** Groq's free tier limits how fast requests can be sent, so a full run is slow on purpose.
- **Model names change.** If a model disappears from the free tier, it is marked NOT TESTED in the report. Run `list-models.ts` to see what your key can use.

## How to run it

You need Node.js and a free Groq API key from [console.groq.com](https://console.groq.com).

1. Clone the repo and install the packages:

   ```
   git clone https://github.com/miteshahir0505/ai-qa-agent-core.git
   cd ai-qa-agent-core
   npm install
   ```

2. Create a file named `.env` in the project folder with your key. This file is ignored by Git, so your key never gets uploaded:

   ```
   GROQ_API_KEY=your-key-here
   ```

3. Run what you want:

   | Command | What it does |
   | --- | --- |
   | `npx tsx hello.ts` | Smoke test: confirms the AI connection works |
   | `npx tsx try-tool.ts` | Runs the `checkEndpoint` tool on its own |
   | `npx tsx try-json-tool.ts` | Runs the `checkJsonField` tool on its own |
   | `npx tsx agent.ts` | Runs the agent. The question is set inside `runAgent` in `agent.ts`, so edit it to try your own |
   | `npx tsx agent-tests.ts` | Runs all the tests and replaces `test-report.md` |
   | `npx tsx list-models.ts` | Lists the models your key can use |

The test run takes a while. To make it faster, lower `RUNS_PER_TEST` at the top of `agent-tests.ts`. To compare other models, change the `MODELS` list in the same file.

## What is next

This repo is Day 1 of a 7-day plan to build QA portfolio projects for AI systems:

| Day | Project | Focus |
| --- | --- | --- |
| 1 | `ai-qa-agent-core` (this repo) | Tool calling, agent loop, guardrails, multi-model tests |
| 2 | `self-healing-test-agent` | Observability, error recovery |
| 3 | `rag-qa-suite` | RAG and its evaluation |
| 4 | `llm-regression-suite` | Prompt regression, red-teaming, golden datasets |
| 5 | `mcp-qa-server` | Model Context Protocol |
| 6 | `n8n-qa-orchestrator` | Webhooks, n8n, Docker |
| 7 | `enterprise-ai-qa-pipeline` | CI, integration, presentation |