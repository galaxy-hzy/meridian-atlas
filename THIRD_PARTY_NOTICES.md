# License scope and third-party notices

Copyright (C) 2026 galaxy-hzy and Meridian Atlas contributors.

Original project code and copyrightable original documentation, editorial expression and contributions are licensed under **GNU AGPL-3.0-only**; see `LICENSE`. This grant extends only to rights held by the project contributors. It does not relicense third-party works, underlying facts, conventional identifiers, or public-domain passages.

## MakeHuman assets — CC0-1.0

`public/models/human-learning.glb` is prepared from MakeHuman Community core assets, pinned to commit `a8bc2d54ff0ac92e78ff71431b1023eda42bf482`. These assets retain their CC0-1.0 terms. The full asset notice is included as `public/models/LICENSE.ASSETS.md`; source links and preparation hashes are in `public/models/model-provenance.json`.

- [Pinned asset license](https://github.com/makehumancommunity/makehuman/blob/a8bc2d54ff0ac92e78ff71431b1023eda42bf482/LICENSE.ASSETS.md)
- [MakeHuman license explanation](https://static.makehumancommunity.org/about/license.html)

MakeHuman program code has a separate license. This repository does not bundle the MakeHuman or MPFB applications. Independent anatomy reference meshes and NIMBLE assets are not included.

## Application components and dependencies

The UI incorporates generated shadcn/ui component patterns (MIT) and uses React, Three.js, Vinext, pinyin-pro, Lucide and other npm dependencies. Those works retain their own licenses and notices. `package-lock.json` fixes dependency versions and records their declared license identifiers; `docs/DEPENDENCIES.md` lists direct dependencies. Dependency code is installed by `npm ci`; `node_modules` is not republished in this repository. Redistribution of built bundles still requires preserving applicable dependency notices.

A copy of the upstream shadcn/ui MIT notice is included under `LICENSES/shadcn-ui-MIT.txt`.

## Texts, standards and factual data

Classical Chinese texts are used as public-domain passages with source/version references; contemporary editorial summaries are separate. Modern standards, translations, scans and source websites retain their respective rights. This repository includes identifiers, names, basic structured location facts, brief factual keywords, bibliographic indices and project-authored summaries; it does not include complete modern standards or scanned books.

The early point-reference index consulted [TARA](https://github.com/SciCrunch/TARA-Ontology-Repository) at commit `bb7590cb130ff224b4fd95f7cb15ec5f2539c721`. The original compilation did not supply a verified blanket redistribution license in the reviewed snapshot. Its original CSV, modern translated book passages and other raw downloads are therefore not included, and no AGPL grant is claimed over them. Runtime classical indication summaries have their own per-entry source records.

The source links supplied by the application are references, not statements that the linked documents may be redistributed under this project's license. Anyone importing additional material must check its terms separately.

## Reporting a rights issue

Please open a repository issue identifying the exact path, source and claimed rights, without uploading restricted material. Contributions must preserve provenance and applicable licenses.

## iPhone container

The optional iPhone client uses Capacitor and its Browser plugin (MIT, Drifty Co.). The original notice is included in `LICENSES/Capacitor-MIT.txt` and in the app. Native build dependencies retain their own notices and privacy manifests.
