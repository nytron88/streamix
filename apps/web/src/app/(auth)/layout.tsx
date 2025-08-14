import { ModeToggle } from "@/components/layout/theme-toggle";
import Link from "next/link";
import Image from "next/image";

export default function AuthLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen flex flex-col">
            {/* Header */}
            <header className="border-b">
                <div className="container max-w-5xl mx-auto flex h-16 items-center justify-between px-4">
                    <Link href="/" className="hover:opacity-80 transition-opacity">
                        <div className="flex items-center gap-2">
                            <Image 
                                src="/favicon.ico" 
                                alt="Streamix" 
                                width={48} 
                                height={48}
                                className="w-8 h-8 dark:invert dark:brightness-0 dark:contrast-100"
                            />
                        </div>
                    </Link>
                    <ModeToggle />
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 flex items-center justify-center px-4 pb-4">
                <div className="w-full max-w-md space-y-6">
                    {children}
                </div>
            </main>
        </div>
    );
} 