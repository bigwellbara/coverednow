/** Reads a setting, refusing the placeholder values in .env.example. */
export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable ${name}`);
  if (value === "change-me") {
    throw new Error(`Replace the placeholder value of ${name} in your environment`);
  }
  return value;
}
