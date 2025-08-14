import { SignUp } from "@clerk/nextjs";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Sign Up - Streamix",
    description: "Join Streamix to start your live streaming journey. Create an account and connect with audiences worldwide.",
};

export default function Page() {
    return <SignUp />;
}
