// import * as vscode from "vscode";

// class TreeItem extends vscode.TreeItem {
//   constructor(
//     label: string,
//     collapsibleState: vscode.TreeItemCollapsibleState
//   ) {
//     super(label, collapsibleState);
//     this.tooltip = label;
    
//   }
// }

// export class TreeDataProvider implements vscode.TreeDataProvider<TreeItem> {
//   //   onDidChangeTreeData?:
//   //     | vscode.Event<void | TreeItem | TreeItem[] | null | undefined>
//   //     | undefined;

//   constructor(context: vscode.ExtensionContext) {}

//   getTreeItem(element: TreeItem): vscode.TreeItem | Thenable<vscode.TreeItem> {
//     return element;
//   }

//   getChildren(
//     element?: TreeItem | undefined
//   ): vscode.ProviderResult<TreeItem[]> {
//     return [{ label: "a" }, { label: "b" }, { label: "c" }];
//   }

//   //   refresh() {
//   //   }
// }
