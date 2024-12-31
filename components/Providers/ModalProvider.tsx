'use client'	

import { useEffect, useState } from "react"

import { SettingsModal } from "@/components/Modals/SettingsModal"
import { CoverImageModal } from "@/components/Modals/CoverImageModal"

export function ModalProvider () {

  const [isMounted,setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  },[])

  if (!isMounted) {
    return null
  }

  return (
    <>
      <SettingsModal/>
      <CoverImageModal/>
    </>
)
}