import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

function walk(directory) {
	const entries = readdirSync(directory, { withFileTypes: true });
	const files = [];

	for (const entry of entries) {
		const path = join(directory, entry.name);

		if (entry.isDirectory()) {
			files.push(...walk(path));
			continue;
		}

		if (entry.isFile()) {
			files.push(path);
		}
	}

	return files;
}

function cleanGeneratedJavaScript(directory) {
	for (const filePath of walk(directory)) {
		if (!filePath.endsWith(".js")) {
			continue;
		}

		if (!existsSync(filePath.slice(0, -3) + ".ts")) {
			continue;
		}

		rmSync(filePath);
	}
}

function convertImportStatement(specifier, source) {
	const namedImport = /^\{(?<names>.*)\}$/u.exec(specifier);
	if (namedImport?.groups?.names !== undefined) {
		const names = namedImport.groups.names
			.split(",")
			.map((name) => name.trim())
			.filter(Boolean)
			.map((name) => name.replace(/\s+as\s+/u, ": "))
			.join(", ");

		return `const { ${names} } = require(${JSON.stringify(source)});`;
	}

	const namespaceImport = /^\*\s+as\s+(?<name>[A-Za-z_$][\w$]*)$/u.exec(specifier);
	if (namespaceImport?.groups?.name !== undefined) {
		return `const ${namespaceImport.groups.name} = require(${JSON.stringify(source)});`;
	}

	const defaultAndNamedImport = /^(?<defaultName>[A-Za-z_$][\w$]*)\s*,\s*\{(?<names>.*)\}$/su.exec(specifier);
	if (defaultAndNamedImport?.groups !== undefined) {
		const moduleName = `_module_${defaultAndNamedImport.groups.defaultName}`;
		const names = defaultAndNamedImport.groups.names
			.split(",")
			.map((name) => name.trim())
			.filter(Boolean)
			.map((name) => name.replace(/\s+as\s+/u, ": "))
			.join(", ");

		return [
			`const ${moduleName} = require(${JSON.stringify(source)});`,
			`const ${defaultAndNamedImport.groups.defaultName} = ${moduleName}.default ?? ${moduleName};`,
			`const { ${names} } = ${moduleName};`,
		].join("\n");
	}

	if (/^[A-Za-z_$][\w$]*$/u.test(specifier)) {
		return `const ${specifier} = require(${JSON.stringify(source)});`;
	}

	return null;
}

function rewriteImports(filePath) {
	const source = readFileSync(filePath, "utf8");
	const sourceFilePath = filePath.slice(0, -3) + ".ts";
	if (!existsSync(sourceFilePath)) {
		return;
	}

	const rewritten = source.replace(
		/^([ \t]*)import\s+(.+?)\s+from\s+(["'])(.+?)\3;?$/gmu,
		(match, indent, specifier, _quote, sourcePath) => {
			const replacement = convertImportStatement(specifier.trim(), sourcePath);
			if (replacement === null) {
				return match;
			}

			return replacement
				.split("\n")
				.map((line) => `${indent}${line}`)
				.join("\n");
		}
	);

	if (rewritten !== source) {
		writeFileSync(filePath, rewritten, "utf8");
	}
}

const examplesDirectory = process.cwd();

cleanGeneratedJavaScript(examplesDirectory);
execFileSync("sucrase", [".", "--out-dir", ".", "--transforms", "typescript"], {
	cwd: examplesDirectory,
	stdio: "inherit",
});

for (const filePath of walk(examplesDirectory)) {
	if (filePath.endsWith(".js")) {
		rewriteImports(filePath);
	}
}