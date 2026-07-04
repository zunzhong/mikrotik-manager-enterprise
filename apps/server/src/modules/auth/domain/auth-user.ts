export interface AuthenticatedUser {
  id: string;
  email: string;
  name?: string | null;
  role: string;
}
