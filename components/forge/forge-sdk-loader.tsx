import { ForgeSdkInit } from "@/components/forge/forge-sdk-init";
import { getPublicForgeSdkConfig } from "@/lib/forge/config";

/** Auto-files uncaught JS errors to Forge with ~45s session replay (masked inputs). */
export function ForgeSdkLoader() {
  const config = getPublicForgeSdkConfig();
  if (!config) {
    return null;
  }

  return (
    <ForgeSdkInit
      apiKey={config.apiKey}
      baseUrl={config.baseUrl}
      environment={config.environment}
      projectKey={config.projectKey}
    />
  );
}
