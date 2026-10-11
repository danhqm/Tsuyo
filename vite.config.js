import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ isSsrBuild }) => ({
  plugins: [react()],
  ssr: { noExternal: true },
  build: {
    rollupOptions: {
      output: {
        manualChunks: isSsrBuild
          ? undefined
          : { supabase: ["@supabase/supabase-js"] },
      },
    },
  },
}));
