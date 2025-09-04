import { Role } from './auth-meta';

export const permissions = {
  canCreateQuiz: (role: Role | null) => role === 'TEACHER' || role === 'DIRECTOR',
  canEditQuiz: (role: Role | null) => role === 'TEACHER' || role === 'DIRECTOR',
  canDeleteQuiz: (role: Role | null) => role === 'TEACHER' || role === 'DIRECTOR',
  canPublishQuiz: (role: Role | null) => role === 'TEACHER' || role === 'DIRECTOR',
  canViewSubmissions: (role: Role | null) => role === 'TEACHER' || role === 'DIRECTOR',
  canSubmitQuiz: (role: Role | null) => role === 'PARENT',
  canViewQuizResults: (role: Role | null) => role === 'DIRECTOR' || role === 'TEACHER' || role === 'PARENT',
};

export type AppPermission = keyof typeof permissions;

export const checkPermission = (role: Role | null, permission: AppPermission) => {
  if (!permission || !permissions[permission]) {
    return false;
  }
  return permissions[permission](role);
};
