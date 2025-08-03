import { redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = (event) => {
  if (event.locals.session) throw redirect(302, "/dashboard");
};
