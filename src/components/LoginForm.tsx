"use client";

import { useState } from "react";

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [devLink, setDevLink] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus("sending");
    setDevLink(null);
    try {
      const res = await fetch("/api/auth/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      setStatus("sent");
      if (data?.dev_magic_link) setDevLink(data.dev_magic_link);
    } catch {
      setStatus("error");
    }
  }

  if (status === "sent") {
    return (
      <div className="card px-5 py-6 text-center">
        <p className="text-lg font-semibold">Check your email</p>
        <p className="mt-2 text-sm text-slate2">
          If that email is allowed, a one-tap sign-in link is on its way. It
          expires in 15 minutes.
        </p>
        {devLink && (
          <div className="mt-4 text-left">
            <p className="text-xs font-semibold text-slate2 mb-1">Dev link (QA / pre-domain):</p>
            <a href={devLink} className="text-xs text-teal-700 underline break-all">
              {devLink}
            </a>
          </div>
        )}
        <button
          type="button"
          onClick={() => {
            setStatus("idle");
            setDevLink(null);
          }}
          className="mt-5 text-sm font-semibold underline text-slate2"
        >
          Use a different email
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <label htmlFor="email" className="sr-only">
        Email address
      </label>
      <input
        id="email"
        name="email"
        type="email"
        inputMode="email"
        autoComplete="email"
        required
        placeholder="you@gmail.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full min-h-[52px] px-4 rounded-xl border border-teal-600/30 bg-white text-base focus:outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-500/30"
      />
      <button
        type="submit"
        disabled={status === "sending"}
        className="w-full min-h-[52px] rounded-xl bg-teal-700 text-white font-semibold text-base disabled:opacity-60 active:scale-[0.99] transition-transform"
      >
        {status === "sending" ? "Sending…" : "Send me a link"}
      </button>
      {status === "error" && (
        <p className="text-sm text-red-700">Something went wrong. Please try again.</p>
      )}
    </form>
  );
}
