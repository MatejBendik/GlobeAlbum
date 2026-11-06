# Operating cost assumptions

Prices checked: 2026-11-05. USD before tax, exchange rates, retries, domains and
unrelated account usage. Examples are not purchases or approved upgrades.

Required services: Vercel Next.js/functions/cron, Neon PostgreSQL, R2 Standard,
Images-enabled Worker, Google OAuth configuration, GeoNames search account.
No separate email provider is needed for Google-only auth. Domain ~$12/year is
the user's estimate, not a verified renewal quote.

| Service     | Included / starting point                                                              | Growth constraint                                                                  |
| ----------- | -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Vercel      | Hobby $0 for eligible use                                                              | Non-commercial personal use; Pro starts at $20/month with usage rules              |
| Neon Free   | 100 CU-hours/month/project, 1 GB PostgreSQL, 5 GB public transfer/month/project        | Compute can suspend at allowance; Launch lists $0.106/CU-hour and $0.35/GB-month   |
| R2 Standard | 10 GB-month, 1M Class A and 10M Class B operations/month, no R2 internet egress charge | $0.015/GB-month, $4.50/M Class A, $0.36/M Class B; billing categories round upward |
| Images Free | 5,000 unique transformations/month; `.info()` free                                     | New transforms fail at limit; paid scenario $0.50/1,000 above included 5,000       |
| Worker      | Free runtime selected                                                                  | Requests/CPU are separate; measure and confirm runtime limits                      |

Workers Free currently permits 100,000 requests/day and 10 ms CPU per invocation.
The large-image path must be measured against that CPU allowance before release.

The user manually activated R2's subscription. It can bill excess usage. The
app's 8 GB/4,000 transformation limits provide headroom, not a provider-wide
spending guarantee. No Images/Workers paid upgrade has been enabled.

Assume full 50-photo accounts, 0.5 MB combined retained variants/photo, 5 MB
average source retained for at most one day, and two initial transforms/photo.
Assume 20 public sessions/account/month, each loading ten 50 KB thumbnails and
five 400 KB display images. These are estimates, not measured behavior.

| Metric                            | 30-account beta | 1,000-account growth |
| --------------------------------- | --------------: | -------------------: |
| Photos                            |           1,500 |               50,000 |
| Retained variants                 |         0.75 GB |                25 GB |
| Initial transformations           |           3,000 |              100,000 |
| Public sessions/month             |             600 |               20,000 |
| Assumed image transfer/month      |          1.5 GB |                50 GB |
| Image GETs/month, without retries |           9,000 |              300,000 |

Growth exceeds the app's free-beta processing cap. If approved later, 25 GB
retained storage implies roughly $0.23/month beyond the R2 allowance; 100,000
initial transforms imply $47.50 Images. Temporary objects, writes, heads,
cleanup, Worker requests, database and hosting are additional dimensions.
Simultaneously reserving every beta source also exceeds 8 GB:
1,500 × (5 MB source + 4 MB variant reserve) = 13.5 GB.

Estimate Neon from measured CU-hours/metadata transfer, not photo count. Images
travel through Worker/R2 rather than Vercel's image optimizer; Vercel still serves
HTML/JS/APIs and incurs compute/waiting usage. A free allowance does not guarantee
long-term free production operation.

Primary sources:

- https://vercel.com/pricing
- https://vercel.com/docs/limits/fair-use-guidelines#commercial-usage
- https://neon.com/pricing
- https://developers.cloudflare.com/r2/pricing/
- https://developers.cloudflare.com/images/pricing/
- https://developers.cloudflare.com/workers/platform/pricing/
