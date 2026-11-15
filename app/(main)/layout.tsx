"use client";
import dynamic from "next/dynamic";
import { Sidebar } from "@/components/Sidebar";
import { Spinner } from "@/components/Spinner";
import { useUser } from "@clerk/clerk-react";
import { redirect } from "next/navigation";

const SearchCommand = dynamic(
  () => import("@/components/SearchCommand").then((mod) => mod.SearchCommand),
  { ssr: false }
);

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
