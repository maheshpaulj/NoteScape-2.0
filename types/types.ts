import type { Timestamp } from "firebase/firestore";

export type User = {
    fullName: string;
    email: string;
    image: string;
}

// Shape of users/{email}/rooms/{roomId} — the per-user copy of a note's metadata.
export type RoomDocument = {
  id: string;
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
  quickAccess: boolean;
};

export type Flag = {
  id: string;
  name: string;
  color: string;
  userId: string;
};


export type RepeatInterval = "none" | "daily" | "weekly" | "monthly";

export type Reminder = {
  id: string;
  userId: string;
  message: string;
  reminderTime: Date;
  isDone: boolean;
  flagIds: string[];
  repeat?: RepeatInterval;
  isImportant?: boolean;
  noteId?: string;
  noteTitle?: string;
};
