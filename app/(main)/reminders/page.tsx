// src/app/reminders/page.tsx
'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import {
  getAllUserReminders,
  getAllUserFlags,
  deleteReminder,
} from '@/actions/actions';
import { toast } from 'sonner';
import { isToday, isTomorrow, isThisWeek, isPast } from 'date-fns';
import { AlarmClock, Plus, Loader2 } from 'lucide-react';

// UI Imports
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

// Custom Component Imports - Assuming they are in the root of /components
import { ReminderForm } from '@/components/ReminderForm';
import { NotificationPermissionBanner } from '@/components/Reminders/NotificationPermissionBanner';
import { ReminderItem } from '@/components/Reminders/ReminderItem';
import { Flag, Reminder } from '@/types/types'; // <-- Corrected import path

// Helper function to group reminders
const groupReminders = (reminders: Reminder[]) => {
  const groups = {
    today: [] as Reminder[],
    tomorrow: [] as Reminder[],
    thisWeek: [] as Reminder[],
    later: [] as Reminder[],
    completed: [] as Reminder[],
  };
  const sortedReminders = [...reminders].sort((a, b) => new Date(a.reminderTime).getTime() - new Date(b.reminderTime).getTime());
  sortedReminders.forEach(r => {
    if (r.isDone) {
      groups.completed.push(r);
      return;
    }
    const reminderDate = new Date(r.reminderTime);
    if(isPast(reminderDate) && !isToday(reminderDate)) {
      groups.today.push(r);
    } else if (isToday(reminderDate)) {
      groups.today.push(r);
    } else if (isTomorrow(reminderDate)) {
      groups.tomorrow.push(r);
    } else if (isThisWeek(reminderDate, { weekStartsOn: 1 })) {
      groups.thisWeek.push(r);
    } else {
      groups.later.push(r);
    }
  });
  return groups;
};


