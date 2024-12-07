# no(po)lyfill

Speed up your package installation process, reduce your disk usage, extend the lifespan of your precious SSD by reducing your `node_modules` size.

## Why

While you are embracing the latest features and security fixes by installing the latest Node.js LTS, packages like `eslint-plugin-import`, `eslint-plugin-jsx-a11y`, `eslint-plugin-react`, and many others maintained by ljharb are still trying to support the **long-dead** Node.js 4 by adding **tons** of polyfills. These polyfills are inflating your `node_modules` size, wasting your disk space and slowing down your `npm i` / `yarn` / `pnpm i` commands. And what's worse, ljharb uses the polyfill implementation even when a native version is available in the environment, which makes the code run slower.

Whether to support Node.js 4 is up to ljharb, but most of you should not be forced to install polyfills for a Node.js version that has been dead since [2018-04-30](https://github.com/nodejs/release).

## When not to use

- Your Node.js version is below `12.4.0`.
- You are targeting an environment that doesn't have full ES2019 support (which you really should use [core-js](https://github.com/zloirock/core-js) or [core-js-pure](https://github.com/zloirock/core-js) instead. It is significantly faster).

## How to use

You can use the `nolyfill` CLI to replace the redundant polyfills with their super lightweight alternatives, just run following command in your project directory:

```bash
npx nolyfill
# You can also specify the path to your project directory:
npx nolyfill ~/projects/my-project
```

This will find and list all redundant polyfills in the current project directory. You can then use the `install` command to replace them:

```bash
npx nolyfill install
# Or in the specified directory:
npx nolyfill install ~/projects/my-project
```

### CLI Options

**--pm**

By default nolyfill CLI will try to detect the preferred package manager of the project automatically. You can manually specify the package manager by using the `--pm` option. Supported options are `npm`, `yarn`, `pnpm` and `auto` (default).

**-d, --debug**

Print full error messages and error stacks when an error occurs.

**-v, --version**

Print the current version of the nolyfill CLI.

**-h, --help**

Print the help message.

----

## Development

Add the definition in `packages/data/es-shim-like/src/` or `packages/data/single-file/src/` or `packages/manual` and `create.ts` , then `npm run codegen`. Notice that rarely used package will not be added, and some packages which are just sub-deps also won't be added.

## Contributions

when you `npm i` or anything else, get `Use your platform's native` and it's available at Node.js <= 12, it's time to nolyfill it.

----

**nolyfill** © [Sukka](https://github.com/SukkaW), Released under the [MIT](./LICENSE) License.
Authored and maintained by Sukka with help from contributors ([list](https://github.com/SukkaW/nolyfill/graphs/contributors)).

> [Personal Website](https://skk.moe) · [Blog](https://blog.skk.moe) · GitHub [@SukkaW](https://github.com/SukkaW) · Telegram Channel [@SukkaChannel](https://t.me/SukkaChannel) · Mastodon [@sukka@acg.mn](https://acg.mn/@sukka) · Twitter [@isukkaw](https://twitter.com/isukkaw) · Keybase [@sukka](https://keybase.io/sukka)

<p align="center">
  <a href="https://github.com/sponsors/SukkaW/">
    <img src="https://sponsor.cdn.skk.moe/sponsors.svg"/>
  </a>
</p>
