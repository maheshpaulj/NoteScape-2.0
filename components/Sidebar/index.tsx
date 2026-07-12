'use client'
import { cn } from "@/lib/utils"
import { ChevronsLeft, PlusCircle, Search, HomeIcon, Settings, Trash, Notebook, AlarmClock } from "lucide-react"
import { usePathname, useRouter } from "next/navigation"
import React, { ElementRef, useEffect, useRef, useState, useTransition, TouchEvent } from "react"
import { useMediaQuery } from 'usehooks-ts'
import { UserItem } from "./UserItem"
import { Item } from "./Item"
import { toast } from "sonner"
import { createNewNote } from "@/actions/actions"
import { DocumentList } from "./DocumentList"
import { useSettings } from "@/hooks/useSettings"
import { useSearch } from "@/hooks/useSearch"
import { Navbar } from "./Navbar"

export function Sidebar() {
  const pathname = usePathname();
  const settings = useSettings();
  const search = useSearch();
  const router = useRouter();
  const isMobile = useMediaQuery("(max-width:768px)")

  const isResizingRef = useRef(false)
  const sidebarRef = useRef<ElementRef<'aside'>>(null)
  const navbarRef = useRef<ElementRef<'div'>>(null)
  const touchStartXRef = useRef<number>(0)
  const [isResetting, setIsResetting] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(isMobile)
  const [isPending, startTransition] = useTransition(); // eslint-disable-line @typescript-eslint/no-unused-vars

  useEffect(() => {
    if (isMobile) {
      collapse()
    } else {
      resetWidth()
    }
  }, [isMobile]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (isMobile) {
      collapse()
    }
  }, [pathname, isMobile])

  const handleTouchStart = (e: TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX
  }

  const handleTouchMove = (e: TouchEvent) => {
    if (!isMobile) return

    const touchCurrentX = e.touches[0].clientX
    const diff = touchCurrentX - touchStartXRef.current

    if (!isCollapsed && diff < -50) {
      // Swipe left to close
      collapse()
    }
  }

  // Swipe-right-from-left-edge to open. This must listen on the document:
  // when collapsed the <aside> has zero width, so it can never receive the
  // touch that should open it.
  useEffect(() => {
    if (!isMobile) return

    let startX: number | null = null
    let startY = 0

    const onTouchStart = (e: globalThis.TouchEvent) => {
      const x = e.touches[0].clientX
      // Only track swipes that begin near the left edge of the screen.
      startX = x < 40 ? x : null
      startY = e.touches[0].clientY
    }

    const onTouchMove = (e: globalThis.TouchEvent) => {
      if (startX === null || !isCollapsed) return
      const dx = e.touches[0].clientX - startX
      const dy = Math.abs(e.touches[0].clientY - startY)
      // Require a clearly horizontal swipe so vertical scrolls that start near
      // the left edge don't open the sidebar.
      if (dx > 50 && dx > dy) {
        startX = null
        resetWidth()
      }
    }

    document.addEventListener('touchstart', onTouchStart, { passive: true })
    document.addEventListener('touchmove', onTouchMove, { passive: true })
    return () => {
      document.removeEventListener('touchstart', onTouchStart)
      document.removeEventListener('touchmove', onTouchMove)
    }
  }, [isMobile, isCollapsed]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleMouseDown = (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    event.preventDefault()
    event.stopPropagation()

    isResizingRef.current = true
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }

  const handleMouseMove = (event: MouseEvent) => {
    if (!isResizingRef.current) return
    let newWidth = event.clientX

    if (newWidth < 240) newWidth = 240
    if (newWidth > 480) newWidth = 480

    if (sidebarRef.current && navbarRef.current) {
      sidebarRef.current.style.width = `${newWidth}px`
      navbarRef.current.style.setProperty("left", `${newWidth}px`)
      navbarRef.current.style.setProperty("width", `calc(100% - ${newWidth}px)`)
    }
  }

  const handleMouseUp = () => {
    isResizingRef.current = false
    document.removeEventListener("mousemove", handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
    // Remember the chosen width across sessions.
    if (sidebarRef.current?.style.width) {
      localStorage.setItem('notescape-sidebar-width', parseInt(sidebarRef.current.style.width).toString())
    }
  }

  const getStoredWidth = () => {
    const stored = parseInt(localStorage.getItem('notescape-sidebar-width') || '')
    if (isNaN(stored)) return 240
    return Math.min(480, Math.max(240, stored))
  }

  const resetWidth = () => {
    if (sidebarRef.current && navbarRef.current) {
      setIsCollapsed(false)
      setIsResetting(true)

      const width = getStoredWidth()
      sidebarRef.current.style.width = isMobile ? '100%' : `${width}px`
      navbarRef.current.style.setProperty("width", isMobile ? '0' : `calc(100% - ${width}px)`)
      navbarRef.current.style.setProperty('left', isMobile ? '100%' : `${width}px`)
      setTimeout(() => {
        setIsResetting(false)
      }, 300);
    }
  }

  const collapse = () => {
    if (sidebarRef.current && navbarRef.current) {
      setIsCollapsed(true)
      setIsResetting(true)

      sidebarRef.current.style.width = '0'
      navbarRef.current.style.setProperty('width', '100%')
      navbarRef.current.style.setProperty('left', '0')
      setTimeout(() => setIsResetting(false), 300)
    }
  }

  const handleCreateNewNote = () => {
    try {
      startTransition(async () => {
        const { noteId } = await createNewNote();
        router.push(`/notes/${noteId}`);
      })
      toast.success("New note created");
    } catch (error) {
      toast.error("failed to create a new note");
      console.error(error);
    }
  }

  return (
    <>
      <aside
        className={cn(`group/sidebar h-full bg-secondary relative flex flex-col w-60 z-[99999]`,
          isResetting && 'transition-all ease-in-out duration-300',
          isMobile && 'w-0',
          !isCollapsed && "px-2")}
        ref={sidebarRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
      >
        <div className="flex-grow overflow-y-auto overflow-x-hidden pb-4">
          <div
            className={cn(`text-muted-foreground rounded-sm hover:bg-neutral-300 dark:hover:bg-neutral-600 absolute
              top-3 right-2 opacity-0 group-hover/sidebar:opacity-100 transition flex items-center justify-center z-20`,
              isMobile ? 'opacity-100 w-12 h-12' : 'w-6 h-6')}
            onClick={collapse}
            role="button"
          >
            <ChevronsLeft className="w-6 h-6" />
          </div>
          <div>
            <UserItem />
            <Item 
              label="Search" 
              icon={Search} 
              isSearch 
              onClick={search.onOpen}
            />
            <Item 
              onClick={handleCreateNewNote} 
              label='New Note' 
              icon={PlusCircle}
            />
            <Item 
              onClick={() => router.push('/home')} 
              label='Home' 
              icon={HomeIcon}
            />
            <Item 
              onClick={() => router.push('/reminders')} 
              label='Reminders' 
              icon={AlarmClock}
            />
            <Item 
              onClick={() => router.push('/allNotes')} 
              label='All Notes' 
              icon={Notebook}
            />
            <Item 
              onClick={() => router.push('/trash')} 
              label='Trash' 
              icon={Trash}
            />
            <Item 
              label="Settings" 
              icon={Settings} 
              onClick={settings.onOpen}
            />
          </div>
          <div className="mt-4">
            <DocumentList />
          </div>
          <div
            className="opacity-0 group-hover/sidebar:opacity-100 transition cursor-ew-resize absolute h-full w-1 bg-primary/10
            right-0 top-0 max-sm:hidden z-10"
            onMouseDown={handleMouseDown}
            onClick={resetWidth}
          />
        </div>
        <div className="w-full py-3 text-center border-t bg-secondary shrink-0 font-bold text-muted-foreground">
          <p className="text-xs">NoteScape v2.6.1</p>
        </div>
      </aside>
      <div
        className={cn(`absolute top-0 z-[99999] left-60 w-[calc(100%-240px)]`,
          isResetting && 'transition-all ease-in-out duration-300',
          isMobile && 'left-0 w-full')}
        ref={navbarRef}
      >
        <Navbar
          isCollapsed={isCollapsed}
          onResetWidth={resetWidth}
        />
      </div>
    </>
  )
}