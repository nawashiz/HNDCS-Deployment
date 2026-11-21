import PageLayout from "@/components/PageLayout";
import StaffDetailView from "@/components/StaffDetailView";
import { requireAdmin } from "@/lib/auth";

export default async function Page() {
    const user = await requireAdmin();

    return (
        <PageLayout user={user}>
            <StaffDetailView />
        </PageLayout>
    );
}
