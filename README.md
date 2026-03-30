# waveguide.dev

This project attempts to convert the fantastic
[meshtastic-site-planner](https://github.com/meshtastic/meshtastic-site-planner/)
and convert it to run entirely in the browser.

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

## Known issues

1. There's something slightly off when the predictions are displayed on the
   leaflet map. In the northern hemisphere it's off-center to the north by a
   tiny bit, in the southern hemisphere it's off-center to the south by a tiny
   bit, and at the equator it's dead on. So something slightly weird is going on
   here, and I'm not yet sure what it is.
2. For some reason, sometimes SPLAT spits out full size (2400px by 2400px)
   output images which have half of the image set to 0 signal (and the other
   half has the region surrounding the transmitter, and the prediction looks
   fine). Really not sure what causes this, so I've just masked these 0-signal
   regions off for now. I'd love to know why this is, but this project has eaten
   up all my time recently and I need to be done with it.

## AI Disclosure

Like many developers these days, I'm being told _constantly_ that I need to be
using AI tooling, agents, and whatever else, and that I'm falling behind if I
don't. And truthfully I've found LLMs to sometimes be useful for rubber ducking,
or as alternatives for searching with Google (although anything an LLM tells you
needs to be checked with a real source anyway). That's how I've used AI on this
project - I didn't use it for code generation, because honestly it's just really
bad at the parts I need help with. I'm sure AI would have been great for the
react part of this project, that's also the part I don't need help with, so...
yeah.

Instead I need help with figuring out all the nuances of cross-compiling with
emscripten and fiddling with the filesystems of the two different WASM modules
and understanding why wasm64 wasn't going to work while wasm32 is just fine, and
so on and so on, and Opus 4.6 was just useless for this kind of stuff. I tried
several times to use it for debugging, and occasionally it was helpful. I can
point specifically to one instance where I was glad to have it:

- In the web worker an import statement I had written was importing a type, but
  I forgot to include the `type` keyword. Opus 4.6 caught it and for whatever
  reason tsc and biome didn't. The page loaded, but the WASM modules never did,
  so I was pretty confused.

So if you spot something weird here, it's because I've been doing the best I can
with what turned out to be a pretty tricky side project in my free time.
