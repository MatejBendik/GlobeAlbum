CREATE TYPE "GlobeStyle" AS ENUM ('dotted', 'atlas', 'orbit');

ALTER TABLE "Globe"
ADD COLUMN "style" "GlobeStyle" NOT NULL DEFAULT 'dotted';
