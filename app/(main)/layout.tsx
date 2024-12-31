"use client";
import { SearchCommand } from "@/components/SearchCommand";
import { Sidebar } from "@/components/Sidebar";
import { Spinner } from "@/components/Spinner";
import { useUser } from "@clerk/clerk-react";
import { redirect } from "next/navigation";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isSignedIn, isLoaded } = useUser()

  if (!isLoaded) {
    return (
      <div className="h-full flex justify-center items-center">
        <Spinner size='lg'/>
      </div>
    )
  }

  if (!isSignedIn) { 
    return redirect('/')
  }

return (
  <div className="h-full flex dark:bg-[#1F1F1F]">
    <Sidebar />
    <main className="flex-1 h-full overflow-y-auto">
      <SearchCommand />
      {children}
    </main>
  </div>
)
}
