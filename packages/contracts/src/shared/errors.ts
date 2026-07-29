/** Standard socket callback response */
export interface SocketAck {
    success: boolean;
    error?: string;
}

/** API error response */
export interface ApiErrorResponse {
    error: string;
}

/** Pagination metadata */
export interface PaginationMeta {
    limit: number;
    offset: number;
    count: number;
}
