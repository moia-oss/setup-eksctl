# Setup Eksctl

***Install a specific eksctl binary version on your Github Actions runner***

You may use this action in your github action workflow to define which version of eksctl will be used. `version` is a semantic version string like `0.57.0`. You can also use the keyword `latest` (default) to use the latest stable release of `eksctl`. Releases of `eksctl` are listed [here](https://github.com/weaveworks/eksctl/releases).

```
- uses: moia-oss/setup-eksctl@v1
  with:
    version: '<version>' # default is latest
  id: install
```

Please refer to the metadata file for details about all the inputs. The cached `eksctl` binary path is prepended to the PATH environment variable and can be executed directly in further workflow steps. It is also stored in the eksctl-path output variable.

### Acknowledgement

This project is inspired by the these two Azure Github Actions developed by Microsoft Corporation

* [https://github.com/Azure/setup-kubectl](https://github.com/Azure/setup-kubectl)
* [https://github.com/Azure/setup-helm](https://github.com/Azure/setup-helm)

Thanks to Weaveworks for creating `eksctl`

* [https://github.com/weaveworks/eksctl](https://github.com/weaveworks/eksctl)


# Releasing

Tags are released automatically by a Github Action.

So in order to release just create a tag like this:
```
git tag 0.[n] -m "your message"
# This will only work if your tag includes a message
git push --follow-tags
```
