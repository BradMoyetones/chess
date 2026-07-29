# API REST

Este documento detalla los 15 endpoints HTTP disponibles en el servidor de ajedrez.

## Middleware de Autenticación
- **Archivo:** Definido en `middleware.ts`.
- **Implementación:** Utiliza `auth.api.getSession()` de Better Auth en conjunto con `fromNodeHeaders`.
- **Funcionalidad:** Popula las propiedades `user` y `authSession` dentro del objeto `AuthenticatedRequest` para su uso en los controladores protegidos.

## Endpoints

### Partidas (Games)

#### 1. Obtener partida por ID
- **Método y Ruta:** `GET /api/games/:id`
- **Requiere Autenticación:** No (Público)
- **Descripción:** Obtiene los detalles de una partida específica mediante su identificador.
- **Parámetros de Ruta:** `id` (string)
- **Cuerpo de Respuesta:** Objeto `Game` de la base de datos (tipado en `@chess-fw/contracts`).
- **Códigos de Error:** `404 Not Found` si la partida no existe.
- **Ejemplo cURL:**
  ```bash
  curl -X GET http://localhost:3000/api/games/123
  ```

#### 2. Historial de partidas de usuario
- **Método y Ruta:** `GET /api/games/user/:userId?limit=20&offset=0`
- **Requiere Autenticación:** No (Público)
- **Descripción:** Obtiene el historial paginado de partidas de un usuario específico.
- **Parámetros de Ruta:** `userId` (string)
- **Parámetros de Consulta (Query):** 
  - `limit` (number, opcional, por defecto 20)
  - `offset` (number, opcional, por defecto 0)
- **Cuerpo de Respuesta:**
  ```typescript
  {
    games: Game[];
    pagination: {
      limit: number;
      offset: number;
      count: number;
    }
  }
  ```
- **Códigos de Error:** `404 Not Found` si el usuario no existe.
- **Ejemplo cURL:**
  ```bash
  curl -X GET "http://localhost:3000/api/games/user/456?limit=10&offset=0"
  ```

### Perfil (Profile)

#### 3. Obtener perfil actual
- **Método y Ruta:** `GET /api/profile/me`
- **Requiere Autenticación:** Sí
- **Descripción:** Obtiene el perfil del usuario autenticado actual. Si el perfil no existe, se crea automáticamente.
- **Cuerpo de Respuesta:**
  ```typescript
  {
    user: User;
    profile: UserProfile;
  }
  ```
- **Códigos de Error:** `401 Unauthorized` si no hay sesión activa.
- **Ejemplo cURL:**
  ```bash
  curl -X GET http://localhost:3000/api/profile/me \
       -H "Authorization: Bearer <token>"
  ```

#### 4. Actualizar perfil
- **Método y Ruta:** `PUT /api/profile/me`
- **Requiere Autenticación:** Sí
- **Descripción:** Actualiza la información del perfil del usuario autenticado.
- **Cuerpo de la Petición (Body):**
  ```typescript
  {
    username?: string;
    bio?: string;
    country?: string;
  }
  ```
- **Cuerpo de Respuesta:** Perfil actualizado.
- **Códigos de Error:** 
  - `401 Unauthorized`
  - `409 Conflict` si el `username` ya está en uso.
- **Ejemplo cURL:**
  ```bash
  curl -X PUT http://localhost:3000/api/profile/me \
       -H "Authorization: Bearer <token>" \
       -H "Content-Type: application/json" \
       -d '{"bio": "Jugador entusiasta", "country": "ES"}'
  ```

#### 5. Buscar usuarios
- **Método y Ruta:** `GET /api/profile/search?q=term&limit=20`
- **Requiere Autenticación:** No (Público)
- **Descripción:** Busca perfiles de usuarios por nombre o nombre de usuario (mínimo 2 caracteres).
- **Parámetros de Consulta:**
  - `q` (string, requerido, mín. 2 caracteres)
  - `limit` (number, opcional, por defecto 20)
- **Cuerpo de Respuesta:**
  ```typescript
  {
    users: Array<{
      id: string;
      name: string;
      image: string;
      username: string;
      ratingBullet: number;
      ratingBlitz: number;
      ratingRapid: number;
    }>
  }
  ```
- **Códigos de Error:** `400 Bad Request` si el término de búsqueda es muy corto.
- **Ejemplo cURL:**
  ```bash
  curl -X GET "http://localhost:3000/api/profile/search?q=carlsen"
  ```

#### 6. Perfil público
- **Método y Ruta:** `GET /api/profile/:userId`
- **Requiere Autenticación:** No (Público)
- **Descripción:** Obtiene los datos públicos del perfil de un usuario.
- **Parámetros de Ruta:** `userId` (string)
- **Cuerpo de Respuesta:**
  ```typescript
  {
    user: {
      id: string;
      name: string;
      image: string;
      createdAt: Date;
    };
    profile: UserProfile;
  }
  ```
- **Códigos de Error:** `404 Not Found` si el usuario no existe.
- **Ejemplo cURL:**
  ```bash
  curl -X GET http://localhost:3000/api/profile/456
  ```

### Social

#### 7. Enviar solicitud de amistad
- **Método y Ruta:** `POST /api/social/friend-request`
- **Requiere Autenticación:** Sí
- **Descripción:** Envía una solicitud de amistad a otro usuario.
- **Cuerpo de la Petición:**
  ```typescript
  {
    addresseeId: string;
  }
  ```
- **Cuerpo de Respuesta:** Datos de la solicitud creada.
- **Códigos de Error:** 
  - `401 Unauthorized`
  - `409 Conflict` si ya existe una solicitud pendiente o amistad activa.
