export interface AuthenticatedUser {
  userId: number;
  username: string;
  email: string;
  roleId: number | null;
  sessionUuid: string;
  /** Permission names embedded in the access token. */
  permissions: string[];
  mustResetPassword: boolean;
  twoFactorEnabled: boolean;
}
