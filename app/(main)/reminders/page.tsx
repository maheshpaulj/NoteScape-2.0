// src/app/reminders/page.tsx
'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { getAllUserReminders, getAllUserFlags, deleteReminder } from '@/actions/actions';
import { toast } from 'sonner';
import { isToday, isTomorrow, isThisWeek, isPast } from 'date-fns';
import { AlarmClock, Plus, Loader2 } from 'lucide-react';

// UI Imports
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { cn } from '@/lib/utils'; // Import cn for conditional classes

// Custom Component Imports
import { ReminderForm } from '@/components/ReminderForm';
import { NotificationPermissionBanner } from '@/components/Reminders/NotificationPermissionBanner';
import { ReminderItem } from '@/components/Reminders/ReminderItem';
import { ReminderFilterBar } from '@/components/Reminders/ReminderFilterBar';
import { Flag, Reminder } from '@/types/types';

// Helper function to group reminders (no changes needed here)
const groupReminders = (reminders: Reminder[]) => {
  const groups = {
    missed: [] as Reminder[],
    today: [] as Reminder[],
    tomorrow: [] as Reminder[],
    thisWeek: [] as Reminder[],
    later: [] as Reminder[],
    completed: [] as Reminder[],
  };
  const sorted = [...reminders].sort((a,b) => new Date(a.reminderTime).getTime() - new Date(b.reminderTime).getTime());

  sorted.forEach(r => {
    if (r.isDone) {
      groups.completed.push(r);
      return;
    }
    const reminderDate = new Date(r.reminderTime);
    if (isPast(reminderDate)) {
      groups.missed.push(r);
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
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [allFlags, setAllFlags] = useState<Flag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);
  const [isCurrentDeviceSubscribed, setIsCurrentDeviceSubscribed] = useState<boolean | null>(null);
  const [notificationPermission, setNotificationPermission] = useState<PermissionState | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilterIds, setActiveFilterIds] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition(); //eslint-disable-line @typescript-eslint/no-unused-vars

  useEffect(() => {
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
        console.error("Data fetching error:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAllData();
  }, []);

  const filteredReminders = useMemo(() => {
    return reminders.filter(r => {
      const searchMatch = r.message.toLowerCase().includes(searchTerm.toLowerCase());
      if (activeFilterIds.length === 0) return searchMatch;
      const filterMatch = activeFilterIds.every(filterId => (r.flagIds || []).includes(filterId));
      return searchMatch && filterMatch;
    });
  }, [reminders, searchTerm, activeFilterIds]);

  const reminderGroups = useMemo(() => groupReminders(filteredReminders), [filteredReminders]);
  const hasVisibleReminders = filteredReminders.length > 0;

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

  const handleUpdateReminderState = (updatedReminder: Partial<Reminder> & { id: string }) => {
    setReminders(prev => prev.map(r => r.id === updatedReminder.id ? { ...r, ...updatedReminder } : r));
  };
  const handleFlagCreated = (newFlag: Flag) => { setAllFlags(prev => [...prev, newFlag]); };
  
  const handleFilterChange = (flagId: string) => {
    setActiveFilterIds(prev =>
      prev.includes(flagId) ? prev.filter(id => id !== flagId) : [...prev, flagId]
    );
  };
  const handleClearFilters = () => setActiveFilterIds([]);
  
  // Define the order and properties for our reminder groups
  const groupOrder = [
    { title: "Missed", data: reminderGroups.missed, value: "missed", isRed: true },
    { title: "Today", data: reminderGroups.today, value: "today" },
    { title: "Tomorrow", data: reminderGroups.tomorrow, value: "tomorrow" },
    { title: "This Week", data: reminderGroups.thisWeek, value: "this-week" },
    { title: "Later", data: reminderGroups.later, value: "later" },
    { title: "Completed", data: reminderGroups.completed, value: "completed" },
  ];

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <div className="container mx-auto p-4 md:p-8 max-w-3xl">
        <NotificationPermissionBanner isSubscribed={isCurrentDeviceSubscribed} permission={notificationPermission} />
        
        <div className="flex items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-3"><AlarmClock className="h-6 w-6 text-muted-foreground" /><h1 className="text-2xl font-bold">Reminders</h1></div>
          <Button size="sm" onClick={handleOpenAddDialog}><Plus className="h-4 w-4 mr-2" />Add Reminder</Button>
        </div>
        
        <ReminderFilterBar
          allFlags={allFlags}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          activeFilterIds={activeFilterIds}
          onFilterChange={handleFilterChange}
          onClearFilters={handleClearFilters}
        />

        <DialogContent><DialogHeader><DialogTitle>{editingReminder ? 'Edit Reminder' : 'Add a New Reminder'}</DialogTitle></DialogHeader><ReminderForm initialData={editingReminder} onSave={handleSave} onCancel={() => setIsDialogOpen(false)} /></DialogContent>
        
        <div className="mt-4">
          {isLoading ? (
            <div className="flex justify-center items-center h-[50vh]"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
          ) : hasVisibleReminders ? (
            <Accordion type="multiple" defaultValue={['missed', 'today']} className="w-full">
              {groupOrder.map(group => {
                if (group.data.length === 0) return null; // Don't render empty groups

                return (
                  <AccordionItem value={group.value} key={group.value}>
                    <AccordionTrigger className={cn(
                      "text-sm font-semibold hover:no-underline px-2",
                      group.isRed 
                        ? "text-red-500" // Red for missed
                        : "text-muted-foreground"
                    )}>
                      {group.title} ({group.data.length})
                    </AccordionTrigger>
                    <AccordionContent className="border-t">
                      {group.data.map(r => (
                        <ReminderItem
                          key={r.id}
                          reminder={{...r, flagIds: r.flagIds || []}}
                          allFlags={allFlags || []}
                          onUpdate={handleUpdateReminderState}
                          onDelete={handleDelete}
                          onEdit={handleOpenEditDialog}
                          onFlagCreated={handleFlagCreated}
                        />
                      ))}
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          ) : (
            <div className="text-center text-muted-foreground mt-16 p-8 border-2 border-dashed rounded-lg">
              <p className="text-lg font-medium">{searchTerm || activeFilterIds.length > 0 ? "No Matching Reminders" : "No Reminders Yet"}</p>
              <p className="text-sm">{searchTerm || activeFilterIds.length > 0 ? "Try adjusting your search or filters." : "Click the \"Add Reminder\" button to create one."}</p>
            </div>
          )}
        </div>
      </div>
    </Dialog>
  );
}