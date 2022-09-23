// import * as ts from "typescript";
// import * as fs from "fs";

// interface DocEntry {
// 	name?: string;
// 	fileName?: string;
// 	documentation?: string;
// 	type?: string;
// 	constructors?: DocEntry[];
// 	parameters?: DocEntry[];
// 	returnType?: string;
// }

// /** Generate documentation for all classes in a set of .ts files */
// export function generateDocumentation(
// 	fileNames: string[],
// 	options: ts.CompilerOptions
// ): void {
// 	// Build a program using the set of root file names in fileNames
// 	const program = ts.createProgram(fileNames, options);

// 	// Get the checker, we will use it to find more about classes
// 	const checker = program.getTypeChecker();
// 	const output: DocEntry[] = [];

// 	// Visit every sourceFile in the program
// 	for (const sourceFile of program.getSourceFiles()) {
// 		if (!sourceFile.isDeclarationFile) {
// 			// Walk the tree to search for classes
// 			ts.forEachChild(sourceFile, visit);
// 		}
// 	}

// 	// print out the doc
// 	fs.writeFileSync("classes.json", JSON.stringify(output, undefined, 4));

// 	return;

// 	/** visit nodes finding exported classes */
// 	function visit(node: ts.Node) {
// 		// Only consider exported nodes
// 		if (!isNodeExported(node)) {
// 			return;
// 		}

// 		if (ts.isClassDeclaration(node) && node.name) {
// 			// This is a top level class, get its symbol
// 			const symbol = checker.getSymbolAtLocation(node.name);
// 			if (symbol) {
// 				output.push(serializeClass(symbol));
// 			}
// 			// No need to walk any further, class expressions/inner declarations
// 			// cannot be exported
// 		} else if (ts.isModuleDeclaration(node)) {
// 			// This is a namespace, visit its children
// 			ts.forEachChild(node, visit);
// 		}
// 	}

// 	/** Serialize a symbol into a json object */
// 	function serializeSymbol(symbol: ts.Symbol): DocEntry {
// 		return {
// 			name: symbol.getName(),
// 			documentation: ts.displayPartsToString(
// 				symbol.getDocumentationComment(checker)
// 			),
// 			type: checker.typeToString(
// 				checker.getTypeOfSymbolAtLocation(symbol, symbol.valueDeclaration!)
// 			)
// 		};
// 	}

// 	/** Serialize a class symbol information */
// 	function serializeClass(symbol: ts.Symbol) {
// 		const details = serializeSymbol(symbol);

// 		// Get the construct signatures
// 		const constructorType = checker.getTypeOfSymbolAtLocation(
// 			symbol,
// 			symbol.valueDeclaration!
// 		);
// 		details.constructors = constructorType
// 			.getConstructSignatures()
// 			.map(serializeSignature);
// 		return details;
// 	}

// 	/** Serialize a signature (call or construct) */
// 	function serializeSignature(signature: ts.Signature) {
// 		return {
// 			parameters: signature.parameters.map(serializeSymbol),
// 			returnType: checker.typeToString(signature.getReturnType()),
// 			documentation: ts.displayPartsToString(
// 				signature.getDocumentationComment(checker)
// 			)
// 		};
// 	}

// 	/** True if this is visible outside this file, false otherwise */
// 	function isNodeExported(node: ts.Node): boolean {
// 		return (
// 			(ts.getCombinedModifierFlags(node as ts.Declaration) &
// 				ts.ModifierFlags.Export) !==
// 			0 ||
// 			(!!node.parent && node.parent.kind === ts.SyntaxKind.SourceFile)
// 		);
// 	}
// }

import ts = require("typescript");
import { CustomTSClass } from "./parsing/classes/CustomTSClass";

function watchMain(folderPath: string) {
	const configPath = ts.findConfigFile(folderPath, ts.sys.fileExists, "tsconfig.json");
	if (!configPath) {
		throw new Error("Could not find a valid 'tsconfig.json'.");
	}

	const host = ts.createWatchCompilerHost(
		configPath,
		{},
		ts.sys,
		ts.createSemanticDiagnosticsBuilderProgram //,
		// diagnostic => {
		// 	console.log(ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"));
		// }
	);

	const origCreateProgram = host.createProgram;
	host.createProgram = (rootNames, options, host, oldProgram, configFileParsingDiagnostics, projectReferences) => {
		console.log("** We're about to create the program! **");
		return origCreateProgram(rootNames, options, host, oldProgram, configFileParsingDiagnostics, projectReferences);
	};
	const origPostProgramCreate = host.afterProgramCreate;

	host.afterProgramCreate = builderProgram => {
		console.log("** We finished making the program! **");
		const program = builderProgram.getProgram();
		const typeChecker = program.getTypeChecker();

		const sourceFiles = builderProgram.getSourceFiles();
		const tsSourceFiles = sourceFiles.filter(sourceFile => !sourceFile.fileName.endsWith(".d.ts"));
		// const sourceFile = sourceFiles.find(file => file.fileName.endsWith("Component.ts"));
		// const modules = typeChecker.getAmbientModules();
		const UIClasses = tsSourceFiles

			.map(sourceFile => {
				const symbol = sourceFile && typeChecker.getSymbolAtLocation(sourceFile);
				if (symbol) {
					const exports = typeChecker.getExportsOfModule(symbol);
					// const classDeclaration = exports.find(
					// 	statement =>
					// 		statement.escapedName === "default" && ts.isExportDeclaration(statement)
					// );
					const statement = sourceFile.statements.find(statement => ts.isClassDeclaration(statement));
					const classDeclaration = statement && ts.isClassDeclaration(statement) ? statement : undefined;
					return classDeclaration && new CustomTSClass(classDeclaration, sourceFile, typeChecker);
					// const properties: ts.PropertyDeclaration[] = classDeclaration.members.filter((member) => ts.isPropertyDeclaration(member) && ts.isIdentifier(member.name));
					// const methods: ts.MethodDeclaration[] = classDeclaration.members.filter((member) => ts.isMethodDeclaration(member) && ts.isIdentifier(member.name));
				}
			})
			.filter(theClass => !!theClass)
			.map(theClass => theClass as CustomTSClass);
		debugger;
		origPostProgramCreate?.(builderProgram);
	};

	const program = ts.createWatchProgram(host);
}

export = watchMain;
