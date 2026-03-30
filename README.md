# benmagyar.com

To install dependencies:

```bash
bun install
```

To run:

```bash
bun run index.ts
```

To regenerate the visualizer profile from the local source clip:

```bash
bun run derive:viz
```

The landing page uses the generated inline JSON blob in `index.html` at runtime, not the raw `viz.m4a`.
If your deploy setup serves the repository contents directly, exclude `viz.m4a` from the published output.

This project was created using `bun init` in bun v1.3.11. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.
