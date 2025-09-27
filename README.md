# CognitiveTrust Security Assistant 🛡️

A Visual Studio Code extension designed to help developers write secure code in real-time. By integrating with **Semgrep** as its static analysis engine, it detects common security issues and offers one-click fixes and suggestions.

---

## 🚀 Getting Started / Installation Guide

To set up the project for development and run the extension:

1.  **Clone the repository:**
    ```bash
    git clone [https://github.com/your-username/CognitiveTrust-Security-Assistant.git](https://github.com/your-username/CognitiveTrust-Security-Assistant.git)
    cd CognitiveTrust-Security-Assistant
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Install Semgrep:**
    The extension relies on the Semgrep CLI being available in your system's PATH.
    ```bash
    pip install semgrep
    # or follow the official Semgrep installation guide
    ```

4.  **Launch the Extension in Debug Mode:**
    * Open the project folder in Visual Studio Code (`code .`).
    * Press **F5** to start a new VS Code window with the extension loaded.

5.  **Test the Extension:**
    * In the new window, open a Python file.
    * Introduce one of the supported insecure patterns (e.g., a hardcoded secret) to see the diagnostics and Quick Fix suggestions appear.

---

## ✨ Features and Supported Security Issues

The extension currently supports detection and fixing for the following common security issues:

### 1. Hardcoded Secrets (Use of Hard-coded Credentials)

-   **Detection:** Identifies strings assigned to variables with secret-like names (e.g., `API_KEY`, `secret`, `token`).
-   **Fix Strategy (Auto-Fix):** Automatically replaces the hardcoded secret value with a secure lookup using environment variables (`os.environ.get(...)`). If missing, it inserts `import os` at the top of the file.
-   **Example:**
    ```python
    API_KEY = "12345-abcdef-secret-key"
    ```
    is refactored to:
    ```python
    import os
    API_KEY = os.environ.get("API_KEY")
    ```

### 2. Missing Authorization Checks (Improper Authorization)

-   **Detection:** Identifies function definitions decorated as web framework routes (like Flask’s `@app.route`) that lack explicit authorization checks.
-   **Fix Strategy (Suggestion):** Inserts a `# TODO` comment after the function definition to remind developers to add authentication or role validation.
-   **Example:**
    ```python
    @app.route("/admin")
    def admin_panel():
        return "Welcome, admin!"
    ```
    becomes:
    ```python
    @app.route("/admin")
    def admin_panel():
        # TODO: Add authorization and authentication checks here.
        return "Welcome, admin!"
    ```

### 3. Vulnerable Library Scanning (Outdated Dependencies Detection)

-   **Detection:** Parses dependency files such as `requirements.txt` to detect outdated or vulnerable third-party libraries.
-   **Fix Strategy (Suggestion):** Provides upgrade recommendations but **does not auto-upgrade**. Developers are reminded to update to secure versions.
-   **Example:**
    If `requirements.txt` contains: `flask==1.0` and Flask 1.0 is known to be vulnerable, the extension highlights it and suggests:
    ```
    # Suggested fix: Upgrade flask to >=2.0.0 for security patches
    ```

---

## 🛠️ How It Works (Architecture and Flow)

The extension’s workflow is centered around event listeners, Semgrep integration, quick fix suggestions, and custom commands.

### Key Components

-   **Event Listeners:** Hooks into VS Code events (`onDidSaveTextDocument`, `onDidOpenTextDocument`) to trigger scans automatically.
-   **Semgrep Integration:** Runs the Semgrep CLI as a subprocess, parses the JSON output, and maps the results to VS Code Diagnostics (the familiar red squiggly lines and popups).
-   **Quick Fix Provider:** The `SecurityFixer` class implements the `CodeActionProvider` interface to generate fix actions for each security issue.
-   **Custom Command (`trusttrust.applyFixAndRescan`):**
    1.  Applies the necessary text edits (the "fix").
    2.  Updates a "fix counter" in the status bar.
    3.  Triggers an immediate rescan to verify the issue is resolved.

### Metrics Tracking (Bonus Implementation)

-   Tracks the number of security fixes applied in the current session.
-   Displays the running count in the VS Code status bar (e.g., `🛡️ 5 Fixes Applied`).

---

## 🗺️ Roadmap / Future Improvements

To evolve into a production-ready assistant, the following features are planned:

-   **Prompt Enrichment:** Intercept and enhance developer prompts before sending them to an LLM (e.g., prepending a directive like “Ensure all routes require authentication”).
-   **Expanded Vulnerability Scanning:** Extend support to `package.json`, `pom.xml`, and other dependency managers.
-   **OpenAI Refactoring Integration:** Use LLM APIs to automatically refactor insecure code into secure implementations.
-   **Persistent Metrics & History:** Store fix history and scan metrics to analyze developer security posture over time.
-   **Workspace-Wide Scanning:** Expand beyond single-file scans to cover entire projects.

---

## 💻 Tech Stack

-   **Editor:** Visual Studio Code
-   **Engine:** Semgrep (static analysis)
-   **Language:** TypeScript (VS Code extension API)
-   **Optional:** Python (for environment variable handling in generated fixes)

---

## 📄 License

This project is released under the **MIT License**.
