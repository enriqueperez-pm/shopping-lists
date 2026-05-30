import { Suspense } from "react";
import LoginForm from "./LoginForm";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen-safe flex items-center justify-center bg-app text-caption">
          Cargando…
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
