import { Match } from "@/types/api";
import apiFetch from "./fetch";

export const GetMatches = async (): Promise<Match[]> => {
  try {
    const response = await apiFetch<Match[]>("/match");

    if (response.code !== 200) {
      throw Error(response.error);
    }

    return response.data;
  } catch (error) {
    console.log(error);
  }

  return [];
};
