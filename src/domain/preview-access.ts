export function allowsComponentPreview(
  environment: string | undefined,
  vercelEnvironment?: string,
) {
  return (
    ["test", "development", "preview"].includes(environment ?? "") &&
    vercelEnvironment !== "production"
  );
}
