import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { adminDb } from "@/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";

/**
 * Handles "Done" / "Snooze" action buttons on push notifications.
 * Called by the service worker with the user's session cookies, so Clerk
 * auth identifies the user the same way as any app request.
 */
export async function POST(req: NextRequest) {
  const { sessionClaims } = await auth();
  const userId = sessionClaims?.email;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { reminderId, action, snoozeMinutes } = await req.json();
  if (!reminderId || !["done", "snooze"].includes(action)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const reminderRef = adminDb
    .collection("reminders")
    .doc(userId)
    .collection("reminders")
    .doc(reminderId);

  const snap = await reminderRef.get();
  if (!snap.exists) {
    return NextResponse.json({ error: "Reminder not found" }, { status: 404 });
  }

  if (action === "done") {
    await reminderRef.update({ isDone: true });
  } else {
    const minutes = typeof snoozeMinutes === "number" && snoozeMinutes > 0 ? snoozeMinutes : 60;
    await reminderRef.update({
      reminderTime: Timestamp.fromDate(new Date(Date.now() + minutes * 60 * 1000)),
      isSent: false,
      isDone: false,
    });
  }

  return NextResponse.json({ success: true });
}
