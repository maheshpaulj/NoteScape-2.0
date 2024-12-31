import { db } from "@/firebase";
import { useUser } from "@clerk/nextjs"
import { collectionGroup, query, where } from "firebase/firestore";
import { useEffect, useState } from "react";
import { useCollection } from "react-firebase-hooks/firestore";

function useOwner(roomId:string) {
    const { user } = useUser();
    const [isOwner, setIsOwner] = useState(false);
    const [usersInRoom] = useCollection(
        user && query(collectionGroup(db, "rooms"), where("roomId", "==", roomId))
    );

    useEffect(() => {
        if(usersInRoom?.docs && usersInRoom.docs.length > 0){
            const owners = usersInRoom.docs.filter(
                (note) => note.data().role === "owner"
            );

            if(owners.some((owner) => owner.data().userId === user?.emailAddresses[0].toString())){
                setIsOwner(true);
            }
        }
    }, [usersInRoom, user])
  return isOwner;
}
export default useOwner;