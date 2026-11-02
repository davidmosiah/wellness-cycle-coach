# Calendar and profile input boundaries

## Calendar dates

Cycle date strings must be real calendar dates in `YYYY-MM-DD` format. For example,
`2024-02-29` is valid; `2025-02-29` and `2026-02-30` are rejected rather than rolled
forward by JavaScript Date parsing.

Phase estimation, nutrition/training recommendations and full reports interpret
`today` as a **UTC calendar date**, not the user's local timezone. Without `today`,
the current UTC day is used. Pass the intended reference calendar date explicitly
when producing a retrospective or timezone-specific report. A period start after
that reference date is rejected, rather than returned as cycle day 0 or a negative
menstrual day. Same UTC-day starts remain valid from midnight through 23:59 UTC.

For direct library callers, a Date instant is compared using its UTC calendar day:
`2026-05-15T10:00:00+12:00` is still May 14 UTC, so a May 15 start is future relative
to that instant. No automatic local-timezone inference is performed.

`cycle_predict_next_period` and `estimateAverageCycleLength` validate real calendar
dates but do not compare history to the current day; the future-date guard applies
to phase estimation and its consumers. Empty-history fallback and clinical model
confidence are unchanged. These outputs remain informational, not medical advice.

## Shared profile

Profile updates accept only known v1 fields and partial object sections, with the
declared string, string-array, boolean and enum types. Invalid input is rejected
before reading or writing the store. The explicit-user-intent requirement remains.

Valid partial v1 files still receive defaults on read. Malformed stored JSON,
unsupported schema, invalid field types and credential-shaped contents cause a
sanitized repair error; the original file is preserved, not silently replaced with
defaults. Back up and explicitly repair the local file before retrying. This patch
does not auto-repair or migrate unrelated connector copies.
