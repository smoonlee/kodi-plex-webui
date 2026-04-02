# Contributing

Thanks for your interest in contributing to Kodi Plex Web UI!

## Getting Started

1. Fork the repository
2. Clone your fork and create a feature branch: `git checkout -b my-feature`
3. Enable HTTP control in Kodi (Settings → Services → Control)
4. Open `http://<kodi-ip>:8080` to test your changes live

## Code Style

- **2 spaces** for indentation (see `.editorconfig`)
- **LF** line endings
- **No frameworks or build tools** — this is vanilla HTML/CSS/JS
- Use `const` / `let`, never `var`
- Escape all user-facing strings with `escapeHtml()`
- Set background images via DOM property, not inline `style` attributes

## Pull Requests

- Keep PRs focused — one feature or fix per PR
- Update `CHANGELOG.md` under an `[Unreleased]` section
- Test on at least one Kodi version before submitting
- Ensure the build works: `.\build.ps1`

## Reporting Issues

Open an issue with:

- Your Kodi version
- Browser and OS
- Steps to reproduce
- Expected vs actual behavior

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
