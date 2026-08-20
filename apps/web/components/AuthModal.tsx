"use client";
import Link from "next/link";
import { authClient } from "@infinite-playlist/auth";
import { useRouter } from "next/navigation";
import { useState } from "react";

type AuthModalProps = {
  login: boolean;
  signup: boolean;
};

export default function AuthModal({ login, signup }: AuthModalProps) {
  const router = useRouter();

  function closeModal() {
    router.push("/");
  }

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
        </div>
      </div>
    </main>
  );
}
