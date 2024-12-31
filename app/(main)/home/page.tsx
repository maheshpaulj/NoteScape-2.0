"use client";
import { createNewNote } from '@/actions/actions';
import { Button } from '@/components/ui/button';
import { useUser } from '@clerk/clerk-react'
import { PlusCircle } from 'lucide-react';
import Image from 'next/image'
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';

export default function page() {

  const { user } = useUser();
  const router = useRouter();
  const [ isPending, startTransition ] = useTransition();

  const handleCreateNewNote = () => {
    startTransition(async() => {
      const {noteId} = await createNewNote();
      router.push(`/notes/${noteId}`);
    })
  }
  
  return (
    <div className='h-full flex flex-col justify-center items-center space-y-4'>
      <Image src={"/assets/empty.png"} height={300} width={300} alt='Empty' className='dark:hidden'/>
      <Image src={"/assets/empty-dark.png"} height={300} width={300} alt='Empty' className='hidden dark:block'/>
      <h2 className='text-lg font-medium'>
        Welcome to {user?.firstName}&apos;s Scape
      </h2>
      <Button onClick={handleCreateNewNote} disabled={isPending}>
        <PlusCircle className='h-4 w-4' />
        {isPending ? 'Creating...' : 'Create a new note'}
      </Button>
    </div>
  )
}
