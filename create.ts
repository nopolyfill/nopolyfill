'use strict';

import fsPromises from 'fs/promises';
import path from 'path';
import ezspawn from '@jsdevtools/ez-spawn';
import { PathScurry } from 'path-scurry';
import colors from 'picocolors';
import { dequal } from 'dequal';
import { fileExists, compareAndWriteFile } from '@nolyfill/internal';
import { transform } from '@swc/core';
import type { Options as SwcOptions } from '@swc/core';

import type { PackageJson } from 'type-fest';

/**
 * The package.json inside the project has a non-nullable "version" field,
 * and a known "pnpm.overrides".
 *
 * PackageJson type can not be extend since it is a union type.
 */
type CurrentPackageJson = PackageJson & {
  version: string,
  pnpm: {
    overrides: Record<string, string>
  } & Record<string, unknown>
};

const currentPackageJsonPromise: Promise<CurrentPackageJson> = fsPromises.readFile('./package.json', { encoding: 'utf-8' })
  .then(t => JSON.parse(t) as CurrentPackageJson);

interface VirtualPackage {
  path: string,
  files: Record<string, string>,
  packageJson: PackageJson
}

const autoGeneratedPackagesList = [
  ['array-includes'],
  ['array.prototype.findlastindex'],
  ['array.prototype.findlast'],
  ['array.prototype.at'],
  ['string.prototype.at'],
  ['array.prototype.flat'],
  ['array.prototype.every'],
  ['array.prototype.flatmap'],
  ['array.prototype.foreach'],
  ['array.prototype.flatmap'],
  ['arraybuffer.prototype.slice'],
  ['function.prototype.name'],
  ['is-nan'],
  ['object-keys'],
  ['object.assign'],
  ['object.entries'],
  ['object.fromentries'],
  ['object.hasown'],
  ['object.values'],
  ['string.prototype.trim'],
  ['string.prototype.trimend'],
  ['string.prototype.trimstart'],
  ['string.prototype.trimleft'],
  ['string.prototype.trimright'],
  ['string.prototype.matchall'],
  ['regexp.prototype.flags'],
  ['globalthis'],
  ['array.prototype.tosorted'],
  ['object.groupby'],
  ['array.prototype.find'],
  ['array.from'],
  ['array.of'],
  ['string.prototype.padend'],
  ['string.prototype.codepointat'],
  ['string.prototype.includes'],
  ['string.prototype.repeat'],
  ['string.prototype.split'],
  ['string.prototype.startswith'],
  ['string.prototype.padstart'],
  ['object.getownpropertydescriptors'],
  ['array.prototype.reduce'],
  ['object-is'],
  ['reflect.ownkeys'],
  // ['array.prototype.filter'],
  ['string.prototype.replaceall'],
  // ['array.prototype.map'],
  ['reflect.getprototypeof'],
  // ['object.getprototypeof'],
  ['es-aggregate-error'],
  ['promise.any', { '@nolyfill/es-aggregate-error': 'workspace:*' }, '>=12.4.0'],
  ['promise.allsettled'],
  ['array.prototype.toreversed'],
  ['util.promisify', { '@nolyfill/safe-array-concat': 'workspace:*' }, '>=12.4.0'],
  ['typedarray.prototype.slice'],
  ['es6-promise']
] as const;

const singleFilePackagesList = [
  ['abab'],
  ['has-property-descriptors'],
  ['gopd'],
  ['has-proto'],
  ['get-symbol-description', { '@nolyfill/shared': 'workspace:*' }],
  ['is-array-buffer', { '@nolyfill/shared': 'workspace:*' }],
  ['is-shared-array-buffer', { '@nolyfill/shared': 'workspace:*' }],
  ['typed-array-buffer', { '@nolyfill/shared': 'workspace:*' }],
  ['typed-array-byte-length', { '@nolyfill/shared': 'workspace:*' }],
  ['typed-array-byte-offset', { '@nolyfill/shared': 'workspace:*' }],
  ['typed-array-length', { '@nolyfill/shared': 'workspace:*' }],
  ['harmony-reflect'],
  ['array-buffer-byte-length', { '@nolyfill/is-array-buffer': 'workspace:*', '@nolyfill/shared': 'workspace:*' }],
  ['iterator.prototype'],
  ['available-typed-arrays'],
  ['which-typed-array', { '@nolyfill/shared': 'workspace:*' }],
  ['es6-object-assign'],
  ['which-boxed-primitive'],
  ['unbox-primitive'],
  ['is-regex'],
  ['safe-regex-test'],
  ['safe-array-concat'],
  ['asynciterator.prototype'],
  ['is-weakref'],
  ['is-symbol'],
  ['is-string'],
  ['is-date-object'],
  ['es-set-tostringtag'],
  ['define-properties', { '@nolyfill/shared': 'workspace:*' }],
  ['deep-equal', { dequal: '2.0.3' }],
  ['deep-equal-json', { dequal: '2.0.3' }],
  ['is-arguments'],
  ['is-generator-function'],
  // ['is-negative-zero', 'module.exports = (n) => n === 0 && (1 / n) === -Infinity;'],
  ['side-channel'],
  ['internal-slot'],
  ['typedarray'], // although https://github.com/es-shims/typedarray, but it only has one file, so here.
  ['has'],
  ['hasown'],
  ['jsonify'],
  ['isarray'],
  ['is-typed-array', { '@nolyfill/which-typed-array': 'workspace:*' }],
  ['json-stable-stringify'],
  ['safe-buffer'],
  ['safer-buffer'],
  ['array-flatten'],
  ['number-is-nan']
] as const;

