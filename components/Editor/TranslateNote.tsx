import * as Y from 'yjs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Button } from '../ui/button';
import { useState, useTransition } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { BotIcon, LanguagesIcon } from 'lucide-react';
import { toast } from 'sonner';
import Markdown from 'react-markdown';

type Language = 
    | "english"
    | "hindi"
    | "portuguese"
    | "french"
    | "german"
    | "chinese"
    | "arabic"
    | "spanish"
    | "russian"
    | "japanese";

const languages: Language[] = [
    "english"
   , "hindi"
   , "portuguese"
   , "french"
   , "german"
   , "chinese" 
   , "arabic"
   , "spanish"
   , "russian"
   , "japanese"
];

function TranslateNote({doc}:{doc:Y.Doc}) {
    const [isOpen, setIsOpen] = useState(false);
    const [language, setLanguage] = useState<string>("");
    const [summary, setSummary] = useState("");
    const [isPending, startTransition] = useTransition();

    const handleSummary = async (e:React.FormEvent) => {
        e.preventDefault();

        startTransition(async() => {
            const noteData = doc.get("note-store").toJSON();

            if(!process.env.NEXT_PUBLIC_BASE_URL) console.log("key error");

            const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/translateDocument`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    documentData:noteData,
                    targetLang: language
                }),
            });

            if(res.ok){
                const { translated_text } = await res.json();
                setSummary(translated_text);
                toast.success("Translated Note successfully!");
            }
        })
    }
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
    <Button asChild variant={"outline"}>
      <DialogTrigger>
        <LanguagesIcon />
        Translate
      </DialogTrigger>
    </Button>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>
          Translate the Note
        </DialogTitle>
        <DialogDescription>
          Select a Language and AI will translate a summary of the note in the selected language.
        </DialogDescription>
      </DialogHeader>
      {
        summary && (
            <div className="flex flex-col items-start max-h-96 overflow-y-scroll gap-2 p-5 bg-neutral-100 dark:bg-neutral-600">
                <div className="flex">
                    <BotIcon className='w-10 flex-shrink-0' />
                    <p className='font-bold'>AI {isPending ? "is thinking..." : "Says:"}</p>
                </div>
                <p>{isPending ? "is thinking..." : <Markdown>{summary}</Markdown>}</p>
            </div>
        )
      }
      <form onSubmit={handleSummary} className="flex gap-2">
        <Select
            value={language}
            onValueChange={(value) => setLanguage(value)}
        >
            <SelectTrigger className='w-full'>
                <SelectValue placeholder="Select a Language" />
            </SelectTrigger>

            <SelectContent>
                {languages.map((language) => (
                    <SelectItem key={language} value={language}>
                        {language.charAt(0).toUpperCase() + language.slice(1)}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
        <Button type="submit" disabled={isPending || !language}>
          {isPending ? "Translating" : "Translate"}
        </Button>
      </form>
    </DialogContent>
  </Dialog>
  )
}
export default TranslateNote