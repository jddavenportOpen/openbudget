import AppHeader from "@/components/AppHeader";
import BottomNav from "@/components/BottomNav";
import TodoManager from "@/components/TodoManager";
import { getTodos } from "@/lib/data";
import { currentEmail } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function TodosPage() {
  const [todos, email] = await Promise.all([getTodos(), currentEmail()]);
  return (
    <main className="max-w-2xl mx-auto px-4 pb-28">
      <AppHeader title="Financial To-Do" subtitle="Reimbursements, pay owed, audits" email={email} />
      <TodoManager initial={todos} />
      <BottomNav />
    </main>
  );
}
