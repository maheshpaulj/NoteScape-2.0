"use server"

import { adminDb } from "@/firebase-admin";
import { auth } from "@clerk/nextjs/server"
import { FieldValue, Timestamp } from "firebase-admin/firestore";

export type Reminder = {
  id: string;
  userId: string;
  message: string;
  reminderTime: Date;
  oneSignalNotificationId?: string;
  noteId?: string;
  noteTitle?: string;
};

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


export async function scheduleReminder(
  reminderTime: Date,
  message: string,
  noteDetails?: { id: string; title: string }
) {
  auth.protect();
  const { sessionClaims } = await auth();
  const userId = sessionClaims?.email;
  if (!userId) throw new Error("User not authenticated.");

  // The path to save the reminder
  const reminderRef = adminDb
    .collection("reminders")
    .doc(userId)
    .collection("reminders")
    .doc();

  // The data to save
  const reminderData = {
    userId,
    message,
    reminderTime: Timestamp.fromDate(reminderTime),
    isSent: false, // <-- IMPORTANT NEW FIELD
    createdAt: FieldValue.serverTimestamp(),
    ...(noteDetails && { noteId: noteDetails.id, noteTitle: noteDetails.title }),
  };

  await reminderRef.set(reminderData);

  // Return a partial reminder object for optimistic UI updates
  const newReminder: Reminder = {
    id: reminderRef.id,
    userId,
    message,
    reminderTime,
    noteId: noteDetails?.id,
    noteTitle: noteDetails?.title,
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

  const reminderRef = adminDb
    .collection("reminders")
    .doc(userId)
    .collection("reminders")
    .doc(reminderId);

  // Get the original note details if they exist, so we don't lose them
  const originalDoc = await reminderRef.get();
  const originalData = originalDoc.data();

  const updatedData = {
    message: newMessage,
    reminderTime: Timestamp.fromDate(newReminderTime),
    isSent: false, // Reset the 'isSent' flag so it can be picked up by the cron job again
    updatedAt: FieldValue.serverTimestamp(),
  };

  await reminderRef.update(updatedData);

  // Construct the full reminder object to send back to the client
  const updatedReminder: Reminder = {
    id: reminderId,
    userId,
    message: newMessage,
    reminderTime: newReminderTime,
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


/**
 * Fetches all reminders for the currently logged-in user.
 * THIS IS USED BY: The main RemindersPage to populate the initial list.
 */
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
    } as Reminder;
  });
}