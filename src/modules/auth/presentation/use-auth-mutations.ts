"use client";

import { useMutation } from "@tanstack/react-query";
import { signIn, signOut } from "next-auth/react";

export function useEmailSignInMutation(callbackUrl: string) {
  return useMutation({
    mutationFn: async (input: { email: string; password: string }) => {
      const result = await signIn("credentials", {
        email: input.email,
        password: input.password,
        callbackUrl,
        redirect: false,
      });

      if (!result?.ok || !result.url) {
        throw new Error("Email or password is incorrect.");
      }

      window.location.assign(result.url);
    },
  });
}

export function useSignOutMutation() {
  return useMutation({
    mutationFn: async () => {
      const result = await signOut({ callbackUrl: "/", redirect: false });
      window.location.assign(result.url);
    },
  });
}
