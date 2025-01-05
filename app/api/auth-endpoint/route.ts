import { adminDb } from "@/firebase-admin";
import liveblocks from "@/lib/liveblocks";
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest){
    auth.protect();

    const { sessionClaims } = await auth();
    const { room } = await req.json();
    
    const session = liveblocks.prepareSession(sessionClaims?.email!, {// eslint-disable-line @typescript-eslint/no-non-null-asserted-optional-chain
        userInfo: {
            name: sessionClaims?.fullName!,// eslint-disable-line @typescript-eslint/no-non-null-asserted-optional-chain
            email: sessionClaims?.email!,// eslint-disable-line @typescript-eslint/no-non-null-asserted-optional-chain
            avatar: sessionClaims?.image!// eslint-disable-line @typescript-eslint/no-non-null-asserted-optional-chain
        }
    });

    const usersInRoom = await adminDb
        .collectionGroup("rooms")
        .where("userId", "==", sessionClaims?.email)
        .get();

    const userInRoom = usersInRoom.docs.find((doc) => doc.id === room);

    if(userInRoom?.exists){
        session.allow(room, session.FULL_ACCESS);
        const { body, status } = await session.authorize();

        return new Response(body, { status });
    } else {
        return NextResponse.json(
            { message: "You are not authorized in this room" },
            { status: 403 }
        );
    }
}