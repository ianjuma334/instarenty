// AdminFilter/pipeline/project.js
export const projectStage = () => ({
  $project: {
    password: 0,
    freezerId: 0,
    __v: 0
  }
});
