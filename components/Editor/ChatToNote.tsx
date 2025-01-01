import * as Y from 'yjs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Button } from '../ui/button';
import { useState, useTransition } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { BotIcon, LanguagesIcon, MessageCircleCode } from 'lucide-react';
import { toast } from 'sonner';
import Markdown from 'react-markdown';
import { Input } from '../ui/input';

function ChatToNote({doc}:{doc:Y.Doc}) {
    const [isOpen, setIsOpen] = useState(false);
    const [summary, setSummary] = useState("");
    const [question, setQuestion] = useState("");
    const [isPending, startTransition] = useTransition();

    const handleAskQuestion = async (e:React.FormEvent) => {
        e.preventDefault();

        startTransition(async() => {
            const noteData = doc.get("note-store").toJSON();

            if(!process.env.NEXT_PUBLIC_BASE_URL) console.log("key error");

            const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/chatToNote`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    documentData: noteData,
                    question: question
                }),
            });

            if(res.ok){
                const message  = await res.json();
                setQuestion("");
                setSummary(message.response);
                toast.success("Question asked successfully!");
            }
        })
    }
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
    <Button asChild variant={"outline"}>
      <DialogTrigger>
        <MessageCircleCode />
        Ask AI
      </DialogTrigger>
    </Button>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>
          Chat with AI about your Note
        </DialogTitle>
        <DialogDescription>
          Ask a question and chat about your Note with AI!
        </DialogDescription>
        <hr className='mt-5'/>
        {
            question && <p className='mt-5 text-foreground font-medium'>Q: {question}</p>
        }
      </DialogHeader>
      {
        summary && (
            <div className="flex flex-col items-start max-h-96 overflow-y-scroll gap-2 p-5 bg-neutral-100 dark:bg-neutral-900 rounded-md">
                <div className="flex">
                    <BotIcon className='w-10 flex-shrink-0' />
                    <p className='font-bold'>AI {isPending ? "is thinking..." : "Says:"}</p>
                </div>
                <p>{isPending ? "is thinking..." : <Markdown>{summary}</Markdown>}</p>
            </div>
        )
      }
      <form onSubmit={handleAskQuestion} className="flex gap-2">
        <Input 
            type="text"
            placeholder='Ask a question'
            className='w-full'
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
        />
        <Button type="submit" disabled={isPending || !question}>
          {isPending ? "Asking..." : "Ask"}
        </Button>
      </form>
    </DialogContent>
  </Dialog>
  )
}
export default ChatToNote