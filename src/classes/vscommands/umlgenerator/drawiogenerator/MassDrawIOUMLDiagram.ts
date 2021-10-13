import { Header } from "./drawiouml/Header";
import { Footer } from "./drawiouml/Footer";
import { DrawIOUMLDiagram } from "./DrawIOUMLDiagram";
import * as vscode from "vscode";
import { DependencyLine } from "./drawiouml/lines/DependencyLine";
import { IUMLGenerator } from "./drawiouml/interfaces/IUMLGenerator";
import { ImplementationLine } from "./drawiouml/lines/ImplementationLIne";
import { DiagramGenerator } from "../abstraction/DiagramGenerator";
import { CustomUIClass } from "ui5plugin-parser/dist/classes/UI5Classes/UI5Parser/UIClass/CustomUIClass";
import { UI5Plugin } from "../../../../UI5Plugin";

interface IUsedClassMap {
	[key: string]: {
		isUsed: boolean;
	};
}
interface IUsageMap {
	[key: string]: {
		diagram: DrawIOUMLDiagram;
		// children: InheritanceTree;
		usedBy: DrawIOUMLDiagram[];
		treeDepth: number;
		level: number;
		column: number;
	};
}
export class MassDrawIOUMLDiagram extends DiagramGenerator {
	getFileExtension() {
		return ".drawio"
	}
	generate(wsFolder: vscode.WorkspaceFolder): Promise<string> {
		return new Promise(resolve => {

			const header = new Header();
			const footer = new Footer();
			// let xAxis = 70;

			vscode.window.withProgress({
				location: vscode.ProgressLocation.Notification,
				title: "Generating UML",
				cancellable: false
			}, async progress => {
				const classNames = UI5Plugin.getInstance().parser.fileReader.getAllJSClassNamesFromProject({ fsPath: wsFolder.uri.fsPath });
				const classQuantity = classNames.length;

				const UMLDiagrams: DrawIOUMLDiagram[] = [];
				const promises = classNames.map(className => {
					return new Promise<void>(resolve => {
						setTimeout(() => {
							try {
								const UIClass = UI5Plugin.getInstance().parser.classFactory.getUIClass(className);
								const UMLDiagram = new DrawIOUMLDiagram(UIClass, header);
								UMLDiagrams.push(UMLDiagram);
								// UMLDiagram.xAxis = xAxis;

								// xAxis += UMLDiagram.width + 10;

								progress.report({ message: `${className} generated`, increment: Math.round(100 / classQuantity) });
							} catch (error) {
								console.log(`Failed to generate UML Diagram for ${className}`);
							}
							resolve();
						}, 0);
					});
				});
				await Promise.all(promises);

				MassDrawIOUMLDiagram._calculatePositionsFor(UMLDiagrams);

				const body = UMLDiagrams.reduce((accumulator, UMLDiagram) => {
					accumulator += UMLDiagram.generateBody();

					return accumulator;
				}, "");

				const lines = MassDrawIOUMLDiagram._generateLines(UMLDiagrams, header);

				const UMLDiagram = header.generateXML() + lines + body + footer.generateXML();
				resolve(UMLDiagram);
			});
		});
	}

	private static _calculatePositionsFor(UMLDiagrams: DrawIOUMLDiagram[]) {
		const usageMap = this._buildUsageMap(UMLDiagrams);

		//build used class map
		const usedClassMap: IUsedClassMap = {};
		Object.keys(usageMap).forEach(key => {
			usedClassMap[key] = { isUsed: false };
		});

		let allDiagramsAreUsed = false;
		const previousUMLDiagramRoots: DrawIOUMLDiagram[] = [];
		while (!allDiagramsAreUsed) {
			let biggestTreeDepth = -1;
			let biggestTreeDiagram: DrawIOUMLDiagram | undefined;
			Object.keys(usageMap).forEach(key => {
				const treeDepth = usageMap[key].treeDepth;
				if (treeDepth > biggestTreeDepth && !usedClassMap[key].isUsed) {
					biggestTreeDepth = treeDepth;
					biggestTreeDiagram = usageMap[key].diagram;
				}
			});

			if (biggestTreeDiagram) {
				const usageMapEntryForBiggestTreeDiagram = usageMap[biggestTreeDiagram.UIClass.className];
				if (previousUMLDiagramRoots.length > 0) {
					const previousDiagramLeavesCount = previousUMLDiagramRoots.reduce((accumulator, previousUMLDiagramRoot) => {
						accumulator += this._getLeavesCount(usageMap, previousUMLDiagramRoot);
						return accumulator;
					}, 0);
					usageMapEntryForBiggestTreeDiagram.column = previousDiagramLeavesCount + 1;
				} else {
					usageMapEntryForBiggestTreeDiagram.column = 1;
				}

				this._buildInheritanceTree(usageMap, biggestTreeDiagram, usedClassMap, biggestTreeDiagram, previousUMLDiagramRoots);
				previousUMLDiagramRoots.push(biggestTreeDiagram);
			}

			const unusedDiagram = UMLDiagrams.find(diagram => {
				return !usedClassMap[diagram.UIClass.className].isUsed;
			});
			if (!unusedDiagram) {
				allDiagramsAreUsed = true;
			}
		}
	}

