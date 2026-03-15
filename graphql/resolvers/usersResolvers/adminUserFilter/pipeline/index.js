// AdminFilter/pipeline/index.js
import { addFieldsStage } from "./addFields.js";
import { lookupStage } from "./lookup.js";
import { projectStage } from "./project.js";
import { sortStage } from "./sort.js";

export const buildPipeline = ({
  filters,
  page = 1,
  limit = 10
}) => {
  const skip = (page - 1) * limit;

  return [
    { $match: filters },
    addFieldsStage(),
    lookupStage(),
    sortStage(),
    { $skip: skip },
    { $limit: limit },
    projectStage()
  ];
};
