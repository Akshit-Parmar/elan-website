# Gallery without captions

Gallery uploads no longer require captions. Choose a photo and group, then save or publish it. Bulk uploads use the same approach and continue to save as drafts.

Public gallery cards and the full-screen viewer do not show captions. Photographer credits, when supplied, remain visible. Optional image descriptions support screen readers. If omitted, the saved description uses the edition and group as general context, without inventing what the image contains.

The existing backend still stores an internal title for compatibility. New uploads use the filename or a group-based label automatically. Existing records and captions are retained in the database but are not shown publicly. No database migration is necessary.

Caption generation is not loaded or started by either gallery upload flow. This replaces the gallery-caption instructions in earlier release notes.
