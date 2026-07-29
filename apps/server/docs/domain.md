# Capa de Dominio

La capa de dominio encapsula toda la lógica de negocio y las reglas del ajedrez. Es independiente de frameworks y detalles de infraestructura.

## Entidades

### GameEntity
Envoltura del `ChessEngine` proveniente de `@chess-fw/core`. Gestiona el estado y validación de una partida en curso.

- **Constructor**: `(initialFen?: string)`
- **Métodos**:
  - `attemptMove(from: string, to: string, promotion?: PieceSymbol): MoveResult`: Realiza la validación del lado del servidor para un movimiento.
  - `getFen(): string`: Retorna el FEN autoritativo actual de la partida.
  - `getPgn(): string`: Retorna el PGN autoritativo actual de la partida.
  - `getTurn(): Color`: Obtiene el turno actual (blancas o negras).
  - `isGameOver(): boolean`: Indica si la partida ha finalizado.
  - `isCheckmate(): boolean`: Indica si hay jaque mate en el tablero.
  - `isStalemate(): boolean`: Indica si la partida terminó por rey ahogado.
  - `isDraw(): boolean`: Indica si hay un empate (tablas).
  - `getResult(): GameResult | null`: Retorna el resultado oficial de la partida.
  - `setResult(result: GameResult): void`: Fuerza u otorga un resultado a la partida.
  - `getMoveHistory(): MoveData[]`: Obtiene el historial de todos los movimientos.
  - `getHalfMoves(): number`: Retorna la cantidad de medios movimientos realizados.
  - `recordClockSnapshot(remainingCentiseconds: number): void`: Registra el tiempo restante en el reloj en el momento actual.
  - `getClocksString(): string`: Obtiene el registro de los relojes en formato de texto.
  - `getMovesUci(): string`: Obtiene todos los movimientos en formato UCI.
  - `resetGame(fen?: string): void`: Reinicia el tablero, opcionalmente a un FEN específico.

### RoomEntity
Representa una sala o sala de juego donde dos jugadores se enfrentan.

- **Propiedades**: `id`, `host` (`PlayerInfo`), `guest` (`PlayerInfo | null`), `hostColor`, `timeControl`, `game` (`GameEntity`), `clock` (`ClockService | null`), `status`, `result`, `rematchRequested`.
- **Métodos**:
  - `getPlayerRole(socketId: string): Role | null`: Identifica si un socket corresponde al host o guest.
  - `getPlayerColor(role: Role): Color`: Obtiene el color de piezas asignado a un rol.
  - `getPlayerByRole(role: Role): PlayerInfo | null`: Obtiene la información del jugador según su rol.
  - `getPlayerByUserId(userId: string): { player: PlayerInfo, role: Role } | null`: Busca a un jugador por su ID de usuario.
  - `touch(): void`: Actualiza el último momento de actividad de la sala.
  - `buildSnapshot(): RoomSnapshot`: Genera una vista de estado completo de la sala.
  - `startGame(): void`: Inicializa los relojes y cambia el estado a juego en curso.
  - `resetForRematch(): void`: Reinicia la sala manteniendo a los jugadores para una revancha.

## Servicios

### ClockService
Gestor de tiempos de la partida.
- **Constructor**: `(initialMs: number, incrementMs: number)`
- **Regla de Negocio**: El reloj es **AUTORITATIVO DEL SERVIDOR**. La cuenta regresiva del cliente es puramente cosmética.
- **Métodos**:
  - `start(startingColor: Color, onTimeout: (loser: Color) => void): void`: Inicia el reloj.
  - `switchTurn(): { white: number; black: number }`: Cambia el turno, aplicando incrementos si corresponde, y devuelve el tiempo de ambos.
  - `getWhiteTime(): number`: Tiempo restante de blancas.
  - `getBlackTime(): number`: Tiempo restante de negras.
  - `getActiveColor(): Color | null`: Color que actualmente tiene el reloj corriendo.
  - `getCurrentRemainingMs(): number`: Tiempo en milisegundos restante para el jugador activo.
  - `stop(): void`: Detiene ambos relojes.

### RoomManager
Controlador del ciclo de vida de las salas en memoria.
- **Constructor**: `(onRoomClosed?: (roomId: string) => void)`
- **Constantes**: `DISCONNECT_TIMEOUT = 30s`, `GC_INTERVAL = 60s`, `ROOM_INACTIVITY = 5min`.
- **Métodos**:
  - `createRoom(host, hostColor, timeControl): RoomEntity`: Instancia una nueva sala.
  - `getRoom(roomId): RoomEntity | undefined`: Recupera una sala existente.
  - `deleteRoom(roomId): void`: Elimina y limpia los recursos de una sala.
  - `findRoomsBySocketId(socketId): [string, RoomEntity][]`: Busca todas las salas a las que pertenece un socket.
  - `startDisconnectTimer(roomId, userId, onExpire): void`: Inicia temporizador de abandono por desconexión.
  - `clearDisconnectTimer(roomId, userId): void`: Cancela el temporizador al reconectar.
  - `getOpenRooms(): RoomEntity[]`: Lista todas las salas públicas buscando oponente.
  - `getRoomStats(): { waiting: number, playing: number, finished: number, total: number }`: Obtiene métricas del uso de salas.
  - `destroy(): void`: Libera los recursos (intervalos GC).

### RatingCalculator
Calculador del sistema Elo (Rating).
- **Métodos estáticos**:
  - `calculate(rating: number, opponentRating: number, score: number, gamesPlayed: number): RatingChange`
- **Regla de Negocio**: Factor K es de 40 para jugadores con menos de 30 partidas; de lo contrario, 20.
- **Retorno**: `{ oldRating: number, newRating: number, diff: number }`

### MatchmakingService
Sistema de emparejamiento para partidas públicas.
- **Regla de Negocio**: Colas separadas por clave de control de tiempo (ej. '180+2'). El rango de emparejamiento inicia en 100 puntos y se expande 50 puntos cada 5 segundos.
- **Métodos**:
  - `enqueue(request: MatchRequest): MatchResult | null`: Añade un jugador a la cola y busca oponente inmediato.
  - `dequeue(userId: string): boolean`: Saca a un jugador de la cola.
  - `isInQueue(userId: string): boolean`: Verifica si el usuario ya está buscando partida.
  - `getStats(): Record<string, number>`: Retorna cantidad de jugadores por cada ritmo de tiempo.
  - `dequeueBySocketId(socketId: string): string | null`: Saca a un jugador basado en su conexión.
