"use server"

import { adminDb } from "@/firebase-admin";
import { auth } from "@clerk/nextjs/server"
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { Flag, Reminder } from "@/types/types";

export async function createNewNote(parentNoteId: string | null = null) {
    auth.protect();

    const { sessionClaims } = await auth();
    if (!sessionClaims?.email) {
        throw new Error("User not authenticated or email is missing.");
    }

    const docCollectionRef = adminDb.collection('notes');
    const docRef = await docCollectionRef.add({
        title: "New Note",
        parentNoteId: parentNoteId, // Include parentNoteId here
    });

    await adminDb
        .collection("users")
        .doc(sessionClaims.email!)
        .collection("rooms")
        .doc(docRef.id)
        .set({
            userId: sessionClaims.email!,
            role: "owner",
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
            roomId: docRef.id,
            icon: "",
            coverImage: "",
            parentNoteId: parentNoteId,
            archived: false,
            title: "New Note",
            quickAccess: false,
        });

    return { noteId: docRef.id };
}

export async function inviteUserToNote(roomId: string, email: string, ownerEmail: string) {
    auth.protect();

    try {
        // First, get the room data from the owner's collection
        const ownerRoomDoc = await adminDb
            .collection("users")
            .doc(ownerEmail)
            .collection("rooms")
            .doc(roomId)
            .get();

        if (!ownerRoomDoc.exists) {
            return { success: false, error: "Owner's room not found" };
        }

        // Get the owner's room data
        const ownerRoomData = ownerRoomDoc.data();

        // Create new user-specific room data
        const userRoomData = {
            ...ownerRoomData,      // Copy all existing room data from owner
            userId: email,         // Override with new user's email
            role: "editor",        // Set role to editor
            createdAt: FieldValue.serverTimestamp(), // Set new timestamp
            roomId,               // Ensure roomId is included
        };

        // Save to the new user's rooms collection
        await adminDb
            .collection("users")
            .doc(email)
            .collection("rooms")
            .doc(roomId)
            .set(userRoomData);

        return { success: true };
    } catch (error) {
        console.error("Error inviting user to note:", error);
        return { success: false };
    }
}

export async function removeUserFromNote(roomId: string, email: string) {
    auth.protect();

    try {
        // Get all notes for this user
        const userNotesRef = adminDb
            .collection("users")
            .doc(email)
            .collection("rooms");

        // Find all notes that have the roomId as their parentNoteId
        const childNotesQuery = await userNotesRef
            .where("parentNoteId", "==", roomId)
            .get();

        // Start a batch write
        const batch = adminDb.batch();

        // Update all child notes to have null as parentNoteId
        childNotesQuery.docs.forEach((doc) => {
            batch.update(doc.ref, {
                parentNoteId: null
            });
        });

        // Delete the room document itself
        batch.delete(userNotesRef.doc(roomId));

        // Commit all the changes atomically
        await batch.commit();

        return { success: true };
    } catch (error) {
        console.error(error);
        return { success: false };
    }
}

export async function getAllChildNotes(roomId: string): Promise<string[]> {
    const childNotes: string[] = [];
    
    async function fetchChildren(noteId: string) {
        const snapshot = await adminDb
            .collectionGroup("rooms")
            .where("parentNoteId", "==", noteId)
            .get();
            
        for (const doc of snapshot.docs) {
            childNotes.push(doc.id);
            // Recursively fetch children of this note
            await fetchChildren(doc.id);
        }
    }
    
    await fetchChildren(roomId);
    return childNotes;
}

