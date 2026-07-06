import { cache } from "react";
import { getPitchPageData } from "@/lib/data/get-pitch-page-data";

/** Lab shell uses same lightweight loader as pitch (profile + notifications). */
export const getLabPageData = cache(getPitchPageData);
