export type CorpusAssetType = "video" | "doc" | "podcast" | "link" | "file";

export type CorpusAsset = {
  id: string;
  title: string;
  category: string;
  url: string;
  contentType: string | null;
  assetType: CorpusAssetType;
  projectTags: string[];
  moduleTags: string[];
  isLinkOnly: boolean;
  linkedSolutions: string[];
  updatedAt: string;
};

export type RoutingDestinationType = "slack" | "email";

export type CorpusRoutingRule = {
  id: string;
  tag: string;
  destinationType: RoutingDestinationType;
  destinationAddress: string;
  label: string | null;
};
