import fs from "node:fs";
import crypto from "node:crypto";
import path from "node:path";
import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";
import ts from "typescript";

const nonDrawingCanvasMarker = "data-aether-canvas-purpose";
const eventHandlerPattern = /^on[A-Z]/u;

// Import cycles (aether-app/no-import-cycle). A cycle between app modules is
// the one load-time failure every other gate admits: tsc has no notion of
// evaluation order across modules, Vite's default `onwarn` drops Rollup's
// CIRCULAR_DEPENDENCY warning, and both the dev server and the single-chunk
// publish bundle evaluate the cycle in ESM order, so when the module that runs
// first reads a `const`/`let`/class export of the other at load, the app dies
// with "Cannot access 'X' before initialization" (a minified name in the
// published bundle). Whether a given cycle reads early depends on the entry
// order and on what each module does at its top level, which no static pass
// settles, so every value-level cycle is rejected. The graph here is the one
// the bundler sees: static `import` / `export … from` / `import x = require()`
// edges and the static imports an eager `import.meta.glob` expands to (its
// `eager` folded as Vite's static evaluation folds it: `!0` is eager, `!1` is
// not, and a value not folded here reads as eager), resolved the way Vite
// resolves them, minus the edges esbuild erases — type-only
// imports, and in TypeScript files (`verbatimModuleSyntax` is off) an import
// whose bindings are used only as types or not at all.
//
// The app root is the nearest directory at or above the one ESLint runs from
// that holds `tsconfig.app.json` (template-owned, so every app snapshot has
// one) — the app directory under the gate's invocation, and what `eslint .`
// from inside the app walks up to — else the outermost such directory below
// the lint cwd on the way to the file (a workspace-root run), so neither a
// `package.json` nor a `tsconfig.app.json` an app places under `src/` moves
// it in a run from the app directory, from `src/` or from above the app (a
// run started from inside such a nested package directory is that package's
// own run and roots there; a directory that itself holds a `tsconfig.app.json`
// is an app root for a run from it), else the nearest directory above the
// file holding one; every walk up stops at the first `package.json` (the
// app's own package boundary, which roots an app that lost its
// `tsconfig.app.json`), so an ancestor's `tsconfig.app.json` never widens the
// app; else the directory ESLint runs from. The alias table is Vite's: `@/` is the
// root's `src/`, the one app-module alias the template-owned `vite.config.ts`
// declares (its other aliases name packages), and `tsconfig.app.json`'s `paths`
// is the same table spelled for tsc, not a second source. A root-relative
// `/src/…` specifier resolves against the app root as Vite serves it; a
// specifier's `?query` / `#hash` postfix is dropped before probing; an absolute
// path inside the app — spelled under the root, or under the root's real path
// when the root is a link, read back under the root — is probed as written,
// after the root-relative reading, as Vite probes it; a candidate outside the
// app root — by any spelling, the
// app's siblings that `..` from `src/` or `/` as a base would name with an
// extension included — is never probed, a module whose real path is outside
// the app (a link out of it) is no edge, an eager glob whose pattern climbs
// above the app root aborts the analysis naming the pattern (a negated one
// excludes nothing),
// and the glob walk enters no directory whose real path is outside the app,
// so the gate reads no module outside the app (a link's target is resolved
// before anything is read through it — metadata, not a module — and a
// faulting target aborts the gate naming the link). Except that
// Vite's asset queries (a bare `?raw`, `?url`, `?worker` or `?sharedworker`,
// as its asset and worker plugins match them over the whole specifier, so
// `?raw&#top` is one and `?raw=1` and `?raw#top` are modules) load the
// file as a string, a URL or a separate entry and are no edge.
//
// A finding is keyed by declaration, so an `import type` beside a value import
// of the same module is not named when that module closes a cycle. A
// filesystem fault other than a missing path aborts the analysis naming the
// path, so the gate fails instead of reading the module as import-free. A
// cycle with a member the app may edit under `src/` (the gate's lint scope)
// is reported on those members alone, never on a protected template file
// (`protectedTemplateFiles`, where a finding would send the agent into its
// protected-config STOP protocol); a cycle whose members are all protected,
// or whose only editable member sits outside `src/`, is reported on each
// protected member, so no cycle goes unreported (the template's own `src/` is
// cycle-free: the control tests in
// .aether-container-tests/import-cycle-eslint.test.ts). Not modelled:
// `import.meta.glob`'s `exhaustive` and `base` options, and with them a dot
// entry a pattern names explicitly; a glob option the rule cannot read (a
// computed key, a spread), which makes the glob eager and its files modules;
// an extglob group (`!(…)`, `+(…)`), a regex group (`(a|b)`, a postfix `+`,
// `?` or `*` included), a brace range (`{1..3}`), a nested brace, a brace
// group past the expansion budget, a
// brace alternative holding a `.` or `..` segment or a POSIX class
// (`[[:alpha:]]`) in a glob, each of which matches anything at any depth in
// an including pattern and nothing in a negated one; a segment holding more
// than four `*`, which matches any name in an including pattern and nothing
// in a negated one; and a pattern whose compiled matcher would hold more than
// four unbounded repetitions in all — `*`s, broadened groups and separated
// `**/`s together, adjacent ones counted once — which matches anything at any
// depth under its literal prefix in an including pattern and nothing in a
// negated one, so no compiled matcher backtracks through more than four
// unbounded repetitions (two capped segments in a row did not finish in sixty
// seconds in V8; six separated `**/`s over a sixty-deep chain took six); so
// such a glob's edges are a superset of Vite's (a brace group is read as
// picomatch reads it: a `**` inside an alternative spans any characters,
// separators included, with the segment's own `/` still required, and a `*`
// inside one stays its own wildcard beside a `*` of the pattern around it, so
// `{*,deep}*` is one segment); a directory
// holding a `package.json`, which resolves to its index where Vite resolves
// the package's entry; a relative import into a `node_modules` directory,
// which is never followed; a module matched through a link whose target sits
// under another parent (its relative imports resolve from the link path);
// and name shadowing (a local binding that reuses an imported name keeps the
// import edge).
//
// Vite's default `resolve.extensions`, in its order, so an extensionless
// specifier names the file Vite loads when two stems coexist (`.js` before
// `.ts`); `.json` resolves to a leaf, since a JSON module has no imports, and
// comes before a directory index as it does in Vite. `.cjs` and `.cts` are app
// sources the config lints, reached only when named in full.
const viteResolveExtensions = [".mjs", ".js", ".mts", ".ts", ".jsx", ".tsx", ".json"];
const appSourceExtensions = [".mjs", ".js", ".mts", ".ts", ".jsx", ".tsx", ".cjs", ".cts"];
const resolvableExtensions = new Set([...appSourceExtensions, ".json"]);
const typeScriptExtensions = new Set([".ts", ".tsx", ".mts", ".cts"]);
// Vite's TypeScript substitution for an explicit JavaScript-output suffix
// (`./x.js` naming `x.ts` under `moduleResolution: bundler`): suffix-specific,
// tried before the extension list.
const typeScriptSourcesFor = {
  ".js": [".ts", ".tsx"],
  ".jsx": [".tsx"],
  ".mjs": [".mts"],
  ".cjs": [".cts"],
};
// Vite's asset import queries, matched as its asset and worker plugins match
// them — `rawRE`, `urlRE` and `workerOrSharedWorkerRE` run over the whole id,
// postfix included: a bare key after `?` or `&`, then `&` or the end — so
// `?raw`, `?raw&v=1` and `?raw&#top` load the file as a string and `?raw=1`
// and `?raw#top` load a module. `?inline`, `?no-inline` and `?init` mark CSS,
// asset and wasm files, never a module here.
const assetImportKeys = ["raw", "url", "worker", "sharedworker"];
const assetImportQuery = new RegExp(`(?:\\?|&)(?:${assetImportKeys.join("|")})(?:&|$)`, "u");
// What the extension probe meets while trying candidates that are not there
// (EINVAL: a candidate holding a character the filesystem refuses in a name).
// Any other error (EACCES, EIO, ELOOP, …) is a fault the gate cannot read as
// "no imports"; `unreadable` turns it into an abort that names the path.
const expectedProbeErrors = new Set(["ENOENT", "ENOTDIR", "ENAMETOOLONG", "EINVAL"]);
// `vite.config.ts`'s `resolve.alias` entries that name app modules: `@` is the
// app's `src/`. An alias is matched before the specifier's postfix is split, as
// the alias plugin runs before Vite's resolver.
const viteAppAliases = [{ prefix: "@/", target: "src/" }];
// Each module's parse for one ESLint process — its import declarations and
// eager globs, the ones esbuild keeps — keyed by app root and path and reused
// while the file's content hash is unchanged (mtime and size would hand a
// long-lived process (an editor) a stale parse across a same-size, same-second
// rewrite). Its edges are resolved against the filesystem on every lookup —
// once per linted file, by the walker below — so a module created, deleted or
// shadowing another beside it is seen by the next lint of any file.
const moduleParseCache = new Map();

const unreadable = (filePath, error) =>
  new Error(
    `aether-app/no-import-cycle: cannot read ${filePath} (${error?.code ?? error}); the import graph cannot be judged without it`,
    { cause: error },
  );

const statIfPresent = (filePath) => {
  try {
    return fs.statSync(filePath);
  } catch (error) {
    if (expectedProbeErrors.has(error?.code)) return undefined;
    throw unreadable(filePath, error);
  }
};

// A module the resolver found a moment ago: only its disappearance since
// (ENOENT) reads as absent; any other error on the read — ENOTDIR, EINVAL, an
// I/O fault — is one the gate cannot read as "no imports".
const readIfPresent = (filePath) => {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch (error) {
    if (error?.code === "ENOENT") return undefined;
    throw unreadable(filePath, error);
  }
};

const toPosix = (filePath) => filePath.split(path.sep).join("/");

// A file the app may import: an app source under the app root, not under a
// `node_modules` directory of the app's own (the app may itself sit under
// one: the filter reads the path below the root).
const isAppModuleFile = (filePath, app) => {
  if (!resolvableExtensions.has(path.extname(filePath))) return false;
  if (path.relative(app.root, filePath).split(path.sep).includes("node_modules")) return false;
  return statIfPresent(filePath)?.isFile() === true;
};

// The real path of a path the probe just found: gone since (ENOENT) is
// absent, any other error a fault the gate names.
const realpathIfPresent = (filePath) => {
  try {
    return fs.realpathSync(filePath);
  } catch (error) {
    if (error?.code === "ENOENT") return undefined;
    throw unreadable(filePath, error);
  }
};

// Whether `filePath` lies under `root` (and is not `root` itself): the way
// down to it holds no `..` segment — a name that merely starts with two dots
// (`..shared.ts`) is a descendant.
const isWithin = (root, filePath) => {
  const below = path.relative(root, filePath);
  return below !== "" && below !== ".." && !below.startsWith(`..${path.sep}`) && !path.isAbsolute(below);
};

const isRelativeSpecifier = (specifier) =>
  specifier === "." ||
  specifier === ".." ||
  specifier.startsWith("./") ||
  specifier.startsWith("../");

// The app root for a linted file: looked up once per linted file, reused by
// the graph walk and part of the parse cache's key. The nearest holder of
// `tsconfig.app.json` at or above the lint cwd, else the outermost one below
// it on the way to the file, is the root (the app directory under the gate's
// invocation, from inside the app and from a workspace root alike), so a
// `tsconfig.app.json` an app drops under `src/` cannot re-root it.
const appContextFor = (filePath, cwd) => {
  const here = path.resolve(cwd);
  const holds = (dir) => statIfPresent(path.join(dir, "tsconfig.app.json"))?.isFile() === true;
  // The app's own package boundary: a walk up never passes it, so an
  // ancestor's `tsconfig.app.json` cannot root (and widen) an app that lost
  // its own; that app is rooted here.
  const bounds = (dir) => statIfPresent(path.join(dir, "package.json"))?.isFile() === true;
  // The root, its real path (the boundary a link cannot cross) and `src/`.
  const context = (root) => ({ root, realRoot: realpathIfPresent(root) ?? root, src: path.join(root, "src") });
  if (isWithin(here, filePath)) {
    // The nearest holder at or above the lint cwd: the app directory under the
    // gate, and `eslint .` from inside the app walks up to it.
    for (let dir = here; ; dir = path.dirname(dir)) {
      if (holds(dir)) return context(dir);
      if (bounds(dir) || path.dirname(dir) === dir) break;
    }
    // Else the outermost holder below the cwd on the way to the file: a
    // workspace-root run, where a nested one under `src/` loses to the app's;
    // else the outermost package boundary there.
    const ancestors = [];
    for (let dir = path.dirname(filePath); dir !== here && path.dirname(dir) !== dir; dir = path.dirname(dir)) {
      ancestors.push(dir);
    }
    ancestors.reverse();
    const outermost = ancestors.find(holds) ?? ancestors.find(bounds);
    if (outermost) return context(outermost);
  }
  for (let dir = path.dirname(filePath); ; dir = path.dirname(dir)) {
    if (holds(dir)) return context(dir);
    if (bounds(dir)) return context(dir);
    if (path.dirname(dir) === dir) return context(here);
  }
};

// A specifier's file part, as Vite's `cleanUrl` splits it: `./b.js?v=1#top`
// names b.js.
const specifierFile = (specifier) => specifier.replace(/[?#].*$/su, "");

// Whether a specifier, postfix included, is an asset import to Vite:
// `./w?worker` names no module edge.
const isAssetImport = (specifier) => assetImportQuery.test(specifier);

// The file `base` names in Vite's probe order: the exact path, the TypeScript
// sources an explicit JavaScript suffix may stand for, the extension list, then
// a directory index. A candidate outside `root` is never probed: what a
// climbing specifier names (`/../x`, `../../../x`), and the app's siblings
// (`<app>.ts`) that the root itself as a base (`..` from `src/`, or `/`) would
// otherwise be tried as before its index. A file under `node_modules` is never
// followed.
const resolveFile = (base, app) => {
  const candidates = [base];
  const extension = path.extname(base);
  const stem = base.slice(0, base.length - extension.length);
  for (const ext of typeScriptSourcesFor[extension] ?? []) candidates.push(stem + ext);
  for (const ext of viteResolveExtensions) candidates.push(base + ext);
  for (const ext of viteResolveExtensions) candidates.push(path.join(base, `index${ext}`));
  return candidates.filter((candidate) => isWithin(app.root, candidate)).find((candidate) => isAppModuleFile(candidate, app));
};

// The paths an alias maps a specifier to; an asset query behind the alias is
// no edge.
const aliasBases = (specifier, app) => {
  const bases = [];
  for (const alias of viteAppAliases) {
    // The alias plugin matches the bare name (`@`, the `src/` index) as well
    // as the prefix; a postfix on the bare name matches nothing.
    if (specifier === alias.prefix.slice(0, -1)) {
      bases.push(path.resolve(app.root, alias.target));
      continue;
    }
    if (!specifier.startsWith(alias.prefix)) continue;
    if (isAssetImport(specifier)) return [];
    const file = specifierFile(specifier.slice(alias.prefix.length));
    // The remainder is a path under the alias's directory however many
    // separators follow the alias (`@//lib/b` is `src/lib/b`, as Vite's
    // replacement reads it), never an absolute path of its own.
    bases.push(path.resolve(app.root, alias.target, file.replace(/^\/+/u, "")));
  }
  return bases;
};

// The app module a specifier names from `importerPath`, or undefined for a
// package, an asset or a path that is not an app source.
const resolveAppModule = (specifier, importerPath, app) => {
  let bases = aliasBases(specifier, app);
  if (bases.length === 0) {
    if (isAssetImport(specifier)) return undefined;
    const file = specifierFile(specifier);
    if (file.startsWith("/") || path.isAbsolute(file)) {
      // Vite's order: `/x` under the app root first, then the absolute path as
      // written; a module outside the app is no edge.
      if (file.startsWith("/")) bases.push(path.resolve(app.root, file.slice(1)));
      if (path.isAbsolute(file)) {
        const absolute = path.resolve(file);
        if (absolute === app.root || isWithin(app.root, absolute)) {
          bases.push(absolute);
        } else if (absolute === app.realRoot || isWithin(app.realRoot, absolute)) {
          // Spelled through the root's real path (a linked root): read back
          // under the root, so the module's identity is the root's spelling.
          bases.push(path.join(app.root, path.relative(app.realRoot, absolute)));
        }
      }
    } else if (isRelativeSpecifier(file)) {
      bases = [path.resolve(path.dirname(importerPath), file)];
    }
  }
  // Each base's candidates are probed inside the app root alone (the root
  // itself may be a base: `..` from `src/` names its index). A module found
  // through a link out of the app is no edge.
  for (const base of bases) {
    const found = resolveFile(base, app);
    const real = found && realpathIfPresent(found);
    if (real && isWithin(app.realRoot, real)) return found;
  }
  return undefined;
};

const isJsxElementOrFragment = (node) =>
  node !== undefined && (ts.isJsxElement(node) || ts.isJsxFragment(node));

// Whether trivia can follow a token: in a JSX file, what follows the `>` of an
// opening tag or the `}` of an expression child is JSX text, not trivia
// (ts-api-utils' `canHaveTrailingTrivia`, which typescript-eslint's comment
// collection applies).
const trailingTriviaFollows = (token) => {
  const { parent } = token;
  switch (token.kind) {
    case ts.SyntaxKind.CloseBraceToken:
      return !ts.isJsxExpression(parent) || !isJsxElementOrFragment(parent.parent);
    case ts.SyntaxKind.GreaterThanToken:
      switch (parent.kind) {
        case ts.SyntaxKind.JsxOpeningElement:
          return token.end !== parent.end;
        case ts.SyntaxKind.JsxOpeningFragment:
          return false;
        case ts.SyntaxKind.JsxSelfClosingElement:
          return token.end !== parent.end || !isJsxElementOrFragment(parent.parent);
        case ts.SyntaxKind.JsxClosingElement:
        case ts.SyntaxKind.JsxClosingFragment:
          return !isJsxElementOrFragment(parent.parent.parent);
        default:
          return true;
      }
    default:
      return true;
  }
};

// Every comment in the file, read off the parsed tree's tokens the way
// typescript-eslint collects them (ts-api-utils' `forEachComment`): the leading
// trivia of every token and the trailing trivia of those a JSX child cannot
// follow. A `/` inside a regex, a template or JSX text is never a comment here.
const commentTexts = (sourceFile) => {
  const { text } = sourceFile;
  const jsx = sourceFile.languageVariant === ts.LanguageVariant.JSX;
  const comments = new Map();
  // The callback returns nothing: a truthy return ends the range walk early.
  const collect = (pos, end) => {
    comments.set(pos, text.slice(pos, end));
  };
  const visit = (node) => {
    if (ts.isJSDoc(node)) return;
    if (ts.isTokenKind(node.kind)) {
      if (node.pos === node.end) return;
      if (node.kind !== ts.SyntaxKind.JsxText) ts.forEachLeadingCommentRange(text, node.pos, collect);
      if (!jsx || trailingTriviaFollows(node)) ts.forEachTrailingCommentRange(text, node.end, collect);
      return;
    }
    for (const child of node.getChildren(sourceFile)) visit(child);
  };
  visit(sourceFile);
  return [...comments.values()];
};

// The `@jsxRuntime` / `@jsx` / `@jsxFrag` pragmas esbuild reads from any
// comment in the file (its lexer checks every comment, the last wins, and an
// argument runs to the next whitespace with the comment's `*/` excluded). The
// template compiles with `react-jsx`, so a file switches to the classic
// runtime only through `@jsxRuntime classic`; there esbuild lowers a JSX
// element to the factory (`React.createElement` unless `@jsx` names another)
// and a fragment to the factory applied to the fragment factory
// (`React.Fragment` unless `@jsxFrag` does), and the root identifier of each is
// a value reference where that JSX appears; a factory is a dotted chain of
// identifiers to esbuild, and one it cannot read (`@jsx 1bad`, `@jsx h.1bad`)
// is a warning there and the default stands. Returns {factory, fragment}
// roots under the classic runtime, else undefined.
const classicJsxFactoryRoots = (sourceFile) => {
  if (!sourceFile.text.includes("@jsx")) return undefined;
  let classic = false;
  let factory = "React.createElement";
  let fragment = "React.Fragment";
  for (const comment of commentTexts(sourceFile)) {
    const body = comment.startsWith("//")
      ? comment.slice(2)
      : comment.slice(2, comment.endsWith("*/") ? -2 : undefined);
    // Within one comment as across comments, the last pragma wins.
    const last = (pattern) => [...body.matchAll(pattern)].at(-1);
    const runtime = last(/@jsxRuntime\s+(\S+)/gu);
    if (runtime) classic = runtime[1] === "classic";
    const jsx = last(/@jsx\s+(\S+)/gu);
    if (jsx) factory = jsx[1];
    const frag = last(/@jsxFrag\s+(\S+)/gu);
    if (frag) fragment = frag[1];
  }
  if (!classic) return undefined;
  const root = (name, fallback) => {
    const parts = name.split(".");
    return parts.every((part) => ts.isIdentifierText(part, ts.ScriptTarget.Latest)) ? parts[0] : fallback;
  };
  return { factory: root(factory, "React"), fragment: root(fragment, "React") };
};

// Every identifier that can reference a binding in a value position, so an
// import whose bindings never appear here is one esbuild erases. Names that
// cannot reference a binding stay out — non-computed property, member and JSX
// attribute names, `import` clauses, `export … from` clauses, type positions
// and `implements` clauses — while `export { x }`, `extends`, decorators,
// instantiation expressions (`make<number>`, which TypeScript files as a type
// node), the root of an `import x = N.y` alias and, under the classic JSX
// runtime, the factory roots count where JSX appears. Shadowing is not
// modelled, so a name a local binding reuses still keeps its import edge: the
// one error this scan makes is to keep an edge esbuild would drop.
const valueIdentifierNames = (sourceFile, classic) => {
  const names = new Set();
  const visit = (node) => {
    if (ts.isExpressionWithTypeArguments(node)) {
      visit(node.expression);
      return;
    }
    if (
      ts.isTypeNode(node) ||
      ts.isInterfaceDeclaration(node) ||
      ts.isTypeAliasDeclaration(node) ||
      ts.isImportDeclaration(node)
    ) {
      return;
    }
    if (ts.isImportEqualsDeclaration(node)) {
      // `import x = require("./y")` names no value; `import x = N.y` reads `N`
      // (the root of the entity name), the reference esbuild keeps when `x` is
      // used — whether `x` is used is not modelled, the error direction this
      // scan allows.
      if (!node.isTypeOnly && !ts.isExternalModuleReference(node.moduleReference)) {
        let reference = node.moduleReference;
        while (ts.isQualifiedName(reference)) reference = reference.left;
        names.add(reference.text);
      }
      return;
    }
    if (ts.isExportDeclaration(node)) {
      const clause = node.exportClause;
      if (!node.moduleSpecifier && !node.isTypeOnly && clause && ts.isNamedExports(clause)) {
        for (const element of clause.elements) {
          if (!element.isTypeOnly) names.add((element.propertyName ?? element.name).text);
        }
      }
      return;
    }
    if (ts.isClassDeclaration(node) || ts.isClassExpression(node)) {
      // Decorators and `extends B` are value references even though TypeScript
      // files the heritage clause as a type; `implements` is not.
      for (const decorator of ts.getDecorators(node) ?? []) visit(decorator.expression);
      for (const clause of node.heritageClauses ?? []) {
        if (clause.token === ts.SyntaxKind.ExtendsKeyword) {
          clause.types.forEach((type) => visit(type.expression));
        }
      }
      node.members.forEach(visit);
      return;
    }
    if (ts.isPropertyAccessExpression(node)) {
      visit(node.expression);
      return;
    }
    if (ts.isJsxAttribute(node)) {
      if (node.initializer) visit(node.initializer);
      return;
    }
    if (classic && (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node) || ts.isJsxFragment(node))) {
      if (classic.factory) names.add(classic.factory);
      if (classic.fragment && ts.isJsxFragment(node)) names.add(classic.fragment);
    }
    if (
      (ts.isPropertyAssignment(node) ||
        ts.isPropertyDeclaration(node) ||
        ts.isMethodDeclaration(node) ||
        ts.isGetAccessorDeclaration(node) ||
        ts.isSetAccessorDeclaration(node) ||
        ts.isEnumMember(node)) &&
      !ts.isComputedPropertyName(node.name)
    ) {
      ts.forEachChild(node, (child) => {
        if (child !== node.name) visit(child);
      });
      return;
    }
    if (ts.isIdentifier(node)) {
      names.add(node.text);
      return;
    }
    ts.forEachChild(node, visit);
  };
  ts.forEachChild(sourceFile, visit);
  return names;
};

const isImportMetaGlob = (node) =>
  ts.isCallExpression(node) &&
  ts.isPropertyAccessExpression(node.expression) &&
  node.expression.name.text === "glob" &&
  ts.isMetaProperty(node.expression.expression) &&
  node.expression.expression.keywordToken === ts.SyntaxKind.ImportKeyword &&
  node.expression.expression.name.text === "meta";

const isStringLike = (node) => ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node);

