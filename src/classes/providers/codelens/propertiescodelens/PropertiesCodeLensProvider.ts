import { join } from "path";
import { ParserPool } from "ui5plugin-parser";
import { ICacheable } from "ui5plugin-parser/dist/classes/parsing/abstraction/ICacheable";
import { IInternalizationText } from "ui5plugin-parser/dist/classes/parsing/util/i18n/ResourceModelData";
import * as vscode from "vscode";
import { RangeAdapter } from "../../../adapters/vscode/RangeAdapter";
import ParserBearer from "../../../ui5parser/ParserBearer";

interface IPropertiesCodeLensCache {
	[key: string]: vscode.Range[];
}

export class PropertiesCodeLensProvider extends ParserBearer {
	getCodeLenses(document: vscode.TextDocument): vscode.CodeLens[] {
		const className = this._parser.fileReader.getClassNameFromPath(document.uri.fsPath);
		const manifest = className && ParserPool.getManifestForClass(className);
		const translations = manifest && this._parser.resourceModelData.resourceModels[manifest.componentName];

		if (!translations) {
			return [];
		}

		const codeLenses = translations.reduce((codeLenses: vscode.CodeLens[], translation) => {
			const locations = this._getTranslationLocations(translation);
			const range = RangeAdapter.offsetsToVSCodeRange(
				document.getText(),
				translation.positionBegin,
				translation.positionEnd - 1
			);
			const codeLens = range && new vscode.CodeLens(range);
			if (codeLens) {
				codeLens.command = {
					title: `${locations.length} reference${locations.length === 1 ? "" : "s"}`,
					command: locations.length ? "editor.action.showReferences" : "",
					arguments: [document.uri, range.start, locations]
				};
				codeLenses.push(codeLens);
			}

			return codeLenses;
		}, []);

		return codeLenses;
	}

	private _getTranslationLocations(translation: IInternalizationText): vscode.Location[] {
		const classLocations = ParserPool.getAllCustomUIClasses().flatMap(UIClass => {
			return this._getTranslationRanges(UIClass.classText, translation.id, UIClass).map(range => {
				const uri = vscode.Uri.file(UIClass.fsPath);
				return new vscode.Location(uri, range);
			});
		});
		const viewLocations = ParserPool.getAllViews().flatMap(view =>
			this._getTranslationRanges(view.content, translation.id, view).map(range => {
				const uri = vscode.Uri.file(view.fsPath);
				return new vscode.Location(uri, range);
			})
		);
		const fragmentLocations = ParserPool.getAllFragments().flatMap(fragment =>
			this._getTranslationRanges(fragment.content, translation.id, fragment).map(range => {
				const uri = vscode.Uri.file(fragment.fsPath);
				return new vscode.Location(uri, range);
			})
		);
		const manifestLocations = ParserPool.getAllManifests().flatMap(manifest =>
			this._getTranslationRanges(manifest.contentString, `{{${translation.id}}}`, manifest).map(range => {
				const uri = vscode.Uri.file(join(manifest.fsPath, "/manifest.json"));
				return new vscode.Location(uri, range);
			})
		);

		return [...classLocations, ...viewLocations, ...fragmentLocations, ...manifestLocations];
	}

	private _getTranslationRanges(content: string, translationId: string, cache: ICacheable) {
		let cacheObject = cache?.getCache<IPropertiesCodeLensCache | undefined>("propertiesCodeLens");
		if (cacheObject?.[translationId]) {
			return cacheObject[translationId];
		}
		const escapedTranslationId = escapeRegExp(translationId);
		const regExp = new RegExp(`(?<=(>|"|'))${escapedTranslationId}(?=(}|"|'))`, "g");

		// const result =  regExp.exec(content);
		const translations = content.matchAll(regExp);

		const ranges: vscode.Range[] = [];
		for (const translation of translations) {
			const start = translation.index;
			if (start !== undefined) {
				const end = start + translation[0].length - 1;
				const range = RangeAdapter.offsetsToVSCodeRange(content, start, end);
				if (range) {
					ranges.push(range);
				}
			}
		}

		if (!cacheObject) {
			cacheObject = {};
		}
		cacheObject[translationId] = ranges;
		cache?.setCache("propertiesCodeLens", cacheObject);

		return ranges;
	}
}

function escapeRegExp(string: string) {
	return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
