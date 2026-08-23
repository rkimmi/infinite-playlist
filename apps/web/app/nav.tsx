import Link from "next/link";
import { AuthModal } from "@/components";

type NavProps = {
  searchParams: {
    login?: string;
    signup?: string;
  };
};

export default function Nav({ searchParams }: NavProps) {
  const login = searchParams?.login;
  const signup = searchParams?.signup;
  console.log(searchParams);

  return (
    <>
      <nav style={{ display: "flex", marginRight: "auto" }}>
        <Link href="/?signup=true">Sign up</Link>

        <Link href="/?login=true">Login</Link>
      </nav>
      {(login || signup) && <AuthModal signup={signup} login={login} />}
    </>
  );
}
