/**
 * Where the app talks to the API.
 *
 * `EXPO_PUBLIC_*` variables are inlined into the bundle at build time, so this
 * is decided when the binary is built and cannot be changed afterwards. That
 * is what makes getting it wrong expensive: a release built without it is not
 * misconfigured, it is inert, and every screen fails in a way that looks like
 * the server is down.
 *
 * Where each build gets its value:
 *
 *   development  .env in this directory (gitignored). A phone resolves
 *                "localhost" to itself, so on a real device this must be the
 *                dev machine's LAN address, e.g. http://192.168.1.20:3000/api
 *   preview      eas.json -> build.preview.env
 *   production   eas.json -> build.production.env
 *
 * `.env` is gitignored and EAS builds from git, so a cloud build never sees it.
 * That is why the two shipping profiles name the URL in `eas.json` instead:
 * committed, reviewable, and the same for everyone who runs the build.
 *
 * This is the API only. Images are absolute URLs the API returns, served from
 * the CDN in front of its S3 bucket, so nothing here rewrites them.
 */

const configured = process.env.EXPO_PUBLIC_API_URL;

/** Local-only addresses, which no shipped build can reach. */
const isLocal = (url: string) => /(^|\/\/)(localhost|127\.0\.0\.1|10\.0\.2\.2)(:|\/|$)/.test(url);

if (!__DEV__ && (!configured || isLocal(configured))) {
  // Loud on purpose. Falling back quietly would produce an app that installs,
  // launches, and then fails every request - indistinguishable from an outage,
  // and discovered by customers rather than by whoever built it. Throwing here
  // surfaces it on the first launch of an internal build, which is the cheapest
  // possible moment to find out.
  throw new Error(
    'EXPO_PUBLIC_API_URL is missing or points at a local address in a release build. ' +
      'Set it in eas.json under build.<profile>.env before shipping.',
  );
}

export const API_BASE_URL = configured ?? 'http://localhost:3000/api';
