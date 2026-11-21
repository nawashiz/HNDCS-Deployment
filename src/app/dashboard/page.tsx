import PageLayout from "@/components/PageLayout";
import DashboardView from "@/components/DashboardView";
import { requireAdmin } from "@/lib/auth";

export default async function Page() {
    const user = await requireAdmin();

    return (
        <PageLayout user={user}>
            <DashboardView />
        </PageLayout>
    );
}
