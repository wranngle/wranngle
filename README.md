# wranngle

I build voice AI agents, workflow automation, and the small full-stack systems
around them: the webhook contracts, eval harnesses, operator surfaces, CRM
handoffs, runbooks, and failure paths that make an automation usable after the
demo.

The shape of the work is usually some mix of AI automation engineering, voice AI
engineering, workflow automation, and full-stack TypeScript. The useful overlap
is where an agent understands the job, the surrounding system moves the work,
and the operator can inspect what happened.

🟪 **Status: Exploring new opportunities**

### Currently open to

- **Senior IC roles** in AI / voice-agent engineering, automation engineering, forward-deployed engineering, or solutions engineering. Remote, US-based. Reach me at cody@wranngle.com.
- **Voice-agent observability collaboration**: call-graph tracing, latency profiling, eval harnesses for ElevenLabs / LiveKit / Pipecat stacks.
- **n8n + webhook security review**: second eyes on signature verification, replay-protection windows, and idempotency patterns across the public workflow library.

### Currently reading

- *Designing Data-Intensive Applications* by Martin Kleppmann
- *The Manager's Path* by Camille Fournier
- *Voice User Interface Design* by Cathy Pearl

<!-- nightstand:start -->
### Nightstand

- <img src="https://covers.openlibrary.org/b/isbn/9781449373320-M.jpg" alt="Cover of Designing Data-Intensive Applications" width="64" align="left" /> **[Designing Data-Intensive Applications](https://dataintensive.net/)** by Martin Kleppmann · 72% read
- <img src="https://covers.openlibrary.org/b/isbn/9781736417911-M.jpg" alt="Cover of Staff Engineer" width="64" align="left" /> **[Staff Engineer](https://staffeng.com/book)** by Will Larson · 42% read
- <img src="https://covers.openlibrary.org/b/isbn/9780135957059-M.jpg" alt="Cover of The Pragmatic Programmer" width="64" align="left" /> **[The Pragmatic Programmer](https://pragprog.com/titles/tpp20/)** by Andrew Hunt & David Thomas · 18% read

<!-- nightstand:end -->

### Selected Work

**[voice_ai_agent_evals](https://github.com/wranngle/voice_ai_agent_evals)**  
*Audio-native eval and regression harness for ElevenLabs voice agents. Bun + TypeScript.*  
Persona simulations, latency checks, prompt-versioning, scoring rubrics, and a
prompt-fix loop for ElevenLabs Conversational AI. Deterministic offline tests
run without credentials; live mode simulates personas against a real agent.
Currently a v1.0 release candidate; the GEPA optimizer sidecar is stubbed.

**[gtm_ops](https://github.com/wranngle/gtm_ops)**  
*GTM pipeline runtime. TypeScript.*  
The assembly layer that connects inbound voice interactions to CRM context,
structured extraction, proposal inputs, branded PDFs, and audit logs, with an
operator console. The important part is not the PDF; it is the path from caller
intent to operator review.

**[n8n](https://github.com/wranngle/n8n)**  
Sanitized workflow library for lead intake, enrichment, routing, post-call
processing, and webhook-secret middleware, with per-workflow test fixtures.
n8n is glue, not the product, but the glue still needs naming, contracts, and
failure handling.

**[wranngle_com](https://github.com/wranngle/wranngle_com)**  
The wranngle.com site: React, Vite, Tailwind, and Cloudflare Pages Functions on
Bun, with an embedded ElevenLabs voice agent, serverless lead capture, and
plain-text plus JSON-LD profile surfaces for humans and machines.

**[career_architect](https://github.com/wranngle/career_architect)**  
Python career-ops automation built like a GTM pipeline: profile data,
application tracking, job-description evaluation, tailored CV generation, and
repeatable portal workflows.

---

**Operating record**

- 10 years across MSP automation, escalation, documentation, and support
  environments.
- 500+ client environments and 4,000+ endpoints supported.
- 700-guide automation framework authored, standardizing delivery for a team
  that was 10 engineers when built and is now about 20.
- An on-call ElevenLabs Conversational AI voice agent in production across 5
  client organizations spanning 20+ sites, integrated with Twilio, Telnyx, and
  Bandwidth telephony, real-time CRM enrichment, schema-validated webhooks, and
  synthetic-conversation regression tests. This work secured an ElevenLabs
  Startup Grant for Applied Technology Group in 2025.
- Wranngle is my own pre-revenue lab for service-business voice AI and GTM
  automation; no clients, no revenue.
- Background includes multi-tenant Microsoft 365 architecture, security
  operations, and PowerShell / Python automation.

**Links:** [wranngle.com](https://wranngle.com) |
[About](https://wranngle.com/about) |
[Plain-text profile](https://wranngle.com/cody-arnold.md) |
cody@wranngle.com
