export async function onRequestGet(ctx) {
  const path = new URL(ctx.request.url).pathname.replace("/elevation/", "")
  const origin = ctx.request.headers.get("origin")
  if (origin === null) {
    console.log(`Origin is null: ${ctx.request}`)
    return new Response(null, { status: 404 })
  }

  const file = await ctx.env.SRTMGL3S_BUCKET.get(path)
  if (!file) {
    console.log(`File doesn't exist: ${ctx.request}`)
    return new Response(null, { status: 404 })
  }

  const allowedOrigins = [
    /https:\/\/waveguide\.dev/,
    /https:\/\/.*\.waveguide-dev\.pages\.dev/,
  ]

  for (const pattern of allowedOrigins) {
    if (origin.match(pattern)) {
      return new Response(file.body, {
        headers: {
          "Content-Type": file.httpMetadata.contentType,
          "Access-Control-Allow-Origin": origin,
          "Access-Control-Allow-Methods": "GET",
        },
      })
    }
  }

  console.log(`Origin doesn't match valid origins: ${ctx.request}`)
  return new Response(null, { status: 404 })
}
