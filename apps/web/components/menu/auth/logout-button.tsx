"use client";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export default function LogoutButton() {
  const router = useRouter();

  async function logout() {
    console.log("should log out");
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          router.refresh();
        },
      },
    });
  }

  return (
    <button style={{ cursor: "pointer" }} onClick={logout}>
      Logout
    </button>
  );
}
