"use client";

import { Toaster as HotToaster } from "react-hot-toast";

export function Toaster() {
  return (
    <HotToaster
      gutter={12}
      position="bottom-right"
      reverseOrder={false}
      toastOptions={{ duration: 8_000 }}
    />
  );
}
