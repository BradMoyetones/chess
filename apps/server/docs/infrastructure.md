# Capa de Infraestructura

La capa de infraestructura se encarga de interactuar con el mundo exterior: base de datos, autenticación, y motores externos.

## Conexión a Base de Datos (`connection.ts`)
- Utiliza **`better-sqlite3`** en conjunto con el ORM **`drizzle-orm/better-sqlite3`**.
- El modo **WAL (Write-Ahead Logging)** está habilitado para un mejor rendimiento de concurrencia.
- Importa todos los esquemas desde el paquete compartido `@chess-fw/db`.

## Configuración de Autenticación (`setup.ts`)
- Utiliza **Better Auth** adaptado con su `drizzleAdapter`.
- Soporte para **Google OAuth** (opcional, requiere credenciales).
- Soporte para autenticación tradicional (Email/Contraseña) habilitado.
- Orígenes de confianza (Trusted origins) se inyectan a través de variables de entorno.

## Repositorios

### DrizzleGameRepository
Implementa el puerto `GameRepository` de la capa de dominio.
- `save(newGame: NewGame): Promise<Game>`: Guarda el historial completo de una partida terminada.
- `findById(id: string): Promise<Game | null>`: Recupera una partida por su ID único.
- `findByUserId(userId: string, limit: number, offset: number): Promise<Game[]>`: Paginación del historial de partidas de un usuario.

### DrizzleUserRepository
Implementa el puerto `UserRepository` de la capa de dominio.
- `getProfile(userId: string): Promise<UserProfile | null>`: Obtiene las estadísticas y elo del usuario.
- `createProfile(profile: any): Promise<UserProfile>`: Crea el perfil de un usuario recién registrado.
- `updateRating(userId: string, speed: string, newRating: number, result: string): Promise<void>`: Actualiza atómicamente en SQL el rating de la categoría correspondiente, e incrementa la estadística de victorias/derrotas/empates.

### DrizzleFriendshipRepository
Gestiona el sistema social de amigos.
- `sendRequest(requesterId: string, addresseeId: string): Promise<Friendship>`: Envía una nueva solicitud.
- `acceptRequest(friendshipId: string, userId: string): Promise<Friendship>`: Acepta una solicitud pendiente.
- `declineRequest(friendshipId: string, userId: string): Promise<void>`: Rechaza/Elimina una solicitud.
- `getFriends(userId: string): Promise<Friendship[]>`: Lista los amigos confirmados.
- `getPendingRequests(userId: string): Promise<Friendship[]>`: Lista solicitudes recibidas sin contestar.
- `removeFriend(friendshipId: string, userId: string): Promise<void>`: Elimina una amistad existente.

## Servicios Externos

### StockfishService
Envoltura del `StockfishAdapter` expuesto por `@chess-fw/core`.
- `init(config: { binaryPath: string }): Promise<void>`: Inicializa el proceso del motor.
- `evaluate(fen: string, options?: any): Promise<EvaluationData>`: Solicita el análisis de una posición (FEN).
- Soporta configuración del nivel de habilidad (`skill level`), el cual es mapeado internamente usando las opciones de `UCI_Elo` de Stockfish.
