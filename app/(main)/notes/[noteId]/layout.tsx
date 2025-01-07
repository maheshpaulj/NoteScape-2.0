import RoomProviderWrapper from "@/components/Providers/RoomProviderWrapper";
import { auth } from "@clerk/nextjs/server";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: 'NoteScape - Note'
};

function NoteLayout({children, params: {noteId}}:{children: React.ReactNode; params: {noteId: string}}) {
    auth.protect();
  return (
    <RoomProviderWrapper roomId={noteId}>
        {children}
    </RoomProviderWrapper>
  )
}
export default NoteLayout;