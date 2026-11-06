# Third-party content and licenses

Recorded 2026-11-05.

- The globe renderer uses `react-globe.gl`/`globe.gl` and Three.js (MIT).
  Keep dependency license notices when distributing their code.
- React, Next.js, Tailwind, Radix primitives and the other installed packages
  retain their respective upstream licenses in their packages. No proprietary
  AlignUI source or second UI registry was copied into this application.
- `public/land-dots.json` contains sampled land points derived from Natural Earth
  public-domain country geometry. Source: https://www.naturalearthdata.com/about/terms-of-use/
  These are decorative points, not authoritative geographic boundaries.
- GeoNames data requires attribution under CC BY. The place form links to
  GeoNames. Persisted provider identifiers remain separate from internal IDs.
  Source: https://www.geonames.org/export/
- Example-only photographs use remote Unsplash image URLs. They do not belong
  to a user account or the private storage pipeline. Replace them with owned
  assets before a production marketing launch if stable controlled delivery is
  required. License: https://unsplash.com/license
- Committed tiny PNG/HEIC fixtures are synthetic and contain no personal content.

The visual design and UI source are original to this project. Clerk and AlignUI
were aesthetic references, not bundled products or claimed affiliations.

Added 2026-11-06: Sharp 0.35.5 (Apache-2.0), `heic-decode` 2.1.0 (ISC), and
its libheif-js WASM dependency (LGPL-3.0) run on the Node.js server for photo
processing. Preserve their packaged license notices and upstream source links;
the decoder is not shipped to browser clients. Sources:
https://sharp.pixelplumbing.com/,
https://github.com/catdad-experiments/heic-decode,
https://github.com/catdad-experiments/libheif-js.

Added 2026-11-06: Leaflet 1.9.4 (BSD-2-Clause) and React Leaflet 5.0.0 (MIT)
power the manual location picker. Standard OpenStreetMap tiles retain visible
© OpenStreetMap contributors attribution. Browsers fetch only the visible map,
retain normal caching/Referer behavior, and offer no bulk/offline downloads.
Automated tests stub all tile requests. Community tile availability has no SLA;
review capacity/provider choice before public growth. No paid map service was
created. Sources checked 2026-11-06:
https://leafletjs.com/reference.html,
https://react-leaflet.js.org/docs/start-installation/,
https://operations.osmfoundation.org/policies/tiles/.

Added 2026-11-06: React DayPicker 9.14.0 and Radix Popover 1.3.1 (MIT) provide
the optional visit calendar. Its composition follows the shadcn Date Picker
pattern, adapted to this app's existing Radix components and semantic colors;
no Base UI or second token system is installed. References checked 2026-11-06:
https://ui.shadcn.com/docs/components/base/date-picker,
https://ui.shadcn.com/docs/components/radix/calendar,
https://daypicker.dev/v9/docs/styling,
https://daypicker.dev/v9/docs/navigation.
