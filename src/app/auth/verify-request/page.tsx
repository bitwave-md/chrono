import Link from "next/link";

import { Button } from "@/components/ui/button";
import { AuthCard } from "@/modules/auth/presentation/auth-card";

export default function VerifyRequestPage() {
  return (
    <AuthCard
      description="A single-use sign-in link is on its way. Keep this tab open or continue from the email on this device."
      title="Check your inbox"
    >
      <Button asChild className="w-full" variant="outline">
        <Link href="/auth/signin">Use another email</Link>
      </Button>
    </AuthCard>
  );
}