	private static _buildInheritanceTree(usageMap: IUsageMap, rootUMLDiagram: DrawIOUMLDiagram, usedClassMap: IUsedClassMap, UMLDiagram: DrawIOUMLDiagram = rootUMLDiagram, previousRootDiagrams: DrawIOUMLDiagram[] = []) {
		usedClassMap[UMLDiagram.UIClass.className].isUsed = true;

		this._setColumnsForTree(rootUMLDiagram, usageMap);
		const aTreeDiagrams = this._getAllDiagramsInUsageMap(usageMap, rootUMLDiagram);
		aTreeDiagrams.forEach(diagram => {
			usedClassMap[diagram.UIClass.className].isUsed = true;

			diagram.xAxis = this._getDiagramXAxis(usageMap, diagram, rootUMLDiagram, previousRootDiagrams);
			diagram.yAxis = this._getDiagramYAxis(usageMap, diagram, rootUMLDiagram);
		});
	}

	private static _getAllDiagramsInUsageMap(usageMap: IUsageMap, UMLDiagram: DrawIOUMLDiagram, diagrams: DrawIOUMLDiagram[] = []) {
		diagrams.push(UMLDiagram);
		const usageMapEntry = usageMap[UMLDiagram.UIClass.className];

		usageMapEntry.usedBy.forEach(diagram => {
			this._getAllDiagramsInUsageMap(usageMap, diagram, diagrams);
		});

		return diagrams;
	}

	private static _getDiagramXAxis(usageMap: IUsageMap, UMLDiagram: DrawIOUMLDiagram, rootUMLDiagram: DrawIOUMLDiagram, previousRootDiagrams: DrawIOUMLDiagram[]) {
		const previousDiagramColumnCount = previousRootDiagrams.reduce((accumulator, diagram) => {
			accumulator += this._getLeavesCount(usageMap, diagram);
			return accumulator;
		}, 0);

		const columnWidths = this._getColumnWidths(usageMap, rootUMLDiagram);
		const usageMapEntry = usageMap[UMLDiagram.UIClass.className];
		let widthSum = 0;
		for (let i = 0; i < usageMapEntry.column - previousDiagramColumnCount - 1; i++) {
			widthSum += columnWidths[i];
		}

		let widthTakenBeforeThisRootDiagram = 0;
		if (previousRootDiagrams.length > 0) {
			widthTakenBeforeThisRootDiagram = previousRootDiagrams.map(diagram => {
				const columnWidths = this._getColumnWidths(usageMap, diagram);

				return columnWidths.reduce((accum, width) => accum + width, 0);
			}).reduce((accum, width) => accum + width, 0);
		}

		return widthTakenBeforeThisRootDiagram + widthSum;
	}

	private static _getColumnWidths(usageMap: IUsageMap, rootDiagram: DrawIOUMLDiagram) {
		const columnsCount = this._getLeavesCount(usageMap, rootDiagram);
		const columnWidths: number[] = [];

		for (let i = 1; i <= columnsCount; i++) {
			const column = i;
			const currentColumnDiagrams = Object.keys(usageMap).map(key => usageMap[key]).filter(usageEntry => usageEntry.column === column);

			let maxDiagramWidth = 0;
			currentColumnDiagrams.forEach(usageMapEntry => {
				if (usageMapEntry.diagram.width > maxDiagramWidth) {
					maxDiagramWidth = usageMapEntry.diagram.width;
				}
			});

			columnWidths.push(maxDiagramWidth + 50);
		}

		return columnWidths;
	}

	private static _getDiagramYAxis(usageMap: IUsageMap, UMLDiagram: DrawIOUMLDiagram, rootUMLDiagram: DrawIOUMLDiagram) {
		const rowsCount = this._getTreeHeight(usageMap, rootUMLDiagram);
		const rowHeights: number[] = [];

		for (let i = 1; i <= rowsCount; i++) {
			const row = i;
			const currentRowDiagrams = Object.keys(usageMap).map(key => usageMap[key]).filter(usageEntry => usageEntry.level === row);

			let maxHeight = 0;
			currentRowDiagrams.forEach(usageMapEntry => {
				if (usageMapEntry.diagram.classHead.height > maxHeight) {
					maxHeight = usageMapEntry.diagram.classHead.height;
				}
			});

			rowHeights.push(maxHeight);
		}

		const usageMapEntry = usageMap[UMLDiagram.UIClass.className];
		let heightsSum = 0;
		for (let i = 0; i < usageMapEntry.level - 1; i++) {
			heightsSum += rowHeights[i] + 100;
		}

		return heightsSum;
	}

