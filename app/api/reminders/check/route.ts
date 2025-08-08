// src/app/api/reminders/check/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import webpush from 'web-push';

// Configure web-push with your VAPID keys
webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export async function GET(req: NextRequest) {
  // 1. Secure the endpoint
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 2. Find due reminders
    const now = Timestamp.now();
    const remindersQuery = adminDb
      .collectionGroup('reminders') // Assumes reminders/{user}/reminders structure
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

      // 3. Get the user's push subscriptions
      const userDoc = await adminDb.collection('users').doc(userId).get();
      const userData = userDoc.data();
      const subscriptions = userData?.pushSubscriptions;
      
      if (!subscriptions || !Array.isArray(subscriptions)) {
        continue; // Skip if user has no subscriptions
      }

      const notificationPayload = JSON.stringify({
        title: reminder.noteTitle ? `Reminder: ${reminder.noteTitle}` : 'You have a reminder!',
        body: reminder.message,
        url: reminder.noteId 
          ? `${process.env.NEXT_PUBLIC_APP_URL}/notes/${reminder.noteId}`
          : `${process.env.NEXT_PUBLIC_APP_URL}/reminders`,
      });

      // 4. Send a notification to each of the user's devices
      subscriptions.forEach(sub => {
        notificationsToSend.push(webpush.sendNotification(sub, notificationPayload));
      });
      
      remindersToUpdate.push(reminderDoc.ref);
    }
    
    // 5. Execute all sends and DB updates
    await Promise.allSettled(notificationsToSend); // Send all notifications
    
    const batch = adminDb.batch();
    remindersToUpdate.forEach(ref => {
      batch.update(ref, { isSent: true }); // Mark as sent
    });
    await batch.commit();

    return NextResponse.json({ success: true, message: `Sent ${remindersToUpdate.length} reminders.` });

  } catch (error) {
    console.error("Error checking reminders:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}