- **Ejemplo cURL:**
  ```bash
  curl -X POST http://localhost:3000/api/social/friend-request \
       -H "Authorization: Bearer <token>" \
       -H "Content-Type: application/json" \
       -d '{"addresseeId": "789"}'
  ```

#### 8. Aceptar solicitud de amistad
- **Método y Ruta:** `POST /api/social/friend-request/:id/accept`
- **Requiere Autenticación:** Sí
- **Descripción:** Acepta una solicitud de amistad pendiente. Solo el destinatario (`addresseeId`) puede aceptarla.
- **Parámetros de Ruta:** `id` (string, ID de la solicitud)
- **Cuerpo de Respuesta:** Estado actualizado.
- **Códigos de Error:** 
  - `401 Unauthorized`
  - `403 Forbidden` si el usuario no es el destinatario.
  - `404 Not Found` si no existe la solicitud.
- **Ejemplo cURL:**
  ```bash
  curl -X POST http://localhost:3000/api/social/friend-request/12/accept \
       -H "Authorization: Bearer <token>"
  ```

#### 9. Rechazar/Cancelar solicitud
- **Método y Ruta:** `POST /api/social/friend-request/:id/decline`
- **Requiere Autenticación:** Sí
- **Descripción:** Rechaza (si es destinatario) o cancela (si es remitente) una solicitud pendiente.
- **Parámetros de Ruta:** `id` (string)
- **Cuerpo de Respuesta:** Confirmación de acción.
- **Códigos de Error:** `401 Unauthorized`, `403 Forbidden`, `404 Not Found`.
- **Ejemplo cURL:**
  ```bash
  curl -X POST http://localhost:3000/api/social/friend-request/12/decline \
       -H "Authorization: Bearer <token>"
  ```

#### 10. Listar amigos
- **Método y Ruta:** `GET /api/social/friends`
- **Requiere Autenticación:** Sí
- **Descripción:** Obtiene la lista de amistades aceptadas del usuario.
- **Cuerpo de Respuesta:** Array de perfiles de amigos.
- **Códigos de Error:** `401 Unauthorized`.
- **Ejemplo cURL:**
  ```bash
  curl -X GET http://localhost:3000/api/social/friends \
       -H "Authorization: Bearer <token>"
  ```

#### 11. Solicitudes pendientes
- **Método y Ruta:** `GET /api/social/pending`
- **Requiere Autenticación:** Sí
- **Descripción:** Obtiene las solicitudes de amistad pendientes, tanto enviadas como recibidas.
- **Cuerpo de Respuesta:** Array de solicitudes.
- **Códigos de Error:** `401 Unauthorized`.
- **Ejemplo cURL:**
  ```bash
  curl -X GET http://localhost:3000/api/social/pending \
       -H "Authorization: Bearer <token>"
  ```

#### 12. Eliminar amigo
- **Método y Ruta:** `DELETE /api/social/friend/:id`
- **Requiere Autenticación:** Sí
- **Descripción:** Elimina a un usuario de la lista de amigos.
- **Parámetros de Ruta:** `id` (string, ID de la relación o del amigo)
- **Cuerpo de Respuesta:** Confirmación de eliminación.
- **Códigos de Error:** `401 Unauthorized`, `404 Not Found`.
- **Ejemplo cURL:**
  ```bash
  curl -X DELETE http://localhost:3000/api/social/friend/12 \
       -H "Authorization: Bearer <token>"
  ```

### Tabla de Clasificación (Leaderboard)

#### 13. Rankings por modalidad
- **Método y Ruta:** `GET /api/leaderboard/:speed?limit=50&offset=0`
- **Requiere Autenticación:** No (Público)
- **Descripción:** Obtiene el top de jugadores según el control de tiempo (bullet, blitz, rapid, classical). Utiliza `ROW_NUMBER()` en la base de datos para calcular el rango.
- **Parámetros de Ruta:** `speed` (bullet | blitz | rapid | classical)
- **Parámetros de Consulta:**
  - `limit` (number, opcional, por defecto 50)
  - `offset` (number, opcional, por defecto 0)
- **Cuerpo de Respuesta:**
  ```typescript
  {
    leaderboard: Array<UserProfile & { rank: number }>;
  }
  ```
- **Códigos de Error:** `400 Bad Request` si la modalidad es inválida.
- **Ejemplo cURL:**
  ```bash
  curl -X GET "http://localhost:3000/api/leaderboard/blitz?limit=10"
  ```

### Lobby (Salas de Espera)

#### 14. Salas abiertas
- **Método y Ruta:** `GET /api/lobby/rooms`
- **Requiere Autenticación:** No (Público)
- **Descripción:** Obtiene la lista de salas abiertas esperando a un oponente.
- **Cuerpo de Respuesta:**
  ```typescript
  {
    rooms: Array<{
      roomId: string;
      host: string;
      hostColor: 'w' | 'b' | 'random';
      timeControl: string;
      createdAt: Date;
    }>
  }
  ```
- **Ejemplo cURL:**
  ```bash
  curl -X GET http://localhost:3000/api/lobby/rooms
  ```

#### 15. Estadísticas del lobby
- **Método y Ruta:** `GET /api/lobby/stats`
- **Requiere Autenticación:** No (Público)
- **Descripción:** Obtiene estadísticas en tiempo real sobre el estado del lobby y las partidas.
- **Cuerpo de Respuesta:**
  ```typescript
  {
    rooms: {
      waiting: number;
      playing: number;
      finished: number;
      total: number;
    };
    matchmaking: {
      [queueKey: string]: number;
    }
  }
  ```
- **Ejemplo cURL:**
  ```bash
  curl -X GET http://localhost:3000/api/lobby/stats
  ```
