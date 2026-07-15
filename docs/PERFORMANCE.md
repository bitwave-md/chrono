# Performance Baseline

Measured on 2026-07-15 against the Phase 5 local PostgreSQL 17 dataset using
`EXPLAIN (ANALYZE, BUFFERS)`.

| Query | Execution time | Plan observation |
| --- | ---: | --- |
| Recursive root Project subtree | 0.177 ms | Composite Workspace/Project index seeds the recursive union |
| Exact Sprint Issue list | 0.045 ms | Backward Workspace/created index scan with tenant filters |
| Client time aggregation | 0.098 ms | Workspace/start index scan and in-memory grouped sort |

The current hierarchy contains three Project nodes, four Issues, and three
finalized TimeLogs. These measurements validate query shape, not production
capacity. They do not justify a closure table, materialized report view, or
derived Issue projection yet.

Profile again with realistic cardinalities before introducing derived storage.
Candidate pressure points are exact Project/Team Issue lists and high-volume
dimension/date report filters; add tenant-leading composite indexes only when
real plans show material filtering or sorting cost.
