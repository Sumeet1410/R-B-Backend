const mongoose = require('mongoose');

const findingSchema = new mongoose.Schema(
  {
    category: {
      type: String,
      enum: ['structural', 'surface', 'drainage', 'safety', 'electrical', 'other'],
      required: true
    },
    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      required: true
    },
    description: {
      type: String,
      required: true,
      trim: true
    },
    photos: [{ type: String }]
  },
  { _id: true }
);

const inspectionSchema = new mongoose.Schema(
  {
    asset: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Asset',
      required: true,
      index: true
    },
    inspector: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true
    },
    orderedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null // Regional Officer who triggered/ordered the inspection
    },
    orderInstructions: {
      type: String,
      default: '',
      trim: true
    },
    linkedTask: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task',
      default: null // Task that triggered this inspection upon 100% completion
    },
    linkedComplaint: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Complaint',
      default: null // Complaint that triggered this inspection
    },
    inspectionType: {
      type: String,
      enum: ['grievance', 'completion'],
      default: 'grievance',
      index: true
    },
    inspectionDate: {
      type: Date,
      default: Date.now
    },
    conditionRating: {
      type: Number,
      min: 1,
      max: 5,
      default: null // Filled by field engineer when submitted
    },
    conditionNotes: {
      type: String,
      default: '',
      trim: true
    },
    findings: [findingSchema],
    recommendation: {
      type: String,
      enum: ['no_action', 'minor_repair', 'major_repair', 'reconstruction', 'decommission'],
      default: 'no_action'
    },
    additionalNotes: {
      type: String,
      default: '',
      trim: true
    },
    status: {
      type: String,
      enum: ['pending', 'submitted', 'approved', 'rejected'],
      default: 'pending',
      index: true
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    reviewedAt: {
      type: Date,
      default: null
    },
    reviewNotes: {
      type: String,
      default: ''
    },
    photos: [{ type: String }]
  },
  {
    timestamps: true
  }
);

inspectionSchema.index({ asset: 1, inspectionDate: -1 });

module.exports = mongoose.model('Inspection', inspectionSchema);
