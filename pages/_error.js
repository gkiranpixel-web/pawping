import * as Sentry from "@sentry/nextjs";
import NextError from "next/error";

// Next.js's built-in error page (shown for an unhandled SSR crash, e.g. a
// 500) doesn't get picked up by the client/server Sentry.init() calls on
// its own — this reports it, then renders the normal default error page.
function CustomError(props) {
  return <NextError statusCode={props.statusCode} />;
}

CustomError.getInitialProps = async (contextData) => {
  await Sentry.captureUnderscoreErrorException(contextData);
  return NextError.getInitialProps(contextData);
};

export default CustomError;
