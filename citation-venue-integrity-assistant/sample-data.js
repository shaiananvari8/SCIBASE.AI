"use strict";

const mixedVenuePacket = {
  generatedAt: "2026-05-28T06:00:00Z",
  manuscriptId: "synthetic-ai-citation-tool-demo",
  candidates: [
    {
      id: "candidate-blocked",
      title: "Rapid Nano-Bio Discovery With Universal Clinical Claims",
      scopeFit: 0.41,
      venue: {
        name: "International Journal of Advanced Universal Science",
        peerReview: {
          status: "claimed",
          acceptanceDays: 3,
          policyTransparent: false
        },
        indexing: {
          claimed: ["PubMed", "Scopus"],
          verified: false,
          confidence: 0.22,
          fakeImpactFactor: true
        },
        editorialBoard: {
          totalMembers: 18,
          verifiedMembers: 3,
          memberComplaints: 2
        },
        integritySignals: {
          paperMillTemplatePhrases: true,
          specialIssueSpike: true,
          citationRing: true
        },
        identity: {
          hijackedJournalRisk: true,
          issnConsistent: false
        },
        fees: {
          articleProcessingCharge: 1890,
          disclosedBeforeSubmission: false
        }
      }
    },
    {
      id: "candidate-warning",
      title: "Open Review Practices for Early Stage Bioinformatics Workflows",
      scopeFit: 0.74,
      venue: {
        name: "Applied Open Methods Forum",
        peerReview: {
          status: "peer_reviewed",
          acceptanceDays: 21,
          policyTransparent: true
        },
        indexing: {
          claimed: ["DOAJ"],
          verified: true,
          confidence: 0.64,
          fakeImpactFactor: false
        },
        editorialBoard: {
          totalMembers: 12,
          verifiedMembers: 7,
          memberComplaints: 0
        },
        integritySignals: {
          paperMillTemplatePhrases: false,
          specialIssueSpike: true,
          citationRing: false
        },
        identity: {
          hijackedJournalRisk: false,
          issnConsistent: true
        },
        fees: {
          articleProcessingCharge: 450,
          disclosedBeforeSubmission: true
        }
      }
    },
    {
      id: "candidate-ready",
      title: "Reproducible Citation Recommendation Benchmarks",
      scopeFit: 0.9,
      venue: {
        name: "Journal of Reproducible Research Software",
        peerReview: {
          status: "peer_reviewed",
          acceptanceDays: 46,
          policyTransparent: true
        },
        indexing: {
          claimed: ["Crossref", "DOAJ"],
          verified: true,
          confidence: 0.91,
          fakeImpactFactor: false
        },
        editorialBoard: {
          totalMembers: 20,
          verifiedMembers: 18,
          memberComplaints: 0
        },
        integritySignals: {
          paperMillTemplatePhrases: false,
          specialIssueSpike: false,
          citationRing: false
        },
        identity: {
          hijackedJournalRisk: false,
          issnConsistent: true
        },
        fees: {
          articleProcessingCharge: 0,
          disclosedBeforeSubmission: true
        }
      }
    }
  ]
};

const readyOnlyPacket = {
  generatedAt: "2026-05-28T06:00:00Z",
  manuscriptId: "synthetic-ready-citation-tool-demo",
  candidates: [mixedVenuePacket.candidates[2]]
};

module.exports = {
  mixedVenuePacket,
  readyOnlyPacket
};
