import "../styles/globals.css";
import InstallBanner from "../lib/InstallBanner";
import Footer from "../lib/Footer";

export default function App({Component,pageProps}){
  return <>
    <Component {...pageProps}/>
    <Footer/>
    <InstallBanner/>
  </>;
}
