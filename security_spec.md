# Security Specification — Anchor Family Safety Platform

## 1. Access Pattern Categorization
- `/families/{familyId}`: **Role-Based / Membership-Isolated Collaborative Document**.
  - Only authenticated users whose `request.auth.uid` is the `primaryGuardianUid`, listed in `memberUids`, or the bootstrapped admin (`alfredrasel721@gmail.com`) may read or update the family document.
  - A guardian or child device from one family must NEVER read or modify an unrelated family's document.
  - On creation, `request.resource.data.primaryGuardianUid == request.auth.uid` and `request.auth.uid in request.resource.data.memberUids`.
  - Immutable fields on update: `id`, `primaryGuardianUid`.
- `/pairings/{code}`: **Authenticated Handshake Document**.
  - Created by an authenticated guardian (`request.resource.data.createdByUid == request.auth.uid`).
  - Read or updated (to mark `status == 'paired'`) by an authenticated session during child device pairing.
  - Deleted only by the creator (`resource.data.createdByUid == request.auth.uid`).

## 2. Helper Functions Inventory
- `isAuthenticated()`: Checks `request.auth != null`.
- `isAdmin()`: Checks if authenticated user has verified email `alfredrasel721@gmail.com`.
- `isFamilyMember(data)`: Checks `request.auth.uid == data.primaryGuardianUid || request.auth.uid in data.memberUids || isAdmin()`.
- `hasRequiredFields(fields)`: Checks `request.resource.data.keys().hasAll(fields)`.
- `hasOnlyAllowedFields(fields)`: Checks `request.resource.data.keys().hasOnly(fields)`.
- `isValidFamilyHousehold(data)`: Validates field types, lengths (`householdName` 1..120 chars, `payloadJson` 2..900000 chars, `pairingCode` 6..12 chars), and allowed `subscriptionTier` enum (`'free'`, `'annual_trial'`, `'monthly_premium'`).
- `isValidPairingHandshake(data)`: Validates `code`, `familyId`, `childId`, `createdByUid`, `expiresAt`, and `status` enum (`'waiting'`, `'paired'`, `'expired'`).
