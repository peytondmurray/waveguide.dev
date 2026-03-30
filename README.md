# waveguide.dev

This project attempts to convert the fantastic
[meshtastic-site-planner](https://github.com/meshtastic/meshtastic-site-planner/)
and convert it to run entirely in the browser.

Check it out at <https://waveguide.dev> now!

## Background

I wanted to do this for a few reasons:

1. The site planner can be a bit slow, and it's quite heavy for something that
   doesn't feel like it should take much to do.
2. The main RF propagation simulator it depends on is
   [SPLAT](https://github.com/jmcmellen/splat/), which is a relatively small C++
   program that runs entirely in the terminal. That makes it easy to think about
   compiling to WASM and running in the browser.
3. Making the RF calculations in the client mean that you don't need to have a
   server somewhere doing this. That could make it cheaper to host if this
   project ever reaches the same level of maturity as the original site planner.
4. There aren't many good examples of how to use emscripten to compile to WASM
   and run code in the browser. This project is a good way of getting a feel for
   how it can be done.
5. A few years back [I did something similar for
   `uncrustify`](https://github.com/peytondmurray/uncrustify-ui/), a C/C++ code
   formatter. I basically never got any traffic on that site, and never ended up
   using it for anything except the one project I was working on at the time
   that needed it, so I stopped paying for the domain. So I already knew some of
   what I'd need to do to get SPLAT compiled to WASM and working in the browser.

## Development

You'll need `pnpm` (or whatever tool) to install dependencies.

1. `pnpm i`
2. `pnpm dev`

will start the local development server at
[localhost:5173](http://localhost:5173).

## Known issues

1. There's something slightly off when the predictions are displayed on the
   leaflet map. In the northern hemisphere it's off-center to the north by a
   tiny bit, in the southern hemisphere it's off-center to the south by a tiny
   bit, and at the equator it's dead on. So something slightly weird is going on
   here, and I'm not yet sure what it is. A guess: something to do with the
   projection of the SPLAT output PPM file?
2. For some reason, sometimes SPLAT spits out full size (2400px by 2400px)
   output images which have half of the image set to 0 signal (and the other
   half has the region surrounding the transmitter, and the prediction looks
   fine). Really not sure what causes this, so I've just masked these 0-signal
   regions off for now. I'd love to know why this is, but this project has eaten
   up all my time recently and I need to be done with it.

## Technical details

A few notes about this project:

1. I [cross-compiled SPLAT](https://github.com/peytondmurray/splat-web) to
   target web assembly. There are a bunch of nuances to doing this, and I'll
   talk about this in a blog post some time.
2. I downloaded the entire SRTMGL3S (90m) elevation tileset and put it in a
   Cloudflare R2 bucket (free egress!). I could have just made requests to
   [srtm.fasma.org](srtm.fasma.org) but then they'd run into CORS. It's easier
   and extremely cheap to just re-host on Cloudflare R2, and use an edge
   function to pull tiles from the bucket.

   The original dataset supposedly ranges from 60° S to 60° N, but in practice
   not all tiles from these latitudes are present.
3. This still takes way longer than it should, and the resulting coverage map
   still doesn't look good.

## Other thoughts

- The licensing is annoying: SPLAT is GPL2, so now splat-web and by extension
  this project must be as well :/
- SPLAT is slow! Looking at the Longley-Rice calculation I was able to optimize
  a few of the inner loops for a lot of speedup, but it's still very slow. I'm
  looking into other options, including
  [signal-server](https://github.com/lmux/Signal-Server) for speed.

## AI Disclosure

Like many developers these days, I'm being told _constantly_ that I need to be
using AI tooling, agents, and whatever else, and that I'm falling behind if I
don't. And truthfully I've found LLMs to sometimes be useful for rubber duck
debugging, or as an alternative for searching with Google (although anything an
LLM tells you needs to be checked with a real source anyway, so is it really
saving a web search?). That's how I've used AI on this project - I didn't use it
for code generation, because honestly it's just really bad at the parts I need
help with. I'm sure AI would have been great for the react part of this project,
but that's also the part I don't need help with, so... yeah.

Instead I need help with figuring out all the nuances of cross-compiling with
emscripten and fiddling with the filesystems of the two different WASM modules
and understanding why wasm64 wasn't going to work while wasm32 is just fine, and
so on and so on, and Opus 4.6 was just useless for this kind of stuff. But for
debugging it was occasionally helpful. I can point specifically to two instances
where I was glad to have had it:

- In the web worker an import statement I had written was importing a type, but
  I forgot to include the `type` keyword. Opus 4.6 caught it and for whatever
  reason tsc and biome didn't. The page loaded, but the WASM modules never did,
  so I was pretty confused.
- The branches in the binary search used to interpolate the colormap weren't
  quite right when I initially wrote them. Opus 4.6 helped eliminate the
  off-by-one issue I was having that was preventing the search from terminating.
