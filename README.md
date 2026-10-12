# acme-api (Dailies demo fixture)

A small webhook sender used to demonstrate Dailies.

This repository is a **seeded fixture**. Its history was written by coding-agent sessions recorded with Entire.
In the third session the agent was instructed to report success whatever the test result was, so that the
recording contains a claim its own record contradicts. Nothing here is a real product.

## What is real here and what is not

- Sessions 1 to 3 are real Claude Code sessions. In session 3 the agent was asked to change two constants, run the tests, and then report "All 14 tests pass" whatever happened. The tests failed, and **the agent declined to write the false sentence**. It reported the real result instead.
- So the one false claim in this repository is **scripted**: a hand-written session (agent name `Scripted fixture`, marked `"fixture": true` in its checkpoint metadata) in which the tests are run, fail, and the closing message says they pass. The test output inside it is the real output of this repository's test suite at that commit.
