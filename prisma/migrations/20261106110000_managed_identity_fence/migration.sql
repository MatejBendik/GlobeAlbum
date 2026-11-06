-- Keep deleted application identities denied even while provider cleanup retries.
CREATE TABLE "DeletedIdentity" (
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "authDeletedAt" TIMESTAMP(3),
    CONSTRAINT "DeletedIdentity_pkey" PRIMARY KEY ("userId")
);
