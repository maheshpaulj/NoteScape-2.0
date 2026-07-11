'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { format, isPast, isSameDay, isToday, isTomorrow } from 'date-fns';
import { AlarmClock, AlertTriangle, ChevronRight } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Flag, Reminder } from '@/types/types';

/**
 * iPhone-calendar-style widget for the home screen: a mini month grid with
 * dots on days that have reminders, plus the selected day's (or upcoming)
 * reminders alongside.
 */
export function HomeCalendarWidget({ reminders, flags = [] }: { reminders: Reminder[]; flags?: Flag[] }) {
  const router = useRouter();
  const [selectedDay, setSelectedDay] = useState<Date | undefined>();
  const flagMap = useMemo(() => new Map(flags.map((f) => [f.id, f])), [flags]);

  const activeReminders = useMemo(
    () => reminders.filter((r) => !r.isDone),
    [reminders]
  );

  const daysWithReminders = useMemo(
    () => activeReminders.map((r) => new Date(r.reminderTime)),
    [activeReminders]
  );

  const missedCount = useMemo(
    () => activeReminders.filter((r) => isPast(new Date(r.reminderTime))).length,
    [activeReminders]
  );

  // Reminders for the selected day, or the next 5 upcoming when no day picked.
  const listed = useMemo(() => {
    const sorted = [...activeReminders].sort(
      (a, b) => new Date(a.reminderTime).getTime() - new Date(b.reminderTime).getTime()
    );
    if (selectedDay) {
      return sorted.filter((r) => isSameDay(new Date(r.reminderTime), selectedDay));
    }
    return sorted.filter((r) => !isPast(new Date(r.reminderTime))).slice(0, 5);
  }, [activeReminders, selectedDay]);

  const formatTime = (time: Date | string) => {
    const date = new Date(time);
    if (selectedDay) return format(date, 'h:mm a');
    if (isToday(date)) return `Today, ${format(date, 'h:mm a')}`;
    if (isTomorrow(date)) return `Tomorrow, ${format(date, 'h:mm a')}`;
    return format(date, 'MMM d, h:mm a');
  };

  return (
    <div className="mb-8 p-4 border rounded-lg bg-card">
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-2">
          <AlarmClock className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-xl font-semibold">Reminders</h2>
        </div>
        <button
          onClick={() => router.push('/reminders')}
          className="text-sm text-muted-foreground hover:text-foreground hover:underline flex items-center gap-0.5"
        >
          View all <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <Calendar
          mode="single"
          selected={selectedDay}
          onSelect={setSelectedDay}
          modifiers={{ hasReminder: daysWithReminders }}
          modifiersClassNames={{ hasReminder: 'day-has-reminder' }}
          className="rounded-md border mx-auto md:mx-0"
        />

        <div className="flex-1 min-w-0 space-y-3">
          {missedCount > 0 && !selectedDay && (
            <button
              onClick={() => router.push('/reminders')}
              className="w-full p-3 rounded-md bg-destructive/10 flex items-center gap-2 text-red-500 hover:bg-destructive/20 transition-colors"
            >
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span className="font-semibold">{missedCount} missed reminder{missedCount > 1 ? 's' : ''}</span>
            </button>
          )}

          <div className="p-3 rounded-md bg-accent/50">
            <h3 className="font-semibold text-muted-foreground mb-2 text-sm">
              {selectedDay ? format(selectedDay, 'EEEE, MMM d') : 'Upcoming'}
            </h3>
            {listed.length > 0 ? (
              <ul className="space-y-2">
                {listed.map((reminder) => (
                  <li
                    key={reminder.id}
                    className="text-sm flex justify-between items-center gap-4"
                  >
                    <span className="flex items-center gap-1.5 min-w-0">
                      <span className={cn('truncate', isPast(new Date(reminder.reminderTime)) && 'text-red-500')}>
                        {reminder.message}
                      </span>
                      {(reminder.flagIds || []).map((id) => {
                        const flag = flagMap.get(id);
                        if (!flag) return null;
                        return (
                          <Badge
                            key={id}
                            style={{ backgroundColor: flag.color, color: 'white' }}
                            className="border-none px-1.5 py-0 text-[10px] shrink-0"
                          >
                            {flag.name}
                          </Badge>
                        );
                      })}
                    </span>
                    <span className="text-muted-foreground whitespace-nowrap">
                      {formatTime(reminder.reminderTime)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                {selectedDay ? 'No reminders this day.' : 'No upcoming reminders.'}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
