// src/components/ReminderFilterBar.tsx
'use client';

import { Flag } from "@/types/types";
import { Check, Filter, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

interface ReminderFilterBarProps {
  allFlags: Flag[];
  searchTerm: string;
  onSearchChange: (term: string) => void;
  activeFilterIds: string[];
  onFilterChange: (flagId: string) => void;
  onClearFilters: () => void;
}

export const ReminderFilterBar = ({
  allFlags,
  searchTerm,
  onSearchChange,
  activeFilterIds,
  onFilterChange,
  onClearFilters,
}: ReminderFilterBarProps) => {
  const activeFilterCount = activeFilterIds.length;

  return (
    <div className="flex flex-col sm:flex-row gap-2 mb-4">
      {/* Search Input */}
      <div className="relative flex-1">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search reminders..."
          className="pl-8"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      {/* Flag Filter Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="flex-shrink-0">
            <Filter className="mr-2 h-4 w-4" />
            Filter by Flag
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="ml-2 rounded-full px-1.5">
                {activeFilterCount}
              </Badge>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60">
          <DropdownMenuLabel>Filter by Flag</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {allFlags.length > 0 ? (
            allFlags.map(flag => {
              const isSelected = activeFilterIds.includes(flag.id);
              return (
                <DropdownMenuItem
                  key={flag.id}
                  onSelect={(e) => {
                    e.preventDefault(); // Prevents menu from closing on click
                    onFilterChange(flag.id);
                  }}
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center">
                      <div className="h-4 w-4 rounded-full mr-2" style={{ backgroundColor: flag.color }} />
                      <span className="truncate">{flag.name}</span>
                    </div>
                    {isSelected && <Check className="h-4 w-4" />}
                  </div>
                </DropdownMenuItem>
              );
            })
          ) : (
            <div className="px-2 py-1.5 text-sm text-muted-foreground">
              No flags created yet.
            </div>
          )}
          {activeFilterCount > 0 && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={onClearFilters} className="text-red-500 focus:text-red-500 focus:bg-red-500/10">
                <X className="mr-2 h-4 w-4" />
                Clear Filters
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};