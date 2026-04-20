const fs = require("fs/promises");
const path = require("path");

const ENV_FILES = [".env", ".env.example", ".env.local"];

function parseEnvKeys(contents) {
  const keys = new Set();

  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const exportLess = trimmed.startsWith("export ") ? trimmed.slice(7) : trimmed;
    const separatorIndex = exportLess.indexOf("=");
    if (separatorIndex <= 0) {
      continue;
    }

    const key = exportLess.slice(0, separatorIndex).trim();
    if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) {
      keys.add(key);
    }
  }

  return [...keys].sort((a, b) => a.localeCompare(b));
}

function buildEnvSections(fileKeys) {
  const exampleKeys = new Set(fileKeys[".env.example"] || []);
  const envKeys = new Set(fileKeys[".env"] || []);
  const localKeys = new Set(fileKeys[".env.local"] || []);
  const actualUnion = new Set([...envKeys, ...localKeys]);
  const sharedAcrossAll = [...exampleKeys].filter((key) => envKeys.has(key) && localKeys.has(key)).sort();

  return {
    exampleMissingFromActual: [...exampleKeys].filter((key) => !actualUnion.has(key)).sort(),
    actualExtraVsExample: [...actualUnion].filter((key) => !exampleKeys.has(key)).sort(),
    exampleMissingFromEnv: [...exampleKeys].filter((key) => !envKeys.has(key)).sort(),
    envExtraVsExample: [...envKeys].filter((key) => !exampleKeys.has(key)).sort(),
    exampleMissingFromLocal: [...exampleKeys].filter((key) => !localKeys.has(key)).sort(),
    localExtraVsExample: [...localKeys].filter((key) => !exampleKeys.has(key)).sort(),
    sharedAcrossAll
  };
}

async function loadEnvKeys(rootDirectory, fileName) {
  const filePath = path.join(rootDirectory, fileName);
  try {
    const contents = await fs.readFile(filePath, "utf8");
    return parseEnvKeys(contents);
  } catch (error) {
    return null;
  }
}

async function inspectEnvFiles(rootDirectory) {
  const fileKeys = {};

  await Promise.all(
    ENV_FILES.map(async (fileName) => {
      fileKeys[fileName] = await loadEnvKeys(rootDirectory, fileName);
    })
  );

  const comparisons = buildEnvSections(fileKeys);

  return {
    fileKeys,
    comparisons,
    groups: {
      aligned: {
        label: "Shared Across Example, .env, and .env.local",
        items: comparisons.sharedAcrossAll
      },
      missingFromActual: {
        label: "Missing From Actual Env Files",
        items: comparisons.exampleMissingFromActual
      },
      missingFromEnv: {
        label: "Missing From .env",
        items: comparisons.exampleMissingFromEnv
      },
      missingFromLocal: {
        label: "Missing From .env.local",
        items: comparisons.exampleMissingFromLocal
      },
      extraActual: {
        label: "Extra Keys In Actual Env Files",
        items: comparisons.actualExtraVsExample
      }
    },
    counts: {
      example: fileKeys[".env.example"] ? fileKeys[".env.example"].length : 0,
      env: fileKeys[".env"] ? fileKeys[".env"].length : 0,
      local: fileKeys[".env.local"] ? fileKeys[".env.local"].length : 0,
      aligned: comparisons.sharedAcrossAll.length
    }
  };
}

module.exports = {
  ENV_FILES,
  inspectEnvFiles,
  parseEnvKeys,
  buildEnvSections
};
