import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = ({ locals, url }) => {
	return { admin: locals.admin ?? false, pathname: url.pathname };
};
