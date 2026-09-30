import type { NextConfig } from 'next';
// Drei's HTML label roots currently conflict with React's development double-unmount.
// Keep normal rendering until that upstream integration supports StrictMode cleanup.
const config:NextConfig={transpilePackages:['@office/contracts'],reactStrictMode:false,async headers(){return [{source:'/(.*)',headers:[{key:'X-Content-Type-Options',value:'nosniff'},{key:'Referrer-Policy',value:'strict-origin-when-cross-origin'},{key:'X-Frame-Options',value:'DENY'},{key:'Permissions-Policy',value:'camera=(), microphone=(), geolocation=()'}]}];}};
export default config;
