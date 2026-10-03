"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { AuthCard } from "@/components/layout/auth-card";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { api, errorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth-store";
import { safeNext } from "@/lib/safe-redirect";
import type { AuthResponse } from "@/types/api";

const schema = z.object({
  email: z.email("Enter a valid email"),
  password: z.string().min(1, "Enter your password"),
  rememberMe: z.boolean(),
});

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const setSession = useAuth((s) => s.setSession);
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, formState } = useForm({ resolver: zodResolver(schema), defaultValues: { email: "", password: "", rememberMe: true } });

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    try {
      const data = await api<AuthResponse>("/auth/login", { method: "POST", body: values });
      setSession(data.accessToken, data.user, data.expiresIn);
      router.replace(safeNext(params.get("next")));
    } catch (e) {
      setError(errorMessage(e));
    }
  });

  return (
    <AuthCard
      title="Welcome back"
      subtitle="Log in to your LifeOS"
      footer={
        <>
          New here?{" "}
          <Link href="/register" className="font-medium text-accent hover:underline">
            Create an account
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
        <Field label="Email" error={formState.errors.email?.message}>
          <Input type="email" autoComplete="email" autoFocus {...register("email")} />
        </Field>
        <Field label="Password" error={formState.errors.password?.message}>
          <Input type="password" autoComplete="current-password" {...register("password")} />
        </Field>
        <label className="flex items-center gap-2 text-sm text-text-2">
          <input type="checkbox" className="size-4 accent-[var(--accent)]" {...register("rememberMe")} />
          Keep me logged in
        </label>
        <Button type="submit" loading={formState.isSubmitting} className="mt-1">
          Log in
        </Button>
      </form>
    </AuthCard>
  );
}
