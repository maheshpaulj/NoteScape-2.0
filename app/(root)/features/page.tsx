import { Spotlight } from "@/components/ui/spotlight";
import { Footer } from "../_components/Footer";
import { LucideIcon, NotebookPen, Users, Languages, Image, KeyRound, Cpu } from "lucide-react";

interface FeatureSectionProps {
  title: string;
  description: string;
  icon: LucideIcon;
}

const FeatureSection = ({ title, description, icon: Icon }: FeatureSectionProps) => (
  <div className="relative aspect-square overflow-hidden rounded-xl bg-neutral-300/30 p-[1px] dark:bg-neutral-700/30">
    <Spotlight
      className="from-blue-600 via-blue-500 to-blue-400 blur-3xl dark:from-blue-200 dark:via-blue-300 dark:to-blue-400"
      size={124}
    />
    <div className="relative h-full w-full rounded-xl bg-white dark:bg-neutral-800 p-6">
      <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
        <Icon className="h-6 w-6 text-primary" />
      </div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  </div>
);

export default function FeaturesPage() {
  const features: FeatureSectionProps[] = [
    {
      title: "AI-Powered",
      description: "Translate and get answers to your questions using the AI powered by Meta's Llama model.",
      icon: NotebookPen
    },
    {
      title: "Real-time Collaboration",
      description: "Work seamlessly with others using live cursors and text selection powered by Liveblocks, making team collaboration effortless.",
      icon: Users
    },
    {
      title: "Smart Translation",
      description: "Instantly translate your notes to different languages. The AI will provide a Translated version of summary of your note.",
      icon: Languages
    },
    {
      title: "Image Support",
      description: "Upload and embed images in your notes using EdgeStore, with automatic optimization and fast delivery.",
      icon: Image
    },
    {
      title: "Secure Authentication",
      description: "Keep your notes safe with Clerk authentication, ensuring only authorized users can access your content.",
      icon: KeyRound
    },
    {
      title: "Backend",
      description: "Experience fast AI processing with Cloudflare Workers, delivering quick responses no matter where you are.",
      icon: Cpu
    }
  ];

  return (
    <div className="min-h-full flex flex-col dark:bg-[#1F1F1F]">
      <div className="flex-1">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4">Powerful Features for Modern Note-Taking</h1>
            <p className="text-xl text-muted-foreground">
              Everything you need to take your note-taking to the next level
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <FeatureSection key={index} {...feature} />
            ))}
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}