	private static _getTreeHeight(usageMap: IUsageMap, UMLDiagram: DrawIOUMLDiagram) {
		const usageMapEntry = usageMap[UMLDiagram.UIClass.className];
		let height = usageMapEntry.level;

		const heights = usageMapEntry.usedBy.map(diagram => {
			return this._getTreeHeight(usageMap, diagram);
		});

		if (heights.length > 0) {
			height = Math.max(...heights);
		}

		return height;
	}

	private static _getLeavesCount(usageMap: IUsageMap, UMLDiagram: DrawIOUMLDiagram) {
		const usageMapEntry = usageMap[UMLDiagram.UIClass.className];
		let leavesCount = 0;
		usageMapEntry.usedBy.forEach(child => {
			const usageMapEntry = usageMap[child.UIClass.className];
			if (usageMapEntry.usedBy.length === 0) {
				leavesCount++;
			} else {
				leavesCount += this._getLeavesCount(usageMap, usageMapEntry.diagram);
			}
		});

		return leavesCount || 1;
	}

	private static _buildUsageMap(UMLDiagrams: DrawIOUMLDiagram[], usageMap: IUsageMap = {}) {
		//build initial structure
		UMLDiagrams.forEach(UMLDiagram => {
			const UIClass = UMLDiagram.UIClass;
			usageMap[UIClass.className] = {
				diagram: UMLDiagram,
				usedBy: [],
				level: 0,
				treeDepth: 0,
				column: 0
			};
		});

		//add usedBy
		UMLDiagrams.forEach(UMLDiagram => {
			const UIClass = UMLDiagram.UIClass;
			if (UIClass instanceof CustomUIClass) {
				if (UIClass.parentClassNameDotNotation) {
					usageMap[UIClass.parentClassNameDotNotation]?.usedBy.push(UMLDiagram);
				}
			}
		});

		//calculate tree depth
		Object.keys(usageMap).forEach(key => {
			usageMap[key].treeDepth = this._getTreeDepth(usageMap[key].diagram, usageMap);
		});

		UMLDiagrams = UMLDiagrams.sort((a, b) => {
			const firstUsageMap = usageMap[a.UIClass.className];
			const secondUsageMap = usageMap[b.UIClass.className];

			return secondUsageMap.treeDepth - firstUsageMap.treeDepth;
		});

		this._setTreeLevels(UMLDiagrams, usageMap);

		return usageMap;
	}

	private static _getTreeDepth(UMLDiagram: DrawIOUMLDiagram, usageMap: IUsageMap) {
		const usageMapEntry = usageMap[UMLDiagram.UIClass.className];
		let treeDepth = usageMapEntry.usedBy.length;
		usageMapEntry.usedBy.forEach(diagram => {
			treeDepth += this._getTreeDepth(diagram, usageMap);
		});

		return treeDepth;
	}

	private static _setTreeLevels(UMLDiagrams: DrawIOUMLDiagram[], usageMap: IUsageMap, currentLevel = 1) {
		UMLDiagrams.forEach(UMLDiagram => {
			const usageMapEntry = usageMap[UMLDiagram.UIClass.className];
			if (usageMapEntry.level === 0) {
				usageMapEntry.level = currentLevel;
				this._setTreeLevels(usageMapEntry.usedBy, usageMap, currentLevel + 1);
			}
		});
	}

	private static _setColumnsForTree(rootDiagram: DrawIOUMLDiagram, usageMap: IUsageMap) {
		const rootUsageMapEntry = usageMap[rootDiagram.UIClass.className];

		let currentChildrenColumn = rootUsageMapEntry.column;
		rootUsageMapEntry.usedBy.forEach((diagram, i) => {
			const usageMapEntry = usageMap[diagram.UIClass.className];
			if (i === 0) {
				usageMapEntry.column = rootUsageMapEntry.column;
			} else {
				usageMapEntry.column = currentChildrenColumn;
			}
			currentChildrenColumn += this._getLeavesCount(usageMap, diagram);

			this._setColumnsForTree(diagram, usageMap);
		});
	}

	private static _generateLines(UMLDiagrams: DrawIOUMLDiagram[], header: Header) {
		let lines = "";
		UMLDiagrams.forEach(UMLDiagram => {
			const UIClass = UMLDiagram.UIClass;
			if (UIClass instanceof CustomUIClass) {
				UIClass.UIDefine.forEach(define => {
					const accordingUMLDiagram = UMLDiagrams.find(diagram => diagram.UIClass.className === define.classNameDotNotation);
					if (accordingUMLDiagram) {
						let line: IUMLGenerator;
						if (accordingUMLDiagram.UIClass.className === UMLDiagram.UIClass.parentClassNameDotNotation) {
							line = new ImplementationLine(header, { source: UMLDiagram.classHead, target: accordingUMLDiagram.classHead });
						} else {
							line = new DependencyLine(header, { source: UMLDiagram.classHead, target: accordingUMLDiagram.classHead });
						}
						lines += line.generateXML();
					}
				});
			}
		});

		return lines;
	}
}