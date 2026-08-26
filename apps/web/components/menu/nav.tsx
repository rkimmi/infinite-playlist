import Link from "next/link";
import { AuthModal, LogoutButton } from "./auth";

type NavProps = {
  searchParams: {
    login?: string;
    signup?: string;
  };
  hasSession: boolean;
};

export default function Nav({ searchParams, hasSession = false }: NavProps) {
  const login = !!searchParams?.login;
  const signup = !!searchParams?.signup;

  return (
    <>
      <nav style={{ display: "flex", marginRight: "auto" }}>
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
