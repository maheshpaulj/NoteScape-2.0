'use client'

import dynamic from 'next/dynamic'
import type { Theme } from 'emoji-picker-react'
import { useTheme } from "next-themes"

import {Popover,PopoverContent,PopoverTrigger} from '@/components/ui/popover'

// emoji-picker-react is heavy; load it only when the popover is used.
// Theme is imported type-only so the package stays out of the main chunk.
const EmojiPicker = dynamic(() => import('emoji-picker-react'), { ssr: false })

interface IconPickerProps {
  onChange:(icon:string) => void
  children:React.ReactNode
  asChild?:boolean
}

export function IconPicker ({onChange,children,asChild}:IconPickerProps) {

  const {resolvedTheme} = useTheme()

  const theme = (resolvedTheme === 'dark' ? 'dark' : 'light') as Theme

return (
    <Popover>
      <PopoverTrigger asChild={asChild}>
        {children}
      </PopoverTrigger>
      <PopoverContent className="p-0 w-full border-none shadow-none z-[999]">
        <EmojiPicker height={350} theme={theme}
        onEmojiClick={data => onChange(data.emoji)}/>
      </PopoverContent>
    </Popover>
)
}
