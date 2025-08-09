// src/app/notes/page.tsx
'use client';

import { useState, useEffect, useMemo, useTransition } from 'react';
import { createNewNote, getAllUserReminders } from '@/actions/actions';
import { Button } from '@/components/ui/button';
import { useUser } from '@clerk/nextjs';
import { PlusCircle, Pin, Clock, Search, ChevronDown, ChevronUp, AlarmClock, AlertTriangle } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { query, collectionGroup, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '@/firebase';
import { Spinner } from '@/components/Spinner';
import { Reminder } from '@/types/types';
import { isPast, isToday, isTomorrow, format as formatDateFns } from 'date-fns';

interface NoteType {
  roomId: string;
  title: string;
  icon: string;
  updatedAt: Timestamp;
  quickAccess: boolean;
  archived: boolean;
  userId: string;
}

// New Component: A widget to display a summary of reminders.
const RemindersWidget = ({
  missedCount,
  upcomingReminders,
  onNavigate,
}: {
  missedCount: number;
  upcomingReminders: Reminder[];
  onNavigate: () => void;
}) => {
  // Don't render the widget if there is nothing to show.
  if (missedCount === 0 && upcomingReminders.length === 0) {
    return null;
  }

  const formatReminderTime = (time: string | Date) => {
    const date = new Date(time);
    if (isToday(date)) return `Today at ${formatDateFns(date, 'h:mm a')}`;
    if (isTomorrow(date)) return `Tomorrow at ${formatDateFns(date, 'h:mm a')}`;
    return formatDateFns(date, 'MMM d, h:mm a');
  };

  return (
    <div
      onClick={onNavigate}
      className="mb-8 p-4 border rounded-lg cursor-pointer transition-all bg-card hover:border-gray-400"
    >
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-2">
          <AlarmClock className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-xl font-semibold">Reminders</h2>
        </div>
        <span className="text-sm hover:underline">View all</span>
      </div>
      <div className="flex flex-col md:flex-row gap-4">
        {missedCount > 0 && (
          <div className="p-3 rounded-md bg-destructive/10 flex-1">
            <div className="flex items-center gap-2 text-red-500">
              <AlertTriangle className="h-4 w-4" />
              <span className="font-semibold">Missed Reminders</span>
            </div>
            <p className="text-2xl font-bold text-red-500 mt-1">{missedCount}</p>
          </div>
        )}
        {upcomingReminders.length > 0 && (
          <div className="flex-1 p-3 rounded-md bg-accent/50">
            <h3 className="font-semibold text-muted-foreground mb-2">Upcoming</h3>
            <ul className="space-y-2">
              {upcomingReminders.map((reminder) => (
                <li key={reminder.id} className="text-sm flex justify-between items-center gap-4">
                  <span className="truncate">{reminder.message}</span>
                  <span className="text-muted-foreground whitespace-nowrap">
                    {formatReminderTime(reminder.reminderTime)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};


export default function Page() {
  const { user } = useUser();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [allNotes, setAllNotes] = useState<NoteType[]>([]);
  const [recentNotes, setRecentNotes] = useState<NoteType[]>([]);
  const [pinnedNotes, setPinnedNotes] = useState<NoteType[]>([]);
  const [allReminders, setAllReminders] = useState<Reminder[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
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

    const fetchAllData = async () => {
      setLoading(true);
      try {
        const userEmail = user.emailAddresses[0].emailAddress;

        // Fetch notes and reminders in parallel for efficiency
        const [notesSnapshot, remindersData] = await Promise.all([
          getDocs(query(collectionGroup(db, 'rooms'), where('userId', '==', userEmail))),
          getAllUserReminders()
        ]);
        
        // Process Notes
        const allFetchedNotes = notesSnapshot.docs.map(doc => ({ ...doc.data(), roomId: doc.id })) as NoteType[];
        const filteredNotes = allFetchedNotes.filter(note => !note.archived);
        const pinnedData = filteredNotes.filter(note => note.quickAccess);
        const nonPinnedNotes = filteredNotes
          .filter(note => !note.quickAccess)
          .sort((a, b) => (b.updatedAt?.seconds || 0) - (a.updatedAt?.seconds || 0));
        const initialRecentNotes = nonPinnedNotes.slice(0, 6);
        
        setAllNotes(filteredNotes);
        setRecentNotes(initialRecentNotes);
        setPinnedNotes(pinnedData);
        
        // Set Reminders
        setAllReminders(remindersData);

      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchAllData();
  }, [user]);

  // Process reminders with useMemo for performance
  const { missedRemindersCount, upcomingReminders } = useMemo(() => {
    const missed = allReminders.filter(
      (r) => !r.isDone && isPast(new Date(r.reminderTime))
    ).length;

    const upcoming = allReminders
      .filter((r) => !r.isDone && (isToday(new Date(r.reminderTime)) || isTomorrow(new Date(r.reminderTime))) && !isPast(new Date(r.reminderTime)))
      .sort((a, b) => new Date(a.reminderTime).getTime() - new Date(b.reminderTime).getTime())
      .slice(0, 5);
    
    return { missedRemindersCount: missed, upcomingReminders: upcoming };
  }, [allReminders]);

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

  const handleNavigateToReminders = () => {
      router.push('/reminders');
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
    const nonPinnedNotes = allNotes
      .filter(note => !note.quickAccess)
      .sort((a, b) => (b.updatedAt?.seconds || 0) - (a.updatedAt?.seconds || 0));
      
    if (!expandedRecent) {
      setRecentNotes(nonPinnedNotes);
    } else {
      setRecentNotes(nonPinnedNotes.slice(0, 6));
    }
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
    <div className="overflow-hidden flex flex-col p-6 max-w-6xl mx-auto">
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
          {/* Reminder Widget is rendered here */}
          {!isSearching && (
            <RemindersWidget 
              missedCount={missedRemindersCount} 
              upcomingReminders={upcomingReminders} 
              onNavigate={handleNavigateToReminders}
            />
          )}

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