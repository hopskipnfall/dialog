[![Angular Logo](https://www.vectorlogo.zone/logos/angular/angular-icon.svg)](https://angular.io/) [![Electron Logo](https://www.vectorlogo.zone/logos/electronjs/electronjs-icon.svg)](https://electronjs.org/)

![Maintained][maintained-badge]
[![Make a pull request][prs-badge]][prs]
[![License][license-badge]](LICENSE.md)

[![Linux Build][linux-build-badge]][linux-build]
[![MacOS Build][macos-build-badge]][macos-build]
[![Windows Build][windows-build-badge]][windows-build]

[![Watch on GitHub][github-watch-badge]][github-watch]
[![Star on GitHub][github-star-badge]][github-star]
[![Tweet][twitter-badge]][twitter]

# Dialog

Dialog is an app that lets you extract an audio file of condensed dialog from a video file.

# Development

## Key Commands

| Command                  | Description                                                                          |
| ------------------------ | ------------------------------------------------------------------------------------ |
| `npm run start`          | Run the app, with hot reload for the Angular client.                                 |
| `npm run ng:serve`       | Execute the app in the browser                                                       |
| `npm run build`          | Build the app. Your built files are in the /dist folder.                             |
| `npm run build:prod`     | Build the app with Angular aot. Your built files are in the /dist folder.            |
| `npm run electron:local` | Builds your application and start electron                                           |
| `npm run electron:build` | Builds your application and creates an app consumable based on your operating system |

## E2E Testing

E2E Test scripts can be found in `e2e` folder.

| Command       | Description              |
| ------------- | ------------------------ |
| `npm run e2e` | Execute end to end tests |

Note: To make it work behind a proxy, you can add this proxy exception in your terminal  
`export {no_proxy,NO_PROXY}="127.0.0.1,localhost"`

## Packaging

For Mac:

`npm run package-mac`

For Windows/Linux on Mac:

1. Install Docker
1. Run `docker run --rm -ti --env-file <(env | grep -iE 'DEBUG|NODE_|ELECTRON_|YARN_|NPM_|CI|CIRCLE|TRAVIS_TAG|TRAVIS|TRAVIS_REPO_|TRAVIS_BUILD_|TRAVIS_BRANCH|TRAVIS_PULL_REQUEST_|APPVEYOR_|CSC_|GH_|GITHUB_|BT_|AWS_|STRIP|BUILD_') --env ELECTRON_CACHE="/root/.cache/electron" --env ELECTRON_BUILDER_CACHE="/root/.cache/electron-builder" -v ${PWD}:/project -v ${PWD##*/}-node-modules:/project/node_modules -v ~/.cache/electron:/root/.cache/electron -v ~/.cache/electron-builder:/root/.cache/electron-builder electronuserland/builder:wine` (taken from [here](https://github.com/electron-userland/electron-builder/issues/4305#issuecomment-541099759))
1. Run `npm run package-linux; npm run package-win`.

[build-badge]: https://travis-ci.org/hopskipnfall/dialog.svg?branch=master&style=style=flat-square
[license-badge]: https://img.shields.io/badge/license-MIT-blue.svg
[license]: https://github.com/hopskipnfall/dialog/blob/master/LICENSE.md
[prs-badge]: https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square
[prs]: http://makeapullrequest.com
[github-watch-badge]: https://img.shields.io/github/watchers/hopskipnfall/dialog.svg?style=social
[github-watch]: https://github.com/hopskipnfall/dialog/watchers
[github-star-badge]: https://img.shields.io/github/stars/hopskipnfall/dialog.svg?style=social
[github-star]: https://github.com/hopskipnfall/dialog/stargazers
[twitter]: https://twitter.com/intent/tweet?text=Check%20out%20angular-electron!%20https://github.com/hopskipnfall/dialog%20%F0%9F%91%8D
[twitter-badge]: https://img.shields.io/twitter/url/https/github.com/hopskipnfall/dialog.svg?style=social
[maintained-badge]: https://img.shields.io/badge/maintained-yes-brightgreen
[linux-build-badge]: https://github.com/hopskipnfall/twitch-poly-tts/workflows/Linux%20Build/badge.svg
[linux-build]: https://github.com/hopskipnfall/twitch-poly-tts/actions?query=workflow%3A%22Linux+Build%22
[macos-build-badge]: https://github.com/hopskipnfall/twitch-poly-tts/workflows/MacOS%20Build/badge.svg
[macos-build]: https://github.com/hopskipnfall/twitch-poly-tts/actions?query=workflow%3A%22MacOS+Build%22
[windows-build-badge]: https://github.com/hopskipnfall/twitch-poly-tts/workflows/Windows%20Build/badge.svg
[windows-build]: https://github.com/hopskipnfall/twitch-poly-tts/actions?query=workflow%3A%22Windows+Build%22
