"use client";

import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/firebase";
import { EditorSkeleton } from "./shared";

/**
 * Read-only render of the note's stored HTML snapshot, shown while the
 * Liveblocks room is still connecting. The user sees their content
 * immediately instead of a spinner; editing unlocks once the live
 * session is ready and this component is swapped out.
 */
export function SnapshotPreview({ noteId }: { noteId: string }) {
  const [html, setHtml] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getDoc(doc(db, "notes", noteId))
      .then((snap) => {
        if (cancelled) return;
        setHtml(snap.exists() ? snap.data().content ?? null : null);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [noteId]);

  if (!loaded) {
    return <EditorSkeleton />;
  }

  return (
    <div className="relative md:max-w-3xl lg:max-w-4xl mx-auto">
      <div className="absolute top-4 right-4 z-10">
        <span className="text-sm text-muted-foreground animate-pulse">
          Connecting live session…
        </span>
      </div>
      {html ? (
        <div
          className="snapshot-preview min-h-screen px-8 py-12 opacity-80 cursor-wait select-text"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      ) : (
        <EditorSkeleton />
      )}
    </div>
  );
}
