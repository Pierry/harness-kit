# PRP: Invoice Deadline Timezone Fix

**Source PRD:** `outputs/prd/2026-05-08-billing-invoice-deadline-tz-fix.md`
**Target executor:** coding-agent
**Squad:** Billing | **Tech lead:** @tech-lead | **Date:** 2026-05-10

## 1) Goal

Make the billing service evaluate invoice payment deadlines in the customer's local timezone instead of UTC. Add an integration-test suite proving correctness across UTC, UTC-3, and UTC-5 customers. Ship a one-time backfill script that re-evaluates invoices flagged as overdue in the last 90 days and clears false positives via an audit-table review step.

## 2) Why

- 3% of invoices from non-UTC customers are flagged overdue incorrectly (PRD §1).
- 12 weekly support tickets, $14k in disputed late fees per quarter (PRD §1).
- Prerequisite for SLA-backed payment-window guarantees planned for H2 2026 (PRD §1, strategy fit).

## 3) What

**User-visible behavior:**
- Invoice daily report shows overdue status using customer-local deadline comparison.
- Real-time invoice screen (`/invoices` view) shows the same.
- No UI changes; backend correction only.
- Backfill output: invoices reclassified from overdue to on-time within the 90-day window, after ops sign-off on the audit table.

**Out of scope:**
- Adding new columns to `customers`. `customers.timezone` already exists.
- Schema migration for `invoice_evaluations`. Reuse existing table.
- Refactoring the broader deadline-rule engine.

**Success criteria (verifiable):**
- [ ] Given an invoice with deadline `2026-05-10T20:00:00Z` for customer `CUST-001` (UTC-3, deadline 17:00 local), When the billing service evaluates, Then status = on-time.
- [ ] Given an invoice with deadline `2026-05-10T22:00:00Z` for customer `CUST-001`, When the billing service evaluates, Then status = overdue.
- [ ] Backfill script outputs a CSV of (invoice_id, old_status, new_status, customer_id, tz) and writes to `audit_invoice_tz_backfill` table. No rows are flipped without a manual approval step.
- [ ] Latency P95 stays below 220ms in load test.

## 4) Context

### Repos and files touched

| Repo | File | Change type | Reference |
|------|------|-------------|-----------|
| billing-service | `src/main/java/com/example/billing/deadline/DeadlineEvaluator.java:42` | modify | core comparison logic |
| billing-service | `src/main/java/com/example/billing/deadline/DeadlineEvaluator.java:88` | new | `convertToCustomerLocal(Instant, ZoneId)` |
| billing-service | `src/main/resources/db/migration/V20260510__audit_invoice_tz_backfill.sql` | new | audit table migration |
| billing-service | `src/test/java/com/example/billing/deadline/DeadlineEvaluatorTest.java` | modify | add UTC-3 / UTC-5 cases |
| billing-service | `src/main/resources/scripts/backfill/invoice_deadline_tz_backfill.sql` | new | one-time backfill script |

### Patterns to follow

- **Pattern:** Customer lookup with timezone
 **Example in codebase:** `src/main/java/com/example/billing/customer/CustomerRepository.java:33`
 **Why follow it:** Existing helper returns customer with TZ already deserialized as `ZoneId`. Reusing it avoids a second query.

- **Pattern:** Feature flag wrapping
 **Example in codebase:** `src/main/java/com/example/billing/dunning/DunningService.java:67`
 **Why follow it:** Same per-customer gating model. Use flag name `deadline_local_tz_v1`.

- **Pattern:** Integration test with fixed clock
 **Example in codebase:** `src/test/java/com/example/billing/dunning/DunningServiceTest.java:120`
 **Why follow it:** Avoids flaky tests around DST or runtime TZ.

### External documentation

- Java `ZonedDateTime` semantics: https://docs.oracle.com/javase/8/docs/api/java/time/ZonedDateTime.html. Read the section on `withZoneSameInstant` vs `withZoneSameLocal`. We want `withZoneSameInstant`.
- Feature flag service ADR: `docs/adr/0014-feature-flags.md`. For `featureFlags.isEnabled` per-entity semantics.

### Known gotchas

