import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-10 bg-cms-login px-4">
      {/* eslint-disable-next-line @next/next/no-img-element -- static brand image */}
      <img src="/admin-logo.png" alt="Podkast.az" width={186} height={34} className="h-8.5 w-auto" />
      <div className="w-full max-w-md rounded-3xl bg-white px-10 py-12">
        <h1 className="mb-8 text-[1.5rem] font-semibold tracking-[-0.02em] text-ink">Admin panelə giriş</h1>
        <LoginForm />
      </div>
    </main>
  );
}
