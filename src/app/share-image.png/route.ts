import { demoGlobe } from "@/lib/demo";
import { renderShareImage } from "@/lib/share-image";

export const dynamic = "force-static";

export async function GET() {
  return renderShareImage({
    title: "A world of little moments.",
    subtitle: "Your travels and photos on a globe of your own.",
    label: "GLOBEALBUM.COM",
    style: demoGlobe.style,
    places: demoGlobe.places,
    photos: demoGlobe.places
      .slice(0, 3)
      .flatMap(({ coverUrl, name }) =>
        coverUrl ? [{ url: coverUrl, place: name }] : [],
      ),
  });
}
