'use client'
import { Button } from "@/components/ui/button"
// Import the necessary icons
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

      {/* Spinner while loading user state */}
      {!isLoaded && (
        <div className="w-full flex justify-center items-center">
          <Spinner size='lg'/>
        </div>
      )}

      {/* Button for signed-in users */}
      {isSignedIn && isLoaded && (
        <Button asChild>
          <Link href='/home'>
            Enter NoteScape
            <ArrowRight className="w-4 h-4 ml-2"/>
          </Link>
      </Button>
      )}

      {/* Button for signed-out users */}
      {!isSignedIn && isLoaded && (
        <SignInButton mode='modal'>
          <Button>
            Get Started
            <ArrowRight className="w-4 h-4 ml-2"/>
          </Button>
        </SignInButton>
      )}

      {/* New Desktop App Buttons */}
      <div className="flex items-center justify-center gap-x-2 pt-4">
        <Button variant="outline" size="lg" asChild>
          <Link href="https://github.com/maheshpaulj/NoteScape-2.0/releases/download/v2.4.0/NoteScape.v2.4.0.Windows.Installer.msi">
            <svg xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" width="200" height="200" viewBox="0 0 48 48">
              <path fill="#0077d4" d="M7,6h15c0.552,0,1,0.448,1,1v15c0,0.552-0.448,1-1,1H7c-0.552,0-1-0.448-1-1V7	C6,6.448,6.448,6,7,6z"></path><path fill="#0077d4" d="M25.042,21.958V7c0-0.552,0.448-1,1-1H41c0.552,0,1,0.448,1,1v14.958	c0,0.552-0.448,1-1,1H26.042C25.489,22.958,25.042,22.511,25.042,21.958z"></path><path fill="#0077d4" d="M7,25h15c0.552,0,1,0.448,1,1v15c0,0.552-0.448,1-1,1H7c-0.552,0-1-0.448-1-1V26	C6,25.448,6.448,25,7,25z"></path><path fill="#0077d4" d="M25,41V26c0-0.552,0.448-1,1-1h15c0.552,0,1,0.448,1,1v15c0,0.552-0.448,1-1,1H26	C25.448,42,25,41.552,25,41z"></path>
            </svg>
            <p className="text-lg">Get for Windows</p>
          </Link>
        </Button>
        <Button variant="outline" size="lg" asChild>
          <Link href="https://github.com/maheshpaulj/NoteScape-2.0/releases/download/v2.4.0/NoteScape.v2.4.0.MacOS.Installer.dmg">
          <svg xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" width="100" height="100" viewBox="0 0 48 48">
          <path id="JoSQiOFj9s5DICrTBY2bea" d="M5 6H44V41H5z"></path><clipPath id="JoSQiOFj9s5DICrTBY2beb"><use overflow="visible" xlinkHref="#JoSQiOFj9s5DICrTBY2bea"></use></clipPath><g clip-path="url(#JoSQiOFj9s5DICrTBY2beb)"><path fill="#e1e1e1" d="M40.056,40.98H8.944C6.766,40.98,5,39.214,5,37.036V9.964C5,7.786,6.766,6.02,8.944,6.02h31.113 C42.234,6.02,44,7.786,44,9.964v27.073C44,39.214,42.234,40.98,40.056,40.98z"></path></g><g clip-path="url(#JoSQiOFj9s5DICrTBY2beb)"><path fill="#e1e1e1" d="M38.992,6.04H26.32c-0.036,0-0.069,0.023-0.081,0.056c-1.01,2.713-1.813,5.523-2.399,8.354 c-0.554,2.78-0.903,5.62-1.026,8.46C22.812,22.959,22.851,23,22.901,23h3.819c0.4,0,0.79,0.17,1.06,0.47 c0.27,0.3,0.4,0.7,0.36,1.1c-0.277,2.908-0.28,5.855,0.02,8.764c0.005,0.051,0.052,0.088,0.102,0.078 c2.307-0.44,5.265-1.464,8.028-3.783c0.43-0.35,1.06-0.29,1.41,0.13c0.36,0.42,0.3,1.05-0.12,1.41 c-3.138,2.623-6.501,3.757-9.08,4.235c-0.045,0.008-0.074,0.051-0.067,0.096c0.276,1.831,0.676,3.652,1.18,5.435 C29.623,40.974,29.657,41,29.696,41h9.222C41.172,41,43,39.172,43,36.917V10.048C43,7.834,41.206,6.04,38.992,6.04z M34.15,17.95 c0,0.55-0.45,1-1,1c-0.55,0-1-0.45-1-1V14.7c0-0.55,0.45-1,1-1c0.55,0,1,0.45,1,1V17.95z"></path></g><g clip-path="url(#JoSQiOFj9s5DICrTBY2beb)"><path fill="#00b7f9" d="M32.15,17.95V14.7c0-0.55,0.45-1,1-1c0.55,0,1,0.45,1,1v3.25c0,0.55-0.45,1-1,1 C32.6,18.95,32.15,18.5,32.15,17.95z"></path></g><g clip-path="url(#JoSQiOFj9s5DICrTBY2beb)"><path fill="#00b7f9" d="M37.58,31.17c-3.17,2.65-6.57,3.78-9.16,4.25c0.28,1.88,0.69,3.75,1.21,5.58H9.003 C6.792,41,5,39.208,5,36.997V10.053C5,7.837,6.797,6.04,9.013,6.04H26.26c-1.02,2.73-1.83,5.56-2.42,8.41 c-0.56,2.81-0.91,5.68-1.03,8.55h3.91c0.4,0,0.79,0.17,1.06,0.47c0.27,0.3,0.4,0.7,0.36,1.1c-0.28,2.94-0.28,5.92,0.03,8.86 c2.32-0.43,5.32-1.45,8.12-3.8c0.43-0.35,1.06-0.29,1.41,0.13C38.06,30.18,38,30.81,37.58,31.17z"></path></g><g clip-path="url(#JoSQiOFj9s5DICrTBY2beb)"><path fill="#00a0d1" d="M29.63,41c-0.52-1.83-0.93-3.7-1.21-5.58c-0.09-0.59-0.17-1.19-0.23-1.78 c-0.01-0.07-0.01-0.14-0.02-0.21c-0.31-2.94-0.31-5.92-0.03-8.86c0.04-0.4-0.09-0.8-0.36-1.1c-0.27-0.3-0.66-0.47-1.06-0.47h-3.91 c0.12-2.87,0.47-5.74,1.03-8.55c0.59-2.85,1.4-5.68,2.42-8.41c0.08-0.21,0.16-0.41,0.24-0.62l-1.86-0.73 c-0.17,0.45-0.34,0.9-0.5,1.35c-0.95,2.61-1.71,5.3-2.26,8.02c-0.63,3.11-0.99,6.29-1.09,9.47c-0.01,0.39,0.13,0.76,0.41,1.04 c0.26,0.27,0.64,0.43,1.03,0.43h3.86c-0.24,2.89-0.21,5.81,0.09,8.69c0.01,0.05,0.01,0.11,0.02,0.16 c0.07,0.61,0.14,1.22,0.24,1.82c0.26,1.8,0.64,3.58,1.11,5.33c0.26,0.95,0.54,1.88,0.86,2.81l1.9-0.65 C30.06,42.45,29.84,41.72,29.63,41z"></path></g><g clip-path="url(#JoSQiOFj9s5DICrTBY2beb)"><path fill="#37474f" d="M37.58,31.17c-3.17,2.65-6.57,3.78-9.16,4.25c-0.73,0.13-1.4,0.21-1.98,0.25 c-0.56,0.05-1.04,0.06-1.41,0.06c-6.41,0-10.91-3.19-12.55-4.56c-0.43-0.36-0.48-0.99-0.13-1.41c0.36-0.42,0.99-0.48,1.41-0.13 c1.47,1.24,5.51,4.1,11.27,4.1c0.31,0,0.7-0.01,1.15-0.04c0.57-0.04,1.24-0.12,1.99-0.26c2.32-0.43,5.32-1.45,8.12-3.8 c0.43-0.35,1.06-0.29,1.41,0.13C38.06,30.18,38,30.81,37.58,31.17z"></path></g><g clip-path="url(#JoSQiOFj9s5DICrTBY2beb)"><path fill="#37474f" d="M15.826,18.95c-0.553,0-1-0.448-1-1v-3.248c0-0.552,0.447-1,1-1s1,0.448,1,1v3.248 C16.826,18.502,16.379,18.95,15.826,18.95z"></path></g><g clip-path="url(#JoSQiOFj9s5DICrTBY2beb)"><path fill="#37474f" d="M34.15,14.7v3.25c0,0.55-0.45,1-1,1c-0.55,0-1-0.45-1-1V14.7c0-0.55,0.45-1,1-1 C33.7,13.7,34.15,14.15,34.15,14.7z"></path></g>
          </svg>
            <p className="text-lg">Get for MacOS</p>
          </Link>
        </Button>
      </div>

    </div>
)
}