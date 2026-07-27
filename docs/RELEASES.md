# Production Releases

## Version contract

Official Chrono versions use `vYY.M.N` in UTC. `YY` is the two-digit year, `M`
is the month without a leading zero, and `N` is a positive monthly sequence.
For example, the first July 2026 release is `v26.7.1`; the next is `v26.7.2`,
and the first August release is `v26.8.1`.

Only a stable, published GitHub Release is official. Commits, ordinary tags,
drafts, prereleases, malformed versions, and source builds never create update
notifications.

## Publishing

An authorized maintainer opens GitHub Actions and runs **Publish production
release**. The serialized workflow checks out `main`, calculates the next UTC
version from canonical tags, and runs TypeScript, ESLint, tests, and the
production build. It then publishes amd64 and arm64 app, migrator, and updater
images with the exact `vYY.M.N` tag and `latest`.

The GitHub Release is created only after all images succeed. Its assets include
release and version manifests, exact multi-platform image digests, the
self-hosting appliance, bootstrap helper, and SHA-256 checksums. The installed
app reports the build version and commit baked into its image rather than
editable runtime environment values.

## Migration compatibility

Every release migration must remain compatible with the immediately previous
application image. Use expand and contract changes: add new structures first,
deploy compatible code, and defer destructive removal to a later release. This
lets the updater restore the prior app image after a failed health check without
attempting an unsafe automatic database restore.
