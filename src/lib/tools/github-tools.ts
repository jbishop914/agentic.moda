// GitHub Integration Tool for Real File Creation
// Allows agents to create actual repositories and files

import { z } from 'zod';
import { Tool } from './function-tools';

// ============= GITHUB TOOLS =============

export const githubCreateRepoTool: Tool = {
  name: 'github_create_repository',
  description: 'Create a new GitHub repository with initial files',
  parameters: z.object({
    repoName: z.string().describe('Repository name (lowercase, hyphens allowed)'),
    description: z.string().describe('Repository description'),
    isPrivate: z.boolean().default(false).describe('Make repository private'),
    initWithReadme: z.boolean().default(true).describe('Initialize with README'),
    gitignore: z.string().optional().describe('Gitignore template (e.g., "Node", "Python")'),
    license: z.string().optional().describe('License type (e.g., "MIT", "Apache-2.0")'),
  }),
  execute: async (params) => {
    const token = process.env.GITHUB_TOKEN || process.env.NEXT_PUBLIC_GITHUB_TOKEN;
    
    if (!token) {
      return { 
        error: true, 
        message: 'GitHub token not configured. Add GITHUB_TOKEN to environment variables.' 
      };
    }

    try {
      const response = await fetch('https://api.github.com/user/repos', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: params.repoName,
          description: params.description,
          private: params.isPrivate,
          auto_init: params.initWithReadme,
          gitignore_template: params.gitignore,
          license_template: params.license,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create repository');
      }

      const repo = await response.json();
      
      return {
        success: true,
        repoUrl: repo.html_url,
        cloneUrl: repo.clone_url,
        defaultBranch: repo.default_branch,
        fullName: repo.full_name,
      };
    } catch (error: any) {
      return { error: true, message: error.message };
    }
  },
};

export const githubCreateFilesTool: Tool = {
  name: 'github_create_files',
  description: 'Create or update multiple files in a GitHub repository',
  parameters: z.object({
    owner: z.string().describe('Repository owner (username or organization)'),
    repo: z.string().describe('Repository name'),
    branch: z.string().default('main').describe('Branch to create files in'),
    files: z.array(z.object({
      path: z.string().describe('File path in repository'),
      content: z.string().describe('File content'),
      message: z.string().optional().describe('Commit message for this file'),
    })).describe('Array of files to create'),
    commitMessage: z.string().default('Add files via AI agent').describe('Overall commit message'),
  }),
  execute: async (params) => {
    const token = process.env.GITHUB_TOKEN || process.env.NEXT_PUBLIC_GITHUB_TOKEN;
    
    if (!token) {
      return { error: true, message: 'GitHub token not configured' };
    }

    try {
      const createdFiles = [];
      
      for (const file of params.files) {
        // Convert content to base64
        const contentBase64 = Buffer.from(file.content).toString('base64');
        
        // Check if file exists first
        const checkResponse = await fetch(
          `https://api.github.com/repos/${params.owner}/${params.repo}/contents/${file.path}?ref=${params.branch}`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Accept': 'application/vnd.github.v3+json',
            },
          }
        );

        let sha: string | undefined;
        if (checkResponse.ok) {
          const existingFile = await checkResponse.json();
          sha = existingFile.sha; // Need SHA for updates
        }

        // Create or update file
        const response = await fetch(
          `https://api.github.com/repos/${params.owner}/${params.repo}/contents/${file.path}`,
          {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Accept': 'application/vnd.github.v3+json',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              message: file.message || params.commitMessage,
              content: contentBase64,
              branch: params.branch,
              ...(sha && { sha }), // Include SHA if updating
            }),
          }
        );

        if (!response.ok) {
          const error = await response.json();
          throw new Error(`Failed to create ${file.path}: ${error.message}`);
        }

        const result = await response.json();
        createdFiles.push({
          path: file.path,
          url: result.content.html_url,
          sha: result.content.sha,
        });
      }

      return {
        success: true,
        filesCreated: createdFiles.length,
        files: createdFiles,
        message: `Successfully created ${createdFiles.length} files`,
      };
    } catch (error: any) {
      return { error: true, message: error.message };
    }
  },
};

