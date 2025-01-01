import { Footer } from "../_components/Footer";
import { Button } from "@/components/ui/button";
import { Github } from "lucide-react";

export default function AboutPage() {
  return (
    <div className="min-h-full flex flex-col dark:bg-[#1F1F1F]">
      <div className="flex-1">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4">About NoteScape</h1>
            <p className="text-xl text-muted-foreground">
              An open-source AI-powered note-taking application
            </p>
          </div>
          
          <div className="prose dark:prose-invert max-w-none">
            <h2>Our Mission</h2>
            <p>
              NoteScape aims to revolutionize note-taking by combining the power of artificial intelligence 
              with collaborative features, making it easier for everyone to create, understand, and share their notes.
            </p>

            <h2>Open Source</h2>
            <p>
              NoteScape is completely free to use and open source. We believe in the power of community-driven 
              development and welcome contributions from developers around the world.
            </p>
            
            <div className="my-8 flex justify-center">
              <Button className="gap-2">
                <Github className="h-5 w-5" />
                View on GitHub
              </Button>
            </div>

            <h2>Attribution</h2>
            <div className="space-y-4">
              <p>We'd like to thank the following resources that made NoteScape possible:</p>
              <ul>
                <li>Icons and illustrations from <a href="https://undraw.co" className="text-primary hover:underline">unDraw</a></li>
                <li>Logo design inspired by <a href="https://logo.com" className="text-primary hover:underline">Logo.com</a></li>
              </ul>
            </div>

            <h2>Tech Stack</h2>
            <ul>
              <li>Next.js 14 with TypeScript</li>
              <li>TailwindCSS and shadcn/ui for styling</li>
              <li>Clerk for authentication</li>
              <li>EdgeStore for image uploads</li>
              <li>Liveblocks for real-time collaboration</li>
              <li>Meta's Llama model for AI features</li>
              <li>Cloudflare Workers for edge computing</li>
            </ul>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}