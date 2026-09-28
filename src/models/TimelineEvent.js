const mongoose = require('mongoose');

const timelineEventSchema = new mongoose.Schema(
  {
    asset: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Asset',
      required: true,
      index: true
    },
    eventType: {
      type: String,
      enum: [
        'stage_change',
        'inspection',
        'task_assigned',
        'task_completed',
        'document_uploaded',
        'note_added',
        'complaint_filed',
        'complaint_resolved'
      ],
      required: true,
      index: true
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      default: '',
      trim: true
    },
    fromStage: {
      type: String,
      enum: ['planning', 'construction', 'active', 'maintenance', 'decommissioned', null],
      default: null
    },
    toStage: {
      type: String,
      enum: ['planning', 'construction', 'active', 'maintenance', 'decommissioned', null],
      default: null
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    performedByRole: {
      type: String,
      enum: ['super_admin', 'regional_officer', 'field_engineer', 'organization', 'citizen'],
      required: true
    },
    attachments: [
      {
        name: { type: String, required: true },
        url: { type: String, required: true },
        type: { type: String, enum: ['image', 'document'], default: 'image' }
      }
    ]
  },
  {
    timestamps: { createdAt: true, updatedAt: false }
  }
);

timelineEventSchema.index({ asset: 1, createdAt: -1 });

module.exports = mongoose.model('TimelineEvent', timelineEventSchema);
