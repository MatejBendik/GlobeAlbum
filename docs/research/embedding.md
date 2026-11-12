# Interactive globe embedding

Verified: 2026-11-12. Product choices are recorded separately in the
[approved specification](../work/globe-embed/spec.md).

## Verified facts

- An iframe has its own document; cross-origin DOM access is restricted. Shadow
  DOM isolates markup/styles but is not a security boundary. Sources:
  https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/iframe and
  https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_shadow_DOM.
- CSP frame-ancestors controls permitted parents and must be an HTTP header; it
  does not inherit default-src. Every ancestor must pass. X-Frame-Options
  ALLOW-FROM is obsolete. Sources: https://www.w3.org/TR/CSP3/#directive-frame-ancestors
  and https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/X-Frame-Options.
- Sandbox allow-same-origin preserves the frame's own origin, not the parent's.
  Scripts plus same-origin do not establish an effective sandbox when the parent
  itself shares that origin. Popup permissions are needed for the approved
  external profile link. The viewer contains only our trusted application code.
  Source: https://html.spec.whatwg.org/multipage/iframe-embed-object.html#the-iframe-element.
- Third-party cookies/storage may be blocked or partitioned. The viewer must not
  depend on a logged-in owner or request storage access. Sources:
  https://developer.mozilla.org/en-US/docs/Web/API/Storage_Access_API and
  https://webkit.org/blog/10218/full-third-party-cookie-blocking-and-more/.
- Reserving dimensions prevents layout shifts. Lazy loading can reduce offscreen
  cost. Source: https://web.dev/articles/embed-best-practices.
- Intersection Observer considers clipping by nested frames. Visibility changes
  identify hidden tabs; hiding an iframe through CSS does not itself change its
  document visibility. Sources:
  https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API and
  https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API.
- The installed react-globe.gl exposes pauseAnimation/resumeAnimation and
  OrbitControls. Source: https://github.com/vasturiano/react-globe.gl.
- Keyboard access and stopping automatic motion require accessible equivalents.
  Sources: https://www.w3.org/WAI/WCAG22/Understanding/keyboard.html and
  https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html.
- Installed Next.js 16.4.5 route-group/layout, proxy and headers guides were read.
  Route groups do not change public URLs. Header rules must avoid a conflicting
  global DENY on the viewer. Source: https://nextjs.org/docs/app/api-reference/config/next-config-js/headers.

## Recommendation and implementation choice

Use a public iframe viewer with no SDK, host script, cross-origin API CORS changes,
postMessage protocol or new cloud services. Reuse existing rendering and public
photo projections. Separate embed and application layouts and always use public
DTOs in the frame. The owner configures the embed in the authenticated application.

The user's screenshot and https://marclou.com/ are visual portfolio references.
The website's text output does not establish how its globe is implemented; no
claim is made about Marc Lou's implementation.

## Verification limits

Local second-origin browser tests, local storage/auth fixtures, production build
checks and real deployed/mobile-device validation must be distinguished. No
production deployment is part of this feature request.
