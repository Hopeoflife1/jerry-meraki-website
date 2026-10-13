import { Helmet } from "react-helmet";

// App-wide <head> tags that make the site installable ("Add to Home Screen") on Android and iPhone.
// No service worker on purpose (Floot ships its own; a custom one is unsupported).
export const AppHead = () => (
  <Helmet>
    <link rel="manifest" href="/manifest.json" />
    <meta name="theme-color" content="#fbf8f1" />
    <link rel="apple-touch-icon" href="/_cdn/static/83646cbd-47db-46f8-8a0e-7da111e29522-jm-icon-180.png" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-title" content="Jerry Meraki" />
    <meta name="apple-mobile-web-app-status-bar-style" content="default" />
  </Helmet>
);