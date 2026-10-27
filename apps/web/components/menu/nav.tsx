"use client";

import Link from "next/link";
import { AuthModal, LogoutButton } from "./auth";
import { useSearchParams } from "next/navigation";

type NavProps = {
  hasSession: boolean;
};

export default function Nav({ hasSession = false }: NavProps) {
  const searchParams = useSearchParams();

  const login = searchParams.get("login") === "true";
  const signup = searchParams.get("signup") === "true";

  return (
    <>
      <nav style={{ display: "flex" }}>
        {hasSession ? (
          <LogoutButton />
        ) : (
          <>
            <Link href="/?signup=true">Sign up</Link>

            <Link href="/?login=true">Login</Link>
          </>
        )}
      </nav>

      {(login || signup) && <AuthModal signup={signup} login={login} />}
    </>
  );
}
