"use client";

import TestFormPage from "../../create/page";

export default function EditTestPage({ params }: { params: { id: string } }) {
    return <TestFormPage mode="edit" testId={params.id} />;
}
