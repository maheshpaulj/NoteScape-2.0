'use client'

import { useEffect, useState } from "react"
import dynamic from "next/dynamic"

const SettingsModal = dynamic(
  () => import("@/components/Modals/SettingsModal").then((mod) => mod.SettingsModal),
  { ssr: false }
)
const CoverImageModal = dynamic(
  () => import("@/components/Modals/CoverImageModal").then((mod) => mod.CoverImageModal),
  { ssr: false }
)

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