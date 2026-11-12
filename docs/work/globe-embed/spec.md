# Interactive globe embeds

Status: approved; implementation explicitly authorized on 2026-11-12.

## User-confirmed behavior

Owners use an enlarged Share globe modal with Share link and Embed tabs. Every
published globe is embeddable on any website, with no additional permission,
token, domain list or database setting. Private globes show "Make your globe
public first" with the existing publication action; preview and copying remain
unavailable until publication succeeds. Hiding denies new reads; republishing
restores existing embeds. Previously downloaded content cannot be recalled.
Existing photo capabilities retain their maximum 60-second lifetime.

The only configuration is Rectangle (16:10) or Square (1:1), and Light or Dark.
Defaults are Rectangle and Light. Width is responsive; no numeric inputs. The
saved globe style and content are used on the next load. No live synchronization.
Preview uses the actual iframe inside a clearly labeled example portfolio, with
Desktop and Mobile modes, never scraping the owner's website. Copy HTML provides
success feedback and manual selection if clipboard access fails.

The embedded globe is immediately interactive, including wheel zoom and drag.
It has no site header, profile statistics or footer. Compact pause/reset/place-list
controls remain. Photos open the existing gallery within the frame, with arrows,
keyboard navigation and swipe. Camera and zoom survive gallery opening/closing.
A small GlobeAlbum link opens the published profile in a new tab. No fullscreen
mode, transparent background, JS SDK or independently selected globe style in v1.

## Implementation decisions

- Public viewer: GET /embed/[username]?theme=light|dark; invalid theme uses Light.
- Public gallery: GET /api/embed/[username]/places/[id]/gallery; verify the place's
  globe username and current publication, never apply an owner session.
- Reuse the globe renderer, photo projections and gallery with an explicit embed
  gallery source. No private dates, email, pending uploads or visit identifiers.
- Separate site and embed layouts with route groups. Embed has its own forced
  theme, compact loading/unavailable/error states and no analytics.
- Bypass session middleware for embed documents and APIs. No cookies or storage
  access are required. Publication-sensitive reads remain dynamic and no-store.
- Permit framing only on the viewer route. Preserve anti-framing headers elsewhere.
- Generated HTML is a titled, lazy iframe with an absolute URL, reserved aspect
  ratio, and sandbox permissions for scripts, own origin and the profile popup.
- Pause rendering offscreen/in hidden documents and the underlying owner globe
  during preview. Unmount preview on tab/modal close. Preserve reduced motion,
  complete accessible place list and WebGL fallback.
- No database migration, dependencies, cloud provisioning, purchases or deployment.

## Verification seams

Approved with the implementation plan: domain reads/public HTTP endpoints for
publication, relationship checks and DTO privacy; complete browser journeys for
configuration, copied HTML on a second origin, themes, galleries and revocation.
Integration tests use guarded local PostgreSQL and the existing local transport
fixtures. Local evidence must not be described as deployed cloud/mobile evidence.

## Delivery

Five dependent vertical slices are tracked under [issues](issues/). Apply the
repository formatter, typecheck, relevant integration/browser tests and production
build. Commit verified increments and push origin/main. No deployment is authorized
by this feature request. Research: [embedding](../../research/embedding.md).
