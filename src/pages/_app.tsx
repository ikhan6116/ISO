import type { AppProps } from "next/app";
import { DataProvider } from "@/lib/store.tsx";
import "@/styles/globals.css";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <DataProvider>
      <Component {...pageProps} />
    </DataProvider>
  );
}
