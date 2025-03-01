'use client';

import { useState, useEffect } from 'react';
import { createNewNote } from '@/actions/actions';
import { Button } from '@/components/ui/button';
import { useUser } from '@clerk/nextjs';
import { PlusCircle, Pin, Clock, Search } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { query, collectionGroup, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '@/firebase';

interface NoteType {
  roomId: string;
  title: string;
  icon: string;
  updatedAt: Timestamp;
  quickAccess: boolean;
  archived: boolean;
  userId: string;
}

export default function Page() {
  const { user } = useUser();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [recentNotes, setRecentNotes] = useState<NoteType[]>([]);
  const [pinnedNotes, setPinnedNotes] = useState<NoteType[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [showText, setShowText] = useState(window.innerWidth > 768);

  useEffect(() => {
    const handleResize = () => setShowText(window.innerWidth > 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (!user) return;
    
    const fetchNotes = async () => {
      setLoading(true);
      try {
        const userEmail = user.emailAddresses[0].emailAddress;
        
        // Only query with indexed fields
        const notesQuery = query(
          collectionGroup(db, 'rooms'),
          where('userId', '==', userEmail)
        );
        
        const snapshot = await getDocs(notesQuery);
        
        const allNotes = snapshot.docs.map(doc => ({
          ...doc.data(),
          roomId: doc.id
        })) as NoteType[];
        
        // Filter in memory
        const filteredNotes = allNotes.filter(note => !note.archived);
        
        // Get pinned notes
        const pinnedData = filteredNotes.filter(note => note.quickAccess);
        
        // Get recent notes (excluding pinned)
        const recentData = filteredNotes
          .filter(note => !note.quickAccess)
          .sort((a, b) => (b.updatedAt?.seconds || 0) - (a.updatedAt?.seconds || 0))
          .slice(0, 6);
        
        setRecentNotes(recentData);
        setPinnedNotes(pinnedData);
      } catch (error) {
        console.error('Error fetching notes:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchNotes();
  }, [user]);

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
  
  interface NoteCardProps {
    note: NoteType;
    isPinned?: boolean;
  }
  
  const NoteCard = ({ note, isPinned = false }: NoteCardProps) => (
    <div 
      className="p-4 border rounded-lg hover:border-gray-400 cursor-pointer transition-all bg-card"
      onClick={() => router.push(`/notes/${note.roomId}`)}
    >
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2">
          {note.icon ? (
            <div className="text-xl">{note.icon}</div>
          ) : (
            <div className="w-5 h-5">🗒️</div>
          )}
          <h3 className="font-medium truncate">{note.title || "Untitled"}</h3>
        </div>
        {isPinned && <Pin className="h-4 w-4 text-muted-foreground" />}
      </div>
      <p className="text-xs text-muted-foreground mt-2">
        Updated {formatDate(note.updatedAt)}
      </p>
    </div>
  );
  
  interface NotesGridProps {
    notes: NoteType[];
    title: string;
    icon: React.ReactNode;
    emptyMessage: string;
  }
  
  const NotesGrid = ({ notes, title, icon, emptyMessage }: NotesGridProps) => (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-4">
        {icon}
        <h2 className="text-xl font-semibold">{title}</h2>
      </div>
      {notes.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {notes.map((note) => (
            <NoteCard key={note.roomId} note={note} isPinned={title === "Pinned"} />
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground text-sm">{emptyMessage}</p>
      )}
    </div>
  );

  if (!user) return null;
  
  return (
    <div className="h-screen overflow-hidden flex flex-col p-6 max-w-6xl mx-auto mt-12">
      {/* Header */}
      <div className="mb-12 pb-12 max-lg:mb-4 max-lg:pb-4 border-b-2 border-accent ">
        <h1 className="text-4xl lg:text-6xl font-bold underline">
          {user?.firstName}&apos;s Scape
        </h1>
      </div>
      
      {/* Search */}
      <div className="flex justify-center items-center mb-8 space-x-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search notes..."
            className="w-full pl-10 pr-4 py-2 border rounded-lg bg-border focus:outline-none focus:ring-2 focus:ring-primary"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            />
        </div>
        {/* Button to create new note */}
        <div className="">
          <Button 
            onClick={handleCreateNewNote} 
            disabled={isPending}
            className="w-full sm:w-auto space-x-2"
          >
            <PlusCircle className="h-4 w-4" />
            {showText ? (isPending ? "Creating..." : "Create a new note") : ""}
          </Button>
        </div>
      </div>
      
      {loading ? (
        <div className="flex flex-col items-center justify-center flex-1 space-y-4">
          <div className="h-10 w-10 animate-spin rounded-full border-t-2 border-primary"></div>
          <p className="text-muted-foreground">Loading your notes...</p>
        </div>
      ) : recentNotes.length === 0 && pinnedNotes.length === 0 ? (
        <div className="flex flex-col justify-center items-center space-y-4 flex-1">
          <Image 
            src="/assets/empty.png" 
            height={300} 
            width={300} 
            alt="Empty" 
            className="dark:hidden"
          />
          <Image 
            src="/assets/empty-dark.png" 
            height={300} 
            width={300} 
            alt="Empty" 
            className="hidden dark:block"
          />
          <h2 className="text-lg font-medium">
            Welcome to {user?.firstName}&apos;s Scape
          </h2>
          <Button onClick={handleCreateNewNote} disabled={isPending}>
            <PlusCircle className="h-4 w-4 mr-2" />
            {isPending ? 'Creating...' : 'Create your first note'}
          </Button>
        </div>
      ) : (
        <>
          {/* Notes sections */}
          <div className="flex-1 overflow-auto pb-10">
            {pinnedNotes.length > 0 && (
              <NotesGrid 
                notes={pinnedNotes} 
                title="Pinned" 
                icon={<Pin className="h-5 w-5" />}
                emptyMessage="No pinned notes yet" 
              />
            )}
            
            <NotesGrid 
              notes={recentNotes} 
              title="Recent" 
              icon={<Clock className="h-5 w-5" />}
              emptyMessage="No recent notes yet" 
            />
          </div>
        </>
      )}
    </div>
  );
}