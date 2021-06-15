import * as vscode from "vscode";
import { RootNode } from "./RootNode";
export abstract class Node extends vscode.TreeItem {
	parent: Node | RootNode | null = null;
	constructor() {
		super("");
	}
}