// Firebase temporarily disabled
// Will be enabled when deploying to production with proper config

export const requestNotificationPermission = async (): Promise<string | null> => {
  console.log('Firebase disabled — notifications not available');
  return null;
};

export const onForegroundMessage = (_callback: any) => {
  return () => {};
};

export const messaging = null;
