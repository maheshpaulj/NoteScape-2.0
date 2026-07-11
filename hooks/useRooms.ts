"use client";

import { create } from "zustand";
import { collectionGroup, onSnapshot, query, where } from "firebase/firestore";
import { useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { db } from "@/firebase";
import { RoomDocument } from "@/types/types";

/**
 * One live subscription to the current user's room docs, shared by every
 * consumer (sidebar, home, all-notes, trash, search). Previously each of
 * those components opened its own identical collectionGroup query.
 */
interface RoomsState {
  rooms: RoomDocument[];
  loading: boolean;
  /** email the active subscription belongs to */
  subscribedEmail: string | null;
  _unsubscribe: (() => void) | null;
  subscribe: (email: string) => void;
}

export const useRoomsStore = create<RoomsState>((set, get) => ({
  rooms: [],
  loading: true,
  subscribedEmail: null,
  _unsubscribe: null,
  subscribe: (email: string) => {
    if (get().subscribedEmail === email) return;
    get()._unsubscribe?.();

    const q = query(collectionGroup(db, "rooms"), where("userId", "==", email));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const rooms = snapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() } as RoomDocument)
      );
      set({ rooms, loading: false });
    });

    set({ subscribedEmail: email, _unsubscribe: unsubscribe, loading: true });
  },
}));

/** Hook consumers use — starts the shared subscription on first mount. */
export function useRooms() {
  const { user } = useUser();
  const email = user?.emailAddresses[0]?.toString();
  const rooms = useRoomsStore((s) => s.rooms);
  const loading = useRoomsStore((s) => s.loading);
  const subscribe = useRoomsStore((s) => s.subscribe);

  useEffect(() => {
    if (email) subscribe(email);
  }, [email, subscribe]);

  return { rooms, loading: loading || !email };
}
