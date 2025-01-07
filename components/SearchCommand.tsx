'use client';

import { File } from 'lucide-react';
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { useSearch } from "@/hooks/useSearch";
import { useEffect, useState } from "react";
import { useCollection } from 'react-firebase-hooks/firestore';
import { collectionGroup, DocumentData, query, Timestamp, where } from 'firebase/firestore';
import { db } from '@/firebase';

interface RoomDocument extends DocumentData {
  title: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  role: "owner" | "editor";
  roomId: string;
  userId: string;
  parentNoteId: string | null;
  archived: boolean;
  icon: string;
  coverImage: string;
}

export function SearchCommand() {
  const { user } = useUser();
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);

  const toggle = useSearch((store) => store.toggle);
  const isOpen = useSearch((store) => store.isOpen);
  const onClose = useSearch((store) => store.onClose);

  const userId = user?.emailAddresses[0]?.toString(); // Adjust based on your Clerk user object

  const roomsQuery = userId
    ? query(
        collectionGroup(db, 'rooms'),
        where('userId', '==', userId)
      )
    : null;

  const [snapshot] = useCollection(roomsQuery);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.altKey)) {
        e.preventDefault();
        toggle();
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [toggle]);

  const onSelect = (id: string) => {
    router.push(`/notes/${id}`);
    onClose();
  };

  if (!isMounted) {
    return null;
  }

  const documents = snapshot?.docs.map((doc) => ({
    ...(doc.data() as RoomDocument),
    id: doc.id, // Attach the document ID
  }));

  return (
    <CommandDialog open={isOpen} onOpenChange={onClose}>
      <CommandInput placeholder={`Search ${user?.fullName}'s Notes`} />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Documents">
          {documents
            ?.filter((note) => note.archived === false)
            .map((note) => (
              <CommandItem
                key={note.roomId}
                value={`${note.roomId}-${note.title}`}
                onSelect={() => onSelect(note.roomId)}
                className='cursor-pointer'
              >
                {note.icon ? (
                  <p className="mr-2 text-[18px]">{note.icon}</p>
                ) : (
                  <File className="w-4 h-4 mr-2" />
                )}
                <span>{note.title}</span>
              </CommandItem>
            ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
