import "../styles/globals.css";
import InstallBanner from "../lib/InstallBanner";

export default function App({Component,pageProps}){
  return <>
    <Component {...pageProps}/>
    <InstallBanner/>
  </>;
}
