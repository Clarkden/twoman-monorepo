import apiFetch from "./fetch";

export const updatePushToken = async (
  pushToken: string,
): Promise<{ success: boolean }> => {
  try {
    const response = await apiFetch("/user/push-token", {
      method: "POST",
      body: {
        push_token: pushToken,
      },
    });

    if (!response.success) {
      throw new Error(response.error);
    }

    return { success: true };
  } catch (error) {
    console.log(error);
  }

  return { success: false };
};
