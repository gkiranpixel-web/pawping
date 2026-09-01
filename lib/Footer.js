import pkg from "../package.json";

// A small, always-visible version tag. The point isn't the version number
// itself — it's giving a non-technical user (and you) a fast way to tell
// "did the new deploy actually go live" apart from "the browser is showing
// me something stale," without needing to open Vercel or the dev tools.
export default function Footer(){
  return <footer className="appFooter noPrint">TagPing v{pkg.version}</footer>;
}
