import { defineConfig } from "tsup";
import { exec } from "child_process";

export default defineConfig((options) => {
  return {
    entry: ["src/index.ts"],
    outDir: "dist/esm",
    splitting: false,
    sourcemap: true,
    treeshake: true,

    clean: true,
    minify: !options.watch,

    format: ["esm"],

    dts: true,

    metafile: true,

    drop: ["debugger"],
    dropLabels: ["DEV", "TEST"],

    outExtension({ format }) {
      return {
        js: `.mjs`,
      };
    },
    async onSuccess() {
      // Start some long running task
      // Like a server

      if (!options.watch) {
        return;
      }

      const cmd = `yalc publish --push --changed  --no-scripts  --sig`;
      console.log("publishing");
      exec(cmd, (error, stdout, stderr) => {
        console.log(stdout);
        if (error) {
          console.error(`Error executing command: ${error.message}`);
          return;
        }
        if (stderr) {
          console.error(`Command stderr: ${stderr}`);
          return;
        }
      });
    },
  };
});
