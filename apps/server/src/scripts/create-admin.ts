import { createDefaultAdminUser } from '../modules/auth/application/create-admin-user.js';

const user = await createDefaultAdminUser();

console.log(`Admin user ready: ${user.email}`);
