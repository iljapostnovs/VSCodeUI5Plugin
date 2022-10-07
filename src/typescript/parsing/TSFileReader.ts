import * as fs from "fs";
import * as glob from "glob";
import * as path from "path";
import { IFileReader, IParserConfigHandler, TextDocument, WorkspaceFolder } from "ui5plugin-parser";
import { ResourceModelData } from "ui5plugin-parser/dist/classes/UI5Classes/ResourceModelData";
import { IUIManifest, IViews, IManifestPaths, IView, IFragment, IXMLFile, IIdClassMap } from "ui5plugin-parser/dist/classes/utils/FileReader";
import { TextDocumentTransformer } from "ui5plugin-parser/dist/classes/utils/TextDocumentTransformer";
import {  XMLParser } from "ui5plugin-parser/dist/classes/utils/XMLParser";
import { TSClassFactory } from "./TSClassFactory";
import { CustomTSClass } from "./classes/CustomTSClass";
const fileSeparator = path.sep;
const escapedFileSeparator = "\\" + path.sep;

export class TSFileReader implements IFileReader {
	private _manifests: IUIManifest[] = [];
	private readonly _viewCache: IViews = {};
	private readonly _fragmentCache: Fragments = {};
	private readonly _UI5Version: string;
	public globalStoragePath: string | undefined;
	private readonly _configHandler: IParserConfigHandler;
	private readonly _classFactory: TSClassFactory;

	constructor(configHandler: IParserConfigHandler, classFactory: TSClassFactory) {
		this._configHandler = configHandler;
		this._UI5Version = configHandler.getUI5Version();
		this._classFactory = classFactory;
	}

	public setNewViewContentToCache(viewContent: string, fsPath: string, forceRefresh = false) {
		const viewName = this.getClassNameFromPath(fsPath);
		if (viewName && (this._viewCache[viewName]?.content.length !== viewContent.length || forceRefresh || !this._viewCache[viewName])) {
			if (this._viewCache[viewName]) {
				this._viewCache[viewName].content = viewContent;
				this._viewCache[viewName].controllerName = this.getControllerNameFromView(viewContent) || "";
				this._viewCache[viewName].idClassMap = {};
				this._viewCache[viewName].fsPath = fsPath;
				this._viewCache[viewName].fragments = this.getFragmentsFromXMLDocumentText(viewContent);
				this._viewCache[viewName].XMLParserData = undefined;
				(this._viewCache[viewName] as any)._cache = {};
			} else {
				this._viewCache[viewName] = {
					controllerName: this.getControllerNameFromView(viewContent) || "",
					idClassMap: {},
					name: viewName || "",
					content: viewContent,
					fsPath: fsPath,
					fragments: this.getFragmentsFromXMLDocumentText(viewContent),
					getCache: function <Type>(cacheName: string) {
						return <Type>(this as any)._cache[cacheName];
					},
					setCache: function <Type>(cacheName: string, cacheValue: Type) {
						(this as any)._cache[cacheName] = cacheValue;
					}
				};
				(this._viewCache[viewName] as any)._cache = {};
			}
		}
	}

	public setNewFragmentContentToCache(text: string, fsPath: string, forceRefresh = false) {
		const fragmentName = this.getClassNameFromPath(fsPath);
		if (fragmentName && (this._fragmentCache[fragmentName]?.content.length !== text.length || forceRefresh || !this._fragmentCache[fragmentName])) {
			if (this._fragmentCache[fragmentName]) {
				this._fragmentCache[fragmentName].content = text;
				this._fragmentCache[fragmentName].fsPath = fsPath;
				this._fragmentCache[fragmentName].name = fragmentName;
				this._fragmentCache[fragmentName].idClassMap = {};
				this._fragmentCache[fragmentName].fragments = this.getFragmentsFromXMLDocumentText(text);
				this._fragmentCache[fragmentName].XMLParserData = undefined;
				(this._fragmentCache[fragmentName] as any)._cache = {};
			} else {
				this._fragmentCache[fragmentName] = {
					content: text,
					fsPath: fsPath,
					name: fragmentName,
					idClassMap: {},
					fragments: this.getFragmentsFromXMLDocumentText(text),
					getCache: function <Type>(cacheName: string) {
						return <Type>(this as any)._cache[cacheName];
					},
					setCache: function <Type>(cacheName: string, cacheValue: Type) {
						(this as any)._cache[cacheName] = cacheValue;
					}
				};
				(this._fragmentCache[fragmentName] as any)._cache = {};
			}
		}
	}

