export type PhotoDto = {
  id: string;
  caption: string;
  thumbnailUrl: string;
  displayUrl: string;
  visitId?: string;
};
export type PlaceDto = {
  id: string;
  name: string;
  country: string;
  latitude: number;
  longitude: number;
  photoCount: number;
  visitCount: number;
  coverPhotoId: string | null;
  coverUrl: string | null;
};
export type GlobeDto = {
  username: string;
  displayName: string;
  published: boolean;
  places: PlaceDto[];
  countryCount: number;
  photoCount: number;
  visitCount: number;
  photoSlotsUsed?: number;
};
export type VisitDto = {
  id: string;
  startDate: string;
  endDate: string;
  photoCount: number;
};
export type GalleryDto = { photos: PhotoDto[]; visits?: VisitDto[] };
export type ActionResult = { error?: string; success?: boolean };
