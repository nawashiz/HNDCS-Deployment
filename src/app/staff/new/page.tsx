import PageLayout from "@/components/PageLayout";
import StaffForm from "@/components/StaffForm";
import { PageHeader } from "@/components/Ui";
import { requireAdmin } from "@/lib/auth";

export default async function Page() {
    const user = await requireAdmin();

    return (
        <PageLayout user={user}>
            <PageHeader title="Add staff member" subtitle="Create a new staff record and set the basic salary." />
            <StaffForm mode="create" />
        </PageLayout>
    );
}
