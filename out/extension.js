"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.SecurityFixer = void 0;
exports.activate = activate;
exports.deactivate = deactivate;
/**
 * -----------------------------------------------------------------------------
 * EXTENSION.TS (FINAL VERSION WITH METRICS TRACKING)
 * -----------------------------------------------------------------------------
 * This version adds the "metrics" stretch goal by tracking how many fixes
 * have been applied and showing the count in the VS Code status bar.
 * -----------------------------------------------------------------------------
 */
const vscode = __importStar(require("vscode"));
const child_process_1 = require("child_process");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
let diagnosticCollection;
// --- NEW: A variable to hold our status bar item ---
let statusBarItem;
function activate(context) {
    console.log('CognitiveTrust Security Extension is now active!');
    diagnosticCollection = vscode.languages.createDiagnosticCollection('cognitiveTrustSecurity');
    context.subscriptions.push(diagnosticCollection);
    // --- NEW: Initialize the metrics counter and status bar item ---
    let fixesApplied = 0;
    // Create the item and place it on the left side of the status bar
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    statusBarItem.text = `🛡️ ${fixesApplied} Fixes Applied`; // Use a shield icon
    statusBarItem.tooltip = "CognitiveTrust: Number of security fixes applied in this session.";
    statusBarItem.show();
    context.subscriptions.push(statusBarItem);
    const scanDocument = (document) => {
        if (document.languageId === 'python' || document.fileName.endsWith('requirements.txt')) {
            runSemgrepScan(document, context);
        }
    };
    // --- Event Listeners for scanning ---
    context.subscriptions.push(vscode.workspace.onDidSaveTextDocument(scanDocument));
    context.subscriptions.push(vscode.workspace.onDidOpenTextDocument(scanDocument));
    // --- REGISTER THE CUSTOM COMMAND FOR APPLYING FIXES ---
    context.subscriptions.push(vscode.commands.registerCommand('trusttrust.applyFixAndRescan', async (uri, edit) => {
        await vscode.workspace.applyEdit(edit);
        // --- NEW: Increment the counter and update the status bar ---
        fixesApplied++;
        statusBarItem.text = `🛡️ ${fixesApplied} Fixes Applied`;
        // Find the document that was just changed and trigger a new scan.
        const doc = vscode.workspace.textDocuments.find(d => d.uri.toString() === uri.toString());
        if (doc) {
            scanDocument(doc);
        }
    }));
    // --- Register the "Quick Fix" provider ---
    context.subscriptions.push(vscode.languages.registerCodeActionsProvider('python', new SecurityFixer(), {
        providedCodeActionKinds: SecurityFixer.providedCodeActionKinds
    }));
    // --- Initial Scan ---
    if (vscode.window.activeTextEditor) {
        scanDocument(vscode.window.activeTextEditor.document);
    }
}
function runSemgrepScan(document, context) {
    const filePath = document.uri.fsPath;
    const rulesPath = path.join(context.extensionPath, 'rules');
    if (!fs.existsSync(rulesPath)) {
        vscode.window.showErrorMessage(`CognitiveTrust: Rules directory not found at ${rulesPath}`);
        return;
    }
    const command = `semgrep --config "${rulesPath}" --json "${filePath}"`;
    (0, child_process_1.exec)(command, (error, stdout, stderr) => {
        diagnosticCollection.delete(document.uri);
        if (error && !stdout) {
            console.error(`Semgrep execution error: ${error.message}`);
            return;
        }
        try {
            if (stdout) {
                const semgrepOutput = JSON.parse(stdout);
                const diagnostics = createDiagnostics(semgrepOutput);
                diagnosticCollection.set(document.uri, diagnostics);
            }
        }
        catch (e) {
            console.error('Failed to parse Semgrep output:', e);
        }
    });
}
function createDiagnostics(output) {
    const diagnostics = [];
    if (!output.results) {
        return diagnostics;
    }
    for (const result of output.results) {
        const range = new vscode.Range(result.start.line - 1, result.start.col - 1, result.end.line - 1, result.end.col - 1);
        const severity = result.extra.severity === 'ERROR' ? vscode.DiagnosticSeverity.Error : vscode.DiagnosticSeverity.Warning;
        const diagnostic = new vscode.Diagnostic(range, result.extra.message, severity);
        diagnostic.source = 'CognitiveTrust Security';
        diagnostic.code = result.check_id;
        diagnostics.push(diagnostic);
    }
    return diagnostics;
}
class SecurityFixer {
    static providedCodeActionKinds = [vscode.CodeActionKind.QuickFix];
    provideCodeActions(document, range, context) {
        return context.diagnostics
            .filter(diagnostic => diagnostic.range.contains(range))
            .map(diagnostic => this.createFixForDiagnostic(document, diagnostic))
            .filter((action) => !!action);
    }
    createFixForDiagnostic(document, diagnostic) {
        const code = diagnostic.code?.toString();
        if (code?.endsWith('hardcoded-secret')) {
            return this.createHardcodedSecretFix(document, diagnostic);
        }
        if (code?.endsWith('missing-authorization')) {
            return this.createMissingAuthFix(document, diagnostic);
        }
        return undefined;
    }
    createHardcodedSecretFix(document, diagnostic) {
        const fix = new vscode.CodeAction('Fix: Replace secret with environment variable', vscode.CodeActionKind.QuickFix);
        fix.diagnostics = [diagnostic];
        const edit = new vscode.WorkspaceEdit();
        const line = document.lineAt(diagnostic.range.start.line);
        const variableName = line.text.split('=')[0].trim();
        const newText = `${variableName} = os.environ.get("${variableName}")`;
        edit.replace(document.uri, line.range, newText);
        if (!document.getText().includes('import os')) {
            edit.insert(document.uri, new vscode.Position(0, 0), 'import os\n');
        }
        fix.command = {
            command: 'trusttrust.applyFixAndRescan',
            title: 'Apply Fix and Rescan',
            arguments: [document.uri, edit]
        };
        fix.isPreferred = true;
        return fix;
    }
    createMissingAuthFix(document, diagnostic) {
        const fix = new vscode.CodeAction('Fix: Add placeholder for authorization check', vscode.CodeActionKind.QuickFix);
        fix.diagnostics = [diagnostic];
        const edit = new vscode.WorkspaceEdit();
        const functionDefLine = document.lineAt(diagnostic.range.start.line);
        const indentation = functionDefLine.text.match(/^\s*/)?.[0] || '';
        const insertPosition = new vscode.Position(diagnostic.range.start.line + 1, 0);
        const commentText = `${indentation}    # TODO: Add authorization and authentication checks here.\n`;
        edit.insert(document.uri, insertPosition, commentText);
        fix.command = {
            command: 'trusttrust.applyFixAndRescan',
            title: 'Apply Fix and Rescan',
            arguments: [document.uri, edit]
        };
        fix.isPreferred = true;
        return fix;
    }
}
exports.SecurityFixer = SecurityFixer;
function deactivate() {
    if (diagnosticCollection) {
        diagnosticCollection.clear();
        diagnosticCollection.dispose();
    }
    // --- NEW: Clean up the status bar item when the extension is deactivated ---
    if (statusBarItem) {
        statusBarItem.dispose();
    }
}
//# sourceMappingURL=extension.js.map