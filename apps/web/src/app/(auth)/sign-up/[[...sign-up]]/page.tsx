import { SignUp } from "@clerk/nextjs";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Sign Up - Streamix",
    description: "Create your Streamix account and start streaming your content to the world.",
};

export default function Page() {
    return <SignUp />;
}
