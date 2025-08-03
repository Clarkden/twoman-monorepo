import { NODE_ENV } from "$env/static/private";
import { PUBLIC_API_URL } from "$env/static/public";
import type { Handle } from "@sveltejs/kit";

export const handle: Handle = async ({ event, resolve }) => {
  let authSession = event.cookies.get("authSession");

  if (authSession) {
    try {
      const response = await fetch(PUBLIC_API_URL + "/admin/validate", {
        headers: {
          Authorization: `Bearer ${authSession}`,
        },
      });

      const data = (await response.json()) as Api.Response<null>;

      if (data.success) {
        event.cookies.set("authSession", authSession, {
          path: "/",
          httpOnly: false,
          secure: NODE_ENV === "production",
          sameSite: "lax",
          maxAge: 60 * 60 * 24 * 7,
        });
        event.locals.session = authSession;
      } else {
        event.cookies.delete("authSession", { path: "/" });
        event.locals.session = null;
      }
    } catch (error) {
      console.log(error);

      event.cookies.delete("authSession", { path: "/" });
      event.locals.session = null;
    }
  } else {
    event.locals.session = null;
  }

  const response = await resolve(event);
  return response;
};
