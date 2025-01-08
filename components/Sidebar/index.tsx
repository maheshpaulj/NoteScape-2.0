'use client'
import { cn } from "@/lib/utils"
import { ChevronsLeft, MenuIcon, PlusCircle, Search, HomeIcon, Settings, Trash, Notebook } from "lucide-react"
import { useParams, usePathname, useRouter } from "next/navigation"
import React, { ElementRef, useEffect, useRef, useState, useTransition } from "react"
import {useMediaQuery} from 'usehooks-ts'
import { UserItem } from "./UserItem"
import { Item } from "./Item"
import { toast } from "sonner"
import { createNewNote } from "@/actions/actions"
import { DocumentList } from "./DocumentList"
import { useSettings } from "@/hooks/useSettings"
import { useSearch } from "@/hooks/useSearch"
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover"
import { TrashBox } from "./TrashBox"
import { Navbar } from "./Navbar"
	

export function Sidebar () {
  const pathname = usePathname();
  const settings = useSettings();
  const params = useParams();
  const search = useSearch();
  const router = useRouter();
  const isMobile = useMediaQuery("(max-width:768px)")

  const isResizingRef = useRef(false)
  const sidebarRef = useRef<ElementRef<'aside'>>(null)
  const navbarRef = useRef<ElementRef<'div'>>(null)
  const [isResetting,setIsResetting] = useState(false)
  const [isCollapsed,setIsCollapsed] = useState(isMobile)
  const [ isPending, startTransition ] = useTransition(); // eslint-disable-line @typescript-eslint/no-unused-vars

  useEffect(() => {
    if (isMobile) {
      collapse()
    } else {
      resetWidth()
    }
  },[isMobile]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (isMobile) {
      collapse()
    }
  },[pathname,isMobile])

  const handleMouseDown = (event:React.MouseEvent<HTMLDivElement,MouseEvent>) => {
    event.preventDefault()
    event.stopPropagation()

    isResizingRef.current = true
    document.addEventListener('mousemove',handleMouseMove)
    document.addEventListener('mouseup',handleMouseUp)
  }

  const handleMouseMove = (event:MouseEvent) => {
    if (!isResizingRef.current) return
    let newWidth = event.clientX

    if (newWidth < 240) newWidth = 240
    if (newWidth > 480) newWidth = 480

    if (sidebarRef.current && navbarRef.current) {
      sidebarRef.current.style.width = `${newWidth}px`
      navbarRef.current.style.setProperty("left",`${newWidth}px`)
      navbarRef.current.style.setProperty("width",`calc(100% - ${newWidth}px)`)
    }
  } 

  const handleMouseUp = () => {
    isResizingRef.current = false
    document.removeEventListener("mousemove",handleMouseMove)
    document.removeEventListener('mouseup',handleMouseUp)
  }

  const resetWidth = () => {
    if (sidebarRef.current && navbarRef.current) {
      setIsCollapsed(false)
      setIsResetting(true)

      sidebarRef.current.style.width = isMobile ? '100%' : '240px'
      navbarRef.current.style.setProperty("width",isMobile ? '0' : 'calc(100% - 240px)')
      navbarRef.current.style.setProperty('left',isMobile ? '100%' :'240px')
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
      navbarRef.current.style.setProperty('width','100%')
      navbarRef.current.style.setProperty('left','0')
      setTimeout(() => setIsResetting(false),300)
    }
  }
  
    const handleCreateNewNote = () => {
      try {
        startTransition(async() => {
          const {noteId} = await createNewNote();
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
    <aside className={cn(`group/sidebar h-full bg-secondary overflow-y-auto overflow-x-hidden relative flex flex-col w-60 z-[99999]`,
    isResetting && 'transition-all ease-in-out duration-300',
    isMobile && 'w-0',
    !isCollapsed && "px-2")}
    ref={sidebarRef}>
      <div>
        <div className={cn(`w-6 h-6 text-muted-foreground rounded-sm hover:bg-neutral-300 dark:hover:bg-neutral-600 absolute
        top-3 right-2 opacity-0 group-hover/sidebar:opacity-100 transition`,
        isMobile && 'opacity-100')} 
        onClick={collapse}
        role="button">
          <ChevronsLeft className="w-6 h-6"/>
        </div>
        <div>
          <UserItem/>
          <Item label="Search" icon={Search} isSearch onClick={search.onOpen}/>
          <Item onClick={handleCreateNewNote} label='New Note' icon={PlusCircle} />
          <Item onClick={() => {router.push('/home')}} label='Home' icon={HomeIcon} />
          <Item onClick={() => {router.push('/allNotes')}} label='All Notes' icon={Notebook} />
          <Popover>
            <PopoverTrigger className="w-full">
              <Item label="Trash" icon={Trash} onClick={()=>{}}/>
            </PopoverTrigger>
            <PopoverContent
              className="p-0 w-72 " 
              side={isMobile ? "bottom" : "right"}
            >
              <TrashBox />
            </PopoverContent>
          </Popover>
          <Item label="Settings" icon={Settings} onClick={settings.onOpen}/>
        </div>
        <div className="mt-4">
          <DocumentList />
        </div>
        <div className="opacity-0 group-hover/sidebar:opacity-100 transition cursor-ew-resize absolute h-full w-1 bg-primary/10
        right-0 top-0"
        onMouseDown={handleMouseDown}
        onClick={resetWidth}>

        </div>
      </div>
    </aside>
    <div className={cn(`absolute top-0 z-[99999] left-60 w-[calc(100%-240px)]`,
    isResetting && 'transition-all ease-in-out duration-300',
    isMobile && 'left-0 w-full')} ref={navbarRef}>
      {!!params.noteId ? (
        <Navbar
          isCollapsed={isCollapsed}
          onResetWidth={resetWidth}
        />
      ): (
        <nav className="bg-transparent px-3 py-2 w-full">
          {isCollapsed && <MenuIcon className="w-6 h-6 text-muted-foreground" onClick={resetWidth} role="button"/>}
        </nav>
      )}
    </div>
    </>
)
}