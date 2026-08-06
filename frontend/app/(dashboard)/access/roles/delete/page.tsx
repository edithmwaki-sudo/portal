import { RolesToolbar } from "@/components/dashboard/roles/roles-toolbar";
import { RolesPlaceholder } from "@/components/dashboard/roles/roles-placeholder";

export default function DeleteRolePage() {
  return (
    <>
      <RolesToolbar />
      <RolesPlaceholder>
        Delete Role lands here — pick a role to remove.
      </RolesPlaceholder>
    </>
  );
}
