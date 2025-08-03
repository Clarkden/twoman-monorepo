// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
declare global {
  namespace App {
    interface Locals {
      session: string | null;
    }
  }

  namespace Api {
    interface Response<T = unknown> {
      success: boolean;
      message: string;
      error: string;
      code: number;
      data: T;
    }
  }

  namespace Data {
    interface Profile {
      user_id: number;
      username: string;
      name: string;
      bio: string;
      gender: string;
      age?: number;
      date_of_birth: string;
      location_point: string;
      city: string;
      education: string;
      occupation: string;
      interests: string;
      image1: string;
      image2: string;
      image3: string;
      image4: string;
      preferred_gender: string;
      preferred_age_min: number;
      preferred_age_max: number;
      preferred_distance_max: number;
    }

    interface Friendship {
      ID: number;
      FriendID: number;
      ProfileID: number;
      Friend: Profile;
      Profile: Profile;
      accepted: boolean;
    }

    interface Match {
      ID: number;
      CreatedAt: string;
      UpdatedAt: string;
      DeletedAt: string | null;
      profile1_id: number;
      profile2_id: number | null;
      profile3_id: number;
      profile4_id: number | null;
      profile3_accepted: boolean;
      profile4_accepted: boolean;
      profile1: Profile;
      profile2: Profile | null;
      profile3: Profile;
      profile4: Profile | null;
      status: string;
      is_duo: boolean;
      is_friend: boolean;
      last_message: string;
      last_message_at: string;
    }

    interface FeatureFlag {
      ID: number;
      CreatedAt: string;
      UpdatedAt: string;
      DeletedAt: string | null;
      FlagName: string;
      IsEnabled: boolean;
    }

    interface ReportWithProfiles {
      id: number;
      reporter_id: number;
      reported_id: number;
      reason: string;
      reporter_name: string;
      reporter_username: string;
      reported_name: string;
      reported_username: string;
    }
  }
}

export {};
