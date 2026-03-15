// AdminFilter/pipeline/sort.js
export const sortStage = () => ({
  $sort: { createdAt: -1 }
});
