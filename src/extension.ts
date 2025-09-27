/**
 * -----------------------------------------------------------------------------
 * EXTENSION.TS (FINAL VERSION WITH METRICS TRACKING)
 * -----------------------------------------------------------------------------
 * This version adds the "metrics" stretch goal by tracking how many fixes
 * have been applied and showing the count in the VS Code status bar.
 * -----------------------------------------------------------------------------
 */
import * as vscode from 'vscode';
import { exec } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

let diagnosticCollection: vscode.DiagnosticCollection;
// --- NEW: A variable to hold our status bar item ---
let statusBarItem: vscode.StatusBarItem;

export function activate(context: vscode.ExtensionContext) {
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

    const scanDocument = (document: vscode.TextDocument) => {
        if (document.languageId === 'python' || document.fileName.endsWith('requirements.txt')) {
            runSemgrepScan(document, context);
        }
    };

    // --- Event Listeners for scanning ---
    context.subscriptions.push(vscode.workspace.onDidSaveTextDocument(scanDocument));
    context.subscriptions.push(vscode.workspace.onDidOpenTextDocument(scanDocument));
    
    // --- REGISTER THE CUSTOM COMMAND FOR APPLYING FIXES ---
    context.subscriptions.push(
        vscode.commands.registerCommand('trusttrust.applyFixAndRescan', async (uri: vscode.Uri, edit: vscode.WorkspaceEdit) => {
            await vscode.workspace.applyEdit(edit);
            
            // --- NEW: Increment the counter and update the status bar ---
            fixesApplied++;
            statusBarItem.text = `🛡️ ${fixesApplied} Fixes Applied`;

            // Find the document that was just changed and trigger a new scan.
            const doc = vscode.workspace.textDocuments.find(d => d.uri.toString() === uri.toString());
            if (doc) {
                scanDocument(doc);
            }
        })
    );

    // --- Register the "Quick Fix" provider ---
    context.subscriptions.push(
        vscode.languages.registerCodeActionsProvider('python', new SecurityFixer(), {
            providedCodeActionKinds: SecurityFixer.providedCodeActionKinds
        })
    );

    // --- Initial Scan ---
    if (vscode.window.activeTextEditor) {
        scanDocument(vscode.window.activeTextEditor.document);
    }
}

function runSemgrepScan(document: vscode.TextDocument, context: vscode.ExtensionContext) {
    const filePath = document.uri.fsPath;
    const rulesPath = path.join(context.extensionPath, 'rules');

    if (!fs.existsSync(rulesPath)) {
        vscode.window.showErrorMessage(`CognitiveTrust: Rules directory not found at ${rulesPath}`);
        return;
    }

    const command = `semgrep --config "${rulesPath}" --json "${filePath}"`;

    exec(command, (error, stdout, stderr) => {
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
        } catch (e) {
            console.error('Failed to parse Semgrep output:', e);
        }
    });
}

function createDiagnostics(output: any): vscode.Diagnostic[] {
    const diagnostics: vscode.Diagnostic[] = [];
    if (!output.results) { return diagnostics; }
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

export class SecurityFixer implements vscode.CodeActionProvider {
    public static readonly providedCodeActionKinds = [vscode.CodeActionKind.QuickFix];

    public provideCodeActions(document: vscode.TextDocument, range: vscode.Range, context: vscode.CodeActionContext): vscode.CodeAction[] {
        return context.diagnostics
            .filter(diagnostic => diagnostic.range.contains(range))
            .map(diagnostic => this.createFixForDiagnostic(document, diagnostic))
            .filter((action): action is vscode.CodeAction => !!action);
    }

    private createFixForDiagnostic(document: vscode.TextDocument, diagnostic: vscode.Diagnostic): vscode.CodeAction | undefined {
        const code = diagnostic.code?.toString();

        if (code?.endsWith('hardcoded-secret')) {
            return this.createHardcodedSecretFix(document, diagnostic);
        }
        
        if (code?.endsWith('missing-authorization')) {
            return this.createMissingAuthFix(document, diagnostic);
        }

        return undefined;
    }

    private createHardcodedSecretFix(document: vscode.TextDocument, diagnostic: vscode.Diagnostic): vscode.CodeAction {
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

    private createMissingAuthFix(document: vscode.TextDocument, diagnostic: vscode.Diagnostic): vscode.CodeAction {
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

export function deactivate() {
    if (diagnosticCollection) {
        diagnosticCollection.clear();
        diagnosticCollection.dispose();
    }
    // --- NEW: Clean up the status bar item when the extension is deactivated ---
    if (statusBarItem) {
        statusBarItem.dispose();
    }
}
