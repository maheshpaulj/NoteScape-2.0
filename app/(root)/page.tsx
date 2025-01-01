import { Footer } from "./_components/Footer";
import Heading from "./_components/Heading";
import { Heroes } from "./_components/Heroes";

const AppPreview = () => {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-4">See NoteScape in Action</h2>
        <p className="text-muted-foreground">Experience the power of AI-enhanced note-taking</p>
      </div>
      <div className="rounded-lg overflow-hidden shadow-2xl border border-muted">
        <div className="aspect-video relative bg-muted">
          <img 
            src="/api/placeholder/800/450" 
            alt="NoteScape Demo"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-muted-foreground">Demo GIF Placeholder</p>
          </div>
        </div>
      </div>
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
        <div className="p-4">
          <h3 className="font-semibold mb-2">Real-time Collaboration</h3>
          <p className="text-sm text-muted-foreground">Work together with live cursors and text selection</p>
        </div>
        <div className="p-4">
          <h3 className="font-semibold mb-2">AI-Powered Translation</h3>
          <p className="text-sm text-muted-foreground">Translate notes instantly with Llama model</p>
        </div>
        <div className="p-4">
          <h3 className="font-semibold mb-2">Smart Q&A</h3>
          <p className="text-sm text-muted-foreground">Get answers based on your notes</p>
        </div>
      </div>
    </div>
  );
};

export default function Page() {
  return (
    <div className="min-h-full flex flex-col dark:bg-[#1F1F1F]">
      <div className="flex flex-col items-center justify-center md:justify-start text-center gap-y-8 flex-1 px-6 pb-10">
        <Heading />
        <Heroes />
        <AppPreview />
      </div>
      <Footer />
    </div>
  );
}