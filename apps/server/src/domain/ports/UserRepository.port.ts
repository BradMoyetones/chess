import type { UserProfile, NewUserProfile } from '@chess-fw/db';
import type { Speed } from '@chess-fw/db';

export interface UserRepository {
    getProfile(userId: string): Promise<UserProfile | null>;
    createProfile(profile: NewUserProfile): Promise<UserProfile>;
    updateRating(userId: string, speed: Speed, newRating: number, result: 'win' | 'loss' | 'draw'): Promise<void>;
}
