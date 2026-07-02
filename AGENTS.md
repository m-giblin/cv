# AGENTS.md

## Cursor Cloud specific instructions

This repo is a **static HTML personal CV/website** (`index.html`, `Contact.html`, `images/photo.jpg`). There is **no package manager, no build step, no test suite, and no lint config** — nothing to install.

### Running the site (development)

Serve the static files from the repo root with Python's built-in server (Python 3 is preinstalled):

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000/index.html`.

### Non-obvious caveats

- **Case-sensitive links:** `index.html` links to `contact.html` (lowercase), but the file on disk is `Contact.html`. On Linux (case-sensitive filesystem) that link returns HTTP 404 even though `http://localhost:8000/Contact.html` works. This is a latent bug in the source, not an environment issue.
- The contact form uses a `mailto:` action, so "Submit" just opens the visitor's email client — there is no backend to run.
- There are no lint/test/build commands to run; verification is visual (load the pages / screenshot).
