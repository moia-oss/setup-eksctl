"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.run = exports.downloadEksctl = exports.getEksctlDownloadURL = exports.getLatestEksctlVersion = exports.isValidRelease = exports.getEksctlOSArchitecture = exports.getExecutableExtension = void 0;
const os = require("os");
const path = require("path");
const util = require("util");
const fs = require("fs");
const toolCache = require("@actions/tool-cache");
const core = require("@actions/core");
const semver = require("semver");
const eksctlToolName = 'eksctl';
const stableEksctlVersion = '0.57.0';
const eksctlAllReleasesUrl = 'https://api.github.com/repos/weaveworks/eksctl/releases';
function getExecutableExtension() {
    if (os.type().match(/^Win/)) {
        return '.exe';
    }
    return '';
}
exports.getExecutableExtension = getExecutableExtension;
function getEksctlOSArchitecture() {
    let arch = os.arch();
    if (arch === 'x64') {
        return 'amd64';
    }
    return arch;
}
exports.getEksctlOSArchitecture = getEksctlOSArchitecture;
// toCheck is valid if it's not a release candidate and greater than the builtin stable version
function isValidRelease(toCheck, stable) {
    return toCheck.toString().indexOf('rc') == -1 && semver.gt(toCheck, stable);
}
exports.isValidRelease = isValidRelease;
function getLatestEksctlVersion() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const downloadPath = yield toolCache.downloadTool(eksctlAllReleasesUrl);
            const responseArray = JSON.parse(fs.readFileSync(downloadPath, 'utf8').toString().trim());
            let latestEksctlVersion = semver.clean(stableEksctlVersion);
            responseArray.forEach(response => {
                if (response && response.tag_name) {
                    let selectedEksctlVersion = semver.clean(response.tag_name.toString());
                    if (selectedEksctlVersion) {
                        if (isValidRelease(selectedEksctlVersion, latestEksctlVersion)) {
                            latestEksctlVersion = selectedEksctlVersion;
                        }
                    }
                }
            });
            return latestEksctlVersion;
        }
        catch (error) {
            core.warning(util.format("Cannot get the latest eksctl info from %s. Error %s. Using default builtin version %s.", eksctlAllReleasesUrl, error, stableEksctlVersion));
        }
        return stableEksctlVersion;
    });
}
exports.getLatestEksctlVersion = getLatestEksctlVersion;
function getEksctlDownloadURL(version, arch) {
    switch (os.type()) {
        case 'Linux':
            return util.format('https://github.com/weaveworks/eksctl/releases/download/%s/eksctl_Linux_%s.tar.gz', version, arch);
        case 'Darwin':
            return util.format('https://github.com/weaveworks/eksctl/releases/download/%s/eksctl_Darwin_%s.tar.gz', version, arch);
        case 'Windows_NT':
        default:
            return util.format('https://github.com/weaveworks/eksctl/releases/download/%s/eksctl_Windows_%s.tar.gz', version, arch);
    }
}
exports.getEksctlDownloadURL = getEksctlDownloadURL;
function downloadEksctl(version) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!version) {
            version = yield getLatestEksctlVersion();
        }
        let cachedToolpath = toolCache.find(eksctlToolName, version);
        let eksctlDownloadPath = '';
        let extractedEksctlPath = '';
        let arch = getEksctlOSArchitecture();
        if (!cachedToolpath) {
            try {
                eksctlDownloadPath = yield toolCache.downloadTool(getEksctlDownloadURL(version, arch));
                extractedEksctlPath = yield toolCache.extractTar(eksctlDownloadPath);
            }
            catch (exception) {
                if (exception instanceof toolCache.HTTPError && exception.httpStatusCode === 404) {
                    throw new Error(util.format("Eksctl '%s' for '%s' arch not found.", version, arch));
                }
                else {
                    throw new Error('DownloadEksctlFailed');
                }
            }
            let toolName = eksctlToolName + getExecutableExtension();
            cachedToolpath = yield toolCache.cacheDir(extractedEksctlPath, toolName, eksctlToolName, version);
        }
        const eksctlPath = path.join(cachedToolpath, eksctlToolName + getExecutableExtension());
        fs.chmodSync(eksctlPath, '777');
        return eksctlPath;
    });
}
exports.downloadEksctl = downloadEksctl;
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        let version = core.getInput('version', { 'required': true });
        core.debug(util.format("Downloading eksctl version %s", version));
        let cachedPath = yield downloadEksctl(version);
        core.addPath(path.dirname(cachedPath));
        console.log(`Eksctl version: '${version}' has been cached at ${cachedPath}`);
        core.setOutput('eksctl-path', cachedPath);
    });
}
exports.run = run;
run().catch(core.setFailed);
