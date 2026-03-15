# GitHub Repo Panel and Manual Architecture Flow — Implementation Report

## 1. What Was Implemented

### Repo Panel Changes

- **GitHubRepoPanel** (new): Dedicated panel for GitHub repository linking.
  - **Missing state**: Title "Repositório no GitHub", explanatory text, input field with placeholder "Cole a URL do repositório", button "Vincular repositório".
  - **Linked state**: Title, "Repositório vinculado" label, displayed URL.
  - **Validation**: Basic GitHub URL pattern before submit.
  - **Loading/error states**: Loading skeleton, link error display, disabled button during link.

- **Placement**: At the top of the Discovery tab content in `DiscoveryRightPanel`, above WhatWeUnderstandPanel.

- **Repo URL source**: `context.repo_url` (top-level from API) first; fallback to checklist item with key `repo_url` or `repository` and status `confirmed` (evidence as URL).

### Architecture Tab and Button Changes

- **Architecture tab enablement**: Arquitetura tab is enabled when:
  - `readiness.status` is `maybe_ready` or `ready_for_architecture`, and
  - `hasRepoUrl` is true (from context or checklist).

- **Começar arquitetura button**: Shown in DiagramsPanel when `canStartArchitecture` is true and no diagrams exist. Calls `POST /projects/{id}/start-architecture`, shows loading, disables on click.

- **Waiting state**: After start, shows "Arquitetura em andamento" and "Aguardando retorno do agente de arquitetura" while polling `getDiagrams` every 5 seconds until diagrams arrive.

### WebSocket Handling

- **checklist.updated**: When `key === "repo_url"` and `status === "confirmed"`, triggers `refetchContext()` so the GitHub panel updates when the chat links a repo.

- **refetchContext**: New callback from `useDiscoveryChat` to force a context refetch (used after manual link and after WS repo update).

### Other Changes

- **WhatWeUnderstandPanel**: Repo is excluded from derived items (context.repo_url, checklist, confirmed/inferred keys) to avoid duplication with GitHubRepoPanel. Repo is still shown when it comes from `understanding_summary` from the API.

---

## 2. Backend Contract Used

### Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/projects/{id}/context` | GET | Project context including `repo_url` (top-level) |
| `/projects/{id}/repo` | PATCH | Link repo: body `{ repo_url: string }` |
| `/projects/{id}/start-architecture` | POST | Start architecture analysis |
| `/projects/{id}/architecture-result` | GET | Diagrams/architecture result (also used for polling) |

### WebSocket Events

| Event | Usage |
|-------|--------|
| `checklist.updated` | When `key === "repo_url"` and `status === "confirmed"`, triggers context refetch |

---

## 3. Backend Additions Still Needed

1. **Repo link endpoint**: `PATCH /projects/{id}/repo` with body `{ repo_url: string }` — may not exist yet. If missing, the frontend will receive 404 and show an error.

2. **Start architecture endpoint**: `POST /projects/{id}/start-architecture` — may not exist yet. If missing, the "Começar arquitetura" flow will fail.

3. **`can_start_architecture`**: Backend could expose this boolean instead of deriving it from readiness + repo. Frontend is ready to use it if provided.

4. **`repo.linked` WebSocket event**: Optional. If backend emits `{ type: "repo.linked", data: { repo_url: string } }`, frontend can add a handler. Currently relies on `checklist.updated` for repo_url.

5. **Architecture result polling**: Frontend polls `GET /projects/{id}/architecture-result` every 5 seconds after start. Backend should return diagrams when ready. No separate status endpoint is used.

6. **Session state**: If backend updates `session.state` to `architecture_in_progress` after start, frontend will use it. Otherwise, local `architectureTriggered` is used.
