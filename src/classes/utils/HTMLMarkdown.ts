import { MarkdownString } from "vscode";

export default class HTMLMarkdown extends MarkdownString {
	constructor(value?: string | undefined, supportThemeIcons?: boolean | undefined) {
		super(value, supportThemeIcons);

		this.supportHtml = true;
	}
}
