import mongoose from 'mongoose';

const reportStatusEnum = ["pending", "in_progress", "solved"];

const ReportSchema = new mongoose.Schema({
  reporter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  reported: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  reason: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: reportStatusEnum,
    default: 'pending'
  },
  handledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  solutionNote: {
    type: String,
    default: ""
  }
}, {
  timestamps: true,
  collation: { locale: 'en_US', strength: 1 }
});

const Report = mongoose.model("Report", ReportSchema);

export default Report;