export const githubCreateFullAppTool: Tool = {
  name: 'github_create_full_application',
  description: 'Create a complete application structure in GitHub with all necessary files',
  parameters: z.object({
    projectName: z.string().describe('Project name (will be repo name)'),
    projectType: z.enum(['nextjs', 'react', 'node-api', 'python-flask', 'static-site']),
    description: z.string().describe('Project description'),
    features: z.array(z.string()).optional().describe('List of features to include'),
    dependencies: z.array(z.string()).optional().describe('NPM packages to include'),
    isPrivate: z.boolean().default(false),
  }),
  execute: async (params) => {
    const token = process.env.GITHUB_TOKEN || process.env.NEXT_PUBLIC_GITHUB_TOKEN;
    
    if (!token) {
      return { error: true, message: 'GitHub token not configured' };
    }

    try {
      // First, get the authenticated user
      const userResponse = await fetch('https://api.github.com/user', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      });
      
      if (!userResponse.ok) {
        throw new Error('Failed to get user information');
      }
      
      const user = await userResponse.json();
      const owner = user.login;

      // Create repository
      const repoResult = await githubCreateRepoTool.execute({
        repoName: params.projectName,
        description: params.description,
        isPrivate: params.isPrivate,
        initWithReadme: false, // We'll create our own
        gitignore: params.projectType === 'python-flask' ? 'Python' : 'Node',
      });

      if (repoResult.error) {
        return repoResult;
      }

      // Generate project files based on type
      const files = generateProjectFiles(params.projectType, params);

      // Create all files in the repository
      const filesResult = await githubCreateFilesTool.execute({
        owner,
        repo: params.projectName,
        branch: 'main',
        files,
        commitMessage: `Initialize ${params.projectType} project with AI-generated structure`,
      });

      if (filesResult.error) {
        return filesResult;
      }

      return {
        success: true,
        repoUrl: repoResult.repoUrl,
        cloneUrl: repoResult.cloneUrl,
        filesCreated: filesResult.filesCreated,
        setupInstructions: generateSetupInstructions(params.projectType, repoResult.cloneUrl),
        message: `Successfully created ${params.projectName} with ${filesResult.filesCreated} files`,
      };
    } catch (error: any) {
      return { error: true, message: error.message };
    }
  },
};

