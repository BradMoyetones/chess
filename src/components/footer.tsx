import { useEffect, useState } from 'react'
import { REPO_URL, SOCIAL_LINKS, AUTHOR_URL } from '@/lib/data'
import { HeartIcon, StarIcon, GithubIcon } from 'lucide-react'
import { Separator } from '@/components/ui/separator'

export default function Footer() {
    const [stars, setStars] = useState<number | null>(null)

    useEffect(() => {
        fetch("https://api.github.com/repos/BradMoyetones/chess")
            .then((res) => res.json())
            .then((data) => {
                if (data.stargazers_count !== undefined) {
                    setStars(data.stargazers_count)
                }
            })
    }, [])

    return (
        <footer className="relative border-t border-border/50 bg-muted/30 backdrop-blur-sm">
            <div className="mx-auto max-w-5xl px-4 py-6">
                <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between w-full">
                    {/* Made with love */}
                    <div className="flex items-center gap-1 text-sm text-muted-foreground flex-1">
                        <span>Hecho con</span>
                        <HeartIcon className="h-4 w-4 fill-red-500 text-red-500" />
                        <span>por</span>
                        <a
                            href={AUTHOR_URL}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium text-foreground transition-colors hover:text-primary"
                        >
                            Brad Moyetones
                        </a>
                    </div>

                    {/* Social Links */}
                    <div className="flex items-center justify-center gap-3 flex-1">
                        {SOCIAL_LINKS.map((social) => (
                            <a
                                key={social.title}
                                href={social.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                title={social.title}
                                className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background text-muted-foreground transition-all hover:border-primary hover:text-primary hover:shadow-sm"
                            >
                                <social.icon className="h-4 w-4" />
                            </a>
                        ))}
                    </div>

                    {/* Repo with stars */}
                    <div className="flex items-center justify-end gap-3 flex-1">
                        <a
                            href={REPO_URL}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 text-sm text-muted-foreground transition-all hover:border-primary hover:text-primary hover:shadow-sm"
                        >
                            <GithubIcon className="h-4 w-4" />
                            <span className="font-medium">chess</span>
                            {stars !== null && (
                                <>
                                    <Separator orientation="vertical" className="h-4" />
                                    <div className="flex items-center gap-1">
                                        <StarIcon className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                                        <span>{stars}</span>
                                    </div>
                                </>
                            )}
                        </a>
                    </div>

                </div>

                {/* Copyright */}
                <div className="mt-4 text-center text-xs text-muted-foreground/70">
                    <p>Casi todos los derechos reservados © {new Date().getFullYear()}</p>
                </div>
            </div>
        </footer>
    )
}