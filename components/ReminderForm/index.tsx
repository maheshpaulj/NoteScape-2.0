// src/components/ReminderForm.tsx
'use client';

import { useEffect, useState, useTransition } from 'react';
import { scheduleReminder, updateReminder, Reminder } from '@/actions/actions';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface ReminderFormProps {
  initialData?: Reminder | null; // Pass a reminder here to enter "edit" mode
  onSave: (savedReminder: Reminder) => void; // Callback to notify parent of save
  onCancel: () => void; // Callback to close the dialog
}

export function ReminderForm({ initialData, onSave, onCancel }: ReminderFormProps) {
  const [date, setDate] = useState<Date | undefined>();
  const [time, setTime] = useState('');
  const [message, setMessage] = useState('');
  const [isPending, startTransition] = useTransition();

  // Pre-fill the form if we are in "edit" mode
  useEffect(() => {
    if (initialData) {
      setDate(new Date(initialData.reminderTime));
      setTime(format(new Date(initialData.reminderTime), 'HH:mm'));
      setMessage(initialData.message);
    } else {
      // Set defaults for "add" mode
      const defaultTime = new Date();
      defaultTime.setHours(17, 0, 0, 0); // 5 PM
      setDate(new Date());
      setTime(format(defaultTime, 'HH:mm'));
      setMessage('');
    }
  }, [initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !time || !message) {
      toast.error('Please complete all fields.');
      return;
    }

    const [hours, minutes] = time.split(':').map(Number);
    const reminderDateTime = new Date(date);
    reminderDateTime.setHours(hours, minutes, 0, 0);

    if (reminderDateTime < new Date() && !initialData) {
      toast.error('Cannot set a new reminder for a past date.');
      return;
    }

    startTransition(async () => {
      try {
        let result;
        if (initialData) {
          // EDIT MODE
          result = await updateReminder(initialData.id, reminderDateTime, message);
        } else {
          // ADD MODE
          result = await scheduleReminder(reminderDateTime, message);
        }

        if (result.success) {
          toast.success(`Reminder ${initialData ? 'updated' : 'scheduled'}!`);
          onSave(result.reminder);
        } else {
          throw new Error('Operation failed.');
        }
      } catch (error) {
        toast.error((error as Error).message || 'An unknown error occurred.');
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-4">
      <Input
        placeholder="Reminder message (e.g., Follow up on project)"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        required
        disabled={isPending}
      />
      <div className="flex flex-col sm:flex-row gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant={'outline'} className={cn('w-full justify-start text-left font-normal', !date && 'text-muted-foreground')} disabled={isPending}>
              <CalendarIcon className="mr-2 h-4 w-4" />
              {date ? format(date, 'PPP') : <span>Pick a date</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 z-[99999]">
            <Calendar mode="single" selected={date} onSelect={setDate} initialFocus />
          </PopoverContent>
        </Popover>
        <div className="relative w-full sm:w-auto">
          <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="pl-10" required disabled={isPending}/>
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={isPending}>
          Cancel
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Saving...' : 'Save Reminder'}
        </Button>
      </div>
    </form>
  );
}