import { AuthCard } from "@/modules/auth/presentation/auth-card";
import { EmergencyRecoveryForm } from "@/modules/auth/presentation/emergency-recovery-form";

export default function RecoverPage() { return <AuthCard title="Owner recovery" description="Use the installer setup code to reset an active owner of the initial Workspace."><EmergencyRecoveryForm /></AuthCard>; }
