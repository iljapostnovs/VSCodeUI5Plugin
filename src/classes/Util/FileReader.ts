import * as fs from "fs";
import * as vscode from "vscode";
import * as glob from "glob";
import { SyntaxAnalyzer } from "../CustomLibMetadata/SyntaxAnalyzer";
import * as path from "path";
const fileSeparator = path.sep;
const escapedFileSeparator = "\\" + path.sep;

const workspace = vscode.workspace;

export class FileReader {
	private static manifests: UIManifest[] = [];
	private static readonly viewCache: LooseObject = {};
	private static readonly UI5Version: any = vscode.workspace.getConfiguration("ui5.plugin").get("ui5version");
	public static globalStoragePath: string | undefined;

	public static setNewViewContentToCache(viewContent: string, fsPath: string) {
		const controllerName = this.getControllerNameFromView(viewContent);
		if (controllerName) {
			this.viewCache[controllerName] = {
				content: viewContent,
				fsPath: fsPath
			};
		}
	}

	static getViewCache() {
		return this.viewCache;
	}

	public static getDocumentTextFromCustomClassName(className: string, isFragment?: boolean) {
		let documentText;
		const classPath = this.getClassPathFromClassName(className, isFragment);
		if (classPath) {
			documentText = fs.readFileSync(classPath, "utf8");
		}

		return documentText;
	}

	public static getClassPathFromClassName(className: string, isFragment?: boolean) {
		let classPath = this.convertClassNameToFSPath(className, false, isFragment);

		if (classPath) {
			try {
				fs.readFileSync(classPath);
			} catch (error) {
				classPath = this.convertClassNameToFSPath(className, true);
				if (classPath) {
					try {
						fs.readFileSync(classPath);
					} catch (error) {
						classPath = undefined;
					}
				}
			}
		}

		return classPath;
	}

	public static convertClassNameToFSPath(className: string, isController: boolean = false, isFragment: boolean = false, isView: boolean = false) {
		let FSPath;
		let extension = ".js";
		const manifest = this.getManifestForClass(className);
		if (manifest) {
			if (isController) {
				extension = ".controller.js";
			} else if (isFragment) {
				extension = ".fragment.xml";
			} else if (isView) {
				extension = ".view.xml";
			}

			const separator = require("path").sep;
			FSPath = `${manifest.fsPath}${className.replace(manifest.componentName, "").replace(/\./g, separator).trim()}${extension}`;
		}

		return FSPath;
	}

	public static getAllManifests() {
		if (this.manifests.length === 0) {
			this.fetchAllWorkspaceManifests();
		}

		return this.manifests;
	}

	public static rereadAllManifests() {
		this.manifests = [];
		this.fetchAllWorkspaceManifests();
	}

	private static getManifestForClass(className: string) {
		let returnManifest: UIManifest | undefined;
		if (this.manifests.length === 0) {
			this.fetchAllWorkspaceManifests();
		}
		
		returnManifest = this.manifests.find(UIManifest => className.indexOf(UIManifest.componentName + ".") > -1);

		return returnManifest;
	}

	private static fetchAllWorkspaceManifests() {
		const wsFolders = workspace.workspaceFolders || [];
		for (const wsFolder of wsFolders) {
			const manifests = this.getManifestsInWorkspaceFolder(wsFolder);
			for (const manifest of manifests) {
				const UI5Manifest: any = JSON.parse(fs.readFileSync(manifest.fsPath, "utf8"));
				const manifestFsPath: string = manifest.fsPath.replace(`${fileSeparator}manifest.json`, "");
				const UIManifest = {
					componentName: UI5Manifest["sap.app"].id,
					fsPath: manifestFsPath,
					content: UI5Manifest
				};
				this.manifests.push(UIManifest);
			}
		}
	}

