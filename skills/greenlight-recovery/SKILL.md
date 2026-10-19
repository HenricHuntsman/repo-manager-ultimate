---
name: greenlight-recovery
description: Check archived Greenlight evidence and checkpoint compatibility without overwriting files or inventing recovery success.
---

# Safe Greenlight / mini-AGI recovery

1. Identify which track is being inspected: original large trained Greenlight, fresh 1.08M starter, or Ollama Qwen3:8B. **Never equate them.**
2. Record dated evidence, device, exact test selection, skipped modules, commit/hash, output location and verification gaps.
3. For any proposed checkpoint, use metadata-only, bounded read-only inventory; preserve original source/optimizer files unchanged and hash before copies. Do not deserialize untrusted weights.
4. When training resumes, use an isolated copy, a compatible optimizer state and exact architecture; verify a fresh process restart and held-out answer quality.
5. For Colab T4, check availability and dtype support; runtime can expire. Save only user-approved nonsecret artifacts to persistent Drive. Do not expose Flask/MCP/Ollama via unauthenticated public tunnel.
6. Begin with CPU/unit/integration tests; treat unavailable dependencies as missing coverage, not passing tests. Distinguish mocked HTTP checks from live MCP and GPU end-to-end.
7. Do not call paid cloud APIs, change code, upload weights or publish source unless separately authorized.

## Historical baseline, not current live status
- Greenlight R9.1 (2026-10-12): accessible subset 270 passed, 3 skipped, 94 subtests; Flask-dependent modules unverified.
- iPhone mini-AGI step-595 starter: fresh training resume verified on T4 but 0/20 held-out arithmetic exact answers.
- Original multi-GB trained model and optimizer files: **not recovered** in reviewed evidence.

Open the archived Drive progress files and compare them with new tests before updating the status table.
