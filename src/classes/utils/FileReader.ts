import * as fs from "fs";
import * as vscode from "vscode";
import * as glob from "glob";
import { AcornSyntaxAnalyzer } from "../UI5Classes/JSParser/AcornSyntaxAnalyzer";
import * as path from "path";
import { UIClassFactory } from "../UI5Classes/UIClassFactory";
import { CustomUIClass } from "../UI5Classes/UI5Parser/UIClass/CustomUIClass";
import { ITag } from "../providers/diagnostics/xml/xmllinter/parts/abstraction/Linter";
import { TextDocumentTransformer } from "./TextDocumentTransformer";
import { XMLParser } from "./XMLParser";
const fileSeparator = path.sep;
const escapedFileSeparator = "\\" + path.sep;

const workspace = vscode.workspace;

export class FileReader {
	private static _manifests: IUIManifest[] = [];
	private static readonly _viewCache: IViews = {};
	private static readonly _fragmentCache: Fragments = {};
	private static readonly _UI5Version: any = vscode.workspace.getConfiguration("ui5.plugin").get("ui5version");
	public static globalStoragePath: string | undefined;

	public static setNewViewContentToCache(viewContent: string, fsPath: string, forceRefresh = false) {
		const controllerName = this.getControllerNameFromView(viewContent);
		if (controllerName && (this._viewCache[controllerName]?.content.length !== viewContent.length || forceRefresh)) {//TODO: What if there is no controller?
			const viewName = this.getClassNameFromPath(fsPath);
			if (this._viewCache[controllerName]) {
				this._viewCache[controllerName].content = viewContent;
				this._viewCache[controllerName].idClassMap = {};
				this._viewCache[controllerName].fsPath = fsPath;
				this._viewCache[controllerName].fragments = this.getFragmentsFromXMLDocumentText(viewContent);
				this._viewCache[controllerName].XMLParserData = undefined;
			} else {
				this._viewCache[controllerName] = {
					idClassMap: {},
					name: viewName || "",
					content: viewContent,
					fsPath: fsPath,
					fragments: this.getFragmentsFromXMLDocumentText(viewContent)
				};
			}
		}
	}

