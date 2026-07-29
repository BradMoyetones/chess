import type { Request, Response, NextFunction } from 'express';
import { auth } from '../../infrastructure/auth/setup';
import { fromNodeHeaders } from 'better-auth/node';

/** Express request augmented with auth data */
export interface AuthenticatedRequest extends Request {
    user: {
        id: string;
        name: string;
        email: string;
        image: string | null;
    };
    authSession: {
        id: string;
        token: string;
    };
}

/** Auth middleware for protected routes */
export async function requireAuth(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const session = await auth.api.getSession({
            headers: fromNodeHeaders(req.headers),
        });
        if (!session?.user) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }
        (req as AuthenticatedRequest).user = session.user as AuthenticatedRequest['user'];
        (req as AuthenticatedRequest).authSession = session.session as AuthenticatedRequest['authSession'];
        next();
    } catch (error) {
        res.status(401).json({ error: 'Unauthorized' });
    }
}