- **DST transitions:** Some customer timezones (US-EAST, EU-WEST) observe DST. Test suite must pin to known fixed dates either side of DST boundaries to remain stable.
- **Null timezone:** If `customers.timezone IS NULL` (some legacy customers), fall back to UTC and log a warning at WARN level with `customer_id`. Do not throw: that would block invoice evaluation entirely.
- **Backfill idempotency:** Run-twice safety. The audit-table insert must be `INSERT … ON CONFLICT (invoice_id) DO NOTHING`.

## 5) Implementation blueprint

```
1. Add featureFlags injection to DeadlineEvaluator (see DunningService.java:67 pattern).
2. In DeadlineEvaluator.evaluate(Invoice invoice):
 a. Lookup customer via CustomerRepository.findByIdWithTimezone(invoice.customerId).
 b. If customer.timezone == null, log WARN, fall back to ZoneId.of("UTC").
 c. Convert invoice.deadline into customer.timezone using withZoneSameInstant.
 d. Compare in local zone, return InvoiceStatus.OVERDUE or ON_TIME.
3. Guard the new path with featureFlags.isEnabled("deadline_local_tz_v1", customerId).
 If disabled, run legacy UTC comparison.
4. Update DeadlineEvaluatorTest with 6 cases (CUST-001 on-time/late, CUST-002 on-time/late, CUST-003 regression).
5. Write invoice_deadline_tz_backfill.sql with ON CONFLICT DO NOTHING and audit-only writes.
```

**Data:**
- No schema changes to operational tables.
- New table `audit_invoice_tz_backfill` via migration `V20260510__audit_invoice_tz_backfill.sql`. Columns: `invoice_id UUID PK`, `old_status VARCHAR(16)`, `new_status VARCHAR(16)`, `customer_id UUID`, `tz VARCHAR(64)`, `created_at TIMESTAMPTZ DEFAULT now()`.
- Volume: about 3% of 90 days × 50k invoices/day = about 135k rows.

**Observability:**
- Logs: `INFO` on flag check ("deadline_local_tz_v1 enabled for customer={customer_id}"), `WARN` on null timezone fallback.
- Metrics: `billing.deadline.evaluation.duration` histogram, tagged with `tz`. Dashboard: `billing/deadline-health` (existing: add a TZ panel).
- Alerts: P95 latency above 220ms for 5 min triggers pager. Existing alert; raise threshold from 200 to 220 for the flag-on cohort.

## 6) Validation gates

```bash
./gradlew :billing-service:build
./gradlew :billing-service:test --tests "com.example.billing.deadline.DeadlineEvaluatorTest*"
./gradlew :billing-service:detekt
psql $STAGING_DB_URL -f src/main/resources/scripts/backfill/invoice_deadline_tz_backfill.sql --single-transaction --dry-run
```

**Manual verification:**
- [ ] In staging, set feature flag for `CUST-001`. Create one invoice with deadline `20:00 UTC` (17:00 customer-local, on the deadline). Confirm status = on-time.
- [ ] Run backfill script in staging. Inspect `audit_invoice_tz_backfill` for CUST-001: confirm 90-day window populated, no UTC customers included.
- [ ] In Grafana `billing/deadline-health`, confirm new TZ panel renders.

## 7) Rollout

- [ ] Feature flag: `deadline_local_tz_v1`, per-customer gating.
- [ ] Migration required: yes. `V20260510__audit_invoice_tz_backfill.sql`. Forward-only, safe; no data movement.
- [ ] Rollback plan: disable flag, drop `audit_invoice_tz_backfill` only if backfill was applied incorrectly (data is read-only, so this is reversible).

## 8) Open items

- [ ] Confirm web frontend reads invoice status from API and not from its own clock: @web-tech-lead
- [ ] Decide who triggers the backfill apply step in production: @ops-lead

## 9) References

- PRD: `outputs/prd/2026-05-08-billing-invoice-deadline-tz-fix.md`
- ADR feature flags: `docs/adr/0014-feature-flags.md`
- Deadline dashboard: https://grafana.example.com/d/billing-deadline-health
- Pattern reference: `billing-service/src/main/java/com/example/billing/dunning/DunningService.java:67`
