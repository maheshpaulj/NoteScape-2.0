"use client";
import { db } from "@/firebase";
import { doc } from "firebase/firestore";
import { useDocumentData } from "react-firebase-hooks/firestore";

export const getNoteTitle = (id: string) => {
    const [ noteData, noteLoading, noteError ] = useDocumentData(doc(db, "notes", id));
    if(!noteData) return "...";
    return noteData?.title
  }