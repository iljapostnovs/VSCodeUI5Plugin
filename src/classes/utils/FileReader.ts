import * as fs from "fs";
import * as vscode from "vscode";
import * as glob from "glob";
import { AcornSyntaxAnalyzer } from "../UI5Classes/JSParser/AcornSyntaxAnalyzer";
import * as path from "path";
import { UIClassFactory } from "../UI5Classes/UIClassFactory";
import { CustomUIClass } from "../UI5Classes/UI5Parser/UIClass/CustomUIClass";
const fileSeparator = path.sep;
const escapedFileSeparator = "\\" + path.sep;

const workspace = vscode.workspace;
export class FileReader {
	private static _manifests: UIManifest[] = [];
	private static readonly _viewCache: Views = {};
	private static readonly _fragmentCache: Fragments = {};
	private static readonly _UI5Version: any = vscode.workspace.getConfiguration("ui5.plugin").get("ui5version");
	public static globalStoragePath: string | undefined;

	public static setNewViewContentToCache(viewContent: string, fsPath: string) {
		const controllerName = this.getControllerNameFromView(viewContent);
		if (controllerName) {
			this._viewCache[controllerName] = {
				idClassMap: {},
				content: viewContent,
				fsPath: fsPath,
				fragments: this.getFragments(viewContent)
			};
		}
	}

	public static setNewFragmentContentToCache(document: vscode.TextDocument) {
		const fragmentName = this.getClassNameFromPath(document.fileName);
		if (fragmentName) {
			this._fragmentCache[fragmentName] = {
				content: document.getText(),
				fsPath: document.fileName,
				name: fragmentName,
				idClassMap: {}
			};

			Object.keys(this._viewCache).forEach(key => {
				const view = this._viewCache[key];
				view.fragments.forEach((fragment, index) => {
					if (fragment.name === fragmentName) {
						view.fragments[index] = this._fragmentCache[fragmentName];
					}
				})
			})
		}
	}

	static getViewCache() {
		return this._viewCache;
	}

	static getAllViews() {
		return Object.keys(this._viewCache).map(key => this._viewCache[key]);
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
			const fileExists = fs.existsSync(classPath);
			if (!fileExists) {
				classPath = this.convertClassNameToFSPath(className, true);
				if (classPath && !fs.existsSync(classPath)) {
					classPath = undefined;
				}
			}
		}