// The expression under the parentheses and TypeScript assertions esbuild
// erases (`(true)`, `true as const`, `x!`).
const unwrap = (node) => {
  let current = node;
  while (
    current &&
    (ts.isParenthesizedExpression(current) ||
      ts.isAsExpression(current) ||
      ts.isSatisfiesExpression(current) ||
      ts.isTypeAssertionExpression(current) ||
      ts.isNonNullExpression(current))
  ) {
    current = current.expression;
  }
  return current;
};

const propertyKey = (property) =>
  ts.isPropertyAssignment(property) &&
  (ts.isIdentifier(property.name) || ts.isStringLiteral(property.name))
    ? property.name.text
    : undefined;

// Whether a glob's `query` (or legacy `as`) option names an asset load: a
// string is the query itself (`"?raw"`, `"raw"`); an object is serialised by
// Vite's `stringifyQuery`, where `{ raw: "" }` is the bare `?raw` and
// `{ raw: true }` is `?raw=true`, a module.
const isAssetGlobQuery = (value) => {
  // Vite prefixes the `?` a string query lacks before it joins the import.
  if (isStringLike(value)) return isAssetImport(value.text.startsWith("?") ? value.text : `?${value.text}`);
  if (!ts.isObjectLiteralExpression(value)) return false;
  // The last value of a repeated key is the one evaluated (`{ raw: "", raw:
  // true }` is `?raw=true`); a property the rule cannot read (a computed key,
  // a spread) may override what came before it, which is then unknown — a
  // module, the superset.
  const entries = new Map();
  for (const entry of value.properties) {
    const key = propertyKey(entry);
    if (key === undefined) entries.clear();
    else entries.set(key, unwrap(entry.initializer));
  }
  return assetImportKeys.some((key) => {
    const entryValue = entries.get(key);
    return entryValue !== undefined && isStringLike(entryValue) && entryValue.text === "";
  });
};

// The boolean a static `eager` value folds to, as Vite's `evalValue` evaluates
// the options object (`!0` is `true`, `!1` is `false`), or undefined for a
// value not folded here. An unfolded value reads as eager: Vite accepts any
// expression that yields a boolean and refuses the rest, so the edges are a
// superset of Vite's, never fewer.
const staticBoolean = (node) => {
  const value = unwrap(node);
  if (value.kind === ts.SyntaxKind.TrueKeyword) return true;
  if (value.kind === ts.SyntaxKind.FalseKeyword) return false;
  if (ts.isPrefixUnaryExpression(value) && value.operator === ts.SyntaxKind.ExclamationToken) {
    const operand = staticBoolean(value.operand);
    return operand === undefined ? undefined : !operand;
  }
  if (ts.isNumericLiteral(value)) return Number(value.text) !== 0;
  if (isStringLike(value)) return value.text !== "";
  return undefined;
};

