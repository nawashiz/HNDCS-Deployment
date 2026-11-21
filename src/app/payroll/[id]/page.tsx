import PageLayout from "@/components/PageLayout";
import PayslipView from "@/components/PayslipView";
import { requireUser } from "@/lib/auth";

export default async function Page() {
    const user = await requireUser();

    return (
        <PageLayout user={user}>
            <PayslipView />
        </PageLayout>
    );
}
