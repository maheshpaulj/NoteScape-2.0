// src/components/ReminderForm.tsx
'use client';

import { useEffect, useState, useTransition, useRef, useCallback, useMemo } from 'react';
import { createFlag, scheduleReminder, updateReminder } from '@/actions/actions';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, Clock, ChevronsUpDown, Loader2, Plus, Repeat } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Flag, Reminder, RepeatInterval } from '@/types/types';

// --- Reusable iOS-style Time Picker Column ---
interface TimePickerColumnProps {
  options: readonly string[];
  value: string;
  onChange: (newValue: string) => void;
}

const TimePickerColumn = ({ options, value, onChange }: TimePickerColumnProps) => {
  const itemHeight = 32; // h-8 in Tailwind
  const containerRef = useRef<HTMLDivElement>(null);
  const interactionTimeout = useRef<NodeJS.Timeout | null>(null);
  const touchStartY = useRef<number | null>(null);

  const selectedIndex = options.indexOf(value);

  // This useCallback is the key fix. It creates a stable function
  // that always reads the latest `value` and `options` from props.
  const handleInteraction = useCallback((direction: 'up' | 'down') => {
    if (interactionTimeout.current) return;

    // FIX: Get the index from the current props, not a stale closure value.
    const currentIndex = options.indexOf(value);
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

    if (newIndex >= 0 && newIndex < options.length) {
      onChange(options[newIndex]);
    }

    interactionTimeout.current = setTimeout(() => {
      interactionTimeout.current = null;
    }, 50); // Shortened timeout for better responsiveness
  }, [options, value, onChange]);


  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    handleInteraction(e.deltaY < 0 ? 'up' : 'down');
  };
  
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    if (touchStartY.current === null) return;
    
    const deltaY = e.touches[0].clientY - touchStartY.current;

    if (Math.abs(deltaY) > 20) { // Swipe threshold
      handleInteraction(deltaY > 0 ? 'up' : 'down');
      touchStartY.current = e.touches[0].clientY;
    }
  };

  const handleTouchEnd = () => {
    touchStartY.current = null;
  };
  
  return (
    <div
      ref={containerRef}
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="h-40 w-20 overflow-y-hidden"
    >
      <div
        className="transition-transform duration-200 ease-out"
        style={{ transform: `translateY(${itemHeight * 2 - selectedIndex * itemHeight}px)` }}
      >
        {options.map((option, index) => (
          <div
            key={option}
            onClick={() => onChange(option)}
            className={cn(
              'flex items-center justify-center h-8 text-lg cursor-pointer transition-all duration-200',
              'font-mono tabular-nums',
              selectedIndex === index
                ? 'font-semibold text-primary'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {option}
          </div>
        ))}
      </div>
    </div>
  );
};


// --- Helper functions for time conversion ---
const convertTo12Hour = (time24: string): { hour12: string; minute: string; period: 'AM' | 'PM' } => {
  if (!time24 || !time24.includes(':')) return { hour12: '12', minute: '00', period: 'AM' };
  let [hour, minute] = time24.split(':').map(Number);
  const period = hour >= 12 ? 'PM' : 'AM';
  hour = hour % 12;
  minute = minute || 0;
  if (hour === 0) hour = 12;
  return {
    hour12: String(hour).padStart(2, '0'),
    minute: String(minute).padStart(2, '0'),
    period,
  };
};

const convertTo24Hour = (hour12: string, minute: string, period: 'AM' | 'PM'): string => {
  let hour = parseInt(hour12, 10);
  if (period === 'AM' && hour === 12) {
    hour = 0; // Midnight case
  } else if (period === 'PM' && hour !== 12) {
    hour += 12; // Afternoon case
  }
  return `${String(hour).padStart(2, '0')}:${minute}`;
};

// --- Main Reminder Form Component ---
interface ReminderFormProps {
  initialData?: Reminder | null;
  onSave: (savedReminder: Reminder) => void;
  onCancel: () => void;
  allFlags?: Flag[];
  onFlagCreated?: (newFlag: Flag) => void;
}

export function ReminderForm({ initialData, onSave, onCancel, allFlags = [], onFlagCreated }: ReminderFormProps) {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [time, setTime] = useState('09:00'); // Stored as 'HH:mm'
  const [message, setMessage] = useState('');
  const [repeat, setRepeat] = useState<RepeatInterval>('none');
  const [flagIds, setFlagIds] = useState<string[]>([]);
  const [isCreatingFlag, setIsCreatingFlag] = useState(false);
  const [newFlagName, setNewFlagName] = useState('');
  const [newFlagColor, setNewFlagColor] = useState('#808080');
  const [isPending, startTransition] = useTransition();

  const timePickerOptions = useMemo(() => ({
    hours: Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')),
    minutes: Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0')),
    periods: ['AM', 'PM'] as const,
  }), []);

  useEffect(() => {
    if (initialData) {
      const initialDate = new Date(initialData.reminderTime);
      setDate(initialDate);
      setTime(format(initialDate, 'HH:mm'));
      setMessage(initialData.message);
      setRepeat(initialData.repeat || 'none');
      setFlagIds(initialData.flagIds || []);
    } else {
      const now = new Date();
      if (now.getHours() >= 22) {
        now.setDate(now.getDate() + 1);
        now.setHours(9, 0, 0, 0);
      } else {
        now.setHours(now.getHours() + 1, 0, 0, 0);
      }
      setDate(now);
      setTime(format(now, 'HH:mm'));
      setMessage('');
      setRepeat('none');
      setFlagIds([]);
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
        const result = initialData
          ? await updateReminder(initialData.id, reminderDateTime, message, repeat, flagIds)
          : await scheduleReminder(reminderDateTime, message, repeat, flagIds);
        if (result.success) {
          toast.success(`Reminder ${initialData ? 'updated' : 'scheduled'}!`);
          onSave(result.reminder);
        } else {
          throw new Error(result.toString() || 'Operation failed.');
        }
      } catch (error) {
        toast.error((error as Error).message || 'An unknown error occurred.');
      }
    });
  };

  const formatTimeForDisplay = (time24h: string): string => {
    const { hour12, minute, period } = convertTo12Hour(time24h);
    return `${parseInt(hour12, 10)}:${minute} ${period}`;
  };

  const { hour12, minute, period } = convertTo12Hour(time);

  const handleTimeChange = useCallback((part: 'hour' | 'minute' | 'period', value: string) => {
    const currentTime = convertTo12Hour(time);
    const newTime = { ...currentTime };
    
    if (part === 'hour') newTime.hour12 = value;
    if (part === 'minute') newTime.minute = value;
    if (part === 'period') newTime.period = value as 'AM' | 'PM';

    setTime(convertTo24Hour(newTime.hour12, newTime.minute, newTime.period));
  }, [time]);

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

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" role="combobox" className="w-full sm:w-[180px] justify-between" disabled={isPending}>
              <Clock className="mr-2 h-4 w-4" />
              <span className="w-20 tabular-nums text-left">{formatTimeForDisplay(time)}</span>
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 z-[99999]">
            <div className="flex items-center justify-center p-2 relative">
              <div className="absolute top-1/2 -translate-y-1/2 w-full h-8 bg-accent rounded-lg z-[-1]"></div>
              <TimePickerColumn
                options={timePickerOptions.hours}
                value={hour12}
                onChange={(v) => handleTimeChange('hour', v)}
              />
              <span className="text-xl font-bold text-muted-foreground pb-1">:</span>
              <TimePickerColumn
                options={timePickerOptions.minutes}
                value={minute}
                onChange={(v) => handleTimeChange('minute', v)}
              />
              <TimePickerColumn
                options={timePickerOptions.periods}
                value={period}
                onChange={(v) => handleTimeChange('period', v)}
              />
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Tag picker: toggle existing flags, or create a new one inline. */}
      <div className="flex items-center gap-2 flex-wrap">
        {allFlags.map((flag) => {
          const selected = flagIds.includes(flag.id);
          return (
            <Badge
              key={flag.id}
              onClick={() =>
                setFlagIds((prev) =>
                  selected ? prev.filter((id) => id !== flag.id) : [...prev, flag.id]
                )
              }
              style={selected ? { backgroundColor: flag.color, color: 'white' } : { borderColor: flag.color }}
              variant={selected ? 'default' : 'outline'}
              className="cursor-pointer border px-2 py-0.5 select-none"
            >
              {flag.name}
            </Badge>
          );
        })}
        {isCreatingFlag ? (
          <div className="flex items-center gap-1">
            <Input
              autoFocus
              placeholder="Tag name"
              value={newFlagName}
              onChange={(e) => setNewFlagName(e.target.value)}
              className="h-7 w-28 text-xs"
            />
            <Input
              type="color"
              value={newFlagColor}
              onChange={(e) => setNewFlagColor(e.target.value)}
              className="h-7 w-10 p-0.5"
            />
            <Button
              type="button"
              size="sm"
              className="h-7"
              disabled={isPending || !newFlagName}
              onClick={() => {
                startTransition(async () => {
                  try {
                    const newFlag = await createFlag(newFlagName, newFlagColor);
                    onFlagCreated?.(newFlag);
                    setFlagIds((prev) => [...prev, newFlag.id]);
                    setNewFlagName('');
                    setIsCreatingFlag(false);
                  } catch {
                    toast.error('Failed to create tag.');
                  }
                });
              }}
            >
              {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Add'}
            </Button>
            <Button type="button" size="sm" variant="ghost" className="h-7" onClick={() => setIsCreatingFlag(false)}>
              Cancel
            </Button>
          </div>
        ) : (
          <Badge
            variant="outline"
            className="cursor-pointer px-2 py-0.5 text-muted-foreground select-none"
            onClick={() => setIsCreatingFlag(true)}
          >
            <Plus className="h-3 w-3 mr-1" />
            New tag
          </Badge>
        )}
      </div>

      <Select value={repeat} onValueChange={(v) => setRepeat(v as RepeatInterval)} disabled={isPending}>
        <SelectTrigger className="w-full">
          <div className="flex items-center">
            <Repeat className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Repeat" />
          </div>
        </SelectTrigger>
        <SelectContent className="z-[99999]">
          <SelectItem value="none">Does not repeat</SelectItem>
          <SelectItem value="daily">Daily</SelectItem>
          <SelectItem value="weekly">Weekly</SelectItem>
          <SelectItem value="monthly">Monthly</SelectItem>
        </SelectContent>
      </Select>

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