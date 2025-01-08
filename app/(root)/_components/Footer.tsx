import { Button } from "@/components/ui/button";
import { Logo } from "./Logo";
import Link from "next/link";

export function Footer () {
return (
    <div className="flex items-center w-full p-6 bg-background z-50 dark:bg-[#1F1F1F]">
        <Logo/>
        <div className="md:ml-auto w-full justify-between md:justify-end flex items-center gap-x-2
        text-muted-foreground">
          <Button variant='ghost' size='sm' asChild>
            <Link href={"mailto:mahesh.paul.j@gmail.com"}>
              Contact Dev
            </Link>
          </Button>
          <Button variant='ghost' size='sm' asChild>
            <Link href={"https://github.com/maheshpaulj/notescape-2.0"} target="_blank">
              Github
            </Link>
          </Button>
        </div>
    </div>
)
}