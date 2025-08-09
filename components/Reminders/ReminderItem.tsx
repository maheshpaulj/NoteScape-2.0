'use client';

import { toggleReminderDone } from "@/actions/actions";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { NotebookText, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { FlagManager } from "./FlagManager";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Flag, Reminder } from "@/types/types";

interface ReminderItemProps {
  reminder: Reminder;
  allFlags: Flag[];
  onUpdate: (updatedReminder: Partial<Reminder> & { id: string }) => void;
  onDelete: (reminderId: string) => void;
  onEdit: (reminder: Reminder) => void;
  onFlagCreated: (newFlag: Flag) => void;
}

export const ReminderItem = ({ reminder, allFlags, onUpdate, onDelete, onEdit, onFlagCreated }: ReminderItemProps) => {
  const [isPending, startTransition] = useTransition();
  // Create a quick lookup map for performance
  const flagMap = new Map(allFlags.map(f => [f.id, f]));

  const handleToggleDone = (checked: boolean) => {
    startTransition(async () => {
      await toggleReminderDone(reminder.id, checked);
      onUpdate({ id: reminder.id, isDone: checked });
    });
  };

  return (
    <div
      className={cn(
        "group flex items-start gap-3 p-2 rounded-md transition-colors hover:bg-secondary/50",
        isPending && "opacity-50 pointer-events-none"
      )}
    >
      <Checkbox
        id={`reminder-${reminder.id}`}
        checked={reminder.isDone}
        onCheckedChange={handleToggleDone}
        className="mt-1 flex-shrink-0"
      />
      
      <div className="flex-1 space-y-1.5 min-w-0">
        <p className={cn("font-medium break-words", reminder.isDone && "line-through text-muted-foreground")}>
          {reminder.message}
        </p>
        <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
          {!reminder.isDone && (
            <span className="whitespace-nowrap">{format(new Date(reminder.reminderTime), "E, MMM d")}</span>
          )}
          {reminder.flagIds.map(id => {
            const flag = flagMap.get(id);
            if (!flag) return null;
            return <Badge key={id} style={{ backgroundColor: flag.color, color: 'white' }} className="border-none">{flag.name}</Badge>
          })}
          {reminder.noteId && (
            <Link href={`/notes/${reminder.noteId}`} className="flex items-center gap-1 hover:text-primary whitespace-nowrap">
              <NotebookText className="h-3 w-3" />
              <span className="truncate">{reminder.noteTitle}</span>
            </Link>
          )}
        </div>
      </div>
      
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