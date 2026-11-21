import PageLayout from "@/components/PageLayout";
import StaffListView from "@/components/StaffListView";
import { requireAdmin } from "@/lib/auth";

export default async function Page() {
    const user = await requireAdmin();

    return (
        <PageLayout user={user}>
            <StaffListView />
        </PageLayout>
    );
}
