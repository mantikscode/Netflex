# showFlix

showFlix is a static website built with HTML, CSS, and JavaScript. No package installation or build step is needed.

## Deploy to Netlify

1. Import this repository into Netlify. The included `netlify.toml` configures the static site and TMDB function.
2. In Netlify, open **Site configuration → Environment variables** and add `TMDB_API_KEY` with your TMDB API key as its value.
3. Trigger a new deploy so the function receives the variable.

The key is only read by the Netlify Function and is not included in browser JavaScript. Since the previous key was embedded in client-side code, revoke or rotate it in TMDB and use the replacement as the Netlify environment variable.

The included GitHub Pages workflow can still publish the static files, but GitHub Pages does not run Netlify Functions; TMDB-backed features require deploying to Netlify.
