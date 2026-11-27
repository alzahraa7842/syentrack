# Security Specification — AlumniTrack Cloud Firestore Rules (Phase 0)

## 1. Data Invariants
1. **Strict Ownership & Role Integrity (`users`)**: A user document `/users/{userId}` can only be created by the verified Firebase Auth owner (`userId == request.auth.uid && incoming().uid == request.auth.uid`) with `role == 'ALUMNI'`, unless the caller is an existing verified Admin (`isAdmin()`). Self-promotion (`role: 'ADMIN'`) or modifying `role`/`isActive` by non-admins is strictly denied.
2. **PII Isolation (`alumni_profiles`, `users`, `tracer_submissions`, `career_histories`, `documents`)**:
   - Unauthenticated users cannot read any PII (`email`, `phone`, `nisn`).
   - Public Landing Page statistics read ONLY from `/alumni_career_stats/{alumniId}` (zero-PII projection containing only `alumni_id`, `status_karir`, `angkatan`, `jurusan`, `updated_at`), `/school_settings/main`, and `/jobs` where `status == 'Published'`.
   - Alumni can read their own profile (`resource.data.uid == request.auth.uid`) or directory profiles explicitly marked `privacy_setting == 'PUBLIC'`.
3. **Path Variable & Payload Size Hardening**:
   - Every document ID variable (`userId`, `alumniId`, etc.) must pass `isValidId(id)` (`^[a-zA-Z0-9_-]+$`, `<= 128` chars) on single-document `get`/`create`/`update`/`delete`.
   - Every string and array field has explicit `.size()` bounds matching `firebase-blueprint.json`.
   - Every create enforces `keys().hasAll(...) && keys().hasOnly(...)` and every update enforces `affectedKeys().hasOnly(...)` + `isValid[Entity](incoming())`.
4. **Immutable Ownership & Temporal Integrity**:
   - `uid` / `author_uid` / `created_at` cannot be reassigned after creation.
5. **Forum Thread Lock Invariant**:
   - Locked forum posts (`existing().is_locked == true`) reject new comments from non-admins.
6. **Verified Email Mandate**:
   - Authenticated writes require `request.auth.token.email_verified == true`.

## 2. The "Dirty Dozen" Adversarial Payloads (Expected: PERMISSION_DENIED)
1. **Role Escalation Create**: Non-admin sends `{ id: 99, uid: auth.uid, name: "Hacker", email: "h@gmail.com", role: "ADMIN", isActive: true, created_at: "2026-01-01" }` to `/users/{auth.uid}`.
2. **Role Escalation Update**: Alumni updates `/users/{auth.uid}` adding `role: "ADMIN"` or `isActive: false` via `update`.
3. **Shadow / Ghost Field Injection**: User creates `/alumni_profiles/999` with valid fields plus ghost field `isVerifiedAdmin: true`.
4. **Unverified Email Spoof**: Request with `request.auth.token.email == 'admin@sekolah.sch.id'` and `request.auth.token.email_verified == false` attempting admin write.
5. **Cross-Owner PII Read**: Authenticated Alumni A attempts `get` on `/alumni_profiles/2` where `privacy_setting == 'ADMIN_ONLY'` and `uid != auth.uid`.
6. **Blanket Unscoped List Scrape**: Authenticated Alumni attempts `list` on `/users` or `/audit_logs` without admin role.
7. **ID Poisoning Attack**: Malicious client attempts write to `/jobs/${'a'.repeat(500)}`.
8. **Payload Exhaustion ("Denial of Wallet")**: Client attempts to write a 2MB string in `title` or `description` on `/forum_posts/1`.
9. **Locked Forum Comment Injection**: Non-admin attempts to append a comment to `/forum_posts/1` when `existing().is_locked == true`.
10. **Settings Hijack**: Non-admin alumni attempts to overwrite `/school_settings/main` or `/guru_bk_profiles/1`.
11. **Ownership Hijack on Update**: Alumni A updates `/career_histories/1` attempting to mutate `uid` to Alumni B's UID.
12. **Draft Job Leak**: Unauthenticated visitor attempts to read `/jobs/99` where `status == 'Draft'`.
