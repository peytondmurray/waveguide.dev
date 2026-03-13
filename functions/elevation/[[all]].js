export async function onRequestGet(ctx) {
  const path = new URL(ctx.request.url).pathname.replace("/elevation/", "")
  const file = await ctx.env.SRTMGL3S_BUCKET.get(path)
  if (!file) {
    console.log(`File doesn't exist: ${JSON.stringify(ctx.request)}`)
    return new Response(`File doesn't exist: ${JSON.stringify(ctx.request)}`, {
      status: 404,
    })
  }

  return new Response(file.body, {
    headers: { "Content-Type": file.httpMetadata.contentType },
  })
}
