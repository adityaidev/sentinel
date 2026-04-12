# CI Setup

The workflow in `ci.yml.example` is the GitHub Actions setup we recommend.

It wasn't installed on the initial push because the default `gh` CLI OAuth token doesn't include the `workflow` scope. One-time manual step to enable CI:

```bash
gh auth refresh -s workflow

mkdir -p .github/workflows
cp docs/ci/ci.yml.example .github/workflows/ci.yml
git add .github/workflows/ci.yml
git commit -m "ci: enable GitHub Actions"
git push
```

From then on every push to `main` and every PR runs typecheck + tests + build on Node 22.
