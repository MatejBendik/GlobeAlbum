# Use bounded Worker capabilities for photo access

Route browser upload bytes through a short-lived signed Worker capability and a FixedLengthStream before private R2 storage. This provides explicit exact-byte enforcement instead of assuming R2 presigned PUT headers enforce a size constraint without a live provider test. Conditional writes prevent overwrite, and source cleanup waits until the capability expires to prevent recreation by replay.

Use a separate read capability lasting no more than 60 seconds for processed images. The application checks ownership or publication before issuing it. The Worker accesses R2 through its binding, so Next.js needs no account-level S3 API credentials. This preserves the approved private-storage and bounded-revocation behavior while simplifying credential scope.

Invocation logs and trace sampling are disabled for capability-bearing requests so access grants are not retained in request telemetry. Enable redacted application logging rather than logging raw URLs or headers.