export async function archiveNote(roomId: string) {
    auth.protect();
    try {
        const childNoteIds = await getAllChildNotes(roomId);
        const batch = adminDb.batch();
        
        // Get and update all room documents for the parent note
        const parentRooms = await adminDb
            .collectionGroup("rooms")
            .where("roomId", "==", roomId)
            .get();
            
        parentRooms.docs.forEach((doc) => {
            batch.update(doc.ref, { archived: true });
        });
        
        // Get and update all room documents for child notes
        for (const childId of childNoteIds) {
            const childRooms = await adminDb
                .collectionGroup("rooms")
                .where("roomId", "==", childId)
                .get();
                
            childRooms.docs.forEach((doc) => {
                batch.update(doc.ref, { archived: true });
            });
        }
        
        await batch.commit();
        return { success: true };
    } catch (error) {
        console.log(error);
        return { success: false };
    }
}

export async function restoreNote(roomId: string) {
    auth.protect();
    try {
        const childNoteIds = await getAllChildNotes(roomId);
        const batch = adminDb.batch();
        
        // Get and update all room documents for the parent note
        const parentRooms = await adminDb
            .collectionGroup("rooms")
            .where("roomId", "==", roomId)
            .get();
            
        parentRooms.docs.forEach((doc) => {
            batch.update(doc.ref, { archived: false });
        });
        
        // Get and update all room documents for child notes
        for (const childId of childNoteIds) {
            const childRooms = await adminDb
                .collectionGroup("rooms")
                .where("roomId", "==", childId)
                .get();
                
            childRooms.docs.forEach((doc) => {
                batch.update(doc.ref, { archived: false });
            });
        }
        
        await batch.commit();
        return { success: true };
    } catch (error) {
        console.log(error);
        return { success: false };
    }
}

export async function deleteNote(roomId: string) {
    auth.protect();
    try {
        // Get the note being deleted and its potential child
        const noteRef = adminDb.collection("notes").doc(roomId);
        const noteDoc = await noteRef.get();
        const noteData = noteDoc.data();

        // Find the child note
        const childQuery = await adminDb
            .collectionGroup("rooms")
            .where("parentNoteId", "==", roomId)
            .get();

        const batch = adminDb.batch();

        if (!childQuery.empty) {
            // If there's a child note, update its parentNoteId to the current note's parent
            const childDoc = childQuery.docs[0];
            batch.update(childDoc.ref, {
                parentNoteId: noteData?.parentNoteId || null
            });
        }

        // Delete the current note
        batch.delete(noteRef);

        // Delete room documents from all users
        const roomQuery = await adminDb
            .collectionGroup("rooms")
            .where("roomId", "==", roomId)
            .get();
            
        roomQuery.docs.forEach((doc) => {
            batch.delete(doc.ref);
        });

        await batch.commit();
        return { success: true };
    } catch (error) {
        console.log(error);
        return { success: false };
    }
}

export async function addIconToNote(roomId: string, icon: string) {
    auth.protect();
    try {
        const batch = adminDb.batch();
        // Get and update all room documents for the parent note
        const parentRooms = await adminDb
            .collectionGroup("rooms")
            .where("roomId", "==", roomId)
            .get();
            
        parentRooms.docs.forEach((doc) => {
            batch.update(doc.ref, { icon: icon });
        });
         
        await batch.commit();
        return { success: true };
    } catch (error) {
        console.log(error);
        return { success: false };
    }
}

export async function removeIconFromNote(roomId: string) {
    auth.protect();
    try {
        const batch = adminDb.batch();
        // Get and update all room documents for the parent note
        const parentRooms = await adminDb
            .collectionGroup("rooms")
            .where("roomId", "==", roomId)
            .get();
            
        parentRooms.docs.forEach((doc) => {
            batch.update(doc.ref, { icon: "" });
        });
         
        await batch.commit();
        return { success: true };
    } catch (error) {
        console.log(error);
        return { success: false };
    }
}

export async function addCoverToNote(roomId: string, coverUrl: string) {
    auth.protect();
    try {
        const batch = adminDb.batch();
        // Get and update all room documents for the parent note
        const parentRooms = await adminDb
            .collectionGroup("rooms")
            .where("roomId", "==", roomId)
            .get();
            
        parentRooms.docs.forEach((doc) => {
            batch.update(doc.ref, { coverImage: coverUrl });
        });
         
        await batch.commit();
        return { success: true };
    } catch (error) {
        console.log(error);
        return { success: false };
    }
}