	getAllViews() {
		return Object.keys(this._viewCache).map(key => this._viewCache[key]);
	}

	public getDocumentTextFromCustomClassName(className: string, isFragment?: boolean) {
		let documentText;
		const classPath = this.getClassFSPathFromClassName(className, isFragment);
		if (classPath && this._checkIfFileExistsCaseSensitive(classPath)) {
			documentText = fs.readFileSync(classPath, "utf8");
		}

		return documentText;
	}

	private _checkIfFileExistsCaseSensitive(filepath: string): boolean {
		const directoryName = path.dirname(filepath)
		if (directoryName === path.dirname(directoryName)) {
			return true;
		}

		const fileNames = fs.readdirSync(directoryName)
		if (fileNames.indexOf(path.basename(filepath)) === -1) {
			return false;
		}

		return this._checkIfFileExistsCaseSensitive(directoryName)
	}

	public getClassFSPathFromClassName(className: string, isFragment?: boolean) {
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

	public convertClassNameToFSPath(className: string, isController = false, isFragment = false, isView = false, isFolder = false) {
		let FSPath;
		let extension = ".ts";
		const manifest = this.getManifestForClass(className);
		if (manifest) {
			if (isController) {
				extension = ".controller.ts";
			} else if (isFragment) {
				extension = ".fragment.xml";
			} else if (isView) {
				extension = ".view.xml";
			} else if (isFolder) {
				extension = "";
			}

			const separator = path.sep;
			FSPath = `${manifest.fsPath}${className.replace(manifest.componentName, "").replace(/\./g, separator).trim()}${extension}`;
		}

		return FSPath;
	}

	public getAllManifests() {
		return this._manifests;
	}

	public rereadAllManifests(wsFolders: WorkspaceFolder[]) {
		this._manifests = [];
		this._fetchAllWorkspaceManifests(wsFolders);
	}

	public getManifestForClass(className = "") {
		const returnManifest = this._manifests.find(UIManifest => className.startsWith(UIManifest.componentName + "."));

		return returnManifest;
	}

	private _fetchAllWorkspaceManifests(wsFolders: WorkspaceFolder[]) {
		for (const wsFolder of wsFolders) {
			const manifests = this.getManifestFSPathsInWorkspaceFolder(wsFolder);
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
					console.error(`Couldn't read manifest.json. Error message: ${(<Error>error).message || ""}`);
					throw error;
				}
			}
		}
	}

	public getManifestFSPathsInWorkspaceFolder(wsFolder: WorkspaceFolder) {
		const timeStart = new Date().getTime();
		const manifestPaths = this._readFilesInWorkspace(wsFolder, "**/manifest.json");
		const timeEnd = new Date().getTime();
		const timeSpent = timeEnd - timeStart;
		if (timeSpent > 5000 || manifestPaths.length > 30) {
			console.info(`Reading manifests took ${timeSpent / 100}s and ${manifestPaths.length} manifests found. Please make sure that "ui5.plugin.excludeFolderPattern" preference is configured correctly.`);
		}

		const manifests: IManifestPaths[] = manifestPaths.map(manifestPath => {
			return {
				fsPath: manifestPath.replace(/\//g, fileSeparator)
			};
		});
		return manifests;
	}

	private _readFilesInWorkspace(wsFolder: WorkspaceFolder, path: string) {
		const wsFolderFSPath = wsFolder.fsPath.replace(new RegExp(`${escapedFileSeparator}`, "g"), "/");
		const exclusions: string[] = this._configHandler.getExcludeFolderPatterns();
		exclusions.push("**/*.d.ts")
		const exclusionPaths = exclusions.map(excludeString => {
			return `${wsFolderFSPath}/${excludeString}`
		});
		const filePaths = glob.sync(`${wsFolderFSPath}/${path}`, {
			ignore: exclusionPaths
		});

		return filePaths;
	}

	//TODO: Refactor this
	public getClassNameFromView(controllerClassName: string, controlId: string) {
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
			const UIClass = this._classFactory.getUIClass(controllerClassName);
			if (UIClass instanceof CustomTSClass) {
				const fragmentsAndViews = this._classFactory.getViewsAndFragmentsOfControlHierarchically(UIClass);
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

	public getViewForController(controllerName: string): IView | undefined {
		let view = this.getAllViews().find(view => view.controllerName === controllerName);
		if (!view) {
			const swappedControllerName = this._swapControllerNameIfItWasReplacedInManifest(controllerName);
			if (swappedControllerName !== controllerName) {
				view = this.getViewForController(swappedControllerName);
			}
		}
		return view;
	}

	private _swapControllerNameIfItWasReplacedInManifest(controllerName: string) {
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

	public getFragmentsMentionedInClass(className: string) {
		let fragments: IFragment[] = [];
		const UIClass = this._classFactory.getUIClass(className);

		if (UIClass instanceof CustomTSClass) {
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

	getFragmentsInXMLFile(XMLFile: IXMLFile) {
		const fragmentsInFragment: IFragment[] = [];
		const fragments = XMLFile.fragments;
		fragments.forEach(fragment => {
			fragmentsInFragment.push(...this.getFragmentsInXMLFile(fragment));
		});

		return fragments.concat(fragmentsInFragment);
	}

	public getFirstFragmentForClass(className: string): IFragment | undefined {
		const fragment = this.getFragmentsMentionedInClass(className)[0];

		return fragment;
	}

	public getViewText(controllerName: string) {
		return this.getViewForController(controllerName)?.content;
	}

	private _getClassOfControlIdFromView(XMLFile: IXMLFile & IIdClassMap, controlId: string) {
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

	readAllFiles(wsFolders: WorkspaceFolder[]) {
		this._readAllFragmentsAndSaveInCache(wsFolders);
		this._readAllViewsAndSaveInCache(wsFolders);
		ResourceModelData.readTexts();
	}

	private _readAllViewsAndSaveInCache(wsFolders: WorkspaceFolder[]) {
		for (const wsFolder of wsFolders) {
			const viewPaths = this._readFilesInWorkspace(wsFolder, "**/*.view.xml");
			viewPaths.forEach(viewPath => {
				const viewContent = fs.readFileSync(viewPath, "utf8");
				const viewFSPath = viewPath.replace(/\//g, fileSeparator);
				this.setNewViewContentToCache(viewContent, viewFSPath);
			});
		}
	}

	private _readAllFragmentsAndSaveInCache(wsFolders: WorkspaceFolder[]) {
		for (const wsFolder of wsFolders) {
			const fragmentPaths = this._readFilesInWorkspace(wsFolder, "**/*.fragment.xml");
			const fragmentData = fragmentPaths.map(path => {
				const fragmentFSPath = path.replace(/\//g, fileSeparator);
				return { fragmentFSPath, content: fs.readFileSync(fragmentFSPath, "utf8") };
			});
			fragmentData.forEach(fragmentData => {
				this.setNewFragmentContentToCache(fragmentData.content, fragmentData.fragmentFSPath);
			});
			fragmentData.forEach(fragmentData => {
				this.setNewFragmentContentToCache(fragmentData.content, fragmentData.fragmentFSPath, true);
			});
		}
	}

	public getAllJSClassNamesFromProject(wsFolder: WorkspaceFolder) {
		let classNames: string[] = [];
		const classPaths = this._readFilesInWorkspace(wsFolder, "**/*.ts");
		classNames = classPaths.reduce((accumulator: string[], viewPath) => {
			const path = this.getClassNameFromPath(viewPath);
			if (path) {
				accumulator.push(path);
			}

			return accumulator;
		}, []);

		return classNames;
	}

	getControllerNameFromView(viewContent: string) {
		const controllerNameResult = /(?<=controllerName=").*?(?=")/.exec(viewContent);
		const controllerName = controllerNameResult ? controllerNameResult[0] : undefined;

		return controllerName;
	}

	getResponsibleClassForXMLDocument(document: TextDocument) {
		const XMLDocument = TextDocumentTransformer.toXMLFile(document);
		if (XMLDocument) {
			return this.getResponsibleClassNameForViewOrFragment(XMLDocument);
		}
	}

	//TODO: compare it to similar method?
	getResponsibleClassNameForViewOrFragment(viewOrFragment: IXMLFile) {
		const isFragment = viewOrFragment.fsPath.endsWith(".fragment.xml");
		const isView = viewOrFragment.fsPath.endsWith(".view.xml");
		let responsibleClassName: string | undefined;

		if (isView) {
			responsibleClassName = this.getControllerNameFromView(viewOrFragment.content);
		} else if (isFragment) {
			const fragmentName = this.getClassNameFromPath(viewOrFragment.fsPath);
			const responsibleView = this.getAllViews().find(view => {
				return !!view.fragments.find(fragmentFromView => fragmentFromView.name === fragmentName);
			})

			if (responsibleView) {
				responsibleClassName = this.getControllerNameFromView(responsibleView.content);
			} else {
				responsibleClassName = this._getResponsibleClassNameForFragmentFromCustomUIClasses(viewOrFragment);
			}

			if (!responsibleClassName) {
				const responsibleFragment = this.getAllFragments().find(fragment => {
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

	public getManifestExtensionsForClass(className: string): any | undefined {
		const manifest = this.getManifestForClass(className);
		return manifest?.content["sap.ui5"]?.extends?.extensions;
	}

	private _getResponsibleClassNameForFragmentFromManifestExtensions(viewOrFragment: IXMLFile) {
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

	private _swapResponsibleControllerIfItIsExtendedInManifest(controllerName: string, sourceClassName: string) {
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

	private _getResponsibleClassNameForFragmentFromCustomUIClasses(viewOrFragment: IXMLFile) {
		// TODO: this
		const allUIClasses = this._classFactory.getAllCustomTSClasses();
		const fragmentName = this.getClassNameFromPath(viewOrFragment.fsPath);
		const responsibleClass = allUIClasses.find(UIClass => {
			return UIClass.classText.includes(`${fragmentName}`);
		});

		return responsibleClass?.className;
	}

	public getFragmentsFromXMLDocumentText(documentText: string) {
		const fragments: IFragment[] = [];
		const fragmentTags = this._getFragmentTags(documentText);
		fragmentTags.forEach(fragmentTag => {
			const fragmentName = this._getFragmentNameFromTag(fragmentTag);
			if (fragmentName) {
				const fragmentPath = this.getClassFSPathFromClassName(fragmentName, true);
				const fragment = this.getFragment(fragmentName);
				if (fragment && fragmentPath) {
					fragments.push(fragment);
				}
			}
		});

		return fragments;
	}

	getFragment(fragmentName: string): IFragment | undefined {
		return this._fragmentCache[fragmentName];
	}

	getAllFragments() {
		return Object.keys(this._fragmentCache).map(key => this._fragmentCache[key]);
	}

	private _getFragmentNameFromTag(fragmentTag: string) {
		let fragmentName;
		const fragmentNameResult = /(?<=fragmentName=").*?(?=")/.exec(fragmentTag);
		if (fragmentNameResult) {
			fragmentName = fragmentNameResult[0];
		}
		return fragmentName;
	}

	private _getFragmentTags(documentText: string) {
		return documentText.match(/<.*?:Fragment\s(.|\s)*?\/>/g) || [];
	}

	public getClassNameFromPath(fsPath: string) {
		fsPath = fsPath.replace(/\//g, fileSeparator);
		let className: string | undefined;
		const manifests = this.getAllManifests();
		const currentManifest = manifests.find(manifest => fsPath.startsWith(manifest.fsPath));
		if (currentManifest) {
			className =
				fsPath
					.replace(currentManifest.fsPath, currentManifest.componentName)
					.replace(/\.view\.xml$/, "")
					.replace(/\.fragment\.xml$/, "")
					.replace(/\.xml$/, "")
					.replace(/\.controller\.ts$/, "")
					.replace(/\.ts$/, "")
					.replace(new RegExp(`${escapedFileSeparator}`, "g"), ".");
		}

		return className;
	}

	getCache(cacheType: FileReader.CacheType) {
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

	setCache(cacheType: FileReader.CacheType, cache: string) {
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

	clearCache() {
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

	private _ensureThatPluginCacheFolderExists() {
		if (this.globalStoragePath) {
			if (!fs.existsSync(this.globalStoragePath)) {
				fs.mkdirSync(this.globalStoragePath, {
					recursive: true
				});
			}
		}
	}

	private _getMetadataCachePath() {
		return `${this.globalStoragePath}${fileSeparator}cache_${this._UI5Version}.json`;
	}

	private _getAPIIndexCachePath() {
		return `${this.globalStoragePath}${fileSeparator}cache_appindex_${this._UI5Version}.json`;
	}

	private _getIconCachePath() {
		return `${this.globalStoragePath}${fileSeparator}cache_icons_${this._UI5Version}.json`;
	}

	public getResourceModelFiles() {
		const manifests = this.getAllManifests();
		return manifests.map(manifest => {
			return {
				content: this.readResourceModelFile(manifest),
				componentName: manifest.componentName
			};
		});
	}

	public readResourceModelFile(manifest: IUIManifest) {
		let resourceModelFileContent = "";
		const resourceModelFilePath = this.getResourceModelUriForManifest(manifest);
		try {
			resourceModelFileContent = fs.readFileSync(resourceModelFilePath, "utf8");
		} catch {
			resourceModelFileContent = "";
		}

		return resourceModelFileContent;
	}

	public getResourceModelUriForManifest(manifest: IUIManifest) {
		const i18nRelativePath = typeof manifest.content["sap.app"]?.i18n === "string" ? manifest.content["sap.app"]?.i18n : `i18n${fileSeparator}i18n.properties`;
		const i18nPath = i18nRelativePath.replace(/\//g, fileSeparator);
		return `${manifest.fsPath}${fileSeparator}${i18nPath}`;
	}

	public removeFromCache(fsPath: string) {
		return this._removeViewFromCache(fsPath) || this._removeFragmentFromCache(fsPath);
	}
	private _removeViewFromCache(fsPath: string) {
		const className = this.getClassNameFromPath(fsPath);
		if (fsPath.endsWith(".view.xml")) {
			if (className) {
				this._viewCache[className].controllerName = "";
				this._viewCache[className].content = "";
				this._viewCache[className].idClassMap = {};
				this._viewCache[className].XMLParserData = undefined;
				this._viewCache[className].fragments = [];
				this._viewCache[className].fsPath = "";
				delete this._viewCache[className];
				return true;
			}
		}
		return false;
	}

	private _removeFragmentFromCache(fsPath: string) {
		const className = this.getClassNameFromPath(fsPath);
		if (fsPath.endsWith(".fragment.xml") && className) {
			if (this._fragmentCache[className]) {
				this._fragmentCache[className].content = "";
				this._fragmentCache[className].idClassMap = {};
				this._fragmentCache[className].XMLParserData = undefined;
				this._fragmentCache[className].fragments = [];
				this._fragmentCache[className].fsPath = "";
				delete this._fragmentCache[className];
				return true;
			}
		}
		return false;
	}

	getXMLFile(className: string, fileType?: string) {
		let xmlFile: IXMLFile | undefined;
		if (fileType === "fragment" || !fileType) {
			xmlFile = this.getFragment(className);
		}

		if (!xmlFile && (fileType === "view" || !fileType)) {
			xmlFile = this._viewCache[className] || this.getAllViews().find(view => view.controllerName === className);
		}

		return xmlFile;
	}

	replaceViewNames(oldName: string, newName: string) {
		const XMLFile = this.getXMLFile(oldName, "view");
		const newFSPath = this.convertClassNameToFSPath(newName, false, false, true);
		if (XMLFile && newFSPath) {
			XMLFile.fsPath = newFSPath;
			XMLFile.name = newName;
		}
	}

	removeView(viewName: string) {
		delete this._viewCache[viewName];
	}

	replaceFragmentNames(oldName: string, newName: string) {
		const fragment = this._fragmentCache[oldName];
		const newFSPath = this.convertClassNameToFSPath(newName, false, true);
		if (fragment && newFSPath) {
			fragment.fsPath = newFSPath;
			fragment.name = newName;
			this._fragmentCache[newName] = this._fragmentCache[oldName];
			delete this._fragmentCache[oldName];
		}
	}
}

interface Fragments {
	[key: string]: IFragment;
}

export namespace FileReader {
	export enum CacheType {
		Metadata = "1",
		APIIndex = "2",
		Icons = "3"
	}
}