import { ThemeConfig } from "../Types";
import { EventBus } from "../Core";
import { PieceSymbol, Color } from "chess.js";
import { Service, Inject } from "../Decorators";

/**
 * @class ThemeManager
 * @description Gestor encargado de administrar la apariencia visual y sonora del tablero.
 * Proporciona una API flexible donde los colores, imágenes y sonidos son totalmente opcionales.
 */
@Service()
export class ThemeManager {
    /** Tema actualmente activo en el sistema */
    private currentTheme!: ThemeConfig;

    /** Inyección automática del bus de eventos */
    @Inject(EventBus)
    private eventBus!: EventBus;

    /**
     * @method initialize
     * @description Inicializa el gestor con un tema inicial. Requerido dado que ahora
     * el contenedor de inyección instancia la clase sin parámetros en el constructor.
     * @param initialTheme Configuración de tema a aplicar
     */
    public initialize(initialTheme: ThemeConfig): void {
        this.currentTheme = initialTheme;
    }

    /**
     * @method setTheme
     * @description Cambia el tema actual en caliente y notifica a los suscriptores.
     * @param newTheme La nueva configuración del tema a aplicar.
     */
    public setTheme(newTheme: ThemeConfig): void {
        this.currentTheme = newTheme;
        
        // Emitimos el evento con datos dinámicos para que la UI (ej. UIBoard) se redibuje.
        this.eventBus.emit('THEME_CHANGED', { 
            themeId: newTheme.id, 
            themeName: newTheme.name 
        });
    }
    
    /**
     * @method getSquareColor
     * @description Obtiene el color de fondo para una casilla (clara u oscura).
     * @param isLight Indica si la casilla es clara (true) u oscura (false)
     * @returns {string | undefined} El color CSS, o undefined si no está configurado.
     */
    public getSquareColor(isLight: boolean): string | undefined {
        return isLight 
            ? this.currentTheme.board?.lightSquareColor 
            : this.currentTheme.board?.darkSquareColor;
    }

    /**
     * @method getSquareImage
     * @description Obtiene la textura/imagen de fondo para una casilla.
     * @param isLight Indica si la casilla es clara u oscura
     * @returns {string | undefined} La URL de la imagen, o undefined si no está configurada.
     */
    public getSquareImage(isLight: boolean): string | undefined {
        return isLight
            ? this.currentTheme.board?.lightSquareImage
            : this.currentTheme.board?.darkSquareImage;
    }

    /**
     * @method getBackgroundImage
     * @description Obtiene la imagen de fondo general para el tablero entero.
     * @returns {string | undefined} La URL de la imagen general del tablero.
     */
    public getBackgroundImage(): string | undefined {
        return this.currentTheme.board?.backgroundImage;
    }

    /**
     * @method getPieceSkin
     * @description Obtiene la URL de la imagen (skin) de una pieza específica.
     * @param pieceType El tipo de pieza (peón, rey, reina, etc.)
     * @param color El color de la pieza (blanco o negro)
     * @returns {string | undefined} La URL de la imagen, o undefined si no existe.
     */
    public getPieceSkin(pieceType: PieceSymbol, color: Color): string | undefined {
        return this.currentTheme.pieces?.[pieceType]?.[color];
    }

    /**
     * @method getSoundUrl
     * @description Obtiene la URL del archivo de audio para una acción específica.
     * @param action La acción del juego (move, capture, check, etc.)
     * @returns {string | undefined} La URL del audio, o undefined si el tema no tiene sonidos.
     */
    public getSoundUrl(action: keyof NonNullable<ThemeConfig['sounds']>): string | undefined {
        return this.currentTheme.sounds?.[action];
    }

    /**
     * @method getCurrentThemeName
     * @description Obtiene el nombre legible del tema actualmente aplicado.
     * @returns {string} El nombre del tema
     */
    public getCurrentThemeName(): string {
        return this.currentTheme.name;
    }
}
