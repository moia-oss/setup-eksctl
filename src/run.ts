import * as os from 'os';
import * as path from 'path';
import * as util from 'util';
import * as fs from 'fs';

import * as toolCache from '@actions/tool-cache';
import * as core from '@actions/core';
import * as semver from 'semver';

const eksctlToolName = 'eksctl';
const stableEksctlVersion = '0.57.0';
const eksctlAllReleasesUrl = 'https://api.github.com/repos/weaveworks/eksctl/releases';

export function getExecutableExtension(): string {
    if (os.type().match(/^Win/)) {
        return '.exe';
    }
    return '';
}

export function getEksctlOSArchitecture(): string {
    let arch = os.arch();
    if (arch === 'x64') {
        return 'amd64';
    }
    return arch;
}

// toCheck is valid if it's not a release candidate and greater than the builtin stable version
export function isValidRelease(toCheck, stable: string): boolean {
    return toCheck.toString().indexOf('rc') == -1 && semver.gt(toCheck, stable)
}

export async function getLatestEksctlVersion(): Promise<string> {
    try {
        const downloadPath = await toolCache.downloadTool(eksctlAllReleasesUrl);
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
    } catch (error) {
        core.warning(util.format("Cannot get the latest eksctl info from %s. Error %s. Using default builtin version %s.", eksctlAllReleasesUrl, error, stableEksctlVersion));
    }

    return stableEksctlVersion;
}

export function getEksctlDownloadURL(version: string, arch: string): string {
    switch (os.type()) {
        case 'Linux':
            return util.format('https://github.com/weaveworks/eksctl/releases/download/%s/eksctl_Linux_%s.tar.gz', version, arch);

        case 'Darwin':
            return util.format('https://github.com/weaveworks/eksctl/releases/download/%s/eksctl_Darwin_%s.tar.gz', version, arch);

        case 'Windows_NT':
        default:
            return util.format('https://github.com/weaveworks/eksctl/releases/download/%s/eksctl_Windows_%s.zip', version, arch);

    }
}

export async function downloadEksctl(version: string): Promise<string> {
    if (!version) { version = await getLatestEksctlVersion(); }
    let cachedToolpath = toolCache.find(eksctlToolName, version);
    let eksctlDownloadPath = '';
    let extractedEksctlPath = '';
    let arch = getEksctlOSArchitecture();
    if (!cachedToolpath) {
        try {
            eksctlDownloadPath = await toolCache.downloadTool(getEksctlDownloadURL(version, arch));
            if(os.type() === 'Windows_NT') {
                extractedEksctlPath = await toolCache.extractZip(eksctlDownloadPath);
            } else {
                extractedEksctlPath = await toolCache.extractTar(eksctlDownloadPath);
            }
        } catch (exception) {
            if (exception instanceof toolCache.HTTPError && exception.httpStatusCode === 404) {
                throw new Error(util.format("Eksctl '%s' for '%s' arch not found.", version, arch));
            } else {
                throw new Error('DownloadEksctlFailed');
            }
        }

        let toolName = eksctlToolName + getExecutableExtension()
        cachedToolpath = await toolCache.cacheDir(extractedEksctlPath, toolName, eksctlToolName, version);
    }

    const eksctlPath = path.join(cachedToolpath, eksctlToolName + getExecutableExtension());
    fs.chmodSync(eksctlPath, '777');
    return eksctlPath;
}

export async function run() {
    let version = core.getInput('version', { 'required': true });
    if (version.toLocaleLowerCase() === 'latest') {
        version = await getLatestEksctlVersion();
    }

    core.debug(util.format("Downloading eksctl version %s", version));
    let cachedEksctlPath = await downloadEksctl(version);

    core.addPath(path.dirname(cachedEksctlPath));
            
    console.log(`Eksctl version: '${version}' has been cached at ${cachedEksctlPath}`);
    core.setOutput('eksctl-path', cachedEksctlPath);
}


run().catch(core.setFailed);
