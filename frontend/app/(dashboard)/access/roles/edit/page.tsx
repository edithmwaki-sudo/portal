import { RolesToolbar } from "@/components/dashboard/roles/roles-toolbar";
import { RolesPlaceholder } from "@/components/dashboard/roles/roles-placeholder";

export default function EditRolePage() {
  return (
    <>
      <RolesToolbar />
      <RolesPlaceholder>
        Edit Role lands here — pick a role from the list to update.
      </RolesPlaceholder>
    </>
  );
}
