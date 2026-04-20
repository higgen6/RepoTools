const fs = require("fs/promises");
const path = require("path");
const { inspectEnvFiles } = require("./envService");
const { getGitSummary } = require("./gitService");

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch (error) {
    return false;
  }
}

async function safeReadJson(filePath) {
  try {
    const contents = await fs.readFile(filePath, "utf8");
    return JSON.parse(contents);
  } catch (error) {
    return null;
  }
}

async function detectProject(rootDirectory) {
  const fileChecks = {
    packageJson: path.join(rootDirectory, "package.json"),
    requirements: path.join(rootDirectory, "requirements.txt"),
    pyproject: path.join(rootDirectory, "pyproject.toml"),
    dockerfile: path.join(rootDirectory, "Dockerfile"),
    dockerComposeYml: path.join(rootDirectory, "docker-compose.yml"),
    dockerComposeYaml: path.join(rootDirectory, "compose.yaml"),
    dockerComposeYamlAlt: path.join(rootDirectory, "docker-compose.yaml"),
    env: path.join(rootDirectory, ".env"),
    envExample: path.join(rootDirectory, ".env.example"),
    envLocal: path.join(rootDirectory, ".env.local"),
    readme: path.join(rootDirectory, "README.md"),
    readmeTxt: path.join(rootDirectory, "README.txt"),
    readmePlain: path.join(rootDirectory, "README"),
    gitDir: path.join(rootDirectory, ".git"),
    packageLock: path.join(rootDirectory, "package-lock.json"),
    pnpmLock: path.join(rootDirectory, "pnpm-lock.yaml"),
    yarnLock: path.join(rootDirectory, "yarn.lock")
  };

  const existenceMap = {};
  await Promise.all(
    Object.entries(fileChecks).map(async ([key, filePath]) => {
      existenceMap[key] = await fileExists(filePath);
    })
  );

  const packageJson = existenceMap.packageJson
    ? await safeReadJson(fileChecks.packageJson)
    : null;

  const scripts = packageJson && packageJson.scripts && typeof packageJson.scripts === "object"
    ? packageJson.scripts
    : {};

  const envSummary = await inspectEnvFiles(rootDirectory);
  const gitSummary = await getGitSummary(rootDirectory, existenceMap.gitDir);

  return {
    rootDirectory,
    packageName: packageJson && typeof packageJson.name === "string" ? packageJson.name : null,
    scripts,
    scriptsCount: Object.keys(scripts).length,
    summary: {
      isGitRepo: gitSummary.isGitRepo,
      isNodeProject: existenceMap.packageJson,
      isPythonProject: existenceMap.requirements || existenceMap.pyproject,
      isDockerProject:
        existenceMap.dockerfile ||
        existenceMap.dockerComposeYml ||
        existenceMap.dockerComposeYaml ||
        existenceMap.dockerComposeYamlAlt
    },
    files: {
      packageJson: existenceMap.packageJson,
      requirementsTxt: existenceMap.requirements,
      pyprojectToml: existenceMap.pyproject,
      dockerFile: existenceMap.dockerfile,
      dockerCompose:
        existenceMap.dockerComposeYml ||
        existenceMap.dockerComposeYaml ||
        existenceMap.dockerComposeYamlAlt,
      env: existenceMap.env,
      envExample: existenceMap.envExample,
      envLocal: existenceMap.envLocal,
      readme: existenceMap.readme || existenceMap.readmeTxt || existenceMap.readmePlain,
      packageLock: existenceMap.packageLock,
      pnpmLock: existenceMap.pnpmLock,
      yarnLock: existenceMap.yarnLock
    },
    envSummary,
    gitSummary
  };
}

module.exports = {
  detectProject
};
