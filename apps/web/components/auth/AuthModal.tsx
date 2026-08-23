"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toNodeHandler } from "better-auth/node";
import { authClient } from "@/lib/auth-client";

import SignupForm from "./SignupForm";

type AuthModalProps = {
  login: boolean;
  signup: boolean;
};

export default function AuthModal({ login, signup }: AuthModalProps) {
  const router = useRouter();

  const [isPending, setPending] = useState(false);
  const [error, setError] = useState(null);

  function closeModal() {
    router.push("/");
  }

  const onSignupSubmit = (values: SignupFormValues) => {
    authClient.signUp.email(
      {
        email: values.email,
        name: values.username,
        password: values.password,
      },
      {
        onRequest: () => {
          setPending(true);
        },
        onResponse: () => {
          setPending(false);
        },

        onSuccess: () => {
          console.log("success!");
          router.push("/");
        },

        onError: ({ error }) => {
          console.log(error);
          setError(error);
        },
      },
    );
  };

  return (
    <main
      onClick={closeModal}
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        background: "rgba(24, 23, 23, 0.83)",
      }}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        style={{
          width: "400px",
          padding: "2rem",
          backgroundColor: "white",
          border: "1px solid #ddd",
          borderRadius: "12px",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <Link href="/?login=true">
              <div style={{ backgroundColor: login ? "pink" : "white" }}>
                Login
              </div>
            </Link>
            <Link href="/?signup=true">
              <div style={{ backgroundColor: signup ? "pink" : "white" }}>
                Sign up
              </div>
            </Link>

            <SignupForm onSubmit={onSignupSubmit} isPending={isPending} />
          </div>
        </div>
      </div>
    </main>
  );
}