// Helper function to generate project files
function generateProjectFiles(projectType: string, params: any) {
  const files = [];
  
  switch (projectType) {
    case 'nextjs':
      files.push(
        {
          path: 'package.json',
          content: JSON.stringify({
            name: params.projectName,
            version: '0.1.0',
            private: true,
            scripts: {
              dev: 'next dev',
              build: 'next build',
              start: 'next start',
              lint: 'next lint',
            },
            dependencies: {
              next: '14.0.0',
              react: '^18.0.0',
              'react-dom': '^18.0.0',
              ...(params.dependencies?.reduce((acc: any, dep: string) => {
                acc[dep] = 'latest';
                return acc;
              }, {}) || {}),
            },
            devDependencies: {
              '@types/node': '^20.0.0',
              '@types/react': '^18.0.0',
              '@types/react-dom': '^18.0.0',
              typescript: '^5.0.0',
              tailwindcss: '^3.0.0',
              autoprefixer: '^10.0.0',
              postcss: '^8.0.0',
            },
          }, null, 2),
        },
        {
          path: 'app/layout.tsx',
          content: `import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: '${params.projectName}',
  description: '${params.description}',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  )
}`,
        },
        {
          path: 'app/page.tsx',
          content: `export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm">
        <h1 className="text-4xl font-bold mb-8">${params.projectName}</h1>
        <p className="text-xl mb-4">${params.description}</p>
        ${params.features ? `
        <div className="mt-8">
          <h2 className="text-2xl font-semibold mb-4">Features</h2>
          <ul className="list-disc list-inside space-y-2">
            ${params.features.map((f: string) => `<li>${f}</li>`).join('\n            ')}
          </ul>
        </div>` : ''}
      </div>
    </main>
  )
}`,
        },
        {
          path: 'app/globals.css',
          content: `@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --foreground-rgb: 0, 0, 0;
  --background-start-rgb: 214, 219, 220;
  --background-end-rgb: 255, 255, 255;
}

@media (prefers-color-scheme: dark) {
  :root {
    --foreground-rgb: 255, 255, 255;
    --background-start-rgb: 0, 0, 0;
    --background-end-rgb: 0, 0, 0;
  }
}

body {
  color: rgb(var(--foreground-rgb));
  background: linear-gradient(
      to bottom,
      transparent,
      rgb(var(--background-end-rgb))
    )
    rgb(var(--background-start-rgb));
}`,
        },
        {
          path: 'tailwind.config.ts',
          content: `import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
export default config`,
        },
        {
          path: 'tsconfig.json',
          content: JSON.stringify({
            compilerOptions: {
              target: 'es5',
              lib: ['dom', 'dom.iterable', 'esnext'],
              allowJs: true,
              skipLibCheck: true,
              strict: true,
              noEmit: true,
              esModuleInterop: true,
              module: 'esnext',
              moduleResolution: 'bundler',
              resolveJsonModule: true,
              isolatedModules: true,
              jsx: 'preserve',
              incremental: true,
              plugins: [{ name: 'next' }],
              paths: {
                '@/*': ['./src/*'],
              },
            },
            include: ['next-env.d.ts', '**/*.ts', '**/*.tsx', '.next/types/**/*.ts'],
            exclude: ['node_modules'],
          }, null, 2),
        },
        {
          path: 'README.md',
          content: `# ${params.projectName}

${params.description}

## Features
${params.features?.map((f: string) => `- ${f}`).join('\n') || '- Modern Next.js application\n- TypeScript support\n- Tailwind CSS styling'}

## Getting Started

\`\`\`bash
# Clone the repository
git clone ${params.projectName}

# Install dependencies
npm install

# Run development server
npm run dev
\`\`\`

Open [http://localhost:3000](http://localhost:3000) to see the application.

## Tech Stack
- Next.js 14
- React 18
- TypeScript
- Tailwind CSS
${params.dependencies?.map((d: string) => `- ${d}`).join('\n') || ''}

## Created with AI
This project was generated by an AI agent using the Agentic.Moda platform.`,
        }
      );
      break;

    case 'react':
      // Add React app structure
      files.push(
        {
          path: 'package.json',
          content: JSON.stringify({
            name: params.projectName,
            version: '0.1.0',
            private: true,
            dependencies: {
              react: '^18.0.0',
              'react-dom': '^18.0.0',
              'react-scripts': '5.0.1',
              ...(params.dependencies?.reduce((acc: any, dep: string) => {
                acc[dep] = 'latest';
                return acc;
              }, {}) || {}),
            },
            scripts: {
              start: 'react-scripts start',
              build: 'react-scripts build',
              test: 'react-scripts test',
              eject: 'react-scripts eject',
            },
          }, null, 2),
        },
        {
          path: 'src/App.tsx',
          content: `import React from 'react';
import './App.css';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>${params.projectName}</h1>
        <p>${params.description}</p>
        ${params.features ? `
        <div className="features">
          <h2>Features</h2>
          <ul>
            ${params.features.map((f: string) => `<li>${f}</li>`).join('\n            ')}
          </ul>
        </div>` : ''}
      </header>
    </div>
  );
}

export default App;`,
        },
        {
          path: 'src/index.tsx',
          content: `import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);`,
        },
        {
          path: 'public/index.html',
          content: `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="description" content="${params.description}" />
    <title>${params.projectName}</title>
  </head>
  <body>
    <noscript>You need to enable JavaScript to run this app.</noscript>
    <div id="root"></div>
  </body>
</html>`,
        }
      );
      break;

    // Add more project types as needed
  }

  return files;
}

function generateSetupInstructions(projectType: string, cloneUrl: string) {
  const baseInstructions = `
# Clone your new repository
git clone ${cloneUrl}
cd ${cloneUrl.split('/').pop()?.replace('.git', '')}

# Install dependencies
${projectType === 'python-flask' ? 'pip install -r requirements.txt' : 'npm install'}

# Run the development server
${projectType === 'python-flask' ? 'python app.py' : 'npm run dev'}
`;

  return baseInstructions;
}

// Export all GitHub tools
export const GITHUB_TOOLS = {
  github_create_repo: githubCreateRepoTool,
  github_create_files: githubCreateFilesTool,
  github_create_app: githubCreateFullAppTool,
};
