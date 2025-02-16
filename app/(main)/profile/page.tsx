"use client";
import { UserProfile, useUser } from '@clerk/clerk-react'

export default function Page() {  // Changed from 'page' to 'Page'
  const { user } = useUser();
  
  return (
    <div className='h-full flex flex-col justify-center items-center space-y-4'>
      <h2 className='text-lg font-medium'>
        {user?.firstName}&apos;s Profile
      </h2>
      <UserProfile />
    </div>
  )
}