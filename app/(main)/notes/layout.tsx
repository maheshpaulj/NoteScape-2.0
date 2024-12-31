import LiveBlocksProvider from "@/components/Providers/LiveBlocksProvider"
import React from "react"

function PageLayout({children}:{children:React.ReactNode}) {
  return (
    <LiveBlocksProvider>
        {children}
    </LiveBlocksProvider>
  )
}
export default PageLayout