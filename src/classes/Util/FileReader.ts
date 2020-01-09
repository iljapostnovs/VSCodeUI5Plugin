import * as fs from "fs";
import * as vscode from "vscode";
import * as glob from "glob";
const workspace = vscode.workspace;

export class FileReader {
	private static manifests:UIManifest[] = [];
	private static viewCache:LooseObject = {};

	public static setNewViewContentToCache(viewContent: string) {
		const controllerName = this.getControllerNameFromView(viewContent);
		if (controllerName) {
			this.viewCache[controllerName] = viewContent;
		}
	}

	public static getDocumentTextFromCustomClassName(className: string, isFragment?: boolean) {
		let documentText;
		const classPath = this.getClassPath(className, isFragment);
		if (classPath) {
			documentText = fs.readFileSync(classPath, "ascii");
		}

		return documentText;
	}

	public static getClassPath(className: string, isFragment?: boolean) {
		let classPath: string | undefined;
		const extension = isFragment ? ".fragment.xml" : ".js";
		const manifest = this.getManifestForClass(className);
		if (manifest) {
			classPath = manifest.fsPath + className.replace(manifest.componentName, "").replace(/\./g, "\\").trim() + extension;
			try {
				fs.readFileSync(classPath);
			} catch (error) {
				if (extension === ".js") {
					//thx to controllers for this
					classPath = classPath.replace(".js", ".controller.js");
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

	public static getAllManifests() {
		if (this.manifests.length === 0) {
			this.readAllWorkspaceManifests();
		}

		return this.manifests;
	}

	private static getManifestForClass(className: string) {
		let returnManifest:UIManifest | undefined;
		if (vscode.window.activeTextEditor) {
			if (this.manifests.length === 0) {
				this.readAllWorkspaceManifests();
			}

			returnManifest = this.manifests.find(UIManifest => className.indexOf(UIManifest.componentName) > -1);
		}

		return returnManifest;
	}

	private static readAllWorkspaceManifests() {
		const wsFolders = workspace.workspaceFolders || [];
		for (const wsFolder of wsFolders) {
			const manifests = this.getManifestsInWorkspaceFolder(wsFolder);
			for (const manifest of manifests) {
				const UI5Manifest:any = JSON.parse(fs.readFileSync(manifest.fsPath, "ascii"));
				const manifestFsPath:string = manifest.fsPath.replace("\\manifest.json", "");
				const UIManifest = {
					componentName: UI5Manifest["sap.app"].id,
					fsPath: manifestFsPath
				};
				this.manifests.push(UIManifest);
			}
		}
	}

	public static getManifestsInWorkspaceFolder(wsFolder: vscode.WorkspaceFolder) {
		const src = vscode.workspace.getConfiguration("ui5.plugin").get("src");
		const manifestPaths = glob.sync(wsFolder.uri.fsPath.replace(/\\/g, "/") + "/" + src + "/manifest.json");
		const manifests: manifestPaths[] = manifestPaths.map(manifestPath => {
			return {
				fsPath: manifestPath.replace(/\//g, "\\")
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
		if (this.viewCache[controllerName]) {
			viewText = this.viewCache[controllerName];
		} else {
			this.readAllViewsAndSaveInCache();
			viewText = this.viewCache[controllerName];
		}

		return viewText;
	}

	private static getClassOfControlIdFromView(documentText: string, controlId: string) {
		let controlClass = "";
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
		const src = vscode.workspace.getConfiguration("ui5.plugin").get("src");
		for (const wsFolder of wsFolders) {
			const viewPaths = glob.sync(wsFolder.uri.fsPath.replace(/\\/g, "/") + "/" + src + "/**/*/*.view.xml");
			viewPaths.forEach(viewPath => {
				let viewContent = fs.readFileSync(viewPath, "ascii");
				viewContent = this.replaceFragments(viewContent);
				const controllerName = this.getControllerNameFromView(viewContent);
				if (controllerName) {
					this.viewCache[controllerName] = viewContent;
				}
			});
		}
	}

	private static getControllerNameFromView(viewContent: string) {
		const controllerNameResult = /(?<=controllerName=").*(?=")/.exec(viewContent);

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
		let className: string | undefined;
		const manifests = this.getAllManifests();
		const currentManifest = manifests.find(manifest => fsPath.indexOf(manifest.fsPath) > -1);
		if (currentManifest) {
			className = fsPath.replace(currentManifest.fsPath, currentManifest.componentName).replace(".controller", "").replace(".js","").replace(/\\/g, ".");
		}

		return className;
	}
}

interface UIManifest {
	fsPath: string;
	componentName: string;
}

interface manifestPaths {
	fsPath: string;
}

interface LooseObject {
	[key: string]: any;
}