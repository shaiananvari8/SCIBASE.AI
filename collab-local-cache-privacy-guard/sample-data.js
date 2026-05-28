"use strict";

const mixedCachePacket = {
  generatedAt: "2026-05-28T06:00:00Z",
  documentId: "synthetic-collab-manuscript",
  snapshots: [
    {
      id: "cache-risky",
      createdAt: "2026-05-27T20:00:00Z",
      editorMode: "WYSIWYG",
      storage: {
        persistedIn: "localStorage",
        encrypted: false
      },
      device: {
        shared: true,
        screenLockEnabled: false
      },
      sections: [
        {
          id: "dataset-results",
          classification: "restricted",
          embargoed: true,
          cachedText: true,
          titleCached: true
        },
        {
          id: "public-intro",
          classification: "public",
          embargoed: false,
          cachedText: true,
          titleCached: true
        }
      ],
      reviewMarkers: [
        {
          id: "reviewer-1",
          mode: "double-anonymous",
          identityCached: true
        }
      ],
      notebookOutputs: [
        {
          id: "cell-4",
          cached: true,
          outputFresh: false,
          containsRestrictedData: true
        }
      ],
      privateNotes: [
        {
          id: "note-sponsor",
          cached: true,
          visibility: "private-team"
        }
      ]
    },
    {
      id: "cache-warning",
      createdAt: "2026-05-26T00:00:00Z",
      editorMode: "Markdown",
      storage: {
        persistedIn: "sessionStorage",
        encrypted: true
      },
      device: {
        shared: false,
        screenLockEnabled: true
      },
      sections: [
        {
          id: "embargoed-discussion",
          classification: "internal",
          embargoed: true,
          cachedText: false,
          titleCached: true
        }
      ],
      reviewMarkers: [],
      notebookOutputs: [
        {
          id: "cell-8",
          cached: true,
          outputFresh: false,
          containsRestrictedData: false
        }
      ],
      privateNotes: []
    },
    {
      id: "cache-ready",
      createdAt: "2026-05-28T05:00:00Z",
      editorMode: "LaTeX",
      storage: {
        persistedIn: "sessionStorage",
        encrypted: true
      },
      device: {
        shared: false,
        screenLockEnabled: true
      },
      sections: [
        {
          id: "methods",
          classification: "public",
          embargoed: false,
          cachedText: true,
          titleCached: true
        }
      ],
      reviewMarkers: [
        {
          id: "reviewer-2",
          mode: "public",
          identityCached: false
        }
      ],
      notebookOutputs: [
        {
          id: "cell-10",
          cached: true,
          outputFresh: true,
          containsRestrictedData: false
        }
      ],
      privateNotes: []
    }
  ]
};

const readyCachePacket = {
  generatedAt: "2026-05-28T06:00:00Z",
  documentId: "synthetic-ready-cache",
  snapshots: [mixedCachePacket.snapshots[2]]
};

module.exports = {
  mixedCachePacket,
  readyCachePacket
};
