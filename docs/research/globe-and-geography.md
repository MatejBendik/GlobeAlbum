# Globe and geographic data

Reviewed: 2026-11-05. Selection is approved; physical mobile performance remains unverified.

| Candidate               | Fit                                                                                            | Trade-off                                                            |
| ----------------------- | ---------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Magic UI Globe / Cobe   | Decorative canvas globe, Cobe configuration and small underlying library                       | Photo DOM overlays, picking and camera integration need bespoke work |
| Aceternity GitHub Globe | Interaction/atmosphere reference                                                               | Display recipe is not a travel gallery; no source copied             |
| react-globe.gl          | Documented HTML markers, visibility callbacks, screen-coordinate projection and camera control | Larger Three.js/WebGL runtime; selected for direct functional fit    |

One marker represents each Place. Bounded projected postcards and dots reduce
overlap; this is not a claim of built-in automatic clustering. All places remain
in a searchable HTML list. Compact marker DTOs load first, gallery DTOs on demand.
Only thumbnail/display variants enter rendering responses; never originals.
Reduced motion disables rotation/camera tweening. WebGL failure retains the list.

The renderer is dynamically imported, pixel ratio capped at 1.5, and decorative
land dots use merged geometry. Measure actual chunks, memory and frame rate before
beta. Cobe's advertised size is not this application's bundle measurement.

## Places and countries

Persist selected GeoNames names, coordinates, country and provider ID; saved
viewing does not depend on live search. Internal IDs remain independent. Manual
entry requires country and valid coordinates. Authenticated search is debounced,
limited to eight results and throttled per account.

Count distinct effective country codes from places with visits, including visits
without photos. A separate country correction preserves source data. Country and
territory codes are the agreed counting convention, not a sovereignty claim.

GeoNames needs a username, enabled web services, attribution and credit-limit
compliance. Never use its documentation's demo account. Confirm current account
limits/premium pricing in the user's account before beta; free availability is
not an SLA. No premium service is activated. A self-hosted gazetteer is possible
later, with indexing, updates and storage costs.

Published GeoNames free limits are 10,000 credits/day/application and 1,000/hour;
most services consume one credit per request. Treat these as shared provider
limits in addition to the app's per-user throttle.

Primary references:

- https://magicui.design/docs/components/globe
- https://github.com/shuding/cobe
- https://ui.aceternity.com/components/github-globe
- https://github.com/vasturiano/react-globe.gl
- https://www.geonames.org/export/
- https://www.geonames.org/export/web-services.html
- https://www.naturalearthdata.com/about/terms-of-use/

See [third-party notices](../third-party-notices.md) for content/license handling.
