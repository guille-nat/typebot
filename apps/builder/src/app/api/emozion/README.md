# Emozion integration endpoints

Custom, fork-only endpoints that let the **EmozionBot** backend (a Chatwoot
fork) talk to this Typebot instance server-to-server. They are not part of
upstream Typebot.

## Why these exist

EmozionBot is multi-tenant white-label. Each Chatwoot account `:id` is mapped to
an **isolated Typebot workspace** named `emz_{id}` (e.g. account `8` →
`emz_8`). Those workspaces are **created on demand by the SSO route**
(`../auth/sso/route.ts`) the first time a user opens the embedded flow builder:
the SSO handler upserts a per-account "ghost" user and makes it `ADMIN` of its
own workspace.

That design has one consequence: **no single user belongs to every workspace.**
So the standard, membership-gated listing (`listTypebots`, which 404s unless the
caller is a member of the workspace) cannot be used by the EmozionBot backend to
enumerate an account's flows.

## What we added

`GET /api/emozion/typebots?workspaceId=emz_{accountId}` — lists the **published**
flows of a workspace so EmozionBot can render a dropdown (flow name + public id)
instead of forcing admins to paste a flow's public id by hand into a WhatsApp
automation rule.

### Auth — shared secret, not membership

The endpoint trusts **whoever holds `EMOZION_SHARED_SECRET`** (the same secret
the SSO route already verifies), not a workspace member. EmozionBot signs a
short-lived JWT and sends it as a Bearer token:

```
Authorization: Bearer <jwt signed with EMOZION_SHARED_SECRET, HS256>
JWT payload: { "workspaceId": "emz_8", "exp": <now + 60s> }
```

The handler:

1. Returns `501` if `EMOZION_SHARED_SECRET` is unset.
2. `jwt.verify(token, EMOZION_SHARED_SECRET)` — rejects bad/expired tokens (`401`).
3. Requires `payload.workspaceId === ?workspaceId` — so a token minted for
   `emz_8` can never list `emz_9` (`403`).
4. Queries Prisma directly for non-archived, **published** typebots in that
   workspace — no membership check needed.

This is safe because: the secret is held only by the EmozionBot backend, the JWT
expires in ~60s (no replay), it is scoped to one workspace, and the response
only exposes a flow's `name` + `publicId` (a published flow's public id is
already how the Viewer starts it).

### Response

```json
{
  "typebots": [
    {
      "id": "<cuid>",
      "name": "Alta cliente",
      "publicId": "alta-cliente-abc123",
      "publishedTypebotId": "<cuid>"
    }
  ]
}
```

Only flows with both a `publishedTypebotId` and a `publicId` are startable via
the Viewer API, so the consumer keeps them and ignores drafts.

## Who consumes it

EmozionBot → `app/services/typebot/flows_service.rb` → the Typebot-flow dropdown
in the WhatsApp Automation rule form
(`/settings/whatsapp-automation`). It replaces the previous approach that
required a per-user `TYPEBOT_SERVICE_TOKEN` plus manually adding that user to
every `emz_*` workspace.

## Related fork changes

- `../auth/sso/route.ts` — the SSO login that provisions the `emz_*` workspaces.
- `features/typebot/api/handleListTypebots.ts` — patched to also return
  `publicId` (kept for the upstream-style oRPC listing).

## Required configuration

- `EMOZION_SHARED_SECRET` — already required by SSO; nothing new to set.
- Flows must be **published** in Typebot to appear (drafts are excluded).
