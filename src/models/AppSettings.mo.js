import mongoose, { Schema } from 'mongoose';

const NotificationsSchema = new Schema({
  newOrderEmails: { type: Boolean, default: true },
  lowStockAlerts: { type: Boolean, default: true },
  productUpdatesNewsletter: { type: Boolean, default: false },
}, { _id: false });

const ApiSettingsSchema = new Schema({
  apiKey: { type: String },
  apiKeyLastGenerated: { type: Date },
}, { _id: false });

const AppSettingsSchema = new Schema(
  {
      storeName: { type: String, required: true },
      defaultStoreEmail: { type: String, required: true },
      maintenanceMode: { type: Boolean, default: false },
      darkMode: { type: Boolean, default: false },
      themeAccentColor: { type: String, default: 'var(--accent)' },
      storeLogoUrl: { type: String, default: '' },
      notifications: { type: NotificationsSchema, default: {} },
      apiSettings: { type: ApiSettingsSchema, default: {} }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

AppSettingsSchema.virtual('id').get(function () {
  return this._id.toHexString();
});

const AppSettingsModel = mongoose.models.AppSettings || mongoose.model('AppSettings', AppSettingsSchema);

export default AppSettingsModel; 