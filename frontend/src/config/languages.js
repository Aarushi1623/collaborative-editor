/**
 * Canonical language list used across the app.
 *
 * monacoId  — language ID passed to Monaco Editor
 * label     — human-readable name shown in the dropdown
 * pistonId  — runtime name accepted by the Piston execution API (null = not executable)
 */
export const LANGUAGES = [
  { monacoId: 'javascript', label: 'JavaScript', pistonId: 'javascript' },
  { monacoId: 'typescript', label: 'TypeScript',  pistonId: 'typescript' },
  { monacoId: 'python',     label: 'Python',       pistonId: 'python'     },
  { monacoId: 'go',         label: 'Go',           pistonId: 'go'         },
  { monacoId: 'rust',       label: 'Rust',         pistonId: 'rust'       },
  { monacoId: 'java',       label: 'Java',         pistonId: 'java'       },
  { monacoId: 'cpp',        label: 'C++',          pistonId: 'c++'        },
  { monacoId: 'c',          label: 'C',            pistonId: 'c'          },
  { monacoId: 'csharp',     label: 'C#',           pistonId: 'csharp'     },
  { monacoId: 'ruby',       label: 'Ruby',         pistonId: 'ruby'       },
  { monacoId: 'php',        label: 'PHP',          pistonId: 'php'        },
  { monacoId: 'html',       label: 'HTML',         pistonId: null         },
  { monacoId: 'css',        label: 'CSS',          pistonId: null         },
  { monacoId: 'json',       label: 'JSON',         pistonId: null         },
  { monacoId: 'sql',        label: 'SQL',          pistonId: null         },
  { monacoId: 'markdown',   label: 'Markdown',     pistonId: null         },
  { monacoId: 'yaml',       label: 'YAML',         pistonId: null         },
  { monacoId: 'shell',      label: 'Shell',        pistonId: 'bash'       },
];

export function getLang(monacoId) {
  return LANGUAGES.find((l) => l.monacoId === monacoId) ?? LANGUAGES[0];
}
