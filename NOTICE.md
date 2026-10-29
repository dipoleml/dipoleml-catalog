# NOTICE

**DipoleML Catalog**  
Copyright © 2026 Dipole ML Inc. All rights reserved except as expressly licensed.

## Scope of the CC BY 4.0 license

The catalog metadata, indexes, README, and documentation are licensed under
Creative Commons Attribution 4.0 International (CC BY 4.0). Attribution should
name **Dipole ML Inc.** and link to <https://dipoleml.com>.

The CC BY 4.0 license does **not** apply to third-party integrations. Each
vendored item remains under its upstream license. The upstream repository,
commit, and license are recorded in the item's `dipoleml.json` under `source`.
License files and notices are preserved in each item directory.

## Third-party components

This repository redistributes source code and content from open-source
projects. Those projects remain the property of their respective copyright
holders. Their license terms govern their use, modification, and
redistribution. See:

- `Catalog/attribution.csv`: item, repository, commit, license, and path.
- Each item's `LICENSE`, `NOTICE`, and `dipoleml.json` `source` fields.
- `docs/LICENSING.md`: the catalog's license policy.

Repositories that did not pass the license policy are not included in the
marketplace folders. They are listed for review in
`Catalog/excluded-repositories.json`.

## Trademarks and brand assets

Product names, company names, logos, and marks referenced in this repository
belong to their respective owners. Logos are used nominatively to identify the
integration a user is installing. Their inclusion does not imply sponsorship,
endorsement, or affiliation.

The **Dipole ML** name, the Dipole ML mark, and the DipoleML wordmark are
trademarks of Dipole ML Inc. The brand assets in `assets/` are provided for
use with this catalog and may not be used to imply endorsement without written
permission.

## Provider normalization

The catalog presents itself as **DipoleML**. Upstream provider manifests are
archived under each item's `_upstream/` directory. Upstream executable code is
not rewritten; provider-specific runtime variables may be mapped by the
DipoleML loader for compatibility.

## Contact

Questions about licensing or attribution: [developer@dipoleml.com](mailto:developer@dipoleml.com)
