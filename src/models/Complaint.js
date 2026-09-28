const mongoose = require('mongoose');

const complaintRemarkSchema = new mongoose.Schema(
  {
    text: {
      type: String,
      required: true,
      trim: true
    },
    by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    at: {
      type: Date,
      default: Date.now
    }
  },
  { _id: true }
);

const complaintSchema = new mongoose.Schema(
  {
    asset: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Asset',
      required: [true, 'Please select an asset'],
      index: true
    },
    complainant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    title: {
      type: String,
      required: [true, 'Complaint title is required'],
      trim: true
    },
    description: {
      type: String,
      required: [true, 'Detailed description is required'],
      trim: true
    },
    category: {
      type: String,
      enum: [
        'pothole',
        'road_damage',
        'building_damage',
        'waterlogging',
        'safety_hazard',
        'encroachment',
        'lighting',
        'other'
      ],
      required: true,
      index: true
    },
    specificLocation: {
      type: String,
      required: [true, 'Please specify the exact location or landmark'],
      trim: true
    },
    photos: [{ type: String }],
    status: {
      type: String,
      enum: ['registered', 'work_started', 'resolved'],
      default: 'registered',
      index: true
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium'
    },
    linkedInspection: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Inspection',
      default: null
    },
    linkedTask: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task',
      default: null
    },
    remarks: [complaintRemarkSchema],
    resolvedAt: {
      type: Date,
      default: null
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    }
  },
  {
    timestamps: true
  }
);

complaintSchema.index({ asset: 1, status: 1 });
complaintSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('Complaint', complaintSchema);
