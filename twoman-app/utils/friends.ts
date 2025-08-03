import apiFetch from "@/utils/fetch";

export async function SendFriendRequest(
  username: string,
): Promise<{ success: boolean; message: string }> {
  try {
    const response = await apiFetch(`/profile/${username}/friend`, {
      method: "POST",
    });
    if (!response.success) {
      return { success: false, message: response.error };
    }

    return { success: true, message: response.message };
  } catch (error) {
    console.log(error);
  }

  return { success: false, message: "An error occurred" };
}
