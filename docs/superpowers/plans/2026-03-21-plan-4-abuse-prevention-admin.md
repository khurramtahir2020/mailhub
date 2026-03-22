# Plan 4: Abuse Prevention + Admin Panel

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans.

**Goal:** Add platform admin panel, tenant promotion/suspension, bounce/complaint rate monitoring, content checks, and abuse prevention controls.

**Spec:** `docs/superpowers/specs/2026-03-21-mailhub-design.md` (Sections 5, 7)

---

## Summary

6 tasks:
1. Admin routes (list tenants, detail, suspend/unsuspend, promote, platform usage)
2. Bounce/complaint rate monitoring cron
3. Content checks on email send (pre-send validation)
4. Admin frontend pages
5. Platform admin middleware + first admin user
6. Build verification
