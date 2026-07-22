"use client";

import { useMutation } from "@tanstack/react-query";
import { signIn, signOut } from "next-auth/react";

function signInErrorMessage(error: string | null | undefined) {
  if (error === "AccessDenied") {
    return "This email does not have access to Chrono yet.";
  }

  return "Chrono could not send the sign-in email. Check the address and mail configuration, then try again.";
}

function bootstrapSignInErrorMessage(error: string | null | undefined) {
  if (error === "CredentialsSignin") {
    return "The owner email or setup key is incorrect.";
  }
  return "Chrono could not complete owner sign-in. Check the installation configuration and try again.";
}

export function useEmailSignInMutation(callbackUrl: string) {
  return useMutation({
    mutationFn: async (email: string) => {
      const result = await signIn("email", {
        email,
        callbackUrl,
        redirect: false,
      });

      if (!result?.ok || !result.url) {
        throw new Error(signInErrorMessage(result?.error));
      }

      window.location.assign(result.url);
    },
  });
}

export function useBootstrapSignInMutation(callbackUrl: string) {
  return useMutation({
    mutationFn: async ({ email, token }: { email: string; token: string }) => {
      const result = await signIn("bootstrap", {
        email,
        token,
        callbackUrl,
        redirect: false,
      });

      if (!result?.ok || !result.url) {
        throw new Error(bootstrapSignInErrorMessage(result?.error));
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
