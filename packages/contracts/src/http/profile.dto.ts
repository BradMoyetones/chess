/** Response for GET /api/profile/me and GET /api/profile/:userId */
export interface ProfileResponse {
    user: {
        id: string;
        name: string;
        image: string | null;
        createdAt?: Date;
    };
    profile: UserProfileData | null;
}

export interface UserProfileData {
    userId: string;
    username: string | null;
    bio: string | null;
    country: string | null;
    ratingBullet: number;
    ratingBlitz: number;
    ratingRapid: number;
    ratingClassical: number;
    gamesPlayed: number;
    wins: number;
    losses: number;
    draws: number;
    lastSeenAt: Date | null;
}

/** Body for PUT /api/profile/me */
export interface UpdateProfileBody {
    username?: string;
    bio?: string;
    country?: string;
}

/** Response for GET /api/profile/search */
export interface SearchUsersResponse {
    users: SearchUserResult[];
}

export interface SearchUserResult {
    id: string;
    name: string;
    image: string | null;
    username: string | null;
    ratingBullet: number | null;
    ratingBlitz: number | null;
    ratingRapid: number | null;
}
