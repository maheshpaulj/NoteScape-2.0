'use client'
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"
import { Spinner } from "@/components/Spinner"
import Link from "next/link"
import { SignInButton, useUser } from "@clerk/nextjs"

	

export default function Heading () {

    const { isSignedIn, isLoaded } = useUser();
return (
    <div className="max-w-3xl space-y-4">
      <h1 className="text-3xl sm:text-5xl md:text-6xl font-bold">
        Your Ultimate note-taking App. Welcome to <span className="underline">NoteScape</span>
      </h1>
      <h3 className="text-base sm:text-xl md:text-2xl font-medium">
        NoteScape is the connected workspace where <br/>
      better, faster work happens</h3>
      {!isLoaded && <div className="w-full flex justify-center items-center">
        <Spinner size='lg'/>
        </div>}
      {isSignedIn && isLoaded && (
        <Button asChild>
          <Link href='/home'>
            Enter NoteScape
            <ArrowRight className="w-4 h-4 ml-2"/>
          </Link>
      </Button>
        )}
        {!isSignedIn && isLoaded && (
          <SignInButton mode='modal'>
            <Button>
              Get Started
              <ArrowRight className="w-4 h-4 ml-2"/>
            </Button>
          </SignInButton>
        )}
    </div>
)
}