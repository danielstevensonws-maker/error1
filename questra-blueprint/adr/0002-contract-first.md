# ADR-0002 — Contract-first construction
Accepted. @questra/contracts is built and changed before any feature that needs a shape. Types change only by dedicated contract PR including fixtures + tests. Mocks are generated from contracts. This is the primary anti-drift mechanism for LLM-built code.