	public static setNewFragmentContentToCache(text: string, fsPath: string, forceRefresh = false) {
		const fragmentName = this.getClassNameFromPath(fsPath);
		if (fragmentName && (this._fragmentCache[fragmentName]?.content.length !== text.length || forceRefresh)) {
			if (this._fragmentCache[fragmentName]) {
				this._fragmentCache[fragmentName].content = text;
				this._fragmentCache[fragmentName].fsPath = fsPath;
				this._fragmentCache[fragmentName].name = fragmentName;
				this._fragmentCache[fragmentName].idClassMap = {};
				this._fragmentCache[fragmentName].fragments = this.getFragmentsFromXMLDocumentText(text);
				this._fragmentCache[fragmentName].XMLParserData = undefined;
			} else {
				this._fragmentCache[fragmentName] = {
					content: text,
					fsPath: fsPath,
					name: fragmentName,
					idClassMap: {},
					fragments: this.getFragmentsFromXMLDocumentText(text)
				};
			}
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
			const manifests = this.getManifestPathsInWorkspaceFolder(wsFolder);
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

	public static getManifestPathsInWorkspaceFolder(wsFolder: vscode.WorkspaceFolder) {
		const timeStart = new Date().getTime();
		const manifestPaths = this._readFilesInWorkspace(wsFolder, "**/manifest.json");
		const timeEnd = new Date().getTime();
		const timeSpent = timeEnd - timeStart;
		if (timeSpent > 5000 || manifestPaths.length > 30) {
			vscode.window.showInformationMessage(`Reading manifests took ${timeSpent / 100}s and ${manifestPaths.length} manifests found. Please make sure that "ui5.plugin.excludeFolderPattern" preference is configured correctly.`);
		}

		const manifests: IManifestPaths[] = manifestPaths.map(manifestPath => {
			return {
				fsPath: manifestPath.replace(/\//g, fileSeparator)
			};
		});
		return manifests;
	}

	private static _readFilesInWorkspace(wsFolder: vscode.WorkspaceFolder, path: string) {

		const wsFolderFSPath = wsFolder.uri.fsPath.replace(new RegExp(`${escapedFileSeparator}`, "g"), "/");
		const exclusions: string[] = vscode.workspace.getConfiguration("ui5.plugin").get("excludeFolderPattern") || [];
		const exclusionPaths = exclusions.map(excludeString => {
			return `${wsFolderFSPath}/${excludeString}`
		});
		const filePaths = glob.sync(`${wsFolderFSPath}/${path}`, {
			ignore: exclusionPaths
		});

		return filePaths;
	}

	//TODO: Refactor this
	public static getClassNameFromView(controllerClassName: string, controlId: string) {
		let className: string | undefined;
		const view = this.getViewForController(controllerClassName);
		if (view) {
			className = this._getClassOfControlIdFromView(view, controlId);
			if (!className) {
				view.fragments.find(fragment => {
					className = this._getClassOfControlIdFromView(fragment, controlId);
					return !!className;
				});
			}
		}

		if (!className) {
			const UIClass = UIClassFactory.getUIClass(controllerClassName);
			if (UIClass instanceof CustomUIClass) {
				const fragmentsAndViews = UIClassFactory.getViewsAndFragmentsOfControlHierarchically(UIClass);
				const fragmentAndViewArray = [
					...fragmentsAndViews.views,
					...fragmentsAndViews.fragments
				];
				fragmentAndViewArray.find(view => {
					className = this._getClassOfControlIdFromView(view, controlId);
					return !!className;
				});
			}
		}

		return className;
	}

	public static getViewForController(controllerName: string): IView | undefined {
		let view: IView | undefined;

		if (this._viewCache[controllerName]) {
			view = this._viewCache[controllerName];
		}

		if (!this._viewCache[controllerName]) {
			const swappedControllerName = this._swapControllerNameIfItWasReplacedInManifest(controllerName);
			if (swappedControllerName !== controllerName) {
				view = this.getViewForController(swappedControllerName);
			}
		}

		return view;
	}

	private static _swapControllerNameIfItWasReplacedInManifest(controllerName: string) {
		const extensions = this.getManifestExtensionsForClass(controllerName);
		const controllerReplacements = extensions && extensions["sap.ui.controllerReplacements"];

		if (controllerReplacements) {
			const replacementKey = Object.keys(controllerReplacements).find(replacementKey => {
				return controllerReplacements[replacementKey] === controllerName;
			});
			if (replacementKey) {
				controllerName = replacementKey;
			}
		}

		return controllerName;
	}

	public static getFragmentsMentionedInClass(className: string) {
		let fragments: IFragment[] = [];
		const UIClass = UIClassFactory.getUIClass(className);

		if (UIClass instanceof CustomUIClass) {
			fragments = this.getAllFragments().filter(fragment => {
				return UIClass.classText.indexOf(`"${fragment.name}"`) > -1;
			});

			const fragmentsInFragment: IFragment[] = [];
			fragments.forEach(fragment => {
				fragmentsInFragment.push(...this.getFragmentsInXMLFile(fragment));
			});

			fragments.push(...fragmentsInFragment);

		}

		return fragments;
	}

	static getFragmentsInXMLFile(XMLFile: IXMLFile) {
		const fragmentsInFragment: IFragment[] = [];
		const fragments = XMLFile.fragments;
		fragments.forEach(fragment => {
			fragmentsInFragment.push(...this.getFragmentsInXMLFile(fragment));
		});

		return fragments.concat(fragmentsInFragment);
	}

	public static getFirstFragmentForClass(className: string): IFragment | undefined {
		const fragment = this.getFragmentsMentionedInClass(className)[0];

		return fragment;
	}

	public static getViewText(controllerName: string) {
		return this.getViewForController(controllerName)?.content;
	}

	private static _getClassOfControlIdFromView(XMLFile: IXMLFile & IIdClassMap, controlId: string) {
		if (!XMLFile.idClassMap[controlId]) {
			let controlClass = "";

			const allIds = XMLParser.getAllIDsInCurrentView(XMLFile);
			const id = allIds.find(idData => idData.id === controlId);
			controlClass = id?.className || "";
			if (controlClass) {
				XMLFile.idClassMap[controlId] = controlClass;
			}
		}

		return XMLFile.idClassMap[controlId];
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
			const classPaths = this._readFilesInWorkspace(wsFolder, "**/*.js");
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
			const viewPaths = this._readFilesInWorkspace(wsFolder, "**/*.view.xml");
			viewPaths.forEach(viewPath => {
				const viewContent = fs.readFileSync(viewPath, "utf8");
				const viewFSPath = viewPath.replace(/\//g, fileSeparator);
				const fragments = this.getFragmentsFromXMLDocumentText(viewContent);
				const controllerName = this.getControllerNameFromView(viewContent);
				const viewName = this.getClassNameFromPath(viewFSPath);
				if (controllerName) {
					this._viewCache[controllerName] = {
						idClassMap: {},
						name: viewName || "",
						content: viewContent,
						fsPath: viewFSPath,
						fragments: fragments
					};
				}
			});
		}
	}

	private static _readAllFragmentsAndSaveInCache() {
		const wsFolders = workspace.workspaceFolders || [];
		for (const wsFolder of wsFolders) {
			const fragmentPaths = this._readFilesInWorkspace(wsFolder, "**/*.fragment.xml");
			fragmentPaths.forEach(fragmentPath => {
				const fragmentContent = fs.readFileSync(fragmentPath, "utf8");
				const fragmentFSPath = fragmentPath.replace(/\//g, fileSeparator);
				const fragmentName = this.getClassNameFromPath(fragmentFSPath);
				if (fragmentName) {
					this._fragmentCache[fragmentName] = {
						content: fragmentContent,
						fsPath: fragmentFSPath,
						name: fragmentName,
						idClassMap: {},
						fragments: []
					};
				}
			});

			this.getAllFragments().forEach(fragment => {
				fragment.fragments = this.getFragmentsFromXMLDocumentText(fragment.content);
			});
		}
	}

	public static getAllJSClassNamesFromProject(wsFolder: vscode.WorkspaceFolder) {
		let classNames: string[] = [];
		const classPaths = this._readFilesInWorkspace(wsFolder, "**/*.js");
		classNames = classPaths.reduce((accumulator: string[], viewPath) => {
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
		const XMLDocument = TextDocumentTransformer.toXMLFile(document);
		if (XMLDocument) {
			return this.getResponsibleClassNameForViewOrFragment(XMLDocument);
		}
	}

	//TODO: compare it to similar method?
	static getResponsibleClassNameForViewOrFragment(viewOrFragment: IXMLFile) {
		const isFragment = viewOrFragment.fsPath.endsWith(".fragment.xml");
		const isView = viewOrFragment.fsPath.endsWith(".view.xml");
		let responsibleClassName: string | undefined;

		if (isView) {
			responsibleClassName = this.getControllerNameFromView(viewOrFragment.content);
		} else if (isFragment) {
			const fragmentName = this.getClassNameFromPath(viewOrFragment.fsPath);
			const responsibleViewKey = Object.keys(this._viewCache).find(key => {
				return !!this._viewCache[key].fragments.find(fragmentFromView => fragmentFromView.name === fragmentName);
			});
			if (responsibleViewKey) {
				const responsibleView = this._viewCache[responsibleViewKey];
				responsibleClassName = this.getControllerNameFromView(responsibleView.content);
			} else {
				responsibleClassName = this._getResponsibleClassNameForFragmentFromCustomUIClasses(viewOrFragment);
			}

			if (!responsibleClassName) {
				const responsibleFragment = FileReader.getAllFragments().find(fragment => {
					return fragment.fragments.find(fragment => fragment.fsPath === viewOrFragment.fsPath);
				});
				if (responsibleFragment) {
					responsibleClassName = this.getResponsibleClassNameForViewOrFragment(responsibleFragment);
				}
			}

			if (!responsibleClassName) {
				responsibleClassName = this._getResponsibleClassNameForFragmentFromManifestExtensions(viewOrFragment);
			}
		}

		return responsibleClassName;
	}

	public static getManifestExtensionsForClass(className: string): any | undefined {
		const manifest = FileReader.getManifestForClass(className);
		return manifest?.content["sap.ui5"]?.extends?.extensions;
	}

	private static _getResponsibleClassNameForFragmentFromManifestExtensions(viewOrFragment: IXMLFile) {
		let responsibleClassName: string | undefined;
		const fragmentName = this.getClassNameFromPath(viewOrFragment.fsPath);
		if (fragmentName) {
			const extensions = this.getManifestExtensionsForClass(fragmentName);
			const viewExtensions = extensions && extensions["sap.ui.viewExtensions"];
			if (viewExtensions) {
				const viewName = Object.keys(viewExtensions).find(viewName => {
					const viewExtensionPoints = viewExtensions[viewName];
					if (viewExtensionPoints) {
						return Object.keys(viewExtensionPoints).find(extensionPointName => {
							return viewExtensionPoints[extensionPointName].fragmentName === fragmentName;
						});
					}
					return false;
				});

				if (viewName) {
					const view = this.getAllViews().find(view => {
						const currentViewName = this.getClassNameFromPath(view.fsPath);
						if (currentViewName) {
							return currentViewName === viewName;
						}
						return false;
					});
					if (view) {
						responsibleClassName = this.getControllerNameFromView(view.content);

						if (responsibleClassName) {
							responsibleClassName = this._swapResponsibleControllerIfItIsExtendedInManifest(responsibleClassName, fragmentName);
						}
					}
				}
			}
		}

		return responsibleClassName;
	}

	private static _swapResponsibleControllerIfItIsExtendedInManifest(controllerName: string, sourceClassName: string) {
		const extensions = this.getManifestExtensionsForClass(sourceClassName);
		const controllerReplacements = extensions && extensions["sap.ui.controllerReplacements"];

		if (controllerReplacements) {
			const replacementKey = Object.keys(controllerReplacements).find(replacementKey => {
				return replacementKey === controllerName;
			});
			if (replacementKey) {
				controllerName = controllerReplacements[replacementKey];
			}
		}

		return controllerName;
	}

	private static _getResponsibleClassNameForFragmentFromCustomUIClasses(viewOrFragment: IXMLFile) {
		const allUIClasses = UIClassFactory.getAllExistentUIClasses();
		const fragmentName = this.getClassNameFromPath(viewOrFragment.fsPath);
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

	public static getFragmentsFromXMLDocumentText(documentText: string) {
		const fragments: IFragment[] = [];
		const fragmentTags = this._getFragmentTags(documentText);
		fragmentTags.forEach(fragmentTag => {
			const fragmentName = this._getFragmentNameFromTag(fragmentTag);
			if (fragmentName) {
				const fragmentPath = this.getClassPathFromClassName(fragmentName, true);
				const fragment = this.getFragment(fragmentName);
				if (fragment && fragmentPath) {
					fragments.push(fragment);
				}
			}
		});

		return fragments;
	}

	static getFragment(fragmentName: string): IFragment | undefined {
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
		return documentText.match(/<.*?:Fragment\s(.|\s)*?\/>/g) || [];
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

	public static readResourceModelFile(manifest: IUIManifest) {
		let resourceModelFileContent = "";
		const resourceModelFilePath = this.getResourceModelUriForManifest(manifest);
		try {
			resourceModelFileContent = fs.readFileSync(resourceModelFilePath, "utf8");
		} catch {
			resourceModelFileContent = "";
		}

		return resourceModelFileContent;
	}

	public static getResourceModelUriForManifest(manifest: IUIManifest) {
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
			if (this._viewCache[classPath]) {
				this._viewCache[classPath].content = "";
				this._viewCache[classPath].idClassMap = {};
				this._viewCache[classPath].XMLParserData = undefined;
			}
			delete this._viewCache[classPath];
		} else if (path.endsWith(".fragment.xml") && classPath) {
			if (this._fragmentCache[classPath]) {
				this._fragmentCache[classPath].content = "";
				this._fragmentCache[classPath].idClassMap = {};
				this._fragmentCache[classPath].XMLParserData = undefined;
			}
			delete this._fragmentCache[classPath];
		}
	}

	static getXMLFile(className: string, fileType?: string) {
		let xmlFile: IXMLFile | undefined;
		if (fileType === "fragment" || !fileType) {
			xmlFile = this.getFragment(className);
		}

		if (!xmlFile && (fileType === "view" || !fileType)) {
			xmlFile = this._viewCache[className] || this.getAllViews().find(view => view.name === className);
		}

		return xmlFile;
	}

	static replaceViewNames(oldName: string, newName: string) {
		const XMLFile = this.getXMLFile(oldName, "view");
		const newFSPath = this.convertClassNameToFSPath(newName, false, false, true);
		const oldFSPath = this.convertClassNameToFSPath(oldName, false, false, true);
		if (XMLFile && newFSPath && oldFSPath) {
			XMLFile.fsPath = newFSPath;
			XMLFile.name = newName;

			// this.removeFromCache(oldFSPath);
		}
	}

	static replaceControllerNameForView(oldName: string, newName: string) {
		this._viewCache[newName] = this._viewCache[oldName];
		delete this._viewCache[oldName];
	}

	static replaceFragmentNames(oldName: string, newName: string) {
		const fragment = this._fragmentCache[oldName];
		const newFSPath = this.convertClassNameToFSPath(newName, false, true);
		const oldFSPath = this.convertClassNameToFSPath(oldName, false, true);
		if (fragment && newFSPath && oldFSPath) {
			fragment.fsPath = newFSPath;
			fragment.name = newName;
			this._fragmentCache[newName] = this._fragmentCache[oldName];
			// this.removeFromCache(oldFSPath);
			delete this._fragmentCache[oldName];
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

interface IUIManifest {
	fsPath: string;
	componentName: string;
	content: any;
}

interface IManifestPaths {
	fsPath: string;
}

export interface IViews {
	[key: string]: IView;
}

export interface IView extends IXMLFile, IIdClassMap {
}
export interface IFragment extends IXMLFile, IIdClassMap {
}
export interface IXMLFile extends IXMLParserCacheable, IHasFragments {
	content: string;
	fsPath: string;
	name: string;
}
export interface IHasFragments {
	fragments: IFragment[];
}
export interface IIdClassMap {
	idClassMap: {
		[key: string]: string;
	};
}
interface IPrefixResults {
	[key: string]: any[]
}
interface IXMLParserData {
	strings: boolean[];
	tags: ITag[];
	prefixResults: IPrefixResults;
	areAllStringsClosed: boolean;
}
export interface IXMLParserCacheable {
	XMLParserData?: IXMLParserData
}

interface Fragments {
	[key: string]: IFragment;
}