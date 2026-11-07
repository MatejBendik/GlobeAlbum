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

## Implementation follow-up — 2026-11-06

The user's own GeoNames username is configured in ignored `.env.local`. A direct
HTTPS prefix search for `Kosice` returned HTTP 200 and three populated-place
results, including Slovakia. The application retains the enabled-account,
eight-result and per-user throttling requirements. A provider `status` error
inside an HTTP 200 response is treated as unavailable, rather than an empty
successful search. Autocomplete supports keyboard selection and cancels stale
requests. Missing-place map selection remains available.

The subsequent opt-in browser test called the real service through the app's
authenticated search route, chose Krompachy with arrow keys/Enter, persisted
the selected provider ID/country/coordinates in local PostgreSQL and reached the
new visit's photo step. Auth and storage used guarded localhost test doubles.

The installed Three.js CSS2DRenderer writes each marker's inline `transform` for
screen positioning. A stable button wraps a visual postcard; independent `scale`
and `rotate` on that child avoid competing with positioning or moving the hit target.
This is a source-code observation, not a claim that postcards scale in world
units. The current renderer scales the visual frame with camera distance and
keeps the pin and button hit target fixed in screen pixels.

Primary references checked 2026-11-06:

- https://www.geonames.org/export/geonames-search.html
- https://github.com/vasturiano/react-globe.gl
- https://github.com/mrdoob/three.js/blob/r187/examples/jsm/renderers/CSS2DRenderer.js

## Country labels — 2026-11-07

The [Natural Earth 1:110m Admin 0 Countries export](https://github.com/nvkelso/natural-earth-vector/blob/v5.1.2/geojson/ne_110m_admin_0_countries.geojson)
includes a short name, an anchor and a rank for each country shape. World Map
uses those fields in the existing renderer's HTML layer. Labels stay horizontal
and legible, with priority for visited countries and more detail at closer zoom.
The renderer skips names that would overlap another name; postcards can cover
them. Atlas reuses only the outlines. Both use a bundled asset without a map
service request. Natural Earth data is [public domain](https://www.naturalearthdata.com/about/terms-of-use/).

Primary references:

- https://magicui.design/docs/components/globe
- https://github.com/shuding/cobe
- https://ui.aceternity.com/components/github-globe
- https://github.com/vasturiano/react-globe.gl
- https://www.geonames.org/export/
- https://www.geonames.org/export/web-services.html
- https://www.naturalearthdata.com/about/terms-of-use/

See [third-party notices](../third-party-notices.md) for content/license handling.
