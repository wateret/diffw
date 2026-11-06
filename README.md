# ldiff

Review a git diff in a GitHub-style web page. `ldiff` hosts the diff locally and prints the address.

```
$ ldiff git show HEAD
http://127.0.0.1:53211/
```

## Install

```sh
npm install -g @wateret/ldiff     # from the registry
npm install -g .                  # from a checkout
npm link                          # from a checkout, for development
```

Requires Node 18+. No dependencies.

## Usage

```sh
ldiff git show HEAD
ldiff git diff main...feature
ldiff git log -p -3
git diff --staged | ldiff
ldiff -p 7700,7800-7810 git show   # try these ports in order
ldiff -o git show                  # also open the browser
```

Keys in the page: `j`/`k` next/previous file, `s` unified/split, `v` mark viewed, `/` filter files.
