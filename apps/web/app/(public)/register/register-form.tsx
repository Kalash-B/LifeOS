"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { AuthCard } from "@/components/layout/auth-card";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { api, errorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth-store";
import type { AuthResponse } from "@/types/api";

const schema = z
  .object({
    displayName: z.string().trim().min(1, "Tell us what to call you").max(120),
    email: z.email("Enter a valid email"),
    password: z.string().min(8, "Use at least 8 characters").max(128),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "Passwords don't match" });

export function RegisterForm() {
  const router = useRouter();
  const setSession = useAuth((s) => s.setSession);
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, formState } = useForm({ resolver: zodResolver(schema) });

  const onSubmit = handleSubmit(async ({ displayName, email, password }) => {
    setError(null);
    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const data = await api<AuthResponse>("/auth/register", { method: "POST", body: { displayName, email, password, timezone } });
      setSession(data.accessToken, data.user, data.expiresIn);
      router.replace("/dashboard");
    } catch (e) {
      setError(errorMessage(e));
    }
  });

  return (
    <AuthCard
      title="Create your LifeOS"
      subtitle="One system for your day, habits, health, learning, projects and money."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-accent hover:underline">
            Log in
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="grid gap-4" noValidate>
        {error && (
          <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger" role="alert">
            {error}
          </p>
        )}
        <Field label="Name" error={formState.errors.displayName?.message}>
          <Input autoComplete="name" autoFocus {...register("displayName")} />
        </Field>
        <Field label="Email" error={formState.errors.email?.message}>
          <Input type="email" autoComplete="email" {...register("email")} />
        </Field>
        <Field label="Password" hint="At least 8 characters" error={formState.errors.password?.message}>
          <Input type="password" autoComplete="new-password" {...register("password")} />
        </Field>
        <Field label="Confirm password" error={formState.errors.confirm?.message}>
          <Input type="password" autoComplete="new-password" {...register("confirm")} />
        </Field>
        <Button type="submit" loading={formState.isSubmitting} className="mt-2">
          Create account
        </Button>
      </form>
    </AuthCard>
  );
}
