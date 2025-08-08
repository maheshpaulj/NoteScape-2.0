// src/app/reminders/page.tsx
'use client';

import { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import {
  getAllUserReminders,
  deleteReminder,
  Reminder,
} from '@/actions/actions';
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
  AlarmClock,
  NotebookText,
  Trash2,
  Loader2,
  Plus,
  Pencil,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { ReminderForm } from '@/components/ReminderForm';
import { NotificationPermissionBanner } from '@/components/NotificationPermissionBanner';

export default function RemindersPage() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);
  const [isCurrentDeviceSubscribed, setIsCurrentDeviceSubscribed] = useState<boolean | null>(null);
  const [notificationPermission, setNotificationPermission] = useState<PermissionState | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    // This function performs ALL client-side checks for notifications.
    const checkNotificationState = async () => {
      if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('permissions' in navigator)) return;
      
      // 1. Check the browser's overall permission status
      const permissionStatus = await navigator.permissions.query({ name: 'notifications' });
      setNotificationPermission(permissionStatus.state);
      permissionStatus.onchange = () => setNotificationPermission(permissionStatus.state);

      // 2. Check if THIS SPECIFIC DEVICE is already subscribed
      const swRegistration = await navigator.serviceWorker.ready;
      const subscription = await swRegistration.pushManager.getSubscription();
      setIsCurrentDeviceSubscribed(!!subscription);
    };
    checkNotificationState();

    const fetchRemindersData = async () => {
      setIsLoading(true);
      try {
        const userReminders = await getAllUserReminders();
        setReminders(userReminders);
      } catch (error) {
        toast.error('Failed to load your reminders.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchRemindersData();
  }, []);

  const handleOpenAddDialog = () => {
    setEditingReminder(null);
    setIsDialogOpen(true);
  };

  const handleOpenEditDialog = (reminder: Reminder) => {
    setEditingReminder(reminder);
    setIsDialogOpen(true);
  };

  const handleDelete = (reminderId: string) => {
    let originalReminders = [...reminders];
    setReminders((prev) => prev.filter((r) => r.id !== reminderId));
    startTransition(async () => {
      const result = await deleteReminder(reminderId);
      if (result.success) {
        toast.success('Reminder deleted!');
      } else {
        toast.error(result.error);
        setReminders(originalReminders);
      }
    });
  };

  const handleSave = (savedReminder: Reminder) => {
    if (editingReminder) {
      setReminders(prev => prev.map(r => r.id === savedReminder.id ? savedReminder : r));
    } else {
      setReminders(prev => [...prev, savedReminder]);
    }
    setReminders(prev => prev.sort((a,b) => new Date(a.reminderTime).getTime() - new Date(b.reminderTime).getTime()));
    setIsDialogOpen(false);
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <div className="container mx-auto p-4 md:p-8">
        <NotificationPermissionBanner
          permission={notificationPermission}
          isSubscribed={isCurrentDeviceSubscribed}
        />

        <div className="flex items-center justify-between gap-2 mb-6">
          <div className="flex items-center gap-3">
            <AlarmClock className="h-8 w-8" />
            <h1 className="text-3xl font-bold">Your Reminders</h1>
          </div>
          <Button onClick={handleOpenAddDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Add Reminder
          </Button>
        </div>

        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>{editingReminder ? 'Edit Reminder' : 'Add a New Reminder'}</DialogTitle>
          </DialogHeader>
          <ReminderForm
            initialData={editingReminder}
            onSave={handleSave}
            onCancel={() => setIsDialogOpen(false)}
          />
        </DialogContent>

        <div className="mt-8">
          {isLoading ? (
            <div className="flex justify-center items-center h-[50vh]">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : reminders.length === 0 ? (
            <div className="text-center text-muted-foreground mt-16 p-8 border-2 border-dashed rounded-lg">
              <p className="text-lg font-medium">No Reminders Found</p>
              <p className="text-sm">Click the "Add Reminder" button to get started.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {reminders.map((reminder) => (
                <div key={reminder.id} className="p-4 border rounded-lg flex justify-between items-start gap-4 hover:bg-secondary/50 transition-colors">
                  <div className="flex-1 space-y-1.5">
                    <p className="font-semibold text-lg">{reminder.message}</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(reminder.reminderTime), "MMMM d, yyyy 'at' h:mm a")}
                    </p>
                    {reminder.noteId && (
                      <Link href={`/notes/${reminder.noteId}`} className="inline-flex items-center text-sm text-primary hover:underline">
                        <NotebookText className="h-4 w-4 mr-1" />
                        From note: {reminder.noteTitle}
                      </Link>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" onClick={() => handleOpenEditDialog(reminder)}>
                      <Pencil className="h-5 w-5" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" disabled={isPending}>
                          <Trash2 className="h-5 w-5 text-red-500" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete your reminder.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(reminder.id)}>
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Dialog>
  );
}