import PageLayout from "@/components/PageLayout";
import MySalaryView from "@/components/MySalaryView";
import { requireUser } from "@/lib/auth";

export default async function Page() {
    const user = await requireUser();

    return (
        <PageLayout user={user}>
            <MySalaryView />
        </PageLayout>
    );
}
