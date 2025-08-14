import { SignIn } from "@clerk/nextjs";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Sign In - Streamix",
    description: "Sign in to your Streamix account to go live, engage with your viewers, and manage your channel.",
};

export default function Page() {
    return <SignIn />;
}
