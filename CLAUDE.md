# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev     # Dev server on http://localhost:5000 (note: NOT 3000)
npm run build   # Production build
npm run start   # Serve production build
npm run lint    # ESLint (next lint)
```

There is no test suite. `next-pwa` is disabled in development (`next.config.mjs`), so service-worker / PWA behavior only appears in production builds.

## Environment

Copy `.env.example` to `.env.local`. Required keys: Clerk (`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`), Liveblocks (`NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY`, `LIVEBLOCKS_PRIVATE_KEY`), EdgeStore (`EDGE_STORE_ACCESS_KEY`, `EDGE_STORE_SECRET_KEY`), Firebase (`FIREBASE_KEY` for client SDK, `FIREBASE_SERVICE_KEY` as a single-line JSON string for admin SDK), `NEXT_PUBLIC_BASE_URL`, and `GEMINI_API_KEY`. Reminder push notifications additionally need VAPID keys (`VAPID_SUBJECT`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`), `CRON_SECRET`, and `NEXT_PUBLIC_APP_URL` — these are not yet in `.env.example`.

## Architecture

NoteScape is a Next.js 14 App Router note-taking app. The defining architectural decision is that **note content lives in two systems at once**, and there are **two editors** that switch based on how many people are in a room.

### Data model (Firestore)

Firestore is accessed two ways: the **client SDK** (`firebase.ts`, exports `db`) from Client Components via `react-firebase-hooks`, and the **admin SDK** (`firebase-admin.ts`, exports `adminDb`) from server actions and API routes. Nearly all writes go through server actions in `actions/actions.ts` (each begins with `auth.protect()`).

Key collections:
- `notes/{noteId}` — the shared note doc. Holds `title`, `parentNoteId`, and an HTML `content` snapshot.
- `users/{email}/rooms/{roomId}` — **per-user copy** of a note's metadata (role, icon, coverImage, archived, quickAccess, title, parentNoteId). Inviting a user copies the owner's room doc into the invitee's subcollection with `role: "editor"`. This denormalization means most mutations (archive, icon, cover, quickAccess) fan out across **all** users' room docs via `collectionGroup("rooms").where("roomId", "==", ...)` and a batch write. When editing note metadata, remember you must update every user's copy, not just one.
- `reminders/{email}/reminders/{id}` and `flags/{email}/flags/{id}` — per-user reminders and their flags.
- Note hierarchy is a tree via `parentNoteId`; `getAllChildNotes` recurses, and archive/restore/delete cascade to descendants.

Firestore user documents are keyed by **email** (`sessionClaims.email`), not Clerk user ID.

### The dual-editor / collaboration switch — the trickiest part

A note can be edited in two different components depending on presence, and the switch happens live:

- `components/Editor2/` (Firebase-only) — single-user editing. BlockNote content persisted directly to Firestore. Reached via `components/NotesPage.tsx`.
- `components/Editor/` (Liveblocks + Yjs) — real-time collaborative editing. Content is a Yjs document synced through `LiveblocksYjsProvider`; the XML fragment key is `"note-store"`.

`components/Providers/RoomProviderWrapper.tsx` decides which to render: it counts room docs for the `roomId` (a note shared with N users has N room docs) and watches Liveblocks presence via `UsersPresenceDetector`. Solo notes render `NotesPage`/`Editor2`; shared notes with others present render the collaborative `Editor`.

**Source-of-truth rule (see comments in `components/Editor/index.tsx`):** In the collaborative editor, **Yjs is authoritative** for content. Firestore's `notes/{id}.content` is only an HTML snapshot for search/preview and is written on a debounced `blocksToHTMLLossy`. The editor seeds itself from that HTML **only** when the Yjs fragment is empty (a brand-new room) — otherwise seeding would duplicate content. Do not reintroduce writing raw Yjs bytes into Firestore.

Shared editor logic (skeleton, formatting toolbar, HTML seeding, DOM attributes) lives in `components/Editor/shared.tsx` and is imported by both editors.

### Authentication & authorization

- Clerk via `middleware.ts` (`clerkMiddleware()`). `(main)` routes are client-guarded by `app/(main)/layout.tsx` (redirects unauthenticated users to `/`).
- Liveblocks auth: `app/api/auth-endpoint/route.ts` verifies the user has a room doc for the requested room, then grants `FULL_ACCESS`. `liveblocks.config.ts` declares the typed `UserMeta`/`Presence` shape (presence is a cursor coordinate; `LiveCursorProvider` renders live cursors).

### AI features — two different backends

- **Enhance Text** (in-repo): `lib/gemini.ts` → `app/api/enhance-text/route.ts` uses Google Gemini (`gemini-2.5-flash`) to rewrite selected text. Triggered from a custom BlockNote formatting-toolbar button; see `ENHANCE_TEXT_FEATURE.md` for the full write-up.
- **Translate & Chat** (external): `TranslateNote.tsx` and `ChatToNote.tsx` POST the Yjs `note-store` JSON to `${NEXT_PUBLIC_BASE_URL}/translateDocument` and `/chatToNote` — a **separate Cloudflare Worker service** (Meta Llama), not routes in this repo. Changing translation/chat behavior means editing that external worker, not this codebase.

### Reminders & push notifications

Server actions in `actions.ts` manage reminders/flags. `app/api/reminders/check/route.ts` is a **cron endpoint** (guarded by `Bearer ${CRON_SECRET}`) that finds due reminders via a `collectionGroup("reminders")` query and sends Web Push via `web-push` + VAPID to each user's stored `pushSubscriptions`. Client push subscription and the service worker are wired through `ServiceWorkerRegistrar.tsx` and `public/sw.js`.

## Conventions

- Path alias `@/*` maps to the repo root (`tsconfig.json`).
- UI is shadcn/ui (`components/ui/`) + Radix + Tailwind; `cn()` in `lib/utils.ts`. Add shadcn components per `components.json`.
- Theming via `next-themes` with `storageKey="notescape-theme"`; editors read `resolvedTheme` to set BlockNote's light/dark theme.
- Route groups: `(root)` = public marketing/landing pages, `(main)` = authenticated app. Per-route private components live in `_components/` folders.
- Server mutations belong in `actions/actions.ts` as `"use server"` functions guarded by `auth.protect()`; prefer these over client-side Firestore writes for anything touching shared/room state.
