import { DiagnosticSeverity, DiagnosticTag, Range, TextDocument } from "vscode";
import { IInternalizationText, ResourceModelData } from "../../../../UI5Classes/ResourceModelData";
import { UIClassFactory } from "../../../../UI5Classes/UIClassFactory";
import { FileReader } from "../../../../utils/FileReader";
import { IError, Linter } from "./abstraction/Linter";

export class UnusedTranslationsLinter extends Linter {
	protected className = "UnusedTranslationsLinter";
	protected _getErrors(document: TextDocument): IError[] | Promise<IError[]> {
		const errors: IError[] = [];
		const className = FileReader.getClassNameFromPath(document.fileName);
		if (className) {
			ResourceModelData.updateCache(document);
			const manifest = FileReader.getManifestForClass(className);
			const componentName = manifest?.componentName;
			if (componentName && ResourceModelData.resourceModels[componentName]) {
				const translations = ResourceModelData.resourceModels[componentName];
				translations.forEach(translation => {
					errors.push(...this._getTranslationErrors(translation, document));
				});
			}
		}
		return errors;
	}
	private _getTranslationErrors(translation: IInternalizationText, document: TextDocument) {
		const errors: IError[] = [];

		const translationId = translation.id;
		if (!this._getIfTranslationIsUsed(translationId)) {
			const positionBegin = document.positionAt(translation.positionBegin);
			const positionEnd = document.positionAt(translation.positionEnd);
			errors.push({
				code: "UI5plugin",
				message: `Translation "${translationId}" is never used`,
				source: "Unused Translations Linter",
				severity: DiagnosticSeverity.Information,
				tags: [DiagnosticTag.Unnecessary],
				range: new Range(
					positionBegin,
					positionEnd
				)
			})
		}

		return errors;
	}
	private _getIfTranslationIsUsed(translationId: string) {
		const UIClasses = UIClassFactory.getAllCustomUIClasses();
		let isUsed = !!UIClasses.find(UIClass => this._checkIfUsed(UIClass.classText, translationId));
		isUsed = isUsed || !!FileReader.getAllViews().find(view => this._checkIfUsed(view.content, translationId));
		isUsed = isUsed || !!FileReader.getAllFragments().find(fragment => this._checkIfUsed(fragment.content, translationId));
		isUsed = isUsed || !!FileReader.getAllManifests().find(manifest => this._checkIfUsed(JSON.stringify(manifest.content), `{{${translationId}}}`));

		return isUsed;
	}
	private _checkIfUsed(content: string, translationId: string): boolean {
		const escapedTranslationId = escapeRegExp(translationId);
		const regExp = new RegExp(`(>|"|')${escapedTranslationId}(}|"|')`);

		return regExp.test(content);
	}
}

function escapeRegExp(string: string) {
	return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}