import { Footer } from "./_components/Footer";
import Heading from "./_components/Heading";
import { Heroes } from "./_components/Heroes";

import React from 'react';
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

const AppPreview = () => {
  const integrations = [
    { 
      logo: "/assets/meta.svg",
      name: "Meta's Llama",
      description: "Built-in AI capabilities",
    },
    {
      logo: "/assets/liveblocks.jpg",
      name: "Liveblocks",
      description: "Real-time collaboration",
    },
    {
      logo: "/assets/cloudflare.svg",
      name: "Cloudflare",
      description: "AI Workers deployment",
    }
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-12">
        <h2 className="text-5xl font-bold mb-4">
          See NoteScape in action!
        </h2>
      </div>

      <div className="relative mb-16">
        <div className="rounded-xl overflow-hidden shadow-2xl border-2 border-muted">
          <div className="aspect-video relative bg-muted">
              <video 
                className="w-full h-full object-cover"
                autoPlay
                loop
                muted
                playsInline
                src="/assets/demo.mp4"
              />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
        {integrations.map((item, index) => (
          <Card key={index} className="overflow-hidden hover:shadow-lg transition-shadow duration-300">
            <CardContent className="p-6 flex flex-col items-center bg-background dark:bg-neutral-900">
              <div className={`rounded-full w-12 h-12 mb-4 p-2 bg-muted self-center`}>
                <img src={item.logo} alt={item.name} className="w-full h-full" />
              </div>
              <h3 className="font-semibold text-lg mb-2">{item.name}</h3>
              <p className="text-sm text-muted-foreground">{item.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default function Page() {
  return (
    <div className="min-h-full flex flex-col dark:bg-[#1F1F1F] pt-20">
      <div className="flex flex-col items-center justify-center md:justify-start text-center gap-y-8 flex-1 px-6 pb-10">
        <Heading />
        <Heroes />
        <AppPreview />
      </div>
      <Footer />
    </div>
  );
}