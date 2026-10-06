export function assertLocalTestDatabase(url: string, env = process.env.APP_ENV) {
  const parsed = new URL(url);
  const host = parsed.hostname;
  const name = parsed.pathname.slice(1);
  if (env !== "test" || !["localhost", "127.0.0.1", "[::1]"].includes(host) || !/^elementary_test_[a-z0-9_]+$/.test(name)) {
    throw new Error("Seed/reset hanya boleh berjalan pada database uji lokal bernama elementary_test_<suffix> dengan APP_ENV=test.");
  }
  return name;
}
