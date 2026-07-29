import crypto from 'crypto';
import type { Color } from '@chess-fw/core';
import type { NewGame, UserProfile } from '@chess-fw/db';
import type { RoomEntity } from '../domain/entities/RoomEntity';
import type { GameRepository } from '../domain/ports/GameRepository.port';
import type { UserRepository } from '../domain/ports/UserRepository.port';
import { RatingCalculator } from '../domain/services/RatingCalculator';
import { classifySpeed, mapStatus, mapTermination } from '../utils/game';

export class GamePersistenceService {
    constructor(
        private gameRepo: GameRepository,
        private userRepo: UserRepository
    ) {}

    /**
     * Persist a completed game to the database.
     * Calculates rating changes if both players are authenticated.
     */
    async persistGame(room: RoomEntity): Promise<void> {
        try {
            if (!room.result || !room.guest) {
                console.log(`[PERSIST] Skipping: room ${room.id} missing result or guest`);
                return;
            }

            // Determine white and black players
            const whitePlayer = room.hostColor === 'w' ? room.host : room.guest;
            const blackPlayer = room.hostColor === 'w' ? room.guest : room.host;

            // Skip bot games for now
            if (whitePlayer.isBot || blackPlayer.isBot) {
                console.log(`[PERSIST] Skipping bot game in room ${room.id}`);
                return;
            }

            const speed = room.timeControl
                ? classifySpeed(room.timeControl.initial, room.timeControl.increment)
                : 'classical';

            const gameData: NewGame = {
                id: crypto.randomUUID(),
                whiteId: whitePlayer.userId,
                blackId: blackPlayer.userId,
                status: mapStatus(room.result.reason, room.result.winner),
                winner: room.result.winner === 'draw' ? null : room.result.winner,
                termination: mapTermination(room.result.reason),
                timeInitial: room.timeControl?.initial ?? null,
                timeIncrement: room.timeControl?.increment ?? null,
                speed,
                initialFen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
                moves: room.game.getMovesUci(),
                pgn: room.game.getPgn(),
                halfMoves: room.game.getHalfMoves(),
                clocks: room.game.getClocksString() || null,
                rated: true,
                variant: 'standard',
                source: 'lobby',
                finishedAt: new Date(room.result.timestamp),
            };

            await this.gameRepo.save(gameData);
            console.log(`[PERSIST] Game saved: ${gameData.id} | ${whitePlayer.name} vs ${blackPlayer.name} | ${room.result.winner} by ${room.result.reason}`);

            // Rating calculation (async, non-blocking)
            this.updateRatings(whitePlayer.userId, blackPlayer.userId, room.result.winner, speed).catch(err => {
                console.error(`[RATING] Error updating ratings:`, err);
            });

        } catch (error) {
            console.error(`[PERSIST] Error saving game for room ${room.id}:`, error);
        }
    }

    private async updateRatings(
        whiteId: string,
        blackId: string,
        winner: Color | 'draw',
        speed: string
    ): Promise<void> {
        // Get or create profiles
        let whiteProfile = await this.userRepo.getProfile(whiteId);
        let blackProfile = await this.userRepo.getProfile(blackId);

        if (!whiteProfile) {
            whiteProfile = await this.userRepo.createProfile({ userId: whiteId });
        }
        if (!blackProfile) {
            blackProfile = await this.userRepo.createProfile({ userId: blackId });
        }

        // Get current ratings for the speed category
        const speedKey = speed as any; // Speed type from @chess-fw/db
        const whiteRating = this.getRatingForSpeed(whiteProfile, speed);
        const blackRating = this.getRatingForSpeed(blackProfile, speed);

        // Calculate scores
        const whiteScore = winner === 'w' ? 1 : winner === 'draw' ? 0.5 : 0;
        const blackScore = 1 - whiteScore;

        const whiteChange = RatingCalculator.calculate(
            whiteRating, blackRating, whiteScore, whiteProfile.gamesPlayed
        );
        const blackChange = RatingCalculator.calculate(
            blackRating, whiteRating, blackScore, blackProfile.gamesPlayed
        );

        const whiteResult = winner === 'w' ? 'win' : winner === 'draw' ? 'draw' : 'loss';
        const blackResult = winner === 'b' ? 'win' : winner === 'draw' ? 'draw' : 'loss';

        await this.userRepo.updateRating(whiteId, speedKey, whiteChange.newRating, whiteResult);
        await this.userRepo.updateRating(blackId, speedKey, blackChange.newRating, blackResult);

        console.log(`[RATING] ${whiteId}: ${whiteRating} → ${whiteChange.newRating} (${whiteChange.diff > 0 ? '+' : ''}${whiteChange.diff})`);
        console.log(`[RATING] ${blackId}: ${blackRating} → ${blackChange.newRating} (${blackChange.diff > 0 ? '+' : ''}${blackChange.diff})`);
    }

    private getRatingForSpeed(profile: UserProfile, speed: string): number {
        const DEFAULT_RATING = 1500;
        switch (speed) {
            case 'ultraBullet':
            case 'bullet': return profile.ratingBullet ?? DEFAULT_RATING;
            case 'blitz': return profile.ratingBlitz ?? DEFAULT_RATING;
            case 'rapid': return profile.ratingRapid ?? DEFAULT_RATING;
            case 'classical': return profile.ratingClassical ?? DEFAULT_RATING;
            default: return DEFAULT_RATING;
        }
    }
}
