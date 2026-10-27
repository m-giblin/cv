"use client";

import Script from "next/script";
import { useRef } from "react";

type ForgeSdkGlobal = {
  init: (options: {
    apiKey: string;
    endpoint: string;
    projectKey?: string;
    environment?: string;
    sessionReplay?: boolean;
    ignoreErrors?: Array<RegExp | string>;
  }) => void;
};

declare global {
  interface Window {
    ForgeSDK?: ForgeSdkGlobal;
  }
}

export function ForgeSdkInit({
  apiKey,
  baseUrl,
  projectKey,
  environment,
}: {
  apiKey: string;
  baseUrl: string;
  projectKey: string;
  environment: string;
}) {
  const initialized = useRef(false);

  function initSdk() {
    if (initialized.current || !window.ForgeSDK) return;
    initialized.current = true;
    // Never record the sign-in, MFA or password-reset screens.
    const sensitivePage = /^\/(login|auth|mfa|forgot|reset)/.test(window.location.pathname);

    window.ForgeSDK.init({
      apiKey,
      endpoint: `${baseUrl}/api/v1/issues`,
      projectKey,
      environment,
      sessionReplay: !sensitivePage,
      ignoreErrors: [
        /ResizeObserver loop/,
        /ChunkLoadError/,
        /Loading chunk \d+ failed/,
        /Non-Error promise rejection/,
      ],
    });
  }

  return (
    <Script
      id="forge-sdk"
      onLoad={initSdk}
      onReady={initSdk}
      src={`${baseUrl}/forge-sdk.js`}
      strategy="afterInteractive"
    />
  );
}