	public static getManifestsInWorkspaceFolder(wsFolder: vscode.WorkspaceFolder) {
		const src = this.getSrcFolderName();
		const wsFolderFSPath = wsFolder.uri.fsPath.replace(new RegExp(`${escapedFileSeparator}`, "g"), "/");
		const manifestPaths = glob.sync(`${wsFolderFSPath}/${src}/manifest.json`);
		const manifests: manifestPaths[] = manifestPaths.map(manifestPath => {
			return {
				fsPath: manifestPath.replace(/\//g, fileSeparator)
			};
		});
		return manifests;
	}


	public static getClassNameFromView(controllerClassName: string, controlId: string) {
		let className: string | undefined;
		const documentText = this.getViewText(controllerClassName);
		if (documentText) {
			className = this.getClassOfControlIdFromView(documentText, controlId);
		}

		return className;
	}

	public static getViewText(controllerName: string) {
		let viewText: string | undefined;
		if (!this.viewCache[controllerName]) {
			this.readAllViewsAndSaveInCache();
		}

		viewText = this.viewCache[controllerName]?.content;

		return viewText;
	}

	private static getClassOfControlIdFromView(documentText: string, controlId: string) {
		let controlClass = "";
		//TODO: move to XMLParser
		const controlResults = new RegExp(`(?=id="${controlId}")`).exec(documentText);
		if (controlResults) {
			let beginIndex = controlResults.index;
			while (beginIndex > 0 && documentText[beginIndex] !== "<") {
				beginIndex--;
			}
			beginIndex++;

			let endIndex = beginIndex;
			while (endIndex < documentText.length && !this.isSeparator(documentText[endIndex])) {
				endIndex++;
			}

			let regExpBase;
			const classTag = documentText.substring(beginIndex, endIndex);
			const classTagParts = classTag.split(":");
			let className;
			if (classTagParts.length === 1) {
				regExpBase = `(?<=xmlns=").*(?=")`;
				className = classTagParts[0];
			} else {
				regExpBase = `(?<=xmlns(:${classTagParts[0]})=").*(?=")`;
				className = classTagParts[1];
			}
			const rClassName = new RegExp(regExpBase);
			const classNameResult = rClassName.exec(documentText);
			if (classNameResult) {
				controlClass = [classNameResult[0], className.trim()].join(".");
			}
		}
		return controlClass;
	}

	private static readAllViewsAndSaveInCache() {
		const wsFolders = workspace.workspaceFolders || [];
		const src = this.getSrcFolderName();
		for (const wsFolder of wsFolders) {
			const wsFolderFSPath = wsFolder.uri.fsPath.replace(new RegExp(`${escapedFileSeparator}`, "g"), "/");
			const viewPaths = glob.sync(`${wsFolderFSPath}/${src}/**/*/*.view.xml`);
			viewPaths.forEach(viewPath => {
				let viewContent = fs.readFileSync(viewPath, "utf8");
				viewContent = this.replaceFragments(viewContent);
				const controllerName = this.getControllerNameFromView(viewContent);
				if (controllerName) {
					this.viewCache[controllerName] = {
						content: viewContent,
						fsPath: viewPath.replace(/\//g, fileSeparator)
					};
				}
			});
		}
	}

	static getControllerNameFromView(viewContent: string) {
		const controllerNameResult = /(?<=controllerName=").*?(?=")/.exec(viewContent);

		return controllerNameResult ? controllerNameResult[0] : undefined;
	}

	public static replaceFragments(documentText: string) {
		const fragments = this.getFragments(documentText);
		fragments.forEach(fragment => {
			const fragmentName = this.getFragmentName(fragment);
			if (fragmentName) {
				const fragmentText = this.getDocumentTextFromCustomClassName(fragmentName, true);
				if (fragmentText) {
					documentText = documentText.replace(fragment, fragmentText);
				}
			}
		});

		return documentText;
	}

	private static getFragmentName(fragmentText: string) {
		let fragmentName;
		const fragmentNameResult = /(?<=fragmentName=").*?(?=")/.exec(fragmentText);
		if (fragmentNameResult) {
			fragmentName = fragmentNameResult[0];
		}
		return fragmentName;
	}

	private static getFragments(documentText: string) {
		return documentText.match(/\<.*?Fragment(.|\s)*?\/>/g) || [];
	}

	private static isSeparator(char: string) {
		return char === " " || char === "	" || char === ";" || char === "\n" || char === "\t" || char === "\r";
	}

	public static getClassNameFromPath(fsPath: string) {
		fsPath = fsPath.replace(/\//g, fileSeparator);
		let className: string | undefined;
		const manifests = this.getAllManifests();
		const currentManifest = manifests.find(manifest => fsPath.indexOf(manifest.fsPath) > -1);
		if (currentManifest) {
			className =
				fsPath
				.replace(currentManifest.fsPath, currentManifest.componentName)
				.replace(".controller", "")
				.replace(".view.xml", "")
				.replace("fragment.xml", "")
				.replace(".xml", "")
				.replace(".js","")
				.replace(new RegExp(`${escapedFileSeparator}`, "g"), ".");
		}

		return className;
	}

	static getCache(cacheType: FileReader.CacheType) {
		let cache;
		const cachePath =
			cacheType === FileReader.CacheType.Metadata ? this.getMetadataCachePath() :
			cacheType === FileReader.CacheType.APIIndex ? this.getAPIIndexCachePath() :
			cacheType === FileReader.CacheType.Icons ? this.getIconCachePath() :
			null;

		if (cachePath && fs.existsSync(cachePath)) {
			const fileText = fs.readFileSync(cachePath, "utf8");
			try {
				cache = JSON.parse(fileText);
			} catch (error) {
				console.log(error);
			}
		}

		return cache;
	}

	static setCache(cacheType: FileReader.CacheType, cache: string) {
		const cachePath =
			cacheType === FileReader.CacheType.Metadata ? this.getMetadataCachePath() :
			cacheType === FileReader.CacheType.APIIndex ? this.getAPIIndexCachePath() :
			cacheType === FileReader.CacheType.Icons ? this.getIconCachePath() :
			null;

		if (cachePath) {
			if (!fs.existsSync(cachePath)) {
				this.ensureThatPluginCacheFolderExists();
			}

			fs.writeFileSync(cachePath, cache, "utf8");
		}
	}

	static clearCache() {
		if (this.globalStoragePath) {
			if (fs.existsSync(this.globalStoragePath)) {
				const path = require("path");
				const directory = this.globalStoragePath;
				fs.readdir(directory, (err, files) => {
					for (const file of files) {
						fs.unlinkSync(path.join(directory, file));
					}
				});
			}
		}
	}

	private static ensureThatPluginCacheFolderExists() {
		if (this.globalStoragePath) {
			if (!fs.existsSync(this.globalStoragePath)) {
				fs.mkdirSync(this.globalStoragePath);
			}
		}
	}

	private static getMetadataCachePath() {
		return `${this.globalStoragePath}${fileSeparator}cache_${this.UI5Version}.json`;
	}

	private static getAPIIndexCachePath() {
		return `${this.globalStoragePath}${fileSeparator}cache_appindex_${this.UI5Version}.json`;
	}

	private static getIconCachePath() {
		return `${this.globalStoragePath}${fileSeparator}cache_icons_${this.UI5Version}.json`;
	}

	public static getResourceModelFiles() {
		const manifests = this.getAllManifests();
		return manifests.map(manifest => {
			return {
				content: this.readResourceModelFile(manifest),
				componentName: manifest.componentName
			};
		});
	}

	public static readResourceModelFile(manifest: UIManifest) {
		let resourceModelFileContent = "";
		const resourceModelFilePath = this.getResourceModelUriForManifest(manifest);
		try {
			resourceModelFileContent = fs.readFileSync(resourceModelFilePath, "utf8");
		} catch {
			resourceModelFileContent = "";
		}

		return resourceModelFileContent;
	}

	public static getResourceModelUriForManifest(manifest: UIManifest) {
		const i18nRelativePath = manifest.content["sap.app"].i18n || `i18n${fileSeparator}i18n.properties`;
		const i18nPath = i18nRelativePath.replace(/\//g, fileSeparator);
		return `${manifest.fsPath}${fileSeparator}${i18nPath}`;
	}

	public static getComponentNameOfAppInCurrentWorkspaceFolder() {
		return this.getCurrentWorkspaceFoldersManifest()?.componentName;
	}

	public static getCurrentWorkspaceFoldersManifest() {
		const currentClassName = SyntaxAnalyzer.getClassNameOfTheCurrentDocument();
		if (currentClassName) {
			return this.getManifestForClass(currentClassName);
		}
	}

	public static getSrcFolderName() {
		const wsFolders = workspace.workspaceFolders || [];
		let src = vscode.workspace.getConfiguration("ui5.plugin").get("src");
		for (const wsFolder of wsFolders) {
			const srcPath = `${wsFolder.uri.fsPath}${fileSeparator}${src}`;
			if (!fs.existsSync(srcPath)) {
				const webappPath = `${wsFolder.uri.fsPath}${fileSeparator}webapp`;
				if (fs.existsSync(webappPath)) {
					src = "webapp";
				}
			}
		}

		return src;
	}
}

export module FileReader {
	export enum CacheType {
		Metadata = "1",
		APIIndex = "2",
		Icons = "3"
	}
}

interface UIManifest {
	fsPath: string;
	componentName: string;
	content: any;
}

interface manifestPaths {
	fsPath: string;
}

interface LooseObject {
	[key: string]: {
		fsPath: string;
		content: string;
	};
}
