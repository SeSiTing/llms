import * as esbuild from "esbuild";

const watch = process.argv.includes("--watch");

// Node.js 内置模块 - 所有这些都不应该被打包
const nodeBuiltins = [
  "child_process",
  "fs",
  "fs/promises",
  "path",
  "os",
  "crypto",
  "stream",
  "util",
  "url",
  "net",
  "tls",
  "http",
  "https",
  "zlib",
  "events",
  "buffer",
  "querystring",
  "assert",
  "perf_hooks",
  "v8",
  "vm",
  "diagnostics_channel",
  "worker_threads",
  "module",
  "repl",
  "readline",
];

const baseConfig: esbuild.BuildOptions = {
  entryPoints: ["src/server.ts"],
  bundle: true,
  minify: true,
  sourcemap: true,
  platform: "node",
  target: "node18",
  plugins: [],
  external: [
    "fastify",
    "dotenv",
    "@fastify/cors",
    "undici",
    "pino",
    "pino-pretty",
    ...nodeBuiltins,
  ],
};

const cjsConfig: esbuild.BuildOptions = {
  ...baseConfig,
  outdir: "dist/cjs",
  format: "cjs",
  outExtension: { ".js": ".cjs" },
};

const esmConfig: esbuild.BuildOptions = {
  ...baseConfig,
  outdir: "dist/esm",
  format: "esm",
  outExtension: { ".js": ".mjs" },
};

const startConfig: esbuild.BuildOptions = {
  entryPoints: ["scripts/start.ts"],
  bundle: true,
  minify: true,
  sourcemap: true,
  platform: "node",
  target: "node18",
  plugins: [],
  packages: "external",
  outdir: "dist",
  format: "esm",
  outExtension: { ".js": ".mjs" },
};

async function build() {
  console.log("Building CJS, ESM and Start versions...");
  
  const cjsCtx = await esbuild.context(cjsConfig);
  const esmCtx = await esbuild.context(esmConfig);
  const startCtx = await esbuild.context(startConfig);

  if (watch) {
    console.log("Watching for changes...");
    await Promise.all([
      cjsCtx.watch(),
      esmCtx.watch(),
      startCtx.watch(),
    ]);
  } else {
    await Promise.all([
      cjsCtx.rebuild(),
      esmCtx.rebuild(),
      startCtx.rebuild(),
    ]);
    
    await Promise.all([
      cjsCtx.dispose(),
      esmCtx.dispose(),
      startCtx.dispose(),
    ]);
    
    console.log("✅ Build completed successfully!");
    console.log("  - CJS: dist/cjs/server.cjs");
    console.log("  - ESM: dist/esm/server.mjs");
    console.log("  - Start: dist/start.mjs");
  }
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});
