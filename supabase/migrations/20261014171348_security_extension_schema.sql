-- Keep relocatable PostgreSQL extensions outside the exposed API schema.
-- Extension-owned indexes/operators retain their OIDs; existing application
-- functions do not reference public extension names or unqualified calls.
alter extension unaccent set schema extensions;
alter extension pg_trgm set schema extensions;
