import { constructMetadata } from "@/lib/metadata";

import { DeleteOrgButton } from "./delete-org-button";

export const metadata = constructMetadata({ title: "Danger" });

export default function DangerSettingsPage() {
  return (
    <>
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-medium">Delete Organization</h2>
        <p className="text-muted-foreground text-sm">
          This action is irreversible.
        </p>
      </div>

      <div className="mt-8">
        <DeleteOrgButton />
      </div>
    </>
  );
}