		return classPath;
	}

	public static convertClassNameToFSPath(className: string, isController = false, isFragment = false, isView = false) {
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

			const separator = path.sep;
			FSPath = `${manifest.fsPath}${className.replace(manifest.componentName, "").replace(/\./g, separator).trim()}${extension}`;
		}

		return FSPath;
	}

	public static getAllManifests() {
		if (this._manifests.length === 0) {
			this._fetchAllWorkspaceManifests();
		}

		return this._manifests;
	}

	public static rereadAllManifests() {
		this._manifests = [];
		this._fetchAllWorkspaceManifests();
	}

	public static getManifestForClass(className = "") {
		if (this._manifests.length === 0) {
			this._fetchAllWorkspaceManifests();
		}

		const returnManifest = this._manifests.find(UIManifest => className.startsWith(UIManifest.componentName + "."));

		return returnManifest;
	}

	private static _fetchAllWorkspaceManifests() {
		const wsFolders = workspace.workspaceFolders || [];
		for (const wsFolder of wsFolders) {
			const manifests = this.getManifestsInWorkspaceFolder(wsFolder);
			for (const manifest of manifests) {
				try {
					const UI5Manifest: any = JSON.parse(fs.readFileSync(manifest.fsPath, "utf8"));
					const manifestFsPath: string = manifest.fsPath.replace(`${fileSeparator}manifest.json`, "");
					const UIManifest = {
						componentName: UI5Manifest["sap.app"]?.id || "",
						fsPath: manifestFsPath,
						content: UI5Manifest
					};
					this._manifests.push(UIManifest);
				} catch (error) {
					vscode.window.showErrorMessage(`Couldn't read manifest.json. Error message: ${error?.message || ""}`);
					throw error;
				}
			}
		}
	}

	public static getManifestsInWorkspaceFolder(wsFolder: vscode.WorkspaceFolder) {
		// const src = this.getSrcFolderName(wsFolder);
		const wsFolderFSPath = wsFolder.uri.fsPath.replace(new RegExp(`${escapedFileSeparator}`, "g"), "/");
		const manifestPaths = glob.sync(`${wsFolderFSPath}/**/manifest.json`, {
			ignore: `${wsFolderFSPath}/${vscode.workspace.getConfiguration("ui5.plugin").get("excludeFolderPattern")}`
		});
		const manifests: manifestPaths[] = manifestPaths.map(manifestPath => {
			return {
				fsPath: manifestPath.replace(/\//g, fileSeparator)
			};
		});
		return manifests;
	}


	public static getClassNameFromView(controllerClassName: string, controlId: string) {
		let className: string | undefined;
		const view = this.getViewForController(controllerClassName);
		if (view) {
			className = this._getClassOfControlIdFromView(view, controlId);
			if (!className) {
				const view = this.getViewForController(controllerClassName);
				view?.fragments.find(fragment => {
					className = this._getClassOfControlIdFromView(fragment, controlId);
					return !!className;
				});
			}
		}

		return className;
	}

	public static getViewForController(controllerName: string) {
		if (!this._viewCache[controllerName]) {
			// this._readAllViewsAndSaveInCache();
		}

		let view: View | undefined;

		if (this._viewCache[controllerName]) {
			view = this._viewCache[controllerName];
		}

		return view;
	}

	public static getFragmentsForClass(className: string) {
		let fragments: Fragment[] = [];
		const UIClass = UIClassFactory.getUIClass(className);

		if (UIClass instanceof CustomUIClass) {
			const fragmentKeys = Object.keys(this._fragmentCache).filter(key => {
				return UIClass.classText.indexOf(`"${this._fragmentCache[key].name}"`) > -1;
			});
			if (fragmentKeys) {
				fragments = fragmentKeys.map(fragmentKey => this._fragmentCache[fragmentKey]);
			}

		}

		return fragments;
	}

	public static getFirstFragmentForClass(className: string): Fragment | undefined {
		const fragment = this.getFragmentsForClass(className)[0];

		return fragment;
	}

	public static getViewText(controllerName: string) {
		return this.getViewForController(controllerName)?.content;
	}

	private static _getClassOfControlIdFromView(viewOrFragment: View | Fragment, controlId: string) {
		if (!viewOrFragment.idClassMap[controlId]) {
			let controlClass = "";
			//TODO: move to XMLParser
			const controlResults = new RegExp(`(?=id="${controlId}")`).exec(viewOrFragment.content);
			if (controlResults) {
				let beginIndex = controlResults.index;
				while (beginIndex > 0 && viewOrFragment.content[beginIndex] !== "<") {
					beginIndex--;
				}
				beginIndex++;

				let endIndex = beginIndex;
				while (endIndex < viewOrFragment.content.length && !this._isSeparator(viewOrFragment.content[endIndex])) {
					endIndex++;
				}

				let regExpBase;
				const classTag = viewOrFragment.content.substring(beginIndex, endIndex);
				const classTagParts = classTag.split(":");
				let className;
				if (classTagParts.length === 1) {
					regExpBase = "(?<=xmlns=\").*?(?=\")";
					className = classTagParts[0];
				} else {
					regExpBase = `(?<=xmlns(:${classTagParts[0]})=").*?(?=")`;
					className = classTagParts[1];
				}
				const rClassName = new RegExp(regExpBase);
				const classNameResult = rClassName.exec(viewOrFragment.content);
				if (classNameResult) {
					controlClass = [classNameResult[0], className.trim()].join(".");
				}
			}
			viewOrFragment.idClassMap[controlId] = controlClass;
		}

		return viewOrFragment.idClassMap[controlId];
	}

	static readAllViewsAndFragments() {
		return vscode.window.withProgress({
			location: vscode.ProgressLocation.Window,
			title: "Parsing project files",
			cancellable: false
		}, async progress => {
			progress.report({
				message: "Reading Fragments",
				increment: 33
			});
			this._readAllFragmentsAndSaveInCache();
			progress.report({
				message: "Reading Views"
			});
			this._readAllViewsAndSaveInCache();
			progress.report({
				message: "Reading JS Files",
				increment: 33
			});
			this._readAllJSFiles();
		});
	}

	private static _readAllJSFiles() {
		const wsFolders = workspace.workspaceFolders || [];
		for (const wsFolder of wsFolders) {
			const wsFolderFSPath = wsFolder.uri.fsPath.replace(new RegExp(`${escapedFileSeparator}`, "g"), "/");
			const classPaths = glob.sync(`${wsFolderFSPath}/**/*.js`, {
				ignore: `${wsFolderFSPath}/${vscode.workspace.getConfiguration("ui5.plugin").get("excludeFolderPattern")}`
			});
			classPaths.forEach(classPath => {
				const className = FileReader.getClassNameFromPath(classPath);
				if (className) {
					try {
						UIClassFactory.getUIClass(className);
					} catch (error) {
						vscode.window.showErrorMessage(`Error parsing ${className}: ${error.message}`);
					}
				}
			});
		}
	}

	private static _readAllViewsAndSaveInCache() {
		const wsFolders = workspace.workspaceFolders || [];
		for (const wsFolder of wsFolders) {
			// const src = this.getSrcFolderName(wsFolder);
			const wsFolderFSPath = wsFolder.uri.fsPath.replace(new RegExp(`${escapedFileSeparator}`, "g"), "/");
			const viewPaths = glob.sync(`${wsFolderFSPath}/**/*.view.xml`, {
				ignore: `${wsFolderFSPath}/${vscode.workspace.getConfiguration("ui5.plugin").get("excludeFolderPattern")}`
			});
			viewPaths.forEach(viewPath => {
				const viewContent = fs.readFileSync(viewPath, "utf8");
				const fragments = this.getFragments(viewContent);
				const controllerName = this.getControllerNameFromView(viewContent);
				if (controllerName) {
					this._viewCache[controllerName] = {
						idClassMap: {},
						content: viewContent,
						fsPath: viewPath.replace(/\//g, fileSeparator),
						fragments: fragments
					};
				}
			});
		}
	}

	private static _readAllFragmentsAndSaveInCache() {
		const wsFolders = workspace.workspaceFolders || [];
		for (const wsFolder of wsFolders) {
			// const src = this.getSrcFolderName(wsFolder);
			const wsFolderFSPath = wsFolder.uri.fsPath.replace(new RegExp(`${escapedFileSeparator}`, "g"), "/");
			const fragmentPaths = glob.sync(`${wsFolderFSPath}/**/*.fragment.xml`, {
				ignore: `${wsFolderFSPath}/${vscode.workspace.getConfiguration("ui5.plugin").get("excludeFolderPattern")}`
			});
			fragmentPaths.forEach(fragmentPath => {
				const fragmentContent = fs.readFileSync(fragmentPath, "utf8");
				const fragmentFSPath = fragmentPath.replace(/\//g, fileSeparator);
				const fragmentName = this.getClassNameFromPath(fragmentFSPath);
				if (fragmentName) {
					this._fragmentCache[fragmentName] = {
						content: fragmentContent,
						fsPath: fragmentFSPath,
						name: fragmentName,
						idClassMap: {}
					};
				}
			});
		}
	}

	public static getAllJSClassNamesFromProject(wsFolder: vscode.WorkspaceFolder) {
		let classNames: string[] = [];
		// const src = this.getSrcFolderName(wsFolder);
		const wsFolderFSPath = wsFolder.uri.fsPath.replace(new RegExp(`${escapedFileSeparator}`, "g"), "/");
		const viewPaths = glob.sync(`${wsFolderFSPath}/**/*.js`, {
			ignore: `${wsFolderFSPath}/${vscode.workspace.getConfiguration("ui5.plugin").get("excludeFolderPattern")}`
		});
		classNames = viewPaths.reduce((accumulator: string[], viewPath) => {
			const path = this.getClassNameFromPath(viewPath);
			if (path) {
				accumulator.push(path);
			}

			return accumulator;
		}, []);

		return classNames;
	}

	static getControllerNameFromView(viewContent: string) {
		const controllerNameResult = /(?<=controllerName=").*?(?=")/.exec(viewContent);
		const controllerName = controllerNameResult ? controllerNameResult[0] : undefined;

		return controllerName;
	}

	static getResponsibleClassForXMLDocument(document: vscode.TextDocument) {
		const isFragment = document.fileName.endsWith(".fragment.xml");
		const isView = document.fileName.endsWith(".view.xml");
		let responsibleClassName;

		if (isView) {
			responsibleClassName = this.getControllerNameFromView(document.getText());
		} else if (isFragment) {
			const fragmentName = this.getClassNameFromPath(document.fileName);
			const responsibleViewKey = Object.keys(this._viewCache).find(key => {
				return !!this._viewCache[key].fragments.find(fragmentFromView => fragmentFromView.name === fragmentName);
			});
			if (responsibleViewKey) {
				const responsibleView = this._viewCache[responsibleViewKey];
				responsibleClassName = this.getControllerNameFromView(responsibleView.content);
			} else {
				responsibleClassName = this._getResponsibleClassNameForFragmentFromCustomUIClasses(document);
			}
		}

		return responsibleClassName;
	}

	private static _getResponsibleClassNameForFragmentFromCustomUIClasses(document: vscode.TextDocument) {
		const allUIClasses = UIClassFactory.getAllExistentUIClasses();
		const fragmentName = this.getClassNameFromPath(document.fileName);
		const responsibleClassName = Object.keys(allUIClasses).find(key => {
			let classFound = false;
			const UIClass = allUIClasses[key];
			if (UIClass instanceof CustomUIClass) {
				if (UIClass.classText.indexOf(`${fragmentName}`) > -1) {
					classFound = true;
				}
			}
			return classFound;
		});

		return responsibleClassName;
	}

	public static getFragments(documentText: string) {
		const fragments: Fragment[] = [];
		const fragmentTags = this._getFragmentTags(documentText);
		fragmentTags.forEach(fragmentTag => {
			const fragmentName = this._getFragmentNameFromTag(fragmentTag);
			if (fragmentName) {
				const fragmentPath = this.getClassPathFromClassName(fragmentName, true);
				const fragment = this._getFragment(fragmentName);
				if (fragment && fragmentPath) {
					documentText = documentText.replace(fragmentTag, fragment.content);
					fragments.push({
						content: fragment.content,
						name: fragmentName,
						fsPath: fragmentPath,
						idClassMap: {}
					});
				}
			}
		});

		return fragments;
	}

	private static _getFragment(fragmentName: string): Fragment | undefined {
		if (!this._fragmentCache[fragmentName]) {
			// this._readAllFragmentsAndSaveInCache();
		}

		return this._fragmentCache[fragmentName];
	}

	static getAllFragments() {
		return Object.keys(this._fragmentCache).map(key => this._fragmentCache[key]);
	}

	private static _getFragmentNameFromTag(fragmentTag: string) {
		let fragmentName;
		const fragmentNameResult = /(?<=fragmentName=").*?(?=")/.exec(fragmentTag);
		if (fragmentNameResult) {
			fragmentName = fragmentNameResult[0];
		}
		return fragmentName;
	}

	private static _getFragmentTags(documentText: string) {
		return documentText.match(/<.*?Fragment(.|\s)*?\/>/g) || [];
	}

	private static _isSeparator(char: string) {
		return char === " " || char === "	" || char === ";" || char === "\n" || char === "\t" || char === "\r";
	}

	public static getClassNameFromPath(fsPath: string) {
		fsPath = fsPath.replace(/\//g, fileSeparator);
		let className: string | undefined;
		const manifests = this.getAllManifests();
		const currentManifest = manifests.find(manifest => fsPath.startsWith(manifest.fsPath));
		if (currentManifest) {
			className =
				fsPath
					.replace(currentManifest.fsPath, currentManifest.componentName)
					.replace(".controller", "")
					.replace(".view.xml", "")
					.replace(".fragment.xml", "")
					.replace(".xml", "")
					.replace(".js", "")
					.replace(new RegExp(`${escapedFileSeparator}`, "g"), ".");
		}

		return className;
	}

	static getCache(cacheType: FileReader.CacheType) {
		let cache;
		const cachePath =
			cacheType === FileReader.CacheType.Metadata ? this._getMetadataCachePath() :
				cacheType === FileReader.CacheType.APIIndex ? this._getAPIIndexCachePath() :
					cacheType === FileReader.CacheType.Icons ? this._getIconCachePath() :
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
			cacheType === FileReader.CacheType.Metadata ? this._getMetadataCachePath() :
				cacheType === FileReader.CacheType.APIIndex ? this._getAPIIndexCachePath() :
					cacheType === FileReader.CacheType.Icons ? this._getIconCachePath() :
						null;

		if (cachePath) {
			if (!fs.existsSync(cachePath)) {
				this._ensureThatPluginCacheFolderExists();
			}

			fs.writeFileSync(cachePath, cache, "utf8");
		}
	}

	static clearCache() {
		if (this.globalStoragePath) {
			if (fs.existsSync(this.globalStoragePath)) {
				const directory = this.globalStoragePath;
				fs.readdir(directory, (err, files) => {
					for (const file of files) {
						fs.unlinkSync(path.join(directory, file));
					}
				});
			}
		}
	}

	private static _ensureThatPluginCacheFolderExists() {
		if (this.globalStoragePath) {
			if (!fs.existsSync(this.globalStoragePath)) {
				fs.mkdirSync(this.globalStoragePath);
			}
		}
	}

	private static _getMetadataCachePath() {
		return `${this.globalStoragePath}${fileSeparator}cache_${this._UI5Version}.json`;
	}

	private static _getAPIIndexCachePath() {
		return `${this.globalStoragePath}${fileSeparator}cache_appindex_${this._UI5Version}.json`;
	}

	private static _getIconCachePath() {
		return `${this.globalStoragePath}${fileSeparator}cache_icons_${this._UI5Version}.json`;
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
		const i18nRelativePath = typeof manifest.content["sap.app"]?.i18n === "string" ? manifest.content["sap.app"]?.i18n : `i18n${fileSeparator}i18n.properties`;
		const i18nPath = i18nRelativePath.replace(/\//g, fileSeparator);
		return `${manifest.fsPath}${fileSeparator}${i18nPath}`;
	}

	public static getComponentNameOfAppInCurrentWorkspaceFolder() {
		return this.getCurrentWorkspaceFoldersManifest()?.componentName;
	}

	public static getCurrentWorkspaceFoldersManifest() {
		const currentClassName = AcornSyntaxAnalyzer.getClassNameOfTheCurrentDocument();
		if (currentClassName) {
			return this.getManifestForClass(currentClassName);
		}
	}

	public static removeFromCache(path: string) {
		const classPath = this.getClassNameFromPath(path);
		if (path.endsWith(".view.xml") && classPath) {
			delete this._viewCache[classPath];
		} else if (path.endsWith(".fragment.xml") && classPath) {
			delete this._fragmentCache[classPath];
		}
	}
}

export namespace FileReader {
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

export interface Views {
	[key: string]: View;
}

export interface View {
	fsPath: string;
	content: string;
	fragments: Fragment[];
	idClassMap: {
		[key: string]: string;
	}
}


export interface Fragment {
	content: string;
	fsPath: string;
	name: string;
	idClassMap: {
		[key: string]: string;
	}
}
interface Fragments {
	[key: string]: Fragment;
}