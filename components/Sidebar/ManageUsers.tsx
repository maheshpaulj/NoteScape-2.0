import { useState, useTransition, MouseEvent, useEffect } from "react"
import { Button } from "../ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "../ui/dialog"
import { usePathname } from "next/navigation";
import { toast } from "sonner";
import { useUser } from "@clerk/nextjs";
import { CrownIcon, PencilIcon, User, X } from "lucide-react";
import { useCollection } from "react-firebase-hooks/firestore";
import { collectionGroup, query, where } from "firebase/firestore";
import { db } from "@/firebase";
import useOwner from "@/lib/useOwner";
import { removeUserFromNote } from "@/actions/actions";

function ManageUsers() {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const pathname = usePathname();
  const roomId = pathname.split("/").pop();
  const { user } = useUser();
  const isOwner = useOwner(roomId!);

  const [usersInRoom] = useCollection(
    user && query(collectionGroup(db, "rooms"), where("roomId", "==", roomId))
  );

  const handleDelete = (userId: string) => {
    startTransition(async() => {
        if(!user) return;

        const { success } = await removeUserFromNote(roomId!, userId);

        if(success){
            toast.success("User removed from the note successfully");
        } else {
            toast.error("Failed to remove user from note");
        }
    })
  };

  const handleClick = (e: MouseEvent) => {
    e.stopPropagation();
  };

  useEffect(() => {
    if (!isOpen) {
      // Small delay to ensure styles are reset after animation
      const timeoutId = setTimeout(() => {
        document.body.style.removeProperty('pointer-events');
      }, 200);

      return () => clearTimeout(timeoutId);
    }
  }, [isOpen]);
  
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant='ghost' 
          className="w-full h-auto justify-start p-0 m-0 font-normal"
          onClick={handleClick}
        >
          <User className="w-4 h-4 mr-2"/>
          Manage Users ({usersInRoom?.docs.length})
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Users with Access
          </DialogTitle>
          <DialogDescription>
            List of users with access to this document.
          </DialogDescription>
        </DialogHeader>
        <hr className="my-2" />
        <div className="flex flex-col space-y-2">
            {usersInRoom?.docs.map((note) => (
                <div key={note.data().userId} className="flex items-center justify-between">
                    <p className="font-light">
                        {note.data().userId === user?.emailAddresses[0].toString() ? "You" : note.data().userId}
                    </p>
                    <div className="flex items-center gap-2">
                        <p className="capitalize flex items-center justify-center gap-x-2">
                            {note.data().role}
                            {note.data().role === "owner" ? <CrownIcon className={`w-4 h-4 ${isOwner && "mr-12"}`} /> : <PencilIcon className="w-4 h-4"/>}
                        </p>
                        {isOwner &&
                            note.data().userId !== user?.emailAddresses[0].toString() && (
                                <Button
                                    variant={"destructive"}
                                    onClick={() => handleDelete(note.data().userId)}
                                    disabled={isPending}
                                    size={"sm"}
                                >
                                    {isPending ? "Removing" : <X className="w-4 h-4" />}
                                </Button>
                            )
                        }
                    </div>
                </div>
            ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default ManageUsers