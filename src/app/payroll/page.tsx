import PageLayout from "@/components/PageLayout";
import PayrollView from "@/components/PayrollView";
import { requireAdmin } from "@/lib/auth";

export default async function Page() {
    const user = await requireAdmin();

    return (
        <PageLayout user={user}>
            <PayrollView />
        </PageLayout>
    );
}
