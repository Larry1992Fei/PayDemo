const demoOrigin = typeof window !== 'undefined' ? window.location.origin : '';

export const DEMO_FRONT_CALLBACK_URL = `${demoOrigin}/callback`;
export const DEMO_NOTIFY_URL = 'https://[your domain name]/[your notify URL]';
export const DEMO_MIT_MANAGEMENT_URL = 'https://[your domain name]/[your subscription management URL]';
