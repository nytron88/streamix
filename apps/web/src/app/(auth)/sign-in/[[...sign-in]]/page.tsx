import { SignIn } from "@clerk/nextjs";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Sign In - Streamix",
    description: "Sign in to your Streamix account to access your live stream and chat with your audience.",
};

export default function Page() {
    return <SignIn />;
}