// Every `import.meta.glob(patterns, { eager: true })` call in the file: Vite
// hoists an eager glob into one static import per match, so each is an edge of
// this module. A lazy glob (`eager` absent or folding to `false`) is a dynamic
// import and no edge, as is an eager glob whose `query` (or legacy `as`) names
// an asset load; a pattern that is not a string literal is a Vite error and
// contributes nothing.
const eagerGlobCalls = (sourceFile) => {
  const calls = [];
  const visit = (node) => {
    if (isImportMetaGlob(node) && node.arguments.length > 0) {
      let eager = false;
      let asset = false;
      const options = unwrap(node.arguments[1]);
      if (options && ts.isObjectLiteralExpression(options)) {
        for (const property of options.properties) {
          const key = propertyKey(property);
          if (key === "eager") {
            eager = staticBoolean(property.initializer) ?? true;
          } else if (key === "query" || key === "as") {
            asset = isAssetGlobQuery(unwrap(property.initializer));
          } else if (key === undefined) {
            // A property the rule cannot read (a computed key, a spread, a
            // shorthand) may set `eager` or the query, as Vite's `evalValue`
            // reads the whole object: the glob is eager and its files are
            // modules from here — a superset — until a later property says
            // otherwise.
            eager = true;
            asset = false;
          }
        }
      }
      const first = unwrap(node.arguments[0]);
      const patterns = isStringLike(first)
        ? [first.text]
        : ts.isArrayLiteralExpression(first)
          ? first.elements.map(unwrap).filter(isStringLike).map((element) => element.text)
          : [];
      if (eager && !asset && patterns.length > 0) calls.push({ node, patterns });
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return calls;
};

// Glob syntax, as the compiler and the walk prefix read it: `\x` is the
// character x; `**` as a whole segment spans directories and inside a segment
// is a `*`; a class runs to its `]`, a leading `]` and a POSIX `[:alpha:]`
// inside it included; a brace group or an extglob group runs to its matching
// closer, classes and escapes skipped.
const classEnd = (glob, open) => {
  let i = open + 1;
  if (glob[i] === "!" || glob[i] === "^") i += 1;
  if (glob[i] === "]") i += 1;
  for (; i < glob.length; i += 1) {
    if (glob[i] === "\\") i += 1;
    else if (glob[i] === "[" && glob[i + 1] === ":") {
      const end = glob.indexOf(":]", i + 2);
      if (end === -1) return -1;
      i = end + 1;
    } else if (glob[i] === "]") return i;
  }
  return -1;
};

// The index of the `right` closing the `left` at `open`, nesting counted, or -1.
const closingDelimiter = (glob, open, left, right) => {
  let depth = 0;
  for (let i = open; i < glob.length; i += 1) {
    const ch = glob[i];
    if (ch === "\\") {
      i += 1;
    } else if (ch === "[" && classEnd(glob, i) !== -1) {
      i = classEnd(glob, i);
    } else if (ch === left) {
      depth += 1;
    } else if (ch === right && (depth -= 1) === 0) {
      return i;
    }
  }
  return -1;
};

const isExtglobOpener = (glob, i) => "?*+@!".includes(glob[i]) && glob[i + 1] === "(";

// The index of the `)` closing the parenthesised group that starts at `i` — an
// extglob group (`@(…)`) or a bare regex group (`(a|b)`), which picomatch reads
// as one — or -1 when none starts there.
const groupClose = (glob, i) => {
  const open = isExtglobOpener(glob, i) ? i + 1 : glob[i] === "(" ? i : -1;
  return open === -1 ? -1 : closingDelimiter(glob, open, "(", ")");
};

// Whether `**` at `i` is a whole segment: at the start or after `/`, and at
// the end or before `/`.
const isGlobstar = (glob, i) =>
  glob[i] === "*" &&
  glob[i + 1] === "*" &&
  (i === 0 || glob[i - 1] === "/") &&
  (i + 2 === glob.length || glob[i + 2] === "/");

// The alternatives of a brace body, split on the commas outside any class.
const alternatives = (body) => {
  const parts = [];
  let start = 0;
  for (let i = 0; i < body.length; i += 1) {
    if (body[i] === "\\") i += 1;
    else if (body[i] === "[" && classEnd(body, i) !== -1) i = classEnd(body, i);
    else if (groupClose(body, i) !== -1) i = groupClose(body, i);
    else if (body[i] === ",") {
      parts.push(body.slice(start, i));
      start = i + 1;
    }
  }
  parts.push(body.slice(start));
  return parts;
};

// Matchers are compiled without the `u` flag, as picomatch compiles its own,
// so `?` and a class consume one UTF-16 code unit and an astral name is two.
const compiles = (source) => {
  try {
    new RegExp(source);
    return true;
  } catch {
    return false;
  }
};

const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");

// A class's regular expression from its glob body (the text between the
// brackets): `!` or `^` first negates, an escape (`[\-a]`, `[\]]`, `[\d]`)
// stays one as picomatch keeps it, and a bracket inside the body — the
// leading `]` a class may hold, a `[` — is the character, never syntax, so
// no body spells a group or a quantifier into the matcher (`[!]a(a+)+[x]`
// once compiled to `[^]a(a+)+[x]`, a nested quantifier). A POSIX class
// (`[[:alpha:]]`) is not modelled: undefined, which the compiler broadens.
const classSource = (body) => {
  if (/\[:[^\]]*:\]/u.test(body)) return undefined;
  const negated = body.startsWith("!") || body.startsWith("^");
  const rest = negated ? body.slice(1) : body;
  let source = "";
  for (let i = 0; i < rest.length; i += 1) {
    const ch = rest[i];
    if (ch === "\\" && i + 1 < rest.length) {
      source += rest.slice(i, i + 2);
      i += 1;
    } else {
      source += ch === "[" || ch === "]" ? `\\${ch}` : ch;
    }
  }
  return `(?!/)[${negated ? "^" : ""}${source}]`;
};

// The most `*` one segment of a compiled pattern holds: past it the segment
// matches any name in an including pattern (any characters, separators
// included, when it already held a `.*`) and the pattern nothing in a
// negated one (a superset either way), so no matcher backtracks through more
// than this many wildcards in one segment (`*a` twenty times over a long name
// of `a`s is a polynomial of degree twenty otherwise: eight of them over sixty
// characters run past fifteen seconds in V8).
const segmentWildcardCap = 4;

// A glob's regular expression over POSIX paths: a whole-segment `**` spans
// segments, `*` and `?` stay inside one, `[…]` is a class (negated or not, it
// never matches `/`, and a bracket inside its body is the character, never
// syntax), and a brace group was expanded away by `expandBraces`
// before this ran, its stars marked. An extglob group (`!(…)`, `+(…)`,
// `@(…)`, `?(…)`, `*(…)`), a brace range (`{1..3}`), a nested brace and a class
// the regex engine refuses (`[z-a]`, a POSIX `[[:alpha:]]`) are not modelled:
// in an including pattern they match anything at any depth and in a negated
// one nothing, so the edges are more than Vite's, never fewer; a segment past
// the wildcard cap matches any name the same way. A bracket
// without its partner is the character. `state.unbounded` records whether the
// matches may sit at more than one depth (a globstar anywhere, a broadened
// group), which is what bounds the walk, so the walk and the matcher agree;
// `state.repetitions` counts the unbounded repetitions the source holds (a
// `[^/]*`, a `.*`, a `(?:[^/]*/)*`; a run of adjacent ones is one), which
// `compileGlob` bounds.
const globSource = (glob, negated, state) => {
  let source = "";
  // The segment being compiled: where it starts in `source`, how many `*` it
  // holds so far, how many unbounded repetitions it emitted and whether it
  // already spans separators (a `.*`); past the cap the whole segment is
  // rewritten and the rest of it is passed over.
  let segmentStart = 0;
  let wildcards = 0;
  let repetitions = 0;
  let broadSegment = false;
  let capped = false;
  const emit = (text) => {
    if (!capped) source += text;
  };
  const closeSegment = () => {
    state.repetitions += repetitions;
    repetitions = 0;
    capped = false;
    broadSegment = false;
    wildcards = 0;
  };
  const separator = () => {
    closeSegment();
    source += "/";
    segmentStart = source.length;
  };
  // Any characters inside the segment; two in a row are one, and past the cap
  // the segment is any name — any characters at any depth when it already
  // spans separators — and nothing when negated.
  const wildcard = () => {
    if (capped) return;
    wildcards += 1;
    if (wildcards > segmentWildcardCap) {
      const any = broadSegment ? ".*" : "[^/]*";
      source = source.slice(0, segmentStart) + (negated ? "(?!)" : any);
      repetitions = negated ? 0 : 1;
      capped = true;
    } else if (!source.endsWith("[^/]*")) {
      source += "[^/]*";
      repetitions += 1;
    }
  };
  // Anything at any depth; two in a row are one (a run of `.*.*…` backtracks
  // exponentially on every path that does not match), and in a capped segment
  // it stands for the segment.
  const anyDepth = () => {
    state.unbounded = true;
    broadSegment = true;
    if (capped) {
      if (!negated) {
        source = `${source.slice(0, segmentStart)}.*`;
        repetitions = 1;
      }
    } else if (!source.endsWith(".*")) {
      source += ".*";
      repetitions += 1;
    }
  };
  const broad = () => {
    if (negated) emit("(?!)");
    else anyDepth();
  };
  for (let i = 0; i < glob.length; i += 1) {
    const ch = glob[i];
    if (ch === "\\" && i + 1 < glob.length) {
      i += 1;
      emit(escapeRegExp(glob[i]));
    } else if (groupClose(glob, i) !== -1) {
      // An extglob group, or a bare regex group (`(a|b)`), which picomatch
      // reads as one, its postfix quantifier (`(a|b)+`, `?`, `*`) included:
      // not modelled, a broadened group.
      const bare = ch === "(";
      broad();
      i = groupClose(glob, i);
      const next = glob[i + 1];
      if (bare && (next === "+" || next === "?" || next === "*")) i += 1;
    } else if (isGlobstar(glob, i)) {
      state.unbounded = true;
      i += 1;
      if (glob[i + 1] === "/") {
        i += 1;
        while (glob.startsWith("**/", i + 1)) i += 3;
        closeSegment();
        source += "(?:[^/]*/)*";
        state.repetitions += 1;
        segmentStart = source.length;
      } else {
        anyDepth();
      }
    } else if (ch === groupStar) {
      // A `**` from inside a brace alternative, as picomatch reads it: any
      // characters, separators included, so the matches may sit at any depth.
      anyDepth();
    } else if (ch === "*" || ch === groupWildcard) {
      wildcard();
    } else if (ch === "/") {
      separator();
    } else if (ch === "?") {
      emit("[^/]");
    } else if (ch === "[" && classEnd(glob, i) !== -1) {
      const close = classEnd(glob, i);
      // A body the engine refuses (`[z-a]`) matches as a broadened group does.
      const cls = classSource(glob.slice(i + 1, close));
      if (cls !== undefined && compiles(cls)) emit(cls);
      else broad();
      i = close;
    } else if (ch === "{" && closingDelimiter(glob, i, "{", "}") !== -1) {
      const close = closingDelimiter(glob, i, "{", "}");
      if (braceKind(glob.slice(i + 1, close)) === "literal") {
        // `{one}`: the characters, as picomatch reads them.
        emit("\\{");
      } else {
        // A group `expandBraces` left in place: a nested one, a range or an
        // alternation past the budget.
        broad();
        i = close;
      }
    } else {
      emit(ch.replace(/[.+^${}()|[\]\\]/u, "\\$&"));
    }
  }
  closeSegment();
  return source;
};

// What a brace group means to picomatch (Vite's matcher): one with a
// top-level comma alternates; one with neither a comma nor a range (`{one}`)
// is the literal characters; a range (`{1..3}`) or a nested group is not
// modelled and matches as a broadened group does.
const braceKind = (body) => {
  if (body.includes("{") || /^[^,]*\.\.[^,]*$/u.test(body)) return "broad";
  return alternatives(body).length > 1 ? "alternation" : "literal";
};

// The most whole patterns a glob's brace groups expand into before the
// remaining groups are left to broaden (a superset, never fewer edges), so a
// pattern of many groups cannot stall the gate on their product.
const braceExpansionBudget = 64;

// The first alternating brace group of `glob` as {open, close, body}, or
// undefined; a group of another kind is passed over.
const firstAlternation = (glob) => {
  for (let i = 0; i < glob.length; i += 1) {
    const ch = glob[i];
    if (ch === "\\") {
      i += 1;
    } else if (ch === "[" && classEnd(glob, i) !== -1) {
      i = classEnd(glob, i);
    } else if (groupClose(glob, i) !== -1) {
      i = groupClose(glob, i);
    } else if (ch === "{" && closingDelimiter(glob, i, "{", "}") !== -1) {
      const close = closingDelimiter(glob, i, "{", "}");
      const body = glob.slice(i + 1, close);
      if (braceKind(body) === "alternation") return { open: i, close, body };
      i = close;
    }
  }
  return undefined;
};

// The marks a `*` inside a brace alternative carries through expansion
// (characters no glob holds; one that does is escaped first): a run of two or
// more is `groupStar`, one is `groupWildcard`, so a `*` spliced beside a `*`
// of the pattern around it never reads as a `**` the alternative did not hold
// (`{*,deep}*` stays one segment, as picomatch reads it). An escape and a
// class inside the alternative are copied as they are; the `*` that opens an
// extglob (`*(one)`) is marked like any other, and the group behind it is
// broadened by the compiler as a bare `(…)` is.
const groupStar = "\u0001";
const groupWildcard = "\u0002";
const markGroupStars = (part) => {
  let marked = "";
  for (let i = 0; i < part.length; i += 1) {
    const ch = part[i];
    if (ch === "\\" && i + 1 < part.length) {
      marked += part.slice(i, i + 2);
      i += 1;
    } else if (ch === "[" && classEnd(part, i) !== -1) {
      marked += part.slice(i, classEnd(part, i) + 1);
      i = classEnd(part, i);
    } else if (ch === "*") {
      let end = i;
      while (part[end] === "*") end += 1;
      marked += end - i > 1 ? groupStar : groupWildcard;
      i = end - 1;
    } else {
      marked += ch;
    }
  }
  return marked;
};

// The patterns a glob's alternating brace groups expand into, each
// alternative spliced into the whole pattern with its stars marked. A `**`
// inside an alternative keeps picomatch's reading of an in-group `**` — any
// characters, separators included, with the segment's own `/` still required
// — not a whole-segment globstar's, so `{**,deep}/one.ts` names `deep/one.ts`
// and `a/b/one.ts` and never `one.ts`; a `*` inside one never joins a `*`
// beside the group into a globstar, so `{*,deep}*/one.ts` names `a/one.ts`
// and `deep/one.ts` and never `one.ts` or `a/b/one.ts` — in an including and
// a negated pattern alike. Expansion stops at the budget, the remaining
// groups left in place for the compiler to broaden.
const expandBraces = (glob) => {
  let patterns = [[groupStar, groupWildcard].reduce((text, mark) => text.split(mark).join(`\\${mark}`), glob)];
  for (;;) {
    const next = [];
    let expanded = false;
    for (const pattern of patterns) {
      const group = firstAlternation(pattern);
      if (!group) {
        next.push(pattern);
        continue;
      }
      expanded = true;
      const head = pattern.slice(0, group.open);
      const tail = pattern.slice(group.close + 1);
      for (const part of alternatives(group.body)) next.push(head + markGroupStars(part) + tail);
    }
    if (!expanded || next.length > braceExpansionBudget) return patterns;
    patterns = next;
  }
};

// The most unbounded repetitions one compiled pattern holds — its `[^/]*`s,
// `.*`s and `(?:[^/]*/)*`s together, a run of adjacent ones counted once:
// past it the pattern matches anything at any depth under its literal prefix
// in an including pattern and nothing in a negated one (a superset either
// way), so no matcher backtracks through more than this many, however they
// are spread over segments (two four-`*` segments in a row did not finish in
// sixty seconds in V8, where any four repetitions in all finish in under half
// a second; six separated `**/`s over a sixty-deep chain took six seconds).
const matcherRepetitionCap = 4;

// A glob compiled once: its regular-expression source (its brace alternatives
// expanded, each compiled whole) and whether its matches may sit at more than
// one depth. An expanded alternative holding a `.` or `..` segment
// (`{a,../b}`, which Vite's join folds before the braces expand and picomatch
// then reads its own way) is not modelled: it matches anything at any depth
// under the literal prefix in an including pattern and nothing in a negated
// one, as a pattern past the repetition cap does.
const compileGlob = (glob, negated = false) => {
  const state = { unbounded: false, repetitions: 0 };
  const sources = expandBraces(glob).map((pattern) => {
    state.repetitions = 0;
    const dotSegment = pattern.split("/").some((segment) => segment === "." || segment === "..");
    const source = dotSegment ? undefined : globSource(pattern, negated, state);
    if (source !== undefined && state.repetitions <= matcherRepetitionCap) return source;
    if (negated) return "(?!)";
    state.unbounded = true;
    return ".*";
  });
  return { source: sources.length === 1 ? sources[0] : `(?:${sources.join("|")})`, unbounded: state.unbounded };
};

// Vite's `toAbsoluteGlob`: `/` is the app root, `./` and `../` the importer's
// directory, a `**`-led pattern the root, anything else an alias; `!` negates.
// The literal directory the pattern starts from (`base`) stays apart from the
// glob, as Vite's `globSafePath` escapes it, so a `[id]` or `{a}` directory on
// the way is a name, not a pattern; `.` and `..` segments anywhere in the
// pattern fold as its `posix.join` folds them. A pattern that climbs above the
// app root aborts the analysis when it includes (the gate reads nothing
// outside the app) and is dropped when it excludes (it excludes nothing).
const absoluteGlob = (pattern, importerPath, app) => {
  const negated = pattern.startsWith("!");
  let glob = negated ? pattern.slice(1) : pattern;
  let base;
  if (glob.startsWith("/")) {
    base = toPosix(app.root);
    glob = glob.slice(1);
  } else if (glob.startsWith("./") || glob.startsWith("../")) {
    base = toPosix(path.dirname(importerPath));
  } else if (glob.startsWith("**")) {
    base = toPosix(app.root);
  } else {
    const alias = viteAppAliases.find((entry) => glob.startsWith(entry.prefix));
    if (!alias) return undefined;
    base = toPosix(path.resolve(app.root, alias.target));
    // The remainder is a path under the alias's directory however many
    // separators follow the alias (`@//lib/*.ts` is `src/lib/*.ts`, as Vite's
    // `normalizePath` folds the replacement).
    glob = glob.slice(alias.prefix.length).replace(/^\/+/u, "");
  }
  const segments = path.posix.normalize(glob).split("/");
  while (segments.length > 0 && (segments[0] === "." || segments[0] === "..")) {
    if (segments.shift() === "..") base = path.posix.dirname(base);
  }
  const root = toPosix(app.root);
  if (base !== root && !isWithin(root, base)) {
    if (negated) return undefined;
    throw new Error(
      `aether-app/no-import-cycle: import.meta.glob pattern ${JSON.stringify(pattern)} in ${importerPath} climbs above the app root; the gate reads no module outside the app`,
    );
  }
  return { negated, base, glob: segments.join("/") };
};

const globRegExp = ({ base, glob, negated }) =>
  new RegExp(`^${escapeRegExp(base)}/${compileGlob(glob, negated).source}$`);

// The index of the first glob syntax in `glob` (an unescaped `*`, `?`, `[`,
// `{` or `(`, the last an extglob's or a regex group's), or -1 for a plain
// path.
const firstSyntax = (glob) => {
  for (let i = 0; i < glob.length; i += 1) {
    const ch = glob[i];
    if (ch === "\\") i += 1;
    else if (ch === "*" || ch === "?" || ch === "[" || ch === "{" || ch === "(") return i;
  }
  return -1;
};

// The directory a glob's literal prefix names under its base (the walk's root,
// escapes resolved) and the walk's depth below it: the count of the glob's
// `/`-separated segments, which bounds every alternative from above when a
// brace group spans `/` (`{a,b/c}` counts two), or unbounded when the compiled
// matcher says the matches may sit at any depth (a globstar anywhere, a
// broadened group).
const globWalk = ({ base, glob }) => {
  const syntax = firstSyntax(glob);
  const cut = syntax === -1 ? glob.lastIndexOf("/") : glob.lastIndexOf("/", syntax);
  const literal = cut === -1 ? "" : glob.slice(0, cut).replace(/\\(.)/gu, "$1");
  const rest = cut === -1 ? glob : glob.slice(cut + 1);
  return {
    dir: literal ? `${base}/${literal}` : base,
    depth: compileGlob(rest).unbounded ? Infinity : rest.split("/").length,
  };
};

// Every regular file under `dir` within `depth` segments, `node_modules` and
// dot entries excluded as Vite's glob excludes them; a symbolic link is
// followed to its file or directory as tinyglobby follows it, a directory
// already on the current ancestor chain (a link back up) is not entered
// again, and a directory or file whose real path is outside `realRoot` (a
// link out of the app) is not read.
const filesUnder = (dir, depth, realRoot, out = [], ancestors = new Set()) => {
  let entries;
  let real;
  try {
    real = fs.realpathSync(dir);
    if (real !== realRoot && !isWithin(realRoot, real)) return out;
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch (error) {
    if (expectedProbeErrors.has(error?.code)) return out;
    throw unreadable(dir, error);
  }
  if (ancestors.has(real)) return out;
  const chain = new Set([...ancestors, real]);
  for (const entry of entries) {
    if (entry.name.startsWith(".") || entry.name === "node_modules") continue;
    const full = path.join(dir, entry.name);
    // A dangling link names nothing; a looping one is a fault `statIfPresent` raises.
    const kind = entry.isSymbolicLink() ? statIfPresent(full) : entry;
    if (!kind) continue;
    if (kind.isDirectory()) {
      if (depth > 1) filesUnder(full, depth - 1, realRoot, out, chain);
    } else if (kind.isFile()) {
      if (entry.isSymbolicLink()) {
        const real = realpathIfPresent(full);
        if (!real || !isWithin(realRoot, real)) continue;
      }
      out.push(full);
    }
  }
  return out;
};

// The app modules an eager glob's patterns match, the importer itself excluded
// as Vite excludes it, sorted.
const globTargets = (patterns, importerPath, app) => {
  const include = [];
  const exclude = [];
  for (const pattern of patterns) {
    const resolved = absoluteGlob(pattern, importerPath, app);
    if (!resolved) continue;
    if (resolved.negated) exclude.push(globRegExp(resolved));
    else include.push({ matcher: globRegExp(resolved), ...globWalk(resolved) });
  }
  const importer = toPosix(importerPath);
  const targets = new Set();
  for (const { matcher, dir, depth } of include) {
    for (const file of filesUnder(path.resolve(dir), depth, app.realRoot)) {
      const posix = toPosix(file);
      if (posix === importer) continue;
      if (!matcher.test(posix) || exclude.some((re) => re.test(posix))) continue;
      if (resolvableExtensions.has(path.extname(file))) targets.add(file);
    }
  }
  return [...targets].sort();
};

// A module's runtime import declarations, the ones esbuild keeps, as
// {specifier | patterns, start, end}: each with the declaration's source range,
// so a finding lands on the declaration that contributes the edge. The pure
// half of the walk: nothing here touches the filesystem.
const parseModule = (filePath, text) => {
  const sourceFile = ts.createSourceFile(filePath, text, ts.ScriptTarget.Latest, true);
  const valueNames = typeScriptExtensions.has(path.extname(filePath))
    ? valueIdentifierNames(sourceFile, classicJsxFactoryRoots(sourceFile))
    : undefined;
  const imports = [];
  const addImport = (node, specifier) =>
    imports.push({ specifier, start: node.getStart(sourceFile), end: node.end });
  for (const statement of sourceFile.statements) {
    if (ts.isImportDeclaration(statement)) {
      const clause = statement.importClause;
      if (clause?.isTypeOnly) continue;
      if (clause && valueNames) {
        const bound = [];
        if (clause.name) bound.push(clause.name.text);
        if (clause.namedBindings) {
          if (ts.isNamespaceImport(clause.namedBindings)) {
            bound.push(clause.namedBindings.name.text);
          } else {
            for (const element of clause.namedBindings.elements) {
              if (!element.isTypeOnly) bound.push(element.name.text);
            }
          }
        }
        if (!bound.some((name) => valueNames.has(name))) continue;
      }
      if (ts.isStringLiteral(statement.moduleSpecifier)) {
        addImport(statement, statement.moduleSpecifier.text);
      }
    } else if (ts.isExportDeclaration(statement) && statement.moduleSpecifier) {
      if (statement.isTypeOnly) continue;
      const clause = statement.exportClause;
      if (
        clause &&
        ts.isNamedExports(clause) &&
        clause.elements.length > 0 &&
        clause.elements.every((element) => element.isTypeOnly)
      ) {
        continue;
      }
      if (ts.isStringLiteral(statement.moduleSpecifier)) {
        addImport(statement, statement.moduleSpecifier.text);
      }
    } else if (
      ts.isImportEqualsDeclaration(statement) &&
      ts.isExternalModuleReference(statement.moduleReference)
    ) {
      if (statement.isTypeOnly) continue;
      // An exported alias (`export import x = require()`) is kept for its
      // importers whether or not this module reads it.
      const exported = (ts.getCombinedModifierFlags(statement) & ts.ModifierFlags.Export) !== 0;
      if (valueNames && !exported && !valueNames.has(statement.name.text)) continue;
      const reference = statement.moduleReference.expression;
      if (ts.isStringLiteral(reference)) addImport(statement, reference.text);
    }
  }
  const globs = eagerGlobCalls(sourceFile).map(({ node, patterns }) => ({
    patterns,
    start: node.getStart(sourceFile),
    end: node.end,
  }));
  return { imports, globs };
};

// A parsed module's runtime import edges, as {target, start, end}, resolved
// against the filesystem now. A JSON target is a leaf and no edge.
const edgesOf = (parsed, filePath, app) => {
  const edges = [];
  const addTarget = (declaration, target) => {
    if (target && path.extname(target) !== ".json") {
      edges.push({ target, start: declaration.start, end: declaration.end });
    }
  };
  for (const declaration of parsed.imports) {
    addTarget(declaration, resolveAppModule(declaration.specifier, filePath, app));
  }
  for (const declaration of parsed.globs) {
    for (const target of globTargets(declaration.patterns, filePath, app)) addTarget(declaration, target);
  }
  return edges;
};

const moduleEdgesFromSource = (filePath, text, app) => edgesOf(parseModule(filePath, text), filePath, app);

const moduleEdgesOnDisk = (filePath, app) => {
  const key = `${app.root}\0${filePath}`;
  const text = readIfPresent(filePath);
  if (text === undefined) {
    // A module that is gone takes its parse with it.
    moduleParseCache.delete(key);
    return [];
  }
  const hash = crypto.createHash("sha1").update(text).digest("hex");
  const cached = moduleParseCache.get(key);
  const parsed = cached && cached.hash === hash ? cached.parsed : parseModule(filePath, text);
  moduleParseCache.set(key, { hash, parsed });
  return edgesOf(parsed, filePath, app);
};

// The on-disk graph as one lint of one file reads it: a module's edges are
// read, hashed and resolved once per walker however many walks reach it (one
// per edge of the linted file, and a second one for a protected file), and
// the next lint of any file makes a new walker, so it sees the disk as it is
// then.
const graphWalker = (app) => {
  const edges = new Map();
  const edgesAt = (file) => {
    if (!edges.has(file)) edges.set(file, moduleEdgesOnDisk(file, app));
    return edges.get(file);
  };
  // The modules from `start` back to `goal`, `goal` excluded, or undefined
  // when no import chain leads back; `admit` restricts the modules the chain
  // may run through (`goal` and `start` aside).
  const pathBack = (start, goal, admit = () => true) => {
    const previous = new Map([[start, undefined]]);
    const stack = [start];
    while (stack.length > 0) {
      const current = stack.pop();
      for (const { target: next } of edgesAt(current)) {
        if (next === goal) {
          const chain = [current];
          for (let step = previous.get(current); step !== undefined; step = previous.get(step)) {
            chain.push(step);
          }
          return chain.reverse();
        }
        if (!previous.has(next) && admit(next)) {
          previous.set(next, current);
          stack.push(next);
        }
      }
    }
    return undefined;
  };
  return { pathBack };
};

// The resolver, the parse cache and the walker, for
// .aether-container-tests/import-cycle-eslint.test.ts; ESLint reads only the
// default export.
export const importCycleInternals = { appContextFor, graphWalker, moduleEdgesOnDisk, moduleParseCache, resolveAppModule };

// The template files an app cannot edit — the App Builder agent's never-edit
// lists (the template-owned `src/` files and the pen-input file of its agent
// definition, the scaffold-infra and shortcut-provider bullets of
// `references/agent/build-rules.md`; held equal to those lists by
// aether_orchestrator_rs/tests/python/test_app_builder_import_cycle_guidance_contract.py)
// and the vendored `src/components/ui/`, as app-root-relative patterns in the
// shape of a `files` entry. `aether-app/no-import-cycle` lands no finding on
// one while the cycle has an editable member under `src/` (the agent's
// protected-config protocol would otherwise stop on a file it may not edit);
// a cycle among these alone, or whose only editable member sits outside
// `src/`, is reported on each of them.
const protectedTemplateFiles = [
  "src/App.tsx",
  "src/main.tsx",
  "src/components/agent-chat.tsx",
  "src/components/connector-policy-banner.tsx",
  "src/components/error-boundary.tsx",
  "src/components/internal/spatial-tile-layer.ts",
  "src/components/markdown-text.tsx",
  "src/components/model-viewer.tsx",
  "src/components/pdf-export-button.tsx",
  "src/components/pdf-viewer.tsx",
  "src/components/pen-input.tsx",
  "src/components/shortcut-provider.tsx",
  "src/components/spatial-map.tsx",
  "src/lib/app-mounted-transport.ts",
  "src/lib/app-view-serializer.ts",
  "src/lib/app-view-signal.tsx",
  "src/lib/app-view-transport.ts",
  "src/lib/connector-policy-monitor.ts",
  "src/lib/console-capture.ts",
  "src/lib/cowork-parent-transport.ts",
  "src/lib/model-load.ts",
  "src/lib/pdf-bytes.ts",
  "src/lib/pdf-export.ts",
  "src/lib/pen-input-value.ts",
  "src/lib/preview-camera-bridge.ts",
  "src/lib/query-cache.ts",
  "src/lib/spatial-tile-bytes.ts",
  "src/types/app-message.ts",
  "src/components/ui/**/*.{ts,tsx}",
];
const protectedTemplateMatchers = protectedTemplateFiles.map(
  (pattern) => new RegExp(`^${compileGlob(pattern).source}$`),
);
const isProtectedTemplateFile = (relativePath) =>
  protectedTemplateMatchers.some((matcher) => matcher.test(relativePath));

const rawDrawingCanvasPlugin = {
  rules: {
    "no-import-cycle": {
      meta: {
        type: "problem",
        schema: [],
        messages: {
          cycle:
            "Circular import: {{cycle}}. A cycle can fail at load with \"Cannot access '…' before initialization\" — whichever module loads first reads an export the other has not initialised yet — and tsc and the build do not catch it, so every cycle is rejected. Move the shared value into a module both can import, or make the import `import type`.",
        },
      },
      create(context) {
        const filePath = path.resolve(context.filename);
        if (!appSourceExtensions.includes(path.extname(filePath))) return {};
        const app = appContextFor(filePath, context.cwd);
        const relative = (file) => toPosix(path.relative(app.root, file));
        const isProtected = (file) => isProtectedTemplateFile(relative(file));
        // An editable member the gate lints: under `src/` and not protected. A
        // module elsewhere in the app is walked but never visited for a report.
        const editableInScope = (file) => !isProtected(file) && isWithin(app.src, file);
        const protectedHere = isProtected(filePath);
        const walker = graphWalker(app);
        // This module's edges by declaration range: the report lands on the
        // declaration that contributes the edge, not on every declaration
        // naming the same module.
        const edgesByRange = new Map();
        for (const edge of moduleEdgesFromSource(filePath, context.sourceCode.text, app)) {
          const key = `${edge.start}:${edge.end}`;
          const targets = edgesByRange.get(key) ?? [];
          targets.push(edge.target);
          edgesByRange.set(key, targets);
        }
        const check = (node) => {
          const targets = edgesByRange.get(`${node.range[0]}:${node.range[1]}`);
          if (!targets) return;
          for (const target of targets) {
            // A module that imports itself reads its own uninitialised export.
            let chain = target === filePath ? [] : walker.pathBack(target, filePath);
            if (!chain) continue;
            // A cycle with an editable member under `src/` is that member's to
            // break: it is reported there and never on a protected template
            // file. One among protected files alone is reported on each of
            // them — when the first return path runs through an editable
            // module, a return path through protected modules alone still
            // counts, so a protected-only cycle beside an editable detour is
            // not hidden.
            if (protectedHere && chain.some(editableInScope)) {
              chain = editableInScope(target)
                ? undefined
                : walker.pathBack(target, filePath, (member) => !editableInScope(member));
              if (!chain) continue;
            }
            context.report({
              node,
              messageId: "cycle",
              data: { cycle: [filePath, ...chain, filePath].map(relative).join(" -> ") },
            });
          }
        };
        return {
          ImportDeclaration: check,
          ExportNamedDeclaration: check,
          ExportAllDeclaration: check,
          TSImportEqualsDeclaration: check,
          CallExpression: check,
        };
      },
    },
    "no-direct-leaflet": {
      meta: {
        type: "problem",
        schema: [],
        messages: {
          forbidden:
            "Use the protected `@/components/spatial-map` control instead of importing Leaflet directly.",
        },
      },
      create(context) {
        const staticString = (node, resolving = new Set()) => {
          if (!node) return undefined;
          if ([
            "ChainExpression", "TSAsExpression", "TSNonNullExpression",
            "TSSatisfiesExpression", "TSTypeAssertion",
          ].includes(node.type)) {
            return staticString(node.expression, resolving);
          }
          if (node.type === "Literal" && typeof node.value === "string") {
            return node.value;
          }
          if (node.type === "TemplateLiteral") {
            let value = node.quasis[0]?.value.cooked;
            if (value == null) return undefined;
            for (let index = 0; index < node.expressions.length; index++) {
              const expression = staticString(node.expressions[index], resolving);
              const suffix = node.quasis[index + 1]?.value.cooked;
              if (expression === undefined || suffix == null) return undefined;
              value += expression + suffix;
            }
            return value;
          }
          if (node.type === "BinaryExpression" && node.operator === "+") {
            const left = staticString(node.left, resolving);
            const right = staticString(node.right, resolving);
            return left === undefined || right === undefined ? undefined : left + right;
          }
          if (node.type === "Identifier") {
            let scope = context.sourceCode.getScope(node);
            while (scope) {
              const variable = scope.set.get(node.name);
              if (variable) {
                const definition = variable.defs[0];
                if (resolving.has(variable) || definition?.parent?.kind !== "const") {
                  return undefined;
                }
                return staticString(
                  definition.node.init,
                  new Set([...resolving, variable]),
                );
              }
              scope = scope.upper;
            }
          }
          return undefined;
        };
        const check = (node, source) => {
          const specifier = staticString(source);
          if (specifier === "leaflet" || specifier?.startsWith("leaflet/")) {
            context.report({ node, messageId: "forbidden" });
          }
        };
        return {
          ImportExpression(node) {
            check(node, node.source);
          },
          CallExpression(node) {
            if (node.callee.type === "Identifier" && node.callee.name === "require") {
              check(node, node.arguments[0]);
            }
          },
        };
      },
    },
    // Bucketing a date by its UTC calendar parts, `new Date(text).getUTCMonth()`,
    // shifts every offsetless source date (Power BI, SQL, Dataverse return
    // "2025-05-01T00:00:00", which the browser reads as local time) into the
    // previous month or day for every viewer east of UTC. Rebuilding a local
    // day from those parts carries the same shift, so it is flagged too; the
    // guarded day-bin read is `toCalendarDay`. A string with a `Z` or offset
    // is flagged as well, deliberately: dates bucket only through the
    // `@/lib/dashboard-data` helpers, which read either form correctly. A value
    // known to be a number or a Date (a numeric expression, a `number` or
    // `Date` parameter, a const holding one) is an instant and passes.
    "no-utc-date-parts": {
      meta: {
        type: "problem",
        schema: [],
        messages: {
          forbidden:
            "Do not bucket a parsed date by its UTC parts (`new Date(value).{{method}}()`): Power BI, SQL and Dataverse dates carry no offset, parse as local time, and a UTC read moves them into the previous month or day for viewers east of UTC. Use `bucketByTime`, `inRange`, `toDateValue` or `toCalendarDay` from `@/lib/dashboard-data`.",
        },
      },
      create(context) {
        const utcParts = new Set([
          "getUTCFullYear",
          "getUTCMonth",
          "getUTCDate",
          "getUTCDay",
        ]);
        const unwrap = (node) => {
          let current = node;
          while (
            current &&
            [
              "ChainExpression",
              "TSAsExpression",
              "TSNonNullExpression",
              "TSSatisfiesExpression",
              "TSTypeAssertion",
            ].includes(current.type)
          ) {
            current = current.expression;
          }
          return current;
        };
        const memberName = (node) =>
          node?.type === "MemberExpression" && !node.computed
            ? node.property.name
            : undefined;
        const findVariable = (identifier) => {
          let scope = context.sourceCode.getScope(identifier);
          while (scope) {
            const variable = scope.set.get(identifier.name);
            if (variable) return variable;
            scope = scope.upper;
          }
          return undefined;
        };
        const isNeverReassigned = (variable) =>
          variable.references.every(
            (reference) => !reference.isWrite() || reference.init,
          );
        const instantAnnotation = (id) => {
          const type = id?.typeAnnotation?.typeAnnotation;
          return (
            type?.type === "TSNumberKeyword" ||
            (type?.type === "TSTypeReference" &&
              type.typeName.type === "Identifier" &&
              type.typeName.name === "Date")
          );
        };
        // An identifier is text unless its single, never-reassigned
        // definition is a `number`/`Date` parameter or holds a non-text value.
        const identifierMayBeText = (identifier, depth) => {
          const variable = findVariable(identifier);
          if (!variable || variable.defs.length !== 1) return true;
          const definition = variable.defs[0];
          if (!isNeverReassigned(variable)) return true;
          if (definition.type === "Parameter") {
            return !instantAnnotation(definition.name);
          }
          if (definition.node.type !== "VariableDeclarator") return true;
          if (instantAnnotation(definition.node.id)) return false;
          return !definition.node.init || mayBeText(definition.node.init, depth + 1);
        };
        // A number is an instant (epoch ms, arithmetic on one), never an
        // offsetless string, so only a value that may be text is flagged.
        const mayBeText = (node, depth = 0) => {
          const arg = unwrap(node);
          if (!arg || depth > 8) return !!arg;
          if (arg.type === "Literal") return typeof arg.value === "string";
          if (arg.type === "TemplateLiteral") return true;
          if (arg.type === "BinaryExpression") {
            return (
              arg.operator === "+" &&
              (mayBeText(arg.left, depth + 1) || mayBeText(arg.right, depth + 1))
            );
          }
          if (arg.type === "UnaryExpression") return false;
          if (arg.type === "Identifier") return identifierMayBeText(arg, depth);
          if (arg.type === "NewExpression") return parsesText(arg, depth + 1);
          if (arg.type === "CallExpression") {
            const callee = unwrap(arg.callee);
            if (callee?.type === "Identifier") {
              return !["Number", "parseInt", "parseFloat"].includes(callee.name);
            }
            const method = memberName(callee);
            if (["getTime", "valueOf", "now", "UTC"].includes(method)) return false;
            return true;
          }
          return ["Identifier", "MemberExpression", "ConditionalExpression", "LogicalExpression"].includes(arg.type);
        };
        const parsesText = (node, depth = 0) => {
          const expr = unwrap(node);
          return (
            expr?.type === "NewExpression" &&
            expr.callee.type === "Identifier" &&
            expr.callee.name === "Date" &&
            expr.arguments.length === 1 &&
            mayBeText(expr.arguments[0], depth)
          );
        };
        const boundToParsedText = (identifier) => {
          const variable = findVariable(identifier);
          if (!variable || variable.defs.length !== 1) return false;
          const definition = variable.defs[0];
          return (
            definition.node.type === "VariableDeclarator" &&
            parsesText(definition.node.init) &&
            isNeverReassigned(variable)
          );
        };
        return {
          CallExpression(node) {
            const callee = unwrap(node.callee);
            const method = memberName(callee);
            if (!method || !utcParts.has(method)) return;
            const target = unwrap(callee.object);
            const flagged =
              parsesText(target) ||
              (target?.type === "Identifier" && boundToParsedText(target));
            if (!flagged) return;
            context.report({ node, messageId: "forbidden", data: { method } });
          },
        };
      },
    },
    "no-raw-drawing-canvas": {
      meta: {
        type: "problem",
        schema: [],
        messages: {
          forbidden:
            "Use the shared `@/components/pen-input` wrapper; app code never implements a raw drawing canvas.",
          forbiddenImport:
            "Use the shared `@/components/pen-input` wrapper; app code never imports the drawing engine directly.",
        },
      },
      create(context) {
        const sourceCode = context.sourceCode;
        const variableDeclarations = [];
        const bindingDeclarations = [];
        const constantInitializers = new Map();
        const jsxOpeningElements = [];
        const callExpressions = [];
        const assignmentExpressions = [];
        const jsxAttributes = [];
        const importExpressions = [];
        const forOfStatements = [];
        const reactCreateElementDestructurings = [];
        const reactCreateElementVariables = new Set();
        const reactNamespaceVariables = new Set();

        const variableForIdentifier = (node) => {
          if (
            node?.type !== "Identifier" &&
            node?.type !== "JSXIdentifier"
          ) {
            return undefined;
          }
          let scope = sourceCode.getScope(node);
          while (scope) {
            const variable = scope.set.get(node.name);
            if (variable) return variable;
            scope = scope.upper;
          }
          return undefined;
        };

        const unwrapExpression = (node) => {
          let current = node;
          while (
            current &&
            [
              "ChainExpression",
              "TSAsExpression",
              "TSNonNullExpression",
              "TSSatisfiesExpression",
              "TSTypeAssertion",
            ].includes(current.type)
          ) {
            current = current.expression;
          }
          return current;
        };

        const staticStringExpression = (node, resolving = new Set()) => {
          node = unwrapExpression(node);
          if (node?.type === "Literal" && typeof node.value === "string") {
            return node.value;
          }
          if (
            node?.type === "TemplateLiteral" &&
            node.expressions.length === 0
          ) {
            return node.quasis[0]?.value.cooked;
          }
          if (node?.type === "BinaryExpression" && node.operator === "+") {
            const left = staticStringExpression(node.left, resolving);
            const right = staticStringExpression(node.right, resolving);
            return left === undefined || right === undefined
              ? undefined
              : left + right;
          }
          if (
            node?.type === "Identifier" ||
            node?.type === "JSXIdentifier"
          ) {
            const variable = variableForIdentifier(node);
            if (
              variable === undefined ||
              !constantInitializers.has(variable) ||
              resolving.has(variable)
            ) {
              return undefined;
            }
            const nextResolving = new Set(resolving);
            nextResolving.add(variable);
            return staticStringExpression(
              constantInitializers.get(variable),
              nextResolving,
            );
          }
          return undefined;
        };

        const staticCanvasTag = (node) =>
          staticStringExpression(node) === "canvas";

        const memberName = (node) => {
          node = unwrapExpression(node);
          if (node?.type !== "MemberExpression") return undefined;
          if (node.computed) return staticStringExpression(node.property);
          return node.property.type === "Identifier"
            ? node.property.name
            : undefined;
        };

        const propertyName = (node) => {
          if (node?.type !== "Property") return undefined;
          if (node.computed) return staticStringExpression(node.key);
          if (node.key.type === "Identifier") return node.key.name;
          return staticStringExpression(node.key);
        };

        const bindingIdentifier = (node) => {
          node = unwrapExpression(node);
          while (node?.type === "AssignmentPattern") {
            node = unwrapExpression(node.left);
          }
          return node?.type === "Identifier" ? node : undefined;
        };

        const bindingIdentifiers = (node) => {
          node = unwrapExpression(node);
          if (node?.type === "Identifier") return [node];
          if (
            node?.type === "AssignmentPattern" ||
            node?.type === "RestElement"
          ) {
            return bindingIdentifiers(
              node.type === "AssignmentPattern"
                ? node.left
                : node.argument,
            );
          }
          if (node?.type === "ArrayPattern") {
            return node.elements.flatMap((element) =>
              element === null ? [] : bindingIdentifiers(element),
            );
          }
          if (node?.type === "ObjectPattern") {
            return node.properties.flatMap((property) =>
              property.type === "Property"
                ? bindingIdentifiers(property.value)
                : bindingIdentifiers(property.argument),
            );
          }
          return [];
        };

        const literalString = (node) => {
          node = unwrapExpression(node);
          return node?.type === "Literal" && typeof node.value === "string"
            ? node.value
            : undefined;
        };

        const hasLiteralNonDrawingMarker = (node) => {
          if (node?.type !== "ObjectExpression") return false;
          let hasMarker = false;
          for (const property of node.properties) {
            if (property.type !== "Property") {
              hasMarker = false;
              continue;
            }
            const name = propertyName(property);
            if (name === undefined) {
              hasMarker = false;
            } else if (name === nonDrawingCanvasMarker) {
              hasMarker =
                !property.computed &&
                literalString(property.key) === nonDrawingCanvasMarker &&
                literalString(property.value) === "non-drawing";
            }
          }
          return hasMarker;
        };

        const hasLiteralJsxMarker = (node) => {
          let hasMarker = false;
          for (const attribute of node.attributes) {
            if (attribute.type === "JSXSpreadAttribute") {
              hasMarker = false;
            } else if (attribute.name.name === nonDrawingCanvasMarker) {
              hasMarker =
                attribute.value?.type === "Literal" &&
                attribute.value.value === "non-drawing";
            }
          }
          return hasMarker;
        };

        const isReactCreateElementCallee = (node, resolving = new Set()) => {
          const callee = unwrapExpression(node);
          if (callee?.type === "Identifier") {
            const variable = variableForIdentifier(callee);
            if (reactCreateElementVariables.has(variable)) return true;
            if (
              constantInitializers.has(variable) &&
              !resolving.has(variable)
            ) {
              const nextResolving = new Set(resolving);
              nextResolving.add(variable);
              return isReactCreateElementCallee(
                constantInitializers.get(variable),
                nextResolving,
              );
            }
            return false;
          }
          if (callee?.type !== "MemberExpression") return false;
          const object = unwrapExpression(callee.object);
          const objectVariable =
            object?.type === "Identifier"
              ? variableForIdentifier(object)
              : undefined;
          return (
            object?.type === "Identifier" &&
            (reactNamespaceVariables.has(objectVariable) ||
              (object.name === "React" &&
                (objectVariable === undefined ||
                  objectVariable.defs.length === 0))) &&
            memberName(callee) === "createElement"
          );
        };

        const isDocumentCreateElementCallee = (
          node,
          atOffset = Number.POSITIVE_INFINITY,
          resolving = new Set(),
        ) => {
          node = unwrapExpression(node);
          if (
            node?.type === "MemberExpression" &&
            isDocumentExpression(node.object) &&
            memberName(node) === "createElement"
          ) {
            return true;
          }
          if (node?.type === "CallExpression") {
            const callee = unwrapExpression(node.callee);
            return (
              callee?.type === "MemberExpression" &&
              memberName(callee) === "bind" &&
              isDocumentCreateElementCallee(
                callee.object,
                atOffset,
                resolving,
              )
            );
          }
          if (
            node?.type === "ConditionalExpression" ||
            node?.type === "LogicalExpression"
          ) {
            return (
              isDocumentCreateElementCallee(
                node.type === "ConditionalExpression"
                  ? node.consequent
                  : node.left,
                atOffset,
                resolving,
              ) ||
              isDocumentCreateElementCallee(
                node.type === "ConditionalExpression"
                  ? node.alternate
                  : node.right,
                atOffset,
                resolving,
              )
            );
          }
          if (node?.type === "SequenceExpression") {
            return node.expressions.some((expression) =>
              isDocumentCreateElementCallee(
                expression,
                atOffset,
                resolving,
              ),
            );
          }
          if (node?.type !== "Identifier") return false;
          const variable = variableForIdentifier(node);
          if (variable === undefined || resolving.has(variable)) return false;
          const nextResolving = new Set(resolving);
          nextResolving.add(variable);
          if (
            assignmentExpressions.some((write) => {
              if (
                write.range[0] >= atOffset ||
                !["=", "&&=", "||=", "??="].includes(write.operator)
              ) {
                return false;
              }
              const left = unwrapExpression(write.left);
              if (
                left?.type === "Identifier" &&
                variableForIdentifier(left) === variable
              ) {
                return isDocumentCreateElementCallee(
                  write.right,
                  write.range[0],
                  nextResolving,
                );
              }
              return (
                left?.type === "ObjectPattern" &&
                isDocumentExpression(write.right) &&
                left.properties.some(
                  (property) =>
                    property.type === "Property" &&
                    propertyName(property) === "createElement" &&
                    variableForIdentifier(bindingIdentifier(property.value)) ===
                      variable,
                )
              );
            })
          ) {
            return true;
          }
          const definition =
            variable.defs.length === 1 ? variable.defs[0] : undefined;
          if (definition?.type !== "Variable") return false;
          if (
            definition.node.id.type === "ObjectPattern" &&
            isDocumentExpression(definition.node.init)
          ) {
            return definition.node.id.properties.some(
              (property) =>
                property.type === "Property" &&
                propertyName(property) === "createElement" &&
                bindingIdentifier(property.value) === definition.name,
            );
          }
          if (definition.node.id.type !== "Identifier") return false;
          return isDocumentCreateElementCallee(
            definition.node.init,
            definition.node.range[0],
            nextResolving,
          );
        };

        const hasBoundCanvasArgument = (
          node,
          atOffset = Number.POSITIVE_INFINITY,
          resolving = new Set(),
        ) => {
          node = unwrapExpression(node);
          if (node?.type === "CallExpression") {
            const callee = unwrapExpression(node.callee);
            return (
              callee?.type === "MemberExpression" &&
              memberName(callee) === "bind" &&
              isDocumentCreateElementCallee(
                callee.object,
                atOffset,
                resolving,
              ) &&
              staticCanvasTag(node.arguments[1])
            );
          }
          if (
            node?.type === "ConditionalExpression" ||
            node?.type === "LogicalExpression"
          ) {
            return (
              hasBoundCanvasArgument(
                node.type === "ConditionalExpression"
                  ? node.consequent
                  : node.left,
                atOffset,
                resolving,
              ) ||
              hasBoundCanvasArgument(
                node.type === "ConditionalExpression"
                  ? node.alternate
                  : node.right,
                atOffset,
                resolving,
              )
            );
          }
          if (node?.type === "SequenceExpression") {
            return node.expressions.some((expression) =>
              hasBoundCanvasArgument(expression, atOffset, resolving),
            );
          }
          if (node?.type !== "Identifier") return false;
          const variable = variableForIdentifier(node);
          if (variable === undefined || resolving.has(variable)) return false;
          const nextResolving = new Set(resolving);
          nextResolving.add(variable);
          if (
            assignmentExpressions.some(
              (write) =>
                write.range[0] < atOffset &&
                unwrapExpression(write.left)?.type === "Identifier" &&
                variableForIdentifier(unwrapExpression(write.left)) ===
                  variable &&
                hasBoundCanvasArgument(
                  write.right,
                  write.range[0],
                  nextResolving,
                ),
            )
          ) {
            return true;
          }
          const definition =
            variable.defs.length === 1 ? variable.defs[0] : undefined;
          return (
            definition?.type === "Variable" &&
            definition.node.id.type === "Identifier" &&
            hasBoundCanvasArgument(
              definition.node.init,
              definition.node.range[0],
              nextResolving,
            )
          );
        };

        const isGlobalIdentifier = (node, name) => {
          if (node?.type !== "Identifier" || node.name !== name) return false;
          const variable = variableForIdentifier(node);
          return variable === undefined || variable.defs.length === 0;
        };

        const isWindowExpression = (node, resolving = new Set()) => {
          node = unwrapExpression(node);
          if (
            isGlobalIdentifier(node, "window") ||
            isGlobalIdentifier(node, "self") ||
            isGlobalIdentifier(node, "globalThis")
          ) {
            return true;
          }
          if (
            node?.type === "MemberExpression" &&
            isGlobalIdentifier(unwrapExpression(node.object), "globalThis") &&
            ["window", "self"].includes(memberName(node))
          ) {
            return true;
          }
          if (node?.type !== "Identifier") return false;
          const variable = variableForIdentifier(node);
          if (variable === undefined || resolving.has(variable)) return false;
          const definition =
            variable.defs.length === 1 ? variable.defs[0] : undefined;
          if (
            definition?.type !== "Variable" ||
            (definition.parent?.kind !== "const" &&
              definition.parent?.kind !== "let")
          ) {
            return false;
          }
          if (
            definition.parent.kind === "let" &&
            variable.references.some(
              (reference) =>
                reference.isWrite() &&
                reference.identifier !== definition.name,
            )
          ) {
            return false;
          }
          const nextResolving = new Set(resolving);
          nextResolving.add(variable);
          if (definition.node.id.type === "Identifier") {
            return isWindowExpression(
              definition.node.init,
              nextResolving,
            );
          }
          if (
            definition.node.id.type === "ObjectPattern" &&
            isGlobalIdentifier(
              unwrapExpression(definition.node.init),
              "globalThis",
            )
          ) {
            return definition.node.id.properties.some(
              (property) =>
                property.type === "Property" &&
                ["window", "self"].includes(propertyName(property)) &&
                property.value === definition.name,
            );
          }
          return false;
        };
        const isDocumentExpression = (node, resolving = new Set()) => {
          node = unwrapExpression(node);
          if (isGlobalIdentifier(node, "document")) return true;
          if (
            node?.type === "MemberExpression" &&
            isWindowExpression(node.object) &&
            memberName(node) === "document"
          ) {
            return true;
          }
          if (
            node?.type === "MemberExpression" &&
            isDocumentExpression(node.object, resolving) &&
            ["body", "documentElement"].includes(memberName(node))
          ) {
            return true;
          }
          if (node?.type !== "Identifier") return false;
          const variable = variableForIdentifier(node);
          if (variable === undefined || resolving.has(variable)) return false;
          const definition =
            variable.defs.length === 1 ? variable.defs[0] : undefined;
          if (
            definition?.type !== "Variable" ||
            (definition.parent?.kind !== "const" &&
              definition.parent?.kind !== "let")
          ) {
            return false;
          }
          if (
            definition.parent.kind === "let" &&
            variable.references.some(
              (reference) =>
                reference.isWrite() &&
                reference.identifier !== definition.name,
            )
          ) {
            return false;
          }
          const nextResolving = new Set(resolving);
          nextResolving.add(variable);
          if (definition.node.id.type === "Identifier") {
            return isDocumentExpression(
              definition.node.init,
              nextResolving,
            );
          }
          if (
            definition.node.id.type === "ObjectPattern" &&
            isWindowExpression(definition.node.init)
          ) {
            return definition.node.id.properties.some(
              (property) =>
                property.type === "Property" &&
                propertyName(property) === "document" &&
                property.value === definition.name,
            );
          }
          return false;
        };

        const documentLookup = (node) => {
          node = unwrapExpression(node);
          if (node?.type !== "CallExpression") return undefined;
          const callee = unwrapExpression(node.callee);
          if (
            callee?.type !== "MemberExpression" ||
            !isDocumentExpression(callee.object)
          ) {
            return undefined;
          }
          const method = memberName(callee);
          if (
            method !== "getElementById" &&
            method !== "querySelector" &&
            method !== "querySelectorAll"
          ) {
            return undefined;
          }
          const selector = staticStringExpression(node.arguments[0]);
          return {
            method,
            selector,
            unknown: selector === undefined,
          };
        };

        const isDrawingDomEvent = (eventName) =>
          /^(?:on)?(?:pointer(?:down|move|up|cancel|rawupdate)|mouse(?:down|move|up)|touch(?:start|move|end|cancel))(?:capture)?$/iu.test(
            eventName,
          );

        return {
          ImportDeclaration(node) {
            if (node.source.value !== "react") return;
            for (const specifier of node.specifiers) {
              if (
                specifier.type === "ImportSpecifier" &&
                specifier.imported.name === "createElement"
              ) {
                const variable = variableForIdentifier(specifier.local);
                if (variable) reactCreateElementVariables.add(variable);
              } else if (
                specifier.type === "ImportDefaultSpecifier" ||
                specifier.type === "ImportNamespaceSpecifier"
              ) {
                const variable = variableForIdentifier(specifier.local);
                if (variable) reactNamespaceVariables.add(variable);
              }
            }
          },
          VariableDeclarator(node) {
            const init = unwrapExpression(node.init);
            bindingDeclarations.push(node);
            if (node.id.type === "ObjectPattern") {
              reactCreateElementDestructurings.push({ node, init });
            }
            if (node.id.type === "Identifier") {
              variableDeclarations.push(node);
            }
            if (node.id.type === "Identifier") {
              const variable = variableForIdentifier(node.id);
              const hasStableInitializer =
                node.parent.kind === "const" ||
                (node.parent.kind === "let" &&
                  variable?.references.every(
                    (reference) =>
                      !reference.isWrite() ||
                      reference.identifier === node.id,
                  ));
              if (variable && hasStableInitializer) {
                constantInitializers.set(variable, init);
              }
            }
          },
          JSXOpeningElement(node) {
            jsxOpeningElements.push(node);
          },
          CallExpression(node) {
            callExpressions.push(node);
          },
          AssignmentExpression(node) {
            assignmentExpressions.push(node);
          },
          JSXAttribute(node) {
            jsxAttributes.push(node);
          },
          ImportExpression(node) {
            importExpressions.push(node);
          },
          ForOfStatement(node) {
            forOfStatements.push(node);
          },
          "Program:exit"() {
            let hasForbiddenReport = false;
            const reportForbidden = (node, messageId = "forbidden") => {
              hasForbiddenReport = true;
              context.report({ node, messageId });
            };
            for (const { node, init } of reactCreateElementDestructurings) {
              const initVariable =
                init?.type === "Identifier"
                  ? variableForIdentifier(init)
                  : undefined;
              if (
                init?.type !== "Identifier" ||
                (!reactNamespaceVariables.has(initVariable) &&
                  !(
                    init.name === "React" &&
                    (initVariable === undefined ||
                      initVariable.defs.length === 0)
                  ))
              ) {
                continue;
              }
              for (const property of node.id.properties) {
                if (
                  property.type === "Property" &&
                  propertyName(property) === "createElement" &&
                  bindingIdentifier(property.value) !== undefined
                ) {
                  const variable = variableForIdentifier(
                    bindingIdentifier(property.value),
                  );
                  if (variable) {
                    reactCreateElementVariables.add(variable);
                  }
                }
              }
            }

            const canvasDescriptors = [];
            for (const openingElement of jsxOpeningElements) {
              const isAliasedCanvas =
                openingElement.name.type === "JSXIdentifier" &&
                staticCanvasTag(openingElement.name);
              if (
                openingElement.name.type !== "JSXIdentifier" ||
                (openingElement.name.name !== "canvas" &&
                  !isAliasedCanvas)
              ) {
                continue;
              }
              const attributes = new Map();
              for (const attribute of openingElement.attributes) {
                if (attribute.type !== "JSXAttribute") continue;
                const value =
                  attribute.value?.type === "JSXExpressionContainer"
                    ? staticStringExpression(attribute.value.expression)
                    : attribute.value?.value;
                if (typeof value === "string") {
                  attributes.set(attribute.name.name, value);
                }
              }
              canvasDescriptors.push({
                id: attributes.get("id"),
                classes: new Set(
                  (attributes.get("className") ?? "")
                    .split(/\s+/u)
                    .filter(Boolean),
                ),
                attributes,
                marked: hasLiteralJsxMarker(openingElement),
              });
              const marked = hasLiteralJsxMarker(openingElement);
              const unsafeAttribute = openingElement.attributes.find(
                (attribute) =>
                  (attribute.type === "JSXAttribute" &&
                    eventHandlerPattern.test(attribute.name.name) &&
                    isDrawingDomEvent(attribute.name.name)) ||
                  attribute.type === "JSXSpreadAttribute" ||
                  (!marked &&
                    attribute.type === "JSXAttribute" &&
                    (attribute.name.name === "ref" ||
                      eventHandlerPattern.test(attribute.name.name))),
              );
              if (unsafeAttribute) {
                reportForbidden(unsafeAttribute);
              }
            }

            for (const call of callExpressions) {
              const callee = unwrapExpression(call.callee);
              let factoryCallee = call.callee;
              let factoryArguments = call.arguments;
              if (
                callee?.type === "MemberExpression" &&
                isGlobalIdentifier(
                  unwrapExpression(callee.object),
                  "Reflect",
                ) &&
                memberName(callee) === "apply"
              ) {
                factoryCallee = call.arguments[0];
                factoryArguments =
                  unwrapExpression(call.arguments[2])?.type ===
                  "ArrayExpression"
                    ? unwrapExpression(call.arguments[2]).elements
                    : [];
              } else if (
                callee?.type === "MemberExpression" &&
                (memberName(callee) === "call" ||
                  memberName(callee) === "apply")
              ) {
                factoryCallee = callee.object;
                factoryArguments =
                  memberName(callee) === "call"
                    ? call.arguments.slice(1)
                    : unwrapExpression(call.arguments[1])?.type ===
                        "ArrayExpression"
                      ? unwrapExpression(call.arguments[1]).elements
                      : [];
              }
              const reactCreateElement =
                isReactCreateElementCallee(factoryCallee);
              const documentCreateElement =
                isDocumentCreateElementCallee(
                  factoryCallee,
                  call.range[0],
                );
              if (
                (!staticCanvasTag(factoryArguments[0]) &&
                  !(
                    documentCreateElement &&
                    hasBoundCanvasArgument(
                      factoryCallee,
                      call.range[0],
                    )
                  )) ||
                (!reactCreateElement && !documentCreateElement)
              ) {
                continue;
              }
              const props = unwrapExpression(factoryArguments[1]);
              if (
                reactCreateElement &&
                props?.type === "ObjectExpression"
              ) {
                const attributes = new Map();
                for (const property of props.properties) {
                  if (property.type !== "Property") continue;
                  const name = propertyName(property);
                  const value = staticStringExpression(property.value);
                  if (name !== undefined && value !== undefined) {
                    attributes.set(name, value);
                  }
                }
                canvasDescriptors.push({
                  id: attributes.get("id"),
                  classes: new Set(
                    (attributes.get("className") ?? "")
                      .split(/\s+/u)
                      .filter(Boolean),
                  ),
                  attributes,
                  marked: hasLiteralNonDrawingMarker(props),
                });
              }
              if (
                reactCreateElement &&
                hasLiteralNonDrawingMarker(props)
              ) {
                const unsafeProperty = props?.properties?.find(
                  (property) =>
                    property.type === "SpreadElement" ||
                    (property.type === "Property" &&
                      propertyName(property) !== undefined &&
                      isDrawingDomEvent(propertyName(property))),
                );
                if (unsafeProperty) {
                  reportForbidden(unsafeProperty);
                }
                continue;
              }
              reportForbidden(call);
            }

            const lookupTargets = new Map();
            const unknownLookupExpression = {
              aetherUnknownLookup: true,
            };
            const nearestFunction = (node) => {
              let current = node;
              while (current?.parent) {
                current = current.parent;
                if (/^(?:Arrow)?Function/u.test(current.type)) {
                  return current;
                }
              }
              return undefined;
            };
            const isConditionallyNested = (node) => {
              const assignmentFunction = nearestFunction(node);
              if (
                bindingIdentifiers(node.left).some((identifier) => {
                  const variable = variableForIdentifier(identifier);
                const definition =
                  variable?.defs.length === 1
                    ? variable.defs[0]
                    : undefined;
                  return (
                  definition !== undefined &&
                    nearestFunction(definition.name) !== assignmentFunction
                  );
                })
              ) {
                return true;
              }
              let current = node;
              while (current?.parent) {
                const parent = current.parent;
                if (
                  parent.type === "Program"
                ) {
                  return false;
                }
                if (/^(?:Arrow)?Function/u.test(parent.type)) return false;
                if (
                  parent.type === "IfStatement" ||
                  parent.type === "ConditionalExpression" ||
                  parent.type === "LogicalExpression" ||
                  parent.type === "SwitchCase" ||
                  parent.type === "TryStatement" ||
                  parent.type === "CatchClause" ||
                  /^(?:DoWhile|For|ForIn|ForOf|While)Statement$/u.test(
                    parent.type,
                  )
                ) {
                  return true;
                }
                current = parent;
              }
              return false;
            };
            const lookupWrites = [
              ...bindingDeclarations.map((declaration) => ({
                node: declaration,
                left: declaration.id,
                right: declaration.init,
              })),
              ...assignmentExpressions
                .map((assignment) => ({
                  node: assignment,
                  left: assignment.left,
                  right:
                    assignment.operator === "=" &&
                    !isConditionallyNested(assignment)
                      ? assignment.right
                      : unknownLookupExpression,
                })),
            ].sort((left, right) => left.node.range[0] - right.node.range[0]);
            const lookupWritesByVariable = new Map();
            const objectBindingValue = (
              node,
              name,
              fromSpread = false,
            ) => {
              node = unwrapExpression(node);
              if (node?.type !== "ObjectExpression") {
                return fromSpread
                  ? { ...unknownLookupExpression, source: node }
                  : node;
              }
              for (let index = node.properties.length - 1; index >= 0; index -= 1) {
                const property = node.properties[index];
                if (
                  property.type === "Property" &&
                  propertyName(property) === name
                ) {
                  return property.value;
                }
                if (property.type === "SpreadElement") {
                  const spreadValue = objectBindingValue(
                    property.argument,
                    name,
                    true,
                  );
                  if (spreadValue !== undefined) return spreadValue;
                }
              }
              return undefined;
            };
            const bindingWrites = (node, value) => {
              node = unwrapExpression(node);
              value = unwrapExpression(value);
              if (node?.type === "Identifier") {
                return [{ identifier: node, value }];
              }
              if (node?.type === "AssignmentPattern") {
                const useDefault =
                  value === undefined ||
                  isGlobalIdentifier(unwrapExpression(value), "undefined") ||
                  (unwrapExpression(value)?.type === "UnaryExpression" &&
                    unwrapExpression(value).operator === "void");
                return bindingWrites(
                  node.left,
                  useDefault ? node.right : value,
                );
              }
              if (node?.type === "RestElement") {
                return bindingWrites(node.argument, value);
              }
              if (node?.type === "ArrayPattern") {
                const flattenArrayElements = (array) =>
                  array.elements.flatMap((element) =>
                    element?.type === "SpreadElement" &&
                    unwrapExpression(element.argument)?.type ===
                      "ArrayExpression"
                      ? flattenArrayElements(
                          unwrapExpression(element.argument),
                        )
                      : element?.type === "SpreadElement"
                        ? [
                            {
                              ...unknownLookupExpression,
                              source: element.argument,
                            },
                          ]
                        : [element],
                  );
                const flattened =
                  value?.type === "ArrayExpression"
                    ? flattenArrayElements(value)
                    : undefined;
                const firstUnknownIndex = flattened?.findIndex(
                  (element) => element?.aetherUnknownLookup,
                );
                const arrayElements = flattened?.map((element, index) =>
                  firstUnknownIndex !== undefined &&
                  firstUnknownIndex >= 0 &&
                  index >= firstUnknownIndex
                    ? flattened[firstUnknownIndex]
                    : element,
                );
                return node.elements.flatMap((element, index) =>
                  element === null
                    ? []
                    : bindingWrites(
                        element,
                        arrayElements !== undefined
                          ? element.type === "RestElement"
                            ? {
                                type: "ArrayExpression",
                                elements: arrayElements.slice(index),
                              }
                            : arrayElements[index]
                          : value,
                      ),
                );
              }
              if (node?.type === "ObjectPattern") {
                return node.properties.flatMap((property) =>
                  property.type === "Property"
                    ? bindingWrites(
                        property.value,
                        objectBindingValue(
                          value,
                          propertyName(property),
                        ),
                      )
                    : bindingWrites(property.argument, value),
                );
              }
              return [];
            };
            for (const write of lookupWrites) {
              if (write.right === null || write.right === undefined) continue;
              for (const binding of bindingWrites(write.left, write.right)) {
                const variable = variableForIdentifier(binding.identifier);
                if (variable === undefined) continue;
                const writes = lookupWritesByVariable.get(variable) ?? [];
                writes.push({ ...write, right: binding.value });
                lookupWritesByVariable.set(variable, writes);
              }
            }
            const staticNonnegativeIndex = (node, resolving = new Set()) => {
              node = unwrapExpression(node);
              if (
                node?.type === "Literal" &&
                typeof node.value === "number" &&
                Number.isInteger(node.value) &&
                node.value >= 0
              ) {
                return node.value;
              }
              const stringValue = staticStringExpression(node, resolving);
              if (stringValue !== undefined && /^(?:0|[1-9]\d*)$/u.test(stringValue)) {
                return Number(stringValue);
              }
              if (node?.type !== "Identifier") return undefined;
              const variable = variableForIdentifier(node);
              if (
                variable === undefined ||
                !constantInitializers.has(variable) ||
                resolving.has(variable)
              ) {
                return undefined;
              }
              const nextResolving = new Set(resolving);
              nextResolving.add(variable);
              return staticNonnegativeIndex(
                constantInitializers.get(variable),
                nextResolving,
              );
            };
            const lookupForExpression = (
              node,
              atOffset = Number.POSITIVE_INFINITY,
              resolving = new Set(),
            ) => {
              node = unwrapExpression(node);
              if (node?.aetherUnknownLookup) {
                return {
                  method: "querySelector",
                  selector: undefined,
                  unknown: true,
                };
              }
              if (node?.type === "Identifier") {
                const variable = variableForIdentifier(node);
                if (variable === undefined || resolving.has(variable)) {
                  return undefined;
                }
                const writes = lookupWritesByVariable.get(variable) ?? [];
                const write = writes.findLast(
                  (candidate) => candidate.node.range[0] < atOffset,
                );
                if (write !== undefined) {
                  const nextResolving = new Set(resolving);
                  nextResolving.add(variable);
                  return lookupForExpression(
                    write.right,
                    write.node.range[0],
                    nextResolving,
                  );
                }
                if (lookupTargets.has(variable)) {
                  return lookupTargets.get(variable);
                }
                return undefined;
              }
              const directLookup = documentLookup(node);
              if (directLookup !== undefined) return directLookup;
              if (
                node?.type === "MemberExpression" &&
                node.computed &&
                staticNonnegativeIndex(node.property) !== undefined
              ) {
                const object = unwrapExpression(node.object);
                if (object?.type === "Identifier") {
                  const variable = variableForIdentifier(object);
                  const write = (
                    lookupWritesByVariable.get(variable) ?? []
                  ).findLast(
                    (candidate) => candidate.node.range[0] < atOffset,
                  );
                  const value = unwrapExpression(write?.right);
                  if (value?.type === "ArrayExpression") {
                    const element =
                      value.elements[
                        staticNonnegativeIndex(node.property)
                      ];
                    if (element !== null && element !== undefined) {
                      return lookupForExpression(
                        element,
                        write.node.range[0],
                        resolving,
                      );
                    }
                  }
                }
                const collectionLookup = lookupForExpression(
                  node.object,
                  atOffset,
                  resolving,
                );
                if (collectionLookup?.method === "querySelectorAll") {
                  return {
                    ...collectionLookup,
                    method: "querySelector",
                  };
                }
              }
              if (node?.type === "CallExpression") {
                const callee = unwrapExpression(node.callee);
                if (
                  callee?.type === "MemberExpression" &&
                  memberName(callee) === "item"
                ) {
                  const collectionLookup = lookupForExpression(
                    callee.object,
                    atOffset,
                    resolving,
                  );
                  if (collectionLookup?.method === "querySelectorAll") {
                    return {
                      ...collectionLookup,
                      method: "querySelector",
                    };
                  }
                }
              }
              return undefined;
            };

            for (const call of callExpressions) {
              const callee = unwrapExpression(call.callee);
              if (
                callee?.type !== "MemberExpression" ||
                memberName(callee) !== "forEach"
              ) {
                continue;
              }
              const collectionLookup = lookupForExpression(
                callee.object,
                call.range[0],
              );
              let callback = unwrapExpression(call.arguments[0]);
              if (callback?.type === "Identifier") {
                const callbackVariable = variableForIdentifier(callback);
                const definition =
                  callbackVariable?.defs.length === 1
                    ? callbackVariable.defs[0]
                    : undefined;
                if (definition?.type === "FunctionName") {
                  callback = definition.node;
                } else if (
                  definition?.type === "Variable" &&
                  definition.node.id === definition.name
                ) {
                  callback = unwrapExpression(definition.node.init);
                }
              }
              const parameter = callback?.params?.[0];
              if (
                collectionLookup?.method === "querySelectorAll" &&
                parameter?.type === "Identifier"
              ) {
                const variable = variableForIdentifier(parameter);
                if (variable) {
                  lookupTargets.set(variable, {
                    ...collectionLookup,
                    method: "querySelector",
                  });
                }
              }
            }

            for (const statement of forOfStatements) {
              const collectionLookup = lookupForExpression(
                statement.right,
                statement.range[0],
              );
              const declaration =
                statement.left.type === "VariableDeclaration"
                  ? statement.left.declarations[0]?.id
                  : statement.left;
              if (
                collectionLookup?.method === "querySelectorAll" &&
                declaration?.type === "Identifier"
              ) {
                const variable = variableForIdentifier(declaration);
                if (variable !== undefined) {
                  lookupTargets.set(variable, {
                    ...collectionLookup,
                    method: "querySelector",
                  });
                }
              }
            }
            const selectorTargetCompound = (selector) => {
              let bracketDepth = 0;
              let parenthesisDepth = 0;
              let quote;
              for (let index = selector.length - 1; index >= 0; index -= 1) {
                const character = selector[index];
                if (quote !== undefined) {
                  if (character === quote && selector[index - 1] !== "\\") {
                    quote = undefined;
                  }
                  continue;
                }
                if (character === '"' || character === "'") {
                  quote = character;
                } else if (character === "]") {
                  bracketDepth += 1;
                } else if (character === "[") {
                  bracketDepth -= 1;
                } else if (character === ")") {
                  parenthesisDepth += 1;
                } else if (character === "(") {
                  parenthesisDepth -= 1;
                } else if (
                  bracketDepth === 0 &&
                  parenthesisDepth === 0 &&
                  (/\s/u.test(character) || /[>+~]/u.test(character))
                ) {
                  return selector.slice(index + 1).trim();
                }
              }
              return selector.trim();
            };
            const splitSelectorList = (selector) => {
              const parts = [];
              let start = 0;
              let bracketDepth = 0;
              let parenthesisDepth = 0;
              let quote;
              for (let index = 0; index < selector.length; index += 1) {
                const character = selector[index];
                if (quote !== undefined) {
                  if (character === quote && selector[index - 1] !== "\\") {
                    quote = undefined;
                  }
                } else if (character === '"' || character === "'") {
                  quote = character;
                } else if (character === "[") {
                  bracketDepth += 1;
                } else if (character === "]") {
                  bracketDepth -= 1;
                } else if (character === "(") {
                  parenthesisDepth += 1;
                } else if (character === ")") {
                  parenthesisDepth -= 1;
                } else if (
                  character === "," &&
                  bracketDepth === 0 &&
                  parenthesisDepth === 0
                ) {
                  parts.push(selector.slice(start, index));
                  start = index + 1;
                }
              }
              parts.push(selector.slice(start));
              return parts;
            };
            const selectorCanvasStatuses = (selector) =>
              splitSelectorList(selector).map((selectorPart) => {
                const compound = selectorTargetCompound(selectorPart);
                let positiveCompound = "";
                for (let index = 0; index < compound.length; index += 1) {
                  if (
                    compound.slice(index, index + 5).toLowerCase() !==
                    ":not("
                  ) {
                    positiveCompound += compound[index];
                    continue;
                  }
                  let depth = 1;
                  let quote;
                  index += 5;
                  for (; index < compound.length && depth > 0; index += 1) {
                    const character = compound[index];
                    if (quote !== undefined) {
                      if (
                        character === quote &&
                        compound[index - 1] !== "\\"
                      ) {
                        quote = undefined;
                      }
                    } else if (character === '"' || character === "'") {
                      quote = character;
                    } else if (character === "(") {
                      depth += 1;
                    } else if (character === ")") {
                      depth -= 1;
                    }
                  }
                  index -= 1;
                }
                const explicitCanvas =
                  /^canvas(?=$|[.#[:])/iu.test(positiveCompound) ||
                  /:(?:is|where)\([^)]*\bcanvas(?=$|[.#[:\s,)])/iu.test(
                    positiveCompound,
                  );
                const id =
                  positiveCompound.match(/#([A-Za-z_][\w-]*)/u)?.[1];
                const classes = [
                  ...positiveCompound.matchAll(/\.([A-Za-z_][\w-]*)/gu),
                ].map((match) => match[1]);
                const attributes = [
                  ...positiveCompound.matchAll(
                    /\[([A-Za-z_][\w:-]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\]\s]+)))?\s*\]/gu,
                  ),
                ].map((match) => ({
                  name: match[1],
                  value: match[2] ?? match[3] ?? match[4],
                }));
                const selectorAssertsMarker = attributes.some(
                  ({ name, value }) =>
                    name === nonDrawingCanvasMarker &&
                    value === "non-drawing",
                );
                const matchingCanvases = canvasDescriptors.filter(
                  (canvas) =>
                    (id === undefined || canvas.id === id) &&
                    classes.every((className) =>
                      canvas.classes.has(className),
                    ) &&
                    attributes.every(
                      ({ name, value }) =>
                        canvas.attributes.has(name) &&
                        (value === undefined ||
                          canvas.attributes.get(name) === value),
                    ),
                );
                return {
                  provesMarked:
                    matchingCanvases.length > 0 &&
                    matchingCanvases.every((canvas) => canvas.marked),
                  targetsUnmarked:
                    matchingCanvases.length > 0
                      ? matchingCanvases.some((canvas) => !canvas.marked)
                      : explicitCanvas && !selectorAssertsMarker,
                };
              });
            const selectorTargetsCanvas = (selector) =>
              selectorCanvasStatuses(selector).some(
                ({ targetsUnmarked }) => targetsUnmarked,
              );
            const lookupProvesMarkedCanvas = (lookup) => {
              if (lookup?.selector === undefined) return false;
              if (lookup.method === "getElementById") {
                const matchingCanvases = canvasDescriptors.filter(
                  (canvas) => canvas.id === lookup.selector,
                );
                return (
                  matchingCanvases.length > 0 &&
                  matchingCanvases.every((canvas) => canvas.marked)
                );
              }
              return selectorCanvasStatuses(lookup.selector).every(
                ({ provesMarked }) => provesMarked,
              );
            };
            const lookupTargetsCanvas = (lookup) => {
              if (lookup === undefined) return false;
              if (lookup.selector === undefined) {
                return (
                  lookup.method === "getElementById" ||
                  lookup.method === "querySelector" ||
                  lookup.method === "querySelectorAll"
                );
              }
              if (lookup.method === "getElementById") {
                const matchingCanvases = canvasDescriptors.filter(
                  (canvas) => canvas.id === lookup.selector,
                );
                return (
                  matchingCanvases.length > 0 &&
                  matchingCanvases.some(() => true)
                );
              }
              return (
                selectorTargetsCanvas(lookup.selector) ||
                selectorCanvasStatuses(lookup.selector).some(
                  ({ provesMarked }) => provesMarked,
                )
              );
            };

            const straightLineBlock = (node) => {
              let current = node;
              while (current?.parent) {
                const parent = current.parent;
                if (
                  parent.type === "Program" ||
                  parent.type === "BlockStatement"
                ) {
                  return parent;
                }
                if (
                  parent.type === "IfStatement" ||
                  parent.type === "ConditionalExpression" ||
                  parent.type === "LogicalExpression" ||
                  parent.type === "SwitchCase" ||
                  parent.type === "TryStatement" ||
                  parent.type === "CatchClause" ||
                  /^(?:DoWhile|For|ForIn|ForOf|While)Statement$/u.test(
                    parent.type,
                  ) ||
                  /^(?:Arrow)?Function/u.test(parent.type)
                ) {
                  return undefined;
                }
                current = parent;
              }
              return undefined;
            };
            const isUnconditionalWriteAt = (write, sink) =>
              straightLineBlock(write) !== undefined &&
              straightLineBlock(write) === straightLineBlock(sink);
            const selected2dContextCalls = callExpressions.filter((call) => {
              const callee = unwrapExpression(call.callee);
              return (
                callee?.type === "MemberExpression" &&
                memberName(callee) === "getContext" &&
                staticStringExpression(call.arguments[0]) === "2d"
              );
            });
            const unprovenSelected2dContextCalls =
              selected2dContextCalls.filter((call) => {
                const callee = unwrapExpression(call.callee);
                const lookup = lookupForExpression(
                  callee.object,
                  call.range[0],
                );
                return !lookupProvesMarkedCanvas(lookup);
              });
            const strokeCaptureMethods = new Set([
              "beginPath",
              "closePath",
              "lineTo",
              "moveTo",
              "quadraticCurveTo",
              "bezierCurveTo",
              "stroke",
              "strokeRect",
              "toBlob",
              "toDataURL",
            ]);
            const canvasExportMethods = new Set(["toBlob", "toDataURL"]);
            const expressionImplementation = (
              expression,
              seen = new Set(),
            ) => {
              expression = unwrapExpression(expression);
              if (!expression || seen.has(expression)) return undefined;
              const nextSeen = new Set(seen);
              nextSeen.add(expression);
              if (expression.type === "MemberExpression") {
                const name = memberName(expression);
                let object = unwrapExpression(expression.object);
                if (object?.type === "Identifier") {
                  const variable = variableForIdentifier(object);
                  const definition =
                    variable?.defs.length === 1
                      ? variable.defs[0]
                      : undefined;
                  if (definition?.type === "Variable") {
                    object = unwrapExpression(definition.node.init);
                  }
                }
                if (name !== undefined && object?.type === "ObjectExpression") {
                  for (
                    let index = object.properties.length - 1;
                    index >= 0;
                    index -= 1
                  ) {
                    const property = object.properties[index];
                    if (property.type === "SpreadElement") {
                      const spreadValue = expressionImplementation(
                        {
                          type: "MemberExpression",
                          object: property.argument,
                          property: {
                            type: "Literal",
                            value: name,
                          },
                          computed: true,
                        },
                        nextSeen,
                      );
                      if (spreadValue !== undefined) return spreadValue;
                    } else if (propertyName(property) === name) {
                      return expressionImplementation(
                        property.value,
                        nextSeen,
                      );
                    }
                  }
                }
                return undefined;
              }
              if (expression.type !== "Identifier") return expression;
              const variable = variableForIdentifier(expression);
              const definition =
                variable?.defs.length === 1 ? variable.defs[0] : undefined;
              if (definition?.type === "FunctionName") {
                return definition.node;
              }
              if (definition?.type === "Variable") {
                return expressionImplementation(
                  definition.node.init,
                  nextSeen,
                );
              }
              return undefined;
            };
            const handlerImplementation = (attribute) =>
              attribute.value?.type === "JSXExpressionContainer"
                ? expressionImplementation(attribute.value.expression)
                : undefined;
            const selected2dContextVariables = new Set(
              variableDeclarations.flatMap((declaration) => {
                const initializer = unwrapExpression(declaration.init);
                return selected2dContextCalls.includes(initializer)
                  ? [variableForIdentifier(declaration.id)]
                  : [];
              }),
            );
            const emptySelectedBindings = () => ({
              variables: new Set(),
              members: new Map(),
            });
            const variableAliasesVariable = (
              candidate,
              expected,
              before,
              seen = new Set(),
            ) => {
              if (!candidate || !expected || seen.has(candidate)) return false;
              if (candidate === expected) return true;
              if (
                assignmentExpressions.some((assignment) => {
                  const target = unwrapExpression(assignment.left);
                  return (
                    assignment.range[0] < before &&
                    target?.type === "Identifier" &&
                    variableForIdentifier(target) === candidate
                  );
                })
              ) {
                return false;
              }
              const definition =
                candidate.defs.length === 1 ? candidate.defs[0] : undefined;
              const initializer =
                definition?.type === "Variable"
                  ? unwrapExpression(definition.node.init)
                  : undefined;
              if (initializer?.type !== "Identifier") return false;
              const nextSeen = new Set(seen);
              nextSeen.add(candidate);
              return variableAliasesVariable(
                variableForIdentifier(initializer),
                expected,
                before,
                nextSeen,
              );
            };
            function selectedContextMemberNames(
              expression,
              seen = new Set(),
              selectedBindings = emptySelectedBindings(),
              atNode = expression,
              activationNode = atNode,
            ) {
              expression = unwrapExpression(expression);
              if (!expression || seen.has(expression)) return new Set();
              const before =
                atNode?.range?.[0] ?? Number.POSITIVE_INFINITY;
              const nextSeen = new Set(seen);
              nextSeen.add(expression);
              if (expression.type === "Identifier") {
                const variable = variableForIdentifier(expression);
                const names = new Set(
                  selectedBindings.members.get(variable) ?? [],
                );
                const definition =
                  variable?.defs.length === 1
                    ? variable.defs[0]
                    : undefined;
                if (definition?.type === "Variable") {
                  for (const name of selectedContextMemberNames(
                    definition.node.init,
                    nextSeen,
                    selectedBindings,
                    atNode,
                    activationNode,
                  )) {
                    names.add(name);
                  }
                }
                const memberWrites = assignmentExpressions
                  .filter((assignment) => {
                    const target = unwrapExpression(assignment.left);
                    const object =
                      target?.type === "MemberExpression"
                        ? unwrapExpression(target.object)
                        : undefined;
                    const name =
                      target?.type === "MemberExpression"
                        ? memberName(target)
                        : undefined;
                    return (
                      (assignment.range[0] < before ||
                        (definition?.type === "Variable" &&
                          assignment.range[0] <
                            (activationNode?.range?.[0] ??
                              Number.POSITIVE_INFINITY) &&
                          straightLineBlock(assignment) ===
                            straightLineBlock(definition.node) &&
                          straightLineBlock(atNode) !==
                            straightLineBlock(definition.node))) &&
                      object?.type === "Identifier" &&
                      variableAliasesVariable(
                        variableForIdentifier(object),
                        variable,
                        assignment.range[0],
                      ) &&
                      name !== undefined
                    );
                  })
                  .sort((left, right) => left.range[0] - right.range[0]);
                for (const assignment of memberWrites) {
                  const name = memberName(
                    unwrapExpression(assignment.left),
                  );
                  if (
                    expressionIsSelected2dContext(
                      assignment.right,
                      nextSeen,
                      selectedBindings,
                    )
                  ) {
                    names.add(name);
                  } else if (
                    assignment.operator === "=" &&
                    (isUnconditionalWriteAt(assignment, atNode) ||
                      (definition?.type === "Variable" &&
                        straightLineBlock(assignment) ===
                          straightLineBlock(definition.node)))
                  ) {
                    names.delete(name);
                  }
                }
                return names;
              }
              if (expression.type === "ObjectExpression") {
                const names = new Set();
                const decided = new Set();
                for (
                  let index = expression.properties.length - 1;
                  index >= 0;
                  index -= 1
                ) {
                  const property = expression.properties[index];
                  if (property.type === "SpreadElement") {
                    for (const name of selectedContextMemberNames(
                      property.argument,
                      nextSeen,
                      selectedBindings,
                      atNode,
                      activationNode,
                    )) {
                      if (!decided.has(name)) names.add(name);
                    }
                    continue;
                  }
                  const name = propertyName(property);
                  if (name === undefined || decided.has(name)) continue;
                  decided.add(name);
                  if (
                    expressionIsSelected2dContext(
                      property.value,
                      nextSeen,
                      selectedBindings,
                    )
                  ) {
                    names.add(name);
                  }
                }
                return names;
              }
              if (
                expression.type === "ConditionalExpression" ||
                expression.type === "LogicalExpression"
              ) {
                const branches =
                  expression.type === "ConditionalExpression"
                    ? [expression.consequent, expression.alternate]
                    : [expression.left, expression.right];
                const names = new Set();
                for (const branch of branches) {
                  for (const name of selectedContextMemberNames(
                    branch,
                    nextSeen,
                    selectedBindings,
                    atNode,
                    activationNode,
                  )) {
                    names.add(name);
                  }
                }
                return names;
              }
              return new Set();
            }
            function expressionIsSelected2dContext(
              expression,
              seen = new Set(),
              selectedBindings = emptySelectedBindings(),
            ) {
              expression = unwrapExpression(expression);
              if (!expression || seen.has(expression)) return false;
              if (selected2dContextCalls.includes(expression)) return true;
              if (
                expression.type === "LogicalExpression" &&
                (expression.operator === "&&" ||
                  expression.operator === "||" ||
                  (expression.operator === "??" &&
                    unwrapExpression(expression.right)?.type === "Literal" &&
                    unwrapExpression(expression.right)?.value === null))
              ) {
                return (
                  expressionIsSelected2dContext(
                    expression.left,
                    seen,
                    selectedBindings,
                  ) ||
                  expressionIsSelected2dContext(
                    expression.right,
                    seen,
                    selectedBindings,
                  )
                );
              }
              if (expression.type === "ConditionalExpression") {
                return (
                  expressionIsSelected2dContext(
                    expression.consequent,
                    seen,
                    selectedBindings,
                  ) ||
                  expressionIsSelected2dContext(
                    expression.alternate,
                    seen,
                    selectedBindings,
                  )
                );
              }
              if (expression.type === "MemberExpression") {
                const object = unwrapExpression(expression.object);
                if (
                  object?.type === "Identifier" &&
                  selectedBindings.variables.has(
                    variableForIdentifier(object),
                  )
                ) {
                  return true;
                }
                const name = memberName(expression);
                if (name === undefined) return false;
                return selectedContextMemberNames(
                  object,
                  seen,
                  selectedBindings,
                  expression.range[0],
                ).has(name);
              }
              if (expression.type !== "Identifier") return false;
              const variable = variableForIdentifier(expression);
              if (selectedBindings.variables.has(variable)) return true;
              if (selected2dContextVariables.has(variable)) return true;
              const nextSeen = new Set(seen);
              nextSeen.add(expression);
              const latestAssignment = assignmentExpressions
                .filter(
                  (assignment) =>
                    assignment.range[0] < expression.range[0] &&
                    unwrapExpression(assignment.left)?.type === "Identifier" &&
                    variableForIdentifier(
                      unwrapExpression(assignment.left),
                    ) === variable,
                )
                .sort((left, right) => right.range[0] - left.range[0])[0];
              if (
                latestAssignment &&
                expressionIsSelected2dContext(
                  latestAssignment.right,
                  nextSeen,
                  selectedBindings,
                )
              ) {
                return true;
              }
              const definition =
                variable?.defs.length === 1 ? variable.defs[0] : undefined;
              if (definition?.type !== "Variable") return false;
              return expressionIsSelected2dContext(
                definition.node.init,
                nextSeen,
                selectedBindings,
              );
            }
            const callPaintsOrExportsSelectedCanvas = (
              call,
              selectedBindings,
            ) => {
              const callee = unwrapExpression(call.callee);
              if (callee?.type !== "MemberExpression") return false;
              if (
                expressionIsSelected2dContext(
                  callee.object,
                  new Set(),
                  selectedBindings,
                )
              ) {
                return true;
              }
              return (
                canvasExportMethods.has(memberName(callee)) &&
                lookupTargetsCanvas(
                  lookupForExpression(callee.object, call.range[0]),
                )
              );
            };
            const selectedBindingsForCall = (
              call,
              implementation,
              inheritedBindings,
              activationNode = call,
            ) => {
              const selected = new Set();
              const selectedMembers = new Map();
              const addSelectedMember = (variable, name) => {
                if (!variable || name === undefined) return;
                const names = selectedMembers.get(variable) ?? new Set();
                names.add(name);
                selectedMembers.set(variable, names);
              };
              const addSelectedBindings = (parameter, argument) => {
                parameter = unwrapExpression(parameter);
                argument = unwrapExpression(argument);
                if (parameter?.type === "AssignmentPattern") {
                  addSelectedBindings(
                    parameter.left,
                    argument ?? parameter.right,
                  );
                  return;
                }
                if (parameter?.type === "Identifier") {
                  if (
                    expressionIsSelected2dContext(
                      argument,
                      new Set(),
                      inheritedBindings,
                    )
                  ) {
                    const variable = variableForIdentifier(parameter);
                    if (variable) selected.add(variable);
                  } else {
                    const variable = variableForIdentifier(parameter);
                    for (const name of selectedContextMemberNames(
                      argument,
                      new Set(),
                      inheritedBindings,
                      call,
                      activationNode,
                    )) {
                      addSelectedMember(variable, name);
                    }
                  }
                  return;
                }
                const resolvedArgument = expressionImplementation(argument);
                if (
                  resolvedArgument?.type === "ObjectExpression" ||
                  resolvedArgument?.type === "ArrayExpression"
                ) {
                  argument = resolvedArgument;
                }
                if (
                  parameter?.type === "ObjectPattern" &&
                  argument?.type === "ObjectExpression"
                ) {
                  for (const property of parameter.properties) {
                    if (property.type !== "Property") continue;
                    const name = propertyName(property);
                    const argumentProperty = argument.properties.find(
                      (candidate) =>
                        candidate.type === "Property" &&
                        propertyName(candidate) === name,
                    );
                    if (argumentProperty) {
                      addSelectedBindings(
                        property.value,
                        argumentProperty.value,
                      );
                    }
                  }
                  return;
                }
                if (
                  parameter?.type === "ArrayPattern" &&
                  argument?.type === "ArrayExpression"
                ) {
                  parameter.elements.forEach((element, index) => {
                    if (element && argument.elements[index]) {
                      addSelectedBindings(
                        element,
                        argument.elements[index],
                      );
                    }
                  });
                }
              };
              (implementation?.params ?? []).forEach((parameter, index) => {
                if (parameter.type === "RestElement") {
                  if (
                    call.arguments.slice(index).some(
                      (argument) =>
                        argument.type !== "SpreadElement" &&
                        expressionIsSelected2dContext(
                          argument,
                          new Set(),
                          inheritedBindings,
                        ),
                    )
                  ) {
                    const variable = variableForIdentifier(parameter.argument);
                    if (variable) selected.add(variable);
                  }
                  return;
                }
                const argument = call.arguments[index];
                if (argument?.type !== "SpreadElement") {
                  addSelectedBindings(parameter, argument);
                }
              });
              return {
                variables: selected,
                members: selectedMembers,
              };
            };
            const implementationCapturesStroke = (
              implementation,
              seen = new Set(),
              selectedBindings = {
                variables: new Set(),
                members: new Map(),
              },
              activationNode = implementation,
            ) => {
              if (!implementation?.range) return false;
              if (seen.has(implementation)) return false;
              const nextSeen = new Set(seen);
              nextSeen.add(implementation);
              return callExpressions.some((call) => {
                if (
                  call.range[0] < implementation.range[0] ||
                  call.range[1] > implementation.range[1]
                ) {
                  return false;
                }
                const callee = unwrapExpression(call.callee);
                return (
                  callPaintsOrExportsSelectedCanvas(
                    call,
                    selectedBindings,
                  )
                ) || (
                  (callee?.type === "Identifier" ||
                    callee?.type === "MemberExpression") &&
                  implementationCapturesStroke(
                    expressionImplementation(callee),
                    nextSeen,
                    selectedBindingsForCall(
                      call,
                      expressionImplementation(callee),
                      selectedBindings,
                      activationNode,
                    ),
                    activationNode,
                  )
                );
              });
            };
            const handlerCapturesStroke = (attribute) =>
              selected2dContextCalls.length > 0 &&
              implementationCapturesStroke(
                handlerImplementation(attribute),
                new Set(),
                emptySelectedBindings(),
                attribute,
              );
            const unknownMutatedStaticValue = {
              staticType: "unknown-mutated",
            };
            const staticValueWrites = [
              ...variableDeclarations.map((declaration) => ({
                node: declaration,
                target: declaration.id,
                value: declaration.init,
                initialization: true,
              })),
              ...assignmentExpressions.map((assignment) => ({
                node: assignment,
                target: unwrapExpression(assignment.left),
                value: assignment.right,
                initialization: false,
                operator: assignment.operator,
              })),
            ].sort((left, right) => left.node.range[0] - right.node.range[0]);
            const resolveStaticValue = (
              node,
              atNode,
            ) => {
              const atOffset =
                atNode?.range?.[0] ?? Number.POSITIVE_INFINITY;
              const state = new Map();
              const staticScalar = (value) => {
                if (
                  value?.type === "Literal" &&
                  (typeof value.value === "string" ||
                    typeof value.value === "number")
                ) {
                  return value.value;
                }
                return undefined;
              };
              const evaluate = (expression) => {
                expression = unwrapExpression(expression);
                if (
                  expression?.staticType === "object" ||
                  expression?.staticType === "array" ||
                  expression?.staticType === "alternatives" ||
                  expression?.staticType === "unknown-mutated"
                ) {
                  return expression;
                }
                if (expression?.type === "Identifier") {
                  return state.get(variableForIdentifier(expression));
                }
                if (
                  expression?.type === "Literal" ||
                  expression?.type === "TemplateLiteral"
                ) {
                  const value = staticStringExpression(expression);
                  return value === undefined
                    ? expression
                    : { type: "Literal", value };
                }
                if (
                  expression?.type === "BinaryExpression" &&
                  expression.operator === "+"
                ) {
                  const left = staticScalar(evaluate(expression.left));
                  const right = staticScalar(evaluate(expression.right));
                  return left === undefined || right === undefined
                    ? undefined
                    : { type: "Literal", value: String(left) + String(right) };
                }
                if (expression?.type === "MemberExpression") {
                  const container = evaluate(expression.object);
                  const key = expression.computed
                    ? staticScalar(evaluate(expression.property))
                    : expression.property.type === "Identifier"
                      ? expression.property.name
                      : undefined;
                  if (key === undefined || container === undefined) {
                    return undefined;
                  }
                  if (container.staticType === "unknown-mutated") {
                    return container;
                  }
                  if (container.staticType === "array") {
                    const index =
                      typeof key === "number"
                        ? key
                        : /^(?:0|[1-9]\d*)$/u.test(key)
                          ? Number(key)
                          : undefined;
                    if (index === undefined || !container.indexable) {
                      return container.mutationVersion > 0
                        ? unknownMutatedStaticValue
                        : undefined;
                    }
                    return (
                      container.elementVersions[index] ===
                      container.mutationVersion
                        ? container.elements[index]
                        : container.mutationVersion > 0
                          ? unknownMutatedStaticValue
                          : container.elements[index]
                    );
                  }
                  if (container.staticType !== "object") return undefined;
                  const name = String(key);
                  return (
                    container.propertyVersions.get(name) ===
                    container.mutationVersion
                      ? container.properties.get(name)
                      : container.mutationVersion > 0
                        ? unknownMutatedStaticValue
                        : container.properties.get(name)
                  );
                }
                if (expression?.type === "ObjectExpression") {
                  const properties = new Map();
                  const propertyVersions = new Map();
                  const propertyNodes = new Map();
                  let mutationVersion = 0;
                  let unknownNode;
                  for (const property of expression.properties) {
                    if (property.type === "SpreadElement") {
                      const spread = evaluate(property.argument);
                      if (spread?.staticType !== "object") {
                        mutationVersion += 1;
                        unknownNode = property;
                        continue;
                      }
                      if (spread.mutationVersion > 0) {
                        mutationVersion += 1;
                        unknownNode = spread.unknownNode ?? property;
                      }
                      for (const [name, value] of spread.properties) {
                        properties.set(
                          name,
                          spread.propertyVersions.get(name) ===
                            spread.mutationVersion
                            ? value
                            : unknownMutatedStaticValue,
                        );
                        propertyVersions.set(name, mutationVersion);
                        propertyNodes.set(
                          name,
                          spread.propertyNodes.get(name) ?? property,
                        );
                      }
                      continue;
                    }
                    const name = property.computed
                      ? staticScalar(evaluate(property.key))
                      : propertyName(property);
                    if (name === undefined) continue;
                    const value = evaluate(property.value);
                    properties.set(String(name), value);
                    propertyVersions.set(String(name), mutationVersion);
                    propertyNodes.set(String(name), property);
                  }
                  return {
                    staticType: "object",
                    properties,
                    propertyVersions,
                    propertyNodes,
                    mutationVersion,
                    unknownNode,
                  };
                }
                if (expression?.type === "ArrayExpression") {
                  const elements = [];
                  const elementVersions = [];
                  let indexable = true;
                  for (const element of expression.elements) {
                    if (element === null) {
                      elements.push(undefined);
                      elementVersions.push(0);
                    } else if (element.type === "SpreadElement") {
                      const spread = evaluate(element.argument);
                      if (
                        spread?.staticType !== "array" ||
                        !spread.indexable
                      ) {
                        indexable = false;
                      } else {
                        elements.push(...spread.elements);
                        elementVersions.push(
                          ...spread.elements.map(() => 0),
                        );
                      }
                    } else {
                      elements.push(evaluate(element));
                      elementVersions.push(0);
                    }
                  }
                  return {
                    staticType: "array",
                    elements,
                    elementVersions,
                    indexable,
                    mutationVersion: 0,
                  };
                }
                if (expression?.type === "SpreadElement") {
                  return evaluate(expression.argument);
                }
                if (expression?.type === "ConditionalExpression") {
                  return {
                    staticType: "alternatives",
                    values: [
                      evaluate(expression.consequent),
                      evaluate(expression.alternate),
                    ],
                  };
                }
                if (expression?.type === "SequenceExpression") {
                  return {
                    staticType: "alternatives",
                    values: expression.expressions.map(evaluate),
                  };
                }
                return undefined;
              };
              const mutateMember = (target, value) => {
                const container = evaluate(target.object);
                if (
                  container?.staticType !== "object" &&
                  container?.staticType !== "array"
                ) {
                  return;
                }
                const key = target.computed
                  ? staticScalar(evaluate(target.property))
                  : target.property.type === "Identifier"
                    ? target.property.name
                    : undefined;
                if (key === undefined) {
                  container.mutationVersion += 1;
                  return;
                }
                const resolvedValue =
                  value === undefined ? unknownMutatedStaticValue : value;
                if (container.staticType === "array") {
                  const index =
                    typeof key === "number"
                      ? key
                      : /^(?:0|[1-9]\d*)$/u.test(key)
                        ? Number(key)
                        : undefined;
                  if (index === undefined) {
                    container.mutationVersion += 1;
                    return;
                  }
                  container.elements[index] = resolvedValue;
                  container.elementVersions[index] =
                    container.mutationVersion;
                  return;
                }
                const name = String(key);
                container.properties.set(name, resolvedValue);
                container.propertyNodes.set(name, target);
                container.propertyVersions.set(
                  name,
                  container.mutationVersion,
                );
              };
              for (const write of staticValueWrites) {
                if (write.node.range[0] >= atOffset) break;
                if (write.target?.type === "Identifier") {
                  const variable = variableForIdentifier(write.target);
                  if (variable === undefined) continue;
                  const value =
                    write.operator !== undefined &&
                    (write.operator !== "=" ||
                      !isUnconditionalWriteAt(write.node, atNode))
                      ? undefined
                      : evaluate(write.value);
                  state.set(
                    variable,
                    !write.initialization && value === undefined
                      ? unknownMutatedStaticValue
                      : value,
                  );
                } else if (write.target?.type === "MemberExpression") {
                  mutateMember(
                    write.target,
                    write.operator === "=" &&
                      isUnconditionalWriteAt(write.node, atNode)
                      ? evaluate(write.value)
                      : undefined,
                  );
                }
              }
              return evaluate(node);
            };
            const stableVariableInitializer = (variable) => {
              const definition =
                variable?.defs.length === 1 ? variable.defs[0] : undefined;
              if (
                definition?.type !== "Variable" ||
                (definition.parent?.kind !== "const" &&
                  definition.parent?.kind !== "let")
              ) {
                return undefined;
              }
              if (
                definition.parent.kind === "let" &&
                variable.references.some(
                  (reference) =>
                    reference.isWrite() &&
                    reference.identifier !== definition.name,
                )
              ) {
                return undefined;
              }
              return definition;
            };
            const eventRegistrationBinding = (
              node,
              resolving = new Set(),
            ) => {
              node = unwrapExpression(node);
              if (isGlobalIdentifier(node, "addEventListener")) return [];
              if (node?.type === "MemberExpression") {
                return memberName(node) === "addEventListener" &&
                  (isWindowExpression(node.object) ||
                    isDocumentExpression(node.object))
                  ? []
                  : undefined;
              }
              if (node?.type === "CallExpression") {
                const callee = unwrapExpression(node.callee);
                if (
                  callee?.type !== "MemberExpression" ||
                  memberName(callee) !== "bind"
                ) {
                  return undefined;
                }
                const binding = eventRegistrationBinding(
                  callee.object,
                  resolving,
                );
                return binding === undefined
                  ? undefined
                  : [
                      ...binding,
                      ...node.arguments.slice(1).map((argument) => ({
                        node: argument,
                        atNode: node,
                      })),
                    ];
              }
              if (node?.type !== "Identifier") return undefined;
              const variable = variableForIdentifier(node);
              if (variable === undefined || resolving.has(variable)) {
                return undefined;
              }
              const definition = stableVariableInitializer(variable);
              if (definition === undefined) return undefined;
              if (
                definition.node.id.type === "ObjectPattern" &&
                (isWindowExpression(definition.node.init) ||
                  isDocumentExpression(definition.node.init))
              ) {
                return definition.node.id.properties.some(
                  (property) =>
                    property.type === "Property" &&
                    propertyName(property) === "addEventListener" &&
                    property.value === definition.name,
                )
                  ? []
                  : undefined;
              }
              if (definition.node.id.type !== "Identifier") return undefined;
              const nextResolving = new Set(resolving);
              nextResolving.add(variable);
              return eventRegistrationBinding(
                definition.node.init,
                nextResolving,
              );
            };
            const eventRegistrationArguments = (call) => {
              const callee = unwrapExpression(call.callee);
              const binding = eventRegistrationBinding(callee);
              if (binding !== undefined) {
                return [
                  ...binding,
                  ...call.arguments.map((argument) => ({
                    node: argument,
                    atNode: call,
                  })),
                ];
              }
              if (
                callee?.type === "MemberExpression" &&
                ["call", "apply"].includes(memberName(callee))
              ) {
                const calledBinding = eventRegistrationBinding(
                  callee.object,
                );
                if (calledBinding !== undefined) {
                  const argumentsNode =
                    memberName(callee) === "call"
                      ? call.arguments.slice(1)
                      : call.arguments.slice(1, 2);
                  return [
                    ...calledBinding,
                    ...argumentsNode.map((argument) => ({
                      node: argument,
                      atNode: call,
                    })),
                  ];
                }
              }
              if (
                callee?.type === "MemberExpression" &&
                isGlobalIdentifier(callee.object, "Reflect") &&
                memberName(callee) === "apply"
              ) {
                const appliedBinding = eventRegistrationBinding(
                  call.arguments[0],
                );
                if (appliedBinding !== undefined) {
                  return [
                    ...appliedBinding,
                    ...call.arguments.slice(2, 3).map((argument) => ({
                      node: argument,
                      atNode: call,
                    })),
                  ];
                }
              }
              return undefined;
            };
            const isGlobalObjectAssign = (call) => {
              const callee = unwrapExpression(call.callee);
              return (
                callee?.type === "MemberExpression" &&
                isGlobalIdentifier(callee.object, "Object") &&
                memberName(callee) === "assign" &&
                (isWindowExpression(call.arguments[0]) ||
                  isDocumentExpression(call.arguments[0]))
              );
            };
            const drawingHandlerProperties = (
              node,
              atNode,
            ) => {
              const value = resolveStaticValue(node, atNode);
              if (value?.staticType === "unknown-mutated") return [node];
              if (value?.staticType !== "object") return [];
              const properties = [];
              if (value.mutationVersion > 0) {
                properties.push(value.unknownNode ?? node);
              }
              for (const [name] of value.properties) {
                if (!isDrawingDomEvent(name)) continue;
                properties.push(
                  value.propertyVersions.get(name) ===
                    value.mutationVersion
                    ? value.propertyNodes.get(name) ?? node
                    : value.unknownNode ?? node,
                );
              }
              return [...new Set(properties)];
            };
            const argumentContainsDrawingEvent = (
              node,
              atNode,
            ) => {
              node = resolveStaticValue(node, atNode);
              if (node === undefined) return false;
              if (node.staticType === "unknown-mutated") return true;
              if (node.staticType === "alternatives") {
                return node.values.some(
                  (value) =>
                    value !== undefined &&
                    argumentContainsDrawingEvent(value, atNode),
                );
              }
              if (node.staticType === "array") {
                return node.elements.some(
                  (element) =>
                    element !== undefined &&
                    argumentContainsDrawingEvent(element, atNode),
                );
              }
              if (node.staticType === "object") {
                if (node.mutationVersion > 0) return true;
                return [...node.properties.values()].some((value) =>
                  argumentContainsDrawingEvent(value, atNode),
                );
              }
              const value = staticStringExpression(node);
              if (value !== undefined && isDrawingDomEvent(value)) {
                return true;
              }
              if (
                node?.type === "ConditionalExpression"
              ) {
                return (
                  argumentContainsDrawingEvent(
                    node.consequent,
                    atNode,
                  ) ||
                  argumentContainsDrawingEvent(
                    node.alternate,
                    atNode,
                  )
                );
              }
              if (node?.type === "SequenceExpression") {
                return node.expressions.some((expression) =>
                  argumentContainsDrawingEvent(expression, atNode),
                );
              }
              return false;
            };
            const firstRegistrationArgumentCouldDraw = (
              registrationArguments,
            ) => {
              const first = registrationArguments[0];
              if (!first) return false;
              const value = resolveStaticValue(first.node, first.atNode);
              if (value === undefined) return true;
              if (value.staticType === "unknown-mutated") return true;
              if (value.staticType === "alternatives") {
                return value.values.some(
                  (candidate) =>
                    candidate === undefined ||
                    argumentContainsDrawingEvent(candidate, first.atNode),
                );
              }
              if (value.staticType === "array") {
                const eventName = value.elements[0];
                return (
                  eventName === undefined ||
                  argumentContainsDrawingEvent(eventName, first.atNode)
                );
              }
              return argumentContainsDrawingEvent(value, first.atNode);
            };

            for (const call of callExpressions) {
              if (!isGlobalObjectAssign(call)) continue;
              for (const argument of call.arguments.slice(1)) {
                for (const property of drawingHandlerProperties(
                  argument,
                  call,
                )) {
                  reportForbidden(property);
                }
              }
            }
            for (const attribute of jsxAttributes) {
              if (
                attribute.name.type === "JSXIdentifier" &&
                isDrawingDomEvent(attribute.name.name) &&
                handlerCapturesStroke(attribute)
              ) {
                reportForbidden(attribute);
              }
            }

            for (const call of callExpressions) {
              const callee = unwrapExpression(call.callee);
              const registrationArguments =
                eventRegistrationArguments(call);
              if (
                registrationArguments &&
                firstRegistrationArgumentCouldDraw(registrationArguments)
              ) {
                reportForbidden(call);
                continue;
              }
              if (
                callee?.type !== "MemberExpression" ||
                memberName(callee) !== "addEventListener" ||
                !lookupTargetsCanvas(
                  lookupForExpression(callee.object, call.range[0]),
                )
              ) {
                continue;
              }
              const eventName = staticStringExpression(call.arguments[0]);
              if (
                eventName === undefined ||
                isDrawingDomEvent(eventName)
              ) {
                reportForbidden(call);
              }
            }

            for (const assignment of assignmentExpressions) {
              const target = unwrapExpression(assignment.left);
              const handlerName =
                target?.type === "MemberExpression"
                  ? memberName(target)
                  : undefined;
              if (
                target?.type === "MemberExpression" &&
                (isWindowExpression(target.object) ||
                  isDocumentExpression(target.object)) &&
                handlerName !== undefined &&
                isDrawingDomEvent(handlerName)
              ) {
                reportForbidden(assignment);
                continue;
              }
              if (
                target?.type !== "MemberExpression" ||
                !lookupTargetsCanvas(
                  lookupForExpression(target.object, assignment.range[0]),
                )
              ) {
                continue;
              }
              if (
                handlerName === undefined ||
                /^on(?:pointer|mouse|touch)/iu.test(handlerName)
              ) {
                reportForbidden(assignment);
              }
            }

            for (const expression of importExpressions) {
              const specifier = staticStringExpression(expression.source);
              if (
                specifier === "signature_pad" ||
                specifier?.startsWith("signature_pad/")
              ) {
                reportForbidden(expression, "forbiddenImport");
              }
            }
            const hasStrokeCaptureCall = callExpressions.some((call) => {
              const callee = unwrapExpression(call.callee);
              return (
                callee?.type === "MemberExpression" &&
                strokeCaptureMethods.has(memberName(callee))
              );
            });
            if (
              !hasForbiddenReport &&
              unprovenSelected2dContextCalls.length > 0 &&
              (hasStrokeCaptureCall || jsxOpeningElements.length === 0)
            ) {
              reportForbidden(unprovenSelected2dContextCalls[0]);
            }
          },
        };
      },
    },
  },
};

// The predeploy gate lints older app snapshots with this config; apps generated
// before the shortcut provider existed keep their raw key handlers.
const appHasShortcutProvider = fs.existsSync(
  path.join(process.cwd(), "src/components/shortcut-provider.tsx"),
);

const SHORTCUT_MESSAGE =
  "Register keyboard shortcuts with `useAppShortcut()` from `@/components/shortcut-provider`; no raw key listeners or react-hotkeys-hook.";

// Core `three` is allowed for procedural 3D scenes and games. Model files load
// only through the shared viewer, so loaders and other `three/*` subpaths stay
// in `src/lib/model-load.ts`.
const THREE_SUBPATH_MESSAGE =
  "Use the shared `@/components/model-viewer` control to show a model file; app code never imports three loaders or other `three/*` subpaths (core `three` is allowed for procedural scenes).";

// Saved query results are a dashboard feature: only `DashboardPage` (its
// `savedData` prop) starts the cache, so no other module imports it, statically
// or with `import()`.
const QUERY_CACHE_IMPORT_GROUP = ["**/query-cache", "**/query-cache.*"];
const QUERY_CACHE_MESSAGE =
  "Saved data is switched on only by `<DashboardPage savedData>`; app code never imports `@/lib/query-cache`.";

// Markdown from an agent or connector is untrusted; the shared control drops raw
// HTML, allowlists elements, sanitizes links and never fetches images.
// react-markdown hoists its whole pipeline into node_modules; app code may reach none of it.
const MARKDOWN_IMPORT_GROUP = [
  "react-markdown",
  "react-markdown/*",
  "remark-*",
  "rehype-*",
  "unified",
  "unified/*",
  "micromark",
  "micromark/*",
  "micromark-*",
  "mdast-util-*",
  "hast-util-*",
];
const MARKDOWN_PACKAGE_PATTERN =
  "/^(react-markdown|remark-[\\w-]+|rehype-[\\w-]+|unified|micromark(-[\\w-]+)?|mdast-util-[\\w-]+|hast-util-[\\w-]+)(\\/|$)/";
const MARKDOWN_MESSAGE =
  "Render Markdown with `<MarkdownText>` from `@/components/markdown-text`; app code never imports `react-markdown` or `remark-gfm` directly, nor the Markdown packages they pull in.";

const restrictedImportPatterns = [
  {
    group: ["framer-motion"],
    message:
      "Use `motion/react` instead (e.g. `import { motion, AnimatePresence } from \"motion/react\"`).",
  },
  {
    group: ["@radix-ui/react-*"],
    message:
      "Import Radix primitives from the unified `radix-ui` package (e.g. `import { Dialog } from \"radix-ui\"`), or use the vendored `@/components/ui/*` wrappers.",
  },
  {
    group: ["next", "next/*"],
    message:
      "This is a Vite SPA, not Next.js. Use react-router-dom for routing and plain modules — there is no `next` runtime.",
  },
  {
    group: ["redux", "react-redux", "jotai", "recoil"],
    message:
      "Use the pre-wired zustand store (`@/lib/store`) for shared state.",
  },
  {
    group: ["signature_pad", "signature_pad/*"],
    message:
      "Use the shared `@/components/pen-input` wrapper; app code never imports the drawing engine directly.",
  },
  {
    group: ["@zxing/library", "@zxing/library/*"],
    message:
      "Use the shared `@/components/barcode-scanner` wrapper; app code never imports the barcode decoder directly.",
  },
  {
    group: ["three/*"],
    message: THREE_SUBPATH_MESSAGE,
  },
  {
    group: ["leaflet", "leaflet/*"],
    message:
      "Use the protected `@/components/spatial-map` control instead of importing Leaflet directly.",
  },
  {
    group: QUERY_CACHE_IMPORT_GROUP,
    message: QUERY_CACHE_MESSAGE,
  },
  {
    group: MARKDOWN_IMPORT_GROUP,
    message: MARKDOWN_MESSAGE,
  },
  ...(appHasShortcutProvider
    ? [
        {
          group: ["react-hotkeys-hook"],
          message: SHORTCUT_MESSAGE,
        },
      ]
    : []),
];

const barcodeScanRestrictedImportPatterns = restrictedImportPatterns.filter(
  ({ group }) => !group.includes("@zxing/library"),
);

const modelViewerRestrictedImportPatterns = restrictedImportPatterns.filter(
  ({ group }) => !group.includes("three/*"),
);

const penInputRestrictedImportPatterns = restrictedImportPatterns.filter(
  ({ group }) => !group.includes("signature_pad"),
);
const spatialRestrictedImportPatterns = restrictedImportPatterns.filter(
  ({ group }) => !group.includes("leaflet"),
);
const markdownTextRestrictedImportPatterns = restrictedImportPatterns.filter(
  ({ group }) => group !== MARKDOWN_IMPORT_GROUP,
);
const queryCacheOwnerRestrictedImportPatterns = restrictedImportPatterns.map(
  (pattern) =>
    pattern.group === QUERY_CACHE_IMPORT_GROUP
      // The predeploy gate lints older app snapshots with this config, and
      // their locked query-cache.ts exports the switch under its earlier name.
      // Each snapshot's module exports only one of the two, so its type-check
      // still rejects the other.
      ? { ...pattern, allowImportNames: ["setQueryCacheEnabled", "startDashboardPageCache"] }
      : pattern,
);
const queryCacheTestRestrictedImportPatterns = restrictedImportPatterns.filter(
  ({ group }) => group !== QUERY_CACHE_IMPORT_GROUP,
);

const queryCacheDynamicImportRule = {
  selector:
    "ImportExpression[source.value=/query-cache(\\.[a-z]+)?$/], ImportExpression[source.quasis.0.value.raw=/query-cache/]",
  message: QUERY_CACHE_MESSAGE,
};

// The markdown owner imports statically, so the dynamic forms stay banned in every file,
// including the transport modules whose syntax block omits the base rules.
const markdownDynamicImportRules = [
  {
    selector: `ImportExpression[source.value=${MARKDOWN_PACKAGE_PATTERN}], ImportExpression[source.type='TemplateLiteral'][source.quasis.0.value.cooked=${MARKDOWN_PACKAGE_PATTERN}]`,
    message: MARKDOWN_MESSAGE,
  },
  {
    selector: `CallExpression[callee.name='require'][arguments.0.value=${MARKDOWN_PACKAGE_PATTERN}], CallExpression[callee.name='require'][arguments.0.type='TemplateLiteral'][arguments.0.quasis.0.value.cooked=${MARKDOWN_PACKAGE_PATTERN}]`,
    message: MARKDOWN_MESSAGE,
  },
];

const baseRestrictedSyntaxRules = [
  queryCacheDynamicImportRule,
  ...markdownDynamicImportRules,
  {
    selector:
      "MemberExpression[object.name='window'][property.name=/^(parent|top)$/]",
    message:
      "Parent-frame access is restricted to the locked console-capture and Cowork transport modules.",
  },
  {
    selector:
      "CallExpression[callee.name='postMessage'], CallExpression[callee.property.name='postMessage']",
    message:
      "postMessage is restricted to the locked console-capture and Cowork transport modules.",
  },
];

const penInputRestrictedSyntaxRules = [
  {
    selector:
      "ImportExpression[source.value='signature_pad'], ImportExpression[source.value=/^signature_pad\\//]",
    message:
      "Use the shared `@/components/pen-input` wrapper; app code never imports the drawing engine directly.",
  },
  {
    selector:
      "CallExpression[callee.name='require'][arguments.0.value='signature_pad'], CallExpression[callee.name='require'][arguments.0.value=/^signature_pad\\//]",
    message:
      "Use the shared `@/components/pen-input` wrapper; app code never imports the drawing engine directly.",
  },
];

const barcodeScanRestrictedSyntaxRules = [
  {
    selector:
      "ImportExpression[source.value=/^@zxing\\/library(\\/|$)/]",
    message:
      "Use the shared `@/components/barcode-scanner` wrapper; app code never imports the barcode decoder directly.",
  },
  {
    selector:
      "CallExpression[callee.name='require'][arguments.0.value=/^@zxing\\/library(\\/|$)/]",
    message:
      "Use the shared `@/components/barcode-scanner` wrapper; app code never imports the barcode decoder directly.",
  },
];

const modelViewerRestrictedSyntaxRules = [
  {
    selector: "ImportExpression[source.value=/^three\\//], ImportExpression[source.type='TemplateLiteral'][source.quasis.0.value.cooked=/^three\\//]",
    message: THREE_SUBPATH_MESSAGE,
  },
  {
    selector:
      "CallExpression[callee.name='require'][arguments.0.value=/^three\\//], CallExpression[callee.name='require'][arguments.0.type='TemplateLiteral'][arguments.0.quasis.0.value.cooked=/^three\\//]",
    message: THREE_SUBPATH_MESSAGE,
  },
];

// Keyboard input goes through the shortcut provider. The provider, the vendored
// ui/ wrappers and the spatial map own their raw key handling and are exempted
// below by re-listing `no-restricted-syntax` without these rules.
const shortcutRestrictedSyntaxRules = [
  {
    selector:
      "CallExpression[callee.property.name='addEventListener'][arguments.0.value=/^key(down|up|press)$/]",
    message: SHORTCUT_MESSAGE,
  },
  {
    selector:
      "CallExpression[callee.name='addEventListener'][arguments.0.value=/^key(down|up|press)$/]",
    message: SHORTCUT_MESSAGE,
  },
  {
    selector:
      "AssignmentExpression[left.type='MemberExpression'][left.property.name=/^onkey(down|up|press)$/]",
    message: SHORTCUT_MESSAGE,
  },
  {
    selector: "JSXAttribute[name.name=/^onKey(Down|Up|Press)(Capture)?$/]",
    message: SHORTCUT_MESSAGE,
  },
  {
    selector: "ImportExpression[source.value='react-hotkeys-hook']",
    message: SHORTCUT_MESSAGE,
  },
  {
    // Plain keys (j, k, n, enter, `shift+x`) throw in dev and are dropped in prod unless scoped; catch them at lint time.
    selector:
      "CallExpression[callee.name='useAppShortcut']" +
      ":matches([arguments.0.property.name=/^(nextItem|previousItem|openItem|newItem|focusSearch)$/], [arguments.0.value=/^(shift\\+)?[^+]+$/i])" +
      ":not([arguments.0.value=/^(shift\\+)?f([1-9]|1[0-9]|2[0-4])$/i])" +
      ":matches(:not([arguments.2]), [arguments.2.type='ObjectExpression'])" +
      ":not(:has(> ObjectExpression.arguments:nth-child(3):has(> Property.properties[key.name='scope'])))",
    message:
      "Plain-key `useAppShortcut()` needs `{ scope }` from `useShortcutScope()` (nextItem/previousItem/openItem/newItem/focusSearch are plain keys).",
  },
];

// Flat config (ESLint 9). Standard Vite + React + TypeScript setup.
// `generated/` is excluded — it is autogenerated by the managed-apps `ms` CLI.
export default tseslint.config(
  {
    ignores: [
      "dist",
      "node_modules",
      "generated",
      ".vite-cache",
      "*.timestamp-*.mjs",
    ],
  },
  {
    linterOptions: {
      noInlineConfig: true,
      reportUnusedDisableDirectives: "error",
    },
  },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{js,jsx,mjs,cjs,ts,tsx,mts,cts}"],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    plugins: {
      "aether-app": rawDrawingCanvasPlugin,
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
      // Make the "use the installed package, not the familiar-but-wrong one"
      // guidance enforceable instead of prose-only. These specifiers resolve
      // transitively (e.g. framer-motion via motion, @radix-ui/react-* via the
      // unified radix-ui package), so without this rule a wrong import would
      // type-check and build cleanly — then drift from the template's intent.
      // `bun run check` runs lint, so this fails the check.
      "no-restricted-imports": [
        "error",
        {
          patterns: restrictedImportPatterns,
        },
      ],
      "no-restricted-syntax": [
        "error",
        ...baseRestrictedSyntaxRules,
        ...penInputRestrictedSyntaxRules,
        ...barcodeScanRestrictedSyntaxRules,
        ...modelViewerRestrictedSyntaxRules,
        ...(appHasShortcutProvider ? shortcutRestrictedSyntaxRules : []),
      ],
      "aether-app/no-raw-drawing-canvas": "error",
      "aether-app/no-direct-leaflet": "error",
      "aether-app/no-import-cycle": "error",
      "aether-app/no-utc-date-parts": "error",
    },
  },
  {
    files: ["src/lib/model-load.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: modelViewerRestrictedImportPatterns,
        },
      ],
      "no-restricted-syntax": [
        "error",
        ...baseRestrictedSyntaxRules,
        ...penInputRestrictedSyntaxRules,
        ...barcodeScanRestrictedSyntaxRules,
        ...(appHasShortcutProvider ? shortcutRestrictedSyntaxRules : []),
      ],
    },
  },
  {
    files: ["src/components/model-viewer.tsx"],
    rules: {
      // WebGL render surface owned by the three.js renderer; nothing is drawn with a 2D context.
      "aether-app/no-raw-drawing-canvas": "off",
      // The focused canvas owns its arrow/+/- camera keys, like the spatial map
      // owns its own; every other restriction still applies.
      "no-restricted-syntax": [
        "error",
        ...baseRestrictedSyntaxRules,
        ...penInputRestrictedSyntaxRules,
        ...barcodeScanRestrictedSyntaxRules,
        ...modelViewerRestrictedSyntaxRules,
      ],
    },
  },
  {
    files: ["src/components/markdown-text.tsx"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: markdownTextRestrictedImportPatterns,
        },
      ],
    },
  },
  {
    files: ["src/components/agent-chat.tsx"],
    rules: {
      // The focused composer owns Enter (send) and Shift+Enter (newline), and the
      // open image lightbox owns Escape (close), the way a text field or dialog
      // owns its own keys; every other restriction still applies.
      "no-restricted-syntax": [
        "error",
        ...baseRestrictedSyntaxRules,
        ...penInputRestrictedSyntaxRules,
        ...barcodeScanRestrictedSyntaxRules,
        ...modelViewerRestrictedSyntaxRules,
      ],
    },
  },
  {
    files: ["src/lib/barcode-scan.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: barcodeScanRestrictedImportPatterns,
        },
      ],
      "no-restricted-syntax": [
        "error",
        ...baseRestrictedSyntaxRules,
        ...penInputRestrictedSyntaxRules,
        ...modelViewerRestrictedSyntaxRules,
        ...(appHasShortcutProvider ? shortcutRestrictedSyntaxRules : []),
      ],
      // Off-screen decode buffer for zxing-js (iOS < 16.4 has no OffscreenCanvas); never drawn on screen.
      "aether-app/no-raw-drawing-canvas": "off",
    },
  },
  {
    files: [
      "src/components/pen-input.tsx",
      "src/components/pdf-viewer.tsx",
      "src/lib/pdf-export.ts",
      ".aether-container-tests/support/pen-input-package-smoke.ts",
    ],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: penInputRestrictedImportPatterns,
        },
      ],
      "no-restricted-syntax": [
        "error",
        ...baseRestrictedSyntaxRules,
        ...barcodeScanRestrictedSyntaxRules,
        ...modelViewerRestrictedSyntaxRules,
      ],
      "aether-app/no-raw-drawing-canvas": "off",
    },
  },
  {
    files: [
      ".aether-container-tests/pen-input.test.tsx",
      ".aether-container-tests/support/field-service-pen-input-smoke.ts",
    ],
    rules: {
      "aether-app/no-raw-drawing-canvas": "off",
    },
  },
  {
    // The camera bridge paints host camera frames onto an offscreen canvas for
    // captureStream; nothing draws on it from user input.
    files: ["src/lib/preview-camera-bridge.ts"],
    rules: {
      "aether-app/no-raw-drawing-canvas": "off",
    },
  },
  {
    files: [
      "src/lib/console-capture.ts",
      "src/lib/cowork-parent-transport.ts",
      "src/lib/app-mounted-transport.ts",
      "src/lib/app-view-transport.ts",
      "src/lib/preview-camera-bridge.ts",
    ],
    rules: {
      // Defense-in-depth for direct literal calls. The Python source-contract
      // guard pins the variable-backed runtime sender to its exact origin set.
      "no-restricted-syntax": [
        "error",
        ...markdownDynamicImportRules,
        {
          selector:
            "CallExpression[callee.name='postMessage'] Literal[value='*'], CallExpression[callee.property.name='postMessage'] Literal[value='*']",
          message:
            "Parent-frame messages must not use a direct wildcard target-origin literal.",
        },
      ],
    },
  },
  {
    files: [
      "src/components/spatial-map.tsx",
      "src/components/internal/spatial-tile-layer.ts",
    ],
    rules: {
      // These protected files own Leaflet, but every unrelated import boundary
      // remains enforced.
      "aether-app/no-direct-leaflet": "off",
      "no-restricted-imports": [
        "error",
        {
          patterns: spatialRestrictedImportPatterns,
        },
      ],
      "no-restricted-syntax": [
        "error",
        ...baseRestrictedSyntaxRules,
        ...penInputRestrictedSyntaxRules,
        ...modelViewerRestrictedSyntaxRules,
      ],
    },
  },
  {
    // The protected integration tests are the only non-owner modules allowed to
    // load Leaflet directly; generated app source remains covered by both the
    // static-import and dynamic-import restrictions above.
    files: [
      ".aether-container-tests/spatial-map.test.ts",
      ".aether-container-tests/support/spatial-browser-proof.tsx",
    ],
    rules: {
      "aether-app/no-direct-leaflet": "off",
      "no-restricted-imports": [
        "error",
        {
          patterns: spatialRestrictedImportPatterns,
        },
      ],
      "no-restricted-syntax": [
        "error",
        ...baseRestrictedSyntaxRules,
        ...penInputRestrictedSyntaxRules,
        ...modelViewerRestrictedSyntaxRules,
      ],
    },
  },
  {
    // DashboardPage is the one module that starts the query cache, and only
    // through `setQueryCacheEnabled`; the cache's other exports stay out of
    // reach of app code.
    files: ["src/components/dashboard/dashboard-grid.tsx"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: queryCacheOwnerRestrictedImportPatterns,
        },
      ],
    },
  },
  {
    // The protected query-cache tests drive the module directly.
    files: [
      ".aether-container-tests/query-cache.test.ts",
      ".aether-container-tests/query-cache-wiring.test.ts",
    ],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: queryCacheTestRestrictedImportPatterns,
        },
      ],
      "no-restricted-syntax": [
        "error",
        ...baseRestrictedSyntaxRules.filter(
          (rule) => rule !== queryCacheDynamicImportRule,
        ),
        ...penInputRestrictedSyntaxRules,
        ...barcodeScanRestrictedSyntaxRules,
        ...modelViewerRestrictedSyntaxRules,
        ...(appHasShortcutProvider ? shortcutRestrictedSyntaxRules : []),
      ],
    },
  },
  {
    // shadcn/ui components are vendored + pre-installed (the agent must not edit
    // them). They intentionally co-export a component plus its `cva` variants
    // (e.g. `buttonVariants`), which trips react-refresh. Silence the rule for the
    // ui/ directory only — it stays active for the agent's own pages/components.
    files: ["src/components/ui/**/*.{ts,tsx}"],
    rules: {
      "react-refresh/only-export-components": "off",
    },
  },
  {
    // Raw key handling is owned by the shortcut provider and the vendored ui/
    // wrappers; the other syntax restrictions stay on.
    files: [
      "src/components/shortcut-provider.tsx",
      "src/components/ui/**/*.{ts,tsx}",
    ],
    rules: {
      "no-restricted-syntax": [
        "error",
        ...baseRestrictedSyntaxRules,
        ...penInputRestrictedSyntaxRules,
        ...modelViewerRestrictedSyntaxRules,
      ],
    },
  },
  {
    // The provider listens for document pointer-downs to clear the active
    // scope; that is not a drawing surface. Inline disables are off
    // (noInlineConfig), so the exemption lives here, scoped to this one file.
    files: ["src/components/shortcut-provider.tsx"],
    rules: {
      "aether-app/no-raw-drawing-canvas": "off",
      "react-refresh/only-export-components": "off",
    },
  },
  {
    // TanStack's `ColumnMeta<TData, TValue>` is augmented here to type a
    // DashboardTable column's `meta.format`; a module augmentation must repeat
    // the interface's type parameters, which it does not use. Scoped to this
    // one file (noInlineConfig); the rule stays on for the agent's own code.
    files: ["src/lib/dashboard-table-format.ts"],
    rules: {
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
  {
    // `vite-dev-reload.ts` is inlined scaffold infra (the SSE dev-reload Vite
    // plugin — the agent must not edit it). It intercepts Vite's internal HMR
    // WebSocket payloads and Connect-style req/res objects, which are untyped,
    // and uses best-effort empty `catch {}` blocks around fire-and-forget
    // broadcasts. Silence `no-explicit-any` / `no-empty` for this one file —
    // both stay active for the agent's own code.
    files: ["vite-dev-reload.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "no-empty": "off",
    },
  }
);
