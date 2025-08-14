import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/layout/theme-toggle";
import { Radio, MessageCircle, Search } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b">
        <div className="container max-w-6xl mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="hover:opacity-80 transition-opacity">
            <div className="flex items-center gap-2">
              <Image 
                src="/favicon.ico" 
                alt="Streamix" 
                width={32} 
                height={32}
                className="w-8 h-8 dark:invert dark:brightness-0 dark:contrast-100"
              />
              <div className="text-xl font-semibold">Streamix</div>
            </div>
          </Link>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Button variant="ghost" asChild>
                <Link href="/sign-in">Sign In</Link>
              </Button>
              <Button asChild>
                <Link href="/sign-up">Sign Up</Link>
              </Button>
            </div>
            <ModeToggle />
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="container max-w-6xl mx-auto px-4 py-20 lg:py-32">
          <div className="text-center space-y-8">
            <div className="space-y-4">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight">
                Go Live with{" "}
                <span className="text-primary">Streamix</span>
              </h1>
              <p className="text-xl sm:text-2xl text-muted-foreground max-w-3xl mx-auto">
                The ultimate live streaming platform where creators broadcast and viewers discover amazing content in real-time.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center max-w-md mx-auto">
              <Button size="lg" className="w-full sm:w-auto" asChild>
                <Link href="/sign-up">Start Streaming</Link>
              </Button>
              <Button variant="outline" size="lg" className="w-full sm:w-auto" asChild>
                <Link href="/sign-in">Watch Streams</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="border-t bg-muted/50">
          <div className="container max-w-6xl mx-auto px-4 py-20">
            <div className="text-center space-y-4 mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold">Why Choose Streamix?</h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Join a vibrant community of creators and viewers with powerful streaming features
              </p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
                  <Radio className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold">Live Streaming</h3>
                <p className="text-muted-foreground">
                  Go live instantly with powerful streaming tools and reach your audience in real-time.
                </p>
              </div>
              
              <div className="text-center space-y-4">
                <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
                  <MessageCircle className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold">Interactive Chat</h3>
                <p className="text-muted-foreground">
                  Engage with your community through real-time chat and build meaningful connections.
                </p>
              </div>
              
              <div className="text-center space-y-4">
                <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
                  <Search className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold">Discover Content</h3>
                <p className="text-muted-foreground">
                  Explore thousands of live streams across gaming, art, music, and more.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="border-t">
          <div className="container max-w-6xl mx-auto px-4 py-20">
            <div className="text-center space-y-8">
              <div className="space-y-4">
                <h2 className="text-3xl sm:text-4xl font-bold">
                  Ready to Join the Community?
                </h2>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                  Join thousands of creators and viewers sharing their passions live on Streamix.
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center max-w-md mx-auto">
                <Button size="lg" className="w-full sm:w-auto" asChild>
                  <Link href="/sign-up">Join Streamix</Link>
                </Button>
                <Button variant="outline" size="lg" className="w-full sm:w-auto" asChild>
                  <Link href="/sign-in">Already have an account?</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t bg-muted/30">
        <div className="container max-w-6xl mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <Image 
                src="/favicon.ico" 
                alt="Streamix" 
                width={24} 
                height={24}
                className="w-6 h-6 dark:invert dark:brightness-0 dark:contrast-100"
              />
              <span className="font-semibold">Streamix</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2025 Streamix. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