export async function removeCoverFromNote(roomId: string) {
    auth.protect();
    try {
        const batch = adminDb.batch();
        // Get and update all room documents for the parent note
        const parentRooms = await adminDb
            .collectionGroup("rooms")
            .where("roomId", "==", roomId)
            .get();
            
        parentRooms.docs.forEach((doc) => {
            batch.update(doc.ref, { coverImage: "" });
        });
         
        await batch.commit();
        return { success: true };
    } catch (error) {
        console.log(error);
        return { success: false };
    }
}

export async function addNoteToQuickAccess(noteId: string, email: string) {
    auth.protect();
    try {
        const batch = adminDb.batch();
        // Get and update all room documents for the parent note
        const parentRooms = await adminDb
            .collectionGroup("rooms")
            .where("roomId", "==", noteId)
            .where("userId", "==", email)
            .get();
            
        parentRooms.docs.forEach((doc) => {
            batch.update(doc.ref, { quickAccess: true });
        });
         
        await batch.commit();
        return { success: true };
    } catch (error) {
        console.log(error);
        return { success: false };
    }
}

export async function removeNoteFromQuickAccess(noteId: string, email: string) {
    auth.protect();
    try {
        const batch = adminDb.batch();
        // Get and update all room documents for the parent note
        const parentRooms = await adminDb
            .collectionGroup("rooms")
            .where("roomId", "==", noteId)
            .where("userId", "==", email)
            .get();
            
        parentRooms.docs.forEach((doc) => {
            batch.update(doc.ref, { quickAccess: false });
        });
         
        await batch.commit();
        return { success: true };
    } catch (error) {
        console.log(error);
        return { success: false };
    }
}

export async function savePushSubscription(subscription: object) {
  auth.protect();
  const { sessionClaims } = await auth();
  const userId = sessionClaims?.email;
  if (!userId) throw new Error("User not authenticated.");

  const userRef = adminDb.collection("users").doc(userId);
  // arrayUnion adds the new device subscription without creating duplicates of the same object.
  await userRef.set({
    pushSubscriptions: FieldValue.arrayUnion(subscription),
  }, { merge: true }); 
  return { success: true };
}


export async function scheduleReminder(reminderTime: Date, message: string) {
  auth.protect();
  const { sessionClaims } = await auth();
  const userId = sessionClaims?.email;
  if (!userId) throw new Error("User not authenticated.");

  const reminderRef = adminDb.collection("reminders").doc(userId).collection("reminders").doc();
  const reminderData = {
    userId,
    message,
    reminderTime: Timestamp.fromDate(reminderTime),
    isDone: false,
    isSent: false,
    flagIds: [], // Initialize with empty flags
    createdAt: FieldValue.serverTimestamp(),
  };
  await reminderRef.set(reminderData);

  const newReminder: Reminder = {
    id: reminderRef.id,
    userId,
    message,
    reminderTime,
    isDone: false,
    flagIds: [],
  };
  return { success: true, reminder: newReminder };
}


export async function updateReminder(
  reminderId: string,
  newReminderTime: Date,
  newMessage: string
) {
  auth.protect();
  const { sessionClaims } = await auth();
  const userId = sessionClaims?.email;
  if (!userId) throw new Error("User not authenticated.");

  const reminderRef = adminDb.collection("reminders").doc(userId).collection("reminders").doc(reminderId);

  const originalDoc = await reminderRef.get();
  if (!originalDoc.exists) {
    throw new Error("Reminder not found.");
  }
  const originalData = originalDoc.data();

  const updatedData = {
    message: newMessage,
    reminderTime: Timestamp.fromDate(newReminderTime),
    isDone: false,
    isSent: false,
    updatedAt: FieldValue.serverTimestamp(),
  };

  await reminderRef.update(updatedData);

  const updatedReminder: Reminder = {
    id: reminderId,
    userId,
    message: newMessage,
    reminderTime: newReminderTime,
    isDone: false,
    flagIds: originalData?.flagIds || [],
    noteId: originalData?.noteId,
    noteTitle: originalData?.noteTitle,
  };

  return { success: true, reminder: updatedReminder };
}

