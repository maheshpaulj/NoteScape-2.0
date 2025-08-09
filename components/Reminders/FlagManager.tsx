'use client';

import { createFlag, setReminderFlags } from "@/actions/actions";
import { Check, Loader2, Plus, Tag } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Flag } from "@/types/types";

interface FlagManagerProps {
  allFlags: Flag[];
  reminderFlagIds: string[];
  reminderId: string;
  onFlagsChanged: (newFlagIds: string[]) => void;
  onFlagCreated: (newFlag: Flag) => void;
}

export const FlagManager = ({ allFlags, reminderFlagIds, reminderId, onFlagsChanged, onFlagCreated }: FlagManagerProps) => {
  const [isPending, startTransition] = useTransition();
  const [isCreateMode, setCreateMode] = useState(false);
  const [newFlagName, setNewFlagName] = useState("");
  const [newFlagColor, setNewFlagColor] = useState("#808080"); // Default grey
  const [isOpen, setIsOpen] = useState(false);

  const handleToggleFlag = (flagId: string) => {
    const newFlagIds = reminderFlagIds.includes(flagId)
      ? reminderFlagIds.filter(id => id !== flagId)
      : [...reminderFlagIds, flagId];

    startTransition(async () => {
      await setReminderFlags(reminderId, newFlagIds);
      onFlagsChanged(newFlagIds);
    });
  };
  
  const handleCreateFlag = () => {
    if (!newFlagName) {
      toast.error("Flag name cannot be empty.");
      return;
    }
    startTransition(async () => {
      try {
        const newFlag = await createFlag(newFlagName, newFlagColor);
        onFlagCreated(newFlag);
        // Automatically assign the newly created flag
        const newFlagIds = [...reminderFlagIds, newFlag.id];
        await setReminderFlags(reminderId, newFlagIds);
        onFlagsChanged(newFlagIds);
        
        setCreateMode(false);
        setNewFlagName("");
        toast.success(`Flag "${newFlag.name}" created and assigned!`);
      } catch (error) {
        toast.error("Failed to create flag.");
        console.error("Flag creation error:", error);
      }
    });
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon"><Tag className="h-4 w-4 text-muted-foreground" /></Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-60 z-[60]" align="end">
        <Command>
          <CommandInput placeholder="Assign or create flag..." />
          <CommandList>
            <CommandEmpty>No flags found.</CommandEmpty>
            <CommandGroup>
              {allFlags.map((flag) => {
                const isSelected = reminderFlagIds.includes(flag.id);
                return (
                  <CommandItem key={flag.id} onSelect={() => handleToggleFlag(flag.id)}>
                    <div className={cn("mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary", isSelected ? "bg-primary text-primary-foreground" : "opacity-50 [&_svg]:invisible")}>
                      <Check className="h-4 w-4" />
                    </div>
                    <div className="h-4 w-4 rounded-full mr-2 flex-shrink-0" style={{ backgroundColor: flag.color }} />
                    <span className="truncate">{flag.name}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup>
              {isCreateMode ? (
                <div className="p-2 space-y-2">
                  <Input autoFocus placeholder="New flag name" value={newFlagName} onChange={e => setNewFlagName(e.target.value)} />
                  <div className="flex items-center gap-2">
                    <label htmlFor="color-picker" className="text-sm">Color:</label>
                    <Input id="color-picker" type="color" value={newFlagColor} onChange={e => setNewFlagColor(e.target.value)} className="h-8 w-16 p-1"/>
                    <Button size="sm" onClick={handleCreateFlag} disabled={isPending}>
                      {isPending ? <Loader2 className="h-4 w-4 animate-spin"/> : "Create"}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setCreateMode(false)}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <CommandItem onSelect={() => setCreateMode(true)}>
                  <Plus className="mr-2 h-4 w-4" /> Create new flag
                </CommandItem>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};