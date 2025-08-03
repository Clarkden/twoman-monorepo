import { NODE_ENV } from "$env/static/private";
import { PUBLIC_API_URL } from "$env/static/public";
import { json } from "@sveltejs/kit";

export async function POST(event) {
  try {
    event.cookies.delete("authSession", { path: "/" });
    event.locals.session = null;
  } catch (error) {
    console.log(error);
  }

  return new Response();
}