const manualPackagesList = [
  'function-bind', // function-bind's main entry point is not uncurried, and doesn't follow es-shim API
  'has-tostringtag', // two entries (index.js, shams.js)
  'has-symbols', // two entries (index.js, shams.js)
  'es-iterator-helpers', // use rollup prebundle approach
  'assert', // use rollup prebundle approach
  'set-function-length', // two entries (index.js, env.js)
  'is-core-module' // bundle
] as const;

const nonNolyfillPackagesList = [
  'nolyfill',
  '@nolyfill/shared'
] as const;

(async () => {
  const allPackagesList = [
    ...manualPackagesList,
    ...autoGeneratedPackagesList.map(pkg => pkg[0]),
    ...singleFilePackagesList.map(pkg => pkg[0])
  ].sort();

  const currentPackageJson = await currentPackageJsonPromise;

  const newPackageJson = {
    ...currentPackageJson,
    overrides: allPackagesList.reduce<Record<string, string>>((acc, packageName) => {
      acc[packageName] = `npm:@nolyfill/${packageName}@^1.0`;
      return acc;
    }, {}),
    pnpm: {
      ...currentPackageJson.pnpm,
      overrides: allPackagesList.reduce<Record<string, string>>((acc, packageName) => {
        acc[packageName] = `workspace:@nolyfill/${packageName}@*`;
        return acc;
      }, {})
    }
  };

  const cliAllPackagesTs = `/* Generated by create.ts */
/* eslint-disable */
export const allPackages = ${JSON.stringify(allPackagesList, null, 2)};\n`;

  await Promise.all([
    ...autoGeneratedPackagesList.map(pkg => createEsShimLikePackage(pkg[0], pkg[1], pkg[2])),
    ...singleFilePackagesList.map(pkg => createSingleFilePackage(pkg[0], pkg[1])),
    compareAndWriteFile(
      path.join(__dirname, 'package.json'),
      `${JSON.stringify(newPackageJson, null, 2)}\n`
    ),
    compareAndWriteFile(
      path.join(__dirname, 'packages/tools', 'cli', 'src', 'all-packages.ts'),
      cliAllPackagesTs
    ),
    compareAndWriteFile(
      path.join(__dirname, 'DOWNLOAD_STATS.md'),
      generateDownloadStats()
    )
  ]);

  console.log('Updating pnpm-lock.yaml...');
  await ezspawn.async('pnpm', ['i']);
})();

function sortObjectByKey(obj: Record<string, string>) {
  return Object.keys(obj).sort().reduce<Record<string, string>>((acc, key) => {
    acc[key] = obj[key];
    return acc;
  }, {});
}

const esShimLikeExportInterop = `
Object.assign(exports.default, exports); module.exports = exports.default;
`;

const defaultExportInterop = `
((typeof exports.default === 'object' && exports.default !== null) || typeof exports.default === 'function') && (Object.assign(exports.default,exports), module.exports = exports.default);
`;

const sharedSwcOption: SwcOptions = {
  isModule: true,
  jsc: {
    parser: {
      syntax: 'typescript'
    },
    target: 'es2018',
    minify: {
      compress: true,
      mangle: true,
      module: true,
      sourceMap: false
    }
  },
  minify: true,
  module: { type: 'commonjs' }
};

async function createEsShimLikePackage(
  packageName: string,
  extraDependencies: Record<string, string> = {},
  minimumNodeVersion = '>=12.4.0'
) {
  const entryContent = await fsPromises.readFile(
    path.join(__dirname, 'packages', 'data', 'es-shim-like', 'src', `${packageName}.ts`),
    { encoding: 'utf-8' }
  );
  const { code } = await transform(
    entryContent,
    sharedSwcOption
  );

  const pkg: VirtualPackage = {
    path: path.join(__dirname, 'packages/generated', packageName),
    files: {
      'entry.js': code + esShimLikeExportInterop,
      'implementation.js': '\'use strict\';\nmodule.exports = require(\'./entry.js\').implementation;\n',
      'polyfill.js': '\'use strict\';\nmodule.exports = require(\'./entry.js\').polyfill;\n',
      'shim.js': '\'use strict\';\nmodule.exports = require(\'./entry.js\').shim;\n',
      'auto.js': '\'use strict\';\n/* noop */\n',
      'index.js': '\'use strict\';\nmodule.exports = require(\'./entry.js\').index();\n'
    },
    packageJson: {
      name: `@nolyfill/${packageName}`,
      version: (await currentPackageJsonPromise).version,
      repository: {
        type: 'git',
        url: 'https://github.com/SukkaW/nolyfill',
        directory: `packages/generated/${packageName}`
      },
      main: './index.js',
      license: 'MIT',
      files: ['*.js'],
      scripts: {},
      dependencies: sortObjectByKey({
        '@nolyfill/shared': 'workspace:*',
        ...extraDependencies
      }),
      engines: {
        node: minimumNodeVersion
      }
    }
  };

  return writePackage(pkg);
}

