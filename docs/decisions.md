# System Decisions

This document captures the main engineering choices and why they were made.

## ADR-001: Use Monad for Evidence, Not Raw Telemetry

**Decision:** Commit Merkle roots and compact metadata to Monad. Keep raw telemetry encrypted off-chain.

**Reasoning:**

- Phone telemetry is high frequency.
- Raw GPS is privacy-sensitive.
- Public RPCs and demos should avoid one transaction per phone per second.
- Merkle roots give a compact proof that many observations existed at commit time.

**Tradeoff:** Receipts need off-chain encrypted telemetry rows and Merkle proofs to verify inclusion. This is acceptable because Monad stores the immutable commitment.

## ADR-001B: Use Private Evidence Anchoring

**Decision:** Store encrypted payloads, salted payload commitments, ciphertext hashes, risk commitments, and hash-linked event hashes off-chain; anchor only the Merkle root to Monad.

**Reasoning:**

- Raw hashes of GPS coordinates can be brute-forced against likely routes.
- Salted commitments and ciphertext hashes avoid exposing route or condition data.
- Hash-linked events make post-hoc insertion and editing detectable.
- Selective reveal receipts can prove one event without revealing the whole journey.

**Tradeoff:** Authorized users need access to encrypted payload storage and decryption keys. Public verifiers can prove inclusion and integrity, but not inspect private telemetry unless it is selectively revealed.

## ADR-002: Use Supabase for App State and Realtime UX

**Decision:** Use Supabase Postgres and Realtime Broadcast/Presence for sessions, devices, telemetry, incidents, and dashboard updates.

**Reasoning:**

- Vercel API routes are not persistent WebSocket servers.
- The dashboard needs low-latency room state.
- Postgres gives simple durability and queryability for receipts.

**Tradeoff:** Supabase is an availability layer, not the trust anchor. A database admin can delete data, but cannot silently edit committed history without breaking receipts.

## ADR-003: Audience Phones Use Ephemeral Keys

**Decision:** Generate local ephemeral EVM keys in the browser. Do not require wallet connection.

**Reasoning:**

- Hackathon audience onboarding must be instant.
- Wallet popups and testnet token requirements would break the live demo.
- The proof goal is signed witness telemetry, not user asset custody.

**Tradeoff:** Device identity is session-scoped. That is intentional for privacy and demo safety.

## ADR-004: EIP-712 Instead of Plain Message Signing

**Decision:** Sign typed telemetry records with EIP-712.

**Reasoning:**

- Typed data makes the domain and fields explicit.
- Server-side recovery is deterministic.
- The signature binds session, device, sequence, payload hash, and timestamp.

**Tradeoff:** EIP-712 is slightly more code than `personal_sign`, but the protocol is clearer and more defensible.

## ADR-005: Deterministic Agents First

**Decision:** Risk scoring and incident narration work without an LLM.

**Reasoning:**

- Demo reliability matters more than a chatbot.
- Deterministic rules are explainable.
- Optional LLM narration can be layered on top through typed tools.

**Tradeoff:** Narrative quality is simpler without an LLM, but the system remains dependable.

## ADR-006: Indoor Command Mode as the Default Visual

**Decision:** Use an indoor spatialized command view and simulation controls as first-class demo paths.

**Reasoning:**

- Indoor GPS is often inaccurate.
- A room demo should work on laptops, phones, and projectors.
- Spatialization still demonstrates signed sensor witnesses and tamper evidence.

**Tradeoff:** It is not a literal map in fallback mode. The UI labels this clearly as indoor demo spatialization.

## ADR-007: Chain Agent as a Long-Running Worker

**Decision:** Run batching and Monad submission outside Vercel request handlers.

**Reasoning:**

- Batch submission needs polling, retries, nonce awareness, and delayed receipt handling.
- Vercel functions should not be treated as persistent workers.

**Tradeoff:** Deployment has one extra process. During the hackathon it can run locally.

## ADR-008: Use Serverless Emergency Commit as Demo Safety Net

**Decision:** Keep `/api/chain/emergency-commit` as a serverless fallback that can batch uncommitted rows when the long-running worker is not running.

**Reasoning:**

- The live demo should not fail just because the worker process is down.
- It exercises the same Merkle proof and batch tables as the Chain Agent.
- When `CHAIN_DISABLED=true`, it labels the result as simulated.

**Tradeoff:** It is not a replacement for a production worker with nonce management and retry queues.

## ADR-009: Simulated Chain Must Be Labeled

**Decision:** The UI and receipt distinguish real Monad commitments from simulated chain mode.

**Reasoning:**

- Hackathon demos often need local/cloud fallback.
- Fake transaction hashes should never be presented as real public proofs.
- The same pipeline still validates hashing, signing, encryption, Merkle proofs, and receipt logic.
