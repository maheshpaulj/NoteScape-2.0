"use server"

import { adminDb } from "@/firebase-admin";
import { auth } from "@clerk/nextjs/server"

export async function createNewNote(parentNoteId: string | null = null) {
    auth.protect();

    const { sessionClaims } = await auth();

    const docCollectionRef = adminDb.collection('notes');
    const docRef = await docCollectionRef.add({
        title: "New Note",
        parentNoteId: parentNoteId, // Include parentNoteId here
    });

    await adminDb
        .collection("users")
        .doc(sessionClaims?.email!)
        .collection("rooms")
        .doc(docRef.id)
        .set({
            userId: sessionClaims?.email!,
            role: "owner",
            createdAt: new Date(),
            updatedAt: new Date(),
            roomId: docRef.id,
            icon: "",
            coverImage: "",
            parentNoteId: parentNoteId,
            archived: false,
            title: "New Note",
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
            createdAt: new Date(), // Set new timestamp
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

export async function removeUserFromNote(roomId: string, email: string){
    auth.protect();

    try {
        await adminDb
            .collection("users")
            .doc(email)
            .collection("rooms")
            .doc(roomId)
            .delete();

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
            .collection("notes")
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
        const childNoteIds = await getAllChildNotes(roomId);
        const batch = adminDb.batch();
        
        // Delete the parent note
        batch.delete(adminDb.collection("notes").doc(roomId));
        
        // Delete all child notes
        for (const childId of childNoteIds) {
            batch.delete(adminDb.collection("notes").doc(childId));
        }
        
        // Delete corresponding room documents from all users
        const roomsToDelete = [roomId, ...childNoteIds];
        for (const id of roomsToDelete) {
            const roomQuery = await adminDb
                .collectionGroup("rooms")
                .where("roomId", "==", id)
                .get();
                
            roomQuery.docs.forEach((doc) => {
                batch.delete(doc.ref);
            });
        }
        
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