import path from "node:path";
import { writeFile } from "node:fs/promises";
import ts from "typescript";

type FnComplexity = {
  file: string;
  fn: string;
  line: number;
  complexity: number;
};

const targets = [
  "artifacts/api-server/src/lib/session-auth.ts",
  "artifacts/api-server/src/lib/platform-state.ts",
  "artifacts/api-server/src/lib/secret-store.ts",
  "artifacts/api-server/src/routes/tasks.ts",
  "artifacts/api-server/src/routes/providers.ts",
  "artifacts/api-server/src/routes/approvals.ts",
  "artifacts/api-server/src/app.ts",
];

function incrementForNode(node: ts.Node): number {
  if (
    ts.isIfStatement(node)
    || ts.isForStatement(node)
    || ts.isForInStatement(node)
    || ts.isForOfStatement(node)
    || ts.isWhileStatement(node)
    || ts.isDoStatement(node)
    || ts.isCaseClause(node)
    || ts.isConditionalExpression(node)
    || ts.isCatchClause(node)
  ) {
    return 1;
  }
  if (ts.isBinaryExpression(node)) {
    if (node.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken || node.operatorToken.kind === ts.SyntaxKind.BarBarToken) {
      return 1;
    }
  }
  return 0;
}

function functionName(node: ts.FunctionLikeDeclarationBase): string {
  if (ts.isFunctionDeclaration(node) && node.name) {
    return node.name.text;
  }
  if ((ts.isMethodDeclaration(node) || ts.isFunctionExpression(node) || ts.isArrowFunction(node)) && node.parent) {
    if (ts.isVariableDeclaration(node.parent) && ts.isIdentifier(node.parent.name)) {
      return node.parent.name.text;
    }
    if (ts.isPropertyAssignment(node.parent) && ts.isIdentifier(node.parent.name)) {
      return node.parent.name.text;
    }
    if (ts.isMethodDeclaration(node) && ts.isIdentifier(node.name)) {
      return node.name.text;
    }
  }
  return "<anonymous>";
}

function complexityOf(node: ts.FunctionLikeDeclarationBase): number {
  let complexity = 1;
  const visit = (child: ts.Node) => {
    complexity += incrementForNode(child);
    ts.forEachChild(child, visit);
  };
  if (node.body) {
    ts.forEachChild(node.body, visit);
  }
  return complexity;
}

async function main() {
  const root = process.cwd();
  const findings: FnComplexity[] = [];

  for (const rel of targets) {
    const abs = path.resolve(root, rel);
    const sourceText = ts.sys.readFile(abs);
    if (!sourceText) continue;
    const sourceFile = ts.createSourceFile(abs, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);

    const walk = (node: ts.Node) => {
      if (
        ts.isFunctionDeclaration(node)
        || ts.isMethodDeclaration(node)
        || ts.isFunctionExpression(node)
        || ts.isArrowFunction(node)
      ) {
        const line = sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1;
        findings.push({
          file: rel,
          fn: functionName(node),
          line,
          complexity: complexityOf(node),
        });
      }
      ts.forEachChild(node, walk);
    };

    walk(sourceFile);
  }

  findings.sort((a, b) => b.complexity - a.complexity || a.file.localeCompare(b.file));
  const top = findings.slice(0, 20);

  const md = [
    "# INTERNAL_STRUCTURE_MAP",
    "",
    "## Highest Cyclomatic Complexity Targets",
    "",
    "| Rank | Function | File | Line | Complexity |",
    "|---|---|---|---:|---:|",
    ...top.map((f, idx) => `| ${idx + 1} | ${f.fn} | ${f.file} | ${f.line} | ${f.complexity} |`),
    "",
    "## White-Box Priority Focus",
    "",
    ...top.slice(0, 8).map((f, idx) => `${idx + 1}. ${f.fn} in ${f.file}:${f.line} (complexity ${f.complexity})`),
    "",
  ].join("\n");

  const outPath = path.resolve(root, "scripts/src/whitebox/INTERNAL_STRUCTURE_MAP.md");
  await writeFile(outPath, `${md}\n`, "utf8");
  console.log(md);
}

await main();
