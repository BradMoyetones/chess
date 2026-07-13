'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router';

export default function HomePage() {
    return (
        <section
            className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 pt-20 pb-16 text-center"
        >
            {/* Background Radial Gradient Glow */}
            <div className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[600px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-chess/30 blur-[120px]" />

            <div className="z-10 flex max-w-4xl flex-col items-center gap-8">
                {/* Version Badge */}
                <Badge
                    variant='secondary'
                    className="border border-border p-4 text-sm font-semibold"
                >
                    @chess-fw/core@latest
                </Badge>

                {/* Main Heading */}
                <h1 className="flex flex-col gap-2 text-5xl font-extrabold tracking-tight sm:text-6xl md:text-4xl lg:text-6xl">
                    <span
                        className="pb-2 bg-linear-to-l from-chess via-70% via-chess-foreground to-chess-foreground bg-clip-text text-transparent"
                    >
                        Juega al ajedrez con la 
                    </span>
                    <span
                        className="pb-2 bg-linear-to-r from-chess via-60% via-chess-foreground to-chess-foreground bg-clip-text text-transparent"
                    >
                        computadora o con jugadores de todo el mundo
                    </span>
                </h1>

                {/* Subtitle */}
                <p className="max-w-2xl text-lg text-muted-foreground sm:text-xl">
                    Esta página usa @chess-fw/core para manejar la lógica del ajedrez. Esta lib abstrae todo
                    lo necesario para tener un juego de ajedrez funcional. Esta página imita el look de Chess.com.
                </p>

                {/* CTA Buttons */}
                <div className="mt-4 flex flex-col items-center gap-4 sm:flex-row">
                    <Link to="/play/computer">
                        <Button>
                            Jugar contra la computadora
                        </Button>
                    </Link>
                    <Link to="/play/online">
                        <Button variant={'outline'}>
                            Jugar online
                        </Button>
                    </Link>
                </div>
            </div>
        </section>
    );
}