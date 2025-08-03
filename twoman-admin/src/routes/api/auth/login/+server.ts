import { NODE_ENV } from "$env/static/private";
import { PUBLIC_API_URL } from "$env/static/public";
import { json } from "@sveltejs/kit";
import { z } from "zod";

const schema = z.object({
  username: z.string(),
  password: z.string().min(1),
});

export async function POST(event) {
  try {
    const body = await event.request.json();
    const result = schema.safeParse(body);

    if (!result.success) {
      const response: Api.Response = {
        code: 400,
        success: false,
        error: "Invalid request body",
        data: null,
        message: "",
      };
      return json(response, { status: 400 });
    }

    const response = await fetch(PUBLIC_API_URL + "/admin/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(result.data),
    });

    const data = (await response.json()) as Api.Response<{ session: string }>;

    if (data.success && data.data) {
      event.cookies.set("authSession", data.data.session, {
        path: "/",
        httpOnly: true,
        secure: NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7,
      });
      event.locals.session = data.data.session;

    } else {
      event.cookies.delete("authSession", { path: "/" });
      event.locals.session = null;
    }

    return json(data, { status: data.code });
  } catch (error) {
    console.log(error);
  }

  const response: Api.Response = {
    code: 500,
    success: false,
    error: "Something went wrong",
    data: null,
    message: "",
  };
  return json(response, { status: 500 });
}
