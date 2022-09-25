import ts = require("typescript");
import { UI5TSParser } from "./parsing/UI5TSParser";

function initializeTS(folderPath: string) {
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
		origPostProgramCreate?.(builderProgram);
	};

	const program = ts.createWatchProgram(host);
	const aSourceFiles = program.getProgram().getSourceFiles();
	const tsSourceFiles = aSourceFiles.filter(sourceFile => !sourceFile.fileName.endsWith(".d.ts"));
	tsSourceFiles.forEach(sourceFile => {
		const className = UI5TSParser.getInstance().fileReader.getClassNameFromPath(sourceFile.fileName);
		const typeChecker = program.getProgram().getProgram().getTypeChecker();
		const symbol = sourceFile && typeChecker.getSymbolAtLocation(sourceFile);
		if (symbol && className) {
			// const exports = typeChecker.getExportsOfModule(symbol);
			// const classDeclaration = exports.find(
			// 	statement =>
			// 		statement.escapedName === "default" && ts.isExportDeclaration(statement)
			// );
			const statement = sourceFile.statements.find(statement => ts.isClassDeclaration(statement));
			const classDeclaration = statement && ts.isClassDeclaration(statement) ? statement : undefined;
			UI5TSParser.getInstance().classFactory.setNewCodeForClass(
				className,
				sourceFile.getFullText(),
				false,
				classDeclaration,
				sourceFile,
				typeChecker,
				false
			);
		}
	});
}

export = initializeTS;
