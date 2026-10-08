import { it, expect } from "vitest";
import { assertReleaseTarget } from "../../src/domain/release-target";
const manifest = {
  projectId: "rough-dawn-85427948",
  branchName: "production",
  branchId: "br-synthetic-target",
  endpointHost: "ep-synthetic-test.ap-southeast-1.aws.neon.tech",
  databaseName: "neondb",
  migrationRole: "neondb_owner",
  postgresMajor: 18,
};
const url =
  "postgresql://neondb_owner:synthetic@ep-synthetic-test.ap-southeast-1.aws.neon.tech/neondb?sslmode=require";
it("release metadata guard permits only a confirmed matching direct/TLS target and never connects", () => {
  expect(
    assertReleaseTarget(
      url,
      manifest,
      "migrate",
      "migrate:rough-dawn-85427948:br-synthetic-target",
      "production",
    ),
  ).toEqual(manifest);
});
it.each([
  [url, manifest, undefined, "production"],
  [url, manifest, "bootstrap:rough-dawn-85427948:br-synthetic-target", "production"],
  [url, manifest, "migrate:rough-dawn-85427948:br-synthetic-target", "test"],
  [
    url.replace("ep-synthetic-test.", "ep-synthetic-test-pooler."),
    manifest,
    "migrate:rough-dawn-85427948:br-synthetic-target",
    "production",
  ],
  [
    url.replace("neondb?", "wrong?"),
    manifest,
    "migrate:rough-dawn-85427948:br-synthetic-target",
    "production",
  ],
  [
    url.replace("sslmode=require", "sslmode=disable"),
    manifest,
    "migrate:rough-dawn-85427948:br-synthetic-target",
    "production",
  ],
  [
    "postgresql://school_test@localhost:55433/elementary_test_dev",
    manifest,
    "migrate:rough-dawn-85427948:br-synthetic-target",
    "production",
  ],
  [
    url,
    { ...manifest, projectId: "another-project" },
    "migrate:rough-dawn-85427948:br-synthetic-target",
    "production",
  ],
])(
  "release rejects mismatched metadata, environment, confirmation or connection",
  (connection, metadata, confirmation, environment) => {
    expect(() =>
      assertReleaseTarget(
        connection as string,
        metadata,
        "migrate",
        confirmation as string | undefined,
        environment as string,
      ),
    ).toThrow();
  },
);
