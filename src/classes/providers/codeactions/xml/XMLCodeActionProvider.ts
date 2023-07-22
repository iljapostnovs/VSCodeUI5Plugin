import { ImportDeclaration, Project } from "ts-morph";
import { AbstractBaseClass, IUIEvent } from "ui5plugin-parser/dist/classes/parsing/ui5class/AbstractBaseClass";
import { CustomTSClass } from "ui5plugin-parser/dist/classes/parsing/ui5class/ts/CustomTSClass";
import * as vscode from "vscode";
import { TextDocumentAdapter } from "../../../adapters/vscode/TextDocumentAdapter";
import { CustomDiagnostics } from "../../../registrators/DiagnosticsRegistrator";
import ParserBearer from "../../../ui5parser/ParserBearer";
import { InsertType, MethodInserter } from "../util/MethodInserter";

export class XMLCodeActionProvider extends ParserBearer {
	async getCodeActions(document: vscode.TextDocument, range: vscode.Range | vscode.Selection) {
		const providerResult: vscode.CodeAction[] = await this._getEventAutofillCodeActions(document, range);

		return providerResult;
	}

	private async _getEventAutofillCodeActions(
		document: vscode.TextDocument,
		selectedAttributeRange: vscode.Range | vscode.Selection
	): Promise<vscode.CodeAction[]> {
		const diagnostics = vscode.languages.getDiagnostics(document.uri);
		const diagnostic: CustomDiagnostics | undefined = diagnostics
			.filter(diagnostic => diagnostic instanceof CustomDiagnostics)
			.find(diagnostic => {
				return diagnostic.range.contains(selectedAttributeRange);
			});
		if (!diagnostic?.attribute) {
			return [];
		}

		const {
			attributeValue: eventHandlerName,
			attributeName: eventName,
			classOfTheTag: tagClassName
		} = this._getAttributeData(document, diagnostic.attribute, selectedAttributeRange) ?? {};

		if (!eventHandlerName || !eventName || !tagClassName) {
			return [];
		}

		const eventData = this._getEventData(tagClassName, eventName);
		const responsibleController = this._parser.fileReader.getResponsibleClassForXMLDocument(
			new TextDocumentAdapter(document)
		);
		if (!eventData || !responsibleController) {
			return [];
		}

		const UIClass = this._parser.classFactory.getUIClass(responsibleController);
		const ownerModule = eventData.owner.replace(/\./g, "/");
		const eventModule =
			vscode.workspace.getConfiguration("ui5.plugin").get<string>("tsEventModule") ?? "sap/ui/base/Event";
		const eventNameToInsert = eventModule.split("/").pop() ?? "Event";
		const tagClassModule = tagClassName.replace(/\./g, "/");

		const variables = {
			classModule: tagClassModule,
			className: tagClassName,
			eventName: eventName,
			tsEventParameters: this._generateEventParameters(eventData),
			tsEvent: this._generateEvent(eventData)
		};

		if (
			UIClass instanceof CustomTSClass &&
			!this._getIfNamedImportExists(UIClass.node.getProject(), ownerModule, variables.tsEventParameters)
		) {
			variables.tsEventParameters = "object";
		}
		if (
			UIClass instanceof CustomTSClass &&
			!this._getIfNamedImportExists(UIClass.node.getProject(), ownerModule, variables.tsEvent)
		) {
			variables.tsEvent = "Event<object>";
		}

		const eventType = vscode.workspace.getConfiguration("ui5.plugin").get<string>("tsEventType") ?? "Event";
		const eventTypeWithReplacedVars = eventType
			.replace("{classModule}", variables.classModule)
			.replace("{className}", variables.className)
			.replace("{eventName}", variables.eventName)
			.replace("{tsEventParameters}", variables.tsEventParameters)
			.replace("{tsEvent}", variables.tsEvent);

		const insertCodeAction = new MethodInserter(this._parser).createInsertMethodCodeAction(
			responsibleController,
			eventHandlerName,
			"oEvent",
			"",
			InsertType.Method,
			eventNameToInsert,
			eventModule,
			eventTypeWithReplacedVars
		);
		if (!insertCodeAction) {
			return [];
		}

		insertCodeAction.diagnostics = [diagnostic];

		if (UIClass instanceof CustomTSClass) {
			const project = UIClass.node.getProject();
			if (
				eventType.includes("{tsEventParameters}") &&
				this._getIfNamedImportExists(project, ownerModule, variables.tsEventParameters)
			) {
				await this._addTSImports(eventData, UIClass, variables.tsEventParameters, insertCodeAction);
			}
			if (
				eventType.includes("{tsEvent}") &&
				this._getIfNamedImportExists(project, ownerModule, variables.tsEvent)
			) {
				await this._addTSImports(eventData, UIClass, variables.tsEvent, insertCodeAction);
			}
		}

		return [insertCodeAction];
	}

	private _getEventData(className: string, eventName: string) {
		const UIClasses = this._getClassAndParents(className);
		const eventDataSet = UIClasses.flatMap(UIClass =>
			UIClass.events.map(UIEvent => ({ event: UIEvent, owner: UIClass.className }))
		);
		const eventData = eventDataSet.find(event => event.event.name === eventName);

		return eventData;
	}

