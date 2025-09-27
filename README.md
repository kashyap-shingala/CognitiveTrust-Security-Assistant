# CognitiveTrust-Security-Assistant

# 🛡️ CognitiveTrust Security Assistant for VS Code

 The **CognitiveTrust Security Assistant** is a Visual Studio Code extension built to integrate security directly into the development workflow, specifically targeting issues commonly introduced by AI code generation tools like GitHub Copilot.

 It actively monitors Python code for common security anti-patterns using **Semgrep**, provides clear, actionable fix suggestions, and enables one-click application of these fixes, followed by an automatic re-scan.

---

## 🌟 Features Overview

| Feature Category | Description | Status |
| :--- | :--- | :--- |
| **Code Scanning** |  Uses the Semgrep CLI to scan Python files upon save or open for security anti-patterns | **Implemented** |
| **Security Detection** |  Focuses on Hardcoded Secrets and Missing Authorization Checks. | **Implemented** |
| **Fix Suggestions** |  Displays suggestions inline or as popups (like linting warnings) for detected issues | **Implemented** |
| **Auto-Fix** |  Provides one-click auto-replace functionality for at least one issue type (Hardcoded Secrets) | **Implemented** |
| **Rescan After Fix** |  Automatically re-runs the security scan after applying a fix to confirm resolution. | **Implemented** |
| **Metrics Tracking** |  Tracks and displays the total number of security fixes applied in the VS Code status bar (Optional Bonus Goal) | **Implemented** |
| **Prompt Enrichment** | (Goal: Review/enhance developer prompts with security requirements)   | **To Be Implemented** |

---

## 🛠️ Setup and Installation

### Prerequisites

1.  **VS Code:** Visual Studio Code installed (Tested with `^1.85.0`).
2.  **Semgrep CLI:** The Semgrep command-line interface must be **installed globally** and accessible from your system's path, as the extension executes it as a subprocess (`exec(command, ...)`).
3.  **Python:** The extension primarily targets Python files.

### Installation Steps (For Developers)

1.  **Clone the Repository:**
    ```bash
    git clone [your-repo-url]
    cd cognitive-trust-assistant
    ```
2.  **Install Node Dependencies:**
    ```bash
    npm install
    ```
3.  **Compile TypeScript to JavaScript:**
    ```bash
    npm run compile
    ```
4.  **Place Semgrep Rules:**
    * Ensure the provided Semgrep rule files (`hardcoded_secrets.yml`, `missing_auth_check.yml`, etc.) are placed in a dedicated `/rules` directory within the extension's root folder, as the extension uses this path to run the scan.
5.  **Run the Extension:**
    * Open the project folder in VS Code.
    * Go to the **Run and Debug** view (`Ctrl` + `Shift` + `D` or `Cmd` + `Shift` + `D`).
    * Select the **"Launch Extension"** configuration and press $\text{F5}$ to open a new **Extension Development Host** window.

---

## 🧪 Usage and Testing

### Testing Vulnerability Detection

Open the following files in the Extension Development Host to see the diagnostics appear:

| Vulnerability Type | File | Insecure Code Snippet | Semgrep Rule Used |
| :--- | :--- | :--- | :--- |
| **Hardcoded Secret**  | `hardcoded_secret.py` | `API_KEY = "12345-abcdef-secret-key"` | `hardcoded-secret` |
| **Missing Authorization** | `missing_auth.py` | `@app.route("/admin")\ndef admin_panel():` | `missing-authorization` |

### Applying Quick Fixes

1.  Place your cursor on a highlighted vulnerability (e.g., the `API_KEY` line).
2.  Click the lightbulb icon or press `Ctrl + .` / `Cmd + .`.
3.  **For Hardcoded Secret:** Select **"Fix: Replace secret with environment variable"**.
    * **Action:** The code is replaced with `API_KEY = os.environ.get("API_KEY")`, and `import os` is added if needed.
4.  **For Missing Authorization:** Select **"Fix: Add placeholder for authorization check"**.
    * **Action:** A reminder comment is inserted inside the function body.

 In both cases, the custom command `trusttrust.applyFixAndRescan` is executed, which applies the change, **increments the fix counter** in the status bar, and instantly re-scans the file to confirm the diagnostic is cleared.

---

## ⚙️ Core Components

* **`extension.ts`**: The main entry point. It handles extension activation, registers event listeners for file operations (save/open), manages the `vscode.DiagnosticCollection`, and registers the custom command and Code Action Provider.
* **`runSemgrepScan`**: Executes the Semgrep CLI subprocess and parses its JSON output into VS Code Diagnostics.
* **`SecurityFixer` Class**: Implements `vscode.CodeActionProvider`. It intercepts diagnostics and provides context-specific `QuickFix` actions, bundling the required code edits with the `trusttrust.applyFixAndRescan` command.
* **Status Bar Item (Metrics)**: A dedicated `vscode.StatusBarItem` is initialized to display the counter for applied security fixes (e.g., `🛡️ 1 Fixes Applied`).
* **`package.json`**: Defines the extension's metadata, activation events (`onLanguage:python`, `onStartupFinished`), and registers the custom command `trusttrust.applyFixAndRescan`.

---

## 💡 Future Development (Scaling & Stretch Goals)

1.  **OpenAI Refactoring Integration (Stretch Goal)**: Use the OpenAI API to offer more intelligent, context-aware code refactoring for insecure patterns, going beyond simple find-and-replace actions.
2.  **Configuration and Scope:** Allow users to configure Semgrep rules, ignore paths, and enable/disable multi-file workspace scanning.
