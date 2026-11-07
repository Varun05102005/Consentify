# Gemini is server-only. Scan ingest is authenticated and allowlisted.

This Functions package hosts `explainAppRisk` and `ingestAppScan`. The Vite app must never receive `GEMINI_API_KEY`.

- Firebase Auth is required. Unauthenticated callables fail.
- Store the Gemini key with Secret Manager: `firebase functions:secrets:set GEMINI_API_KEY`
- Optional model override: `GEMINI_MODEL` (default `gemini-3.8-flash`)
- The deterministic risk engine remains authoritative. Gemini only explains supplied facts.
- `ingestAppScan` remains in this package for an optional future Blaze deployment. The Android Spark-plan scanner writes directly to Firestore and does not call this callable.
- Explanations are not persisted.
- Callables remain authenticated, allowlisted, and fail closed. Concurrent ingest scans are last-write-wins; there is no scan-history lock.

Do not set `VITE_GEMINI_API_KEY`.
