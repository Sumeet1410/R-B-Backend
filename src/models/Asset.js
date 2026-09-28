const mongoose = require('mongoose');

const stageHistorySchema = new mongoose.Schema(
  {
    stage: {
      type: String,
      enum: ['planning', 'construction', 'active', 'maintenance', 'decommissioned'],
      required: true
    },
    enteredAt: {
      type: Date,
      default: Date.now
    },
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    notes: {
      type: String,
      default: ''
    }
  },
  { _id: true }
);

const documentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true
    },
    url: {
      type: String,
      required: true
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  },
  { _id: true }
);

const assetSchema = new mongoose.Schema(
  {
    assetId: {
      type: String,
      unique: true,
      required: true,
      index: true
    },
    name: {
      type: String,
      required: [true, 'Asset name is required'],
      trim: true
    },
    type: {
      type: String,
      enum: ['road', 'building'],
      required: [true, 'Asset type is required']
    },
    district: {
      type: String,
      required: [true, 'District is required'],
      trim: true,
      index: true
    },
    location: {
      type: String,
      required: [true, 'Location description is required'],
      trim: true
    },
    coordinates: {
      lat: {
        type: Number,
        required: [true, 'Latitude is required']
      },
      lng: {
        type: Number,
        required: [true, 'Longitude is required']
      }
    },
    attributes: {
      // Road specific
      length_km: { type: Number, default: null },
      width_m: { type: Number, default: null },
      surfaceType: {
        type: String,
        enum: ['asphalt', 'concrete', 'gravel', 'paver', 'other', null],
        default: null
      },
      lanes: { type: Number, default: null },

      // Building specific
      area_sqm: { type: Number, default: null },
      floors: { type: Number, default: null },
      buildingType: {
        type: String,
        enum: ['office', 'residential', 'public', 'healthcare', 'educational', 'storage', 'other', null],
        default: null
      },
      constructionYear: { type: Number, default: null }
    },
    currentStage: {
      type: String,
      enum: ['planning', 'construction', 'active', 'maintenance', 'decommissioned'],
      default: 'planning',
      index: true
    },
    stageHistory: [stageHistorySchema],
    assignedOfficer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    assignedEngineers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    ],
    documents: [documentSchema],
    estimatedCost: {
      type: Number,
      default: 0
    },
    actualCost: {
      type: Number,
      default: 0
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  },
  {
    timestamps: true
  }
);

// Compound indexes for fast querying and filtering
assetSchema.index({ district: 1, currentStage: 1 });
assetSchema.index({ type: 1, currentStage: 1 });
assetSchema.index({ 'coordinates.lat': 1, 'coordinates.lng': 1 });

module.exports = mongoose.model('Asset', assetSchema);
