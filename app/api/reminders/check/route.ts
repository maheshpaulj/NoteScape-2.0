// src/app/api/reminders/check/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import webpush from 'web-push';

// Helper to ensure VAPID is configured only once per serverless function invocation.
let isVapidConfigured = false;
function configureVapid() {
  if (isVapidConfigured) {
    return;
  }
  // This configuration now happens safely at runtime.
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT!,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );
  isVapidConfigured = true;
}

export async function GET(req: NextRequest) {
  // 1. Secure the endpoint
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 2. Configure VAPID at the start of the execution
    configureVapid();

    // 3. Find due reminders
    const now = Timestamp.now();
    const remindersQuery = adminDb
      .collectionGroup('reminders')
      .where('reminderTime', '<=', now)
      .where('isSent', '==', false);

    const dueRemindersSnapshot = await remindersQuery.get();

    if (dueRemindersSnapshot.empty) {
      return NextResponse.json({ success: true, message: 'No reminders to send.' });
    }
    
    const notificationsToSend: Promise<any>[] = []; // eslint-disable-line @typescript-eslint/no-explicit-any
    const remindersToUpdate: FirebaseFirestore.DocumentReference[] = [];

    for (const reminderDoc of dueRemindersSnapshot.docs) {
      const reminder = reminderDoc.data();
      const userId = reminder.userId;

      const userDoc = await adminDb.collection('users').doc(userId).get();
      const userData = userDoc.data();
      const subscriptions = userData?.pushSubscriptions;
      
      if (!subscriptions || !Array.isArray(subscriptions)) {
        continue;
      }

      const notificationPayload = JSON.stringify({
        title: reminder.noteTitle ? `Reminder: ${reminder.noteTitle}` : 'You have a reminder!',
        body: reminder.message,
        url: reminder.noteId 
          ? `${process.env.NEXT_PUBLIC_APP_URL}/notes/${reminder.noteId}`
          : `${process.env.NEXT_PUBLIC_APP_URL}/reminders`,
      });

      subscriptions.forEach(sub => {
        notificationsToSend.push(webpush.sendNotification(sub, notificationPayload));
      });
      
      remindersToUpdate.push(reminderDoc.ref);
    }
    
    await Promise.allSettled(notificationsToSend);
    
    const batch = adminDb.batch();
    remindersToUpdate.forEach(ref => {
      batch.update(ref, { isSent: true });
    });
    await batch.commit();

    return NextResponse.json({ success: true, message: `Sent ${remindersToUpdate.length} reminders.` });

  } catch (error) {
    // Log the actual error on the server for your own debugging
    console.error("CRON JOB FAILED:", error);
    
    // Return a generic error to the client
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}