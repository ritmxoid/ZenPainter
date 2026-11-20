# ZenPainter Firestore Security Specification

## Collections & Access Matrix

### `/users/{userId}`
- **get**: Owner only (`request.auth != null && request.auth.uid == userId`).
- **list**: Denied (`false`) — prevents enumerating user accounts.
- **create**: Owner only, non-anonymous auth, strict schema (`uid`, `email`, `displayName`, `hideWelcomeTutorial`, `createdAt`, `updatedAt`), `uid == userId`, `createdAt == request.time`, `updatedAt == request.time`.
- **update**: Owner only, `uid` and `createdAt` immutable, only `['email', 'displayName', 'hideWelcomeTutorial', 'updatedAt']` editable, `updatedAt == request.time`.
- **delete**: Owner only.

### `/projectMetas/{projectId}` (Lightweight Project Cards)
- **get / list**: Owner only (`isSignedIn() && resource.data.ownerId == request.auth.uid`).
- **create**: Enforces max 5 projects per account via deterministic slot IDs (`${uid}_0` .. `${uid}_4`) and 30-day `expiresAt` (`<= request.time + 31d`).
- **update**: Owner only, `id`, `ownerId`, `createdAt` immutable, `updatedAt == request.time`, `expiresAt` <= 31d.
- **delete**: Owner only.

### `/projects/{projectId}` (Full-Fidelity Canvas Payload)
- **get / list**: Owner only (`isSignedIn() && resource.data.ownerId == request.auth.uid`).
- **create**: Enforces max 5 projects per account via deterministic slot IDs (`${uid}_0` .. `${uid}_4`) and 30-day `expiresAt` (`<= request.time + 31d`), native maps/lists (`canvasData`, `bgConfig`, `canvasSize`), `createdAt == request.time`, `updatedAt == request.time`.
- **update**: Owner only, `id`, `ownerId`, and `createdAt` immutable, `updatedAt == request.time`, `expiresAt` <= 31d, `affectedKeys().hasOnly(...)`.
- **delete**: Owner only.

### `/userDrafts/{userId}` (Automatic Cloud Draft — Excluded from 5-Slot Limit)
- **get**: Owner only (`isOwner(userId)`).
- **list**: Denied (`false`) — prevents enumerating drafts across accounts.
- **create / update / delete**: Owner only (`isOwner(userId)`), strict schema validation (`ownerId == userId`, `canvasData`, `bgConfig`, `canvasSize`, `createdAt` immutable, `updatedAt == request.time`, `expiresAt` <= 31d).

### Default Catch-All
- All other paths are explicitly denied (`allow read, write: if false;`).
