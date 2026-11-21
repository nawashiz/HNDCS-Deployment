import PageLayout from "@/components/PageLayout";
import DepartmentsView from "@/components/DepartmentsView";
import { requireAdmin } from "@/lib/auth";

export default async function Page() {
    const user = await requireAdmin();

    return (
        <PageLayout user={user}>
            <DepartmentsView />
        </PageLayout>
    );
}