export default function RemindersPage() {
  // Your state is perfect, just adding one for flags.
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [allFlags, setAllFlags] = useState<Flag[]>([]); // <-- NEW
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);
  
  // Your state variables for notifications are kept exactly as they were.
  const [isCurrentDeviceSubscribed, setIsCurrentDeviceSubscribed] = useState<boolean | null>(null);
  const [notificationPermission, setNotificationPermission] = useState<PermissionState | null>(null);
  const [isPending, startTransition] = useTransition(); // eslint-disable-line @typescript-eslint/no-unused-vars

  useEffect(() => {
    // This is YOUR working effect for notifications. It is preserved.
    const checkNotificationState = async () => {
      if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('permissions' in navigator)) return;
      const permissionStatus = await navigator.permissions.query({ name: 'notifications' });
      setNotificationPermission(permissionStatus.state);
      permissionStatus.onchange = () => setNotificationPermission(permissionStatus.state);
      const swRegistration = await navigator.serviceWorker.ready;
      const subscription = await swRegistration.pushManager.getSubscription();
      setIsCurrentDeviceSubscribed(!!subscription);
    };
    checkNotificationState();

    // The data fetching is now updated to get flags as well.
    const fetchAllData = async () => {
      setIsLoading(true);
      try {
        const [userReminders, userFlags] = await Promise.all([
          getAllUserReminders(),
          getAllUserFlags()
        ]);
        setReminders(userReminders);
        setAllFlags(userFlags);
      } catch (error) {
        toast.error('Failed to load your data. Please refresh the page.');
        console.error("Flag creation error:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAllData();
  }, []);

  // --- Handlers ---
  const handleOpenAddDialog = () => { setEditingReminder(null); setIsDialogOpen(true); };
  const handleOpenEditDialog = (reminder: Reminder) => { setEditingReminder(reminder); setIsDialogOpen(true); };
  const handleSave = (savedReminder: Reminder) => {
    if (editingReminder) {
      setReminders(prev => prev.map(r => r.id === savedReminder.id ? savedReminder : r));
    } else {
      setReminders(prev => [...prev, savedReminder]);
    }
    setIsDialogOpen(false);
  };
  
  const handleDelete = (reminderId: string) => {
    const originalReminders = [...reminders];
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
  
  // NEW handlers to pass down to the ReminderItem component
  const handleUpdateReminderState = (updatedReminder: Partial<Reminder> & { id: string }) => {
    setReminders(prev => prev.map(r => r.id === updatedReminder.id ? { ...r, ...updatedReminder } : r));
  };
  const handleFlagCreated = (newFlag: Flag) => {
    setAllFlags(prev => [...prev, newFlag]);
  };

  // --- Grouping and Rendering ---
  const reminderGroups = useMemo(() => groupReminders(reminders), [reminders]);

  const renderGroup = (title: string, group: Reminder[]) => {
    if (group.length === 0) return null;
    return (
      <div key={title}>
        <h2 className="text-sm font-semibold text-muted-foreground my-2 px-2">{title}</h2>
        <div className="border-t">
          {group.map(r => (
            <ReminderItem
              key={r.id}
              reminder={r}
              allFlags={allFlags}
              onUpdate={handleUpdateReminderState}
              onDelete={handleDelete}
              onEdit={handleOpenEditDialog}
              onFlagCreated={handleFlagCreated}
            />
          ))}
        </div>
      </div>
    );
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <div className="container mx-auto p-4 md:p-8 max-w-3xl">
        {/* Pass the correct props to YOUR version of the banner */}
        <NotificationPermissionBanner
          permission={notificationPermission}
          isSubscribed={isCurrentDeviceSubscribed}
        />

        <div className="flex items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-3">
            <AlarmClock className="h-6 w-6 text-muted-foreground" />
            <h1 className="text-2xl font-bold">Reminders</h1>
          </div>
          <Button size="sm" onClick={handleOpenAddDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Add Reminder
          </Button>
        </div>

        <DialogContent>
          <DialogHeader><DialogTitle>{editingReminder ? 'Edit Reminder' : 'Add a New Reminder'}</DialogTitle></DialogHeader>
          <ReminderForm initialData={editingReminder} onSave={handleSave} onCancel={() => setIsDialogOpen(false)} />
        </DialogContent>
        
        <div className="mt-8">
          {isLoading ? (
            // State 1: Loading
            <div className="flex justify-center items-center h-[50vh]">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : reminders.length > 0 ? (
            // State 2: Data exists, render the groups
            <>
              {renderGroup("Today", reminderGroups.today)}
              {renderGroup("Tomorrow", reminderGroups.tomorrow)}
              {renderGroup("This Week", reminderGroups.thisWeek)}
              {renderGroup("Later", reminderGroups.later)}
            
              {reminderGroups.completed.length > 0 && (
                <Accordion type="single" collapsible className="w-full mt-4">
                  <AccordionItem value="completed">
                    <AccordionTrigger className="text-sm font-semibold text-muted-foreground px-2 hover:no-underline">
                      Completed ({reminderGroups.completed.length})
                    </AccordionTrigger>
                    <AccordionContent className="border-t pt-2">
                      {reminderGroups.completed.map(r => (
                        <ReminderItem
                          key={r.id}
                          reminder={r}
                          allFlags={allFlags}
                          onUpdate={handleUpdateReminderState}
                          onDelete={handleDelete}
                          onEdit={handleOpenEditDialog}
                          onFlagCreated={handleFlagCreated}
                        />
                      ))}
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              )}
            </>
          ) : (
            // State 3: Loading is finished, but there is no data
            <div className="text-center text-muted-foreground mt-16 p-8 border-2 border-dashed rounded-lg">
              <p className="text-lg font-medium">No Reminders Yet</p>
              <p className="text-sm">Click the &quot;Add Reminder&quot; button to create your first one.</p>
            </div>
          )}
        </div>
      </div>
    </Dialog>
  );
}