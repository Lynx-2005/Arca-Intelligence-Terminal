# From v1 to v2

BREAKING CHANGES:

- **Module system**

  - v1: CommonJS
  - v2: ESM

- **Runtime and Test Framework support**

  - v1: Node + Jest only.
  - v2: Node (node:test, jest, vitest), Bun, Denon

- Rename header `X-JFMC-Cache` to `X-FMC-Cache`

- **Constructor** has a new conventin for its name and arguments.

  ```diff
  - import createCachingMock from "fetch-mock-cache";
  + import fetchCache from "fetch-mock-cache";

  - const cachingMock = createCachingMock({ store: new Store() });
  + const fetchCache = createFetchCache({ Store });
  ```

- **Internal API changes**
  - Rename all classes, interfaces, types, from `JFMC*` to `FMC*`
  - Internal API change change efdf25b7b0a2e6ba6571c74ef022a5820cd09b8c,
    affects alternative Storage classes.
