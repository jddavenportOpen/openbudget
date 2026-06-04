import AppHeader from "@/components/AppHeader";
import BottomNav from "@/components/BottomNav";
import TransactionList from "@/components/TransactionList";
import { getTransactions, getEnvelopes, getAccounts } from "@/lib/data";
import { currentEmail } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; account?: string }>;
}) {
  const sp = await searchParams;
  const account = sp?.account;

  const [txns, envelopes, accounts, email] = await Promise.all([
    // When drilling into a card, scope the data read to that account (June-1 floor still applies in data.ts).
    getTransactions(account ? { account, limit: 500 } : { limit: 500 }),
    getEnvelopes(),
    getAccounts(),
    currentEmail(),
  ]);

  // Pretty card name without the trailing "(1234)" mask.
  const cardName = account ? account.replace(/\s*\(\d+\)/, "") : null;

  return (
    <main className="max-w-2xl mx-auto px-4 pb-28">
      <AppHeader
        title={cardName ?? "Activity"}
        subtitle={
          cardName
            ? `${txns.length} ${txns.length === 1 ? "transaction" : "transactions"} · since Jun 1`
            : `${txns.length} transactions · newest first`
        }
        email={email}
        backHref={cardName ? "/" : undefined}
        backLabel={cardName ? "Accounts" : undefined}
      />
      <TransactionList
        initial={txns}
        envelopes={envelopes}
        accounts={accounts}
        initialFilter={sp?.filter}
        lockedAccount={account}
      />
      <BottomNav />
    </main>
  );
}
