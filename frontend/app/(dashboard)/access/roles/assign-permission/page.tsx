import { AssignPermissions } from "@/components/dashboard/roles/assign-permissions";

export default async function AssignPermissionPage({
  searchParams,
}: {
  searchParams: Promise<{ roleId?: string }>;
}) {
  const { roleId } = await searchParams;
  const parsedRoleId = roleId ? Number(roleId) : null;

  return <AssignPermissions roleId={parsedRoleId} />;
}