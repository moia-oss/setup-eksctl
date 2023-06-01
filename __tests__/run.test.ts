import * as run from '../src/run'
import * as os from 'os';
import * as toolCache from '@actions/tool-cache';
import * as fs from 'fs';
import * as path from 'path';
import * as core from '@actions/core';
import * as util from 'util';

describe('Testing all functions in run file.', () => {
    test('run() must download specified eksctl version and set output', async () => {
        jest.spyOn(core, 'getInput').mockReturnValue('0.57.0');
        jest.spyOn(toolCache, 'find').mockReturnValue('pathToCachedTool');
        jest.spyOn(os, 'type').mockReturnValue('Linux');
        jest.spyOn(fs, 'chmodSync').mockImplementation();
        jest.spyOn(core, 'addPath').mockImplementation();
        jest.spyOn(console, 'log').mockImplementation();
        jest.spyOn(core, 'setOutput').mockImplementation();

        expect(await run.run()).toBeUndefined();
        expect(core.getInput).toBeCalledWith('version', { 'required': true });
        expect(core.addPath).toBeCalledWith('pathToCachedTool');
        expect(core.setOutput).toBeCalledWith('eksctl-path', path.join('pathToCachedTool', 'eksctl'));
    });

    test('getExecutableExtension() must return .exe file extension when os equals Windows', () => {
        jest.spyOn(os, 'type').mockReturnValue('Windows_NT');

        expect(run.getExecutableExtension()).toBe('.exe');
        expect(os.type).toBeCalled();
    });

    test('getExecutableExtension() must return an empty string for non-windows OS', () => {
        jest.spyOn(os, 'type').mockReturnValue('Darwin');

        expect(run.getExecutableExtension()).toBe('');
        expect(os.type).toBeCalled();
    });

    test.each([
        ['arm', 'arm'],
        ['arm64', 'arm64'],
        ['x64', 'amd64']
    ])("getEksctlArch() must return on %s os architecture %s eksctl architecture", (osArch, eksctlVersion) => {
        jest.spyOn(os, 'arch').mockReturnValue(osArch);

        expect(run.getEksctlOSArchitecture()).toBe(eksctlVersion);
        expect(os.arch).toBeCalled();
    });

    test.each([
        ['arm'],
        ['arm64'],
        ['amd64']
    ])('getEksctlDownloadURL() must return the URL to download %s eksctl for Linux based systems', (arch) => {
        jest.spyOn(os, 'type').mockReturnValue('Linux');
        const eksctlLinuxUrl = util.format('https://github.com/weaveworks/eksctl/releases/download/v0.57.0/eksctl_Linux_%s.tar.gz', arch);

        expect(run.getEksctlDownloadURL('0.57.0', arch)).toBe(eksctlLinuxUrl);
        expect(os.type).toBeCalled();
    });

    test.each([
        ['arm'],
        ['arm64'],
        ['amd64']
    ])('getEksctlDownloadURL() must return the URL to download %s eksctl for MacOS based systems', (arch) => {
        jest.spyOn(os, 'type').mockReturnValue('Darwin');
        const eksctlDarwinUrl = util.format('https://github.com/weaveworks/eksctl/releases/download/v0.57.0/eksctl_Darwin_%s.tar.gz', arch);

        expect(run.getEksctlDownloadURL('0.57.0', arch)).toBe(eksctlDarwinUrl);
        expect(os.type).toBeCalled();
    });

    test.each([
        ['arm'],
        ['arm64'],
        ['amd64']
    ])('getEksctlDownloadURL() must return the URL to download %s eksctl for Windows based systems', (arch) => {
        jest.spyOn(os, 'type').mockReturnValue('Windows_NT');
        const eksctlWindowsUrl = util.format('https://github.com/weaveworks/eksctl/releases/download/v0.57.0/eksctl_Windows_%s.zip', arch);

        expect(run.getEksctlDownloadURL('0.57.0', arch)).toBe(eksctlWindowsUrl);
        expect(os.type).toBeCalled();
    });

    test('downloadEksctl() must download eksctl tarball, add it to github actions tool cache and return the path to extracted dir', async () => {
        jest.spyOn(toolCache, 'find').mockReturnValue('');
        jest.spyOn(toolCache, 'downloadTool').mockReturnValue(Promise.resolve('eksctlDownloadPath'));
        jest.spyOn(toolCache, 'extractTar').mockReturnValue(Promise.resolve('eksctlExtractedFolder'));

        jest.spyOn(toolCache, 'cacheDir').mockReturnValue(Promise.resolve('pathToCachedTool'));
        jest.spyOn(os, 'type').mockReturnValue('Linux');
        jest.spyOn(fs, 'chmodSync').mockImplementation(() => { });

        expect(await run.downloadEksctl('0.57.0')).toBe(path.join('pathToCachedTool', 'eksctl'));
        expect(toolCache.find).toBeCalledWith('eksctl', '0.57.0');
        expect(toolCache.downloadTool).toBeCalled();
        expect(toolCache.cacheDir).toBeCalled();
        expect(os.type).toBeCalled();
        expect(fs.chmodSync).toBeCalledWith(path.join('pathToCachedTool', 'eksctl'), '777');
    });

    test('downloadEksctl() must download eksctl zip archive, add it to github actions tool cache and return the path to extracted dir', async () => {
        jest.spyOn(toolCache, 'find').mockReturnValue('');
        jest.spyOn(toolCache, 'downloadTool').mockReturnValue(Promise.resolve('eksctlDownloadPath'));
        jest.spyOn(toolCache, 'extractZip').mockReturnValue(Promise.resolve('eksctlExtractedFolder'));

        jest.spyOn(toolCache, 'cacheDir').mockReturnValue(Promise.resolve('pathToCachedTool'));
        jest.spyOn(os, 'type').mockReturnValue('Windows_NT');
        jest.spyOn(fs, 'chmodSync').mockImplementation(() => { });

        expect(await run.downloadEksctl('0.57.0')).toBe(path.join('pathToCachedTool', 'eksctl.exe'));
        expect(toolCache.find).toBeCalledWith('eksctl', '0.57.0');
        expect(toolCache.downloadTool).toBeCalled();
        expect(toolCache.cacheDir).toBeCalled();
        expect(os.type).toBeCalled();
        expect(fs.chmodSync).toBeCalledWith(path.join('pathToCachedTool', 'eksctl.exe'), '777');
    });

    test('getLatestEksctlVersion() must download latest version file, read version and return it', async () => {
        jest.spyOn(toolCache, 'downloadTool').mockResolvedValue('pathToTool');
        const response = JSON.stringify(
            [
                {
                    'tag_name': 'v0.57.0'
                }, {
                    'tag_name': 'v0.56.0'
                }, {
                    'tag_name': 'v0.55.0'
                }
            ]
        );
        jest.spyOn(fs, 'readFileSync').mockReturnValue(response);

        expect(await run.getLatestEksctlVersion()).toBe('0.57.0');
        expect(toolCache.downloadTool).toBeCalled();
        expect(fs.readFileSync).toBeCalledWith('pathToTool', 'utf8');
    });
})
