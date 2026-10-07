import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
  {
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "JSXAttribute[name.name='style']",
          message: "Gunakan className dan stylesheet, tanpa style inline.",
        },
        {
          selector:
            "JSXAttribute[name.name=/^on[A-Z]/] > JSXExpressionContainer > ArrowFunctionExpression",
          message: "Pisahkan event handler menjadi fungsi bernama.",
        },
        {
          selector:
            "JSXAttribute[name.name=/^on[A-Z]/] > JSXExpressionContainer > FunctionExpression",
          message: "Pisahkan event handler menjadi fungsi bernama.",
        },
        {
          selector: "MemberExpression[property.name='style'][computed=false]",
          message: "Atur presentasi melalui class dan stylesheet, tanpa mutasi style inline.",
        },
      ],
    },
  },
]);

export default eslintConfig;
