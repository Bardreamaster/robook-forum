export const ERROR_HANDLED_BY_LINK = 'handledByErrorLink';
export const errorTypes = {
  sessionExpired: 'Session Expired',
  unauthorizedAccess: 'Authorization Failed',
  incorrectCredentials: 'incorrect username, email or password',
};

export const ERROR_NOT_FOUND = 'Not found or private';

/**
 * Below are the error messages that are displayed to the user.
 */
export const ERROR_PAGINATION =
  'Something unexpected happened when loading items. If this persists, please contact support.';

export const ERROR_PRIVATE_POST = {
  title: 'Private Post',
  content: `We're sorry, but you don't have permission to access this private post.`,
};
export const ERROR_REFETCH =
  'Something went wrong when logging out. If this persists, please contact support.';
