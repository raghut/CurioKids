// The page loads its content in the browser anyway. Without server rendering its HTML is
// a generic shell that boots from the URL, so the service worker's one saved copy can
// open any item offline, even one never opened before.
export const ssr = false;
