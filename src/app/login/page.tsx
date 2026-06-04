import LoginForm from "@/components/LoginForm";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const sp = await searchParams;
  const errorMsg = (() => {
    switch (sp?.error) {
      case "expired":
        return "That link expired. Request a new one below.";
      case "used":
        return "That link was already used. Request a new one below.";
      case "invalid":
        return "That link wasn't valid. Request a new one below.";
      default:
        return null;
    }
  })();

  return (
    <main className="min-h-dvh flex flex-col items-center justify-center px-5 py-12 max-w-md mx-auto">
      <div className="w-full">
        <div className="text-center mb-8">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-600 to-teal-800 flex items-center justify-center text-2xl shadow-lg">
            ✦
          </div>
          <h1 className="text-3xl font-bold tracking-tight mt-4">
            {process.env.NEXT_PUBLIC_APP_NAME || "OpenBudget"}
          </h1>
          <p className="mt-2 text-slate2 text-[15px] leading-relaxed">
            Every dollar gets a job.
          </p>
        </div>

        {errorMsg && (
          <div
            role="alert"
            className="mb-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm px-4 py-3"
          >
            {errorMsg}
          </div>
        )}

        <LoginForm />

        <p className="mt-6 text-center text-xs text-slate2">
          Private — only allowlisted emails can sign in. Enter your email and
          we&apos;ll send a one-tap sign-in link.
        </p>
      </div>
    </main>
  );
}