	private _getAttributeData(document: vscode.TextDocument, attribute: string, range: vscode.Range) {
		const XMLFile = this._parser.textDocumentTransformer.toXMLFile(new TextDocumentAdapter(document));
		if (!XMLFile) {
			return;
		}
		const currentPositionOffset = document.offsetAt(range.end);
		const attributeData = this._parser.xmlParser.getAttributeNameAndValue(attribute);
		attributeData.attributeValue = this._parser.xmlParser.getEventHandlerNameFromAttributeValue(
			attributeData.attributeValue
		);
		const tagText = this._parser.xmlParser.getTagInPosition(XMLFile, currentPositionOffset).text;
		const tagPrefix = this._parser.xmlParser.getTagPrefix(tagText);
		const classNameOfTheTag = this._parser.xmlParser.getClassNameFromTag(tagText);
		const libraryPath = this._parser.xmlParser.getLibraryPathFromTagPrefix(
			XMLFile,
			tagPrefix,
			currentPositionOffset
		);
		const classOfTheTag = [libraryPath, classNameOfTheTag].join(".");

		return {
			attributeValue: attributeData.attributeValue,
			attributeName: attributeData.attributeName,
			classOfTheTag
		};
	}

	private _generateEventParameters(eventData: { event: IUIEvent; owner: string }) {
		const ownerName = eventData.owner.split(".").pop() ?? "";
		const eventNameUpper =
			eventData.event.name[0].toUpperCase() + eventData.event.name.substring(1, eventData.event.name.length);
		const tsEventParameters = `${ownerName}$${eventNameUpper}EventParameters`;

		return tsEventParameters;
	}

	private _generateEvent(eventData: { event: IUIEvent; owner: string }) {
		const ownerName = eventData.owner.split(".").pop() ?? "";
		const eventNameUpper =
			eventData.event.name[0].toUpperCase() + eventData.event.name.substring(1, eventData.event.name.length);
		const tsEventParameters = `${ownerName}$${eventNameUpper}Event`;

		return tsEventParameters;
	}

	private _getIfNamedImportExists(project: Project, module: string, parameter: string) {
		const ownerModuleNode = project.getAmbientModule(module);
		const ownerModuleExports = ownerModuleNode?.getExports();
		return !!ownerModuleExports?.some(theExport => theExport.getName() === parameter);
	}

	private async _addTSImports(
		event: { event: IUIEvent; owner: string },
		UIClass: CustomTSClass,
		tsEventOrEventParams: string,
		codeAction: vscode.CodeAction
	) {
		const ownerModule = event.owner.replace(/\./g, "/");
		const existingImportDeclaration = UIClass.node
			.getSourceFile()
			.getImportDeclaration(declaration => declaration.getModuleSpecifierValue() === ownerModule);

		const namedImportExists = existingImportDeclaration
			?.getNamedImports()
			.some(namedImport => namedImport.getName() === tsEventOrEventParams);

		const dummySourceFile = UIClass.node
			.getSourceFile()
			.getProject()
			.createSourceFile(".dummy.ts", "", { overwrite: true });

		let fakeImportDeclaration: ImportDeclaration | undefined;
		if (!existingImportDeclaration) {
			fakeImportDeclaration = dummySourceFile.addImportDeclaration({
				moduleSpecifier: event.owner.replace(/\./g, "/")
			});
		} else {
			fakeImportDeclaration = dummySourceFile.addImportDeclaration(existingImportDeclaration.getStructure());
		}
		if (!namedImportExists && fakeImportDeclaration) {
			fakeImportDeclaration.addNamedImport(tsEventOrEventParams);

			await this._addImportsToCodeAction(codeAction, UIClass, fakeImportDeclaration, existingImportDeclaration);
		}
	}

	private async _addImportsToCodeAction(
		codeAction: vscode.CodeAction,
		UIClass: CustomTSClass,
		newImportDeclaration: ImportDeclaration,
		existingImportDeclaration?: ImportDeclaration
	) {
		const controllerUri = vscode.Uri.file(UIClass.fsPath);
		const document = await vscode.workspace.openTextDocument(controllerUri);
		const positionBegin = existingImportDeclaration && document.positionAt(existingImportDeclaration.getStart());
		const positionEnd = existingImportDeclaration && document.positionAt(existingImportDeclaration.getEnd());
		if (existingImportDeclaration && positionBegin && positionEnd) {
			codeAction.edit?.replace(
				controllerUri,
				new vscode.Range(positionBegin, positionEnd),
				newImportDeclaration.getText()
			);
		} else {
			const lastDeclaration = UIClass.node.getSourceFile().getImportDeclarations().at(-1);
			const position = lastDeclaration && document.positionAt(lastDeclaration.getEnd());

			if (position) {
				codeAction.edit?.insert(controllerUri, position, "\n" + newImportDeclaration.getText());
			}
		}
	}

	private _getClassAndParents(className: string): AbstractBaseClass[] {
		const UIClasses: AbstractBaseClass[] = [];
		const UIClass = this._parser.classFactory.getUIClass(className);
		if (UIClass) {
			UIClasses.push(UIClass);
		}
		if (UIClass?.parentClassNameDotNotation) {
			const parents = this._getClassAndParents(UIClass.parentClassNameDotNotation);
			UIClasses.push(...parents);
		}

		return UIClasses;
	}
}
