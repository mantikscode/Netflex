const allowedEndpoints = [
  /^\/3\/trending\/(?:movie|tv)\/week$/,
  /^\/3\/discover\/(?:movie|tv)$/,
  /^\/3\/search\/(?:movie|tv)$/,
  /^\/3\/(?:movie|tv)\/\d+\/credits$/
];
const allowedParams = new Set([
  "language",
  "include_adult",
  "page",
  "query",
  "sort_by",
  "primary_release_date.gte",
  "primary_release_date.lte",
  "first_air_date.gte",
  "first_air_date.lte"
]);

export default async function handler(request) {
  if (request.method !== "GET") {
    return new Response("Method not allowed", {
      status: 405,
      headers: { Allow: "GET" }
    });
  }

  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) {
    console.error("TMDB_API_KEY is not configured.");
    return new Response("TMDB service is not configured.", { status: 500 });
  }

  const requestUrl = new URL(request.url);
  const endpoint = requestUrl.searchParams.get("endpoint");
  if (!endpoint || !allowedEndpoints.some(pattern => pattern.test(endpoint))) {
    return new Response("Unsupported TMDB endpoint.", { status: 400 });
  }

  const tmdbUrl = new URL(`https://api.themoviedb.org${endpoint}`);
  for (const [name, value] of requestUrl.searchParams) {
    if (name !== "endpoint" && allowedParams.has(name)) {
      tmdbUrl.searchParams.set(name, value);
    }
  }
  tmdbUrl.searchParams.set("api_key", apiKey);

  try {
    const response = await fetch(tmdbUrl, {
      headers: { Accept: "application/json" }
    });
    return new Response(response.body, {
      status: response.status,
      headers: {
        "Content-Type": response.headers.get("content-type") || "application/json",
        "Cache-Control": "public, max-age=300"
      }
    });
  } catch (error) {
    console.error("TMDB request failed.", error);
    return new Response("Could not reach TMDB.", { status: 502 });
  }
}
