"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export interface AuthActionResult {
  error?: string;
  success?: boolean;
  message?: string;
}

function validatePasswordStrength(password: string): string | null {
  if (password.length < 8) {
    return "Password must be at least 8 characters long.";
  }
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  if (!hasLetter || !hasNumber) {
    return "Password must include both letters and numbers.";
  }
  return null;
}

export async function signUpAction(
  _prevState: AuthActionResult | null,
  formData: FormData
): Promise<AuthActionResult> {
  const email = (formData.get("email") as string)?.trim();
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;
  const displayName = (formData.get("displayName") as string)?.trim();

  if (!email || !password || !displayName) {
    return { error: "Please provide your name, email address, and password." };
  }

  if (password !== confirmPassword) {
    return { error: "Passwords do not match." };
  }

  const passwordError = validatePasswordStrength(password);
  if (passwordError) {
    return { error: passwordError };
  }

  const supabase = await createClient();
  const origin = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: displayName,
        display_name: displayName,
      },
      emailRedirectTo: `${origin}/auth/callback`,
    },
  });

  if (error) {
    return { error: error.message };
  }

  return {
    success: true,
    message:
      "Account created. If email verification is enabled, please check your inbox to confirm your email before signing in.",
  };
}

export async function signInAction(
  _prevState: AuthActionResult | null,
  formData: FormData
): Promise<AuthActionResult> {
  const email = (formData.get("email") as string)?.trim();
  const password = formData.get("password") as string;
  const returnTo = (formData.get("returnTo") as string) || "/app";

  if (!email || !password) {
    return { error: "Please enter your email and password." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: "Invalid email or password. Please try again." };
  }

  revalidatePath("/", "layout");
  const target = returnTo.startsWith("/") ? returnTo : "/app";
  redirect(target);
}

export async function signOutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}

export async function resetPasswordAction(
  _prevState: AuthActionResult | null,
  formData: FormData
): Promise<AuthActionResult> {
  const email = (formData.get("email") as string)?.trim();

  if (!email) {
    return { error: "Please enter your email address." };
  }

  const supabase = await createClient();
  const origin = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/update-password`,
  });

  if (error) {
    return { error: error.message };
  }

  return {
    success: true,
    message: "If an account exists with this email, a password reset link has been sent.",
  };
}

export async function updatePasswordAction(
  _prevState: AuthActionResult | null,
  formData: FormData
): Promise<AuthActionResult> {
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (!password || !confirmPassword) {
    return { error: "Please provide and confirm your new password." };
  }

  if (password !== confirmPassword) {
    return { error: "Passwords do not match." };
  }

  const passwordError = validatePasswordStrength(password);
  if (passwordError) {
    return { error: passwordError };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/", "layout");
  redirect("/app");
}
