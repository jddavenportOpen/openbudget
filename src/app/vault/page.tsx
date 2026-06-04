import AppHeader from "@/components/AppHeader";
import BottomNav from "@/components/BottomNav";
import VaultManager from "@/components/VaultManager";
import { listVault, vaultEnabled } from "@/lib/vault";
import { currentEmail } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function VaultPage() {
  const [entries, email] = await Promise.all([listVault(), currentEmail()]);
  return (
    <main className="max-w-2xl mx-auto px-4 pb-28">
      <AppHeader title="Bank Vault" subtitle="Your own logins — manual reference only" email={email} />
      <VaultManager initial={entries} enabled={vaultEnabled()} />
      <BottomNav />
    </main>
  );
}
