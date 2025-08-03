export interface SocketChatData {
    message: string;
    match_id: number;
}

export interface SocketAuthorizationData {
    session: string;
    version: string;
}

export interface SocketMatchData {
    match_id: number;
    action: "accept" | "reject" | "update_target" | "friend_match" | "unmatch";
    target_profile?: number;
}

export interface SocketProfileDecisionData {
    decision: string;
    is_duo?: boolean;
    friend_profile?: number;
    target_profile: number;
}

export interface SocketProfileResponseData {
    message: string;
    success: boolean;
}

export type SocketData =
    | SocketChatData
    | SocketAuthorizationData
    | SocketMatchData
    | SocketProfileDecisionData;

export interface SocketMessage<T = unknown> {
    type: "chat" | "match" | "match_removed" | "profile" | "pong" | "authorization" | "profile_response";
    data: T;
}
