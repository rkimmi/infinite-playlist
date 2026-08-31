"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";

import SignupForm, { SignUpFormValues } from "./signup-form";
import LoginForm, { LoginFormValues } from "./login-form";

type AuthModalProps = {
  login: boolean;
  signup: boolean;
};

export default function AuthModal({ login, signup }: AuthModalProps) {
  const router = useRouter();

  const [isPending, setPending] = useState(false);
  const [signupError, setSignupError] = useState(null);
  const [loginError, setLoginError] = useState<string | null>(null);

  function closeModal() {
    router.push("/");
  }

  const onSignupSubmit = (values: SignUpFormValues) => {
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
          router.push("/home");
        },

        onError: ({ error }) => {
          console.log(error);
          setSignupError(error?.message);
        },
      },
    );
  };

  const onLoginSubmit = (values: LoginFormValues) => {
    authClient.signIn.email(
      {
        email: values.email,
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
          router.push("/home");
        },

        onError: ({ error }) => {
          console.log(error);
          setLoginError(error?.message);
        },
      },
    );
  };

  const onAppleSignin = async () => {
    const data = await authClient.signIn.social({
      provider: "apple",
    });
  };

  const onSpotifySignin = async () => {
    const data = await authClient.signIn.social({
      provider: "spotify",
    });
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
          </div>
          {signup ? (
            <SignupForm
              onSubmit={onSignupSubmit}
              isPending={isPending}
              error={signupError}
            />
          ) : login ? (
            <LoginForm
              onSubmit={onLoginSubmit}
              isPending={isPending}
              error={loginError}
            />
          ) : (
            <></>
          )}

          <button onClick={onAppleSignin}>Continue with Apple</button>
          <button onClick={onSpotifySignin}>Continue with Spotify</button>
        </div>
      </div>
    </main>
  );
}
