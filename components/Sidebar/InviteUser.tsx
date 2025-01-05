import { FormEvent, useState, useTransition } from "react"
import { Button } from "../ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "../ui/dialog"
import { usePathname } from "next/navigation";
import { Input } from "../ui/input";
import { inviteUserToNote } from "@/actions/actions";
import { toast } from "sonner";
import { useUser } from "@clerk/nextjs";

function InviteUser() {
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [isPending, startTransition] = useTransition();
  const pathname = usePathname();
  const { user } = useUser();

  const handleInviteUser = (e: FormEvent) => {
    e.preventDefault();

    const roomId = pathname.split("/").pop();
    if(!roomId) return;

    startTransition(async() => {
      const { success } = await inviteUserToNote(roomId, email, user?.emailAddresses[0].toString()!); // eslint-disable-line @typescript-eslint/no-non-null-asserted-optional-chain

      if(success){
        setIsOpen(false);
        setEmail("");
        toast.success("User has been invited!");
      } else {
        toast.error("Failed to invite user");
      }
    });
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <Button asChild variant={"outline"}>
        <DialogTrigger>Invite</DialogTrigger>
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Invite User to collabrate together!
          </DialogTitle>
          <DialogDescription>
            Enter the email of the user to invite to collbrate together on this note.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleInviteUser} className="flex gap-2">
          <Input 
            type="email"
            placeholder="Email"
            className="w-full"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Button type="submit" disabled={isPending || !email}>
            {isPending ? "Inviting" : "Invite"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
export default InviteUser