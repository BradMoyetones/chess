import { cn } from "@/lib/utils";

export default function Coordinates({ light, dark, flipped = false, className, ...props}: { light?: string, dark?: string, flipped?: boolean, className?: string}) {
    const ranks = flipped ? ['1', '2', '3', '4', '5', '6', '7', '8'] : ['8', '7', '6', '5', '4', '3', '2', '1'];
    const files = flipped ? ['h', 'g', 'f', 'e', 'd', 'c', 'b', 'a'] : ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    
    return (
        <div
            className={cn("select-none", className)}
            {...props}
        >
            <svg viewBox="0 0 100 100" className="coordinates" aria-hidden="true">
                {ranks.map((rank, i) => (
                    <text 
                        key={`rank-${rank}`}
                        x="0.75" 
                        y={`${3.5 + i * 12.5}`} 
                        font-size="2.8" 
                        className={`font-semibold ${i % 2 === 0 ? 'coordinate-light' : 'coordinate-dark'}`} 
                        style={{ fill: i % 2 === 0 ? light : dark }}
                    >
                        {rank}
                    </text>
                ))}
                {files.map((file, i) => (
                    <text 
                        key={`file-${file}`}
                        x={`${10 + i * 12.5}`} 
                        y="99" 
                        font-size="2.8" 
                        className={`font-semibold ${i % 2 === 1 ? 'coordinate-light' : 'coordinate-dark'}`} 
                        style={{ fill: i % 2 === 1 ? light : dark }}
                    >
                        {file}
                    </text>
                ))}
            </svg>
        </div>
    );
}
