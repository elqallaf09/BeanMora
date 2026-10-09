# purge-direct-messages

Messages expire 24 hours after their server-recorded creation time. RLS hides them immediately; the open mobile conversation also removes them on its clock. Cron invokes this function every five minutes for physical row/file cleanup. Storage deletion can lag by the scheduling interval or an outage, and queued objects are retried.

Maintenance POST accepts only the random 64-hex token held in Vault and verifies it through a service-only RPC. Expired rows and orphaned uploads are queued, private audio is removed through the Storage API, and successful removals are acknowledged. It never deletes Storage metadata directly through SQL. Message bodies, token values and Storage paths are not logged.

Account deletion uses a separate authenticated mode, `own_expired_audio`. The supplied owner must match `auth.getUser()`; a service-only query returns only that owner's expired, unreferenced audio in batches of 200. The client repeats batches, verifies completion and rechecks identity before proceeding with account deletion.

Deploy with `verify_jwt: false`: each maintenance/member request is authenticated inside the function before acting. CORS preflight performs no cleanup. Supabase provides the environment keys. The migration generates the limited maintenance token; configure Vault secret `beanmora_project_url` with that environment's own project URL before enabling the job. The internal `net` schema must remain outside the Data API.

Inspect Cron run outcomes and HTTP status codes without exposing request headers or Vault plaintext. Transactional role tests cover message expiry, participant isolation, cleanup acknowledgement/retry, active references and owner-scoped account cleanup; all fixture changes roll back.
