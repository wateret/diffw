# diffw

Review a git diff in a GitHub-style web page. `dw` (diffw) hosts the diff locally and prints the address.

```
$ dw git show HEAD
http://127.0.0.1:53211/
```

## Install

```sh
git clone git@github.com:wateret/diffw.git
cd diffw
npm link                          # links `dw` to this checkout; `git pull` to update
```

Requires Node 18+. No dependencies.

## Usage

```sh
dw git show HEAD
dw git diff main...feature
dw git log -p -3
git diff --staged | dw
dw -p 7700,7800-7810 git show   # try these ports in order
dw -o git show                  # also open the browser
```

Keys in the page: `j`/`k` next/previous file, `s` unified/split, `v` mark viewed, `/` filter files.
