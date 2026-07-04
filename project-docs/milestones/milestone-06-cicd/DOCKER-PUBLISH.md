# Docker Publish

## Registry

Images are published to GitHub Container Registry:

```txt
ghcr.io/<owner>/<repo>/server
ghcr.io/<owner>/<repo>/web
```

## Trigger

Publishing runs on:

- push to `main`
- tags matching `v*`

## Tags

Generated tags:

- branch name
- git tag
- short SHA
- latest on default branch