type DeleteReminderSuccess = {
  success: true;
};

type DeleteReminderFailure = {
  success: false;
  error: string;
};

export async function deleteReminder(reminderId: string): Promise<DeleteReminderSuccess | DeleteReminderFailure> {
  auth.protect();
  const { sessionClaims } = await auth();
  const userId = sessionClaims?.email;

  if (!userId) {
    return { success: false, error: "User not authenticated." };
  }

  const reminderRef = adminDb.collection("reminders").doc(userId).collection("reminders").doc(reminderId);

  try {
    await reminderRef.delete();
    return { success: true };
  } catch (e) {
    console.error("Error deleting reminder:", e);
    // Return a specific error message on failure
    return { success: false, error: "Failed to delete reminder from database." };
  }
}

export async function getAllUserReminders(): Promise<Reminder[]> {
  auth.protect();
  const { sessionClaims } = await auth();
  const userId = sessionClaims?.email;
  if (!userId) return [];

  const remindersQuery = await adminDb
    .collection("reminders")
    .doc(userId)
    .collection("reminders")
    .orderBy("reminderTime", "asc")
    .get();

  return remindersQuery.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      userId: data.userId,
      message: data.message,
      reminderTime: (data.reminderTime as Timestamp).toDate(),
      noteId: data.noteId,
      noteTitle: data.noteTitle,
      flagIds: data.flagIds || [], 
      isDone: data.isDone || false
    } as Reminder;
  });
}

export async function toggleReminderDone(reminderId: string, isDone: boolean) {
  auth.protect();
  const { sessionClaims } = await auth();
  const userId = sessionClaims?.email;
  if (!userId) throw new Error("User not authenticated.");

  const reminderRef = adminDb.collection("reminders").doc(userId).collection("reminders").doc(reminderId);
  await reminderRef.update({ isDone: isDone });

  return { success: true };
}

export async function toggleReminderImportant(reminderId: string, isImportant: boolean) {
  auth.protect();
  const { sessionClaims } = await auth();
  const userId = sessionClaims?.email;
  if (!userId) throw new Error("User not authenticated.");

  const reminderRef = adminDb.collection("reminders").doc(userId).collection("reminders").doc(reminderId);
  await reminderRef.update({ isImportant: isImportant });

  return { success: true };
}

export async function getAllUserFlags(): Promise<Flag[]> {
  auth.protect();
  const { sessionClaims } = await auth();
  const userId = sessionClaims?.email;
  if (!userId) return [];

  const flagsSnapshot = await adminDb.collection("flags").doc(userId).collection("flags").get();
  return flagsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Flag));
}

export async function createFlag(name: string, color: string): Promise<Flag> {
  auth.protect();
  const { sessionClaims } = await auth();
  const userId = sessionClaims?.email;
  if (!userId) throw new Error("User not authenticated.");

  const flagRef = adminDb.collection("flags").doc(userId).collection("flags").doc();
  const newFlag = { id: flagRef.id, name, color, userId };
  await flagRef.set({ name, color, userId });

  return newFlag;
}

export async function setReminderFlags(reminderId: string, flagIds: string[]) {
  auth.protect();
  const { sessionClaims } = await auth();
  const userId = sessionClaims?.email;
  if (!userId) throw new Error("User not authenticated.");

  const reminderRef = adminDb.collection("reminders").doc(userId).collection("reminders").doc(reminderId);
  await reminderRef.update({ flagIds });

  return { success: true };
}