async function createSingleFilePackage(
  packageName: string,
  extraDependencies: Record<string, string> = {},
  minimumNodeVersion = '>=12.4.0'
) {
  const currentPackageJson = await currentPackageJsonPromise;

  const entryContent = await fsPromises.readFile(
    path.join(__dirname, 'packages', 'data', 'single-file', 'src', `${packageName}.ts`),
    { encoding: 'utf-8' }
  );
  const { code } = await transform(
    entryContent,
    sharedSwcOption
  );

  const pkg: VirtualPackage = {
    path: path.join(__dirname, 'packages/generated', packageName),
    files: {
      'index.js': code + defaultExportInterop
    },
    packageJson: {
      name: `@nolyfill/${packageName}`,
      version: currentPackageJson.version,
      repository: {
        type: 'git',
        url: 'https://github.com/SukkaW/nolyfill',
        directory: `packages/generated/${packageName}`
      },
      main: './index.js',
      license: 'MIT',
      files: ['*.js'],
      scripts: {},
      dependencies: sortObjectByKey(extraDependencies),
      engines: {
        node: minimumNodeVersion
      }
    }
  };

  return writePackage(pkg);
}

function generateDownloadStats() {
  const pkgList = [
    ...autoGeneratedPackagesList.map(pkg => `@nolyfill/${pkg[0]}`),
    ...singleFilePackagesList.map(pkg => `@nolyfill/${pkg[0]}`),
    ...manualPackagesList.map(pkg => `@nolyfill/${pkg}`)
  ].sort();
  pkgList.unshift(...nonNolyfillPackagesList);

  return '| name | download |\n| ---- | -------- |\n'.concat(
    pkgList.map(
      pkg => `| \`${pkg}\` | [![npm](https://img.shields.io/npm/dt/${pkg}.svg?style=flat-square&logo=npm&logoColor=white&label=total%20downloads&color=333)](https://www.npmjs.com/package/${pkg}) |`
    ).join('\n')
  );
}

const ignoredFilesInPackages = new Set(['dist', 'node_modules', 'package.json']);
async function writePackage(pkg: VirtualPackage) {
  await fsPromises.mkdir(pkg.path, { recursive: true });
  let hasChanged = false;

  const promises: Array<Promise<void>> = [];
  const existingFileFullpaths = new Set<string>();

  const ps = new PathScurry(pkg.path);
  for await (const file of ps) {
    if (file.name.startsWith('.') || ignoredFilesInPackages.has(file.name)) {
      continue;
    }

    if (file.isFile()) {
      const relativePath = file.relativePosix();
      if (!(relativePath in pkg.files)) {
        // remove extra files
        hasChanged = true;

        promises.push(
          fsPromises.rm(path.join(pkg.path, relativePath))
        );
      } else {
        existingFileFullpaths.add(file.fullpathPosix());
      }
    }
  }

  const packageJsonPath = path.join(pkg.path, 'package.json');

  // write files, and check if they changed
  Object.entries(pkg.files).forEach(([file, content]) => {
    const filePath = path.join(pkg.path, file);
    promises.push(
      compareAndWriteFile(filePath, content, existingFileFullpaths)
        .then(written => {
          if (written) {
            hasChanged = true;
          }
        })
    );
  });

  // check if package.json changed
  promises.push((async () => {
    const existingPackageJson = (
      existingFileFullpaths.has(packageJsonPath)
      || await fileExists(packageJsonPath)
    ) ? JSON.parse(await fsPromises.readFile(packageJsonPath, 'utf8'))
      : {};

    // exclude version from comparison
    if (!dequal({ ...existingPackageJson, version: undefined }, { ...pkg.packageJson, version: undefined })) {
      hasChanged = true;
    }
  })());

  await Promise.all(promises);

  // if the package has changed, bump the version
  if (hasChanged) {
    pkg.packageJson.version = bumpVersion(pkg.packageJson.version || (await currentPackageJsonPromise).version);
    await fsPromises.writeFile(
      packageJsonPath,
      `${JSON.stringify(pkg.packageJson, null, 2)}\n`,
      'utf-8'
    );
    console.log(colors.blue(`[${pkg.packageJson.name}] bumped to ${pkg.packageJson.version}`));
  } else {
    console.log(colors.dim(`[${pkg.packageJson.name}] unchanged`));
  }
}

function bumpVersion(version: string) {
  // TODO: use semver
  const [major, minor, patch] = version.split('.');
  return `${major}.${minor}.${+patch + 1}`;
}
