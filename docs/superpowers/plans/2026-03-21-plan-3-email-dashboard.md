# Plan 3: Email Dashboard — Frontend Pages

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add frontend pages for domains, templates, contacts, messages, suppressions, and usage dashboard. Use frontend-design skill for premium UI quality.

**Architecture:** React pages + TanStack Query hooks consuming the Plan 2 backend APIs. All pages use the existing AppLayout with sidebar navigation.

**Tech Stack:** React, TanStack Query, shadcn/ui, Tailwind CSS, React Router v7

**Spec:** `docs/superpowers/specs/2026-03-21-mailhub-design.md`

---

## Summary

7 tasks:
1. Shared hooks infrastructure + sidebar nav update
2. Domains page (list + add + DNS checklist + verify + delete)
3. Templates page (list + create + edit/version + detail)
4. Contacts page (list + detail with message history)
5. Messages page (list + detail with event timeline)
6. Suppressions page (list + add + remove)
7. Usage dashboard (stats cards + daily chart) + update main dashboard
