import { ThemeConfig } from "../Types";
import { EventBus } from "../Core/EventBus";
import { PieceSymbol, Color } from "chess.js";

export class ThemeManager {
    private currentTheme: ThemeConfig;
    private eventBus: EventBus;

    constructor(initialTheme: ThemeConfig, eventBus: EventBus) {
        this.currentTheme = initialTheme;
        this.eventBus = eventBus;
    }

    /**
     * CAMBIO DE TEMA EN CALIENTE
     */
    public setTheme(newTheme: ThemeConfig): void {
        this.currentTheme = newTheme;
        
        // Gritamos al vacío que el tema cambió.
        // El UIBoard escuchará esto y se redibujará automáticamente.
        this.eventBus.emit('THEME_CHANGED', { 
            themeId: newTheme.id, 
            themeName: newTheme.name 
        });
    }
    
    /**
     * GETTERS ESPECÍFICOS (Control de acceso)
     */

    // Obtener el color de la casilla (clara u oscura)
    public getSquareColor(isLight: boolean): string {
        return isLight 
            ? this.currentTheme.board.lightSquareColor 
            : this.currentTheme.board.darkSquareColor;
    }

    // Obtener la URL de la skin de una pieza específica
    public getPieceSkin(pieceType: PieceSymbol, color: Color): string {
        return this.currentTheme.pieces[pieceType][color];
    }

    // Obtener la URL de un efecto de sonido
    public getSoundUrl(action: keyof ThemeConfig['sounds']): string {
        return this.currentTheme.sounds[action];
    }

    // Por si alguien necesita saber cómo se llama el tema actual
    public getCurrentThemeName(): string {
        return this.currentTheme.name;
    }
}
