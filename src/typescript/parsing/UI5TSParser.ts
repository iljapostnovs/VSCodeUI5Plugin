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

interface IConstructorParams {
	fileReader?: TSFileReader,
	classFactory?: TSClassFactory,
	configHandler?: IParserConfigHandler
}

export class UI5TSParser {
	private static _instance?: UI5TSParser;
	readonly configHandler: IParserConfigHandler;

	readonly classFactory: TSClassFactory;
	readonly fileReader: IFileReader;
	readonly syntaxAnalyser: ISyntaxAnalyser;
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

	public async initialize(wsFolders = [new WorkspaceFolder(process.cwd())], globalStoragePath = path.join(__dirname, "./node_modules/.cache/ui5plugin")) {
		this.fileReader.globalStoragePath = globalStoragePath;
		await this._preloadAllNecessaryData(wsFolders);
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
		await Promise.all([
			metadataPreloader.preloadLibs(),
			SAPIcons.preloadIcons()
		]);
	}
}