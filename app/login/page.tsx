import { LoginForm } from "@/components/LoginForm";

interface LoginPageProps {
  searchParams: Promise<{
    returnTo?: string;
    error?: string;
  }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { returnTo, error } = await searchParams;

  let bannerMessage: string | null = null;
  if (error === "auth_callback_failed") {
    bannerMessage = "Could not sign in with external provider. Please try again or use your password.";
  } else if (error === "setup_required") {
    bannerMessage = "Database and Supabase connection are not yet configured in environment variables.";
  }

  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 py-12 bg-paper">
      <LoginForm returnTo={returnTo || "/app"} bannerMessage={bannerMessage} />
    </div>
  );
}
