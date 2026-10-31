# Abroad Application Hub — Antigravity handoff

This folder is the product and build brief for a responsive web app that helps students manage study-abroad program and scholarship applications. Read these files in order:

1. `PRODUCT_SPEC_AND_PRD.md` — product definition, audience, requirements, scope, and acceptance criteria.
2. `APP_FLOW.md` — primary user journeys and screen states.
3. `UI_UX_DESIGN_SYSTEM.md` — selected visual direction, layouts, interaction and copy rules.
4. `BACKEND_SCHEMA.md` — data model, RLS rules, source ingestion, and RAG flow.
5. `IMPLEMENTATION_PLAN.md` — suggested build sequence and launch gates.
6. `AGENTS.md` — instructions for the coding agent working in this project.

## Project constraints

- Deploy using free tiers only. Do not add paid services or enable paid upgrades without explicit approval.
- Responsive on phone and desktop.
- New accounts start empty. Never seed fake applications, universities, scholarships, documents, or status updates in production.
- Use source-grounded answers with citations; distinguish verified source facts from generated preparation suggestions.
- Keep user data private and isolated between accounts.
- Use the Warm Paper + Forest theme selected by the user.
- No Lucide icons, decorative emoji, card-heavy UI, hover animation, animated arrows, gradients, or AI-sounding copy.

## Important deployment note

“Free tier” means free within each provider’s current quotas and policies, not unlimited or guaranteed uptime. Verify current plan limits before deployment. Design graceful usage limits and document the service dependencies and quotas. Any embeddings or LLM calls must use a no-cost option available to the project, with strict usage caps and a graceful unavailable state. Do not silently fall back to a paid API.
