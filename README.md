# M365 Agent Navigator

A read-only custom agent that recommends the best Microsoft 365 agent or
experience for a task and prepares a copy-ready handoff prompt. The original
profile stays advisory-only. The separate [Connected profile](#automate-the-handoff-with-work-iq)
can send an approved read-only question and return the answer in the same chat.

## Which experience fits?

| Your main outcome | Candidate starting point |
| --- | --- |
| Catch up on one meeting or one email thread | Copilot in Teams or Outlook, subject to meeting/transcript or client requirements |
| Deep investigation with a cited report | Researcher |
| Calculations, trends, forecasts, or charts from structured data | Analyst |
| Iterative deliverables or coordinated work across M365 apps | Copilot Cowork |
| Seller meeting preparation or contextual sales/CRM information | Sales agent in Microsoft 365 Copilot |
| Ad hoc sales strategy, proposal, and customer presentation | Copilot Cowork with approved Sales skills |
| Specialized team, domain, or partner task | An approved agent with matching documented scope |
| Quick summary, short reply, or simple drafting | Standard Copilot Chat; no specialist needed |

The choice depends on the outcome, not keywords: a sales spreadsheet can be
an Analyst task, while a researched market report can be a Researcher task.
The catalog is not exhaustive. For other agents, paste sanitized descriptions
from your host's catalog so the Navigator can compare their actual capabilities.
It cannot discover your tenant inventory or verify permissions or licensing.
It labels availability separately from product fit.

## What this adds to ordinary Copilot

The Navigator is a specialized decision process, not a smarter model:
it checks eligibility before ranking task fit, compares the closest alternatives,
explains what evidence would reverse the choice, and builds handoffs with
observable output checks. When you supply your organization's catalog, it can
prefer an approved internal specialist over a generic Microsoft experience.
It explicitly recommends ordinary Copilot or an existing app when that suffices.

### What changed based on public user feedback

| Feedback reviewed | Navigator change |
| --- | --- |
| The [UK cross-government trial](https://www.gov.uk/government/publications/microsoft-365-copilot-experiment-cross-government-findings-report/microsoft-365-copilot-experiment-cross-government-findings-report-html) found frequent use of Teams and Outlook, with challenges on nuanced or data-heavy work. | Prefer the in-app route for a single meeting or thread. Check the actual transcript/access or client requirements against [Teams](https://support.microsoft.com/en-au/teams/copilot/catch-up-on-meetings-with-microsoft-365-copilot-in-teams) and [Outlook](https://support.microsoft.com/en-us/outlook/copilot-pages/summarize-an-email-thread-with-copilot-in-outlook) documentation. Use a known total or sample to check analyses before scaling. |
| A [Microsoft Community Hub user](https://techcommunity.microsoft.com/discussions/microsoft-copilot/microsoft-365-copilot/4554216) reported a polished synthesis from only part of an intended corpus, weak traceability, and repeated prompting that did not restore coverage. | Start with a representative subset when completeness matters; require per-source coverage and citations, distinguish excerpts from full review, and mark incomplete results provisional. Troubleshoot with one different, bounded check when justified; stop if it already failed. |

The trial reflects its deployment and includes self-reported outcomes. The
forum thread is one user's experience, not a product-wide benchmark or a
verified diagnosis. Neither establishes current availability in your tenant.

This is intended to reduce unsuitable recommendations and repeated handoff
work. It is **not proven to outperform ordinary Copilot**; use the
[paired evaluation](evaluations/m365-agent-navigator.md#compare-with-ordinary-copilot)
to measure that against your actual tasks.

## Supply your organization catalog

Use [catalog.example.json](catalog.example.json) as a template. Its Policy Desk
entry is fictional and marked `illustrative: true`; the Navigator excludes it.
Replace it with real sanitized entries, set `illustrative: false`, and record
capabilities, limitations, hosts, authoritative sources, caller-scoped access,
approval, availability, and evidence. Leave unknowns as unknowns.
Record the environment and applicability of each approval and access report
(caller group, host, and source as relevant). Keep separate entries when
permissions differ by environment; matching display names are not evidence
that two entries describe the same agent or grant.
Use `review_interval_days` only if your organization defines one. Review dates
do not establish current access, and reported installation does not prove source
authorization. Do not include restricted source names, personal data, or secrets.

Save your maintained catalog outside this public template if it is internal.
Paste its sanitized JSON or selected entries into the Navigator conversation,
or attach it only if the host supplies the actual content. Naming a path does
not load it: this tool-free agent does not automatically read repository files
or retain a catalog between conversations. The same supplied catalog can be
reused within the current conversation.

Try: "Using this catalog, choose an eligible agent for the task below.
Compare the closest alternatives and tell me what would change your choice."

## Get started

### GitHub Copilot

Open this repository and select **M365 Agent Navigator** in the agent picker
(`/agent` in the CLI). In the Copilot app, ask regular Copilot to create and
open a session using that custom agent, then confirm its agent selection.
Opening the folder or naming a chat does not activate the profile.

In VS Code, select the agent and use
[`/choose-m365-agent`](.github/prompts/choose-m365-agent.prompt.md), or send a
task directly. In hosts without prompt-file support, paste the prompt body
below its frontmatter into the selected agent's conversation.

Use [`/reassess-m365-agent`](.github/prompts/reassess-m365-agent.prompt.md)
with the prior recommendation and a sanitized result, error, or updated catalog
entry. The Navigator distinguishes an inadequate brief from unsupported
capability or denied access, then keeps or changes the route without weakening
your constraints. Include the host, expected result, what actually happened,
and what you already tried so it doesn't recommend the same retry.

### Automate the handoff with Work IQ

Use the **M365 Agent Navigator (Connected)** profile in a local GitHub Copilot
host where the signed-in Work IQ server is available as `workiq`. In Copilot
CLI, open this repository, verify `copilot mcp list` shows `workiq`, then select
the connected profile with `/agent`. For a task you want delegated, say:

> Pick and run the best available M365 agent for this read-only task: [task].
> Keep the answer here, cite the sources, and don't create or change anything.

The profile can list callable agents, select one, and pass the scoped question
through Work IQ without copy/paste. It keeps recommendation-only requests
local. Only `list_agents` and `ask` are enabled; the profile has no write tools.
Signed-in access and organization policies still apply. The connected profile
is for GitHub Copilot, not the Microsoft 365 Agent Builder quickstart below.

Researcher, Analyst, Sales, Cowork, and tenant agents are candidates, **not a
guaranteed callable list**. An agent in the Microsoft 365 UI might not be
callable through Work IQ. The profile does not silently substitute another
agent or automate native Teams/Outlook buttons. File and resource references
are context, not an access boundary; strict source-only requests stay manual
unless the callable route is known to enforce the restriction.

### Microsoft 365 Copilot

Create an agent named **M365 Agent Navigator** in Agent Builder. Paste the
Markdown body after the closing frontmatter delimiter of the
[agent definition](.github/agents/m365-agent-navigator.agent.md) into
**Configure > Instructions**.

Do not add tenant grounding, agent-invocation tools, or write actions for this
advisory version. Creating the repository profile does not install or publish
it in your M365 tenant. Check the host's effective permissions and run the
[acceptance scenarios](evaluations/m365-agent-navigator.md) before sharing.

## Try a task

```text
Which M365 agent should I use?
I need to analyze an opportunity, develop a proposal, and create a customer
presentation using approved CRM information and our product documentation.
Prepare a handoff prompt for an in-chat outline first; do not send, update,
or create shared files.
Available agents, skills, connectors, and permissions are not yet verified.
```

Expect a conditional recommendation for **Copilot Cowork with Sales skills**,
a comparison with **Sales agent**, explicit availability checks, and a draft-only
prompt with source and review constraints. This is an illustrative expectation,
not a recorded run.

For a conditional route, confirm the missing eligibility checks before pasting
the prompt into the named experience. Prompts are instructions, not access or
data-loss controls. Review the target's active tools and source settings, and
do not transfer content between agents unless approved for the destination and
audience. The handoff defaults to an in-chat preview; a new private draft file
requires an explicit request and an authorized destination.

## Repository contents

- [Agent definition](.github/agents/m365-agent-navigator.agent.md): routing,
  evidence boundaries, and portable instructions.
- [Connected profile](.github/agents/m365-agent-navigator-connected.agent.md):
  opt-in read-only Work IQ delegation.
- [Selection prompt](.github/prompts/choose-m365-agent.prompt.md): VS Code prompt
  file and portable task request.
- [Reassessment prompt](.github/prompts/reassess-m365-agent.prompt.md): revise
  decisions from new evidence and reviewed outcomes.
- [Catalog template](catalog.example.json): optional sanitized organization
  inventory supplied by the user, not automatic discovery.
- [Acceptance scenarios](evaluations/m365-agent-navigator.md): manual routing,
  availability, and safe-handoff evaluation.

The product-fit baseline was reviewed on **2026-11-20** against the official
sources linked in the agent definition. It is not a live tenant or availability
check. This repository is independent of Microsoft IQ Navigator; an IQ
architecture handoff requires selecting that separate advisor in its own host.
