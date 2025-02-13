import RoomProviderWrapper from "@/components/Providers/RoomProviderWrapper";
import LiveBlocksProvider from "@/components/Providers/LiveBlocksProvider";
import { auth } from "@clerk/nextjs/server";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: 'NoteScape - Note'
};

async function NoteLayout({ children, params: { noteId } }: { children: React.ReactNode; params: { noteId: string } }) {
  auth.protect();

  return (
    <LiveBlocksProvider>
      <RoomProviderWrapper roomId={noteId}>
        {children}
      </RoomProviderWrapper>
    </LiveBlocksProvider>
  );
}

export default NoteLayout;