import mongoose, { Schema } from 'mongoose';

const ActivityLogSchema = new Schema(
  {
    action: { type: String, required: true },
    entityType: { type: String, required: true },
    entityId: { type: String, required: true },
    details: { type: Schema.Types.Mixed },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

ActivityLogSchema.virtual('id').get(function () {
  return this._id.toHexString();
});

const ActivityLogModel = mongoose.models.ActivityLog || mongoose.model('ActivityLog', ActivityLogSchema);

export default ActivityLogModel; 