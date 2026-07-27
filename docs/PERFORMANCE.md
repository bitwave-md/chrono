# Performance Baseline

Measured on 2026-07-15 against the Phase 5 local PostgreSQL 17 dataset using
`EXPLAIN (ANALYZE, BUFFERS)`.

| Query | Execution time | Plan observation |
| --- | ---: | --- |
| Exact Project Issue list | 0.045 ms | Backward Workspace/created index scan with tenant filters |
| Client time aggregation | 0.098 ms | Workspace/start index scan and in-memory grouped sort |

The current fixture contains three Projects, four Issues, and three
finalized TimeLogs. These measurements validate query shape, not production
capacity. They do not justify a materialized report view or derived Issue
projection yet.

Profile again with realistic cardinalities before introducing derived storage.
Candidate pressure points are exact Project/assignee Issue lists and high-volume
dimension/date report filters; add tenant-leading composite indexes only when
real plans show material filtering or sorting cost.

Official release discovery is cached server-side for 15 minutes. Operator
clients refetch on focus and every six hours; only an active update job polls at
two-second intervals. The updater performs network, backup, image, migration,
and health work outside the Next.js process.
