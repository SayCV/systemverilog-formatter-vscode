import * as vscode from "vscode";
var fs = require('fs');
import { join, dirname } from "path";
import * as child from "child_process";

import { log } from "./log";

// Constants
const extensionName = "systemverilog-formatter-vscode";
const extensionID = "saycv." + extensionName;

// Get range of document
const textRange = (document: vscode.TextDocument) =>
  new vscode.Range(
    document.lineAt(0).range.start,
    document.lineAt(document.lineCount - 1).range.end
  );

// Format file
const format = (
  veribleBinPath: string,
  filePath: string,
  documentText: string,
  lines: Array<Array<number>> = [],
  inPlace: boolean = false
) => {
  let params = [];
  if (lines.length > 0)
    params.push(
      "--lines " +
      lines.map((range) => range.map((line) => line + 1).join("-")).join(",")
    );
  if (inPlace) params.push("--inplace");
  let runLocation = dirname(filePath);
  let command = [
    join(veribleBinPath, "verible-verilog-format"),
    ...params,
    "-",
  ].join(" ");
  let output = child.execSync(command, {
    cwd: runLocation,
    input: documentText,
  });
  return output.toString();
};

// Extension is activated
export function activate(context: vscode.ExtensionContext) {

  const extensionPath = context.extensionPath;
  const verible_release_info_path = join(
    extensionPath,
    "verible_release_info.json"
  );
  const extensionCfg = vscode.workspace.getConfiguration(
    "systemverilogFormatter"
  );
  const veribleReleaseInfo = (() => {
    if (!isExistsPath(verible_release_info_path)) {
      return;
    }
    return JSON.parse(
      fs.readFileSync(verible_release_info_path).toString());
  })(); 

  const usedVeribleBuild = (() => {
    if (extensionCfg.veribleBuild == "") return "";
    if (extensionCfg.veribleBuild == "none") return "";
    for (const build in veribleReleaseInfo["release_subdirs"]) {
      let buildStr = veribleReleaseInfo["release_subdirs"][build];
      if (buildStr.startsWith(extensionCfg.veribleBuild)) return buildStr;
    }
  })();
  const veribleBinPath = usedVeribleBuild
    ? join(
      extensionPath,
      "verible_release",
      usedVeribleBuild,
      "verible-" + veribleReleaseInfo["tag"],
      "bin"
    )
    : "";

  vscode.languages.registerDocumentRangeFormattingEditProvider(
    "systemverilog",
    {
      provideDocumentRangeFormattingEdits(
        document: vscode.TextDocument,
        range: vscode.Range
      ): vscode.TextEdit[] {
        let filePath = document.uri.fsPath;
        let currentText = document.getText();
        let lines = [[range.start.line, range.end.line]];

        return [
          vscode.TextEdit.replace(
            textRange(document),
            format(veribleBinPath, filePath, currentText, lines)
          ),
        ];
      },
    }
  );

  // Command: formatDocument
  let formatDocument = vscode.commands.registerCommand(
    "extension." + extensionName + ".formatDocument",
    () => {
      var editor = vscode.window.activeTextEditor;
      if (editor) {
        let document = editor.document as vscode.TextDocument;
        let filePath = document.uri.fsPath as string;
        let currentText = document.getText();
        format(veribleBinPath, filePath, currentText);
        editor.edit((editBuilder) =>
          editBuilder.replace(
            textRange(document),
            format(veribleBinPath, filePath, currentText)
          )
        );
      }
    }
  );

  // Command: formatSelection
  let formatSelection = vscode.commands.registerCommand(
    "extension." + extensionName + ".formatSelection",
    () => {
      var editor = vscode.window.activeTextEditor;
      if (editor) {
        let document = editor.document as vscode.TextDocument;
        let currentText = document.getText();
        let filePath = document.uri.fsPath as string;
        let selection = editor.selection;
        if (selection && !selection.isEmpty) {
          let lines = [[selection.start.line, selection.end.line]];
          editor.edit((editBuilder) =>
            editBuilder.replace(
              textRange(document),
              format(veribleBinPath, filePath, currentText, lines)
            )
          );
        }
      }
    }
  );

  var commands = [
    formatDocument,
    formatSelection
  ];
  commands.forEach(function (command) {
    context.subscriptions.push(command);
  });

  log.info(`${extensionName} extension has been activated.`);
}

// Extension is deactivated
export function deactivate() { }

function isExistsPath(path: string) {
  if (path.length === 0) {
    return false;
  }
  try {
    fs.accessSync(path);
    return true;
  } catch (error) {
    console.warn(error.message);
    return false;
  }
}
