/** Body for POST /api/social/friend-request */
export interface FriendRequestBody {
    addresseeId: string;
}

/** Response for GET /api/social/friends */
export interface FriendListResponse {
    friends: FriendshipRecord[];
}

/** Response for GET /api/social/pending */
export interface PendingRequestsResponse {
    requests: FriendshipRecord[];
}

export interface FriendshipRecord {
    id: string;
    requesterId: string;
    addresseeId: string;
    status: 'pending' | 'accepted' | 'blocked';
    createdAt: Date;
    updatedAt: Date;
}
