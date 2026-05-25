import { getCallbackUrl } from '@/lib/callbackReturn';

const demoOrigin = typeof window !== 'undefined' ? window.location.origin : '';
const demoBasePath = import.meta.env.BASE_URL.replace(/\/$/, '');

export const DEMO_FRONT_CALLBACK_URL = getCallbackUrl() || `${demoOrigin}${demoBasePath}/callback`;
export const DEMO_NOTIFY_URL = 'https://[your domain name]/[your notify URL]';
export const DEMO_MIT_MANAGEMENT_URL = 'https://[your domain name]/[your subscription management URL]';
