#!/usr/bin/env node
// PreToolUse guard for shell commands (Bash and PowerShell tools).
// Exit code 2 blocks the command; whatever is written to stderr is shown to Claude.
// This is a safety net, not a sandbox: it inspects command text, so a determined
// command can get around it. Keep the rules simple and the messages clear.

const { execSync } = require("child_process");

function block(msg) {
  process.stderr.write(`Blocked by .claude/hooks/guard.js: ${msg}\n`);
  process.exit(2);
}

// ---- Rules on the command text --------------------------------------------

// Secret files: .env, .env.local, .env.production... but NOT .env.example.
// (".key" files are caught by the commit scan below; matching ".key" in command
// text blocked ordinary code like `e.key === "Escape"`.)
const SECRET_PATH =
  /(^|[\s"'\/\\=:])\.env(\.(local|development|production|test)(\.local)?)?(?![\w.-])|(^|[\s"'\/\\=:])\.env\.[\w-]*\.local(?![\w.-])|\.(pem|p12)(?![\w.-])|(^|[\s"'\/\\])certs[\/\\]/i;

const RULES = [
  [SECRET_PATH, "this command touches a secrets file (.env*, certs/, *.pem, *.key). Ask the user to do it, or use .env.example."],
  [/\bgit\s+push\b[^\n;&|]*(\s--force\b|\s-f\b|\s\+\S)/, "force-pushing rewrites shared history. Ask the user first."],
  [/\bsupabase\s+db\s+reset\b[^\n;&|]*(--linked|--db-url)/, "this would wipe a remote Supabase database. Only local resets are allowed."],
  [/\b(drop\s+(table|schema|database)|truncate\s+table)\b/i, "destructive SQL. Write a migration instead, and let the user review it."],
  [/\brm\s+-[a-z]*(rf|fr)[a-z]*\s+(\/|~|\.\.|\*|\.git\b)/i, "recursive delete of a root, home, parent or .git path."],
  [/\bvercel\b[^\n;&|]*\s--prod\b/, "production deploys go through a merge to main, not the CLI."],
];

// ---- Secret scan on git commit ---------------------------------------------

const SECRET_CONTENT = [
  [/sk-ant-[A-Za-z0-9_-]{20,}/, "an Anthropic API key"],
  [/sb_secret_[A-Za-z0-9_-]{10,}/, "a Supabase secret key"],
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, "a private key"],
  [/eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/, "a JWT (possibly a Supabase key)"],
  [/\b[A-Z0-9_]*(SECRET|PRIVATE_KEY|SERVICE_ROLE|API_KEY|ACCESS_TOKEN)[A-Z0-9_]*\s*[=:]\s*["']?[A-Za-z0-9_\-\/+]{16,}/, "a hard-coded secret assignment"],
];
const SECRET_FILE = /(^|\/)\.env(\.(?!example$)[\w.-]+)?$|\.(pem|p12|key)$|(^|\/)certs\//i;

function git(args, cwd) {
  return execSync(`git ${args}`, { cwd, encoding: "utf8", maxBuffer: 50 * 1024 * 1024, stdio: ["ignore", "pipe", "ignore"] });
}

function scanCommit(cmd, cwd) {
  if (/\bgit\s+add\b/.test(cmd)) {
    block("run `git add` and `git commit` as separate commands, so the secret scan can see exactly what is staged.");
  }
  const all = /\bgit\s+commit\b[^\n;&|]*\s(-a\b|--all\b|-[a-zA-Z]*a[a-zA-Z]*\b)/.test(cmd);
  let names, diff;
  try {
    names = git("diff --cached --name-only", cwd) + (all ? git("diff --name-only", cwd) : "");
    diff = git("diff --cached -U0", cwd) + (all ? git("diff -U0", cwd) : "");
  } catch {
    return; // not a git repo, or git unavailable: nothing to scan
  }
  for (const f of names.split("\n").filter(Boolean)) {
    if (SECRET_FILE.test(f)) block(`'${f}' looks like a secrets file and must not be committed.`);
  }
  const added = diff.split("\n").filter((l) => l.startsWith("+") && !l.startsWith("+++"));
  for (const line of added) {
    for (const [re, what] of SECRET_CONTENT) {
      if (re.test(line)) block(`the staged changes appear to contain ${what}. Move it to .env.local and reference it through process.env.`);
    }
  }
}

// ---- Main ------------------------------------------------------------------

let raw = "";
process.stdin.on("data", (c) => (raw += c));
process.stdin.on("end", () => {
  let input;
  try { input = JSON.parse(raw); } catch { process.exit(0); }
  const cmd = (input.tool_input && input.tool_input.command) || "";
  if (!cmd) process.exit(0);

  for (const [re, msg] of RULES) if (re.test(cmd)) block(msg);
  if (/\bgit\s+commit\b/.test(cmd)) scanCommit(cmd, input.cwd || process.env.CLAUDE_PROJECT_DIR || process.cwd());
  process.exit(0);
});
