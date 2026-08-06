import type { Metadata } from "next";

import { siteConfig } from "@/config/site";
import { LoginForm } from "@/components/login/login-form";

export const metadata: Metadata = {
  title: `Sign in · ${siteConfig.name}`,
  description: `Sign in to ${siteConfig.schoolName} · ${siteConfig.name}`,
};

export default function LoginPage() {
  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-muted/40 px-4">
      <div className="w-full max-w-md">

        <div className="rounded-lg bg-white p-6 shadow-lg shadow-black/5">
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-semibold">{siteConfig.name}</h1>
            <p className="text-sm text-muted-foreground">
              Sign in to {siteConfig.schoolName}
            </p>
          </div>
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
