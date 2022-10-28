import * as vscode from "vscode";

export default class Progress {
	private static waitFor(ms: number) {
		return new Promise<void>(resolve => {
			setTimeout(() => {
				resolve();
			}, ms);
		});
	}
	static show(fnJob: () => Thenable<void>, title: string) {
		return vscode.window.withProgress(
			{
				location: vscode.ProgressLocation.Window,
				title: "UI5Plugin",
				cancellable: false
			},
			async progress => {
				progress.report({
					message: title,
					increment: 1
				});
				await this.waitFor(0);
				try {
					await fnJob();
					progress.report({
						message: title,
						increment: 100
					});
				} catch (oError) {
					progress.report({
						message: title,
						increment: 100
					});
				}
			}
		);
	}
}
