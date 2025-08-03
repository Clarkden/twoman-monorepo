import { API_URL, CLIENT_VERSION } from "./general";
import { ApiResponse } from "@/types/api";
import { useSession } from "@/stores/auth";

type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

interface CustomRequestInit extends Omit<RequestInit, "method" | "body"> {
  method?: HttpMethod;
  headers?: HeadersInit;
  body?: BodyInit | object;
}

const apiFetch = async <T = unknown>(
  url: string,
  options: CustomRequestInit = {},
): Promise<ApiResponse<T>> => {
  const { method = "GET", headers = {}, body, ...otherOptions } = options;

  const session = useSession.getState().session;

  const defaultHeaders: HeadersInit = {
    "X-Client-Version": CLIENT_VERSION || "",
    "Content-Type": "application/json",
    Authorization: session ? `Bearer ${session.session_token}` : "",
  };

  const mergedHeaders: HeadersInit = {
    ...defaultHeaders,
    ...headers,
  };

  let processedBody: BodyInit | undefined;

  if (body) {
    if (typeof body === "object" && !(body instanceof FormData)) {
      processedBody = JSON.stringify(body);
    } else {
      processedBody = body as BodyInit;
    }
  }

  const requestOptions: RequestInit = {
    method,
    headers: mergedHeaders,
    ...otherOptions,
  };

  if (processedBody) {
    requestOptions.body = processedBody;
  }

  try {
    const response = await fetch(API_URL + url, requestOptions);
    const apiResponse: ApiResponse<T> = await response.json();

    if (!apiResponse.success) {
      return {
        success: false,
        code: apiResponse.code || response.status,
        error: apiResponse.error || apiResponse.message || "Unknown error",
        message: apiResponse.message || "An error occurred",
      } as ApiResponse<T>;
    }

    return apiResponse;
  } catch (error) {
    return {
      success: false,
      code: 0,
      error: error instanceof Error ? error.message : "Unknown error",
      message: "An error occurred while fetching data",
    } as ApiResponse<T>;
  }
};

export default apiFetch;
