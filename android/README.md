# Consentify Android (Spark-plan ingest)

Scanner companion: sign in, scan launcher-app permission facts, and write them directly to Firestore as the authenticated user. Cloud Functions are not required for this upload path.

A successful non-empty upload marks missing Android package documents as `removed` without deleting them. The web app remains the risk-analysis UI. Scan results are kept in memory only.

```
android\gradlew.bat assembleDebug
android\gradlew.bat test
```

- Application id: `com.consentify.app`
- minSdk 26, targetSdk 35, compileSdk 35
- No `QUERY_ALL_PACKAGES`
- Register `com.consentify.app` on Firebase project `consentify-a39f7` before a device can sign in and write
- `ingestAppScan` in `functions/` is unused by Android; it remains available for a future Blaze deployment
