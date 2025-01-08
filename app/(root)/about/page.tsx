import React from "react";
import { Footer } from "../_components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Github, Users, Sparkles, Cpu } from "lucide-react";
import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "NoteScape - About",
};

export default function AboutPage() {
  const features = [
    {
      icon: <Sparkles className="h-6 w-6" />,
      title: "AI-Powered",
      description: "Advanced note analysis and suggestions powered by Meta's Llama model"
    },
    {
      icon: <Users className="h-6 w-6" />,
      title: "Real-time Collaboration",
      description: "Work together seamlessly with Liveblocks integration"
    },
    {
      icon: <Cpu className="h-6 w-6" />,
      title: "Edge Computing",
      description: "Lightning-fast performance with Cloudflare Workers"
    }
  ];

  return (
    <div className="min-h-screen flex flex-col dark:bg-[#1e1e1e]">
      <main className="flex-1">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center space-y-4 mb-16">
            <h1 className="text-5xl font-bold tracking-tight ">
              About <span className="underline">NoteScape</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Reimagining note-taking with artificial intelligence and seamless collaboration
            </p>
            <div className="flex justify-center gap-4 pt-4">
              <Button className="gap-2" asChild>
                <Link href={"https://github.com/maheshpaulj/notescape-2.0"} target="_blank">
                  <Github className="h-5 w-5" />
                  View on GitHub
                </Link>
              </Button>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-16">
            {features.map((feature, index) => (
              <Card key={index} className="border-2 dark:bg-neutral-800">
                <CardContent className="pt-6">
                  <div className="rounded-full w-12 h-12 flex items-center justify-center bg-primary/10 mb-4">
                    {feature.icon}
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="space-y-12">
            <section className="prose dark:prose-invert max-w-none">
              <h2 className="text-3xl font-bold mb-4">Tech Stack</h2>
              <div className="flex flex-wrap gap-2">
                {[
                  "Next.js 14",
                  "TypeScript",
                  "TailwindCSS",
                  "shadcn/ui",
                  "Clerk",
                  "EdgeStore",
                  "Liveblocks",
                  "Llama",
                  "Cloudflare Workers"
                ].map((tech) => (
                  <Badge key={tech} variant="secondary" className="text-sm">
                    {tech}
                  </Badge>
                ))}
              </div>
            </section>

            <section className="prose dark:prose-invert max-w-none">
              <h2 className="text-3xl font-bold mb-4">Attribution</h2>
              <p className="text-muted-foreground">
                Special thanks to:
                <a href="https://www.flaticon.com/free-icons/3d-notes" className="text-primary hover:underline">
                  Freepik - Flaticon
                </a>
                {" for the illustrations."}
              </p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}