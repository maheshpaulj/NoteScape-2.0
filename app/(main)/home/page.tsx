// src/app/notes/page.tsx
'use client';

import { useState, useEffect, useMemo, useTransition } from 'react';
import { createNewNote, getAllUserFlags, getAllUserReminders } from '@/actions/actions';
import { Button } from '@/components/ui/button';
import { useUser } from '@clerk/nextjs';
import { PlusCircle, Pin, Clock, Search, ChevronDown, ChevronUp } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Timestamp } from 'firebase/firestore';
import { Spinner } from '@/components/Spinner';
import { Flag, Reminder, RoomDocument } from '@/types/types';
import { useRooms } from '@/hooks/useRooms';
import { HomeCalendarWidget } from '@/components/Reminders/HomeCalendarWidget';

type NoteType = RoomDocument;


export default function Page() {
  const { user } = useUser();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { rooms, loading } = useRooms();
  const [allReminders, setAllReminders] = useState<Reminder[]>([]);
  const [allFlags, setAllFlags] = useState<Flag[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showText, setShowText] = useState(false);
  const [expandedRecent, setExpandedRecent] = useState<boolean>(false);
  const [searchResults, setSearchResults] = useState<NoteType[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);

  useEffect(() => {
    const handleResize = () => setShowText(window.innerWidth > 768);
    handleResize(); // Set initial state
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (!user) return;
    Promise.all([getAllUserReminders(), getAllUserFlags()])
      .then(([reminders, flags]) => {
        setAllReminders(reminders);
        setAllFlags(flags);
      })
      .catch((error) => console.error('Error fetching reminders:', error));
  }, [user]);

  // Notes come live from the shared rooms store (cached in IndexedDB, so this
  // renders instantly on revisit).
  const { allNotes, pinnedNotes, recentNotes } = useMemo(() => {
    const filteredNotes = rooms.filter(note => !note.archived);
    const pinned = filteredNotes.filter(note => note.quickAccess);
    const nonPinned = filteredNotes
      .filter(note => !note.quickAccess)
      .sort((a, b) => (b.updatedAt?.seconds || 0) - (a.updatedAt?.seconds || 0));
    return {
      allNotes: filteredNotes,
      pinnedNotes: pinned,
      recentNotes: expandedRecent ? nonPinned : nonPinned.slice(0, 6),
    };
  }, [rooms, expandedRecent]);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setIsSearching(false);
      setSearchResults([]);
      return;
    }
    
    setIsSearching(true);
    const lowerQuery = searchQuery.toLowerCase();
    const results = allNotes.filter(note => 
      note.title?.toLowerCase().includes(lowerQuery)
    );
    setSearchResults(results);
  }, [searchQuery, allNotes]);

  const handleCreateNewNote = () => {
    startTransition(async() => {
      const {noteId} = await createNewNote();
      router.push(`/notes/${noteId}`);
    });
  };

  const formatDate = (timestamp: Timestamp | undefined) => {
    if (!timestamp) return '';
    const date = new Date(timestamp.seconds * 1000);
    return new Intl.DateTimeFormat('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    }).format(date);
  };
  
  const toggleShowMore = () => {
    setExpandedRecent(!expandedRecent);
  };
  
  const NoteCard = ({ note, isPinned = false }: { note: NoteType, isPinned?: boolean }) => (
    <div 
      className="p-4 border rounded-lg hover:border-gray-400 cursor-pointer transition-all bg-card"
      onClick={() => router.push(`/notes/${note.roomId}`)}
    >
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2">
          {note.icon ? <div className="text-xl">{note.icon}</div> : <div className="w-5 h-5">🗒️</div>}
          <h3 className="font-medium truncate">{note.title || "Untitled"}</h3>
        </div>
        {isPinned && <Pin className="h-4 w-4 text-muted-foreground" />}
      </div>
      <p className="text-xs text-muted-foreground mt-2">
        Updated {formatDate(note.updatedAt)}
      </p>
    </div>
  );
  
  const NotesGrid = ({ notes, title, icon, emptyMessage, showToggle = false, isExpanded = false, onToggle }: any) => (  //eslint-disable-line @typescript-eslint/no-explicit-any
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {icon}
          <h2 className="text-xl font-semibold">{title}</h2>
        </div>
        {showToggle && allNotes.filter(note => !note.quickAccess).length > 6 && (
          <Button variant="ghost" size="sm" onClick={onToggle} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            {isExpanded ? <><span>Show less</span><ChevronUp className="h-4 w-4" /></> : <><span>Show more</span><ChevronDown className="h-4 w-4" /></>}
          </Button>
        )}
      </div>
      {notes.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {notes.map((note: NoteType) => <NoteCard key={note.roomId} note={note} isPinned={title === "Pinned"} />)}
        </div>
      ) : <p className="text-muted-foreground text-sm">{emptyMessage}</p>}
    </div>
  );

  if (!user) return null;
  
  return (
    <div className="overflow-hidden flex flex-col p-6 max-w-6xl mx-auto mt-14">
      <div className="mb-12 pb-12 max-lg:mb-4 max-lg:pb-4 border-b-2 border-accent ">
        <h1 className="text-4xl lg:text-6xl font-bold underline">
          {user?.firstName}&apos;s Scape
        </h1>
      </div>
      
      <div className="flex justify-center items-center mb-8 space-x-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input type="text" placeholder="Search notes..." className="w-full pl-10 pr-4 py-2 border rounded-lg bg-border focus:outline-none focus:ring-2 focus:ring-red-accent " value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        </div>
        <div>
          <Button onClick={handleCreateNewNote} disabled={isPending} className="w-full sm:w-auto space-x-2">
            <PlusCircle className="h-4 w-4" />
            {showText && (isPending ? "Creating..." : "Create a new note")}
          </Button>
        </div>
      </div>
      
      {loading ? (
        <div className="flex flex-col items-center justify-center flex-1 space-y-4">
          <Spinner size={"lg"} />
          <p className="text-muted-foreground">Loading your scape...</p>
        </div>
      ) : (
        <>
          {/* Calendar-style reminders widget */}
          {!isSearching && <HomeCalendarWidget reminders={allReminders} flags={allFlags} />}

          {recentNotes.length === 0 && pinnedNotes.length === 0 && !isSearching ? (
            <div className="flex flex-col justify-center items-center space-y-4 flex-1">
              <Image src="/assets/empty.png" height={300} width={300} alt="Empty" className="dark:hidden" />
              <Image src="/assets/empty-dark.png" height={300} width={300} alt="Empty" className="hidden dark:block" />
              <h2 className="text-lg font-medium">Welcome to {user?.firstName}&apos;s Scape</h2>
              <Button onClick={handleCreateNewNote} disabled={isPending}>
                <PlusCircle className="h-4 w-4 mr-2" />
                {isPending ? 'Creating...' : 'Create your first note'}
              </Button>
            </div>
          ) : (
            <div className="flex-1 overflow-auto pb-10">
              {isSearching ? (
                <NotesGrid notes={searchResults} title={`Search Results (${searchResults.length})`} icon={<Search className="h-5 w-5" />} emptyMessage="No notes found matching your search" />
              ) : (
                <>
                  {pinnedNotes.length > 0 && <NotesGrid notes={pinnedNotes} title="Pinned" icon={<Pin className="h-5 w-5" />} emptyMessage="No pinned notes yet" />}
                  <NotesGrid notes={recentNotes} title="Recent" icon={<Clock className="h-5 w-5" />} emptyMessage="No recent notes yet" showToggle={true} isExpanded={expandedRecent} onToggle={toggleShowMore} />
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}