import { WorkspaceFolder } from "ui5plugin-parser/dist/classes/UI5Classes/abstraction/WorkspaceFolder";
import * as path from "path";
import * as fs from "fs";
import { PackageParserConfigHandler } from "ui5plugin-parser/dist/classes/config/PackageParserConfigHandler";
import { IParserConfigHandler } from "ui5plugin-parser/dist/classes/config/IParserConfigHandler";
import { AcornSyntaxAnalyzer } from "ui5plugin-parser/dist/classes/UI5Classes/JSParser/AcornSyntaxAnalyzer";
import { IFileReader } from "ui5plugin-parser/dist/classes/utils/IFileReader";
import { ISyntaxAnalyser } from "ui5plugin-parser/dist/classes/UI5Classes/JSParser/ISyntaxAnalyser";
import { TSClassFactory } from "./TSClassFactory";
import { TSFileReader } from "./TSFileReader";
import { Project, SourceFile, ts } from "ts-morph";

interface IConstructorParams {
	fileReader?: TSFileReader;
	classFactory?: TSClassFactory;
	configHandler?: IParserConfigHandler;
}

export class UI5TSParser {
	private static _instance?: UI5TSParser;
	readonly configHandler: IParserConfigHandler;

	readonly classFactory: TSClassFactory;
	readonly fileReader: IFileReader;
	readonly syntaxAnalyser: ISyntaxAnalyser;
	readonly tsProjects: Project[] = [];
	getProject(fsPath: string) {
		return this.tsProjects.find(tsProject => {
			const [rootDirectory] = tsProject.getRootDirectories();
			return (
				!!tsProject.getSourceFile(fsPath) ||
				(rootDirectory && path.normalize(fsPath).includes(path.normalize(rootDirectory.getPath())))
			);
		});
	}

	private constructor(params?: IConstructorParams) {
		this.syntaxAnalyser = new AcornSyntaxAnalyzer();
		this.classFactory = params?.classFactory || new TSClassFactory();
		this.configHandler = params?.configHandler || new PackageParserConfigHandler();
		this.fileReader = params?.fileReader || new TSFileReader(this.configHandler, this.classFactory);

		return this;
	}

	public static getInstance(params?: IConstructorParams) {
		if (!UI5TSParser._instance) {
			UI5TSParser._instance = new UI5TSParser(params);
		}

		return UI5TSParser._instance;
	}

	public async initialize(
		wsFolders = [new WorkspaceFolder(process.cwd())],
		globalStoragePath = path.join(__dirname, "./node_modules/.cache/ui5plugin")
	) {
		this.fileReader.globalStoragePath = globalStoragePath;
		await this._preloadAllNecessaryData(wsFolders);
	}

	processSourceFiles(project: Project, changedFiles: SourceFile[]) {
		const program = project.getProgram();
		const tsSourceFiles = changedFiles.filter(sourceFile => !sourceFile.compilerNode.fileName.endsWith(".d.ts"));
		tsSourceFiles.forEach(sourceFile => {
			const className = UI5TSParser.getInstance().fileReader.getClassNameFromPath(
				sourceFile.compilerNode.fileName
			);
			const typeChecker = program.getTypeChecker();
			const symbol = sourceFile && typeChecker.getSymbolAtLocation(sourceFile);
			if (symbol && className) {
				const exports = typeChecker.getExportsOfModule(symbol);
				const theExport = exports.find(
					theExport =>
						theExport.compilerSymbol.escapedName === "default" &&
						theExport.getDeclarations().find(declaration => ts.isClassDeclaration(declaration.compilerNode))
				);
				const classDeclaration = theExport
					?.getDeclarations()
					?.find(declaration => ts.isClassDeclaration(declaration.compilerNode));
				if (classDeclaration && ts.isClassDeclaration(classDeclaration.compilerNode)) {
					this.classFactory.setNewCodeForClass(
						className,
						sourceFile.getFullText(),
						false,
						sourceFile,
						project,
						false
					);
				}
			}
		});
	}

	public clearCache(globalStoragePath = path.join(__dirname, "./node_modules/.cache/ui5plugin")) {
		fs.rmSync(globalStoragePath, {
			force: true,
			recursive: true
		});
	}

	private async _preloadAllNecessaryData(wsFolders: WorkspaceFolder[]) {
		await this._preloadUI5Metadata();
		this.fileReader.rereadAllManifests(wsFolders);
		this.fileReader.readAllFiles(wsFolders);
		// wsFolders.forEach(wsFolder => {
		const wsFolder = wsFolders[0];
		if (wsFolder) {
			this._initializeTS(wsFolder.fsPath);
		}
		// });
	}

	_initializeTS(folderPath: string) {
		const configPath = ts.findConfigFile(folderPath, ts.sys.fileExists, "tsconfig.json");
		if (!configPath) {
			throw new Error("Could not find a valid 'tsconfig.json'.");
		}
		const project = new Project({
			tsConfigFilePath: configPath
		});
		this.tsProjects.push(project);

		const aSourceFiles = project.getSourceFiles();
		const tsSourceFiles = aSourceFiles.filter(sourceFile => !sourceFile.compilerNode.fileName.endsWith(".d.ts"));
		this.processSourceFiles(project, tsSourceFiles);
	}

	private async _preloadUI5Metadata() {
		const { URLBuilder } = await import("ui5plugin-parser/dist/classes/utils/URLBuilder");
		URLBuilder.getInstance(this.configHandler);
		const { SAPNodeDAO } = await import("ui5plugin-parser/dist/classes/librarydata/SAPNodeDAO");
		const _nodeDAO = new SAPNodeDAO();
		const SAPNodes = await _nodeDAO.getAllNodes();
		const { SAPIcons } = await import("ui5plugin-parser/dist/classes/UI5Classes/SAPIcons");
		const { UI5MetadataPreloader } = await import("ui5plugin-parser/dist/classes/librarydata/UI5MetadataDAO");
		const metadataPreloader = new UI5MetadataPreloader(SAPNodes);
		await Promise.all([metadataPreloader.preloadLibs(), SAPIcons.preloadIcons()]);
	}
}
