// AdminFilter/pipeline/addFields.js
export const addFieldsStage = () => ({
  $addFields: {
    fullName: { $concat: ["$fname", " ", "$lname"] }
  }
});
