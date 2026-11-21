import PageLayout from "@/components/PageLayout";
import ReportsView from "@/components/ReportsView";
import { requireAdmin } from "@/lib/auth";

export default async function Page() {
    const user = await requireAdmin();

    return (
        <PageLayout user={user}>
            <ReportsView />
        </PageLayout>
    );
}
