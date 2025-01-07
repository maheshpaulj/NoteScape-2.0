"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Menu } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { SignInButton, UserButton, useUser } from '@clerk/nextjs';
import { Spinner } from '../Spinner';
import { ThemeToggle } from '../ThemeToggle';

interface NavLink {
  href: string;
  label: string;
}

const navLinks: NavLink[] = [
  { href: '/', label: 'Home' },
  { href: '/features', label: 'Features' },
  { href: '/about', label: 'About' },
];

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const { isSignedIn, isLoaded } = useUser();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 0);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${
      isScrolled ? 'bg-white/80 dark:bg-[#1e1e1e]/80 backdrop-blur-sm border-b' : 'bg-transparent'
    }`}>
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-2">
            <Image
              src="/logo.png"
              alt="BoardScape Logo"
              width={48}
              height={48}
              className="object-contain"
              priority
            />
            <span className="text-xl font-bold">NoteScape</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-foreground hover:text-muted-foreground transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="hidden md:flex items-center space-x-4">
            <ThemeToggle />

          {!isLoaded && (
              <Spinner/>
            )}
            {!isSignedIn && isLoaded && (
              <>
                <SignInButton mode="modal">
                  <Button variant='ghost' size='sm'>
                    Login
                  </Button>
                </SignInButton>
                  <SignInButton mode="modal">
                  <Button  size='sm'>
                    Get Started
                  </Button>
                </SignInButton>
              </>
            )}
            {isSignedIn && isLoaded && (
              <>
                <UserButton 
                  appearance={{
                    elements: {
                      userButtonAvatarBox: {
                        height: 42,
                        width: 42
                      }
                    }
                  }}
                />
                <Button size='sm' asChild>
                  <Link href='/home'>
                    Enter NoteScape
                  </Link>
                </Button>
              </>
            )}
          </div>

          {/* Mobile Navigation */}
          <Sheet>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] sm:w-[400px]">
              <nav className="flex flex-col space-y-4">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="text-foreground hover:text-muted-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                ))}
                {isSignedIn ? 
                  <>
                    <UserButton />
                    <Button asChild>
                      <Link href={"/home"}>Dashboard</Link>
                    </Button>
                  </>
                    :
                    <>  
                      <Button variant="ghost" asChild>
                        <SignInButton>
                          Log In
                        </SignInButton>
                      </Button>
                      <Button asChild>
                        <Link href="/home">Get Started</Link>
                      </Button>
                    </>
                  }
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;