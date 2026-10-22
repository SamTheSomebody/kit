# Changesets

Record release intent with `npm run changeset`, commit the file under `.changeset/`, merge to `main`.

CI opens a **Version Packages** PR when changesets land; merge that PR to publish via npm trusted publishing (OIDC). See root README → Release.
