// src/components/ReminderItem.tsx
'use client';

import { toggleReminderDone } from "@/actions/actions";
import { cn } from "@/lib/utils";
import { format, isPast, isToday } from "date-fns";
import { NotebookText, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useTransition } from "react";

// UI Imports
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { FlagManager } from "./FlagManager";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Flag, Reminder } from "@/types/types";

// The props this component expects from the main RemindersPage
interface ReminderItemProps {
  reminder: Reminder;
  allFlags: Flag[];
  onUpdate: (updatedReminder: Partial<Reminder> & { id: string }) => void;
  onDelete: (reminderId: string) => void;
  onEdit: (reminder: Reminder) => void;
  onFlagCreated: (newFlag: Flag) => void;
}

export const ReminderItem = ({
  reminder,
  allFlags,
  onUpdate,
  onDelete,
  onEdit,
  onFlagCreated,
}: ReminderItemProps) => {
  const [isPending, startTransition] = useTransition();

  // Create a quick lookup map for performance when finding flag details
  const flagMap = new Map(allFlags.map(f => [f.id, f]));

  // Handler for the checkbox
  const handleToggleDone = (checked: boolean) => {
    startTransition(async () => {
      // Call the server action
      await toggleReminderDone(reminder.id, checked);
      // Notify the parent page to update its state for an instant UI change
      onUpdate({ id: reminder.id, isDone: checked });
    });
  };

  // --- Logic for Visual Styling and Date/Time Formatting ---
  const reminderDate = new Date(reminder.reminderTime);
  // A reminder is "missed" if its date is in the past, but not today.
  const isMissed = isPast(reminderDate) && !isToday(reminderDate);
  
  // New format that includes the time: e.g., "Mon, Aug 26 at 5:00 PM"
  const formattedDateTime = format(reminderDate, "E, MMM d 'at' h:mm a");

  return (
    <div
      className={cn(
        "group flex items-start gap-3 p-2 rounded-md transition-colors hover:bg-secondary/50",
        // Visually fade the item while a server action is pending
        isPending && "opacity-50 pointer-events-none"
      )}
    >
      <Checkbox
        id={`reminder-${reminder.id}`}
        checked={reminder.isDone}
        onCheckedChange={handleToggleDone}
        className="mt-1 flex-shrink-0"
        aria-label="Mark reminder as done"
      />
      
      <div className="flex-1 space-y-1.5 min-w-0">
        {/* Main reminder message */}
        <p className={cn("font-medium break-words", reminder.isDone && "line-through text-muted-foreground")}>
          {reminder.message}
        </p>
        
        {/* Sub-line for metadata: date, time, flags, and note link */}
        <div className="flex items-center gap-x-3 gap-y-1 flex-wrap text-xs text-muted-foreground">
          {!reminder.isDone && (
            <span className={cn(
              "whitespace-nowrap font-medium",
              isMissed && "text-red-600 dark:text-red-500" // Apply red color if missed
            )}>
              {formattedDateTime}
            </span>
          )}

          {/* Render colored flag pills */}
          {reminder.flagIds.map(id => {
            const flag = flagMap.get(id);
            if (!flag) return null;
            return (
              <Badge 
                key={id} 
                style={{ backgroundColor: flag.color, color: 'white' }} 
                className="border-none px-1.5 py-0.5"
              >
                {flag.name}
              </Badge>
            );
          })}

          {/* Link to the associated note, if it exists */}
          {reminder.noteId && (
            <Link href={`/notes/${reminder.noteId}`} className="flex items-center gap-1 hover:text-primary whitespace-nowrap">
              <NotebookText className="h-3 w-3" />
              <span className="truncate max-w-[150px]">{reminder.noteTitle}</span>
            </Link>
          )}
        </div>
      </div>
      
      {/* Action buttons appear on hover for a cleaner UI */}
      <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
        <FlagManager
          allFlags={allFlags}
          reminderFlagIds={reminder.flagIds}
          reminderId={reminder.id}
          onFlagsChanged={(newFlagIds) => onUpdate({ id: reminder.id, flagIds: newFlagIds })}
          onFlagCreated={onFlagCreated}
        />
        {!reminder.isDone && (
          <Button variant="ghost" size="icon" onClick={() => onEdit(reminder)}>
            <Pencil className="h-4 w-4 text-muted-foreground" />
          </Button>
        )}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="icon">
              <Trash2 className="h-4 w-4 text-red-500" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete this reminder.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => onDelete(reminder.id)}>
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
};