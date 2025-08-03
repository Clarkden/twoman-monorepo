export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  error: string;
  code: number;
  data: T;
}

export interface SessionData {
  session_token: string;
  refresh_token: string;
  user_id: number;
  expiration: string;
  type: string;
}

export interface Match {
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


export interface User {
  ID: number;
  CreatedAt: string;
  UpdatedAt: string;
  DeletedAt: string | null;
  PhoneNumber: string;
  Email: string;
  OauthProvider: string;
  OauthProviderID: string;
  PushToken: string;
}

export interface Profile {
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

export interface Message {
  ID: number;
  profile_id: number;
  Profile: Profile;
  match_id: number;
  Match: Match;
  message: string;
  CreatedAt: string;
}

export interface ProcessedMessage extends Message {
  timeDifference: number;
  nextProfileId: number | null;
  prevProfileId: number | null;
}

export interface Friendship {
  ID: number;
  FriendID: number;
  ProfileID: number;
  Friend: Profile;
  Profile: Profile;
  accepted: boolean;
}

export interface Block {
  ProfileID: number;
  BlockedProfileID: number;
  Profile: Profile;
  BlockedProfile: Profile;
}

export interface FeatureFlag {
  ID: number;
  CreatedAt: string;
  UpdatedAt: string;
  FlagName: string;
  IsEnabled: boolean;
}

export interface Notification {
  NewMatchesNotificationsEnabled: boolean;
  NewMessagesNotificationsEnabled: boolean;
  NewFriendRequestNotificationsEnabled: boolean;
  NotificationsEnabled: boolean;
  ExponentPushToken: string;
  UserID: number;
}
